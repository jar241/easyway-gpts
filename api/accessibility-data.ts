// 접근성 시설 유형 정의
export enum AccessibilityType {
  ELEVATOR = 'elevator',
  ESCALATOR = 'escalator',
  WHEELCHAIR_RAMP = 'wheelchair_ramp',
  ACCESSIBLE_TOILET = 'accessible_toilet',
  TACTILE_PAVING = 'tactile_paving',
  LOW_FLOOR_BUS = 'low_floor_bus',
  WHEELCHAIR_LIFT = 'wheelchair_lift',
  ACCESSIBLE_ENTRANCE = 'accessible_entrance',
  BRAILLE_SIGNAGE = 'braille_signage',
  AUDIO_GUIDANCE = 'audio_guidance'
}

// 접근성 시설 인터페이스
export interface AccessibilityFacility {
  id: string;
  type: AccessibilityType;
  location: [number, number]; // [경도, 위도]
  name: string;
  description: string;
  isOperational: boolean;
  operatingHours?: string;
  stationName?: string;
  lineNumber?: string;
  exitNumber?: string;
}

// 샘플 접근성 데이터 (실제로는 DB에서 가져오거나 외부 API를 통해 가져올 수 있음)
export const accessibilityFacilities: AccessibilityFacility[] = [
  // 강남역 시설
  {
    id: 'elev-001',
    type: AccessibilityType.ELEVATOR,
    location: [127.0276, 37.4979],
    name: '강남역 2번 출구 엘리베이터',
    description: '강남역 2번 출구에 위치한 엘리베이터입니다. 지하철 승강장에서 지상까지 연결됩니다.',
    isOperational: true,
    operatingHours: '24시간',
    stationName: '강남역',
    lineNumber: '2호선',
    exitNumber: '2번 출구'
  },
  {
    id: 'elev-002',
    type: AccessibilityType.ELEVATOR,
    location: [127.0270, 37.4975],
    name: '강남역 5번 출구 엘리베이터',
    description: '강남역 5번 출구에 위치한 엘리베이터입니다. 지하철 승강장에서 지상까지 연결됩니다.',
    isOperational: true,
    operatingHours: '24시간',
    stationName: '강남역',
    lineNumber: '2호선',
    exitNumber: '5번 출구'
  },
  {
    id: 'elev-003',
    type: AccessibilityType.ELEVATOR,
    location: [127.0282, 37.4982],
    name: '강남역 11번 출구 엘리베이터',
    description: '강남역 11번 출구에 위치한 엘리베이터입니다. 지하철 승강장에서 지상까지 연결됩니다.',
    isOperational: true,
    operatingHours: '24시간',
    stationName: '강남역',
    lineNumber: '2호선',
    exitNumber: '11번 출구'
  },
  {
    id: 'esc-001',
    type: AccessibilityType.ESCALATOR,
    location: [127.0278, 37.4980],
    name: '강남역 3번 출구 에스컬레이터',
    description: '강남역 3번 출구에 위치한 에스컬레이터입니다. 지하철 승강장에서 지상까지 연결됩니다.',
    isOperational: true,
    operatingHours: '05:30 - 24:00',
    stationName: '강남역',
    lineNumber: '2호선',
    exitNumber: '3번 출구'
  },
  {
    id: 'esc-002',
    type: AccessibilityType.ESCALATOR,
    location: [127.0274, 37.4977],
    name: '강남역 7번 출구 에스컬레이터',
    description: '강남역 7번 출구에 위치한 에스컬레이터입니다. 지하철 승강장에서 지상까지 연결됩니다.',
    isOperational: true,
    operatingHours: '05:30 - 24:00',
    stationName: '강남역',
    lineNumber: '2호선',
    exitNumber: '7번 출구'
  },
  {
    id: 'ramp-001',
    type: AccessibilityType.WHEELCHAIR_RAMP,
    location: [127.0275, 37.4978],
    name: '강남역 1번 출구 휠체어 경사로',
    description: '강남역 1번 출구에 위치한 휠체어 경사로입니다.',
    isOperational: true,
    stationName: '강남역',
    lineNumber: '2호선',
    exitNumber: '1번 출구'
  },
  {
    id: 'toilet-001',
    type: AccessibilityType.ACCESSIBLE_TOILET,
    location: [127.0277, 37.4979],
    name: '강남역 장애인 화장실',
    description: '강남역 대합실에 위치한 장애인 화장실입니다.',
    isOperational: true,
    operatingHours: '05:30 - 24:00',
    stationName: '강남역',
    lineNumber: '2호선'
  },
  {
    id: 'tactile-001',
    type: AccessibilityType.TACTILE_PAVING,
    location: [127.0276, 37.4979],
    name: '강남역 점자 블록',
    description: '강남역 내부 및 출구로 이어지는 점자 블록입니다.',
    isOperational: true,
    stationName: '강남역',
    lineNumber: '2호선'
  },
  
  // 시청역 시설
  {
    id: 'elev-003',
    type: AccessibilityType.ELEVATOR,
    location: [126.9784, 37.5665],
    name: '시청역 1번 출구 엘리베이터',
    description: '시청역 1번 출구에 위치한 엘리베이터입니다. 지하철 승강장에서 지상까지 연결됩니다.',
    isOperational: true,
    operatingHours: '24시간',
    stationName: '시청역',
    lineNumber: '1호선, 2호선',
    exitNumber: '1번 출구'
  },
  {
    id: 'elev-004',
    type: AccessibilityType.ELEVATOR,
    location: [126.9788, 37.5668],
    name: '시청역 4번 출구 엘리베이터',
    description: '시청역 4번 출구에 위치한 엘리베이터입니다. 지하철 승강장에서 지상까지 연결됩니다.',
    isOperational: true,
    operatingHours: '24시간',
    stationName: '시청역',
    lineNumber: '1호선, 2호선',
    exitNumber: '4번 출구'
  },
  {
    id: 'elev-005',
    type: AccessibilityType.ELEVATOR,
    location: [126.9780, 37.5662],
    name: '시청역 환승 엘리베이터',
    description: '시청역 1호선과 2호선 사이 환승을 위한 엘리베이터입니다.',
    isOperational: true,
    operatingHours: '05:30 - 24:00',
    stationName: '시청역',
    lineNumber: '1호선, 2호선'
  },
  {
    id: 'esc-002',
    type: AccessibilityType.ESCALATOR,
    location: [126.9780, 37.5660],
    name: '시청역 2번 출구 에스컬레이터',
    description: '시청역 2번 출구에 위치한 에스컬레이터입니다. 지하철 승강장에서 지상까지 연결됩니다.',
    isOperational: true,
    operatingHours: '05:30 - 24:00',
    stationName: '시청역',
    lineNumber: '1호선, 2호선',
    exitNumber: '2번 출구'
  },
  {
    id: 'esc-003',
    type: AccessibilityType.ESCALATOR,
    location: [126.9786, 37.5667],
    name: '시청역 5번 출구 에스컬레이터',
    description: '시청역 5번 출구에 위치한 에스컬레이터입니다. 지하철 승강장에서 지상까지 연결됩니다.',
    isOperational: true,
    operatingHours: '05:30 - 24:00',
    stationName: '시청역',
    lineNumber: '1호선, 2호선',
    exitNumber: '5번 출구'
  },
  {
    id: 'toilet-002',
    type: AccessibilityType.ACCESSIBLE_TOILET,
    location: [126.9782, 37.5663],
    name: '시청역 장애인 화장실',
    description: '시청역 대합실에 위치한 장애인 화장실입니다.',
    isOperational: true,
    operatingHours: '05:30 - 24:00',
    stationName: '시청역',
    lineNumber: '1호선, 2호선'
  },
  {
    id: 'tactile-002',
    type: AccessibilityType.TACTILE_PAVING,
    location: [126.9783, 37.5664],
    name: '시청역 점자 블록',
    description: '시청역 내부 및 출구로 이어지는 점자 블록입니다.',
    isOperational: true,
    stationName: '시청역',
    lineNumber: '1호선, 2호선'
  },
  
  // 경로 중간 역 시설 (예: 을지로입구역, 을지로3가역, 을지로4가역, 동대문역사문화공원역, 약수역, 압구정역)
  {
    id: 'elev-006',
    type: AccessibilityType.ELEVATOR,
    location: [126.9822, 37.5660],
    name: '을지로입구역 엘리베이터',
    description: '을지로입구역에 위치한 엘리베이터입니다.',
    isOperational: true,
    operatingHours: '24시간',
    stationName: '을지로입구역',
    lineNumber: '2호선'
  },
  {
    id: 'elev-007',
    type: AccessibilityType.ELEVATOR,
    location: [126.9917, 37.5662],
    name: '을지로3가역 엘리베이터',
    description: '을지로3가역에 위치한 엘리베이터입니다.',
    isOperational: true,
    operatingHours: '24시간',
    stationName: '을지로3가역',
    lineNumber: '2호선'
  },
  {
    id: 'elev-008',
    type: AccessibilityType.ELEVATOR,
    location: [127.0058, 37.5647],
    name: '동대문역사문화공원역 엘리베이터',
    description: '동대문역사문화공원역에 위치한 엘리베이터입니다.',
    isOperational: true,
    operatingHours: '24시간',
    stationName: '동대문역사문화공원역',
    lineNumber: '2호선, 4호선, 5호선'
  },
  {
    id: 'elev-009',
    type: AccessibilityType.ELEVATOR,
    location: [127.0101, 37.5547],
    name: '약수역 엘리베이터',
    description: '약수역에 위치한 엘리베이터입니다.',
    isOperational: true,
    operatingHours: '24시간',
    stationName: '약수역',
    lineNumber: '3호선, 6호선'
  },
  {
    id: 'elev-010',
    type: AccessibilityType.ELEVATOR,
    location: [127.0280, 37.5270],
    name: '압구정역 엘리베이터',
    description: '압구정역에 위치한 엘리베이터입니다.',
    isOperational: true,
    operatingHours: '24시간',
    stationName: '압구정역',
    lineNumber: '3호선'
  },
  
  // 저상버스 정류장
  {
    id: 'bus-001',
    type: AccessibilityType.LOW_FLOOR_BUS,
    location: [126.9784, 37.5670],
    name: '시청앞 저상버스 정류장',
    description: '시청앞 버스정류장에서 저상버스 운행. 휠체어 이용 가능.',
    isOperational: true,
    operatingHours: '05:00 - 23:00'
  },
  {
    id: 'bus-002',
    type: AccessibilityType.LOW_FLOOR_BUS,
    location: [127.0276, 37.4985],
    name: '강남역 저상버스 정류장',
    description: '강남역 버스정류장에서 저상버스 운행. 휠체어 이용 가능.',
    isOperational: true,
    operatingHours: '05:00 - 23:00'
  },
  {
    id: 'bus-003',
    type: AccessibilityType.LOW_FLOOR_BUS,
    location: [127.0058, 37.5650],
    name: '동대문역사문화공원 저상버스 정류장',
    description: '동대문역사문화공원 버스정류장에서 저상버스 운행. 휠체어 이용 가능.',
    isOperational: true,
    operatingHours: '05:00 - 23:00'
  }
];

