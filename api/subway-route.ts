import { buildStationConnections } from './subway-timetable';
import { getTransferDuration, TransferInfo } from './subway-transfer';
import { getStationFacilities } from './seoul-api';

// 역 정보 인터페이스
export interface SubwayStation {
  name: string;
  line: string;
  code?: string;
  coordinates?: [number, number];
}

// 경로 탐색 결과 인터페이스
export interface RouteResult {
  path: SubwayStation[];
  totalDistance: number;
  totalDuration: number;
  transfers: number;
  transferDetails: {
    station: string;
    fromLine: string;
    toLine: string;
    duration: number;
  }[];
}

// 역 좌표 정보 (일부 주요 역만 포함)
const stationCoordinates: Record<string, [number, number]> = {
  '서울역': [126.9707, 37.5550],
  '시청': [126.9784, 37.5665],
  '종각': [126.9810, 37.5700],
  '종로3가': [126.9920, 37.5710],
  '동대문': [127.0090, 37.5710],
  '신도림': [126.8910, 37.5090],
  '영등포': [126.9070, 37.5160],
  '강남': [127.0276, 37.4979],
  '역삼': [127.0360, 37.5000],
  '지축': [126.9150, 37.6480],
  '왕십리': [127.0370, 37.5610],
  '당고개': [127.0790, 37.6700],
  '혜화': [127.0020, 37.5820],
  '삼성': [127.0630, 37.5080],
  '언주': [127.0340, 37.5070],
  '마천': [127.1430, 37.4950]
};

// 역 노선 정보
const stationLines: Record<string, string> = {
  '서울역': '1호선',
  '시청': '1호선',
  '종각': '1호선',
  '종로3가': '1호선',
  '동대문': '1호선',
  '신도림': '2호선',
  '영등포': '1호선',
  '강남': '2호선',
  '역삼': '2호선',
  '지축': '3호선',
  '왕십리': '2호선',
  '당고개': '4호선',
  '혜화': '4호선',
  '삼성': '2호선',
  '언주': '9호선',
  '마천': '5호선'
};

// 좌표로부터 가장 가까운 역 찾기
export function findNearestStation(coordinates: [number, number]): SubwayStation {
  let nearestStation = '';
  let shortestDistance = Infinity;
  
  for (const [station, coords] of Object.entries(stationCoordinates)) {
    const distance = Math.sqrt(
      Math.pow(coords[0] - coordinates[0], 2) +
      Math.pow(coords[1] - coordinates[1], 2)
    );
    
    if (distance < shortestDistance) {
      shortestDistance = distance;
      nearestStation = station;
    }
  }
  
  if (!nearestStation) {
    throw new Error('가까운 역을 찾을 수 없습니다.');
  }
  
  return {
    name: nearestStation,
    line: stationLines[nearestStation] || '알 수 없음',
    coordinates: stationCoordinates[nearestStation]
  };
}

// 다익스트라 알고리즘을 사용한 최적 경로 탐색
export async function findOptimalRoute(
  startStation: string,
  endStation: string
): Promise<RouteResult> {
  // 1. 역간 연결 정보 로드
  const connections = await buildStationConnections();
  
  // 2. 역 정보 구성
  const stations: Record<string, SubwayStation> = {};
  
  for (const station of Object.keys(connections)) {
    stations[station] = {
      name: station,
      line: stationLines[station] || '알 수 없음',
      coordinates: stationCoordinates[station]
    };
  }
  
  // 3. 다익스트라 알고리즘 구현
  const distances: Record<string, number> = {};
  const previous: Record<string, string> = {};
  const visited = new Set<string>();
  
  // 모든 역에 대해 초기 거리를 무한대로 설정
  Object.keys(stations).forEach(station => {
    distances[station] = Infinity;
  });
  
  // 시작역 거리를 0으로 설정
  distances[startStation] = 0;
  
  // 다익스트라 알고리즘 실행
  while (visited.size < Object.keys(stations).length) {
    // 방문하지 않은 역 중 가장 가까운 역 찾기
    let currentStation = '';
    let shortestDistance = Infinity;
    
    Object.keys(stations).forEach(station => {
      if (!visited.has(station) && distances[station] < shortestDistance) {
        shortestDistance = distances[station];
        currentStation = station;
      }
    });
    
    // 더 이상 방문할 역이 없거나 도착역에 도달한 경우
    if (currentStation === '' || currentStation === endStation) {
      break;
    }
    
    visited.add(currentStation);
    
    // 인접 역 처리
    const neighbors = connections[currentStation] || [];
    neighbors.forEach(neighbor => {
      // 기본 이동 시간 (역간 2분 가정)
      let moveDuration = 120;
      
      // 현재 역과 인접 역의 노선이 다른 경우 (환승)
      if (stations[currentStation].line !== stations[neighbor]?.line) {
        const transferDuration = getTransferDuration(
          currentStation,
          stations[currentStation].line,
          stations[neighbor]?.line || '알 수 없음'
        );
        moveDuration += transferDuration;
      }
      
      const totalDuration = distances[currentStation] + moveDuration;
      
      if (totalDuration < (distances[neighbor] || Infinity)) {
        distances[neighbor] = totalDuration;
        previous[neighbor] = currentStation;
      }
    });
  }
  
  // 4. 경로 재구성
  const path: SubwayStation[] = [];
  const transferDetails = [];
  let current = endStation;
  let transfers = 0;
  
  while (current && current !== startStation) {
    path.unshift(stations[current]);
    
    const prev = previous[current];
    if (prev && stations[prev].line !== stations[current].line) {
      transfers++;
      transferDetails.push({
        station: current,
        fromLine: stations[prev].line,
        toLine: stations[current].line,
        duration: getTransferDuration(
          current,
          stations[prev].line,
          stations[current].line
        )
      });
    }
    
    current = prev;
  }
  
  // 시작역 추가
  if (startStation) {
    path.unshift(stations[startStation]);
  }
  
  return {
    path,
    totalDistance: 0, // 실제 거리 계산 필요
    totalDuration: distances[endStation] || 0,
    transfers,
    transferDetails
  };
}

// 경로에 접근성 정보 추가
export async function addAccessibilityInfoToRoute(route: RouteResult): Promise<any> {
  const accessibilityInfo = {
    facilities: [],
    count: 0
  };
  
  // 경로 상의 모든 역에 대한 접근성 시설 정보 조회
  for (const station of route.path) {
    try {
      const facilities = await getStationFacilities(station.name);
      accessibilityInfo.facilities.push(...facilities);
    } catch (error) {
      console.error(`Error getting facilities for station ${station.name}:`, error);
    }
  }
  
  accessibilityInfo.count = accessibilityInfo.facilities.length;
  
  return {
    ...route,
    accessibility: accessibilityInfo
  };
}

// 테스트 함수
export async function testRouteSearch() {
  try {
    // 서울역에서 강남역까지의 경로 탐색
    const route = await findOptimalRoute('서울역', '강남');
    console.log('서울역 -> 강남 경로:', route.path.map(s => s.name).join(' -> '));
    console.log('총 소요 시간:', Math.floor(route.totalDuration / 60), '분');
    console.log('환승 횟수:', route.transfers);
    
    return route;
  } catch (error: any) {
    console.error('테스트 오류:', error.message);
    return { error: error.message };
  }
} 