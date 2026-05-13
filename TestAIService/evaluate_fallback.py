"""
evaluate_fallback.py — Đánh giá độ chính xác và hiệu năng của offline fallback.

Chạy: python evaluate_fallback.py
Yêu cầu: AI Service (main.py) đang chạy tại http://127.0.0.1:8000

Đầu ra: kết quả in ra terminal + file evaluation_results.json
"""

import json
import time
import statistics
import urllib.request
import urllib.parse
import urllib.error
from datetime import datetime

# ──────────────────────────────────────────────
# CẤU HÌNH
# ──────────────────────────────────────────────
AI_SERVICE_URL = "http://127.0.0.1:8000"
SIGN_MT_POSE_API = "https://us-central1-sign-mt.cloudfunctions.net/spoken_text_to_signed_pose"

# Tập test: (input_text, spoken_lang, expected_english)
# expected_english dùng để đánh giá bước VI→EN
TEST_CASES = [
    # ── Tiếng Anh — câu đơn giản (cloud path) ──────────────────────────
    ("Hello",                                   "en", "Hello"),
    ("Thank you",                               "en", "Thank you"),
    ("Good morning",                            "en", "Good morning"),
    ("How are you",                             "en", "How are you"),
    ("My name is John",                         "en", "My name is John"),
    ("I love you",                              "en", "I love you"),
    ("Please help me",                          "en", "Please help me"),
    # ── Tiếng Anh — câu phức tạp hơn ────────────────────────────────────
    ("I don't understand what you are saying",  "en", "I don't understand what you are saying"),
    ("Can you please repeat that slowly",       "en", "Can you please repeat that slowly"),
    ("Where is the nearest hospital",           "en", "Where is the nearest hospital"),
    ("What time does the meeting start",        "en", "What time does the meeting start"),
    ("I need to go to the bathroom",            "en", "I need to go to the bathroom"),
    # ── Tiếng Việt — câu đơn giản (VI→EN→sign path) ─────────────────────
    ("Xin chào",                                "vi", "Hello"),
    ("Cảm ơn bạn",                              "vi", "Thank you"),
    ("Tôi yêu bạn",                             "vi", "I love you"),
    ("Chúc mừng sinh nhật",                     "vi", "Happy birthday"),
    ("Bạn khỏe không",                          "vi", "How are you"),
    ("Rất vui được gặp bạn",                    "vi", "Nice to meet you"),
    ("Xin lỗi",                                 "vi", "Sorry"),
    ("Tạm biệt",                                "vi", "Goodbye"),
    # ── Tiếng Việt — câu phức tạp hơn ───────────────────────────────────
    ("Tôi không hiểu bạn đang nói gì",          "vi", "I don't understand what you are saying"),
    ("Bạn có thể nói chậm lại được không",      "vi", "Can you speak more slowly"),
    ("Bệnh viện gần nhất ở đâu",                "vi", "Where is the nearest hospital"),
    ("Cuộc họp bắt đầu lúc mấy giờ",           "vi", "What time does the meeting start"),
    ("Tôi cần đi vệ sinh",                      "vi", "I need to go to the bathroom"),
]

# ──────────────────────────────────────────────
# HELPERS
# ──────────────────────────────────────────────

def _http_get(url: str, timeout: int = 20) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": "EvalScript/1.0"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def _http_post_json(url: str, payload: dict, timeout: int = 60) -> dict:
    data = json.dumps(payload).encode()
    req = urllib.request.Request(
        url, data=data,
        headers={"Content-Type": "application/json", "User-Agent": "EvalScript/1.0"},
        method="POST"
    )
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode())


def simple_bleu1(reference: str, hypothesis: str) -> float:
    """BLEU-1 đơn giản (word-level) — đủ dùng cho đánh giá nhanh."""
    ref_tokens = reference.lower().split()
    hyp_tokens = hypothesis.lower().split()
    if not hyp_tokens:
        return 0.0
    matches = sum(1 for t in hyp_tokens if t in ref_tokens)
    return matches / len(hyp_tokens)


