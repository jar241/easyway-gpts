import express from "express";
import axios from "axios";
import type { VercelRequest, VercelResponse } from '@vercel/node';
import dotenv from 'dotenv';
import { findAccessibilityFacilitiesAlongRoute, AccessibilityType } from './accessibility-data';

// 환경 변수 로드
dotenv.config();

const app = express();

app.get("/", (req, res) => res.send("Express on Vercel"));

app.get("/get-directions", async (req, res) => {
  const { start, goal, option, includeAccessibility } = req.query;

  console.log("Query parameters:", { start, goal, option, includeAccessibility });

  const url = "https://naveropenapi.apigw.ntruss.com/map-direction/v1/driving";
  const headers = {
    "X-NCP-APIGW-API-KEY-ID": process.env.NAVER_CLIENT_ID,
    "X-NCP-APIGW-API-KEY": process.env.NAVER_CLIENT_SECRET,
  };

  console.log("Request URL:", url);
  console.log("Request headers:", headers);

  try {
    const response = await axios.get(url, {
      params: { start, goal, option },
      headers: headers,
    });

    console.log("Response status:", response.status);
    
    // 원본 응답 데이터
    const naverResponse = response.data;
    
    // 접근성 정보를 포함할지 여부 확인
    if (includeAccessibility === 'true' && naverResponse.route) {
      // 경로 정보 추출
      const routeType = option as string || 'trafast';
      const routeData = naverResponse.route[routeType]?.[0];
      
      if (routeData && routeData.path) {
        // 경로 상의 접근성 시설 찾기
        const path = routeData.path as [number, number][];
        const accessibilityFacilities = findAccessibilityFacilitiesAlongRoute(
          path,
          0.002, // 약 200m 반경
          [
            AccessibilityType.ELEVATOR,
            AccessibilityType.ESCALATOR,
            AccessibilityType.WHEELCHAIR_RAMP
          ]
        );
        
        // 응답에 접근성 정보 추가
        const enhancedResponse = {
          ...naverResponse,
          accessibility: {
            facilities: accessibilityFacilities,
            count: accessibilityFacilities.length
          }
        };
        
        res.status(200).json(enhancedResponse);
      } else {
        // 경로 정보가 없는 경우 원본 응답 반환
        res.status(200).json(naverResponse);
      }
    } else {
      // 접근성 정보를 포함하지 않는 경우 원본 응답 반환
      res.status(200).json(naverResponse);
    }
  } catch (error: any) {
    console.error("Error:", error.message);
    if (error.response) {
      console.error("Error response:", error.response.data);
    }
    res.status(error.response ? error.response.status : 500).json({
      error: error.message,
      details: error.response ? error.response.data : null,
    });
  }
});

// Vercel 서버리스 환경에서는 app.listen()이 필요하지 않습니다.
// 로컬 개발 환경에서만 서버를 시작합니다.
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3001;
  const server = app.listen(PORT, () => {
    const address = server.address();
    const port = typeof address === 'string' ? address : address?.port;
    console.log(`Server ready on port ${port}.`);
  });
}

// 서버리스 함수 핸들러
export default function handler(req: VercelRequest, res: VercelResponse) {
  // Express 앱에 요청 전달
  return app(req, res);
}