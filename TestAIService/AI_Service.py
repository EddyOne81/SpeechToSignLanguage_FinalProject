from translate_engine import SignTranslationService

print("Đang tải model và dịch... (Lần đầu sẽ mất khoảng 1-2 phút để tải)")

# Đây là hàm DÙNG, không phải hàm TRAIN
# Nó sẽ tự động tải model "tốt nhất" mà họ đã train sẵn

translator_service = SignTranslationService()

fsw_result = translator_service.translate(
        text="hi", 
        spoken_lang="en", 
        signed_lang="ase"
    )

print("Kết quả FSW:", fsw_result)

# from signwriting_animation.bin import get_args

# signwriting_to_pose = get_args()