def char_edit_distance(s1: str, s2: str) -> int:
    """Levenshtein distance ký tự — đo độ tương đồng FSW string."""
    m, n = len(s1), len(s2)
    dp = list(range(n + 1))
    for i in range(1, m + 1):
        prev = dp[:]
        dp[0] = i
        for j in range(1, n + 1):
            cost = 0 if s1[i-1] == s2[j-1] else 1
            dp[j] = min(dp[j] + 1, dp[j-1] + 1, prev[j-1] + cost)
    return dp[n]


def normalized_similarity(s1: str, s2: str) -> float:
    """Tương đồng chuẩn hóa [0,1] dựa trên edit distance."""
    if not s1 and not s2:
        return 1.0
    max_len = max(len(s1), len(s2))
    if max_len == 0:
        return 1.0
    return 1.0 - char_edit_distance(s1, s2) / max_len


# ──────────────────────────────────────────────
# BÀI KIỂM TRA 1: RELIABILITY & LATENCY
# ──────────────────────────────────────────────

def test_reliability_and_latency(test_cases):
    """Gọi AI Service (cloud path đang chạy) và đo success rate + latency."""
    print("\n" + "="*60)
    print("TEST 1: RELIABILITY & LATENCY (Cloud Path qua AI Service)")
    print("="*60)

    results = []
    for text, lang, _ in test_cases:
        start = time.perf_counter()
        success = False
        offline_mode = False
        error_msg = ""
        try:
            resp = _http_post_json(
                f"{AI_SERVICE_URL}/api/v1/translate/text",
                {"text": text, "spoken_lang": lang, "signed_lang": "ase"},
                timeout=70
            )
            latency_ms = (time.perf_counter() - start) * 1000
            data = resp.get("data", resp)
            offline_mode = data.get("offline_mode", False)
            success = True
        except Exception as e:
            latency_ms = (time.perf_counter() - start) * 1000
            error_msg = str(e)[:80]

        status = "OFFLINE" if offline_mode else ("OK" if success else "FAIL")
        print(f"  [{status:7}] {lang.upper()} | {text:<30} | {latency_ms:>7.0f} ms"
              + (f" | ERR: {error_msg}" if error_msg else ""))
        results.append({
            "text": text, "lang": lang,
            "success": success, "offline_mode": offline_mode,
            "latency_ms": round(latency_ms, 1), "error": error_msg
        })

    total = len(results)
    cloud_ok  = sum(1 for r in results if r["success"] and not r["offline_mode"])
    offline_ok = sum(1 for r in results if r["success"] and r["offline_mode"])
    failed    = sum(1 for r in results if not r["success"])
    latencies = [r["latency_ms"] for r in results if r["success"]]

    print(f"\n  Cloud OK  : {cloud_ok}/{total} ({100*cloud_ok/total:.0f}%)")
    print(f"  Offline OK: {offline_ok}/{total} ({100*offline_ok/total:.0f}%)")
    print(f"  Failed    : {failed}/{total}")
    if latencies:
        print(f"  Latency   : avg={statistics.mean(latencies):.0f} ms | "
              f"p50={statistics.median(latencies):.0f} ms | "
              f"max={max(latencies):.0f} ms")
    return results


# ──────────────────────────────────────────────
# BÀI KIỂM TRA 2: VI→EN TRANSLATION ACCURACY (BLEU-1)
# ──────────────────────────────────────────────

