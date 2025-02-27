import axios from 'axios';
import { parseStringPromise } from 'xml2js';
import dotenv from 'dotenv';

dotenv.config();

// XML 응답 파싱
async function parseXMLResponse(xmlData: string) {
  try {
    const result = await parseStringPromise(xmlData, { explicitArray: false });
    return result;
  } catch (error) {
    console.error('XML 파싱 오류:', error);
    throw error;
  }
}

// 실시간 열차 위치 정보 조회
export async function getRealtimeTrainPositions(lineNumber: string) {
  try {
    const url = `http://swopenapi.seoul.go.kr/api/subway/${process.env.SEOUL_METRO_API_KEY}/xml/realtimePosition/0/100/${lineNumber}호선`;
    console.log(`Fetching realtime train positions from: ${url}`);
    
    const response = await axios.get(url);
    
    const parsedData = await parseXMLResponse(response.data);
    if (parsedData.realtimePosition && parsedData.realtimePosition.row) {
      return Array.isArray(parsedData.realtimePosition.row) 
        ? parsedData.realtimePosition.row 
        : [parsedData.realtimePosition.row];
    }
    return [];
  } catch (error: any) {
    console.error(`실시간 열차 위치 정보 조회 오류 (${lineNumber}호선):`, error.message);
    return [];
  }
}

// 실시간 열차 도착 정보 조회
export async function getRealtimeArrivalInfo(stationName: string) {
  try {
    const url = `http://swopenapi.seoul.go.kr/api/subway/${process.env.SEOUL_METRO_API_KEY}/json/realtimeStationArrival/0/100/${encodeURIComponent(stationName)}`;
    console.log(`Fetching realtime arrival info from: ${url}`);
    
    const response = await axios.get(url);
    
    if (response.data && response.data.realtimeArrivalList) {
      return response.data.realtimeArrivalList;
    }
    
    return [];
  } catch (error: any) {
    console.error(`실시간 열차 도착 정보 조회 오류 (${stationName}):`, error.message);
    return [];
  }
}

// 테스트 함수
export async function testRealtimeAPI() {
  try {
    // 1호선 실시간 열차 위치 정보 조회
    const trainPositions = await getRealtimeTrainPositions('1');
    console.log('1호선 실시간 열차 위치 정보 샘플:', trainPositions.slice(0, 2));
    
    // 서울역 실시간 열차 도착 정보 조회
    const arrivalInfo = await getRealtimeArrivalInfo('서울역');
    console.log('서울역 실시간 열차 도착 정보 샘플:', arrivalInfo.slice(0, 2));
    
    return {
      trainPositions: trainPositions.slice(0, 2),
      arrivalInfo: arrivalInfo.slice(0, 2)
    };
  } catch (error: any) {
    console.error('테스트 오류:', error.message);
    return { error: error.message };
  }
} 