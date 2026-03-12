import os
os.environ["HF_HUB_DISABLE_PROGRESS_BARS"] = "1"

import time
import warnings
from pathlib import Path
warnings.filterwarnings("ignore")
from functools import lru_cache

# Import các thành phần từ thư viện gốc
from signwriting.tokenizer import SignWritingTokenizer
from sockeye.inference import TranslatorOutput
from signwriting_translation.tokenizer import tokenize_spoken_text

# --- Phần giữ nguyên logic xử lý của thư viện ---
sw_tokenizer = SignWritingTokenizer()

def process_translation_output(output: TranslatorOutput):
    all_factors = [output.tokens] + output.factor_tokens
    symbols = [" ".join(f).replace("M c0 r0", "M") for f in list(zip(*all_factors))]
    return sw_tokenizer.tokens_to_text((" ".join(symbols)).split(" "))

@lru_cache(maxsize=None)
def load_sockeye_translator(model_path: str):
    """Load model Sockeye (Chỉ chạy 1 lần nhờ lru_cache)"""
    # Tự động tải model từ HuggingFace nếu chưa có
    if not Path(model_path).is_dir():
        from huggingface_hub import snapshot_download
        print(f"Downloading model: {model_path}...")
        model_path = snapshot_download(repo_id=model_path)

    from sockeye.translate import parse_translation_arguments, load_translator_from_args

    # Cấu hình tham số inference
    args = parse_translation_arguments([
        "-m", model_path,
        "--beam-size", "5", # Tăng beam-size để kết quả chính xác hơn (mặc định script là 5)
    ])
    translator = load_translator_from_args(args, True)
    print("Model loaded successfully!")
    return translator

# --- Phần Custom Class cho Service ---

class SignTranslationService:
    def __init__(self, model_repo="sign/sockeye-text-to-factored-signwriting"):
        self.model_repo = model_repo
        self.translator = load_sockeye_translator(self.model_repo)

    def translate(self, text: str, spoken_lang="en", signed_lang="ase") -> str:

        from sockeye.inference import make_input_from_plain_string

        # 1. Tokenize văn bản đầu vào (Chuẩn hóa text)
        tokenized_text = tokenize_spoken_text(text)

        # 2. Tạo format input đặc biệt cho model: "$en $ase hello world"
        model_input_str = f"${spoken_lang} ${signed_lang} {tokenized_text}"
        
        # 3. Tạo input object cho Sockeye
        sockeye_input = make_input_from_plain_string(sentence_id=0, string=model_input_str)

        # 4. Thực hiện dịch (Inference)
        outputs = self.translator.translate([sockeye_input])

        # 5. Xử lý kết quả đầu ra
        fsw_result = process_translation_output(outputs[0])
        
        return fsw_result