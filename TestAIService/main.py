import os
import io
import tempfile
import logging
import numpy as np
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pose_packager import PosePackager

from asr_engine import ASRService
from my_animator import FSWAnimator
from translate_engine import SignTranslationService


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

# Khởi tạo các dịch vụ lõi toàn cục (Global Services Initialization)
logger.info("Starting AI Services...")
asr_service = ASRService(model_size="small")
animator_service = FSWAnimator(fps=25, num_joints=52)
packager_service = PosePackager()

logger.info("Đang tải model Sockeye Text-to-FSW (Lần đầu sẽ mất 1-2 phút)...")
sockeye_translator = SignTranslationService()
logger.info("Sockeye model loaded successfully!")

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
        
        # Bước 3: Dịch Text -> FSW bằng mô hình Sockeye
        logger.info(f"Đang phân tích và dịch ngữ nghĩa: '{recognized_text}'")
        try:
            fsw_code = sockeye_translator.translate(
                text=recognized_text, 
                spoken_lang="en", 
                signed_lang="ase"
            )
            logger.info(f"Mã FSW sinh ra từ AI: {fsw_code}")
        except Exception as e:
            logger.error(f"Lỗi khi chạy Inference Sockeye: {str(e)}")
            raise HTTPException(status_code=500, detail="Lỗi dịch thuật AI: Không thể nội suy FSW.")

        if not fsw_code:
            raise HTTPException(status_code=500, detail="Lỗi hệ thống: Mô hình AI trả về chuỗi FSW rỗng.")

        # Bước 4: Nội suy động học (Sinh ma trận tọa độ trực tiếp)
        logger.info("Đang tiến hành nội suy động học 3D...")
        json_coordinates = animator_service.generate_coordinates(fsw_code)
        
        if not json_coordinates:
            raise HTTPException(status_code=500, detail="Lỗi nội bộ: Không thể sinh dữ liệu hoạt ảnh.")

        # Bước 4.5: Đóng gói thành file Nhị phân (Block 5.0)
        pose_file_path = packager_service.package_to_binary(json_coordinates)

        # Bước 5: Trả về kết quả JSON
        return JSONResponse(
            status_code=200,
            content={
                "status": "success",
                "data": {
                    "recognized_text_en": recognized_text,
                    "fsw_code": fsw_code,
                    "pose_file_path": pose_file_path,
                    "pose_coordinates": json_coordinates,
                    "fps": animator_service.fps
                }
            }
        )

    except HTTPException:
        # Re-raise HTTP exceptions to maintain specific error codes and messages
        raise
    except Exception as e:
        logger.error(f"System error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Data stream processing error: {str(e)}")

    finally:
        # Bước 6: Dọn dẹp
        if temp_audio_path and os.path.exists(temp_audio_path):
            os.remove(temp_audio_path)
            logger.info("Temporary audio files have been cleaned up.")