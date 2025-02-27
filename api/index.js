// Express 앱 생성
const express = require('express');
const app = express();

// 루트 경로 핸들러
app.get('/', (req, res) => {
  res.send('Express on Vercel');
});

// 서버리스 함수 핸들러
module.exports = app; 