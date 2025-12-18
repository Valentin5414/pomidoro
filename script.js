// Settings
let settings = {
    workTime: 25,
    shortBreakTime: 5,
    longBreakTime: 15,
    sessionsUntilLongBreak: 4
};

// Load settings from localStorage
const savedSettings = localStorage.getItem('pomodoroSettings');
if (savedSettings) {
    settings = JSON.parse(savedSettings);
}

// Timer state
let timeLeft = settings.workTime * 60;
let totalTime = settings.workTime * 60;
let isRunning = false;
let interval = null;
let currentMode = 'work';
let completedPomodoros = 0;
let totalWorkedMinutes = 0;

// Ring circumference (2 * PI * r where r = 130)
const RING_CIRCUMFERENCE = 2 * Math.PI * 130;

// DOM elements
const timeDisplay = document.getElementById('timeDisplay');
const modeIndicator = document.getElementById('modeIndicator');
const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');
const skipBtn = document.getElementById('skipBtn');
const progressFill = document.getElementById('progressFill');
const ringProgress = document.getElementById('ringProgress');
const modeTabs = document.querySelectorAll('.mode-tab');
const completedCount = document.getElementById('completedCount');
const totalTimeDisplay = document.getElementById('totalTime');
const settingsBtn = document.getElementById('settingsBtn');
const modalOverlay = document.getElementById('modalOverlay');
const modalClose = document.getElementById('modalClose');
const cancelSettings = document.getElementById('cancelSettings');
const saveSettingsBtn = document.getElementById('saveSettings');
const card = document.getElementById('card');

// Settings inputs
const workTimeInput = document.getElementById('workTime');
const shortBreakTimeInput = document.getElementById('shortBreakTime');
const longBreakTimeInput = document.getElementById('longBreakTime');
const sessionsCountInput = document.getElementById('sessionsCount');

// Mode labels
const modeLabels = {
    work: 'Рабочая сессия',
    shortBreak: 'Короткий перерыв',
    longBreak: 'Длинный перерыв'
};

// Initialize ring progress
ringProgress.style.strokeDasharray = RING_CIRCUMFERENCE;
ringProgress.style.strokeDashoffset = 0;

// Audio notification with pleasant chime
function playSound() {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    // Create a more pleasant notification sound
    const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5 - major chord
    
    frequencies.forEach((freq, i) => {
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime + i * 0.1);
        
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime + i * 0.1);
        gainNode.gain.linearRampToValueAtTime(0.15, audioCtx.currentTime + i * 0.1 + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + i * 0.1 + 0.8);
        
        oscillator.start(audioCtx.currentTime + i * 0.1);
        oscillator.stop(audioCtx.currentTime + i * 0.1 + 0.8);
    });
}

// Update display
function updateDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    timeDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    // Update progress ring
    const progress = timeLeft / totalTime;
    const offset = RING_CIRCUMFERENCE * (1 - progress);
    ringProgress.style.strokeDashoffset = offset;
    
    // Update legacy progress bar (if visible)
    progressFill.style.width = `${progress * 100}%`;
    
    // Update page title
    document.title = `${timeDisplay.textContent} - Pomodoro`;
}

// Update stats display
function updateStats() {
    completedCount.textContent = completedPomodoros;
    const hours = Math.floor(totalWorkedMinutes / 60);
    const mins = totalWorkedMinutes % 60;
    totalTimeDisplay.textContent = `${hours}ч ${mins}м`;
}

// Set mode
function setMode(mode) {
    currentMode = mode;
    
    const times = {
        work: settings.workTime,
        shortBreak: settings.shortBreakTime,
        longBreak: settings.longBreakTime
    };
    
    totalTime = times[mode] * 60;
    timeLeft = totalTime;
    
    // Update UI
    modeTabs.forEach(tab => tab.classList.remove('active'));
    document.querySelector(`[data-mode="${mode}"]`).classList.add('active');
    
    modeIndicator.textContent = modeLabels[mode];
    
    // Update body class for theme colors
    document.body.className = `mode-${mode}`;
    
    updateDisplay();
    
    if (isRunning) {
        pause();
    }
}

// Start timer
function start() {
    if (isRunning) return;
    isRunning = true;
    startBtn.textContent = 'Пауза';
    card.classList.add('running');
    
    interval = setInterval(() => {
        timeLeft--;
        updateDisplay();
        
        if (timeLeft <= 0) {
            complete();
        }
    }, 1000);
}

// Pause timer
function pause() {
    isRunning = false;
    startBtn.textContent = 'Старт';
    card.classList.remove('running');
    clearInterval(interval);
}

// Toggle start/pause
function toggle() {
    if (isRunning) {
        pause();
    } else {
        start();
    }
}

// Reset timer
function reset() {
    pause();
    timeLeft = totalTime;
    updateDisplay();
}

// Complete current session
function complete() {
    pause();
    playSound();
    
    if (currentMode === 'work') {
        completedPomodoros++;
        totalWorkedMinutes += settings.workTime;
        updateStats();
        
        // Auto switch to break
        if (completedPomodoros % settings.sessionsUntilLongBreak === 0) {
            setMode('longBreak');
        } else {
            setMode('shortBreak');
        }
    } else {
        setMode('work');
    }
    
    // Show notification
    if (Notification.permission === 'granted') {
        new Notification('Pomodoro Timer', {
            body: currentMode === 'work' ? 'Время работать! 💪' : 'Время отдохнуть! ☕',
            icon: '🍅'
        });
    }
}

// Skip to next session
function skip() {
    if (currentMode === 'work' && timeLeft < totalTime) {
        const workedMinutes = Math.floor((totalTime - timeLeft) / 60);
        totalWorkedMinutes += workedMinutes;
        updateStats();
    }
    complete();
}

// Settings modal
function openSettings() {
    workTimeInput.value = settings.workTime;
    shortBreakTimeInput.value = settings.shortBreakTime;
    longBreakTimeInput.value = settings.longBreakTime;
    sessionsCountInput.value = settings.sessionsUntilLongBreak;
    modalOverlay.classList.add('active');
}

function closeSettings() {
    modalOverlay.classList.remove('active');
}

function saveSettings() {
    settings.workTime = parseInt(workTimeInput.value) || 25;
    settings.shortBreakTime = parseInt(shortBreakTimeInput.value) || 5;
    settings.longBreakTime = parseInt(longBreakTimeInput.value) || 15;
    settings.sessionsUntilLongBreak = parseInt(sessionsCountInput.value) || 4;
    
    // Save to localStorage
    localStorage.setItem('pomodoroSettings', JSON.stringify(settings));
    
    // Update current timer if not running
    if (!isRunning) {
        setMode(currentMode);
    }
    
    closeSettings();
}

// Event listeners
startBtn.addEventListener('click', toggle);
resetBtn.addEventListener('click', reset);
skipBtn.addEventListener('click', skip);

modeTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        setMode(tab.dataset.mode);
    });
});

settingsBtn.addEventListener('click', openSettings);
modalClose.addEventListener('click', closeSettings);
cancelSettings.addEventListener('click', closeSettings);
saveSettingsBtn.addEventListener('click', saveSettings);

modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
        closeSettings();
    }
});

// Request notification permission
if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (modalOverlay.classList.contains('active')) return;
    
    if (e.code === 'Space') {
        e.preventDefault();
        toggle();
    } else if (e.code === 'KeyR') {
        reset();
    }
});

// Initial setup
setMode('work');
updateStats();
