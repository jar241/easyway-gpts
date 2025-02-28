import axios from 'axios';
import { parseStringPromise } from 'xml2js';
import dotenv from 'dotenv';
import { AccessibilityType, AccessibilityFacility } from './accessibility-data';

dotenv.config();

// API 키
const SEOUL_API_KEY = process.env.SEOUL_API_KEY;
const SEOUL_BUS_API_KEY_ENCODED = process.env.SEOUL_BUS_API_KEY_ENCODED;
const SEOUL_BUS_API_KEY_DECODED = process.env.SEOUL_BUS_API_KEY_DECODED;

// 버스 노선 유형
export enum BusRouteType {
  TRUNK = '간선버스',      // 파란색
  BRANCH = '지선버스',     // 초록색
  CIRCULAR = '순환버스',   // 노란색
  EXPRESS = '광역버스',    // 빨간색
  AIRPORT = '공항버스',    // 하늘색
  NIGHT = '심야버스',      // N버스
  TOWN = '마을버스',       // 마을버스
  REGULAR = '일반버스'     // 기타 일반 버스
}

// 버스 정류장 인터페이스
export interface BusStop {
  id: string;
  name: string;
  location: [number, number]; // [경도, 위도]
  arsId?: string;             // 정류소 고유번호
  busRouteIds?: string[];     // 정류장을 지나는 버스 노선 ID 목록
}

// 버스 노선 인터페이스
export interface BusRoute {
  id: string;
  name: string;
  type: BusRouteType;
  startStop: string;
  endStop: string;
  firstBusTime: string;
  lastBusTime: string;
  headway: number;        // 배차 간격 (분)
  stops: BusStop[];       // 노선이 지나는 정류장 목록
}

// 버스 도착 정보 인터페이스
export interface BusArrival {
  routeId: string;
  routeName: string;
  routeType: BusRouteType;
  arrivalTime: number;    // 도착 예정 시간 (초)
  locationInfo: string;   // 현재 위치 정보
  remainingStops: number; // 남은 정류장 수
  isLowFloor: boolean;    // 저상버스 여부
}

// 샘플 버스 정류장 데이터 (API 호출 실패 시 사용)
const sampleBusStops: BusStop[] = [
  {
    id: '23285',
    name: '강남역',
    location: [127.0276, 37.4979],
    arsId: '22341',
    busRouteIds: ['3412', '4412', '140']
  },
  {
    id: '23286',
    name: '강남역12번출구',
    location: [127.0282, 37.4982],
    arsId: '22342',
    busRouteIds: ['3412', '140', '147']
  },
  {
    id: '23001',
    name: '시청앞',
    location: [126.9784, 37.5665],
    arsId: '01015',
    busRouteIds: ['103', '150', '401']
  },
  {
    id: '23002',
    name: '시청역',
    location: [126.9780, 37.5660],
    arsId: '01016',
    busRouteIds: ['103', '150', '401', '402']
  },
  {
    id: '23100',
    name: '서울역버스환승센터',
    location: [126.9707, 37.5550],
    arsId: '01140',
    busRouteIds: ['150', '401', '402', 'M4101']
  }
];

// 샘플 버스 노선 데이터 (API 호출 실패 시 사용)
const sampleBusRoutes: BusRoute[] = [
  {
    id: '3412',
    name: '3412',
    type: BusRouteType.BRANCH,
    startStop: '강동공영차고지',
    endStop: '강남역',
    firstBusTime: '04:30',
    lastBusTime: '23:30',
    headway: 10,
    stops: []
  },
  {
    id: '140',
    name: '140',
    type: BusRouteType.TRUNK,
    startStop: '도봉산역',
    endStop: '강남역',
    firstBusTime: '04:00',
    lastBusTime: '23:00',
    headway: 8,
    stops: []
  },
  {
    id: '401',
    name: '401',
    type: BusRouteType.TRUNK,
    startStop: '상계동',
    endStop: '서울역',
    firstBusTime: '04:30',
    lastBusTime: '22:30',
    headway: 7,
    stops: []
  },
  {
    id: 'M4101',
    name: 'M4101',
    type: BusRouteType.EXPRESS,
    startStop: '상계동',
    endStop: '강남역',
    firstBusTime: '05:30',
    lastBusTime: '23:00',
    headway: 15,
    stops: []
  }
];

