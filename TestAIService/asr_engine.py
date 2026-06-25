import os
import logging

from groq import Groq

logger = logging.getLogger(__name__)

GROQ_MODEL = os.getenv("GROQ_WHISPER_MODEL", "whisper-large-v3")


class ASRService:
    def __init__(self, model_size: str = "small"):
        api_key = os.environ.get("GROQ_API_KEY", "")
        if not api_key:
            raise RuntimeError("GROQ_API_KEY environment variable is not set.")
        self.client = Groq(api_key=api_key)
        logger.info("ASRService ready (Groq %s).", GROQ_MODEL)

    def transcribe_and_translate(self, audio_path: str) -> str:
        """Send audio file to Groq Whisper and return English transcription."""
        logger.info("Sending audio to Groq ASR: %s", audio_path)
        filename = os.path.basename(audio_path)
        with open(audio_path, "rb") as f:
            result = self.client.audio.translations.create(
                file=(filename, f.read()),
                model=GROQ_MODEL,
                response_format="text",
                # Greedy decoding — reduces Whisper's tendency to hallucinate a
                # generic token (e.g. "You") on quiet or short audio.
                temperature=0,
            )
        text = result if isinstance(result, str) else result.text
        return text.strip()
