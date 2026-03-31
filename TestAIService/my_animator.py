import numpy as np
import re
import math
import logging

logger = logging.getLogger(__name__)

class FSWAnimator:
    def __init__(self, fps=25, num_joints=52):
        self.fps = fps
        self.num_joints = num_joints
        # Đã thu nhỏ tỷ lệ xương để bàn tay cân đối với cơ thể
        self.bone_lengths = [15.0, 12.0, 8.0, 6.0] 

    def generate_coordinates(self, fsw_string: str) -> list:
        try:
            frames_data = self._parse_and_interpolate_sequential(fsw_string)
            return np.nan_to_num(frames_data[:, 0, :, :]).tolist()
        except Exception as e:
            logger.error(f"Lỗi sinh dữ liệu động học: {str(e)}")
            return []

    def _map_fsw_to_canvas(self, fsw_x, fsw_y):
        canvas_x = 500 + (fsw_x - 500) * 1.5
        canvas_y = 250 + (fsw_y - 500) * 1.5
        return canvas_x, canvas_y

    def _calculate_wrist_rotation(self, shoulder: np.ndarray, elbow: np.ndarray, wrist: np.ndarray, is_left=False) -> float:
        forearm_vector = wrist - elbow
        rotation_rad = math.atan2(forearm_vector[1], forearm_vector[0]) + (math.pi / 2.0)
        return rotation_rad

    def _get_fsw_hand_angles(self, symbol_hex: str):
        if not symbol_hex: return [20, 40, 40, 40, 40]
        shape_id = symbol_hex[:3].lower()
        
        shape_angles = {
            "15a": [0, 0, 0, 0, 0],          # Bàn tay xòe
            "100": [45, 120, 120, 120, 120], # Nắm đấm
            "115": [0, 0, 0, 0, 0],          # Khép phẳng
            "14c": [90, 0, 120, 120, 120]    # Chỉ tay
        }
        return shape_angles.get(shape_id, [20, 40, 40, 40, 40])

    def _build_kinematic_hand(self, wrist_x, wrist_y, rotation_rad, symbol_hex="", is_left=False):
        hand = np.zeros((21, 2), dtype=np.float32)
        hand[0] = [wrist_x, wrist_y]
        
        bend_angles = self._get_fsw_hand_angles(symbol_hex)
        dir_mult = 1 if is_left else -1

        # ❗ PHỤC HỒI LOGIC: Tách biệt góc tỏa mu bàn tay (hẹp) và góc xòe ngón tay (rộng)
        palm_spreads = [-15, -5, 0, 5, 10]
        finger_spreads = [-30, -10, 0, 10, 20] 

        idx = 1
        for f in range(5):
            palm_spread_rad = math.radians(palm_spreads[f]) * dir_mult
            finger_spread_rad = math.radians(finger_spreads[f]) * dir_mult
            bend_rad = math.radians(bend_angles[f])
            
            if symbol_hex.startswith("115"):
                finger_spread_rad = math.radians(0) if f > 0 else math.radians(-30 * dir_mult)
                palm_spread_rad = math.radians(0) if f > 0 else math.radians(-15 * dir_mult)

            current_x, current_y = wrist_x, wrist_y

            for joint in range(4):
                # Khớp 0 là Mu bàn tay (Dùng góc hẹp). Từ khớp 1 là ngón tay (Dùng góc xòe)
                if joint == 0:
                    current_angle = rotation_rad + palm_spread_rad
                else:
                    if joint == 1:
                        current_angle = rotation_rad + finger_spread_rad
                    current_angle += bend_rad / 3.0 * dir_mult

                length = self.bone_lengths[joint]
                
                next_x = current_x + length * math.sin(current_angle)
                next_y = current_y + length * math.cos(current_angle)
                
                hand[idx] = [next_x, next_y]
                current_x, current_y = next_x, next_y
                idx += 1
                
        return hand

    def _get_neutral_pose(self) -> np.ndarray:
        base_x, base_y = 500.0, 250.0 
        neutral_pose = np.zeros((self.num_joints, 2), dtype=np.float32)
        
        neutral_pose[0] = [base_x, base_y - 150]      
        neutral_pose[1] = [base_x, base_y - 80]       
        neutral_pose[2] = [base_x - 100, base_y - 80] 
        neutral_pose[5] = [base_x + 100, base_y - 80] 
        neutral_pose[8] = [base_x - 60, base_y + 180] 
        neutral_pose[9] = [base_x + 60, base_y + 180] 
        
        neutral_pose[3] = [base_x - 130, base_y + 50] 
        neutral_pose[4] = [base_x - 130, base_y + 150]
        neutral_pose[6] = [base_x + 130, base_y + 50] 
        neutral_pose[7] = [base_x + 130, base_y + 150]
        
        r_wrist_rot = self._calculate_wrist_rotation(neutral_pose[2], neutral_pose[3], neutral_pose[4], is_left=False)
        l_wrist_rot = self._calculate_wrist_rotation(neutral_pose[5], neutral_pose[6], neutral_pose[7], is_left=True)

        neutral_pose[10:31] = self._build_kinematic_hand(neutral_pose[4][0], neutral_pose[4][1], r_wrist_rot, "default", is_left=False)
        neutral_pose[31:52] = self._build_kinematic_hand(neutral_pose[7][0], neutral_pose[7][1], l_wrist_rot, "default", is_left=True)
        
        return neutral_pose

    def _parse_fsw_word_to_pose(self, fsw_word: str, neutral_pose: np.ndarray) -> np.ndarray:
        target_pose = np.copy(neutral_pose)
        pattern = r"S([0-9a-fA-F]{5})(\d{3})x(\d{3})"
        symbols = re.findall(pattern, fsw_word)
        
        left_hand_sym, right_hand_sym = "default", "default"

        for sym_id, x_str, y_str in symbols:
            is_hand_shape = sym_id.startswith("1") or sym_id.startswith("20")
            raw_x, raw_y = float(x_str), float(y_str)
            mapped_x, mapped_y = self._map_fsw_to_canvas(raw_x, raw_y)
            
            if raw_x < 500: 
                target_pose[4] = [mapped_x, mapped_y]
                if is_hand_shape: right_hand_sym = sym_id
            else:
                target_pose[7] = [mapped_x, mapped_y] 
                if is_hand_shape: left_hand_sym = sym_id
                
        r_wrist_rot = self._calculate_wrist_rotation(target_pose[2], target_pose[3], target_pose[4], is_left=False)
        l_wrist_rot = self._calculate_wrist_rotation(target_pose[5], target_pose[6], target_pose[7], is_left=True)

        target_pose[10:31] = self._build_kinematic_hand(target_pose[4][0], target_pose[4][1], r_wrist_rot, right_hand_sym, is_left=False)
        target_pose[31:52] = self._build_kinematic_hand(target_pose[7][0], target_pose[7][1], l_wrist_rot, left_hand_sym, is_left=True)
                
        return target_pose

    def _parse_and_interpolate_sequential(self, fsw_string: str) -> np.ndarray:
        neutral_pose = self._get_neutral_pose()
        
        if not fsw_string or not isinstance(fsw_string, str):
            frames_data = np.zeros((125, 1, self.num_joints, 2), dtype=np.float32)
            for f in range(125): frames_data[f, 0] = neutral_pose
            return frames_data
            
        fsw_words = [word for word in fsw_string.split() if "S" in word]
        if not fsw_words:
            frames_data = np.zeros((125, 1, self.num_joints, 2), dtype=np.float32)
            for f in range(125): frames_data[f, 0] = neutral_pose
            return frames_data

        transition_frames = 20  
        hold_frames = 35        
        total_frames = (transition_frames + hold_frames) * len(fsw_words) + transition_frames
        
        frames_data = np.zeros((total_frames, 1, self.num_joints, 2), dtype=np.float32)
        target_poses = [self._parse_fsw_word_to_pose(word, neutral_pose) for word in fsw_words]
        
        current_frame = 0
        start_pose = np.copy(neutral_pose) 
        
        for end_pose in target_poses:
            for f in range(transition_frames):
                t = f / transition_frames
                frames_data[current_frame, 0] = (1 - t) * start_pose + t * end_pose
                current_frame += 1
            for f in range(hold_frames):
                frames_data[current_frame, 0] = end_pose
                current_frame += 1
            start_pose = np.copy(end_pose)
            
        for f in range(transition_frames):
            t = f / transition_frames
            frames_data[current_frame, 0] = (1 - t) * start_pose + t * neutral_pose
            current_frame += 1
            
        return frames_data