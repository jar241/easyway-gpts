import axios from 'axios';
import dotenv from 'dotenv';

// 환경 변수 로드
dotenv.config();

/**
 * 네이버 지도 API를 사용하여 주소를 좌표로 변환
 * @param address 변환할 주소 문자열
 * @returns Promise<[number, number] | null> 성공 시 [경도, 위도] 배열, 실패 시 null
 */
export async function geocodeAddress(address: string): Promise<[number, number] | null> {
  try {
    console.log(`Geocoding address: ${address}`);
    
    // 네이버 API 키 확인
    const clientId = process.env.NAVER_CLIENT_ID;
    const clientSecret = process.env.NAVER_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      console.error('Naver API credentials not found in environment variables');
      return null;
    }
    
    // 네이버 지오코딩 API 호출
    const response = await axios.get('https://naveropenapi.apigw.ntruss.com/map-geocode/v2/geocode', {
      params: { query: address },
      headers: {
        'X-NCP-APIGW-API-KEY-ID': clientId,
        'X-NCP-APIGW-API-KEY': clientSecret
      }
    });
    
    console.log('Geocoding API response status:', response.status);
    
    // 응답 확인 및 좌표 추출
    if (response.data.addresses && response.data.addresses.length > 0) {
      const coords = response.data.addresses[0];
      console.log(`Found coordinates for "${address}": [${coords.x}, ${coords.y}]`);
      return [parseFloat(coords.x), parseFloat(coords.y)]; // [경도, 위도] 형식으로 반환
    }
    
    console.log(`No coordinates found for address: ${address}`);
    return null;
  } catch (error: any) {
    console.error('Error in geocoding address:', error.message);
    if (error.response) {
      console.error('API error response:', error.response.data);
    }
    return null;
  }
}

/**
 * 카카오 지도 API를 사용한 백업 지오코딩 함수 (네이버 API 실패 시 사용)
 * 참고: 이 함수를 사용하려면 KAKAO_REST_API_KEY 환경 변수 설정 필요
 */
export async function geocodeAddressWithKakao(address: string): Promise<[number, number] | null> {
  try {
    const kakaoApiKey = process.env.KAKAO_REST_API_KEY;
    
    if (!kakaoApiKey) {
      console.error('Kakao API key not found in environment variables');
      return null;
    }
    
    const response = await axios.get('https://dapi.kakao.com/v2/local/search/address.json', {
      params: { query: address },
      headers: {
        'Authorization': `KakaoAK ${kakaoApiKey}`
      }
    });
    
    if (response.data.documents && response.data.documents.length > 0) {
      const location = response.data.documents[0];
      return [parseFloat(location.x), parseFloat(location.y)]; // [경도, 위도]
    }
    
    return null;
  } catch (error: any) {
    console.error('Error in Kakao geocoding:', error.message);
    return null;
  }
}

/**
 * 주소를 좌표로 변환 (여러 API 시도)
 * 네이버 API 실패 시 카카오 API 시도 (카카오 API 키가 설정된 경우)
 */
export async function geocodeAddressWithFallback(address: string): Promise<[number, number] | null> {
  // 먼저 네이버 API로 시도
  const naverResult = await geocodeAddress(address);
  if (naverResult) {
    return naverResult;
  }
  
  // 네이버 API 실패 시 카카오 API 시도 (환경 변수가 설정된 경우)
  if (process.env.KAKAO_REST_API_KEY) {
    console.log('Trying Kakao API as fallback for geocoding');
    return await geocodeAddressWithKakao(address);
  }
  
  return null;
}

/**
 * 주요 랜드마크와 지하철역의 좌표 (API 실패 시 폴백용)
 */
