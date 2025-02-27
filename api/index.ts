import express from "express";
import axios from "axios";
import type { VercelRequest, VercelResponse } from '@vercel/node';
import dotenv from 'dotenv';
import { findAccessibilityFacilitiesAlongRoute, AccessibilityType } from './accessibility-data';

// 환경 변수 로드
dotenv.config();

const app = express();

app.get("/", (req, res) => res.send("Express on Vercel"));

// 대중교통 경로 API 엔드포인트 - 실제로는 자동차 경로 API를 사용하고 응답을 변환
app.get("/get-transit-directions", async (req, res) => {
  const { start, goal, includeAccessibility } = req.query;

  console.log("Query parameters:", { start, goal, includeAccessibility });

  // 네이버 API는 대중교통 경로를 지원하지 않으므로 자동차 경로 API를 사용
  const url = "https://naveropenapi.apigw.ntruss.com/map-direction/v1/driving";
  const headers = {
    "X-NCP-APIGW-API-KEY-ID": process.env.NAVER_CLIENT_ID,
    "X-NCP-APIGW-API-KEY": process.env.NAVER_CLIENT_SECRET,
  };

  console.log("Request URL:", url);
  console.log("Request headers:", headers);

  try {
    const response = await axios.get(url, {
      params: { start, goal },
      headers: headers,
    });

    console.log("Response status:", response.status);
    
    // 원본 응답 데이터 (자동차 경로)
    const naverResponse = response.data;
    
    // 자동차 경로를 대중교통 경로 형식으로 변환
    const transitResponse = convertDrivingToTransit(naverResponse);
    
    // 접근성 정보를 포함할지 여부 확인
    if (includeAccessibility === 'true' && transitResponse.route) {
      // 경로 정보 추출
      const routeData = transitResponse.route.traoptimal?.[0];
      
      if (routeData && routeData.path) {
        // 경로 상의 접근성 시설 찾기
        const path = routeData.path as [number, number][];
        const accessibilityFacilities = findAccessibilityFacilitiesAlongRoute(
          path,
          0.002, // 약 200m 반경
          [
            AccessibilityType.ELEVATOR,
            AccessibilityType.ESCALATOR,
            AccessibilityType.WHEELCHAIR_RAMP,
            AccessibilityType.ACCESSIBLE_TOILET,
            AccessibilityType.TACTILE_PAVING,
            AccessibilityType.LOW_FLOOR_BUS
          ]
        );
        
        // 응답에 접근성 정보 추가
        const enhancedResponse = {
          ...transitResponse,
          accessibility: {
            facilities: accessibilityFacilities,
            count: accessibilityFacilities.length
          }
        };
        
        res.status(200).json(enhancedResponse);
      } else {
        // 경로 정보가 없는 경우 변환된 응답 반환
        res.status(200).json(transitResponse);
      }
    } else {
      // 접근성 정보를 포함하지 않는 경우 변환된 응답 반환
      res.status(200).json(transitResponse);
    }
  } catch (error: any) {
    console.error("Error:", error.message);
    if (error.response) {
      console.error("Error response:", error.response.data);
    }
    res.status(error.response ? error.response.status : 500).json({
      error: error.message,
      details: error.response ? error.response.data : null,
    });
  }
});

