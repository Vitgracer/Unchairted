import { audio } from './audio.js';

export function setStatus(element, text, isHtml = false) {
    if (isHtml) {
        element.innerHTML = text;
    } else {
        element.textContent = text;
    }
}

export function updateFPS(element, frameCount, lastUpdateTime, now) {
    if (now - lastUpdateTime > 1000) {
        const fps = Math.round((frameCount * 1000) / (now - lastUpdateTime));
        element.textContent = fps;
        return { frameCount: 0, lastUpdateTime: now };
    }
    return { frameCount, lastUpdateTime };
}

export function hideElement(element) {
    element.classList.add('hidden');
}

export function showElement(element, display = 'block') {
    element.classList.remove('hidden');
    if (display !== 'block') {
        element.style.display = display;
    }
}

export async function runCountdown(element, shouldAbort = () => false) {
    showElement(element);
    const steps = ['3', '2', '1', 'GO!'];
    
    for (const step of steps) {
        if (shouldAbort()) {
            hideElement(element);
            return;
        }
        element.textContent = step;
        audio.play('timer', 0.5);
        element.classList.remove('countdown-animate');
        void element.offsetWidth; // Trigger reflow
        element.classList.add('countdown-animate');
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    hideElement(element);
}

export function updateScore(element, score) {
    element.textContent = score;
}

let lastTimerTick = -1;

export function updateTimer(element, remainingTime) {
    if (remainingTime === Infinity) {
        element.textContent = "∞";
        element.classList.remove('timer-critical');
        return;
    }
    
    const seconds = Math.ceil(remainingTime);
    
    // Play tick sound once per second in the last 10 seconds
    if (seconds !== lastTimerTick) {
        if (seconds <= 10 && seconds > 0) {
            audio.play('timer', 0.4);
        }
        lastTimerTick = seconds;
    }

    if (remainingTime <= 10 && remainingTime > 0) {
        element.classList.add('timer-critical');
    } else {
        element.classList.remove('timer-critical');
    }

    const mins = Math.floor(remainingTime / 60);
    const secs = Math.floor(remainingTime % 60);
    element.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function showGameOver(overlay, scoreValEl, finalScore, stats, mode) {
    scoreValEl.textContent = finalScore;
    
    const statsContainer = document.getElementById('game-stats');
    let html = '';

    if (mode === 'BUBBLE') {
        html = `
            <div class="stat-row">
                <span class="stat-label">Bubbles Popped</span>
                <span class="stat-value pos">${stats.popped}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Bubbles Missed</span>
                <span class="stat-value neg">${stats.missed}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Lasers Avoided</span>
                <span class="stat-value pos">${stats.lasersAvoided}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Lasers Hit</span>
                <span class="stat-value neg">${stats.lasersHit}</span>
            </div>
        `;
    } else {
        html = `
            <div class="stat-row">
                <span class="stat-label">Eggs Caught</span>
                <span class="stat-value pos">${stats.eggsCaught}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Eggs Broken</span>
                <span class="stat-value neg">${stats.eggsBroken}</span>
            </div>
        `;
    }

    statsContainer.innerHTML = html;
    overlay.classList.remove('hidden');
}
