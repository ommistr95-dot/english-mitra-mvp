/* app.js - enhanced client logic: SM-2 SRS, WER scoring, TTS play, onboarding, mini-chart */
const state = {
  langHindi: false,
  vocab: {},
  currentSet: null,
  currentCardIndex: 0,
  srsMeta: {},
  diagScore: null,
  purpose: null
}

document.addEventListener('DOMContentLoaded', ()=>{
  setupNav()
  setupLangToggle()
  loadData()
  setupDiagnostic()
  setupVocabControls()
  setupGrammar()
  setupSpeaking()
  renderProgress()
  setupOnboarding()
})

function setupNav(){
  document.querySelectorAll('nav button').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      document.querySelectorAll('nav button').forEach(b=>b.classList.remove('active'))
      btn.classList.add('active')
      const sec = btn.dataset.section
      document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'))
      document.getElementById(sec).classList.add('active')
    })
  })
}

function setupLangToggle(){
  const toggle = document.getElementById('langToggle')
  toggle.addEventListener('change', ()=>{
    state.langHindi = toggle.checked
    renderFlashcard()
    renderLesson()
  })
}

async function loadData(){
  try{
    const v = await fetch('data/vocab.json').then(r=>r.json())
    const lessons = await fetch('data/lessons.json').then(r=>r.json())
    state.vocab = v
    state.lessons = lessons
    renderVocabSets()
    renderLesson()
  }catch(e){
    console.error('Data load failed',e)
  }
}

function setupDiagnostic(){
  const start = document.getElementById('diagStart')
  start.addEventListener('click', ()=>{ runDiagnostic() })
}

function runDiagnostic(){
  const qs = [
    {q:'What is the past of "go"?', a:'went'},
    {q:'Choose article: "___ apple"', a:'an'},
    {q:'Translate (Hindi): "Kitna bhada?" → English (short)', a:'how much'},
    {q:'Fill: He ___ to college everyday. (go/goes)', a:'goes'},
    {q:'Synonym of "big"', a:'large'},
    {q:'Make question: "You are a student." → (Yes/No question)', a:'are you'}
  ]
  let score=0
  let i=0
  askQ()
  function askQ(){
    if(i>=qs.length){
      document.getElementById('diagResult').innerHTML = `<p>Done — score: ${score}/${qs.length}</p>`
      state.diagScore = Math.round((score/qs.length)*100)
      saveState()
      renderProgress()
      return
    }
    const q = qs[i]
    const ans = prompt(q.q)
    if(ans && ans.toLowerCase().includes(q.a)) score++
    i++
    askQ()
  }
}

function setupVocabControls(){
  document.getElementById('nextCard').addEventListener('click', ()=>{ nextCard() })
  document.querySelectorAll('.srs-controls .rate').forEach(b=>{
    b.addEventListener('click', ()=>{
      const q = parseInt(b.dataset.q,10)
      rateCurrentCard(q)
    })
  })
  document.getElementById('dueOnly').addEventListener('change', ()=>{ renderFlashcard() })
}

function renderVocabSets(){
  const el = document.getElementById('vocabSets')
  el.innerHTML = ''
  Object.keys(state.vocab).forEach(setName=>{
    const btn = document.createElement('button')
    btn.textContent = prettify(setName)
    btn.addEventListener('click', ()=>{
      state.currentSet = setName
      state.currentCardIndex = 0
      renderFlashcard()
    })
    el.appendChild(btn)
  })
}

function prettify(k){ return k.replace(/_/g,' ').replace(/\b\w/g,l=>l.toUpperCase()) }

function renderFlashcard(){
  const fc = document.getElementById('flashcard')
  if(!state.currentSet){ fc.innerHTML = '<p>Select a vocab set to start flashcards.</p>'; return }
  const cards = state.vocab[state.currentSet]
  if(!cards || cards.length===0){ fc.innerHTML='No cards'; return }

  // If dueOnly checked, find next due
  const dueOnly = document.getElementById('dueOnly').checked
  let idx = state.currentCardIndex % cards.length
  if(dueOnly){
    // find next card whose nextDue <= now
    const now = Date.now()
    let found = -1
    for(let i=0;i<cards.length;i++){
      const k = `meta_${state.currentSet}_${i}`
      const m = JSON.parse(localStorage.getItem(k)||'null')
      if(!m || m.nextDue <= now){ found = i; break }
    }
    if(found>=0) idx = found; else { fc.innerHTML = '<p>No cards due now. Try all cards.</p>'; return }
  }

  const card = cards[idx]
  state.currentCardIndex = idx
  const meta = JSON.parse(localStorage.getItem(`meta_${state.currentSet}_${idx}`) || 'null')
  const nextDueText = meta ? `Next due: ${new Date(meta.nextDue).toLocaleDateString()}` : 'Not scheduled yet'
  fc.innerHTML = `<h3>${card.word}</h3>
    <p class="meaning">${state.langHindi ? card.hindi : card.meaning}</p>
    <p class="example"><em>Example:</em> ${card.example}</p>
    <p class="nextdue">${nextDueText}</p>`
}

