# S2S — Speech to Sign Language

**Đồ án tốt nghiệp ngành Kỹ thuật Phần mềm**

Hệ thống chuyển đổi giọng nói / văn bản sang ngôn ngữ ký hiệu (ASL) theo thời gian thực, sử dụng Sign-MT cloud API để tổng hợp animation skeleton từ pose files nhị phân (`.pose`).

---

## Kiến trúc tổng quan

```
┌─────────────────────────────────────────────────────────┐
│                     Client Browser                       │
│          React 19 + Tailwind CSS 4 + pose-viewer         │
│                    localhost:5173                         │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTP / REST
                        ▼
┌─────────────────────────────────────────────────────────┐
│              Backend (API Gateway)                        │
│           Spring Boot 4 · Java 21 · JWT                  │
│       Auth · History · Feedback · Dictionary             │
│                    localhost:8080                         │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTP Proxy
                        ▼
┌─────────────────────────────────────────────────────────┐
│                AI Service (Core)                          │
│         Python FastAPI · Whisper · Sockeye               │
│                    localhost:8000                         │
└───────────────┬───────────────────┬─────────────────────┘
                │                   │
                ▼                   ▼
     Sign-MT Cloud API       Sockeye NMT (local)
    (primary, .pose file)    (offline fallback → FSW)
```

### Luồng xử lý dữ liệu

| Bước | Thành phần | Mô tả |
|------|-----------|-------|
| 1 | Frontend | Người dùng nhập văn bản (EN/VI) hoặc upload/ghi âm audio |
| 2 | Backend | Nhận request, xác thực JWT, ghi lịch sử, proxy đến AI Service |
| 3 | AI Service | Nếu audio → Whisper ASR → EN text; nếu VI → Google Translate → EN |
| 4 | AI Service | Gọi Sign-MT cloud → nhận file `.pose` nhị phân |
| 5 | AI Service | Parse `.pose` → trả JSON coordinates + source URL cho Frontend |
| 6 | Frontend | `pose-viewer` web component render animation skeleton |

### Chiến lược 3 tầng (AI Service)

```
Tầng 1: Sign-MT cloud (primary)
    └── Thành công → trả pose JSON + source URL
    └── Thất bại ↓
Tầng 2: Sockeye local → FSW → retry Sign-MT
    └── Retry thành công → trả pose JSON + source URL
    └── Cả hai đều thất bại ↓
Tầng 3: Offline mode — trả FSW text only, không có animation
```

---

## Cấu trúc thư mục

```
SpeechToSignLanguage_FinalProject/
├── backend/                    # Spring Boot API Gateway
│   └── src/main/java/com/signlanguage/
│       ├── controller/         # AuthController, TranslationController, ...
│       ├── service/            # Business logic
│       ├── entity/             # JPA entities (User, SignDictionary, ...)
│       ├── dto/                # Request/Response DTOs
│       ├── repository/         # Spring Data JPA repositories
│       └── config/             # JWT, Security, WebClient configs
│
├── TestAIService/              # Python AI Service
│   ├── main.py                 # FastAPI app + endpoints
│   ├── asr_engine.py           # Whisper ASR wrapper
│   ├── translate_engine.py     # Sockeye NMT (offline fallback)
│   └── requirements.rebuild.txt
│
├── client-ui/                  # React Frontend
│   └── src/
│       ├── types/              # TypeScript types (PoseBuffer, HistoryItem, ...)
│       ├── utils/              # api.ts, format.ts
│       ├── components/         # AppHeader.tsx, AppFooter.tsx
│       ├── tabs/               # TranslateTab, DictionaryTab, HistoryTab, ...
│       ├── SignLanguageUI.tsx  # Root component (state + handlers)
│       └── PoseViewer.tsx      # pose-viewer web component wrapper
│
├── data/                       # Pose cache và data crawl scripts
├── run-local.ps1               # Khởi động tất cả services (Windows)
└── stop-local.ps1              # Dừng tất cả services
```

---

## Tech Stack

| Thành phần | Công nghệ | Phiên bản |
|-----------|-----------|-----------|
| **Frontend** | React + TypeScript + Vite | React 19, Vite 7 |
| **UI** | Tailwind CSS + lucide-react | Tailwind 4 |
| **Animation** | pose-viewer (web component) | 1.2.x |
| **Backend** | Spring Boot + Spring Security | Spring Boot 4.0.3, Java 21 |
| **Auth** | JWT (jjwt) | 0.12.6 |
| **Database** | PostgreSQL + Spring Data JPA | — |
| **AI Service** | Python FastAPI | 0.109.x |
| **ASR** | OpenAI Whisper | small model |
| **NMT (offline)** | Sockeye (sign-language-processing) | — |
| **Pose** | Sign-MT cloud API + pose-format | — |
| **Translation** | Google Translate API (free tier, VI→EN) | — |