export const landmarkCoordinates: Record<string, [number, number]> = {
  // 서울 주요 지하철역
  '서울역': [126.9707, 37.5550],
  '시청역': [126.9784, 37.5665],
  '종로3가역': [126.9920, 37.5710],
  '동대문역사문화공원역': [127.0090, 37.5650],
  '강남역': [127.0276, 37.4979],
  '홍대입구역': [126.9240, 37.5570],
  '여의도역': [126.9249, 37.5215],
  '잠실역': [127.1000, 37.5130],
  '신촌역': [126.9370, 37.5550],
  '왕십리역': [127.0370, 37.5610],
  '건대입구역': [127.0700, 37.5400],
  '혜화역': [127.0020, 37.5820],
  '합정역': [126.9140, 37.5500],
  '압구정역': [127.0330, 37.5270],
  '강동역': [127.1240, 37.5350],
  '천호역': [127.1238, 37.5387],
  '청량리역': [127.0495, 37.5804],
  
  // 서울 주요 랜드마크
  '남산타워': [126.9883, 37.5512],
  '경복궁': [126.9770, 37.5796],
  '롯데월드': [127.0980, 37.5111],
  '코엑스': [127.0587, 37.5126],
  '명동': [126.9822, 37.5636],
  '이태원': [126.9947, 37.5347],
  '광화문': [126.9769, 37.5759],
  '동대문디자인플라자': [127.0094, 37.5669],
  '청계천': [126.9956, 37.5695],
  '한강공원': [126.9674, 37.5125],
  
  // 서울 주요 대학
  '서울대학교': [126.9520, 37.4591],
  '연세대학교': [126.9364, 37.5665],
  '고려대학교': [127.0232, 37.5895],
  '서강대학교': [126.9410, 37.5504],
  '이화여자대학교': [126.9467, 37.5622],
  '한양대학교': [127.0452, 37.5574],
  
  // 서울 주요 지역
  '강남구': [127.0495, 37.5172],
  '강동구': [127.1237, 37.5301],
  '강서구': [126.8495, 37.5509],
  '강북구': [127.0255, 37.6396],
  '관악구': [126.9514, 37.4784],
  '광진구': [127.0857, 37.5384],
  '구로구': [126.8874, 37.4954],
  '금천구': [126.8945, 37.4568],
  '노원구': [127.0571, 37.6542],
  '도봉구': [127.0471, 37.6688],
  '동대문구': [127.0407, 37.5744],
  '동작구': [126.9399, 37.5121],
  '마포구': [126.9087, 37.5637],
  '서대문구': [126.9368, 37.5791],
  '서초구': [127.0324, 37.4835],
  '성동구': [127.0370, 37.5636],
  '성북구': [127.0166, 37.5894],
  '송파구': [127.1126, 37.5145],
  '양천구': [126.8687, 37.5175],
  '영등포구': [126.8969, 37.5260],
  '용산구': [126.9654, 37.5324],
  '은평구': [126.9227, 37.6026],
  '종로구': [126.9816, 37.5730],
  '중구': [126.9975, 37.5640],
  '중랑구': [127.0928, 37.6066]
};

/**
 * 주소 또는 장소 이름으로 좌표 찾기
 * 1. 지오코딩 API 시도
 * 2. 실패 시 랜드마크 목록에서 검색
 */
export async function findCoordinatesByAddress(addressOrPlace: string): Promise<[number, number] | null> {
  // 1. 지오코딩 API로 시도
  const geocodeResult = await geocodeAddressWithFallback(addressOrPlace);
  if (geocodeResult) {
    return geocodeResult;
  }
  
  // 2. 랜드마크 목록에서 검색
  // 정확한 일치
  if (landmarkCoordinates[addressOrPlace]) {
    console.log(`Found coordinates for "${addressOrPlace}" in landmark database`);
    return landmarkCoordinates[addressOrPlace];
  }
  
  // 부분 일치 (포함 관계)
  for (const [name, coords] of Object.entries(landmarkCoordinates)) {
    if (
      addressOrPlace.includes(name) || 
      name.includes(addressOrPlace) ||
      // '역' 접미사 처리
      (addressOrPlace.endsWith('역') && name.includes(addressOrPlace.slice(0, -1))) ||
      (!addressOrPlace.endsWith('역') && name.includes(addressOrPlace + '역'))
    ) {
      console.log(`Found partial match for "${addressOrPlace}" with "${name}" in landmark database`);
      return coords;
    }
  }
  
  console.log(`No coordinates found for "${addressOrPlace}" in any source`);
  return null;
}

// 테스트 함수
export async function testGeocoding(address: string) {
  console.log(`Testing geocoding for address: ${address}`);
  const result = await findCoordinatesByAddress(address);
  
  if (result) {
    console.log(`Successfully geocoded "${address}" to [${result[0]}, ${result[1]}]`);
    return {
      success: true,
      coordinates: result,
      message: `Successfully geocoded "${address}"`
    };
  } else {
    console.log(`Failed to geocode "${address}"`);
    return {
      success: false,
      message: `Failed to geocode "${address}"`
    };
  }
} 