function nextCard(){
  const cards = state.vocab[state.currentSet]
  state.currentCardIndex = (state.currentCardIndex+1) % cards.length
  renderFlashcard()
}

// SM-2 scheduling
function sm2ScheduleForCard(set, idx, quality){
  const key = `meta_${set}_${idx}`
  let m = JSON.parse(localStorage.getItem(key) || 'null')
  if(!m){ m = {interval:0,repetitions:0,easiness:2.5,nextDue:Date.now()} }
  if(quality < 3){ m.repetitions = 0; m.interval = 1 }
  else{
    m.repetitions += 1
    if(m.repetitions === 1) m.interval = 1
    else if(m.repetitions === 2) m.interval = 6
    else m.interval = Math.round(m.interval * m.easiness)
    m.easiness = Math.max(1.3, m.easiness + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  }
  m.nextDue = Date.now() + m.interval * 24*60*60*1000
  localStorage.setItem(key, JSON.stringify(m))
  return m
}

function rateCurrentCard(quality){
  const set = state.currentSet
  const idx = state.currentCardIndex
  sm2ScheduleForCard(set, idx, quality)
  // show quick feedback
  alert('Saved — next review scheduled.')
  renderFlashcard()
  renderProgress()
}

function setupGrammar(){ /* already uses renderLesson on data load */ }

function renderLesson(){
  const el = document.getElementById('lessonContainer')
  const lesson = state.lessons.articles
  if(!lesson) return
  el.innerHTML = `<h3>${lesson.title}</h3>
    <p>${state.langHindi ? lesson.explanation_hindi : lesson.explanation}</p>
    <ol>${lesson.examples.map(x=>`<li>${x}</li>`).join('')}</ol>`
}

function setupSpeaking(){
  const prompts = [
    'Ask for a ticket at the railway counter.',
    'Introduce yourself to a roommate in one minute.',
    'Ask a shopkeeper the price of an item and bargain.'
  ]
  const pEl = document.getElementById('speakingPrompt')
  pEl.innerHTML = `<p>${prompts[0]}</p><select id="promptSelect">${prompts.map((p,i)=>`<option value="${i}">${p}</option>`).join('')}</select>`
  const select = document.getElementById('promptSelect')
  select.addEventListener('change', ()=>{pEl.querySelector('p').textContent = prompts[select.value]})

  // TTS play prompt
  document.getElementById('playPrompt').addEventListener('click', ()=>{
    const text = prompts[select.value]
    const uttr = new SpeechSynthesisUtterance(text)
    uttr.lang = 'en-IN'
    speechSynthesis.speak(uttr)
  })

  const recordBtn = document.getElementById('recordBtn')
  let recognition, listening=false
  if(!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)){
    recordBtn.disabled = true
    recordBtn.textContent = 'Voice not supported in this browser'
    return
  }
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
  recognition = new SpeechRecognition()
  recognition.lang = 'en-IN'
  recognition.interimResults = false
  recognition.maxAlternatives = 1

  recognition.onresult = (e)=>{
    const text = e.results[0][0].transcript
    document.getElementById('transcript').textContent = text
    const feedback = scoreSpeech(text, prompts[select.value])
    document.getElementById('speakingFeedback').innerHTML = `<p>Score: ${feedback.score}%</p><p>${feedback.message}</p>`
    saveAttempt(prompts[select.value],text,feedback.score)
    renderProgress()
  }
  recognition.onerror = (e)=>{ document.getElementById('speakingFeedback').textContent = 'Recognition error: '+e.error }

  recordBtn.addEventListener('click', ()=>{
    if(listening){ recognition.stop(); listening=false; recordBtn.textContent='Start Recording'; return }
    recognition.start(); listening=true; recordBtn.textContent='Stop Recording'
  })
}

