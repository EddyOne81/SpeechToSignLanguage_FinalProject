import os
import shutil
import tempfile
import warnings

import whisper

warnings.filterwarnings("ignore", category=UserWarning)


def _ensure_ffmpeg_cli() -> str:
    """
    Whisper cần command `ffmpeg` nằm trong PATH.
    Hàm này tự tìm binary từ imageio-ffmpeg và tạo shim ffmpeg.exe khi cần.
    """
    direct_ffmpeg = shutil.which("ffmpeg")
    if direct_ffmpeg:
        return direct_ffmpeg

    try:
        from imageio_ffmpeg import get_ffmpeg_exe
    except Exception as exc:
        raise RuntimeError(
            "Khong tim thay ffmpeg command. Hay cai FFmpeg system-wide hoac cai package imageio-ffmpeg."
        ) from exc

    imageio_ffmpeg_path = get_ffmpeg_exe()
    if not imageio_ffmpeg_path or not os.path.exists(imageio_ffmpeg_path):
        raise RuntimeError("imageio-ffmpeg da cai nhung khong tim thay ffmpeg binary.")

    ffmpeg_dir = os.path.dirname(imageio_ffmpeg_path)
    os.environ["PATH"] = ffmpeg_dir + os.pathsep + os.environ.get("PATH", "")

    # imageio co the dat ten binary khac ffmpeg.exe (vd: ffmpeg-win-x86_64-v7.1.exe)
    # nen tao shim ffmpeg.exe trong temp de whisper goi subprocess on dinh.
    if not shutil.which("ffmpeg"):
        shim_dir = os.path.join(tempfile.gettempdir(), "s2s_ffmpeg")
        os.makedirs(shim_dir, exist_ok=True)
        shim_name = "ffmpeg.exe" if os.name == "nt" else "ffmpeg"
        shim_path = os.path.join(shim_dir, shim_name)

        if (not os.path.exists(shim_path)) or (os.path.getsize(shim_path) != os.path.getsize(imageio_ffmpeg_path)):
            shutil.copyfile(imageio_ffmpeg_path, shim_path)
            if os.name != "nt":
                os.chmod(shim_path, 0o755)

        os.environ["PATH"] = shim_dir + os.pathsep + os.environ.get("PATH", "")

    resolved_ffmpeg = shutil.which("ffmpeg")
    if not resolved_ffmpeg:
        raise RuntimeError(
            "Khong the kich hoat ffmpeg command trong PATH."
        )

    return resolved_ffmpeg


def _resolve_whisper_download_root() -> str | None:
    download_root = os.environ.get("WHISPER_MODEL_DIR", "").strip()
    if not download_root:
        return None
    os.makedirs(download_root, exist_ok=True)
    return download_root


def _cached_model_path(model_size: str, download_root: str | None) -> str:
    base_dir = download_root or os.path.join(os.path.expanduser("~"), ".cache", "whisper")
    return os.path.join(base_dir, f"{model_size}.pt")


def _load_whisper_model(model_size: str):
    download_root = _resolve_whisper_download_root()
    load_kwargs = {"download_root": download_root} if download_root else {}

    try:
        return whisper.load_model(model_size, **load_kwargs)
    except RuntimeError as exc:
        err = str(exc)
        if "SHA256 checksum" not in err:
            raise

        cached_model = _cached_model_path(model_size, download_root)
        if os.path.exists(cached_model):
            os.remove(cached_model)
            print(f"Da xoa model cache bi hong: {cached_model}")

        print("Retry download model Whisper sau khi xoa cache loi...")
        return whisper.load_model(model_size, **load_kwargs)


class ASRService:
    def __init__(self, model_size="base"):
        self.ffmpeg_path = _ensure_ffmpeg_cli()
        print(f"FFmpeg executable: {self.ffmpeg_path}")

        print(f"Đang tải model Whisper ({model_size})...")
        self.model = _load_whisper_model(model_size)
        print("Whisper model loaded successfully!")

    def transcribe_and_translate(self, audio_path: str) -> str:
        print(f"Đang xử lý âm thanh: {audio_path}")
        try:
            result = self.model.transcribe(
                audio_path,
                task="translate",
                language="vi",
                temperature=0.0,
                fp16=False,
            )
            return result["text"].strip()
        except FileNotFoundError as exc:
            raise RuntimeError(
                "ASR loi do khong tim thay ffmpeg command."
            ) from exc