/**
 * 버스 노선 목록 조회
 * @returns 버스 노선 목록
 */
export async function getBusRoutes(): Promise<BusRoute[]> {
  try {
    // 서울시 버스 노선 정보 API 호출
    const url = `http://ws.bus.go.kr/api/rest/busRouteInfo/getBusRouteList?serviceKey=${SEOUL_BUS_API_KEY_ENCODED}`;
    console.log(`Fetching bus routes from: ${url}`);
    
    const response = await axios.get(url);
    const parsedData = await parseStringPromise(response.data, { explicitArray: false });
    
    if (parsedData.ServiceResult && parsedData.ServiceResult.msgBody && parsedData.ServiceResult.msgBody.itemList) {
      const routes = Array.isArray(parsedData.ServiceResult.msgBody.itemList) 
        ? parsedData.ServiceResult.msgBody.itemList 
        : [parsedData.ServiceResult.msgBody.itemList];
      
      return routes.map((route: any) => ({
        id: route.busRouteId,
        name: route.busRouteNm,
        type: getBusTypeFromCode(route.routeType),
        startStop: route.stStationNm || '기점',
        endStop: route.edStationNm || '종점',
        firstBusTime: route.firstBusTm || '05:00',
        lastBusTime: route.lastBusTm || '23:00',
        headway: parseInt(route.term) || 10,
        stops: []
      }));
    }
    
    console.log('API 응답 형식이 올바르지 않습니다. 샘플 데이터를 사용합니다.');
    return sampleBusRoutes;
  } catch (error: any) {
    console.error('버스 노선 조회 오류:', error.message);
    console.log('샘플 데이터를 사용합니다.');
    return sampleBusRoutes;
  }
}

/**
 * 특정 버스 노선의 정류장 목록 조회
 * @param routeId 버스 노선 ID
 * @returns 정류장 목록
 */
export async function getBusRouteStops(routeId: string): Promise<BusStop[]> {
  try {
    // 서울시 버스 노선별 정류장 정보 API 호출
    const url = `http://ws.bus.go.kr/api/rest/busRouteInfo/getStaionByRoute?serviceKey=${SEOUL_BUS_API_KEY_ENCODED}&busRouteId=${routeId}`;
    console.log(`Fetching bus route stops from: ${url}`);
    
    const response = await axios.get(url);
    const parsedData = await parseStringPromise(response.data, { explicitArray: false });
    
    if (parsedData.ServiceResult && parsedData.ServiceResult.msgBody && parsedData.ServiceResult.msgBody.itemList) {
      const stops = Array.isArray(parsedData.ServiceResult.msgBody.itemList) 
        ? parsedData.ServiceResult.msgBody.itemList 
        : [parsedData.ServiceResult.msgBody.itemList];
      
      return stops.map((stop: any) => ({
        id: stop.station || stop.stationId || '',
        name: stop.stationNm || '',
        location: [parseFloat(stop.gpsX || '0'), parseFloat(stop.gpsY || '0')],
        arsId: stop.arsId || '',
        busRouteIds: [routeId]
      }));
    }
    
    console.log('API 응답 형식이 올바르지 않습니다. 샘플 데이터를 사용합니다.');
    return sampleBusStops.filter(stop => stop.busRouteIds?.includes(routeId));
  } catch (error: any) {
    console.error(`버스 노선 정류장 조회 오류 (${routeId}):`, error.message);
    console.log('샘플 데이터를 사용합니다.');
    return sampleBusStops.filter(stop => stop.busRouteIds?.includes(routeId));
  }
}

/**
 * 특정 정류장의 버스 도착 정보 조회
 * @param stopId 정류장 ID
 * @returns 버스 도착 정보 목록
 */
