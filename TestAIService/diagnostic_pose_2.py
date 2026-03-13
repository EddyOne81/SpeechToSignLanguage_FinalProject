import io
import numpy as np
import traceback
from pose_format import Pose
from pose_format.pose_header import PoseHeader, PoseHeaderDimensions, PoseHeaderComponent
from pose_format.numpy.pose_body import NumPyPoseBody 

print("=== BẮT ĐẦU CHẨN ĐOÁN LÕI POSE-FORMAT (PHẦN 2) ===")

try:
    dimensions = PoseHeaderDimensions(width=1000, height=1000, depth=0)
    
    # 1. Khởi tạo Component (đã kiểm chứng là nhận diện length=2 ở bài test trước)
    component = PoseHeaderComponent(
        name="CUSTOM_SIGN_MODEL",
        points=[f"JOINT_{i}" for i in range(52)],
        limbs=[],
        colors=[(255, 255, 255)] * 52,
        point_format=["X", "Y"]
    )
    header = PoseHeader(version=0.1, dimensions=dimensions, components=[component])
    print("[1] Đã tạo Header thành công. Giá trị format:", component.format)

    # 2. Khởi tạo Body với ma trận 2 chiều (XY)
    frames_data = np.zeros((10, 1, 52, 2), dtype=np.float32)
    confidence = np.ones((10, 1, 52), dtype=np.float32)
    body = NumPyPoseBody(fps=25, data=frames_data, confidence=confidence)
    print("[2] Đã tạo Body thành công. Chiều data:", frames_data.shape)

    # 3. Ráp nối đối tượng Pose
    print("[3] Đang khởi tạo đối tượng Pose...")
    pose = Pose(header, body)
    print(" -> Đối tượng Pose đã khởi tạo thành công!")
    
    # 4. Ghi ra tệp nhị phân
    print("[4] Đang kết xuất nhị phân (Binary Serialization)...")
    with io.BytesIO() as buffer:
        pose.write(buffer)
        print(f" -> Đã ghi thành công! Độ dài: {len(buffer.getvalue())} bytes.")

except Exception as e:
    print("\n[!] TÌM THẤY ĐIỂM SẬP HỆ THỐNG. TRACEBACK CHI TIẾT:")
    traceback.print_exc()

print("=== KẾT THÚC CHẨN ĐOÁN ===")