// 특정 좌표 주변의 접근성 시설을 찾는 함수
export function findNearbyAccessibilityFacilities(
  location: [number, number],
  radius: number = 0.005, // 약 500m 반경 (경도/위도 단위)
  types?: AccessibilityType[]
): AccessibilityFacility[] {
  return accessibilityFacilities.filter((facility) => {
    // 타입 필터링
    if (types && !types.includes(facility.type)) {
      return false;
    }
    
    // 거리 계산 (간단한 유클리드 거리 사용)
    const distance = Math.sqrt(
      Math.pow(facility.location[0] - location[0], 2) +
      Math.pow(facility.location[1] - location[1], 2)
    );
    
    return distance <= radius;
  });
}

// 경로 상의 접근성 시설을 찾는 함수
export function findAccessibilityFacilitiesAlongRoute(
  path: [number, number][],
  radius: number = 0.001, // 약 100m 반경
  types?: AccessibilityType[]
): AccessibilityFacility[] {
  const foundFacilities: AccessibilityFacility[] = [];
  const foundIds = new Set<string>();
  
  // 경로의 각 지점에서 주변 시설 검색
  path.forEach((point) => {
    const facilities = findNearbyAccessibilityFacilities(point, radius, types);
    
    // 중복 제거하며 결과 추가
    facilities.forEach((facility) => {
      if (!foundIds.has(facility.id)) {
        foundIds.add(facility.id);
        foundFacilities.push(facility);
      }
    });
  });
  
  return foundFacilities;
} 