export async function getBusArrivalInfo(stopId: string): Promise<BusArrival[]> {
  try {
    // 서울시 버스 도착 정보 API 호출
    const url = `http://ws.bus.go.kr/api/rest/stationinfo/getStationByUid?serviceKey=${SEOUL_BUS_API_KEY_ENCODED}&arsId=${stopId}`;
    console.log(`Fetching bus arrival info from: ${url}`);
    
    const response = await axios.get(url);
    const parsedData = await parseStringPromise(response.data, { explicitArray: false });
    
    if (parsedData.ServiceResult && parsedData.ServiceResult.msgBody && parsedData.ServiceResult.msgBody.itemList) {
      const arrivals = Array.isArray(parsedData.ServiceResult.msgBody.itemList) 
        ? parsedData.ServiceResult.msgBody.itemList 
        : [parsedData.ServiceResult.msgBody.itemList];
      
      return arrivals.map((arrival: any) => ({
        routeId: arrival.busRouteId || '',
        routeName: arrival.rtNm || '',
        routeType: getBusTypeFromCode(arrival.routeType || ''),
        arrivalTime: parseInt(arrival.traTime1 || '0') * 60, // 분 -> 초 변환
        locationInfo: arrival.stationNm1 || '',
        remainingStops: parseInt(arrival.staOrd1 || '0'),
        isLowFloor: arrival.busType1 === '0'
      }));
    }
    
    // 샘플 데이터 반환
    return [
      {
        routeId: '3412',
        routeName: '3412',
        routeType: BusRouteType.BRANCH,
        arrivalTime: 180,
        locationInfo: '2번째 전 정류장',
        remainingStops: 2,
        isLowFloor: true
      },
      {
        routeId: '140',
        routeName: '140',
        routeType: BusRouteType.TRUNK,
        arrivalTime: 360,
        locationInfo: '3번째 전 정류장',
        remainingStops: 3,
        isLowFloor: false
      }
    ];
  } catch (error: any) {
    console.error(`버스 도착 정보 조회 오류 (${stopId}):`, error.message);
    // 샘플 데이터 반환
    return [
      {
        routeId: '3412',
        routeName: '3412',
        routeType: BusRouteType.BRANCH,
        arrivalTime: 180,
        locationInfo: '2번째 전 정류장',
        remainingStops: 2,
        isLowFloor: true
      },
      {
        routeId: '140',
        routeName: '140',
        routeType: BusRouteType.TRUNK,
        arrivalTime: 360,
        locationInfo: '3번째 전 정류장',
        remainingStops: 3,
        isLowFloor: false
      }
    ];
  }
}

/**
 * 좌표 주변의 버스 정류장 조회
 * @param location 좌표 [경도, 위도]
 * @param radius 반경 (미터)
 * @returns 주변 버스 정류장 목록
 */
export async function findNearbyBusStops(location: [number, number], radius: number = 500): Promise<BusStop[]> {
  try {
    // 서울시 좌표 기반 정류소 조회 API 호출
    const url = `http://ws.bus.go.kr/api/rest/stationinfo/getStationByPos?serviceKey=${SEOUL_BUS_API_KEY_ENCODED}&tmX=${location[0]}&tmY=${location[1]}&radius=${radius}`;
    console.log(`Fetching nearby bus stops from: ${url}`);
    
    const response = await axios.get(url);
    const parsedData = await parseStringPromise(response.data, { explicitArray: false });
    
    if (parsedData.ServiceResult && parsedData.ServiceResult.msgBody && parsedData.ServiceResult.msgBody.itemList) {
      const stops = Array.isArray(parsedData.ServiceResult.msgBody.itemList) 
        ? parsedData.ServiceResult.msgBody.itemList 
        : [parsedData.ServiceResult.msgBody.itemList];
      
      return stops.map((stop: any) => ({
        id: stop.stationId || '',
        name: stop.stationNm || '',
        location: [parseFloat(stop.gpsX || '0'), parseFloat(stop.gpsY || '0')],
        arsId: stop.arsId || '',
        busRouteIds: []
      }));
    }
    
    // API 응답이 없는 경우 샘플 데이터에서 거리 계산하여 반환
    return sampleBusStops.filter(stop => {
      const distance = calculateDistance(location, stop.location);
      return distance <= radius;
    });
  } catch (error: any) {
    console.error('주변 버스 정류장 조회 오류:', error.message);
    // 샘플 데이터에서 거리 계산하여 반환
    return sampleBusStops.filter(stop => {
      const distance = calculateDistance(location, stop.location);
      return distance <= radius;
    });
  }
}

/**
 * 두 좌표 간의 거리 계산 (미터 단위)
 * @param coord1 좌표1 [경도, 위도]
 * @param coord2 좌표2 [경도, 위도]
 * @returns 거리 (미터)
 */
