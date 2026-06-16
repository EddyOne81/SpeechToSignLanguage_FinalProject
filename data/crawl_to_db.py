import os
import time
import json
import hashlib
import random
import requests
from urllib.parse import urlencode

# ====== CONFIG ======
SIGN_MT_API = "https://us-central1-sign-mt.cloudfunctions.net/spoken_text_to_signed_pose"
BACKEND_API = "http://127.0.0.1:8080"
TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhZG1pbiIsInJvbGUiOiJST0xFX0FETUlOIiwiaWF0IjoxNzc3MzY4MjM5LCJleHAiOjE3Nzc0NTQ2Mzl9.AK5XqAxJSJtuxQhPOtNtKAoNCrwdP6XFt8YgZ5ilsuc"  # JWT role admin hoặc permission DICTIONARY_WRITE
POSE_DIR = "data/pose_cache"
SPOKEN_LANG = "en"
SIGNED_LANG = "ase"
CACHE_SOURCE = "SEED"

# ====== SEED DATA ======
seed_data = [
    # 1. Fingerspelling
    "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M",
    "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z",

    # 2. Numbers
    "ZERO", "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE", "TEN",
    "ELEVEN", "TWELVE", "THIRTEEN", "FOURTEEN", "FIFTEEN",
    "SIXTEEN", "SEVENTEEN", "EIGHTEEN", "NINETEEN",
    "TWENTY", "THIRTY", "FORTY", "FIFTY", "SIXTY", "SEVENTY", "EIGHTY", "NINETY",
    "ONE HUNDRED", "THOUSAND",

    # 3. Pronouns / Question words / Deictics
    "I", "ME", "YOU", "HE", "SHE", "WE", "US", "THEY", "THEM", "IT",
    "MY", "YOUR", "HIS", "HER", "OUR", "THEIR",
    "WHO", "WHAT", "WHERE", "WHEN", "WHY", "HOW", "WHICH",
    "THIS", "THAT", "THESE", "THOSE", "HERE", "THERE",

    # 4. Core verbs
    "EAT", "DRINK", "GO", "COME", "STOP", "HELP", "PLAY", "WORK", "SLEEP",
    "LIKE", "WANT", "KNOW", "THINK", "FEEL", "SEE", "HEAR", "LEARN", "TEACH",
    "BUY", "SELL", "MAKE", "USE", "GIVE", "TAKE", "LOOK", "FIND", "TELL", "ASK",
    "STAND", "SIT", "WALK", "RUN", "WAIT", "START", "FINISH", "LOVE", "HATE",
    "CAN", "CANNOT", "DO", "NOT", "NEED", "SAY", "TALK", "SIGN",
    "REMEMBER", "FORGET", "OPEN", "CLOSE", "PAY", "CALL",

    # 5. Time
    "TODAY", "TOMORROW", "YESTERDAY", "NOW", "LATER", "BEFORE", "AFTER",
    "MORNING", "AFTERNOON", "EVENING", "NIGHT", "MIDNIGHT", "TONIGHT",
    "DAY", "WEEK", "MONTH", "YEAR", "HOUR", "MINUTE", "SECOND",
    "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY",
    "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
    "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",

    # 6. States / Adjectives
    "YES", "NO", "PLEASE", "SORRY", "GOOD", "BAD", "HAPPY", "SAD", "ANGRY",
    "TIRED", "BEAUTIFUL", "UGLY", "BIG", "SMALL", "HOT", "COLD", "FAST", "SLOW",
    "EASY", "HARD", "RIGHT", "WRONG", "TRUE", "FALSE", "CLEAN", "DIRTY", "NEW", "OLD",
    "SAFE", "DANGEROUS", "BUSY", "FREE", "SAME", "DIFFERENT", "IMPORTANT",

    # 7. Colors
    "RED", "BLUE", "GREEN", "YELLOW", "BLACK", "WHITE", "ORANGE", "PURPLE", "BROWN", "PINK", "GRAY",

    # 8. Family / People
    "MOTHER", "FATHER", "PARENTS", "BROTHER", "SISTER", "BABY", "CHILDREN", "FAMILY",
    "FRIEND", "BOY", "GIRL", "MAN", "WOMAN", "HUSBAND", "WIFE", "MARRIAGE",

    # 9. Places / Transport
    "HOME", "HOUSE", "SCHOOL", "UNIVERSITY", "WORK", "HOSPITAL", "STORE", "RESTAURANT",
    "BATHROOM", "CHURCH", "CITY", "COUNTRY", "STREET", "ROOM",
    "BANK", "MARKET", "PARK", "OFFICE", "PHARMACY",
    "CAR", "BUS", "TRAIN", "AIRPLANE", "BICYCLE", "MOTORCYCLE",
    "TICKET", "MAP",

    # 10. Food / Drink
    "FOOD", "WATER", "COFFEE", "TEA", "MILK", "JUICE",
    "APPLE", "BANANA", "ORANGE", "MEAT", "CHICKEN", "FISH",
    "BREAD", "RICE", "EGG", "CHEESE", "CAKE",
    "SOUP", "NOODLES", "VEGETABLE", "FRUIT",

    # 11. Tech / Items
    "PHONE", "COMPUTER", "INTERNET", "EMAIL", "TELEVISION",
    "BOOK", "PAPER", "PEN", "MONEY", "CLOTHES", "SHOES",
    "WIFI", "BATTERY", "CHARGER",

    # 12. Phrases
    "HELLO", "GOOD MORNING", "GOOD AFTERNOON", "GOOD NIGHT",
    "HOW ARE YOU", "I AM FINE", "I AM GOOD", "I AM NOT GOOD",
    "WHAT IS YOUR NAME", "MY NAME IS", "NICE TO MEET YOU",
    "THANK YOU", "THANK YOU VERY MUCH", "YOU ARE WELCOME",
    "SEE YOU LATER", "SEE YOU TOMORROW", "HAVE A GOOD DAY", "I LOVE YOU",
    "GOODBYE", "EXCUSE ME", "I AM SORRY", "PLEASE WAIT",
    "I DO NOT KNOW", "I NEED HELP", "I NEED THE BATHROOM",
    "WHERE ARE YOU FROM", "I AM FROM", "DO YOU SPEAK ENGLISH", "PLEASE WRITE IT DOWN",
    "CAN YOU REPEAT", "PLEASE SPEAK SLOWLY",
    "TURN LEFT", "TURN RIGHT",
    "I WANT WATER", "I WANT FOOD",
    "WHAT IS THIS", "WHAT IS THAT",

    # 13. Daily life / School
    "I WANT TO EAT", "I AM HUNGRY", "I AM THIRSTY", "I AM TIRED",
    "I AM GOING TO SCHOOL", "I AM GOING HOME", "I AM GOING TO WORK",
    "CAN YOU HELP ME", "PLEASE HELP ME",
    "I DO NOT UNDERSTAND", "I UNDERSTAND", "PLEASE REPEAT", "PLEASE SIGN SLOWLY",
    "WHAT TIME IS IT", "WHERE IS THE RESTROOM", "WHERE IS THE HOSPITAL",
    "HOW MUCH IS THIS", "I WANT TO BUY THIS",

    # 14. Emergency / Medical
    "EMERGENCY", "CALL THE POLICE", "CALL A DOCTOR",
    "I AM SICK", "I FEEL PAIN", "MY HEAD HURTS", "I NEED MEDICINE",
    "WHERE IS THE PHARMACY", "ARE YOU OKAY", "I NEED A DOCTOR"
]