// 자동차 경로를 대중교통 경로 형식으로 변환하는 함수
function convertDrivingToTransit(drivingResponse: any): any {
  // 원본 응답이 없거나 경로 정보가 없는 경우 빈 응답 반환
  if (!drivingResponse || !drivingResponse.route || !drivingResponse.route.trafast) {
    return drivingResponse;
  }

  // 자동차 경로 정보 추출
  const drivingRoute = drivingResponse.route.trafast[0];
  
  // 경로 상의 역/정류장 정보 생성
  const path = drivingRoute.path;
  const stations = getStationsForPath(path);
  
  // 각 역/정류장에 대한 접근성 정보 추가
  const stationsWithAccessibility = stations.map(station => {
    // 해당 역/정류장 주변의 접근성 시설 찾기
    const facilities = findAccessibilityFacilitiesNearStation(station.location);
    return {
      ...station,
      accessibilityFacilities: facilities
    };
  });
  
  // 대중교통 경로 응답 생성
  const transitResponse = {
    ...drivingResponse,
    route: {
      traoptimal: [{
        summary: {
          ...drivingRoute.summary,
          // 대중교통 요금 추가 (예상 요금)
          fare: Math.round(drivingRoute.summary.distance / 100) * 100,
        },
        path: drivingRoute.path,
        // 대중교통 구간 정보 생성
        legs: generateTransitLegs(drivingRoute, stationsWithAccessibility),
      }]
    }
  };

  // 자동차 경로 정보 삭제 (대중교통 응답에는 필요 없음)
  if (transitResponse.route.trafast) {
    delete transitResponse.route.trafast;
  }

  return transitResponse;
}

// 대중교통 구간 정보 생성 함수
function generateTransitLegs(drivingRoute: any, stations: any[]): any[] {
  // 경로 정보가 없는 경우 빈 배열 반환
  if (!drivingRoute || !drivingRoute.path || drivingRoute.path.length < 2) {
    return [];
  }

  const path = drivingRoute.path;
  const totalDistance = drivingRoute.summary.distance;
  const totalDuration = drivingRoute.summary.duration;
  
  // 출발지와 목적지 좌표
  const startLocation = path[0];
  const endLocation = path[path.length - 1];
  
  // 경로를 3개의 구간으로 나눔 (도보 - 대중교통 - 도보)
  const walkingDistance1 = Math.round(totalDistance * 0.1); // 전체 거리의 10%
  const walkingDuration1 = Math.round(totalDuration * 0.15); // 전체 시간의 15%
  
  const transitDistance = Math.round(totalDistance * 0.8); // 전체 거리의 80%
  const transitDuration = Math.round(totalDuration * 0.7); // 전체 시간의 70%
  
  const walkingDistance2 = Math.round(totalDistance * 0.1); // 전체 거리의 10%
  const walkingDuration2 = Math.round(totalDuration * 0.15); // 전체 시간의 15%
  
  // 대중교통 타입 결정 (거리에 따라 버스 또는 지하철)
  const transitType = totalDistance > 10000 ? "SUBWAY" : "BUS";
  
  // 대중교통 노선 정보 생성
  const transitInfo = getTransitInfo(transitType, startLocation, endLocation);
  
  // 대중교통 구간 정보 생성
  return [
    {
      // 첫 번째 도보 구간
      distance: walkingDistance1,
      duration: walkingDuration1,
      steps: [
        {
          type: "WALK",
          distance: walkingDistance1,
          duration: walkingDuration1,
          stations: [
            {
              name: "출발지",
              location: startLocation
            },
            stations[0]
          ]
        }
      ]
    },
    {
      // 대중교통 구간
      distance: transitDistance,
      duration: transitDuration,
      steps: [
        {
          type: transitType,
          distance: transitDistance,
          duration: transitDuration,
          stations: stations,
          lane: transitInfo.lane
        }
      ]
    },
    {
      // 마지막 도보 구간
      distance: walkingDistance2,
      duration: walkingDuration2,
      steps: [
        {
          type: "WALK",
          distance: walkingDistance2,
          duration: walkingDuration2,
          stations: [
            stations[stations.length - 1],
            {
              name: "도착지",
              location: endLocation
            }
          ]
        }
      ]
    }
  ];
}

