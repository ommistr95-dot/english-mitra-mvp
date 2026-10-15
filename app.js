/* app.js - core client-side logic for MVP */
const state = {
  langHindi: false,
  vocab: {},
  currentSet: null,
  currentCardIndex: 0,
  srs: {},
  diagScore: null
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
  const container = document.getElementById('diagContainer')
  const start = document.getElementById('diagStart')
  start.addEventListener('click', ()=>{
    runDiagnostic()
  })
}

function runDiagnostic(){
  // Simple 6 question diagnostic
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
  document.getElementById('nextCard').addEventListener('click', ()=>{
    nextCard()
  })
  document.getElementById('remembered').addEventListener('click', ()=>{
    markRemembered()
  })
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

function prettify(k){
  return k.replace(/_/g,' ').replace(/\b\w/g,l=>l.toUpperCase())
}

function renderFlashcard(){
  const fc = document.getElementById('flashcard')
  if(!state.currentSet){
    fc.innerHTML = '<p>Select a vocab set to start flashcards.</p>'
    return
  }
  const cards = state.vocab[state.currentSet]
  if(!cards || cards.length===0){ fc.innerHTML='No cards'; return }
  const card = cards[state.currentCardIndex % cards.length]
  fc.innerHTML = `<h3>${card.word}</h3>
    <p class="meaning">${state.langHindi ? card.hindi : card.meaning}</p>
    <p class="example"><em>Example:</em> ${card.example}</p>`
}

function nextCard(){
  state.currentCardIndex = (state.currentCardIndex+1)
  renderFlashcard()
}

function markRemembered(){
  const set = state.currentSet
  const idx = state.currentCardIndex % state.vocab[set].length
  const key = `srs_${set}_${idx}`
  // simple spaced repetition: store timestamp remembered
  localStorage.setItem(key,Date.now())
  alert('Marked remembered — will appear later')
  renderProgress()
}

function saveState(){
  try{localStorage.setItem('em_state',JSON.stringify(state))}catch(e){}
}

function renderLesson(){
  const el = document.getElementById('lessonContainer')
  const lesson = state.lessons.articles
  if(!lesson) return
  el.innerHTML = `<h3>${lesson.title}</h3>
    <p>${state.langHindi ? lesson.explanation_hindi : lesson.explanation}</p>
    <ol>${lesson.examples.map(x=>`<li>${x}</li>`).join('')}</ol>`
}

function setupGrammar(){
  // already uses renderLesson on data load
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

function scoreSpeech(transcript, prompt){
  // Simple keyword-based scoring to be improved later
  const promptWords = prompt.toLowerCase().replace(/[\.]/g,'').split(/\s+/).filter(Boolean)
  const important = promptWords.slice(0,Math.min(6,promptWords.length))
  const t = transcript.toLowerCase()
  let matched=0
  important.forEach(w=>{ if(t.includes(w)) matched++ })
  const score = Math.round((matched/important.length)*100)
  let message = ''
  if(score>80) message='Good — clear and relevant. Try adding more details.'
  else if(score>50) message='Fair — you got some keywords. Practice pronunciation and add detail.'
  else message='Keep trying — try to speak the full prompt and include keywords.'
  return {score,message}
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
  el.innerHTML = `<p>Diagnostic score: ${state.diagScore || 'N/A'}</p>
    <p>Speaking attempts: ${attempts.length}</p>
    <p>Words marked remembered: ${wordsLearned}</p>`
}

function countRemembered(){
  let c=0
  Object.keys(localStorage).forEach(k=>{ if(k.startsWith('srs_')) c++ })
  return c
}
