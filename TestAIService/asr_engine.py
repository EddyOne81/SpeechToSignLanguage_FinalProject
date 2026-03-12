import whisper
import warnings

warnings.filterwarnings("ignore", category=UserWarning)

class ASRService:
    def __init__(self, model_size="base"):
        print(f"Đang tải model Whisper ({model_size})...")
        self.model = whisper.load_model(model_size)
        print("Whisper model loaded successfully!")

    def transcribe_and_translate(self, audio_path: str) -> str:
        print(f"Đang xử lý âm thanh: {audio_path}")
        result = self.model.transcribe(
            audio_path,
            task="translate", 
            fp16=False 
        )
        return result["text"].strip()