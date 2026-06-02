import { initCamera, handleResize } from './camera.js';
import { initPose, processFrame } from './pose.js';
import { drawPose } from './renderer.js';
import { setStatus, updateFPS, hideElement, showElement, runCountdown, updateScore, updateTimer, showGameOver, showTutorial } from './ui.js';
import { GameplayManager } from './gameplay.js';
import { audio } from './audio.js';
import { gamesRegistry } from './games/registry.js';

const video = document.getElementById('input-video');
const canvas = document.getElementById('output-canvas');
const ctx = canvas.getContext('2d');
const hiddenCanvas = document.getElementById('hidden-canvas');
const hiddenCtx = hiddenCanvas.getContext('2d');
const menuContainer = document.getElementById('menu-container');
const statusEl = document.getElementById('status');

const poseFpsEl = document.getElementById('pose-fps');
const countdownEl = document.getElementById('countdown');
const scoreContainerEl = document.getElementById('score-container');
const scoreValEl = document.getElementById('score-val');
const mainUiEl = document.getElementById('main-ui');
const videoContainerEl = document.getElementById('video-container');
const fpsOverlayEl = document.getElementById('fps-overlay');
const gameTimerEl = document.getElementById('game-timer');
const gameOverEl = document.getElementById('game-over');
const finalScoreEl = document.getElementById('final-score-val');
const backToMenuBtn = document.getElementById('back-to-menu-btn');
const homeBtn = document.getElementById('home-btn');
const aboutBtn = document.getElementById('about-btn');
const aboutOverlay = document.getElementById('about-overlay');
const aboutCloseBtn = document.getElementById('about-close-btn');
const privacyBtn = document.getElementById('privacy-btn');
const privacyOverlay = document.getElementById('privacy-overlay');
const privacyCloseBtn = document.getElementById('privacy-close-btn');
const interlockOverlayEl = document.getElementById('interlock-overlay');

const game = new GameplayManager();
let pose;
let isStarted = false;
let currentPoseResults = null;
let handPoints = [];
let hipPoints = [];
let headPoint = null;
let currentPlayArea = null;
let selectedGame = gamesRegistry.find(g => !g.locked);
let selectedDuration = 60; // default 1 min
let gameOverShown = false;

function onPoseResults(results) {
    currentPoseResults = results;
    const now = performance.now();
    
    // Pose FPS tracking
    if (lastPoseTime > 0) {
        poseFrameCount++;
        const updated = updateFPS(poseFpsEl, poseFrameCount, lastPoseFpsUpdate, now);
        poseFrameCount = updated.frameCount;
        lastPoseFpsUpdate = updated.lastUpdateTime;
    }
    lastPoseTime = now;

    // Handle gameplay updates
    if (isStarted) {
        const vWidth = video.videoWidth;
        const vHeight = video.videoHeight;
        const minDim = Math.min(vWidth, vHeight);
        const sx = (vWidth - minDim) / 2;
        const sy = (vHeight - minDim) / 2;

        currentPlayArea = {
            minX: sx,
            maxX: sx + minDim,
            minY: sy,
            size: minDim
        };

        if (results.poseLandmarks) {
            const lms = results.poseLandmarks;
            const mapLM = (lm) => ({
                x: (lm.x * minDim + sx) / vWidth * canvas.width,
                y: (lm.y * minDim + sy) / vHeight * canvas.height
            });

            const getHandCenter = (indices) => {
                let x = 0, y = 0, count = 0;
                indices.forEach(idx => {
                    if (lms[idx]) {
                        x += lms[idx].x;
                        y += lms[idx].y;
                        count++;
                    }
                });
                return count > 0 ? mapLM({ x: x / count, y: y / count }) : null;
            };

            handPoints = [
                getHandCenter([15, 17, 19, 21]), // Left
                getHandCenter([16, 18, 20, 22])  // Right
            ].filter(p => p !== null);

            hipPoints = [
                mapLM(lms[23]), // Left Hip
                mapLM(lms[24])  // Right Hip
            ];

            headPoint = mapLM(lms[0]); // Nose as head center
        } else {
            handPoints = [];
            hipPoints = [];
            headPoint = null;
        }
    }
}

async function loop() {
    if (!isStarted) return;
    await processFrame(video, pose, hiddenCanvas, hiddenCtx);
    requestAnimationFrame(loop);
}

