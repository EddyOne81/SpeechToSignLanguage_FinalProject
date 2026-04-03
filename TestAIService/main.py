import os
import tempfile
import logging
from typing import Optional
import numpy as np
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pose_format import Pose

from asr_engine import ASRService
from translate_engine import SignTranslationService
from my_animator import FSWAnimator

# Hệ thống ghi nhật ký (Logging)
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Khởi tạo FastAPI
app = FastAPI(
    title="S2S - Speech 2 Sign API Gateway",
    description="Speech-to-sign language conversion system",
    version="1.0.0"
)

# Cấu hình CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Trong môi trường Production, cần thay thế bằng domain cụ thể của Frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Khởi tạo các dịch vụ lõi
logger.info("Starting AI Services...")
asr_service = ASRService(model_size="small")
animator_service = FSWAnimator(fps=25, num_joints=52)
translator_service: Optional[SignTranslationService] = None


def get_translator_service() -> SignTranslationService:
    """
    Lazy-load translator để giảm thời gian khởi động API.
    """
    global translator_service
    if translator_service is None:
        logger.info("Loading text-to-FSW translation model...")
        translator_service = SignTranslationService()
        logger.info("Text-to-FSW translation model loaded successfully.")
    return translator_service

@app.post("/api/v1/translate/audio", tags=["Translation Engine"])
async def translate_audio_to_sign(file: UploadFile = File(...)):
    """
    API Endpoint xử lý toàn bộ luồng dữ liệu: Audio -> Text -> FSW -> JSON Coordinates
    """
    # Input Validation
    if not file.filename.lower().endswith(('.wav', '.mp3', '.m4a', '.webm')):
        raise HTTPException(status_code=400, detail="The file format is not supported. Please use .wav, .mp3, .m4a, or .webm.")

    temp_audio_path = ""
    try:
        # Bước 1: Lưu tệp tạm thời
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_audio_path = temp_file.name

        logger.info(f"Processing audio file: {file.filename}")

        # Bước 2: Nhận dạng giọng nói (Whisper)
        recognized_text = asr_service.transcribe_and_translate(temp_audio_path)

        if not recognized_text:
            raise HTTPException(status_code=500, detail="ASR returned empty text.")

        # Bước 3: Dịch Text -> FSW bằng signwriting-translation
        fsw_code = get_translator_service().translate(
            text=recognized_text,
            spoken_lang="en",
            signed_lang="ase",
        )

        if not fsw_code:
            raise HTTPException(status_code=500, detail="Text-to-FSW translation returned empty output.")

        # Bước 4: Nội suy động học (Sinh ma trận .pose)
        logger.info("3D kinematic interpolation is in progress....")
        pose_bytes = animator_service.generate_pose_bytes(fsw_code)
        rule_debug = animator_service.build_rule_debug_payload(fsw_code)
        
        if not pose_bytes:
            raise HTTPException(status_code=500, detail="Internal error: Unable to generate animation data.")

        # Bước 5: Trích xuất trực tiếp tọa độ thành JSON
        pose_obj = Pose.read(pose_bytes)
        frames_data = pose_obj.body.data
        
        # Chuyển ma trận Numpy (Frames x People x Joints x Dims) thành mảng Python thuần
        # Dùng nan_to_num để đảm bảo JSON không sập vì các giá trị NaN/Infinity
        json_coordinates = np.nan_to_num(frames_data[:, 0, :, :]).tolist() 

        # Trả về kết quả tổng hợp
        return JSONResponse(
            status_code=200,
            content={
                "status": "success",
                "data": {
                    "recognized_text_en": recognized_text,
                    "fsw_code": fsw_code,
                    "pose_coordinates": json_coordinates,
                    "fps": pose_obj.body.fps,
                    "rule_debug": rule_debug,
                }
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