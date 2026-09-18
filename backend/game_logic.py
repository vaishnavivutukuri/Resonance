from models import Difficulty

DIFFICULTY_CONFIG = {
    Difficulty.easy: {
        "scroll_speed": 220,
        "onset_keep_ratio": 0.25,
        "lanes": 4,
        "hit_window_perfect_ms": 120,
        "hit_window_good_ms": 250,
        "score_multiplier": 1.0,
        "min_gap_ms": 340,
    },
    Difficulty.normal: {
        "scroll_speed": 340,
        "onset_keep_ratio": 0.5,
        "lanes": 4,
        "hit_window_perfect_ms": 90,
        "hit_window_good_ms": 180,
        "score_multiplier": 1.25,
        "min_gap_ms": 240,
    },
    Difficulty.hard: {
        "scroll_speed": 470,
        "onset_keep_ratio": 0.75,
        "lanes": 4,
        "hit_window_perfect_ms": 70,
        "hit_window_good_ms": 130,
        "score_multiplier": 1.5,
        "min_gap_ms": 170,
    },
    Difficulty.insane: {
        "scroll_speed": 640,
        "onset_keep_ratio": 1.0,
        "lanes": 4,
        "hit_window_perfect_ms": 50,
        "hit_window_good_ms": 100,
        "score_multiplier": 2.0,
        "min_gap_ms": 120,
    },
}

PERFECT_PTS = 100
GOOD_PTS = 50
MISS_PTS = 0

GRADE_THRESHOLDS = [
    (0.95, "S"),
    (0.90, "A"),
    (0.80, "B"),
    (0.70, "C"),
    (0.60, "D"),
    (0.0,  "F"),
]


def calculate_score(
    perfect_count: int,
    good_count: int,
    miss_count: int,
    difficulty: Difficulty,
) -> tuple[int, float, str]:
    total = perfect_count + good_count + miss_count
    if total == 0:
        return 0, 0.0, "F"
    raw_score = perfect_count * PERFECT_PTS + good_count * GOOD_PTS
    accuracy = (perfect_count + 0.5 * good_count) / total
    mult = DIFFICULTY_CONFIG[difficulty]["score_multiplier"]
    final_score = int(raw_score * mult * accuracy)
    grade = "F"
    for threshold, letter in GRADE_THRESHOLDS:
        if accuracy >= threshold:
            grade = letter
            break
    return final_score, round(accuracy, 4), grade


INFINITE_SPEED_SCALE_PER_LOOP = 1.08
INFINITE_HIT_WINDOW_SCALE = 0.92
INITIAL_HEALTH = 100.0
MAX_LOOPS = 50


def get_loop_config(base_difficulty: Difficulty, loop_number: int) -> dict:
    base = DIFFICULTY_CONFIG[base_difficulty].copy()
    factor_speed = INFINITE_SPEED_SCALE_PER_LOOP ** loop_number
    factor_window = INFINITE_HIT_WINDOW_SCALE ** loop_number
    return {
        **base,
        "scroll_speed": round(base["scroll_speed"] * factor_speed, 1),
        "hit_window_perfect_ms": max(20, round(base["hit_window_perfect_ms"] * factor_window)),
        "hit_window_good_ms": max(40, round(base["hit_window_good_ms"] * factor_window)),
        "loop_number": loop_number,
    }