function renderLoop(now) {
    const vWidth = video.videoWidth;
    const vHeight = video.videoHeight;
    if (vWidth > 0 && vHeight > 0) {
        const minDim = Math.min(vWidth, vHeight);
        const sx = (vWidth - minDim) / 2;
        const sy = (vHeight - minDim) / 2;

        currentPlayArea = {
            minX: sx,
            maxX: sx + minDim,
            minY: sy,
            size: minDim
        };
    }

    if (isStarted) {
        let deltaTime = lastFrameTime ? (now - lastFrameTime) / 1000 : 0;
        if (deltaTime > 0.1) deltaTime = 0.1;
        lastFrameTime = now;

        if (game.isCalibrating) {
            game.updateCalibration(headPoint, handPoints, hipPoints, deltaTime);
        }

        if (game.gameStarted) {
            game.update(canvas.width, canvas.height, handPoints, currentPlayArea, deltaTime, headPoint);
            updateScore(scoreValEl, game.getScore());
            updateTimer(gameTimerEl, game.remainingTime);
        } else if (isStarted && !game.gameStarted && !gameOverShown && game.remainingTime === 0 && !game.isCalibrating) {
            gameOverShown = true;
            showGameOver(gameOverEl, finalScoreEl, game.getScore(), game.stats, game.activeGame);
        }

        drawPose(ctx, currentPoseResults || {}, video, canvas, game);
    } else {
        lastFrameTime = 0;
    }
    requestAnimationFrame(renderLoop);
}

let lastPoseTime = 0;
let poseFrameCount = 0;
let lastPoseFpsUpdate = 0;
let lastFrameTime = 0;

function returnToMenu() {
    isStarted = false;
    game.reset(); // Stop any active game logic
    
    // Reset duration to default to match UI state
    selectedDuration = 60;
    document.querySelectorAll('.timer-selector').forEach(selector => {
        selector.querySelectorAll('.timer-btn').forEach((btn, idx) => {
            if (idx === 0) btn.classList.add('active');
            else btn.classList.remove('active');
        });
    });

    hideElement(gameOverEl);
    hideElement(videoContainerEl);
    hideElement(scoreContainerEl);
    hideElement(gameTimerEl);
    hideElement(fpsOverlayEl);
    hideElement(statusEl);
    hideElement(countdownEl);
    hideElement(interlockOverlayEl);
    gameTimerEl.classList.remove('timer-critical');
    
    showElement(mainUiEl);
    showElement(document.getElementById('hero-bg'));
    showElement(document.getElementById('overlay-glow'));
    if (document.getElementById('smoke-layer')) showElement(document.getElementById('smoke-layer'));
    
    videoContainerEl.style.opacity = '0';
    
    audio.playMusic('home', 0.3);
}

async function start(gameInstance) {
    selectedGame = gameInstance;
    hideElement(mainUiEl);
    hideElement(document.getElementById('hero-bg'));
    hideElement(document.getElementById('overlay-glow'));
    if (document.getElementById('smoke-layer')) hideElement(document.getElementById('smoke-layer'));
    
    showElement(videoContainerEl, 'flex');
    showElement(fpsOverlayEl);
    videoContainerEl.style.opacity = '1';
    
    setStatus(statusEl, 'SYSTEM INITIALIZING...');

    await audio.init();
    
    await showTutorial(gameInstance);

    audio.playMusic(gameInstance.music, 0.4);

    currentPoseResults = null;
    handPoints = [];
    hipPoints = [];
    headPoint = null;

    try {
        if (!pose) {
            await initCamera(video);
            const updateSize = () => handleResize(video, canvas);
            window.addEventListener('resize', updateSize);
            updateSize();

            setStatus(statusEl, 'CALIBRATING POSE MODEL...');
            pose = await initPose(onPoseResults);
        }

        isStarted = true;
        loop();

        setStatus(statusEl, 'STAND IN FRAME');
        
        await new Promise((resolve) => {
            const checkReady = () => {
                if (!isStarted) return;
                if (currentPoseResults && currentPoseResults.poseLandmarks) {
                    resolve();
                } else {
                    requestAnimationFrame(checkReady);
                }
            };
            checkReady();
        });

        if (!isStarted) return;
        
        setStatus(statusEl, 'ALIGN YOURSELF');
        game.startCalibration(currentPlayArea, gameInstance);
        
        await new Promise((resolve) => {
            const checkCalibration = () => {
                if (!isStarted) return;
                if (!game.isCalibrating) {
                    resolve();
                } else {
                    requestAnimationFrame(checkCalibration);
                }
            };
            checkCalibration();
        });

        if (!isStarted) return;

        if (typeof gameInstance.onBeforeStart === 'function') {
            await gameInstance.onBeforeStart();
        }

        if (!isStarted) return;

        await runCountdown(countdownEl, () => !isStarted);
        
        if (!isStarted) return;
        
        hideElement(statusEl);
        showElement(scoreContainerEl);
        updateScore(scoreValEl, 0);
        
        if (selectedDuration > 0) {
            showElement(gameTimerEl);
            updateTimer(gameTimerEl, selectedDuration);
        } else {
            hideElement(gameTimerEl);
        }
        
        game.start(gameInstance, selectedDuration);
        gameOverShown = false;

    } catch (err) {
        console.error('Camera Error:', err);
        let errorMsg = err.message;
        setStatus(statusEl, `<span style="color: #ff0000; font-weight: bold;">CRITICAL ERROR: ${err.name}</span><br><small style="color: #fff;">${errorMsg}</small>`, true);
        showElement(mainUiEl);
        showElement(document.getElementById('hero-bg'));
        showElement(document.getElementById('overlay-glow'));
        if (document.getElementById('smoke-layer')) showElement(document.getElementById('smoke-layer'));

        videoContainerEl.style.opacity = '0';
        hideElement(videoContainerEl);
    }
}