// 경로에 따른 지하철역/버스정류장 정보 생성
function getStationsForPath(path: [number, number][]): Array<{name: string, location: [number, number]}> {
  // 실제 서비스에서는 좌표 근처의 실제 역/정류장 정보를 DB나 외부 API에서 가져와야 함
  // 여기서는 가상의 데이터를 생성
  
  // 경로 길이에 따라 중간 지점 개수 결정
  const numStations = Math.min(Math.max(Math.floor(path.length / 50), 2), 5);
  const stations: Array<{name: string, location: [number, number]}> = [];
  
  // 출발지 근처 역/정류장
  const startIndex = Math.floor(path.length * 0.1);
  stations.push({
    name: getStationNameByLocation(path[startIndex]),
    location: path[startIndex]
  });
  
  // 중간 역/정류장
  for (let i = 1; i < numStations - 1; i++) {
    const index = Math.floor(path.length * (i / numStations));
    stations.push({
      name: getStationNameByLocation(path[index]),
      location: path[index]
    });
  }
  
  // 도착지 근처 역/정류장
  const endIndex = Math.floor(path.length * 0.9);
  stations.push({
    name: getStationNameByLocation(path[endIndex]),
    location: path[endIndex]
  });
  
  return stations;
}

// 좌표에 따른 가상의 역/정류장 이름 생성
function getStationNameByLocation(location: [number, number]): string {
  // 실제 서비스에서는 좌표 근처의 실제 역/정류장 이름을 DB나 외부 API에서 가져와야 함
  // 여기서는 좌표를 기반으로 가상의 이름 생성
  
  // 서울 주요 지역 좌표 (대략적인 값)
  const seoulAreas = [
    { name: "강남역", location: [127.0276, 37.4979], exits: 12 },
    { name: "서울역", location: [126.9707, 37.5550], exits: 15 },
    { name: "홍대입구역", location: [126.9240, 37.5570], exits: 9 },
    { name: "여의도역", location: [126.9249, 37.5215], exits: 5 },
    { name: "청량리역", location: [127.0480, 37.5800], exits: 8 },
    { name: "잠실역", location: [127.1000, 37.5130], exits: 7 },
    { name: "신촌역", location: [126.9370, 37.5550], exits: 4 },
    { name: "종로3가역", location: [126.9920, 37.5710], exits: 15 },
    { name: "동대문역사문화공원역", location: [127.0090, 37.5650], exits: 16 },
    { name: "왕십리역", location: [127.0370, 37.5610], exits: 11 },
    { name: "건대입구역", location: [127.0700, 37.5400], exits: 7 },
    { name: "혜화역", location: [127.0020, 37.5820], exits: 6 },
    { name: "합정역", location: [126.9140, 37.5500], exits: 8 },
    { name: "압구정역", location: [127.0330, 37.5270], exits: 5 },
    { name: "강동역", location: [127.1240, 37.5350], exits: 4 }
  ];
  
  // 가장 가까운 지역 찾기
  let closestArea = seoulAreas[0];
  let minDistance = Number.MAX_VALUE;
  
  for (const area of seoulAreas) {
    const distance = Math.sqrt(
      Math.pow(area.location[0] - location[0], 2) +
      Math.pow(area.location[1] - location[1], 2)
    );
    
    if (distance < minDistance) {
      minDistance = distance;
      closestArea = area;
    }
  }
  
  // 출구 번호 랜덤 생성 (1~exits)
  const exitNumber = Math.floor(Math.random() * closestArea.exits) + 1;
  
  return `${closestArea.name} ${exitNumber}번 출구`;
}

