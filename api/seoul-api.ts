import axios from 'axios';
import dotenv from 'dotenv';
import { AccessibilityType, AccessibilityFacility } from './accessibility-data';

// 환경 변수 로드
dotenv.config();

// API 키
const SEOUL_API_KEY = process.env.SEOUL_API_KEY;
const SEOUL_METRO_API_KEY = process.env.SEOUL_METRO_API_KEY;

// 서울 지하철역 좌표 정보 (일부 주요 역만 포함)
const stationCoordinates: Record<string, [number, number]> = {
  '서울역': [126.9707, 37.5550],
  '시청': [126.9784, 37.5665],
  '종로3가': [126.9920, 37.5710],
  '동대문역사문화공원': [127.0090, 37.5650],
  '강남': [127.0276, 37.4979],
  '홍대입구': [126.9240, 37.5570],
  '여의도': [126.9249, 37.5215],
  '잠실': [127.1000, 37.5130],
  '신촌': [126.9370, 37.5550],
  '왕십리': [127.0370, 37.5610],
  '건대입구': [127.0700, 37.5400],
  '혜화': [127.0020, 37.5820],
  '합정': [126.9140, 37.5500],
  '압구정': [127.0330, 37.5270],
  '강동': [127.1240, 37.5350]
};

/**
 * 교통약자 이용시설(승강기) 가동현황 조회
 * @param startIndex 시작 인덱스
 * @param endIndex 종료 인덱스
 * @returns 승강기 정보 배열
 */
export async function fetchSeoulMetroFacilityInfo(startIndex: number = 1, endIndex: number = 1000): Promise<any[]> {
  try {
    const url = `http://openapi.seoul.go.kr:8088/${SEOUL_API_KEY}/json/SeoulMetroFaciInfo/${startIndex}/${endIndex}/`;
    console.log(`Fetching facility info from: ${url}`);
    
    const response = await axios.get(url);
    
    if (response.data && response.data.SeoulMetroFaciInfo && response.data.SeoulMetroFaciInfo.row) {
      return response.data.SeoulMetroFaciInfo.row;
    }
    
    console.error('Invalid response format:', response.data);
    return [];
  } catch (error: any) {
    console.error('Error fetching Seoul Metro facility info:', error.message);
    if (error.response) {
      console.error('Error response:', error.response.data);
    }
    return [];
  }
}

/**
 * 실시간 지하철 위치정보 조회
 * @param subwayLine 지하철 노선 (1~9)
 * @returns 실시간 지하철 위치 정보 배열
 */
export async function fetchRealtimeSubwayPosition(subwayLine: string): Promise<any[]> {
  try {
    const url = `http://swopenapi.seoul.go.kr/api/subway/${SEOUL_METRO_API_KEY}/json/realtimePosition/0/100/${subwayLine}호선`;
    console.log(`Fetching realtime subway position from: ${url}`);
    
    const response = await axios.get(url);
    
    if (response.data && response.data.realtimePositionList) {
      return response.data.realtimePositionList;
    }
    
    console.error('Invalid response format:', response.data);
    return [];
  } catch (error: any) {
    console.error(`Error fetching realtime subway position for line ${subwayLine}:`, error.message);
    if (error.response) {
      console.error('Error response:', error.response.data);
    }
    return [];
  }
}

/**
 * 실시간 지하철 도착정보 조회
 * @param stationName 역 이름
 * @returns 실시간 지하철 도착 정보 배열
 */
export async function fetchRealtimeSubwayArrival(stationName: string): Promise<any[]> {
  try {
    const url = `http://swopenapi.seoul.go.kr/api/subway/${SEOUL_METRO_API_KEY}/json/realtimeStationArrival/0/100/${encodeURIComponent(stationName)}`;
    console.log(`Fetching realtime subway arrival from: ${url}`);
    
    const response = await axios.get(url);
    
    if (response.data && response.data.realtimeArrivalList) {
      return response.data.realtimeArrivalList;
    }
    
    console.error('Invalid response format:', response.data);
    return [];
  } catch (error: any) {
    console.error(`Error fetching realtime subway arrival for station ${stationName}:`, error.message);
    if (error.response) {
      console.error('Error response:', error.response.data);
    }
    return [];
  }
}

/**
 * 특정 역의 승강기 정보 조회
 * @param stationName 역 이름
 * @returns 해당 역의 승강기 정보 배열
 */
export async function getStationFacilities(stationName: string): Promise<any[]> {
  try {
    // 전체 데이터를 페이징하여 가져오기 (한 번에 1000개씩)
    const allFacilities = [];
    let startIndex = 1;
    const pageSize = 1000;
    let totalCount = 0;
    
    // 첫 페이지 조회하여 전체 데이터 수 확인
    const firstPageUrl = `http://openapi.seoul.go.kr:8088/${SEOUL_API_KEY}/json/SeoulMetroFaciInfo/1/1/`;
    const firstPageResponse = await axios.get(firstPageUrl);
    
    if (firstPageResponse.data && firstPageResponse.data.SeoulMetroFaciInfo) {
      totalCount = firstPageResponse.data.SeoulMetroFaciInfo.list_total_count || 0;
    }
    
    // 전체 데이터 조회
    while (startIndex <= totalCount) {
      const endIndex = Math.min(startIndex + pageSize - 1, totalCount);
      const facilities = await fetchSeoulMetroFacilityInfo(startIndex, endIndex);
      
      if (!facilities || facilities.length === 0) break;
      
      allFacilities.push(...facilities);
      startIndex += pageSize;
    }
    
    // 특정 역 필터링 (역 이름에 괄호가 있을 수 있으므로 포함 여부로 확인)
    return allFacilities.filter(facility => 
      facility.STN_NM.replace(/\(\d+\)$/, '').includes(stationName) || 
      stationName.includes(facility.STN_NM.replace(/\(\d+\)$/, ''))
    );
  } catch (error: any) {
    console.error(`Error getting facilities for station ${stationName}:`, error.message);
    return [];
  }
}