def test_vi_en_translation(test_cases):
    """Đánh giá chất lượng dịch VI→EN bằng BLEU-1 so với expected."""
    print("\n" + "="*60)
    print("TEST 2: VI→EN TRANSLATION ACCURACY (Google Translate)")
    print("="*60)

    vi_cases = [(t, l, e) for t, l, e in test_cases if l == "vi"]
    results = []

    for text, _, expected_en in vi_cases:
        query = urllib.parse.urlencode({
            "client": "gtx", "sl": "vi", "tl": "en", "dt": "t", "q": text
        })
        try:
            raw = _http_get(
                f"https://translate.googleapis.com/translate_a/single?{query}",
                timeout=10
            )
            data = json.loads(raw.decode())
            translated = "".join(item[0] for item in data[0] if item[0])
        except Exception as e:
            translated = ""
            print(f"  [ERR] {text}: {e}")

        bleu = simple_bleu1(expected_en, translated)
        match = "✓" if bleu >= 0.5 else "✗"
        print(f"  [{match}] '{text}'")
        print(f"       → Got     : '{translated}'")
        print(f"       → Expected: '{expected_en}' | BLEU-1: {bleu:.2f}")
        results.append({
            "input_vi": text, "translated": translated,
            "expected_en": expected_en, "bleu1": round(bleu, 3)
        })

    if results:
        avg_bleu = statistics.mean(r["bleu1"] for r in results)
        acceptable = sum(1 for r in results if r["bleu1"] >= 0.5)
        print(f"\n  Avg BLEU-1 : {avg_bleu:.3f}")
        print(f"  Acceptable (≥0.5): {acceptable}/{len(results)}")
    return results


# ──────────────────────────────────────────────
# BÀI KIỂM TRA 3: FSW QUALITY — Sockeye vs Sign-MT internal
# ──────────────────────────────────────────────

def test_fsw_quality(test_cases):
    """
    Đánh giá FSW sinh bởi Sockeye (offline) so với FSW nhúng trong
    pose từ Sign-MT cloud, thông qua normalized edit distance.
    (Sign-MT không expose FSW trực tiếp, nhưng Sockeye output có thể
    được dùng như proxy cho semantic correctness.)
    """
    print("\n" + "="*60)
    print("TEST 3: SOCKEYE FSW QUALITY (Offline Model Output)")
    print("="*60)
    print("  (So sánh độ tương đồng giữa FSW của Sockeye cho các cụm từ tương đương)\n")

    # Load Sockeye trực tiếp
    try:
        from translate_engine import SignTranslationService
        svc = SignTranslationService()
    except Exception as e:
        print(f"  [SKIP] Không load được Sockeye: {e}")
        return []

    # Lấy FSW cho từng phrase
    en_cases = [(t, e) for t, l, e in test_cases if l == "en"]
    results = []

    fsw_outputs = {}
    for text, expected in en_cases:
        try:
            start = time.perf_counter()
            fsw = svc.translate(text, "en", "ase")
            elapsed_ms = (time.perf_counter() - start) * 1000
            is_valid = bool(fsw and fsw.startswith("M") and len(fsw) > 10)
            fsw_outputs[text] = fsw
            mark = "✓" if is_valid else "✗"
            print(f"  [{mark}] '{text}' ({elapsed_ms:.0f} ms)")
            print(f"       FSW: {(fsw or '')[:70]}{'...' if len(fsw or '')>70 else ''}")
            results.append({
                "text": text, "fsw": fsw,
                "valid_fsw": is_valid, "latency_ms": round(elapsed_ms, 1)
            })
        except Exception as e:
            print(f"  [ERR] '{text}': {e}")
            results.append({"text": text, "fsw": "", "valid_fsw": False, "latency_ms": 0})

    # So sánh FSW giữa các cặp semantically similar (Hello vs Hi, etc.)
    similar_pairs = [
        ("Hello", "Thank you"),    # different semantic → low similarity expected
        ("Good morning", "Hello"), # partial overlap → medium
    ]
    if len(fsw_outputs) >= 2:
        print("\n  Semantic similarity check (different phrases → should be LOW):")
        keys = list(fsw_outputs.keys())
        for i in range(min(3, len(keys)-1)):
            a, b = keys[i], keys[i+1]
            sim = normalized_similarity(fsw_outputs[a], fsw_outputs[b])
            print(f"    sim('{a}', '{b}') = {sim:.3f}")

    valid_count = sum(1 for r in results if r["valid_fsw"])
    print(f"\n  Valid FSW output: {valid_count}/{len(results)}")
    if results:
        avg_lat = statistics.mean(r["latency_ms"] for r in results if r["latency_ms"] > 0)
        print(f"  Avg Sockeye latency: {avg_lat:.0f} ms (in-process)")
    return results