// scoring: combine keyword match + WER (lower WER -> better)
function scoreSpeech(transcript, prompt){
  const t = normalizeText(transcript)
  const p = normalizeText(prompt)
  const pWords = p.split(' ').filter(Boolean)
  const important = pWords.slice(0,Math.min(6,pWords.length))
  let matched=0
  important.forEach(w=>{ if(t.includes(w)) matched++ })
  const kwScore = matched / important.length
  const wer = wordErrorRate(p,t) // 0..1 (0 perfect)
  // combine: 70% WER-based, 30% keyword
  const score = Math.round(( (1 - wer) * 0.7 + kwScore * 0.3) * 100)
  let message = ''
  if(score>80) message='Good — clear and relevant. Try adding more details.'
  else if(score>50) message='Fair — you got some keywords. Practice pronunciation and add detail.'
  else message='Keep trying — try to speak the full prompt and include keywords.'
  return {score,message}
}

function normalizeText(s){ return s.toLowerCase().replace(/["'.,!?;:]/g,'').replace(/\s+/g,' ').trim() }

function wordErrorRate(ref, hyp){
  const r = ref.split(' ')
  const h = hyp.split(' ')
  const d = levenshteinWords(r,h)
  return d / Math.max(r.length,1)
}

// simple word-level Levenshtein
function levenshteinWords(a,b){
  const n=a.length, m=b.length
  const dp = Array.from({length:n+1},()=>new Array(m+1).fill(0))
  for(let i=0;i<=n;i++) dp[i][0]=i
  for(let j=0;j<=m;j++) dp[0][j]=j
  for(let i=1;i<=n;i++){
    for(let j=1;j<=m;j++){
      if(a[i-1]===b[j-1]) dp[i][j]=dp[i-1][j-1]
      else dp[i][j]=Math.min(dp[i-1][j]+1, dp[i][j-1]+1, dp[i-1][j-1]+1)
    }
  }
  return dp[n][m]
}

function saveAttempt(prompt,transcript,score){
  const key = 'speaking_attempts'
  const arr = JSON.parse(localStorage.getItem(key) || '[]')
  arr.push({prompt,transcript,score,t:new Date().toISOString()})
  localStorage.setItem(key,JSON.stringify(arr))
}

function renderProgress(){
  const el = document.getElementById('progressContainer')
  const attempts = JSON.parse(localStorage.getItem('speaking_attempts') || '[]')
  const wordsLearned = countRemembered()
  const avg = attempts.length? Math.round(attempts.reduce((s,a)=>s+a.score,0)/attempts.length):0
  el.innerHTML = `<p>Diagnostic score: ${state.diagScore || 'N/A'}</p>
    <p>Speaking attempts: ${attempts.length} — Avg score: ${avg}%</p>
    <p>Words scheduled/remembered: ${wordsLearned}</p>`
  renderMiniChart()
}

function countRemembered(){
  let c=0
  Object.keys(localStorage).forEach(k=>{ if(k.startsWith('meta_')) c++ })
  return c
}

function renderMiniChart(){
  // simple last-7-days attempt counts
  const attempts = JSON.parse(localStorage.getItem('speaking_attempts') || '[]')
  const days = []
  for(let i=6;i>=0;i--){
    const d = new Date(); d.setDate(d.getDate()-i)
    days.push(d.toISOString().slice(0,10))
  }
  const counts = days.map(d=>attempts.filter(a=>a.t.startsWith(d)).length)
  const max = Math.max(...counts,1)
  const svg = `<svg width="100%" height="60" viewBox="0 0 ${counts.length*20} 60" xmlns="http://www.w3.org/2000/svg">${counts.map((c,i)=>`<rect x="${i*20+6}" y="${60 - (c/max*50)}" width="12" height="${c/max*50}" fill="#0ea5a4"></rect>`).join('')}</svg>`
  document.getElementById('miniChart').innerHTML = svg
}

function setupOnboarding(){
  const modal = document.getElementById('onboard')
  document.querySelectorAll('.purpose-buttons .pur').forEach(b=>{
    b.addEventListener('click', ()=>{
      document.querySelectorAll('.purpose-buttons .pur').forEach(x=>x.classList.remove('sel'))
      b.classList.add('sel')
      state.purpose = b.dataset.pur
    })
  })
  document.getElementById('onboardClose').addEventListener('click', ()=>{
    modal.style.display='none'
    saveState()
  })
}

function saveState(){ try{localStorage.setItem('em_state',JSON.stringify(state))}catch(e){} }