/**
 * 서울교통공사 API 데이터를 AccessibilityFacility 형식으로 변환
 * @param facility API에서 받은 시설 정보
 * @param stationName 역 이름
 * @returns AccessibilityFacility 형식의 시설 정보
 */
export function convertToAccessibilityFacility(facility: any, stationName: string): AccessibilityFacility {
  // 시설 유형 결정
  let type: AccessibilityType;
  if (facility.ELVTR_SE === 'EL') {
    type = AccessibilityType.ELEVATOR;
  } else if (facility.ELVTR_SE === 'ES') {
    type = AccessibilityType.ESCALATOR;
  } else if (facility.ELVTR_SE === 'WL') {
    type = AccessibilityType.WHEELCHAIR_LIFT;
  } else {
    type = AccessibilityType.WHEELCHAIR_RAMP;
  }
  
  // 출구 번호 추출 (설치 위치에서)
  const exitMatch = facility.INSTL_PSTN ? facility.INSTL_PSTN.match(/(\d+)번 출입구/) : null;
  const exitNumber = exitMatch ? exitMatch[1] + '번 출구' : '';
  
  // 역 이름에서 호선 정보 제거
  const cleanStationName = facility.STN_NM.replace(/\(\d+\)$/, '');
  
  // 좌표 정보 (역 좌표에 약간의 오프셋 추가)
  let location: [number, number];
  if (stationCoordinates[cleanStationName]) {
    location = [
      stationCoordinates[cleanStationName][0] + (Math.random() - 0.5) * 0.0002,
      stationCoordinates[cleanStationName][1] + (Math.random() - 0.5) * 0.0002
    ];
  } else {
    // 좌표 정보가 없는 경우 서울 중심부 좌표 사용
    location = [126.9780, 37.5665];
  }
  
  return {
    id: `${facility.STN_CD}-${facility.ELVTR_NM}`,
    type,
    location,
    name: facility.ELVTR_NM,
    description: `${cleanStationName}의 ${facility.ELVTR_NM}. 위치: ${facility.INSTL_PSTN || '정보 없음'}, 운행구간: ${facility.OPR_SEC || '정보 없음'}`,
    isOperational: facility.USE_YN === '사용가능',
    operatingHours: '05:30 - 24:00', // 기본값, 실제 운영 시간은 API에서 제공하지 않음
    stationName: cleanStationName,
    exitNumber: exitNumber
  };
}

/**
 * 경로 상의 모든 역에 대한 접근성 시설 정보 조회
 * @param stationNames 경로 상의 역 이름 배열
 * @returns 모든 접근성 시설 정보
 */
export async function getAccessibilityFacilitiesForRoute(stationNames: string[]): Promise<AccessibilityFacility[]> {
  const allFacilities: AccessibilityFacility[] = [];
  const processedIds = new Set<string>();
  
  for (const stationName of stationNames) {
    const facilities = await getStationFacilities(stationName);
    
    for (const facility of facilities) {
      const accessibilityFacility = convertToAccessibilityFacility(facility, stationName);
      
      // 중복 제거
      if (!processedIds.has(accessibilityFacility.id)) {
        processedIds.add(accessibilityFacility.id);
        allFacilities.push(accessibilityFacility);
      }
    }
  }
  
  return allFacilities;
}

/**
 * 실시간 지하철 정보와 접근성 정보를 결합하여 경로 정보 생성
 * @param startStation 출발역
 * @param endStation 도착역
 * @returns 경로 정보와 접근성 정보
 */
export async function getTransitRouteWithAccessibility(startStation: string, endStation: string): Promise<any> {
  try {
    // 1. 출발역과 도착역의 실시간 도착 정보 조회
    const startStationArrivals = await fetchRealtimeSubwayArrival(startStation);
    const endStationArrivals = await fetchRealtimeSubwayArrival(endStation);
    
    // 2. 경로 상의 역 목록 (실제로는 경로 탐색 알고리즘이 필요)
    // 여기서는 간단히 출발역과 도착역만 포함
    const stationsOnRoute = [startStation, endStation];
    
    // 3. 경로 상의 모든 역에 대한 접근성 시설 정보 조회
    const accessibilityFacilities = await getAccessibilityFacilitiesForRoute(stationsOnRoute);
    
    // 4. 응답 데이터 구성
    return {
      route: {
        stations: stationsOnRoute,
        departures: startStationArrivals,
        arrivals: endStationArrivals
      },
      accessibility: {
        facilities: accessibilityFacilities,
        count: accessibilityFacilities.length
      }
    };
  } catch (error: any) {
    console.error('Error getting transit route with accessibility:', error.message);
    return {
      error: error.message,
      route: null,
      accessibility: {
        facilities: [],
        count: 0
      }
    };
  }
} 