// 대중교통 노선 정보 생성
function getTransitInfo(transitType: string, start: [number, number], end: [number, number]): any {
  // 실제 서비스에서는 실제 노선 정보를 DB나 외부 API에서 가져와야 함
  // 여기서는 가상의 데이터 생성
  
  if (transitType === "SUBWAY") {
    // 지하철 노선 정보
    const subwayLines = [
      { name: "1호선", code: 1 },
      { name: "2호선", code: 2 },
      { name: "3호선", code: 3 },
      { name: "4호선", code: 4 },
      { name: "5호선", code: 5 },
      { name: "6호선", code: 6 },
      { name: "7호선", code: 7 },
      { name: "8호선", code: 8 },
      { name: "9호선", code: 9 },
      { name: "경의중앙선", code: 10 },
      { name: "분당선", code: 11 },
      { name: "신분당선", code: 12 }
    ];
    
    // 좌표에 따라 노선 결정 (여기서는 간단히 좌표 합으로 결정)
    const lineIndex = Math.floor((start[0] + start[1] + end[0] + end[1]) * 10) % subwayLines.length;
    const line = subwayLines[lineIndex];
    
    return {
      lane: {
        name: line.name,
        type: 1, // 지하철
        subwayCode: line.code
      }
    };
  } else {
    // 버스 노선 정보
    const busLines = [
      { name: "간선버스 102", no: "102" },
      { name: "간선버스 240", no: "240" },
      { name: "간선버스 370", no: "370" },
      { name: "간선버스 470", no: "470" },
      { name: "지선버스 2016", no: "2016" },
      { name: "지선버스 3414", no: "3414" },
      { name: "광역버스 9401", no: "9401" },
      { name: "광역버스 9703", no: "9703" },
      { name: "M버스 6501", no: "6501" },
      { name: "공항버스 6020", no: "6020" }
    ];
    
    // 좌표에 따라 노선 결정 (여기서는 간단히 좌표 합으로 결정)
    const lineIndex = Math.floor((start[0] + start[1] + end[0] + end[1]) * 10) % busLines.length;
    const line = busLines[lineIndex];
    
    return {
      lane: {
        name: line.name,
        type: 2, // 버스
        busNo: line.no
      }
    };
  }
}

// 역/정류장 주변의 접근성 시설 찾기
function findAccessibilityFacilitiesNearStation(location: [number, number]): any[] {
  // 실제 서비스에서는 DB나 외부 API에서 해당 역/정류장의 접근성 시설 정보를 가져와야 함
  // 여기서는 가상의 데이터 생성
  
  // 역/정류장 이름 가져오기
  const stationName = getStationNameByLocation(location).split(' ')[0];
  
  // 해당 역/정류장에 대한 접근성 시설 생성
  const facilities = [];
  
  // 엘리베이터
  if (Math.random() > 0.2) { // 80% 확률로 엘리베이터 있음
    facilities.push({
      id: `elev-${stationName}-${Math.floor(Math.random() * 1000)}`,
      type: AccessibilityType.ELEVATOR,
      location: [location[0] + 0.0001, location[1] + 0.0001],
      name: `${stationName} 엘리베이터`,
      description: `${stationName}의 엘리베이터입니다. 지하철 승강장에서 지상까지 연결됩니다.`,
      isOperational: Math.random() > 0.1, // 90% 확률로 운영 중
      operatingHours: "24시간",
      stationName: stationName,
      exitNumber: `${Math.floor(Math.random() * 10) + 1}번 출구`
    });
  }
  
  // 에스컬레이터
  if (Math.random() > 0.3) { // 70% 확률로 에스컬레이터 있음
    facilities.push({
      id: `esc-${stationName}-${Math.floor(Math.random() * 1000)}`,
      type: AccessibilityType.ESCALATOR,
      location: [location[0] - 0.0001, location[1] - 0.0001],
      name: `${stationName} 에스컬레이터`,
      description: `${stationName}의 에스컬레이터입니다. 지하철 승강장에서 지상까지 연결됩니다.`,
      isOperational: Math.random() > 0.2, // 80% 확률로 운영 중
      operatingHours: "05:30 - 24:00",
      stationName: stationName,
      exitNumber: `${Math.floor(Math.random() * 10) + 1}번 출구`
    });
  }
  
  // 휠체어 경사로
  if (Math.random() > 0.5) { // 50% 확률로 휠체어 경사로 있음
    facilities.push({
      id: `ramp-${stationName}-${Math.floor(Math.random() * 1000)}`,
      type: AccessibilityType.WHEELCHAIR_RAMP,
      location: [location[0] + 0.0002, location[1] - 0.0002],
      name: `${stationName} 휠체어 경사로`,
      description: `${stationName}의 휠체어 경사로입니다.`,
      isOperational: Math.random() > 0.05, // 95% 확률로 운영 중
      stationName: stationName,
      exitNumber: `${Math.floor(Math.random() * 10) + 1}번 출구`
    });
  }
  
  // 장애인 화장실
  if (Math.random() > 0.4) { // 60% 확률로 장애인 화장실 있음
    facilities.push({
      id: `toilet-${stationName}-${Math.floor(Math.random() * 1000)}`,
      type: AccessibilityType.ACCESSIBLE_TOILET,
      location: [location[0] - 0.0002, location[1] + 0.0002],
      name: `${stationName} 장애인 화장실`,
      description: `${stationName}의 장애인 화장실입니다.`,
      isOperational: Math.random() > 0.1, // 90% 확률로 운영 중
      operatingHours: "05:30 - 24:00",
      stationName: stationName
    });
  }
  
  return facilities;
}

