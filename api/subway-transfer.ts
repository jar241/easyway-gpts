import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

// 환승 정보 인터페이스
export interface TransferInfo {
  fromStation: string;
  fromLine: string;
  toStation: string;
  toLine: string;
  distance: number; // 미터
  duration: number; // 초
}

// 샘플 환승 정보 (실제로는 CSV 파일에서 로드)
const sampleTransferInfo: TransferInfo[] = [
  {
    fromStation: '시청',
    fromLine: '1호선',
    toStation: '시청',
    toLine: '2호선',
    distance: 200,
    duration: 180
  },
  {
    fromStation: '종로3가',
    fromLine: '1호선',
    toStation: '종로3가',
    toLine: '3호선',
    distance: 150,
    duration: 150
  },
  {
    fromStation: '종로3가',
    fromLine: '1호선',
    toStation: '종로3가',
    toLine: '5호선',
    distance: 250,
    duration: 210
  },
  {
    fromStation: '동대문역사문화공원',
    fromLine: '2호선',
    toStation: '동대문역사문화공원',
    toLine: '4호선',
    distance: 180,
    duration: 160
  },
  {
    fromStation: '동대문역사문화공원',
    fromLine: '2호선',
    toStation: '동대문역사문화공원',
    toLine: '5호선',
    distance: 220,
    duration: 190
  },
  {
    fromStation: '왕십리',
    fromLine: '2호선',
    toStation: '왕십리',
    toLine: '5호선',
    distance: 160,
    duration: 140
  },
  {
    fromStation: '왕십리',
    fromLine: '2호선',
    toStation: '왕십리',
    toLine: '경의중앙선',
    distance: 230,
    duration: 200
  },
  {
    fromStation: '강남',
    fromLine: '2호선',
    toStation: '강남',
    toLine: '신분당선',
    distance: 270,
    duration: 230
  },
  {
    fromStation: '교대',
    fromLine: '2호선',
    toStation: '교대',
    toLine: '3호선',
    distance: 140,
    duration: 120
  }
];

// CSV 파일에서 환승 정보 로드 시도
export function loadTransferInfo(): TransferInfo[] {
  try {
    const filePath = path.join(process.cwd(), 'data', '서울교통공사_환승역거리 소요시간 정보.csv');
    
    // 파일이 존재하는지 확인
    if (fs.existsSync(filePath)) {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      
      // CSV 파싱 (헤더 포함)
      const records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true
      });
      
      // 데이터 변환 (CSV 구조에 맞게 필드명 조정 필요)
      return records.map((record: any) => ({
        fromStation: record['환승역명'] || '',
        fromLine: record['승차노선'] || '',
        toStation: record['환승역명'] || '', // 같은 역 내 환승
        toLine: record['하차노선'] || '',
        distance: parseFloat(record['환승거리(m)'] || '0'),
        duration: parseFloat(record['환승소요시간(초)'] || '0')
      }));
    } else {
      console.log('환승 정보 CSV 파일이 없습니다. 샘플 데이터를 사용합니다.');
      return sampleTransferInfo;
    }
  } catch (error: any) {
    console.error('환승 정보 로드 오류:', error.message);
    console.log('샘플 데이터를 사용합니다.');
    return sampleTransferInfo;
  }
}

// 특정 역의 환승 정보 조회
export function getStationTransferInfo(stationName: string): TransferInfo[] {
  const allTransferInfo = loadTransferInfo();
  return allTransferInfo.filter(info => info.fromStation === stationName);
}

// 특정 환승 경로의 소요 시간 조회
export function getTransferDuration(fromStation: string, fromLine: string, toLine: string): number {
  const transferInfoList = getStationTransferInfo(fromStation);
  
  const matchingTransfer = transferInfoList.find(
    info => info.fromLine === fromLine && info.toLine === toLine
  );
  
  return matchingTransfer ? matchingTransfer.duration : 180; // 기본값 3분
}

// 테스트 함수
export function testTransferInfo() {
  const allTransferInfo = loadTransferInfo();
  console.log('환승 정보 샘플:', allTransferInfo.slice(0, 3));
  
  const stationInfo = getStationTransferInfo('강남');
  console.log('강남역 환승 정보:', stationInfo);
  
  const duration = getTransferDuration('시청', '1호선', '2호선');
  console.log('시청역 1호선->2호선 환승 소요 시간:', duration, '초');
  
  return {
    sampleInfo: allTransferInfo.slice(0, 3),
    stationInfo,
    duration
  };
} 