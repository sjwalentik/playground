// Text-to-Speech UI Application

document.addEventListener('DOMContentLoaded', init);

let synth = window.speechSynthesis;
let utterance = null;
let isPaused = false;

function init() {
    populateVoices();
    setupEventListeners();
    synth.addEventListener('voiceschanged', populateVoices);
}

function populateVoices() {
    const select = document.getElementById('voiceSelect');
    select.innerHTML = '';
    
    synth.getVoices().sort((a, b) => a.name.localeCompare(b.name)).forEach(voice => {
        const option = document.createElement('option');
        option.textContent = `${voice.name} (${voice.lang})`;
        option.setAttribute('data-name', voice.name);
        option.setAttribute('data-lang', voice.lang);
        select.appendChild(option);
    });
    
    if (synth.getVoices().length === 0) {
        const option = document.createElement('option');
        option.textContent = 'Loading voices...';
        select.appendChild(option);
    }
}

function setupEventListeners() {
    document.getElementById('speakBtn')?.addEventListener('click', speak);
    document.getElementById('pauseBtn')?.addEventListener('click', pause);
    document.getElementById('resumeBtn')?.addEventListener('click', resume);
    document.getElementById('stopBtn')?.addEventListener('click', stop);
    
    const rateSlider = document.getElementById('rate');
    const rateValue = document.getElementById('rateValue');
    if (rateSlider && rateValue) {
        rateSlider.addEventListener('input', (e) => {
            rateValue.textContent = e.target.value;
        });
    }
    
    const pitchSlider = document.getElementById('pitch');
    const pitchValue = document.getElementById('pitchValue');
    if (pitchSlider && pitchValue) {
        pitchSlider.addEventListener('input', (e) => {
            pitchValue.textContent = e.target.value;
        });
    }
}

function speak() {
    if (synth.speaking && isPaused) {
        synth.resume();
        return;
    }
    
    const text = document.getElementById('textInput')?.value;
    if (text === '') {
        setStatus('Please enter some text!');
        return;
    }
    
    if (synth.speaking) {
        alert('Already speaking!');
        return;
    }
    
    utterance = new SpeechSynthesisUtterance(text);
    
    const selectedOption = document.getElementById('voiceSelect')?.selectedOptions?.[0];
    if (selectedOption) {
        const name = selectedOption.getAttribute('data-name');
        const voices = synth.getVoices();
        utterance.voice = voices.find(voice => voice.name === name);
    }
    
    utterance.rate = parseFloat(document.getElementById('rate')?.value || '1');
    utterance.pitch = parseFloat(document.getElementById('pitch')?.value || '1');
    
    utterance.onstart = () => toggleButtons(true);
    utterance.onend = () => toggleButtons(false);
    utterance.onerror = (e) => setStatus('Error: ' + e.error);
    utterance.onpause = () => setStatus('Paused');
    utterance.onresume = () => setStatus('Resumed');
    
    synth.speak(utterance);
    setStatus('Speaking...');
    isPaused = false;
}

function pause() {
    if (synth.speaking && !isPaused) {
        synth.pause();
        isPaused = true;
        setStatus('Paused');
    }
}

function resume() {
    if (synth.paused) {
        synth.resume();
        isPaused = false;
        setStatus('Resumed');
    }
}

function stop() {
    synth.cancel();
    toggleButtons(false);
    setStatus('Stopped');
    isPaused = false;
}

function toggleButtons(speaking) {
    document.getElementById('speakBtn')?.setAttribute('disabled', !speaking);
    document.getElementById('pauseBtn')?.setAttribute('disabled', !speaking);
    document.getElementById('resumeBtn')?.setAttribute('disabled', speaking);
    document.getElementById('stopBtn')?.setAttribute('disabled', !speaking);
}

function setStatus(msg) {
    const statusEl = document.getElementById('status');
    if (statusEl) {
        statusEl.textContent = msg;
    }
}
