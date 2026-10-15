# English Mitra MVP

This repository contains a lightweight web MVP for a personalized English learning app focused on India/Bihar-relevant vocabulary and conversational practice.

Features added in this commit:
- Hindi toggle for explanations
- Multiple vocab sets (daily life, college, travel) with Bihar-friendly examples
- Flashcard UI with simple SRS marking (stored in localStorage)
- Grammar micro-lesson (articles) with Hindi and English explanations
- Speaking practice using browser SpeechRecognition (Web Speech API) with simple keyword scoring
- Diagnostic quick quiz
- Progress view

How to run locally:
1. Clone the repo:
   git clone https://github.com/ommistr95-dot/english-mitra-mvp.git
2. Change directory:
   cd english-mitra-mvp
3. Start a simple HTTP server (required for speech APIs in some browsers):
   python3 -m http.server 8000
4. Open in Chrome: http://localhost:8000

Notes:
- Use Chrome for better SpeechRecognition support (en-IN language).
- This is a free prototype; data is stored in browser localStorage. For public launch, we'll add backend + authentication + model endpoints.

Next improvement ideas:
- Improve speaking scoring with phoneme alignment or Whisper-based ASR
- Add more lessons, Hindi content & Bihar-specific dialogues
- Deploy to GitHub Pages for public testing
- Add user accounts and persistent backend