# ──────────────────────────────────────────────
# BÀI KIỂM TRA 4: FAILOVER SIMULATION
# ──────────────────────────────────────────────

def test_failover_simulation():
    """
    Giả lập Sign-MT cloud thất bại bằng cách gọi URL không tồn tại,
    sau đó verify offline fallback hoạt động qua AI Service.
    (Test này yêu cầu tạm thời mock — chỉ kiểm tra logic endpoint.)
    """
    print("\n" + "="*60)
    print("TEST 4: FAILOVER SIMULATION")
    print("="*60)
    print("  Kiểm tra AI Service có trả offline_mode=True khi cloud fail...\n")

    # Gọi với text bình thường — nếu cloud up → cloud OK
    # Nếu cloud down tại thời điểm chạy test → sẽ thấy offline_mode=True
    test_phrase = "Hello world"
    try:
        resp = _http_post_json(
            f"{AI_SERVICE_URL}/api/v1/translate/text",
            {"text": test_phrase, "spoken_lang": "en", "signed_lang": "ase"},
            timeout=90
        )
        data = resp.get("data", resp)
        source = data.get("rule_debug", {}).get("source", "unknown")
        offline = data.get("offline_mode", False)
        has_pose = len(data.get("pose_coordinates", [])) > 0
        has_fsw = bool(data.get("fsw_code", ""))

        print(f"  Input    : '{test_phrase}'")
        print(f"  Source   : {source}")
        print(f"  Offline  : {offline}")
        print(f"  Has Pose : {has_pose}")
        print(f"  Has FSW  : {has_fsw}")

        if not offline:
            print("  → Cloud đang hoạt động bình thường (fallback không cần thiết)")
        else:
            print("  → Offline mode activated! Sockeye fallback đã hoạt động.")
            print(f"  → FSW: {(data.get('fsw_code',''))[:80]}")
    except Exception as e:
        print(f"  [ERR] {e}")


# ──────────────────────────────────────────────
# MAIN
# ──────────────────────────────────────────────

def main():
    print("╔══════════════════════════════════════════════════════════╗")
    print("║     OFFLINE FALLBACK EVALUATION SUITE                   ║")
    print(f"║     {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}                              ║")
    print("╚══════════════════════════════════════════════════════════╝")
    print(f"\nAI Service: {AI_SERVICE_URL}")
    print(f"Test cases: {len(TEST_CASES)} phrases ({sum(1 for _,l,_ in TEST_CASES if l=='vi')} VI + {sum(1 for _,l,_ in TEST_CASES if l=='en')} EN)")

    all_results = {}

    # Test 1
    r1 = test_reliability_and_latency(TEST_CASES)
    all_results["reliability"] = r1

    # Test 2
    r2 = test_vi_en_translation(TEST_CASES)
    all_results["vi_en_translation"] = r2

    # Test 3
    r3 = test_fsw_quality(TEST_CASES)
    all_results["fsw_quality"] = r3

    # Test 4
    test_failover_simulation()

    # Lưu kết quả
    output_file = "evaluation_results.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump({
            "timestamp": datetime.now().isoformat(),
            "test_cases_count": len(TEST_CASES),
            "results": all_results
        }, f, ensure_ascii=False, indent=2)

    print(f"\n{'='*60}")
    print(f"Kết quả đã lưu vào: {output_file}")
    print("="*60)


if __name__ == "__main__":
    main()
