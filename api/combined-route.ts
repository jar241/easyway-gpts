import { findOptimalRoute, SubwayStation, RouteResult, findNearestStation } from './subway-route';
import { findBusRoute, findNearbyBusStops, BusStop, getBusStopAccessibility } from './bus-api';
import { getRealtimeArrivalInfo } from './realtime-subway';
import { getBusArrivalInfo } from './bus-api';
import { AccessibilityFacility } from './accessibility-data';

// 교통 수단 유형
export enum TransportMode {
  SUBWAY = 'subway',
  BUS = 'bus',
  WALK = 'walk'
}

// 복합 경로 구간 인터페이스
export interface RouteLeg {
  mode: TransportMode;
  start: {
    name: string;
    location: [number, number];
  };
  end: {
    name: string;
    location: [number, number];
  };
  duration: number; // 초 단위
  distance: number; // 미터 단위
  details: any;     // 교통 수단별 상세 정보
}

// 복합 경로 인터페이스
export interface CombinedRoute {
  legs: RouteLeg[];
  totalDuration: number;
  totalDistance: number;
  transfers: number;
  accessibility: {
    facilities: AccessibilityFacility[];
    count: number;
  };
  realtime: {
    subway?: any[];
    bus?: any[];
  };
}

/**
 * 좌표 변환 함수 - 일관된 형식으로 변환
 * @param coord 좌표 [경도/위도] 또는 [위도/경도]
 * @param isLatLngFormat 입력 좌표가 [위도, 경도] 형식인지 여부
 * @returns 표준화된 [경도, 위도] 좌표
 */
function normalizeCoordinates(coord: [number, number], isLatLngFormat: boolean = false): [number, number] {
  // 입력이 [위도, 경도] 형식이면 [경도, 위도]로 변환
  if (isLatLngFormat) {
    return [coord[1], coord[0]];
  }
  return coord;
}

/**
 * 두 좌표 간의 거리 계산 (미터 단위)
 * @param coord1 좌표1 [경도, 위도]
 * @param coord2 좌표2 [경도, 위도]
 * @returns 거리 (미터)
 */
function calculateDistance(coord1: [number, number], coord2: [number, number]): number {
  // 좌표가 [경도, 위도] 형식인지 확인
  // 경도는 일반적으로 -180~180 범위, 위도는 -90~90 범위
  const isCoord1LngLat = Math.abs(coord1[0]) <= 180 && Math.abs(coord1[1]) <= 90;
  const isCoord2LngLat = Math.abs(coord2[0]) <= 180 && Math.abs(coord2[1]) <= 90;
  
  // 좌표 형식이 다르면 표준 형식으로 변환
  const standardCoord1 = isCoord1LngLat ? coord1 : [coord1[1], coord1[0]];
  const standardCoord2 = isCoord2LngLat ? coord2 : [coord2[1], coord2[0]];
  
  const R = 6371e3; // 지구 반지름 (미터)
  const φ1 = standardCoord1[1] * Math.PI / 180; // 위도1
  const φ2 = standardCoord2[1] * Math.PI / 180; // 위도2
  const Δφ = (standardCoord2[1] - standardCoord1[1]) * Math.PI / 180;
  const Δλ = (standardCoord2[0] - standardCoord1[0]) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}

/**
 * 도보 이동 구간 생성
 * @param start 출발 좌표 [경도, 위도] 또는 [위도, 경도]
 * @param end 도착 좌표 [경도, 위도] 또는 [위도, 경도]
 * @param startName 출발지 이름
 * @param endName 도착지 이름
 * @returns 도보 이동 구간
 */
function createWalkLeg(
  start: [number, number], 
  end: [number, number], 
  startName: string, 
  endName: string
): RouteLeg {
  const distance = calculateDistance(start, end);
  
  // 도보 이동 거리가 너무 멀면 최대 2km로 제한 (실제 도보로 이동 가능한 현실적인 거리)
  const maxWalkingDistance = 2000; // 최대 2km
  const actualDistance = Math.min(distance, maxWalkingDistance);
  
  const walkingSpeed = 1.4; // 평균 보행 속도 (m/s)
  const duration = actualDistance / walkingSpeed;
  
  return {
    mode: TransportMode.WALK,
    start: {
      name: startName,
      location: start
    },
    end: {
      name: endName,
      location: end
    },
    duration,
    distance: actualDistance,
    details: {
      walkingSpeed,
      walkingDirections: '도보 이동'
    }
  };
}

