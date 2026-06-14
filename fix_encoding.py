import os

files = [
    r"C:\Users\simon\OneDrive\Desktop\Claude App\public\lernzettel-previews\physik-quantenobjekte.html",
    r"C:\Users\simon\OneDrive\Desktop\Claude App\public\lernzettel-previews\physik-atomhulle.html",
    r"C:\Users\simon\OneDrive\Desktop\Claude App\public\lernzettel-previews\bio-oekologie.html",
    r"C:\Users\simon\OneDrive\Desktop\Claude App\public\lernzettel-previews\bio-neurobiologie.html",
]

# Corrupted chars = original UTF-8 bytes read as Latin-1/Windows-1252, re-encoded as UTF-8
# Pattern: U+00C3 or U+00C2 or U+00E2 prefix + second char
replacements = [
    # ---- SUPERSCRIPTS (two-char patterns, handle before single-â cleanup) ----
    # U+207A SUPERSCRIPT PLUS (E2 81 BA) -> U+00E2 + U+00BA
    ("âº", "⁺"),
    # U+207B SUPERSCRIPT MINUS (E2 81 BB) -> U+00E2 + U+00BB
    ("â»", "⁻"),
    # U+2070 SUPERSCRIPT ZERO (E2 81 B0) -> U+00E2 + U+00B0
    ("â°", "⁰"),
    # U+2074 SUPERSCRIPT FOUR (E2 81 B4) -> U+00E2 + U+00B4
    ("â´", "⁴"),
    # U+2075 SUPERSCRIPT FIVE (E2 81 B5) -> U+00E2 + U+00B5
    ("âµ", "⁵"),
    # U+2076 SUPERSCRIPT SIX (E2 81 B6) -> U+00E2 + U+00B6
    ("â¶", "⁶"),
    # U+2077 SUPERSCRIPT SEVEN (E2 81 B7) -> U+00E2 + U+00B7
    ("â·", "⁷"),
    # U+2078 SUPERSCRIPT EIGHT (E2 81 B8) -> U+00E2 + U+00B8
    ("â¸", "⁸"),
    # U+2079 SUPERSCRIPT NINE (E2 81 B9) -> U+00E2 + U+00B9
    ("â¹", "⁹"),

    # ---- ARROWS (three-char patterns: U+00E2 + two more) ----
    # U+2192 RIGHT ARROW (E2 86 92) -> U+00E2 + U+2020 + U+2019 (Win-1252: 86=dagger, 92=rsquo)
    ("â†’", "→"),
    # U+2190 LEFT ARROW (E2 86 90) -> U+00E2 + U+2020 + U+2018
    ("â†‘", "←"),

    # ---- SPECIFIC EMOJI ----
    # U+26A1 LIGHTNING (E2 9A A1) -> U+00E2 + U+0161 + U+00A1 (Win-1252: 9A=s-caron, A1=inv-!)
    ("âš¡", "⚡"),
    # ⚡ may also appear as U+00E2 + U+00A1 if 9A was dropped
    # U+26A0 WARNING (E2 9A A0) + U+FE0F variation -> complex
    # U+1F3AF TARGET EMOJI (F0 9F 8E AF) -> U+00F0 + U+00AF
    ("ð¯", "\U0001f3af"),
    # U+1F9E0 BRAIN (F0 9F A7 A0) -> U+00F0 + U+00A7 + NBSP(A0)
    ("ð§ ", "\U0001f9e0"),

    # ---- MATH/DASH ----
    # U+2212 MINUS SIGN (E2 88 92) -> U+00E2 + U+02C6 + U+2019
    ("âˆ’", "−"),
    # U+2248 APPROX EQUAL (E2 89 88) -> U+00E2 + U+02C6 + Win-1252(88=caret?)
    # U+2264 LESS EQUAL (E2 89 A4) -> U+00E2 + ...
    # U+2265 GREATER EQUAL (E2 89 A5)
    # U+2014 EM DASH (E2 80 94) -> U+00E2 + [lost 80] + [lost 94] = just U+00E2
    # handled by general â -> – below

    # ---- GERMAN UMLAUTS (two-char: U+00C3 + second) ----
    # ä = U+00E4, UTF-8 C3 A4 -> U+00C3 + U+00A4
    ("Ã¤", "ä"),
    # ö = U+00F6, UTF-8 C3 B6 -> U+00C3 + U+00B6
    ("Ã¶", "ö"),
    # ü = U+00FC, UTF-8 C3 BC -> U+00C3 + U+00BC
    ("Ã¼", "ü"),
    # ß = U+00DF, UTF-8 C3 9F -> U+00C3 + U+0178 (Win-1252: 9F=Ydiaeresis)
    ("ÃŸ", "ß"),
    # Ä = U+00C4, UTF-8 C3 84 -> U+00C3 + U+201E (Win-1252: 84=low-9-dquote)
    ("Ã„", "Ä"),
    # Ö = U+00D6, UTF-8 C3 96 -> U+00C3 + U+2013 (Win-1252: 96=en-dash)
    ("Ã–", "Ö"),
    # Ü = U+00DC, UTF-8 C3 9C -> U+00C3 + U+0153 (Win-1252: 9C=oe-ligature)
    ("Ãœ", "Ü"),
    # é = U+00E9, UTF-8 C3 A9 -> U+00C3 + U+00A9
    ("Ã©", "é"),

    # ---- Â-PREFIXED CHARS (two-char: U+00C2 + second, Latin-1 0x80-BF range) ----
    # U+00B7 MIDDLE DOT, UTF-8 C2 B7 -> U+00C2 + U+00B7
    ("Â·", "·"),
    # U+00B2 SUPERSCRIPT TWO, UTF-8 C2 B2 -> U+00C2 + U+00B2
    ("Â²", "²"),
    # U+00B3 SUPERSCRIPT THREE, UTF-8 C2 B3 -> U+00C2 + U+00B3
    ("Â³", "³"),
    # U+00B0 DEGREE, UTF-8 C2 B0 -> U+00C2 + U+00B0
    ("Â°", "°"),
    # U+00BB RIGHT ANGLE QUOTE, UTF-8 C2 BB -> U+00C2 + U+00BB
    ("Â»", "»"),
    # U+00AB LEFT ANGLE QUOTE, UTF-8 C2 AB -> U+00C2 + U+00AB
    ("Â«", "«"),
    # U+00B9 SUPERSCRIPT ONE, UTF-8 C2 B9 -> U+00C2 + U+00B9
    ("Â¹", "¹"),
    # U+00BD HALF, UTF-8 C2 BD -> U+00C2 + U+00BD
    ("Â½", "½"),
    # U+00BC QUARTER, UTF-8 C2 BC -> U+00C2 + U+00BC
    ("Â¼", "¼"),
    # U+00BE THREE QUARTERS, UTF-8 C2 BE -> U+00C2 + U+00BE
    ("Â¾", "¾"),
    # U+00B5 MICRO SIGN, UTF-8 C2 B5 -> U+00C2 + U+00B5
    ("Âµ", "µ"),

    # ---- GREEK LETTERS (Î prefix = U+00CE) ----
    # λ = U+03BB, UTF-8 CE BB -> U+00CE + U+00BB
    ("Î»", "λ"),
    # α = U+03B1, UTF-8 CE B1 -> U+00CE + U+00B1
    ("Î±", "α"),
    # β = U+03B2, UTF-8 CE B2 -> U+00CE + U+00B2
    ("Î²", "β"),
    # γ = U+03B3, UTF-8 CE B3 -> U+00CE + U+00B3
    ("Î³", "γ"),
    # μ = U+03BC, UTF-8 CE BC -> U+00CE + U+00BC
    ("Î¼", "μ"),
    # Φ = U+03A6, UTF-8 CE A6 -> U+00CE + U+00A6
    ("Î¦", "Φ"),
    # θ = U+03B8, UTF-8 CE B8 -> U+00CE + U+00B8
    ("Î¸", "θ"),
    # ν = U+03BD, UTF-8 CE BD -> U+00CE + U+00BD
    ("Î½", "ν"),
    # Ω = U+03A9, UTF-8 CE A9 -> U+00CE + U+00A9
    ("Î©", "Ω"),
    # Δ = U+0394, UTF-8 CE 94 -> U+00CE + [C1 ctrl, lost] = just U+00CE
    # π = U+03C0, UTF-8 CF 80 -> U+00CF + U+0080 (C1 ctrl)
    # σ = U+03C3, UTF-8 CF 83 -> U+00CF + U+201A (Win-1252: 83=low-9-squote)
    ("Ï‚", "σ"),
    # φ = U+03C6, UTF-8 CF 86 -> U+00CF + U+2020 (Win-1252: 86=dagger)
    ("Ï†", "φ"),

    # ---- REMAINING SINGLE-CHAR CLEANUPS ----
    # Remove lone U+00C2 (Â) - leftover prefix after all Â+x replacements
    ("Â", ""),
    # Remove lone U+00CE (Î) - leftover Greek prefix after all Î+x replacements
    ("Î", ""),
    # Remove lone U+00CF (Ï) - leftover after Ï replacements
    ("Ï", ""),
    # Remove lone U+00C3 (Ã) - leftover after umlaut replacements
    ("Ã", ""),
    # Replace remaining U+00E2 (â) with en dash (em/en dashes in titles)
    ("â", "–"),
    # Remove remaining U+00F0 (ð) - broken 4-byte emoji prefix
    ("ð", ""),
    # Remove U+00EF U+00B8 (ï¸) - variation selector remnant
    ("ï¸", ""),
]

for filepath in files:
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    for old, new in replacements:
        content = content.replace(old, new)
    with open(filepath, "w", encoding="utf-8", newline="") as f:
        f.write(content)
    print(f"Fixed: {os.path.basename(filepath)}")

print("Done.")