// 기존 자동차 경로 API 엔드포인트 (유지)
app.get("/get-directions", async (req, res) => {
  const { start, goal, option, includeAccessibility } = req.query;

  console.log("Query parameters:", { start, goal, option, includeAccessibility });

  const url = "https://naveropenapi.apigw.ntruss.com/map-direction/v1/driving";
  const headers = {
    "X-NCP-APIGW-API-KEY-ID": process.env.NAVER_CLIENT_ID,
    "X-NCP-APIGW-API-KEY": process.env.NAVER_CLIENT_SECRET,
  };

  console.log("Request URL:", url);
  console.log("Request headers:", headers);

  try {
    const response = await axios.get(url, {
      params: { start, goal, option },
      headers: headers,
    });

    console.log("Response status:", response.status);
    
    // 원본 응답 데이터
    const naverResponse = response.data;
    
    // 접근성 정보를 포함할지 여부 확인
    if (includeAccessibility === 'true' && naverResponse.route) {
      // 경로 정보 추출
      const routeType = option as string || 'trafast';
      const routeData = naverResponse.route[routeType]?.[0];
      
      if (routeData && routeData.path) {
        // 경로 상의 접근성 시설 찾기
        const path = routeData.path as [number, number][];
        const accessibilityFacilities = findAccessibilityFacilitiesAlongRoute(
          path,
          0.002, // 약 200m 반경
          [
            AccessibilityType.ELEVATOR,
            AccessibilityType.ESCALATOR,
            AccessibilityType.WHEELCHAIR_RAMP
          ]
        );
        
        // 응답에 접근성 정보 추가
        const enhancedResponse = {
          ...naverResponse,
          accessibility: {
            facilities: accessibilityFacilities,
            count: accessibilityFacilities.length
          }
        };
        
        res.status(200).json(enhancedResponse);
      } else {
        // 경로 정보가 없는 경우 원본 응답 반환
        res.status(200).json(naverResponse);
      }
    } else {
      // 접근성 정보를 포함하지 않는 경우 원본 응답 반환
      res.status(200).json(naverResponse);
    }
  } catch (error: any) {
    console.error("Error:", error.message);
    if (error.response) {
      console.error("Error response:", error.response.data);
    }
    res.status(error.response ? error.response.status : 500).json({
      error: error.message,
      details: error.response ? error.response.data : null,
    });
  }
});

// Vercel 서버리스 환경에서는 app.listen()이 필요하지 않습니다.
// 로컬 개발 환경에서만 서버를 시작합니다.
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3001;
  const server = app.listen(PORT, () => {
    const address = server.address();
    const port = typeof address === 'string' ? address : address?.port;
    console.log(`Server ready on port ${port}.`);
  });
}

// 서버리스 함수 핸들러
export default function handler(req: VercelRequest, res: VercelResponse) {
  // Express 앱에 요청 전달
  return app(req, res);
}