/**
 * 복합 경로 탐색 (지하철 + 버스)
 * @param startLocation 출발 좌표 [위도, 경도] 형식
 * @param endLocation 도착 좌표 [위도, 경도] 형식
 * @param includeAccessibility 접근성 정보 포함 여부
 * @returns 복합 경로 정보
 */
export async function findCombinedRoute(
  startLocation: [number, number], 
  endLocation: [number, number],
  includeAccessibility: boolean = false
): Promise<CombinedRoute> {
  // 좌표 형식 변환 (API 호출 시 [위도, 경도] 형식으로 전달되므로 [경도, 위도]로 변환)
  const startCoord: [number, number] = [startLocation[1], startLocation[0]];
  const endCoord: [number, number] = [endLocation[1], endLocation[0]];
  
  // 1. 출발지, 목적지 주변 지하철역 및 버스 정류장 찾기
  let nearestSubwayStart: SubwayStation;
  let nearestSubwayEnd: SubwayStation;
  
  try {
    // 지하철역 찾기
    nearestSubwayStart = findNearestStation(startCoord);
    nearestSubwayEnd = findNearestStation(endCoord);
  } catch (error) {
    console.error('지하철역 찾기 오류:', error);
    nearestSubwayStart = { name: '알 수 없음', line: '알 수 없음' };
    nearestSubwayEnd = { name: '알 수 없음', line: '알 수 없음' };
  }
  
  // 버스 정류장 찾기 (비동기 함수로 변경됨)
  let nearbyBusStopsStart: BusStop[] = [];
  let nearbyBusStopsEnd: BusStop[] = [];
  
  try {
    nearbyBusStopsStart = await findNearbyBusStops(startCoord);
    nearbyBusStopsEnd = await findNearbyBusStops(endCoord);
  } catch (error) {
    console.error('버스 정류장 찾기 오류:', error);
  }
  
  // 2. 경로 탐색 전략 결정
  // 2.1. 지하철만 이용하는 경로
  let subwayRoute: RouteResult | null = null;
  try {
    if (nearestSubwayStart.name !== '알 수 없음' && nearestSubwayEnd.name !== '알 수 없음') {
      subwayRoute = await findOptimalRoute(nearestSubwayStart.name, nearestSubwayEnd.name);
    }
  } catch (error) {
    console.error('지하철 경로 탐색 오류:', error);
  }
  
  // 2.2. 버스만 이용하는 경로
  let busRoute: any = null;
  try {
    if (nearbyBusStopsStart.length > 0 && nearbyBusStopsEnd.length > 0) {
      busRoute = await findBusRoute(startCoord, endCoord);
    }
  } catch (error) {
    console.error('버스 경로 탐색 오류:', error);
  }
  
  // 3. 최적 경로 선택 (여기서는 간단히 지하철 우선)
  const legs: RouteLeg[] = [];
  let totalDuration = 0;
  let totalDistance = 0;
  let transfers = 0;
  const accessibilityFacilities: AccessibilityFacility[] = [];
  const realtimeInfo: { subway?: any[], bus?: any[] } = {};
  
  // 지하철 경로와 버스 경로 중 더 빠른 것 선택
  const subwayDuration = subwayRoute ? subwayRoute.totalDuration : Infinity;
  const busDuration = busRoute ? (busRoute.route.estimatedTime * 60) : Infinity;
  
  if (subwayDuration < busDuration) {
    // 지하철 경로가 더 빠른 경우
    console.log('지하철 경로 선택 (더 빠름):', Math.floor(subwayDuration / 60), '분 vs', Math.floor(busDuration / 60), '분');
    
    // 3.1. 출발지에서 지하철역까지 도보
    if (nearestSubwayStart.coordinates) {
      const walkToSubway = createWalkLeg(
        startCoord, 
        nearestSubwayStart.coordinates, 
        '출발지', 
        nearestSubwayStart.name
      );
      legs.push(walkToSubway);
      totalDuration += walkToSubway.duration;
      totalDistance += walkToSubway.distance;
    }
    
    // 3.2. 지하철 이동
    const subwayLeg: RouteLeg = {
      mode: TransportMode.SUBWAY,
      start: {
        name: nearestSubwayStart.name,
        location: nearestSubwayStart.coordinates || startCoord
      },
      end: {
        name: nearestSubwayEnd.name,
        location: nearestSubwayEnd.coordinates || endCoord
      },
      duration: subwayRoute!.totalDuration,
      distance: 0, // 실제 거리 계산 필요
      details: {
        path: subwayRoute!.path,
        transferDetails: subwayRoute!.transferDetails
      }
    };
    legs.push(subwayLeg);
    totalDuration += subwayLeg.duration;
    transfers += subwayRoute!.transfers;
    
    // 3.3. 지하철역에서 목적지까지 도보
    if (nearestSubwayEnd.coordinates) {
      const walkFromSubway = createWalkLeg(
        nearestSubwayEnd.coordinates, 
        endCoord, 
        nearestSubwayEnd.name, 
        '목적지'
      );
      legs.push(walkFromSubway);
      totalDuration += walkFromSubway.duration;
      totalDistance += walkFromSubway.distance;
    }
    
    // 3.4. 실시간 정보 조회
    try {
      const arrivalInfo = await getRealtimeArrivalInfo(nearestSubwayStart.name);
      realtimeInfo.subway = arrivalInfo;
    } catch (error) {
      console.error('실시간 지하철 정보 조회 오류:', error);
    }
    
  } else if (busRoute) {
    // 버스 경로가 더 빠른 경우
    console.log('버스 경로 선택 (더 빠름):', Math.floor(busDuration / 60), '분 vs', Math.floor(subwayDuration / 60), '분');
    
    // 3.1. 출발지에서 버스 정류장까지 도보
    const startStop = busRoute.route.type === 'direct' 
      ? busRoute.route.startStop 
      : busRoute.route.legs[0].startStop;
    
    const walkToBus = createWalkLeg(
      startCoord, 
      startStop.location, 
      '출발지', 
      startStop.name
    );
    legs.push(walkToBus);
    totalDuration += walkToBus.duration;
    totalDistance += walkToBus.distance;
    
    // 3.2. 버스 이동
    if (busRoute.route.type === 'direct') {
      // 직행 버스
      const busLeg: RouteLeg = {
        mode: TransportMode.BUS,
        start: {
          name: startStop.name,
          location: startStop.location
        },
        end: {
          name: busRoute.route.endStop.name,
          location: busRoute.route.endStop.location
        },
        duration: busRoute.route.estimatedTime * 60, // 분 -> 초
        distance: 0, // 실제 거리 계산 필요
        details: {
          busRoute: busRoute.route.busRoute,
          busStops: [startStop, busRoute.route.endStop],
          realtime: busRoute.route.realtime
        }
      };
      legs.push(busLeg);
      totalDuration += busLeg.duration;
    } else {
      // 환승 필요
      for (const leg of busRoute.route.legs) {
        const busLeg: RouteLeg = {
          mode: TransportMode.BUS,
          start: {
            name: leg.startStop.name,
            location: leg.startStop.location
          },
          end: {
            name: leg.endStop.name,
            location: leg.endStop.location
          },
          duration: (busRoute.route.estimatedTime / busRoute.route.legs.length) * 60, // 대략적인 시간 배분
          distance: 0, // 실제 거리 계산 필요
          details: {
            busRoute: leg.busRoute,
            busStops: [leg.startStop, leg.endStop],
            realtime: leg.realtime
          }
        };
        legs.push(busLeg);
        totalDuration += busLeg.duration;
        
        // 환승 도보 구간 (마지막 구간이 아닌 경우)
        if (leg !== busRoute.route.legs[busRoute.route.legs.length - 1]) {
          const nextLeg = busRoute.route.legs[busRoute.route.legs.indexOf(leg) + 1];
          const walkTransfer = createWalkLeg(
            leg.endStop.location,
            nextLeg.startStop.location,
            leg.endStop.name,
            nextLeg.startStop.name
          );
          legs.push(walkTransfer);
          totalDuration += walkTransfer.duration;
          totalDistance += walkTransfer.distance;
        }
      }
      transfers += busRoute.route.transfers;
    }
    
    // 3.3. 버스 정류장에서 목적지까지 도보
    const endStop = busRoute.route.type === 'direct' 
      ? busRoute.route.endStop 
      : busRoute.route.legs[busRoute.route.legs.length - 1].endStop;
    
    const walkFromBus = createWalkLeg(
      endStop.location, 
      endCoord, 
      endStop.name, 
      '목적지'
    );
    legs.push(walkFromBus);
    totalDuration += walkFromBus.duration;
    totalDistance += walkFromBus.distance;
    
    // 3.4. 실시간 정보 조회
    try {
      if (startStop.arsId) {
        const arrivalInfo = await getBusArrivalInfo(startStop.arsId);
        realtimeInfo.bus = arrivalInfo;
      }
    } catch (error) {
      console.error('실시간 버스 정보 조회 오류:', error);
    }
  } else {
    // 대중교통 경로를 찾을 수 없는 경우, 도보 경로만 제공
    console.log('대중교통 경로를 찾을 수 없어 도보 경로만 제공합니다.');
    const walkLeg = createWalkLeg(startCoord, endCoord, '출발지', '목적지');
    legs.push(walkLeg);
    totalDuration = walkLeg.duration;
    totalDistance = walkLeg.distance;
  }
  
  // 4. 접근성 정보 추가
  if (includeAccessibility) {
    // 4.1. 지하철역 접근성 정보
    if (subwayRoute && subwayDuration < busDuration) {
      try {
        const { getStationFacilities } = await import('./seoul-api');
        for (const station of subwayRoute.path) {
          const facilities = await getStationFacilities(station.name);
          accessibilityFacilities.push(...facilities);
        }
      } catch (error) {
        console.error('지하철역 접근성 정보 조회 오류:', error);
      }
    }
    
    // 4.2. 버스 정류장 접근성 정보
    if (busRoute && busDuration <= subwayDuration) {
      if (busRoute.accessibility) {
        if (busRoute.accessibility.startStop) {
          accessibilityFacilities.push(...busRoute.accessibility.startStop);
        }
        if (busRoute.accessibility.endStop) {
          accessibilityFacilities.push(...busRoute.accessibility.endStop);
        }
        if (busRoute.accessibility.transferStop) {
          accessibilityFacilities.push(...busRoute.accessibility.transferStop);
        }
      }
    }
  }
  
  // 5. 결과 반환
  return {
    legs,
    totalDuration,
    totalDistance,
    transfers,
    accessibility: {
      facilities: accessibilityFacilities,
      count: accessibilityFacilities.length
    },
    realtime: realtimeInfo
  };
}

/**
 * 테스트 함수
 */
export async function testCombinedRoute() {
  try {
    // 강남역에서 시청역까지의 복합 경로 탐색
    const route = await findCombinedRoute(
      [127.0276, 37.4979], // 강남역
      [126.9784, 37.5665], // 시청역
      true // 접근성 정보 포함
    );
    
    console.log('복합 경로 결과:');
    console.log('총 소요 시간:', Math.floor(route.totalDuration / 60), '분');
    console.log('총 이동 거리:', Math.floor(route.totalDistance), '미터');
    console.log('환승 횟수:', route.transfers);
    console.log('구간 수:', route.legs.length);
    
    return route;
  } catch (error: any) {
    console.error('테스트 오류:', error.message);
    return { error: error.message };
  }
} 