# ====== HELPERS ======
def normalize(text: str) -> str:
    return " ".join(text.strip().upper().split())

def infer_entry_type(text: str) -> str:
    return "PHRASE" if " " in text.strip() else "GLOSS"

def fetch_pose_bytes(text: str, spoken="en", signed="ase") -> bytes:
    query = urlencode({"text": text, "spoken": spoken, "signed": signed})
    url = f"{SIGN_MT_API}?{query}"
    res = requests.get(url, headers={"Accept": "application/pose"}, timeout=60)
    res.raise_for_status()
    return res.content

def save_pose(text: str, data: bytes) -> str:
    os.makedirs(POSE_DIR, exist_ok=True)
    key = hashlib.sha1(text.encode("utf-8")).hexdigest()
    path = os.path.join(POSE_DIR, f"{key}.pose")
    if not os.path.exists(path):
        with open(path, "wb") as f:
            f.write(data)
    return path

def upsert_dictionary(text: str, pose_path: str):
    payload = {
        "englishText": text,
        "normalizedText": text,
        "entryType": infer_entry_type(text),
        "spokenLang": SPOKEN_LANG,
        "signedLang": SIGNED_LANG,
        "cacheSource": CACHE_SOURCE,
        "poseFilePath": pose_path,
        "fswCode": "",
        "isVerified": False
    }
    res = requests.post(
        f"{BACKEND_API}/api/dictionaries",
        headers={
            "Authorization": f"Bearer {TOKEN}",
            "Content-Type": "application/json"
        },
        data=json.dumps(payload),
        timeout=30,
    )
    res.raise_for_status()
    return res.json()

def crawl(texts):
    for raw in texts:
        text = normalize(raw)
        if not text:
            continue
        try:
            pose = fetch_pose_bytes(text, SPOKEN_LANG, SIGNED_LANG)
            pose_path = save_pose(text, pose)
            upsert_dictionary(text, pose_path)
            print("OK:", text)
        except Exception as e:
            print("FAIL:", text, e)
        time.sleep(1.2 + random.random())  # rate limit

if __name__ == "__main__":
    crawl(seed_data)