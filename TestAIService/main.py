import json
import os
import tempfile
import logging
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

import numpy as np
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel
from pose_format import Pose

from asr_engine import ASRService


# Hệ thống ghi nhật ký (Logging)
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

SIGN_MT_POSE_API = "https://us-central1-sign-mt.cloudfunctions.net/spoken_text_to_signed_pose"
GOOGLE_TRANSLATE_API = "https://translate.googleapis.com/translate_a/single"
BACKEND_PUBLIC_BASE_URL = os.getenv("BACKEND_PUBLIC_BASE_URL", "http://127.0.0.1:8000")

MAX_TEXT_CHARS = int(os.getenv("MAX_TEXT_CHARS", "2000"))
MAX_AUDIO_SIZE_MB = int(os.getenv("MAX_AUDIO_SIZE_MB", "25"))
MAX_AUDIO_SIZE_BYTES = MAX_AUDIO_SIZE_MB * 1024 * 1024

# Khởi tạo FastAPI
app = FastAPI(
    title="S2S - Speech 2 Sign API Gateway",
    description="Speech-to-sign language conversion system",
    version="1.0.0"
)

# Cấu hình CORS — chỉ cho phép Spring Boot backend gọi vào AI service
_raw_origins = os.getenv("ALLOWED_ORIGINS", "http://127.0.0.1:8080,http://localhost:8080")
_allowed_origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Khởi tạo các dịch vụ lõi toàn cục (Global Services Initialization)
logger.info("Starting AI Services...")
asr_service = ASRService(model_size="small")


class TextToSignRequest(BaseModel):
    text: str
    spoken_lang: str = "en"
    signed_lang: str = "ase"


def fetch_sign_mt_pose_bytes(text: str, spoken_lang: str = "en", signed_lang: str = "ase") -> bytes:
    """
    Gọi Sign-MT cloud function để lấy trực tiếp file nhị phân .pose.
    """
    query = urlencode({
        "text": text,
        "spoken": spoken_lang,
        "signed": signed_lang,
    })
    request_url = f"{SIGN_MT_POSE_API}?{query}"
    req = Request(request_url, method="GET", headers={"Accept": "application/pose"})

    try:
        with urlopen(req, timeout=60) as response:
            pose_bytes = response.read()
            content_type = response.headers.get("Content-Type", "")

            if not pose_bytes:
                raise HTTPException(status_code=502, detail="Sign-MT API returned an empty pose payload.")

            if "pose" not in content_type.lower() and "octet-stream" not in content_type.lower():
                logger.warning("Unexpected Sign-MT content type: %s", content_type)

            return pose_bytes
    except HTTPError as err:
        logger.error("Sign-MT HTTP error: status=%s, reason=%s", err.code, err.reason)
        raise HTTPException(status_code=502, detail=f"Sign-MT API error ({err.code}).") from err
    except URLError as err:
        logger.error("Sign-MT connection error: %s", err)
        raise HTTPException(status_code=502, detail="Unable to connect to Sign-MT API.") from err


def build_pose_source_url(text: str, spoken_lang: str = "en", signed_lang: str = "ase") -> str:
    query = urlencode({
        "text": text,
        "spoken": spoken_lang,
        "signed": signed_lang,
    })
    return f"{BACKEND_PUBLIC_BASE_URL}/api/v1/pose?{query}"


def translate_to_english(text: str, source_lang: str) -> str:
    """
    Dịch văn bản sang tiếng Anh bằng Google Translate API (không cần API key).
    Trả về văn bản gốc nếu ngôn ngữ đã là tiếng Anh hoặc có lỗi xảy ra.
    Response format: [[["translated", "original", ...], ...], null, "vi", ...]
    """
    if not text or source_lang == "en":
        return text

    query = urlencode({"client": "gtx", "sl": source_lang, "tl": "en", "dt": "t", "q": text})
    url = f"{GOOGLE_TRANSLATE_API}?{query}"
    try:
        req = Request(url, method="GET", headers={"User-Agent": "Mozilla/5.0"})
        with urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode("utf-8"))
            translated = "".join(item[0] for item in data[0] if item[0])
            if translated:
                logger.info("Translated [%s→en]: '%s' → '%s'", source_lang, text, translated)
                return translated
    except Exception as err:
        logger.warning("Translation API error, falling back to original text: %s", err)
    return text


def fetch_pose_from_sign_mt(english_text: str, spoken_lang: str = "en", signed_lang: str = "ase") -> tuple[bytes, str]:
    """Gọi Sign-MT cloud và trả về (pose_bytes, source_label). Raise 502 nếu thất bại."""
    try:
        pose_bytes = fetch_sign_mt_pose_bytes(english_text, spoken_lang, signed_lang)
        return pose_bytes, "sign-mt-cloud"
    except HTTPException:
        raise
    except Exception as err:
        logger.error("Sign-MT unavailable: %s", err)
        raise HTTPException(status_code=502, detail="Translation service unavailable. Sign-MT cloud is down.") from err


