// 접근성 시설 유형 정의
export enum AccessibilityType {
  ELEVATOR = 'elevator',
  ESCALATOR = 'escalator',
  WHEELCHAIR_RAMP = 'wheelchair_ramp',
  ACCESSIBLE_TOILET = 'accessible_toilet',
  TACTILE_PAVING = 'tactile_paving',
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
}

// 샘플 접근성 데이터 (실제로는 DB에서 가져오거나 외부 API를 통해 가져올 수 있음)
export const accessibilityFacilities: AccessibilityFacility[] = [
  {
    id: 'elev-001',
    type: AccessibilityType.ELEVATOR,
    location: [127.0276, 37.4979], // 강남역 근처
    name: '강남역 2번 출구 엘리베이터',
    description: '강남역 2번 출구에 위치한 엘리베이터입니다. 지하철 승강장에서 지상까지 연결됩니다.',
    isOperational: true,
    operatingHours: '24시간',
  },
  {
    id: 'elev-002',
    type: AccessibilityType.ELEVATOR,
    location: [127.0270, 37.4975], // 강남역 근처
    name: '강남역 5번 출구 엘리베이터',
    description: '강남역 5번 출구에 위치한 엘리베이터입니다. 지하철 승강장에서 지상까지 연결됩니다.',
    isOperational: true,
    operatingHours: '24시간',
  },
  {
    id: 'esc-001',
    type: AccessibilityType.ESCALATOR,
    location: [127.0278, 37.4980], // 강남역 근처
    name: '강남역 3번 출구 에스컬레이터',
    description: '강남역 3번 출구에 위치한 에스컬레이터입니다. 지하철 승강장에서 지상까지 연결됩니다.',
    isOperational: true,
    operatingHours: '05:30 - 24:00',
  },
  {
    id: 'ramp-001',
    type: AccessibilityType.WHEELCHAIR_RAMP,
    location: [127.0275, 37.4978], // 강남역 근처
    name: '강남역 1번 출구 휠체어 경사로',
    description: '강남역 1번 출구에 위치한 휠체어 경사로입니다.',
    isOperational: true,
  },
  {
    id: 'elev-003',
    type: AccessibilityType.ELEVATOR,
    location: [126.9784, 37.5665], // 서울시청 근처
    name: '시청역 1번 출구 엘리베이터',
    description: '시청역 1번 출구에 위치한 엘리베이터입니다. 지하철 승강장에서 지상까지 연결됩니다.',
    isOperational: true,
    operatingHours: '24시간',
  },
  {
    id: 'esc-002',
    type: AccessibilityType.ESCALATOR,
    location: [126.9780, 37.5660], // 서울시청 근처
    name: '시청역 2번 출구 에스컬레이터',
    description: '시청역 2번 출구에 위치한 에스컬레이터입니다. 지하철 승강장에서 지상까지 연결됩니다.',
    isOperational: true,
    operatingHours: '05:30 - 24:00',
  },
  // 더 많은 접근성 시설 데이터를 추가할 수 있습니다.
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