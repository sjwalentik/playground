// Speech-to-Text UI Application

document.addEventListener('DOMContentLoaded', init);

let recognition;
let isListening = false;

function init() {
    // Check for browser support
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;

        setupEventListeners();
        setupRecognitionEvents();
    } else {
        showStatus('❌ Speech recognition not supported in this browser. Please use Chrome, Edge, or Safari.');
        document.getElementById('startBtn')?.setAttribute('disabled', 'true');
    }
}

function setupEventListeners() {
    document.getElementById('startBtn')?.addEventListener('click', startListening);
    document.getElementById('stopBtn')?.addEventListener('click', stopListening);
    document.getElementById('copyBtn')?.addEventListener('click', copyToClipboard);
    document.getElementById('clearBtn')?.addEventListener('click', clearText);
}

function setupRecognitionEvents() {
    recognition.onstart = () => {
        isListening = true;
        document.getElementById('startBtn')?.setAttribute('disabled', 'true');
        document.getElementById('stopBtn')?.setAttribute('disabled', false);
        document.getElementById('startBtn')?.classList.add('recording');
        showStatus('🎙️ Listening... Speak now!');
        hideError();
    };

    recognition.onend = () => {
        isListening = false;
        document.getElementById('startBtn')?.setAttribute('disabled', false);
        document.getElementById('stopBtn')?.setAttribute('disabled', true);
        document.getElementById('startBtn')?.classList.remove('recording');
        showStatus('⏹️ Listening stopped');
    };

    recognition.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                finalTranscript += transcript + '\\n';
            } else {
                interimTranscript += transcript;
            }
        }

        const outputElement = document.getElementById('transcription');
        outputElement.value = outputElement.value + finalTranscript + interimTranscript;
        updateButtons(outputElement.value.length > 0);
    };

    recognition.onerror = (event) => {
        let message = event.error;
        switch (event.error) {
            case 'no-speech':
                message = 'No speech detected. Try speaking louder or in a quieter room.';
                break;
            case 'audio-capture':
                message = 'No microphone detected. Please connect a microphone.';
                break;
            case 'not-allowed':
                message = 'Microphone access denied. Please allow microphone access in your browser settings.';
                break;
            case 'network':
                message = 'Network error occurred. Please check your internet connection.';
                break;
            default:
                message = 'Speech recognition error: ' + event.error;
        }
        showError(message);
        showStatus('⚠️ Error detected');
        recognition.stop();
    };

    recognition.onstart = () => {
        isListening = true;
        document.getElementById('startBtn')?.setAttribute('disabled', 'true');
        document.getElementById('stopBtn')?.setAttribute('disabled', false);
        document.getElementById('startBtn')?.classList.add('recording');
        showStatus('🎙️ Listening... Speak now!');
        hideError();
    };
}

function startListening() {
    if (recognition) {
        try {
            recognition.start();
            hideError();
        } catch (error) {
            showError('Failed to start listening. Please try again.');
        }
    } else {
        showError('Speech recognition is not supported in this browser.');
    }
}

function stopListening() {
    if (recognition) {
        recognition.stop();
    }
}

function copyToClipboard() {
    const text = document.getElementById('transcription').value;
    if (text) {
        navigator.clipboard.writeText(text).then(() => {
            const btn = document.getElementById('copyBtn');
            const originalText = btn?.textContent;
            btn.textContent = '✅ Copied!';
            setTimeout(() => {
                btn.textContent = originalText || '📋 Copy Text';
            }, 1500);
        }).catch(err => {
            showError('Failed to copy text to clipboard.');
        });
    }
}

function clearText() {
    const output = document.getElementById('transcription');
    output.value = '';
    updateButtons(false);
    showStatus('🧹 Text cleared');
}

function updateButtons(hasText) {
    document.getElementById('copyBtn')?.setAttribute('disabled', !hasText);
    document.getElementById('clearBtn')?.setAttribute('disabled', !hasText);
}

function showStatus(message) {
    const statusEl = document.getElementById('status');
    if (statusEl) {
        statusEl.textContent = message;
        statusEl.style.display = 'flex';
    }
}

function showError(message) {
    const errorEl = document.getElementById('error');
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.style.display = 'flex';
        setTimeout(() => {
            if (errorEl.textContent === message) {
                hideError();
            }
        }, 5000);
    }
}

function hideError() {
    const errorEl = document.getElementById('error');
    if (errorEl) {
        errorEl.style.display = 'none';
    }
}