function renderGameSelection() {
    const container = document.getElementById('game-selection');
    if (!container) return;
    container.innerHTML = '';

    gamesRegistry.forEach(gameItem => {
        const card = document.createElement('div');
        card.className = `game-card${gameItem.locked ? ' locked secret' : ''}`;
        if (gameItem.id) card.id = `card-${gameItem.id.toLowerCase()}`;

        const rulesList = gameItem.rules.map(rule => `<li><span class="dot"></span>${rule}</li>`).join('');

        let actionButtonHtml = '';
        let timerSelectorHtml = '';

        if (gameItem.locked) {
            actionButtonHtml = `<button class="mode-btn action-btn disabled" disabled>COMING SOON</button>`;
        } else {
            timerSelectorHtml = `
                <div class="timer-selector-container">
                    <span class="timer-label">DURATION</span>
                    <div class="timer-selector" data-for="${gameItem.id}">
                        <button class="timer-btn active" data-time="60">1 min</button>
                        <button class="timer-btn" data-time="300">5 min</button>
                        <button class="timer-btn" data-time="0">∞</button>
                    </div>
                </div>
            `;
            actionButtonHtml = `<button class="mode-btn action-btn" data-mode="${gameItem.id}">PLAY</button>`;
        }

        card.innerHTML = `
            <div class="card-content">
                <div class="game-icon">${gameItem.icon}</div>
                <h2>${gameItem.name}</h2>
                <ul class="game-rules">
                    ${rulesList}
                </ul>
                ${timerSelectorHtml}
                ${actionButtonHtml}
            </div>
        `;

        container.appendChild(card);

        if (!gameItem.locked) {
            // Bind timer selector clicks
            card.querySelectorAll('.timer-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    card.querySelectorAll('.timer-btn').forEach(b => b.classList.remove('active'));
                    e.target.classList.add('active');
                    selectedDuration = parseInt(e.target.dataset.time);
                });
            });

            // Bind play button click
            const playBtn = card.querySelector('.action-btn');
            playBtn.addEventListener('click', () => start(gameItem));
        }
    });
}

// Render dynamic game selection list
renderGameSelection();

backToMenuBtn.addEventListener('click', returnToMenu);
homeBtn.addEventListener('click', returnToMenu);

// About Modal
aboutBtn.addEventListener('click', () => showElement(aboutOverlay, 'flex'));
aboutCloseBtn.addEventListener('click', () => hideElement(aboutOverlay));
aboutOverlay.addEventListener('click', (e) => {
    if (e.target === aboutOverlay) hideElement(aboutOverlay);
});

privacyBtn.addEventListener('click', () => {
    showElement(privacyOverlay, 'flex');
});

privacyCloseBtn.addEventListener('click', () => {
    hideElement(privacyOverlay);
});

privacyOverlay.addEventListener('click', (e) => {
    if (e.target === privacyOverlay) hideElement(privacyOverlay);
});

const menuToggle = document.getElementById('menu-toggle');
const navMenu = document.getElementById('nav-menu');

menuToggle.addEventListener('click', () => {
    const isOpen = navMenu.classList.contains('menu-open');
    if (isOpen) {
        navMenu.classList.add('menu-closed');
        navMenu.classList.remove('menu-open');
        menuToggle.classList.remove('menu-active');
    } else {
        navMenu.classList.remove('menu-closed');
        navMenu.classList.add('menu-open');
        menuToggle.classList.add('menu-active');
    }
});

navMenu.querySelectorAll('a, button').forEach(item => {
    item.addEventListener('click', () => {
        if (item.id !== 'menu-toggle') {
            navMenu.classList.add('menu-closed');
            navMenu.classList.remove('menu-open');
            menuToggle.classList.remove('menu-active');
        }
    });
});

document.addEventListener('click', (e) => {
    if (!navMenu.contains(e.target) && !menuToggle.contains(e.target)) {
        navMenu.classList.add('menu-closed');
        navMenu.classList.remove('menu-open');
        menuToggle.classList.remove('menu-active');
    }
});

window.addEventListener('click', async (e) => {
    try {
        await audio.init();
        const isStartButtonClick = e.target.closest('.action-btn') && e.target.hasAttribute('data-mode');
        if (!isStarted && !isStartButtonClick) {
            audio.playMusic('home', 0.3);
        }
    } catch (e) {
        console.warn('Initial audio start failed:', e);
    }
}, { once: true });

requestAnimationFrame(renderLoop);
