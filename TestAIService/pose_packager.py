import os
import time
import numpy as np
import logging

logger = logging.getLogger(__name__)

class PosePackager:
    """
    Block 5.0: Pose Packaging (Theo đúng Data Flow Diagram)
    Chịu trách nhiệm nén ma trận tọa độ thành file nhị phân (Binary Pose File)
    và quản lý đường dẫn lưu trữ.
    """
    def __init__(self, storage_dir="storage/poses"):
        self.storage_dir = storage_dir
        # Tự động tạo thư mục lưu trữ nếu chưa có
        if not os.path.exists(self.storage_dir):
            os.makedirs(self.storage_dir)
            logger.info(f"Đã tạo thư mục lưu trữ file Pose nhị phân: {self.storage_dir}")

    def package_to_binary(self, frames_data: list, prefix="fsw") -> str:
        """
        Nén mảng tọa độ thành file nhị phân (.npy format giả lập .pose binary)
        Trả về đường dẫn tương đối để lưu vào Database.
        """
        try:
            timestamp = int(time.time() * 1000)
            filename = f"{prefix}_{timestamp}.pose"
            filepath = os.path.join(self.storage_dir, filename)
            
            # Chuyển đổi list về lại Numpy Array để nén nhị phân
            np_data = np.array(frames_data, dtype=np.float32)
            
            # Lưu dưới dạng Binary nguyên thủy (Numpy format)
            # Dung lượng cực nhẹ, phù hợp tiêu chuẩn truyền tải mạng
            np.save(filepath, np_data)
            
            logger.info(f"Đã đóng gói thành công file nhị phân: {filepath} (Size: {os.path.getsize(filepath)} bytes)")
            
            # Trả về đường dẫn để API trả cho Client và lưu Database
            return filepath
            
        except Exception as e:
            logger.error(f"Lỗi trong quá trình Pose Packaging: {str(e)}")
            return ""