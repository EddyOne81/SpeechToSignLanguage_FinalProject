import io
import logging
import math
from dataclasses import dataclass
from typing import Optional

import numpy as np
from pose_format import Pose
from pose_format.pose_header import PoseHeader, PoseHeaderDimensions, PoseHeaderComponent
from pose_format.numpy.pose_body import NumPyPoseBody 
from signwriting.formats.fsw_to_sign import fsw_to_sign
from signwriting.tokenizer import SignWritingTokenizer, normalize_signwriting

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class ParsedSymbol:
    raw: str
    base: str
    fill: int
    rotation: int
    x: int
    y: int


@dataclass(frozen=True)
class ParsedSign:
    normalized_fsw: str
    tokens: list[str]
    box_symbol: str
    box_x: int
    box_y: int
    symbols: list[ParsedSymbol]


@dataclass(frozen=True)
class SymbolGroupInfo:
    group_id: int
    category_id: int
    category_name: str
    group_name: str
    start_base: str


@dataclass(frozen=True)
class MovementProfile:
    group_id: int
    group_name: str
    pattern: str
    vector_x: float
    vector_y: float
    distance_scale: float
    curve_scale: float = 0.0
    oscillation_scale: float = 0.0
    rotation_nibble: int = 0

class FSWAnimator:
    """
    Mô-đun nội suy động học tùy chỉnh xử lý Formal SignWriting (FSW) thành định dạng .pose (2D).
    """

    FRAME_COUNT = 120
    HAND_SCALE = 32.0
    MOTION_DISTANCE = 80.0
    WAVE_AMPLITUDE = 28.0

    # Nhãn hướng theo rotation nibble (0..15), xuất phát từ chiều "right" và quay ngược chiều kim đồng hồ.
    DIRECTION_LABELS_16 = (
        "right",
        "right-up",
        "up-right",
        "up-up-right",
        "up",
        "up-up-left",
        "up-left",
        "left-up",
        "left",
        "left-down",
        "down-left",
        "down-down-left",
        "down",
        "down-down-right",
        "down-right",
        "right-down",
    )

    DIRECTION_LABELS_8 = (
        "right",
        "up-right",
        "up",
        "up-left",
        "left",
        "down-left",
        "down",
        "down-right",
    )

    DIRECTION_ARROWS_8 = (
        "->",
        "↗",
        "↑",
        "↖",
        "<-",
        "↙",
        "↓",
        "↘",
    )

    # ISWA SymbolGroup anchors (theo SignBank ISWA reference).
    ISWA_GROUPS: tuple[SymbolGroupInfo, ...] = (
        SymbolGroupInfo(1, 1, "Hands", "Index", "S100"),
        SymbolGroupInfo(2, 1, "Hands", "Index Middle", "S10e"),
        SymbolGroupInfo(3, 1, "Hands", "Index Middle Thumb", "S11e"),
        SymbolGroupInfo(4, 1, "Hands", "Four Fingers", "S144"),
        SymbolGroupInfo(5, 1, "Hands", "Five Fingers", "S14c"),
        SymbolGroupInfo(6, 1, "Hands", "Baby Finger", "S186"),
        SymbolGroupInfo(7, 1, "Hands", "Ring Finger", "S1a4"),
        SymbolGroupInfo(8, 1, "Hands", "Middle Finger", "S1ba"),
        SymbolGroupInfo(9, 1, "Hands", "Index Thumb", "S1cd"),
        SymbolGroupInfo(10, 1, "Hands", "Thumb", "S1f5"),
        SymbolGroupInfo(11, 2, "Movement", "Contact", "S205"),
        SymbolGroupInfo(12, 2, "Movement", "Finger Movement", "S216"),
        SymbolGroupInfo(13, 2, "Movement", "Straight Wall Plane", "S22a"),
        SymbolGroupInfo(14, 2, "Movement", "Straight Diagonal Plane", "S255"),
        SymbolGroupInfo(15, 2, "Movement", "Straight Floor Plane", "S265"),
        SymbolGroupInfo(16, 2, "Movement", "Curves Parallel Wall Plane", "S288"),
        SymbolGroupInfo(17, 2, "Movement", "Curves Hit Wall Plane", "S2a6"),
        SymbolGroupInfo(18, 2, "Movement", "Curves Hit Floor Plane", "S2b7"),
        SymbolGroupInfo(19, 2, "Movement", "Curves Parallel Floor Plane", "S2d5"),
        SymbolGroupInfo(20, 2, "Movement", "Circles", "S2e3"),
        SymbolGroupInfo(21, 3, "Dynamics", "Dynamics & Timing", "S2f7"),
        SymbolGroupInfo(22, 4, "Head & Faces", "Head", "S2ff"),
        SymbolGroupInfo(23, 4, "Head & Faces", "Brow Eyes Eyegaze", "S30a"),
        SymbolGroupInfo(24, 4, "Head & Faces", "Cheeks Ears Nose Breath", "S32a"),
        SymbolGroupInfo(25, 4, "Head & Faces", "Mouth Lips", "S33b"),
        SymbolGroupInfo(26, 4, "Head & Faces", "Tongue Teeth Chin Neck", "S359"),
        SymbolGroupInfo(27, 5, "Body", "Trunk", "S36d"),
        SymbolGroupInfo(28, 5, "Body", "Limbs", "S376"),
        SymbolGroupInfo(29, 6, "Detailed Location", "Detailed Location", "S37f"),
        SymbolGroupInfo(30, 7, "Punctuation", "Punctuation", "S387"),
    )

    # Mapping coarse từ Hands SymbolGroup -> hand template.
    HANDSHAPE_BY_GROUP_ID = {
        1: "POINT",
        2: "B",
        3: "C",
        4: "B",
        5: "OPEN",
        6: "A",
        7: "C",
        8: "B",
        9: "POINT",
        10: "A",
    }

    def __init__(self, fps: int = 25, num_joints: int = 52):
        self.fps = fps
        self.num_joints = num_joints
        self.tokenizer = SignWritingTokenizer()
        self.hand_templates = self._create_hand_templates()

    @staticmethod
    def _create_hand_templates() -> dict[str, list[tuple[float, float]]]:
        """
        Tạo hand templates chuẩn 21 keypoints (MediaPipe-style, tọa độ tương đối).
        """
        def make_template(spread: float, curl: float) -> list[tuple[float, float]]:
            points = [(0.0, 0.0)]
            finger_bases = (-0.36, -0.18, 0.0, 0.18, 0.36)
            for base_x in finger_bases:
                for joint in range(1, 5):
                    x = (base_x * spread) + ((joint - 1) * base_x * 0.10)
                    y = -joint * (1.0 - curl * 0.25)
                    points.append((x, y))
            return points

        point_template = make_template(spread=1.0, curl=0.65)
        # Index finger (points 5..8) duỗi hơn để mô phỏng trỏ.
        for idx in range(5, 9):
            x, y = point_template[idx]
            point_template[idx] = (x, y - 0.6)

        return {
            "A": make_template(spread=0.85, curl=0.95),
            "B": make_template(spread=1.05, curl=0.05),
            "C": make_template(spread=1.00, curl=0.45),
            "OPEN": make_template(spread=1.25, curl=0.00),
            "POINT": point_template,
        }

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
                point_format="XY"
            )
        ]
        return PoseHeader(version=0.1, dimensions=dimensions, components=components)

    def _parse_fsw(self, fsw_string: str) -> ParsedSign:
        """
        Parse FSW bằng parser/tokenizer chính thức của signwriting.
        """
        normalized_fsw = normalize_signwriting(fsw_string)
        parsed_sign = fsw_to_sign(normalized_fsw)
        tokens = list(self.tokenizer.text_to_tokens(normalized_fsw, box_position=True))

        symbols: list[ParsedSymbol] = []
        for symbol in parsed_sign["symbols"]:
            raw = symbol["symbol"]
            if len(raw) < 6:
                continue
            symbols.append(
                ParsedSymbol(
                    raw=raw,
                    base=raw[:4],
                    fill=int(raw[4], 16),
                    rotation=int(raw[5], 16),
                    x=int(symbol["position"][0]),
                    y=int(symbol["position"][1]),
                )
            )

        return ParsedSign(
            normalized_fsw=normalized_fsw,
            tokens=tokens,
            box_symbol=parsed_sign["box"]["symbol"],
            box_x=int(parsed_sign["box"]["position"][0]),
            box_y=int(parsed_sign["box"]["position"][1]),
            symbols=symbols,
        )

    @staticmethod
    def _base_to_int(base: str) -> int:
        return int(base[1:], 16)

    def _resolve_symbol_group(self, symbol: ParsedSymbol) -> Optional[SymbolGroupInfo]:
        """
        Gán symbol vào SymbolGroup ISWA dựa trên base key (S100..S387).
        """
        code = self._base_to_int(symbol.base)
        for idx, group in enumerate(self.ISWA_GROUPS):
            start_code = self._base_to_int(group.start_base)
            next_start_code = self._base_to_int(self.ISWA_GROUPS[idx + 1].start_base) if idx + 1 < len(self.ISWA_GROUPS) else 0x38C
            if start_code <= code < next_start_code:
                return group
        return None

    def _category_counts(self, symbols: list[ParsedSymbol]) -> dict[int, int]:
        counts = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0}
        for symbol in symbols:
            group = self._resolve_symbol_group(symbol)
            if group is not None:
                counts[group.category_id] += 1
        return counts

    @staticmethod
    def _normalize_vector(x: float, y: float) -> tuple[float, float]:
        norm = math.hypot(x, y)
        if norm < 1e-8:
            return (0.0, 0.0)
        return (x / norm, y / norm)

    @staticmethod
    def _direction_from_rotation(rotation: int) -> tuple[float, float]:
        angle_rad = math.radians(rotation * 22.5)
        return (math.cos(angle_rad), -math.sin(angle_rad))

    def _rotation_debug_info(self, rotation: int) -> dict:
        idx16 = rotation % 16
        idx8 = ((idx16 + 1) // 2) % 8
        return {
            "rotation_nibble": idx16,
            "angle_deg": round(idx16 * 22.5, 3),
            "direction_16": self.DIRECTION_LABELS_16[idx16],
            "direction_8": self.DIRECTION_LABELS_8[idx8],
            "arrow_8": self.DIRECTION_ARROWS_8[idx8],
            "direction_index_16": idx16,
            "direction_index_8": idx8,
        }

    @staticmethod
    def _perpendicular(vx: float, vy: float) -> tuple[float, float]:
        return (-vy, vx)

    def _resolve_motion_profile(self, symbols: list[ParsedSymbol]) -> MovementProfile:
        """
        Map chi tiết ISWA Movement groups (11-20) thành profile quỹ đạo.
        """
        for symbol in symbols:
            group = self._resolve_symbol_group(symbol)
            if group is None or group.category_id != 2:
                continue

            # Group 11 (Contact): không tạo dịch chuyển toàn cục.
            if group.group_id == 11:
                continue

            dir_x, dir_y = self._direction_from_rotation(symbol.rotation)

            if group.group_id == 12:
                return MovementProfile(
                    group_id=group.group_id,
                    group_name=group.group_name,
                    pattern="micro",
                    vector_x=dir_x,
                    vector_y=dir_y,
                    distance_scale=0.20,
                    oscillation_scale=0.18,
                    rotation_nibble=symbol.rotation,
                )

            if group.group_id == 13:
                return MovementProfile(group.group_id, group.group_name, "straight", dir_x, dir_y, 1.00, rotation_nibble=symbol.rotation)

            if group.group_id == 14:
                return MovementProfile(group.group_id, group.group_name, "straight", dir_x, dir_y, 0.92, rotation_nibble=symbol.rotation)

            if group.group_id == 15:
                flat_x, flat_y = self._normalize_vector(dir_x, dir_y * 0.35)
                return MovementProfile(group.group_id, group.group_name, "straight-floor", flat_x, flat_y, 0.80, rotation_nibble=symbol.rotation)

            if group.group_id == 16:
                return MovementProfile(group.group_id, group.group_name, "curve", dir_x, dir_y, 0.95, curve_scale=0.45, rotation_nibble=symbol.rotation)

            if group.group_id == 17:
                return MovementProfile(group.group_id, group.group_name, "curve-hit", dir_x, dir_y, 1.00, curve_scale=0.55, oscillation_scale=0.12, rotation_nibble=symbol.rotation)

            if group.group_id == 18:
                floor_x, floor_y = self._normalize_vector(dir_x, (dir_y * 0.60) + 0.35)
                return MovementProfile(group.group_id, group.group_name, "curve-hit-floor", floor_x, floor_y, 0.92, curve_scale=0.58, oscillation_scale=0.10, rotation_nibble=symbol.rotation)

            if group.group_id == 19:
                floor_x, floor_y = self._normalize_vector(dir_x, dir_y * 0.30)
                return MovementProfile(group.group_id, group.group_name, "curve-floor", floor_x, floor_y, 0.82, curve_scale=0.35, rotation_nibble=symbol.rotation)

            if group.group_id == 20:
                return MovementProfile(group.group_id, group.group_name, "circle", dir_x, dir_y, 0.68, curve_scale=0.78, rotation_nibble=symbol.rotation)

        return MovementProfile(0, "None", "none", 0.0, 0.0, 0.0)

    def _sample_motion_path(self, profile: MovementProfile, sample_count: int = 9) -> list[dict]:
        points: list[dict] = []
        if sample_count < 2:
            sample_count = 2
        for idx in range(sample_count):
            phase = idx / (sample_count - 1)
            x, y = self._movement_offset(profile, phase)
            points.append({
                "t": round(phase, 3),
                "x": round(float(x), 3),
                "y": round(float(y), 3),
            })
        return points

    def build_rule_debug_payload(self, fsw_string: str) -> dict:
        """
        Trả dữ liệu debug dạng JSON để hiển thị trực quan trên UI.
        """
        parsed = self._parse_fsw(fsw_string)
        category_counts = self._category_counts(parsed.symbols)
        motion_profile = self._resolve_motion_profile(parsed.symbols)
        handshape = self._resolve_handshape(parsed.symbols)

        motion_direction = self._rotation_debug_info(motion_profile.rotation_nibble)
        movement_path_samples = self._sample_motion_path(motion_profile, sample_count=11)

        symbol_debug: list[dict] = []
        for symbol in parsed.symbols:
            group = self._resolve_symbol_group(symbol)
            symbol_debug.append({
                "raw": symbol.raw,
                "base": symbol.base,
                "fill": symbol.fill,
                "rotation": symbol.rotation,
                "x": symbol.x,
                "y": symbol.y,
                "group_id": group.group_id if group else None,
                "group_name": group.group_name if group else "Unknown",
                "category_id": group.category_id if group else None,
                "category_name": group.category_name if group else "Unknown",
                "direction": self._rotation_debug_info(symbol.rotation),
            })

        return {
            "version": "rule-debug-v2",
            "normalized_fsw": parsed.normalized_fsw,
            "token_count": len(parsed.tokens),
            "symbol_count": len(parsed.symbols),
            "categories": category_counts,
            "handshape": handshape,
            "movement": {
                "group_id": motion_profile.group_id,
                "group_name": motion_profile.group_name,
                "pattern": motion_profile.pattern,
                "distance_scale": motion_profile.distance_scale,
                "curve_scale": motion_profile.curve_scale,
                "oscillation_scale": motion_profile.oscillation_scale,
                "vector_x": round(motion_profile.vector_x, 4),
                "vector_y": round(motion_profile.vector_y, 4),
                "direction": motion_direction,
                "trajectory_samples": movement_path_samples,
            },
            "symbols": symbol_debug,
        }

    def _movement_offset(self, profile: MovementProfile, phase: float) -> tuple[float, float]:
        """
        Sinh offset theo profile chuyển động cho từng subgroup movement.
        """
        if profile.pattern == "none":
            return (0.0, 0.0)

        distance = self.MOTION_DISTANCE * profile.distance_scale
        vx, vy = profile.vector_x, profile.vector_y
        px, py = self._perpendicular(vx, vy)

        if profile.pattern == "micro":
            forward = phase * distance * 0.45
            wobble = math.sin(phase * math.tau * 3.0) * distance * profile.oscillation_scale
            return (vx * forward + px * wobble, vy * forward + py * wobble)

        if profile.pattern == "straight":
            return (vx * phase * distance, vy * phase * distance)

        if profile.pattern == "straight-floor":
            forward = phase * distance
            sway = math.sin(phase * math.tau) * distance * 0.08
            return (vx * forward + px * sway, vy * forward + py * sway)

        if profile.pattern == "curve":
            forward = phase * distance
            arc = math.sin(math.pi * phase) * distance * profile.curve_scale
            return (vx * forward + px * arc, vy * forward + py * arc)

        if profile.pattern == "curve-hit":
            forward = (1.0 - (1.0 - phase) * (1.0 - phase)) * distance
            arc = math.sin(math.pi * phase) * distance * profile.curve_scale
            hit = math.exp(-((phase - 0.88) ** 2) / 0.004) * distance * profile.oscillation_scale
            return (vx * (forward - hit) + px * arc, vy * (forward - hit) + py * arc)

        if profile.pattern == "curve-hit-floor":
            forward = (1.0 - (1.0 - phase) * (1.0 - phase)) * distance
            arc = math.sin(math.pi * phase) * distance * profile.curve_scale
            hit = math.exp(-((phase - 0.86) ** 2) / 0.0045) * distance * profile.oscillation_scale
            drop = (phase * phase) * distance * 0.18
            return (
                vx * (forward - hit) + px * arc,
                vy * (forward - hit) + py * arc + drop,
            )

        if profile.pattern == "curve-floor":
            forward = phase * distance
            arc = math.sin(math.pi * phase) * distance * profile.curve_scale
            return (vx * forward + px * arc, vy * forward + py * arc)

        if profile.pattern == "circle":
            radius = distance * profile.curve_scale
            theta = phase * math.tau
            loop_x = (vx * (math.cos(theta) - 1.0) + px * math.sin(theta)) * radius
            loop_y = (vy * (math.cos(theta) - 1.0) + py * math.sin(theta)) * radius
            drift = phase * distance * 0.15
            return (loop_x + vx * drift, loop_y + vy * drift)

        return (vx * phase * distance, vy * phase * distance)

    def _resolve_motion_vector(self, symbols: list[ParsedSymbol]) -> tuple[float, float]:
        """
        Trả về hướng chuyển động chính để tương thích với các luồng debug cũ.
        """
        profile = self._resolve_motion_profile(symbols)
        return (profile.vector_x, profile.vector_y)

    def _resolve_handshape(self, symbols: list[ParsedSymbol]) -> str:
        """
        Suy luận handshape từ ISWA Category 1 (Hands).
        """
        for symbol in symbols:
            group = self._resolve_symbol_group(symbol)
            if group is None or group.category_id != 1:
                continue
            if group.group_id in self.HANDSHAPE_BY_GROUP_ID:
                return self.HANDSHAPE_BY_GROUP_ID[group.group_id]
        return "OPEN"

    @staticmethod
    def _resolve_rotation_deg(symbols: list[ParsedSymbol]) -> float:
        """
        Rotation nibble (0..f) được ánh xạ về độ (mỗi bước 22.5 độ).
        """
        if not symbols:
            return 0.0
        return symbols[0].rotation * 22.5

    @staticmethod
    def _symbol_center_offset(symbols: list[ParsedSymbol], box_x: int, box_y: int) -> tuple[float, float]:
        """
        Offset bổ sung để hand anchor phản ánh phân bố symbol quanh box.
        """
        if not symbols:
            return (0.0, 0.0)
        avg_x = sum(s.x for s in symbols) / len(symbols)
        avg_y = sum(s.y for s in symbols) / len(symbols)
        return ((avg_x - box_x) * 0.50, (avg_y - box_y) * 0.35)

    @staticmethod
    def _transform_template(
        template: list[tuple[float, float]],
        scale: float,
        angle_deg: float,
        tx: float,
        ty: float,
        mirror_x: bool = False,
    ) -> list[tuple[float, float]]:
        """
        Scale + rotate + translate hand template vào vị trí thực tế.
        """
        rad = math.radians(angle_deg)
        cos_r = math.cos(rad)
        sin_r = math.sin(rad)
        points: list[tuple[float, float]] = []
        for x, y in template:
            px = -x if mirror_x else x
            py = y
            px *= scale
            py *= scale
            rx = (px * cos_r) - (py * sin_r)
            ry = (px * sin_r) + (py * cos_r)
            points.append((tx + rx, ty + ry))
        return points

    def _write_hand_points(self, frame: np.ndarray, start_index: int, points: list[tuple[float, float]]) -> None:
        """
        Ghi tối đa 21 điểm bàn tay vào mảng joints.
        """
        end_index = min(start_index + 21, self.num_joints)
        max_points = end_index - start_index
        for idx in range(max_points):
            frame[start_index + idx] = points[idx]

    def _interpolate_kinematics(self, fsw_string: str) -> np.ndarray:
        """
        Nội suy tọa độ 2D từ FSW đã parse.
        Hiện tại vẫn là rule-based tối giản, sẽ mở rộng theo Symbol Mapper ở phase tiếp theo.
        """
        parsed = self._parse_fsw(fsw_string)

        category_counts = self._category_counts(parsed.symbols)
        motion_profile = self._resolve_motion_profile(parsed.symbols)
        move_x, move_y = motion_profile.vector_x, motion_profile.vector_y
        handshape = self._resolve_handshape(parsed.symbols)
        rotation_deg = self._resolve_rotation_deg(parsed.symbols)
        symbol_offset_x, symbol_offset_y = self._symbol_center_offset(parsed.symbols, parsed.box_x, parsed.box_y)
        motion_direction = self._rotation_debug_info(motion_profile.rotation_nibble)

        has_dynamics = category_counts[3] > 0
        has_face = category_counts[4] > 0
        has_body = category_counts[5] > 0
        dynamic_scale = 1.30 if has_dynamics else 1.0
        face_head_bias_y = -8.0 if has_face else 0.0
        body_sway = 12.0 if has_body else 0.0

        logger.info(
            "Parsed FSW successfully. symbol_count=%d, token_count=%d, handshape=%s, motion_group=%d(%s), motion_pattern=%s, direction16=%s, direction8=%s, motion_vector=(%.2f, %.2f), categories=%s",
            len(parsed.symbols),
            len(parsed.tokens),
            handshape,
            motion_profile.group_id,
            motion_profile.group_name,
            motion_profile.pattern,
            motion_direction["direction_16"],
            motion_direction["direction_8"],
            move_x,
            move_y,
            category_counts,
        )

        num_frames = self.FRAME_COUNT
        frames_data = np.zeros((num_frames, 1, self.num_joints, 2), dtype=np.float32)

        base_x = float(parsed.box_x)
        base_y = float(parsed.box_y - 200)
        right_template = self.hand_templates[handshape]
        left_template = self.hand_templates["OPEN"]
        
        for f in range(num_frames):
            motion_phase = f / max(1, num_frames - 1)
            # Smoothstep easing để motion bớt giật.
            eased_phase = (motion_phase * motion_phase) * (3 - (2 * motion_phase))
            offset_x, offset_y = self._movement_offset(motion_profile, eased_phase)
            cx = base_x + offset_x + (math.sin(f * 0.12) * body_sway)
            cy = base_y + offset_y
            
            # Tạo nhịp điệu chuyển động tay cơ bản
            wave_right = math.sin(f * 0.24) * self.WAVE_AMPLITUDE * dynamic_scale
            wave_left = math.cos(f * 0.24) * (self.WAVE_AMPLITUDE * 0.75) * dynamic_scale

            frame = np.zeros((self.num_joints, 2), dtype=np.float32)
            
            # --- TỌA ĐỘ TRỤC CƠ THỂ (ĐỨNG YÊN) ---
            frame[0] = [cx, cy - 100 + face_head_bias_y]      # 0: Mũi
            frame[1] = [cx, cy - 50]       # 1: Cổ
            frame[2] = [cx - 60, cy - 50]  # 2: Vai phải
            frame[5] = [cx + 60, cy - 50]  # 5: Vai trái
            frame[8] = [cx - 40, cy + 150] # 8: Hông phải
            frame[9] = [cx + 40, cy + 150] # 9: Hông trái
            
            # --- TỌA ĐỘ CÁNH TAY (CỬ ĐỘNG) ---
            frame[3] = [cx - 120, cy - 50 + (wave_right * 0.5)] # 3: Khuỷu tay phải
            frame[4] = [
                cx - 180 + symbol_offset_x,
                cy - 50 + wave_right + symbol_offset_y,
            ]  # 4: Cổ tay phải
            
            frame[6] = [cx + 120, cy - 50 + (wave_left * 0.5)]  # 6: Khuỷu tay trái
            frame[7] = [cx + 180, cy - 50 + wave_left]          # 7: Cổ tay trái

            right_hand_points = self._transform_template(
                template=right_template,
                scale=self.HAND_SCALE,
                angle_deg=rotation_deg,
                tx=float(frame[4, 0]),
                ty=float(frame[4, 1]),
                mirror_x=False,
            )
            left_hand_points = self._transform_template(
                template=left_template,
                scale=self.HAND_SCALE,
                angle_deg=-(rotation_deg * 0.5),
                tx=float(frame[7, 0]),
                ty=float(frame[7, 1]),
                mirror_x=True,
            )

            self._write_hand_points(frame, start_index=10, points=right_hand_points)
            self._write_hand_points(frame, start_index=31, points=left_hand_points)

            # Clamp để tránh vượt khung canvas 1000x1000.
            frame[:, 0] = np.clip(frame[:, 0], 0.0, 1000.0)
            frame[:, 1] = np.clip(frame[:, 1], 0.0, 1000.0)
            
            frames_data[f, 0, :, :] = frame

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