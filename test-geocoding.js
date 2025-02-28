// 지오코딩 테스트 스크립트
const axios = require('axios');

// 테스트할 주소 목록
const addresses = [
  '서울특별시 강남구 테헤란로 152',
  '서울특별시 중구 세종대로 110',
  '서울특별시 송파구 올림픽로 300',
  '강남역',
  '서울역',
  '홍대입구역',
  '천호대로 1053',
  '서울특별시 강동구 천호대로 1053',
  '서울특별시 강동구 천호동'
];

// 로컬 서버 URL (개발 환경)
const baseUrl = 'http://localhost:3001';

// 각 주소에 대해 지오코딩 API 호출
async function testGeocoding() {
  console.log('지오코딩 테스트 시작...\n');
  
  for (const address of addresses) {
    try {
      console.log(`주소 테스트: "${address}"`);
      
      const response = await axios.get(`${baseUrl}/geocode`, {
        params: { address }
      });
      
      if (response.data.success) {
        console.log(`✅ 성공: [${response.data.coordinates}]`);
      } else {
        console.log(`❌ 실패: ${response.data.message}`);
      }
      
      console.log('---');
    } catch (error) {
      console.error(`❌ 오류: ${error.message}`);
      if (error.response) {
        console.error(`응답 데이터: ${JSON.stringify(error.response.data)}`);
      }
      console.log('---');
    }
  }
  
  console.log('\n지오코딩 테스트 완료');
}

// 경로 탐색 API 테스트 (주소 사용)
async function testRouteWithAddress() {
  console.log('\n주소 기반 경로 탐색 테스트 시작...\n');
  
  try {
    const response = await axios.get(`${baseUrl}/get-combined-route`, {
      params: {
        startAddress: '서울역',
        goalAddress: '강남역',
        includeAccessibility: true
      }
    });
    
    console.log('✅ 경로 탐색 성공:');
    console.log(`총 소요 시간: ${Math.ceil(response.data.route.summary.totalDurationMinutes)} 분`);
    console.log(`총 이동 거리: ${response.data.route.summary.totalDistance} 미터`);
    console.log(`환승 횟수: ${response.data.route.summary.transfers}`);
    console.log(`경로 구간 수: ${response.data.route.summary.legs}`);
    
    // 경로 구간 요약 출력
    console.log('\n경로 구간:');
    response.data.route.legs.forEach((leg, index) => {
      console.log(`${index + 1}. ${leg.mode}: ${leg.start.name} → ${leg.end.name} (${Math.ceil(leg.duration / 60)}분)`);
    });
    
  } catch (error) {
    console.error(`❌ 오류: ${error.message}`);
    if (error.response) {
      console.error(`응답 데이터: ${JSON.stringify(error.response.data)}`);
    }
  }
  
  console.log('\n주소 기반 경로 탐색 테스트 완료');
}

// 테스트 실행
async function runTests() {
  await testGeocoding();
  await testRouteWithAddress();
}

runTests().catch(console.error); 