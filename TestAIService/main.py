import os
import shutil
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from asr_engine import ASRService
from translate_engine import SignTranslationService

app = FastAPI(title="Sign Language AI Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

print("Đang nạp các mô hình Trí tuệ nhân tạo vào bộ nhớ...")
asr_service = ASRService(model_size="base")
translator_service = SignTranslationService()
print("Hệ thống đã sẵn sàng tiếp nhận luồng dữ liệu.")

@app.post("/api/v1/translate/audio")
async def translate_audio_to_fsw(file: UploadFile = File(...)):
    allowed_extensions = ["audio/wav", "audio/mpeg", "audio/mp4", "video/mp4", "audio/x-m4a"]
    if file.content_type not in allowed_extensions:
        raise HTTPException(status_code=400, detail="Định dạng tệp tin không được hỗ trợ.")

    temp_dir = os.path.join(os.getcwd(), "temp_workspace")
    os.makedirs(temp_dir, exist_ok=True)
    file_path = os.path.join(temp_dir, file.filename)

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        english_text = asr_service.transcribe_and_translate(file_path)
        
        if not english_text:
            raise HTTPException(status_code=422, detail="Hệ thống không nhận diện được giọng nói.")

        fsw_result = translator_service.translate(
            text=english_text, 
            spoken_lang="en", 
            signed_lang="ase"
        )

        return {
            "status": "success",
            "data": {
                "recognized_text_en": english_text,
                "fsw_code": fsw_result
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi máy chủ nội bộ: {str(e)}")
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)