function calculateDistance(coord1: [number, number], coord2: [number, number]): number {
  const R = 6371e3; // 지구 반지름 (미터)
  const φ1 = coord1[1] * Math.PI / 180;
  const φ2 = coord2[1] * Math.PI / 180;
  const Δφ = (coord2[1] - coord1[1]) * Math.PI / 180;
  const Δλ = (coord2[0] - coord1[0]) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}

/**
 * 버스 노선 유형 코드를 BusRouteType으로 변환
 * @param routeTypeCode 노선 유형 코드
 * @returns BusRouteType
 */
function getBusTypeFromCode(routeTypeCode: string): BusRouteType {
  switch (routeTypeCode) {
    case '1':
      return BusRouteType.TRUNK;
    case '2':
      return BusRouteType.BRANCH;
    case '3':
      return BusRouteType.CIRCULAR;
    case '4':
      return BusRouteType.EXPRESS;
    case '5':
      return BusRouteType.TOWN;
    case '6':
      return BusRouteType.AIRPORT;
    case '7':
      return BusRouteType.NIGHT;
    default:
      return BusRouteType.BRANCH;
  }
}

/**
 * 버스 정류장의 접근성 시설 정보 조회
 * @param stopId 정류장 ID
 * @returns 접근성 시설 정보 목록
 */
export async function getBusStopAccessibility(stopId: string): Promise<AccessibilityFacility[]> {
  try {
    // 실제로는 서울시 정류장 시설 정보 API를 호출해야 함
    // 현재는 샘플 데이터 생성
    const stop = sampleBusStops.find(s => s.id === stopId);
    if (!stop) return [];
    
    const facilities: AccessibilityFacility[] = [];
    
    // 저상버스 정보 - 실제로는 API에서 가져와야 함
    const hasLowFloorBus = Math.random() > 0.3; // 70% 확률로 저상버스 운행
    if (hasLowFloorBus) {
      facilities.push({
        id: `lowfloor-${stopId}`,
        type: AccessibilityType.LOW_FLOOR_BUS,
        location: stop.location,
        name: `${stop.name} 저상버스`,
        description: `${stop.name} 정류장에 저상버스가 운행됩니다. 휠체어 이용 가능.`,
        isOperational: true,
        operatingHours: '05:00 - 23:00'
      });
    }
    
    // 점자 블록
    const hasTactilePaving = Math.random() > 0.2; // 80% 확률로 점자 블록 있음
    if (hasTactilePaving) {
      facilities.push({
        id: `tactile-${stopId}`,
        type: AccessibilityType.TACTILE_PAVING,
        location: stop.location,
        name: `${stop.name} 점자 블록`,
        description: `${stop.name} 정류장에 시각장애인을 위한 점자 블록이 설치되어 있습니다.`,
        isOperational: true
      });
    }
    
    // 음성 안내 시스템
    const hasAudioGuidance = Math.random() > 0.5; // 50% 확률로 음성 안내 있음
    if (hasAudioGuidance) {
      facilities.push({
        id: `audio-${stopId}`,
        type: AccessibilityType.AUDIO_GUIDANCE,
        location: stop.location,
        name: `${stop.name} 음성 안내`,
        description: `${stop.name} 정류장에 시각장애인을 위한 음성 안내 시스템이 설치되어 있습니다.`,
        isOperational: Math.random() > 0.1 // 90% 확률로 작동 중
      });
    }
    
    return facilities;
  } catch (error: any) {
    console.error(`버스 정류장 접근성 정보 조회 오류 (${stopId}):`, error.message);
    return [];
  }
}

/**
 * 버스 경로 탐색 (출발지에서 목적지까지)
 * @param startLocation 출발 좌표 [경도, 위도]
 * @param endLocation 도착 좌표 [경도, 위도]
 * @param includeAccessibility 접근성 정보 포함 여부
 * @returns 버스 경로 정보
 */
