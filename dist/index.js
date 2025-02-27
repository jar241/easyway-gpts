"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
const express_1 = __importDefault(require("express"));
const app = (0, express_1.default)();
app.get("/", (req, res) => res.send("Express on Vercel"));
// Vercel 서버리스 환경에서는 app.listen()이 필요하지 않습니다.
// 로컬 개발 환경에서만 서버를 시작합니다.
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`Server ready on port ${PORT}.`));
}
// 서버리스 함수 핸들러
function handler(req, res) {
    // Express 앱에 요청 전달
    return app(req, res);
}
