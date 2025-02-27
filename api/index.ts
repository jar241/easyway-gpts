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
        legs: generateTransitLegs(drivingRoute),
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
function generateTransitLegs(drivingRoute: any): any[] {
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
  
  // 중간 지점 계산 (대략적인 위치)
  const middleIndex1 = Math.floor(path.length * 0.2);
  const middleIndex2 = Math.floor(path.length * 0.8);
  
  const middleLocation1 = path[middleIndex1];
  const middleLocation2 = path[middleIndex2];
  
  // 가상의 역 이름 생성
  const stationNames = [
    { name: "출발역", location: middleLocation1 },
    { name: "도착역", location: middleLocation2 }
  ];
  
  // 대중교통 타입 결정 (거리에 따라 버스 또는 지하철)
  const transitType = totalDistance > 10000 ? "SUBWAY" : "BUS";
  const transitName = transitType === "SUBWAY" ? "2호선" : "간선버스 370";
  
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
          stations: []
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
          stations: stationNames,
          lane: {
            name: transitName,
            type: transitType === "SUBWAY" ? 1 : 2,
            subwayCode: transitType === "SUBWAY" ? 2 : undefined,
            busNo: transitType === "BUS" ? "370" : undefined
          }
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
          stations: []
        }
      ]
    }
  ];
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