export async function findBusRoute(
  startLocation: [number, number], 
  endLocation: [number, number],
  includeAccessibility: boolean = false
): Promise<{
  route: any;
  accessibility?: any;
  totalDuration?: number;
  totalDistance?: number;
  transfers?: number;
  legs?: any[];
  stops?: any[];
  realtime?: any;
}> {
  try {
    // 1. 출발지, 목적지 주변 버스 정류장 찾기
    const startStops = await findNearbyBusStops(startLocation);
    const endStops = await findNearbyBusStops(endLocation);
    
    if (startStops.length === 0 || endStops.length === 0) {
      throw new Error('출발지 또는 목적지 주변에 버스 정류장이 없습니다.');
    }
    
    // 2. 가장 가까운 정류장 선택
    const startStop = startStops[0];
    const endStop = endStops[0];
    
    // 3. 출발 정류장의 버스 노선 정보 가져오기
    const startStopDetail = await getBusArrivalInfo(startStop.arsId || '');
    const startRouteIds = startStopDetail.map(info => info.routeId);
    
    // 4. 도착 정류장의 버스 노선 정보 가져오기
    const endStopDetail = await getBusArrivalInfo(endStop.arsId || '');
    const endRouteIds = endStopDetail.map(info => info.routeId);
    
    // 5. 공통 노선 찾기 (직행 버스)
    const commonRouteIds = startRouteIds.filter(id => endRouteIds.includes(id));
    
    // 6. 경로 구성
    let route;
    let totalDuration = 0;
    let totalDistance = 0;
    let transfers = 0;
    let legs = [];
    let stops = [startStop, endStop];
    
    if (commonRouteIds.length > 0) {
      // 직행 버스가 있는 경우
      const routeId = commonRouteIds[0];
      const routeInfo = await getBusRoutes().then(routes => routes.find(r => r.id === routeId));
      
      // 실시간 도착 정보
      const arrivalInfo = startStopDetail.find(info => info.routeId === routeId);
      
      totalDuration = 30 * 60; // 30분을 초 단위로
      totalDistance = calculateDistance(startStop.location, endStop.location) * 1.3; // 직선거리의 1.3배로 예상
      transfers = 0;
      
      // 버스 구간 생성
      const busLeg = {
        type: 'BUS',
        routeId: routeId,
        routeName: routeInfo?.name || '',
        routeType: routeInfo?.type || BusRouteType.REGULAR,
        startStop,
        endStop,
        duration: totalDuration,
        distance: totalDistance
      };
      
      legs = [busLeg];
      
      route = {
        type: 'direct',
        busRoute: routeInfo,
        startStop,
        endStop,
        transfers: 0,
        estimatedTime: Math.ceil(totalDuration / 60), // 예상 소요 시간 (분)
        realtime: arrivalInfo
      };
    } else {
      // 환승이 필요한 경우 - 간단한 환승 로직 구현
      // 실제로는 더 복잡한 환승 알고리즘 필요
      
      // 샘플 환승 정류장 (실제로는 API를 통해 최적 환승 지점 계산 필요)
      const transferStop = sampleBusStops.find(s => s.name === '시청앞') || startStops[1];
      stops.push(transferStop);
      
      // 출발 정류장에서 환승 정류장까지의 버스
      const firstLegRouteId = startRouteIds[0];
      const firstLegRoute = await getBusRoutes().then(routes => routes.find(r => r.id === firstLegRouteId));
      
      // 환승 정류장에서 도착 정류장까지의 버스
      const secondLegRouteId = endRouteIds[0];
      const secondLegRoute = await getBusRoutes().then(routes => routes.find(r => r.id === secondLegRouteId));
      
      // 실시간 도착 정보
      const firstLegArrivalInfo = startStopDetail.find(info => info.routeId === firstLegRouteId);
      
      const firstLegDuration = 20 * 60; // 20분을 초 단위로
      const secondLegDuration = 25 * 60; // 25분을 초 단위로
      const firstLegDistance = calculateDistance(startStop.location, transferStop.location) * 1.3;
      const secondLegDistance = calculateDistance(transferStop.location, endStop.location) * 1.3;
      
      totalDuration = firstLegDuration + secondLegDuration;
      totalDistance = firstLegDistance + secondLegDistance;
      transfers = 1;
      
      // 버스 구간 생성
      const firstBusLeg = {
        type: 'BUS',
        routeId: firstLegRouteId,
        routeName: firstLegRoute?.name || '',
        routeType: firstLegRoute?.type || BusRouteType.REGULAR,
        startStop,
        endStop: transferStop,
        duration: firstLegDuration,
        distance: firstLegDistance
      };
      
      const secondBusLeg = {
        type: 'BUS',
        routeId: secondLegRouteId,
        routeName: secondLegRoute?.name || '',
        routeType: secondLegRoute?.type || BusRouteType.REGULAR,
        startStop: transferStop,
        endStop,
        duration: secondLegDuration,
        distance: secondLegDistance
      };
      
      legs = [firstBusLeg, secondBusLeg];
      
      route = {
        type: 'transfer',
        legs: [
          {
            busRoute: firstLegRoute,
            startStop,
            endStop: transferStop,
            realtime: firstLegArrivalInfo
          },
          {
            busRoute: secondLegRoute,
            startStop: transferStop,
            endStop
          }
        ],
        transfers: 1,
        estimatedTime: Math.ceil(totalDuration / 60) // 예상 소요 시간 (분)
      };
    }
    
    // 7. 접근성 정보 추가
    let accessibilityInfo: {
      startStop?: AccessibilityFacility[];
      endStop?: AccessibilityFacility[];
      transferStop?: AccessibilityFacility[];
    } = {};
    
    if (includeAccessibility) {
      accessibilityInfo = {
        startStop: await getBusStopAccessibility(startStop.id),
        endStop: await getBusStopAccessibility(endStop.id)
      };
      
      if (route.type === 'transfer' && route.legs && route.legs.length > 0) {
        accessibilityInfo.transferStop = await getBusStopAccessibility(route.legs[0].endStop.id);
      }
    }
    
    return {
      route,
      accessibility: accessibilityInfo,
      totalDuration,
      totalDistance,
      transfers,
      legs,
      stops,
      realtime: route.type === 'direct' ? route.realtime : (route.legs && route.legs.length > 0 ? route.legs[0].realtime : undefined)
    };
  } catch (error: any) {
    console.error('버스 경로 탐색 오류:', error.message);
    
    // 오류 발생 시 샘플 데이터 반환
    const startStop = sampleBusStops.find(s => 
      calculateDistance(startLocation, s.location) === 
      Math.min(...sampleBusStops.map(stop => calculateDistance(startLocation, stop.location)))
    ) || sampleBusStops[0];
    
    const endStop = sampleBusStops.find(s => 
      calculateDistance(endLocation, s.location) === 
      Math.min(...sampleBusStops.map(stop => calculateDistance(endLocation, stop.location)))
    ) || sampleBusStops[1];
    
    const totalDuration = 30 * 60; // 30분을 초 단위로
    const totalDistance = calculateDistance(startStop.location, endStop.location) * 1.3;
    
    // 버스 구간 생성
    const busLeg = {
      type: 'BUS',
      routeId: sampleBusRoutes[0].id,
      routeName: sampleBusRoutes[0].name,
      routeType: sampleBusRoutes[0].type,
      startStop,
      endStop,
      duration: totalDuration,
      distance: totalDistance
    };
    
    let accessibilityInfo = {};
    if (includeAccessibility) {
      accessibilityInfo = {
        startStop: await getBusStopAccessibility(startStop.id),
        endStop: await getBusStopAccessibility(endStop.id)
      };
    }
    
    return {
      route: {
        type: 'direct',
        busRoute: sampleBusRoutes[0],
        startStop,
        endStop,
        transfers: 0,
        estimatedTime: 30
      },
      accessibility: accessibilityInfo,
      totalDuration,
      totalDistance,
      transfers: 0,
      legs: [busLeg],
      stops: [startStop, endStop],
      realtime: {}
    };
  }
}

/**
 * 테스트 함수
 */
export async function testBusAPI() {
  try {
    // 버스 노선 조회
    const routes = await getBusRoutes();
    console.log('버스 노선 샘플:', routes.slice(0, 2));
    
    // 버스 정류장 조회
    const stops = await getBusRouteStops(routes[0]?.id || '3412');
    console.log('버스 정류장 샘플:', stops.slice(0, 2));
    
    // 버스 도착 정보 조회
    const arrivals = await getBusArrivalInfo('22341'); // 강남역
    console.log('버스 도착 정보 샘플:', arrivals);
    
    // 버스 경로 탐색
    const route = await findBusRoute([127.0276, 37.4979], [126.9784, 37.5665]); // 강남역 -> 시청
    console.log('버스 경로 샘플:', route);
    
    return {
      routes: routes.slice(0, 2),
      stops: stops.slice(0, 2),
      arrivals,
      route
    };
  } catch (error: any) {
    console.error('테스트 오류:', error.message);
    return { error: error.message };
  }
} 