import io
import logging
import numpy as np
from typing import Optional

from pose_format import Pose
from pose_format.pose_header import PoseHeader, PoseHeaderDimensions, PoseHeaderComponent
from pose_format.numpy.pose_body import NumPyPoseBody 

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class FSWAnimator:
    """
    Mô-đun nội suy động học tùy chỉnh xử lý Formal SignWriting (FSW) thành định dạng .pose (2D).
    """

    def __init__(self, fps: int = 25, num_joints: int = 52):
        self.fps = fps
        self.num_joints = num_joints

    def _create_pose_header(self) -> PoseHeader:
        """
        Khởi tạo phần Header chuẩn định dạng .pose mô tả cấu trúc không gian 2D.
        """
        dimensions = PoseHeaderDimensions(width=1000, height=1000, depth=0)
        
        components = [
            PoseHeaderComponent(
                name="CUSTOM_SIGN_MODEL",
                points=[f"JOINT_{i}" for i in range(self.num_joints)],
                limbs=[],
                colors=[(255, 255, 255)] * self.num_joints,
                point_format="XYC" 
            )
        ]
        return PoseHeader(version=0.1, dimensions=dimensions, components=components)

    # TODO: [AI Integration Phase] - Mã giả lập (Mock Data)
    def _interpolate_kinematics(self, fsw_string: str) -> np.ndarray:
        """
        Thuật toán sinh tọa độ giả lập hình nhân dang tay vẫy (Waving Animation).
        """
        import math
        num_frames = 125
        frames_data = np.zeros((num_frames, 1, self.num_joints, 2), dtype=np.float32)
        
        for f in range(num_frames):
            base_x = 500
            base_y = 300 
            
            # Tạo nhịp điệu chuyển động vẫy tay
            wave_right = math.sin(f * 0.2) * 80 
            wave_left = math.cos(f * 0.2) * 80
            
            # --- TỌA ĐỘ TRỤC CƠ THỂ (ĐỨNG YÊN) ---
            frames_data[f, 0, 0] = [base_x, base_y - 100]      # 0: Mũi
            frames_data[f, 0, 1] = [base_x, base_y - 50]       # 1: Cổ
            frames_data[f, 0, 2] = [base_x - 60, base_y - 50]  # 2: Vai phải
            frames_data[f, 0, 5] = [base_x + 60, base_y - 50]  # 5: Vai trái
            frames_data[f, 0, 8] = [base_x - 40, base_y + 150] # 8: Hông phải
            frames_data[f, 0, 9] = [base_x + 40, base_y + 150] # 9: Hông trái
            
            # --- TỌA ĐỘ CÁNH TAY (CỬ ĐỘNG) ---
            frames_data[f, 0, 3] = [base_x - 120, base_y - 50 + (wave_right * 0.5)] # 3: Khuỷu tay phải
            frames_data[f, 0, 4] = [base_x - 180, base_y - 50 + wave_right]         # 4: Cổ tay phải
            
            frames_data[f, 0, 6] = [base_x + 120, base_y - 50 + (wave_left * 0.5)]  # 6: Khuỷu tay trái
            frames_data[f, 0, 7] = [base_x + 180, base_y - 50 + wave_left]          # 7: Cổ tay trái
            
            # Bàn tay đi theo cổ tay
            for i in range(10, 31): 
                frames_data[f, 0, i] = [base_x - 190, base_y - 50 + wave_right]
            for i in range(31, 52): 
                frames_data[f, 0, i] = [base_x + 190, base_y - 50 + wave_left]

        return frames_data

    def generate_pose_bytes(self, fsw_string: str) -> Optional[bytes]:
        """
        Chuyển đổi chuỗi FSW thành tệp nhị phân .pose và lưu trữ trực tiếp trên RAM.
        """
        if not fsw_string or not isinstance(fsw_string, str):
            logger.error("Dữ liệu FSW đầu vào bị trống hoặc sai định dạng.")
            raise ValueError("Chuỗi FSW không hợp lệ.")

        try:
            logger.info("Bắt đầu khởi tạo ma trận tọa độ khớp xương...")
            header = self._create_pose_header()
            frames_data = self._interpolate_kinematics(fsw_string)
            
            confidence_masks = np.ones(frames_data.shape[:-1], dtype=np.float32)
            
            body = NumPyPoseBody(fps=self.fps, data=frames_data, confidence=confidence_masks)
            pose = Pose(header, body)

            with io.BytesIO() as buffer:
                pose.write(buffer)
                pose_bytes = buffer.getvalue()
                
            logger.info(f"Biên dịch tệp .pose thành công. Dung lượng: {len(pose_bytes)} bytes.")
            return pose_bytes

        except Exception as e:
            logger.error(f"Lỗi nghiêm trọng trong quá trình sinh hoạt ảnh: {str(e)}")
            raise