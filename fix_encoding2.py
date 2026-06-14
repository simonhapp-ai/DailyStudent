import os

files = [
    r"C:\Users\simon\OneDrive\Desktop\Claude App\public\lernzettel-previews\physik-quantenobjekte.html",
    r"C:\Users\simon\OneDrive\Desktop\Claude App\public\lernzettel-previews\physik-atomhulle.html",
    r"C:\Users\simon\OneDrive\Desktop\Claude App\public\lernzettel-previews\bio-oekologie.html",
    r"C:\Users\simon\OneDrive\Desktop\Claude App\public\lernzettel-previews\bio-neurobiologie.html",
]

# Use chr() to avoid encoding issues with special chars in source
# All C1 ctrl chars use their Unicode code point directly

# After fix_encoding.py:
#   Ã (U+00C3) was removed -> orphaned C1 ctrl chars for ss/Ae/Oe/Ue remain
#   a-hat (U+00E2) -> en-dash (U+2013); leaving U+0081 + trailing char for superscripts
#   Î (U+00CE), Ï (U+00CF) prefixes removed for Greek

ENDASH = chr(0x2013)   # – (en dash, what a-hat became)
HOP    = chr(0x0081)   # C1: HOP (middle byte of superscripts E2 81 xx)
SSA    = chr(0x0086)   # C1: SSA (middle byte of arrows E2 86 xx)
SCI    = chr(0x009A)   # C1: SCI (middle byte of lightning/warning E2 9A xx)

def fix(content):
    # --- ß/Ä/Ö/Ü: orphaned C1 ctrl chars ---
    content = content.replace(chr(0x009F), chr(0x00DF))  # U+009F -> ß
    content = content.replace(chr(0x0084), chr(0x00C4))  # U+0084 -> Ä
    content = content.replace(chr(0x0096), chr(0x00D6))  # U+0096 -> Ö
    content = content.replace(chr(0x009C), chr(0x00DC))  # U+009C -> Ü

    # --- Superscripts: ENDASH + HOP + trailing char -> superscript char ---
    for byte, sup in [
        (0x00BA, 0x207A),  # º -> ⁺
        (0x00BB, 0x207B),  # » -> ⁻
        (0x00B0, 0x2070),  # ° -> ⁰
        (0x00B4, 0x2074),  # ´ -> ⁴
        (0x00B5, 0x2075),  # µ -> ⁵
        (0x00B6, 0x2076),  # ¶ -> ⁶
        (0x00B7, 0x2077),  # · -> ⁷
        (0x00B8, 0x2078),  # ¸ -> ⁸
        (0x00B9, 0x2079),  # ¹ -> ⁹
    ]:
        pattern = ENDASH + HOP + chr(byte)
        content = content.replace(pattern, chr(sup))
        # Also without leading endash (if already consumed)
        content = content.replace(HOP + chr(byte), chr(sup))

    # --- Arrows: ENDASH + SSA + U+0092/U+0090 -> →/← ---
    content = content.replace(ENDASH + SSA + chr(0x0092), chr(0x2192))  # ->
    content = content.replace(SSA + chr(0x0092), chr(0x2192))
    content = content.replace(ENDASH + SSA + chr(0x0090), chr(0x2190))  # <-
    content = content.replace(SSA + chr(0x0090), chr(0x2190))

    # --- Lightning ⚡ (E2 9A A1): ENDASH + SCI + ¡ ---
    content = content.replace(ENDASH + SCI + chr(0x00A1), chr(0x26A1))  # ⚡
    content = content.replace(SCI + chr(0x00A1), chr(0x26A1))

    # --- Warning ⚠ (E2 9A A0): ENDASH + SCI + NBSP ---
    content = content.replace(ENDASH + SCI + chr(0x00A0), chr(0x26A0))  # ⚠
    content = content.replace(SCI + chr(0x00A0), chr(0x26A0))

    # --- Remove variation selector remnant from warning emoji ---
    # EF B8 8F -> Ï(EF) was removed -> ¸(B8) + C1-ctrl(8F) remain
    content = content.replace(chr(0x00B8) + chr(0x008F), "")

    # --- Greek σ (CF 83): Ï removed -> U+0083 ---
    content = content.replace(chr(0x0083), chr(0x03C3))  # -> σ

    # --- Greek Δ (CE 94): Î removed -> U+0094 ---
    content = content.replace(chr(0x0094), chr(0x0394))  # -> Δ

    # --- Remove remaining C1 ctrl chars (cleanup) ---
    for code in [
        0x0080,  # PAD
        0x0081,  # HOP (superscripts handled above)
        0x0082,  # BPH
        # 0x0083 handled above (σ)
        # 0x0084 handled above (Ä)
        0x0085,  # NEL
        0x0086,  # SSA (arrows handled above)
        0x0087,  # ESA
        0x0088,  # HTS
        0x0089,  # HTJ
        0x008A,  # VTS
        0x008B,  # PLD
        0x008C,  # PLU
        0x008D,  # RI
        0x008E,  # SS2
        0x008F,  # SS3
        0x0090,  # DCS (← handled above)
        0x0091,  # PU1
        0x0092,  # PU2 (→ handled above)
        0x0093,  # STS
        # 0x0094 handled above (Δ)
        0x0095,  # MW
        # 0x0096 handled above (Ö)
        0x0097,  # EPA
        0x0098,  # SOS
        0x0099,  # SGCI
        0x009A,  # SCI (⚡/⚠ handled above)
        0x009B,  # CSI
        # 0x009C handled above (Ü)
        0x009D,  # OSC
        0x009E,  # PM
        # 0x009F handled above (ß)
    ]:
        content = content.replace(chr(code), "")

    return content

for filepath in files:
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    c1_before = sum(1 for c in content if chr(0x0080) <= c <= chr(0x009F))
    content = fix(content)
    c1_after = sum(1 for c in content if chr(0x0080) <= c <= chr(0x009F))

    with open(filepath, "w", encoding="utf-8", newline="") as f:
        f.write(content)
    print(f"Fixed: {os.path.basename(filepath)} (C1 ctrl chars: {c1_before} -> {c1_after})")

print("Second pass done.")
