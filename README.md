# English Mitra MVP — feature/ui-srs

This branch adds the following improvements:

- SM-2 spaced repetition scheduling for flashcards (rate with Again/Hard/Good/Easy)
- Flashcard UI polish and "Show due cards only" toggle
- Onboarding modal to choose purpose (conversational/academic/travel)
- TTS "Play prompt" for speaking prompts
- Improved speaking scorer: keyword match + WER (Levenshtein words)
- Mini chart for last-7-days speaking attempts
- Expanded vocabulary sets (multiple categories, Bihar/India-centric)

How to test locally:
1. Checkout branch: git checkout feature/ui-srs
2. Run local HTTP server: python3 -m http.server 8000
3. Open http://localhost:8000 in Chrome

Next steps after testing:
- Add more vocab cards if needed (I can expand to 200+)
- Add backend for persistent storage (Firebase/Supabase)
- Add Whisper-based ASR prototype

