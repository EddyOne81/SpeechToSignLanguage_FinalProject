from pose_format.pose_header import PoseHeaderComponent

print("=== BẮT ĐẦU CHẨN ĐOÁN HỘP ĐEN THƯ VIỆN POSE-FORMAT ===")

# Các trường hợp kiểm thử (Test Cases) để dò tìm định dạng hợp lệ
test_cases = [
    "XY",
    "XYZ",
    ("X", "Y"),
    ["X", "Y"],
    "X,Y",
    "X Y"
]

for fmt in test_cases:
    try:
        # Khởi tạo đối tượng giả lập (Mock Object)
        comp = PoseHeaderComponent(
            name="TEST_MODEL", 
            points=["JOINT_0"], 
            limbs=[], 
            colors=[(255, 255, 255)], 
            point_format=fmt
        )
        print(f"[ĐẦU VÀO] point_format = {repr(fmt)}")
        print(f" -> Kiểu dữ liệu lưu trữ (Type): {type(comp.format).__name__}")
        print(f" -> Số chiều thực tế (Length): {len(comp.format)}")
        print(f" -> Giá trị bộ nhớ: {comp.format}\n")
    except Exception as e:
        print(f"[ĐẦU VÀO] point_format = {repr(fmt)}")
        print(f" -> TỪ CHỐI VỚI LỖI: {str(e)}\n")

print("=== KẾT THÚC CHẨN ĐOÁN ===")