---

## API Endpoints

### Backend (`:8080`)

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/api/auth/login` | Đăng nhập, trả JWT |
| POST | `/api/auth/register` | Đăng ký tài khoản mới |
| GET | `/api/users/me` | Thông tin người dùng hiện tại |
| PATCH | `/api/users/me` | Cập nhật email |
| PATCH | `/api/users/me/password` | Đổi mật khẩu |
| POST | `/api/translate/text` | Dịch văn bản → sign |
| POST | `/api/translate/audio` | Dịch audio → sign |
| GET | `/api/dictionaries` | Tìm kiếm từ điển (phân trang) |
| GET | `/api/histories/me` | Lịch sử dịch (phân trang) |
| DELETE | `/api/histories/me` | Xóa toàn bộ lịch sử |
| GET | `/api/histories/me/{id}` | Chi tiết 1 lần dịch |
| DELETE | `/api/histories/me/{id}` | Xóa 1 lần dịch |
| GET | `/api/feedbacks/me` | Danh sách feedback (phân trang, sort) |
| POST | `/api/feedbacks/me` | Gửi feedback mới |
| PUT | `/api/feedbacks/me/{id}` | Cập nhật feedback |
| DELETE | `/api/feedbacks/me/{id}` | Xóa feedback |

### AI Service (`:8000`)

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/api/v1/translate/text` | Text → pose JSON coordinates |
| POST | `/api/v1/translate/audio` | Audio file → pose JSON coordinates |
| GET | `/api/v1/pose` | Proxy trả binary `.pose` cho pose-viewer |

---

## Tính năng (Frontend)

| Tab | Tính năng |
|-----|-----------|
| **Translate** | Nhập text (EN/VI), upload audio (.wav/.mp3/.m4a/.webm), ghi âm trực tiếp; render skeleton animation qua pose-viewer |
| **Dictionary** | Tìm kiếm từ điển ký hiệu có cache, click "Use" để dịch ngay |
| **History** | Lịch sử dịch cá nhân, replay, xóa từng mục hoặc xóa tất cả |
| **Feedback** | Gửi / sửa / xóa feedback theo history ID, sắp xếp theo ngày/rating |
| **Account** | Đăng nhập, đăng ký, cập nhật email, đổi mật khẩu, hồ sơ người dùng |

---

## Yêu cầu môi trường

| Công cụ | Phiên bản tối thiểu |
|---------|-------------------|
| JDK | 21 |
| Node.js | 20+ |
| npm | 10+ |
| Python | 3.10+ (với venv tại `TestAIService/.venv`) |
| PostgreSQL | 14+ |

---

## Chạy local (Windows)

### Cách nhanh — 1 lệnh khởi động tất cả

```powershell
.\run-local.ps1
```

Script tự kiểm tra prerequisites và khởi động 3 services background:

| Service | URL |
|---------|-----|
| AI Service | `http://127.0.0.1:8000` |
| Backend | `http://127.0.0.1:8080` |
| Frontend | `http://127.0.0.1:5173` |

```powershell
# Dừng tất cả
.\stop-local.ps1
```

### Cách thủ công — từng service riêng

**AI Service**
```powershell
cd TestAIService
.\.venv\Scripts\Activate.ps1
uvicorn main:app --host 127.0.0.1 --port 8000
```

**Backend**
```powershell
cd backend
.\mvnw.cmd spring-boot:run
```

**Frontend**
```powershell
cd client-ui
npm install
$env:VITE_BACKEND_URL = "http://127.0.0.1:8080"
npm run dev
```

---

## Biến môi trường

### AI Service
| Biến | Mặc định | Mô tả |
|------|----------|-------|
| `BACKEND_PUBLIC_BASE_URL` | `http://127.0.0.1:8000` | Base URL cho pose proxy endpoint |

### Frontend
| Biến | Mặc định | Mô tả |
|------|----------|-------|
| `VITE_BACKEND_URL` | `http://127.0.0.1:8080` | URL của Spring Boot backend |

---

## References

- **Sign-MT** — Sign Language Translation cloud service: [sign.mt](https://sign.mt)
- **sign-language-processing** ecosystem: [github.com/sign-language-processing](https://github.com/sign-language-processing)
  - `signwriting-translation` (Sockeye NMT)
  - `signwriting-animation`
  - `pose-format`
- **OpenAI Whisper** — ASR: [github.com/openai/whisper](https://github.com/openai/whisper)
- **Sutton SignWriting / FSW**: [signwriting.org](https://www.signwriting.org)
- **pose-viewer** — Web component render skeleton: [npmjs.com/package/pose-viewer](https://www.npmjs.com/package/pose-viewer)
