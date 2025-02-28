import axios from 'axios';
import { parseStringPromise } from 'xml2js';
import dotenv from 'dotenv';

dotenv.config();

// 역 코드와 이름 매핑 (일부 주요 역만 포함)
const stationCodeMap: Record<string, string> = {
  '0150': '서울역',
  '0151': '시청',
  '0152': '종각',
  '0153': '종로3가',
  '0154': '동대문',
  '0201': '신도림',
  '0202': '영등포',
  '0222': '강남',
  '0221': '역삼',
  '0309': '지축',
  '0342': '왕십리',
  '0409': '당고개',
  '0426': '혜화',
  '0433': '삼성',
  '4126': '언주',
  '2561': '마천',
  // 필요에 따라 더 많은 역 추가 가능
};

// 역 이름으로 코드 찾기
export function getStationCodeByName(stationName: string): string | null {
  for (const [code, name] of Object.entries(stationCodeMap)) {
    if (name === stationName) {
      return code;
    }
  }
  return null;
}

// 역 시간표 조회 함수
export async function getStationTimetable(stationCode: string, weekType: number, upDown: number) {
  try {
    const url = `http://openAPI.seoul.go.kr:8088/${process.env.SEOUL_API_KEY}/xml/SearchSTNTimeTableByIDService/1/1000/${stationCode}/${weekType}/${upDown}/`;
    console.log(`Fetching timetable from: ${url}`);
    
    const response = await axios.get(url);
    
    const parsedData = await parseStringPromise(response.data, { explicitArray: false });
    if (parsedData.SearchSTNTimeTableByIDService && parsedData.SearchSTNTimeTableByIDService.row) {
      return Array.isArray(parsedData.SearchSTNTimeTableByIDService.row) 
        ? parsedData.SearchSTNTimeTableByIDService.row 
        : [parsedData.SearchSTNTimeTableByIDService.row];
    }
    return [];
  } catch (error: any) {
    console.error(`역 시간표 조회 오류 (${stationCode}):`, error.message);
    return [];
  }
}

// 역간 연결 정보 구축 함수
export async function buildStationConnections() {
  const connections: Record<string, string[]> = {};
  const processedStations = new Set<string>();
  
  // 주요 역 코드에 대해 처리
  for (const [code, name] of Object.entries(stationCodeMap)) {
    if (processedStations.has(name)) continue;
    processedStations.add(name);
    
    try {
      // 평일 상행 시간표 조회
      const timetable = await getStationTimetable(code, 1, 1);
      
      // 다음 역 정보 추출
      const nextStations = new Set<string>();
      timetable.forEach((entry: any) => {
        if (entry.NEXT_STN && entry.NEXT_STN !== name) {
          nextStations.add(entry.NEXT_STN);
        }
      });
      
      connections[name] = Array.from(nextStations);
      
      // API 호출 제한을 위한 지연
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`Error processing station ${name}:`, error);
      connections[name] = [];
    }
  }
  
  // 하드코딩된 기본 연결 정보 (API 실패 시 대비)
  const defaultConnections: Record<string, string[]> = {
    '서울역': ['시청', '남영'],
    '시청': ['서울역', '종각'],
    '종각': ['시청', '종로3가'],
    '종로3가': ['종각', '동대문', '을지로3가'],
    '동대문': ['종로3가', '동대문역사문화공원'],
    '강남': ['역삼', '교대'],
    '역삼': ['강남', '선릉'],
    '왕십리': ['상왕십리', '한양대'],
    '혜화': ['동대문', '성균관대'],
    '삼성': ['선릉', '종합운동장'],
    '언주': ['선정릉', '삼성중앙'],
    '마천': ['거여', '종착역']
  };
  
  // API로 가져온 연결 정보가 없는 경우 기본 연결 정보 사용
  for (const [station, connected] of Object.entries(defaultConnections)) {
    if (!connections[station] || connections[station].length === 0) {
      connections[station] = connected;
    }
  }
  
  return connections;
}

// 테스트 함수
export async function testTimetableAPI() {
  try {
    // 강남역(0222) 평일(1) 상행(1) 시간표 조회
    const timetable = await getStationTimetable('0222', 1, 1);
    console.log('강남역 시간표 샘플:', timetable.slice(0, 3));
    
    // 역간 연결 정보 구축
    const connections = await buildStationConnections();
    console.log('역간 연결 정보:', connections);
    
    return { timetable: timetable.slice(0, 3), connections };
  } catch (error: any) {
    console.error('테스트 오류:', error.message);
    return { error: error.message };
  }
} 