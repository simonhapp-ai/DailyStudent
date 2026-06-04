import os
import json
import time
from pathlib import Path
import pypdf
from google import genai
from google.genai import types
from dotenv import load_dotenv

# 1. .env-Datei laden
load_dotenv()

API_KEY_NAME = "VITE_GEMINI_API_KEY" 
gemini_key = os.getenv(API_KEY_NAME)

if not gemini_key:
    print(f"❌ Fehler: Kein API-Key unter dem Namen '{API_KEY_NAME}' in deiner .env-Datei gefunden!")
    exit()

# 2. Den Google GenAI Client initialisieren
client = genai.Client(api_key=gemini_key)

# 3. Pfade festlegen
BASE_DIR = Path(r"C:\Users\simon\OneDrive\Dokumente\Claude\Projects\KCs finden")       
OUTPUT_DIR = Path("./json_outputs")   
OUTPUT_DIR.mkdir(exist_ok=True)       

def extract_text_from_pdf(pdf_path):
    """Liest den gesamten Text aus einer PDF-Datei."""
    print(f"📄 Lese Datei: {pdf_path.name} ...")
    try:
        reader = pypdf.PdfReader(pdf_path)
        text = ""
        for page in reader.pages:
            content = page.extract_text()
            if content:
                text += content + "\n"
        return text
    except Exception as e:
        print(f"❌ Fehler beim Lesen von {pdf_path.name}: {e}")
        return None

def analyze_with_gemini(pdf_text, bundesland, fach):
    """Schickt den Text an gemini-3.1-flash-lite mit intelligenter Volumen-Drosselung."""
    print(f"🤖 Gemini analysiert {bundesland} -> {fach}...")
    
    prompt = f"""
    Du bist ein Experte für deutsche Lehrpläne und Kerncurricula (KC).
    Analysiere den folgenden Lehrplantext für das Bundesland '{bundesland}' im Fach '{fach}'.
    
    Erstelle daraus eine strukturierte Übersicht EXAKT im folgenden JSON-Format:
    {{
      "bundesland": "{bundesland}",
      "fach": "{fach}",
      "zusammenfassung": "Eine ausführliche, ca. einseitige Zusammenfassung der wichtigsten Kernziele dieses KCs.",
      "hauptthemen": [
        {{
          "thema": "Name des Hauptthemenfelds (z.B. Analysis, Neurobiologie, Weimarer Republik)",
          "relevante_unterthemen": ["Unterthema A", "Unterthema B", "Unterthema C"],
          "kernkompetenzen": ["Was der Schüler am Ende genau können muss 1", "Was der Schüler können muss 2"]
        }}
      ]
    }}
    
    Wichtig: Antworte AUSSCHLIESSLICH mit dem puren JSON-Objekt. Keine Einleitung, kein Smalltalk, kein Markdown.
    
    Hier ist der Lehrplan-Text:
    {pdf_text[:150000]} 
    """

    max_retries = 3
    # Falls Google blockiert, warten wir sofort 45 Sekunden für einen sicheren Reset des Minuten-Limits
    wait_time = 45 

    for attempt in range(max_retries):
        try:
            response = client.models.generate_content(
                model='gemini-3.1-flash-lite',  # Das aktuelle, offizielle Modell für Massenverarbeitung
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.1
                )
            )
            return json.loads(response.text)
            
        except Exception as e:
            error_msg = str(e)
            # Wenn das Rate-Limit zuschlägt
            if "429" in error_msg or "RESOURCE_EXHAUSTED" in error_msg:
                print(f"⏳ Google-Limit erreicht. Erzwungene Abkühlphase: {wait_time} Sek. (Versuch {attempt + 1}/{max_retries})...")
                time.sleep(wait_time)
                continue
            else:
                print(f"❌ KI-Fehler bei {bundesland} - {fach}: {e}")
                return None
                
    print(f"⏭️ Datei wegen anhaltender Google-Blockade übersprungen.")
    return None

def main():
    if not BASE_DIR.exists():
        print(f"❌ Fehler: Der OneDrive-Ordner wurde unter diesem Pfad nicht gefunden:\n-> {BASE_DIR}")
        return

    print(f"🔍 Suche nach PDFs im Ordner: {BASE_DIR}\n")

    for bundesland_folder in BASE_DIR.iterdir():
        if bundesland_folder.is_dir():
            bundesland_name = bundesland_folder.name
            bundesland_output_dir = OUTPUT_DIR / bundesland_name
            
            for pdf_file in bundesland_folder.rglob("*.pdf"):
                fach_name = pdf_file.parent.name 
                json_filename = f"{fach_name.lower()}.json"
                output_path = bundesland_output_dir / json_filename
                
                # Überspringt alles, was schon erfolgreich umgewandelt wurde
                if output_path.exists():
                    continue
                
                text = extract_text_from_pdf(pdf_file)
                if not text or len(text.strip()) == 0:
                    print(f"⚠️ Kein Text in {pdf_file.name} gefunden.")
                    continue
                
                json_data = analyze_with_gemini(text, bundesland_name, fach_name)
                
                if json_data:
                    bundesland_output_dir.mkdir(exist_ok=True)
                    with open(output_path, "w", encoding="utf-8") as f:
                        json.dump(json_data, f, ensure_ascii=False, indent=2)
                    print(f"✅ Erfolgreich gespeichert: json_outputs/{bundesland_name}/{json_filename}")
                    
                    # Der eingebaute Tempomat (7 Sekunden Zwangspause nach jedem Erfolg)
                    time.sleep(7) 

if __name__ == "__main__":
    main()