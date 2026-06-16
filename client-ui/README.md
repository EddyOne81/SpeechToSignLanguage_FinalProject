# client-ui — S2S Frontend

React 19 + TypeScript + Vite 7 frontend cho hệ thống Speech-to-Sign Language.

## Tech Stack

| Thư viện | Phiên bản | Vai trò |
|---------|-----------|---------|
| React | 19 | UI framework |
| TypeScript | 5.9 | Type safety |
| Vite | 7 | Build tool + dev server |
| Tailwind CSS | 4 | Styling |
| lucide-react | 0.577 | Icons |
| pose-viewer | 1.2 | Web component render skeleton animation |

## Cấu trúc source

```
src/
├── types/
│   └── index.ts            # Tất cả TypeScript types (PoseBuffer, HistoryItem, ...)
├── utils/
│   ├── api.ts              # unwrapApiResponse, extractPageContent, BACKEND_BASE_URL
│   └── format.ts           # formatDate, formatTime
├── components/
│   ├── AppHeader.tsx       # Header + tab navigation + theme toggle + auth display
│   └── AppFooter.tsx       # Footer (static)
├── tabs/
│   ├── TranslateTab.tsx    # Tab dịch: input text/audio/record + output skeleton
│   ├── DictionaryTab.tsx   # Tab từ điển: search + kết quả + phân trang
│   ├── HistoryTab.tsx      # Tab lịch sử: danh sách + replay + xóa
│   ├── FeedbackTab.tsx     # Tab feedback: gửi + danh sách + sort
│   └── AccountTab.tsx      # Tab tài khoản: login/register/profile/password
├── SignLanguageUI.tsx       # Root component: toàn bộ state + handlers + layout
├── PoseViewer.tsx           # Wrapper cho pose-viewer web component
├── App.tsx
├── main.tsx
├── App.css
└── index.css
```

## Cài đặt và chạy

```bash
npm install
```

```bash
# Dev server (mặc định kết nối backend tại localhost:8080)
VITE_BACKEND_URL=http://127.0.0.1:8080 npm run dev

# Build production
npm run build

# Preview build
npm run preview
```

## Biến môi trường

| Biến | Mặc định | Mô tả |
|------|----------|-------|
| `VITE_BACKEND_URL` | `http://127.0.0.1:8080` | URL của Spring Boot backend |

## Scripts

| Lệnh | Mô tả |
|------|-------|
| `npm run dev` | Dev server với HMR |
| `npm run build` | TypeScript check + Vite production build |
| `npm run lint` | ESLint |
| `npm run preview` | Preview bản build production |