def build_pose_response_payload(text: str, spoken_lang: str = "en", signed_lang: str = "ase") -> dict:
    """
    Gọi Sign-MT và chuẩn hóa dữ liệu pose để trả cho frontend render skeleton.
    Nếu spoken_lang không phải tiếng Anh, tự động dịch sang tiếng Anh trước khi gọi Sign-MT.
    """
    english_text = translate_to_english(text, spoken_lang)
    sign_mt_spoken = "en" if spoken_lang != "en" else spoken_lang

    pose_bytes, source = fetch_pose_from_sign_mt(english_text, sign_mt_spoken, signed_lang)

    pose_obj = Pose.read(pose_bytes)
    frames_data = pose_obj.body.data

    json_coordinates = np.nan_to_num(
        frames_data[:, 0, :, :],
        nan=0.0,
        posinf=0.0,
        neginf=0.0,
    ).tolist()

    frame_count = len(json_coordinates)
    point_count = len(json_coordinates[0]) if frame_count > 0 else 0
    pose_source_url = build_pose_source_url(english_text, sign_mt_spoken, signed_lang)

    return {
        "recognized_text_en": text,
        "pose_coordinates": json_coordinates,
        "pose_source_url": pose_source_url,
        "fps": pose_obj.body.fps,
        "rule_debug": {
            "source": source,
            "endpoint": SIGN_MT_POSE_API,
            "pose_source_url": pose_source_url,
            "frame_count": frame_count,
            "point_count": point_count,
            "original_lang": spoken_lang,
            "signed_lang": signed_lang,
            "translated_text": english_text if spoken_lang != "en" else None,
        },
    }


@app.get("/api/v1/pose", tags=["Translation Engine"])
async def get_pose_file(text: str, spoken: str = "en", signed: str = "ase"):
    """
    Proxy endpoint trả trực tiếp file nhị phân .pose cho frontend pose-viewer.
    Nếu spoken không phải 'en', tự động dịch sang tiếng Anh trước khi gọi Sign-MT.
    """
    clean_text = text.strip()
    if not clean_text:
        raise HTTPException(status_code=400, detail="Text input cannot be empty.")
    if len(clean_text) > MAX_TEXT_CHARS:
        raise HTTPException(status_code=422, detail=f"Text input is too long. Maximum is {MAX_TEXT_CHARS} characters.")

    english_text = translate_to_english(clean_text, spoken)
    sign_mt_spoken = "en" if spoken != "en" else spoken

    try:
        pose_bytes, _ = fetch_pose_from_sign_mt(english_text, sign_mt_spoken, signed)
        return Response(content=pose_bytes, media_type="application/pose")
    except HTTPException:
        raise
    except Exception as err:
        logger.error("System error in pose proxy endpoint: %s", err)
        raise HTTPException(status_code=500, detail=f"Pose proxy error: {err}") from err


@app.post("/api/v1/translate/text", tags=["Translation Engine"])
async def translate_text_to_sign(request: TextToSignRequest):
    """
    API Endpoint xử lý nhanh: Text -> Sign-MT Pose -> JSON Coordinates.
    """
    text = request.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text input cannot be empty.")
    if len(text) > MAX_TEXT_CHARS:
        raise HTTPException(status_code=422, detail=f"Text input is too long. Maximum is {MAX_TEXT_CHARS} characters.")

    try:
        logger.info("Processing direct text translation: %s", text)
        payload = build_pose_response_payload(
            text=text,
            spoken_lang=request.spoken_lang,
            signed_lang=request.signed_lang,
        )
        return JSONResponse(status_code=200, content={"status": "success", "data": payload})
    except HTTPException:
        raise
    except Exception as err:
        logger.error("System error in text translation: %s", err)
        raise HTTPException(status_code=500, detail=f"Text-to-sign processing error: {err}") from err

@app.post("/api/v1/translate/audio", tags=["Translation Engine"])
async def translate_audio_to_sign(file: UploadFile = File(...)):
    """
    API Endpoint xử lý toàn bộ luồng dữ liệu: Audio -> Text -> Sign-MT Pose -> JSON Coordinates
    """
    # Input Validation
    if not file.filename.lower().endswith(('.wav', '.mp3', '.m4a', '.webm')):
        raise HTTPException(status_code=400, detail="The file format is not supported. Please use .wav, .mp3, .m4a, or .webm.")

    temp_audio_path = ""
    try:
        # Bước 1: Lưu tệp tạm thời
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as temp_file:
            content = await file.read()
            if len(content) > MAX_AUDIO_SIZE_BYTES:
                raise HTTPException(status_code=413, detail=f"Audio file too large. Maximum size is {MAX_AUDIO_SIZE_MB}MB.")
            temp_file.write(content)
            temp_audio_path = temp_file.name

        logger.info(f"Processing audio file: {file.filename}")

        # Bước 2: Nhận dạng giọng nói (Whisper)
        recognized_text = asr_service.transcribe_and_translate(temp_audio_path)

        if not recognized_text:
            raise HTTPException(status_code=500, detail="ASR returned empty text.")

        # Bước 3: Gọi Sign-MT để lấy file pose trực tiếp từ spoken text
        payload = build_pose_response_payload(
            text=recognized_text,
            spoken_lang="en",
            signed_lang="ase",
        )

        # Trả về kết quả tổng hợp
        return JSONResponse(
            status_code=200,
            content={
                "status": "success",
                "data": payload,
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"System error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Data stream processing error: {str(e)}")

    finally:
        # Bước 6: Dọn dẹp
        if temp_audio_path and os.path.exists(temp_audio_path):
            os.remove(temp_audio_path)
            logger.info("Temporary audio files have been cleaned up.")