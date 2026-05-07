import { initCamera, handleResize } from './camera.js';
import { initPose, processFrame } from './pose.js';
import { drawPose } from './renderer.js';
import { setStatus, updateFPS, hideElement, showElement, runCountdown, updateScore, updateTimer, showGameOver, showTutorial } from './ui.js';
import { GameplayManager, GameMode } from './gameplay.js';
import { audio } from './audio.js';

const video = document.getElementById('input-video');
const canvas = document.getElementById('output-canvas');
const ctx = canvas.getContext('2d');
const hiddenCanvas = document.getElementById('hidden-canvas');
const hiddenCtx = hiddenCanvas.getContext('2d');
const menuContainer = document.getElementById('menu-container');
const startBtn = document.getElementById('start-btn');
const eggBtn = document.getElementById('egg-btn');
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

const game = new GameplayManager();
let pose;
let isStarted = false;
let currentPoseResults = null;
let handPoints = [];
let headPoint = null;
let currentPlayArea = null;
let selectedMode = GameMode.BUBBLE;
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

            headPoint = mapLM(lms[0]); // Nose as head center
        } else {
            handPoints = [];
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
    // 1. Always update play area if video is ready, to keep game & renderer in sync
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
            game.updateCalibration(headPoint, handPoints);
        }

        if (game.gameStarted) {
            game.update(canvas.width, canvas.height, handPoints, currentPlayArea, deltaTime, headPoint);
            updateScore(scoreValEl, game.getScore());
            updateTimer(gameTimerEl, game.remainingTime);
        } else if (isStarted && !game.gameStarted && !gameOverShown && game.remainingTime === 0 && !game.isCalibrating) {
            // Game just ended
            gameOverShown = true;
            showGameOver(gameOverEl, finalScoreEl, game.getScore(), game.stats, game.mode);
        }

        drawPose(ctx, currentPoseResults || {}, video, canvas, game);
    } else {
        lastFrameTime = 0;
    }
    requestAnimationFrame(renderLoop);
}

// FPS tracking vars
let lastPoseTime = 0;
let poseFrameCount = 0;
let lastPoseFpsUpdate = 0;
let lastFrameTime = 0;

function returnToMenu() {
    isStarted = false;
    game.reset(); // Stop any active game logic
    
    hideElement(gameOverEl);
    hideElement(videoContainerEl);
    hideElement(scoreContainerEl);
    hideElement(gameTimerEl);
    hideElement(fpsOverlayEl);
    hideElement(statusEl);
    hideElement(countdownEl);
    gameTimerEl.classList.remove('timer-critical');
    
    showElement(mainUiEl);
    showElement(document.getElementById('hero-bg'));
    showElement(document.getElementById('overlay-glow'));
    if (document.getElementById('smoke-layer')) showElement(document.getElementById('smoke-layer'));
    
    videoContainerEl.style.opacity = '0';
    
    // Switch to Home Music
    audio.playMusic('home', 0.3);
}

async function start(mode) {
    selectedMode = mode;
    hideElement(mainUiEl);
    hideElement(document.getElementById('hero-bg'));
    hideElement(document.getElementById('overlay-glow'));
    if (document.getElementById('smoke-layer')) hideElement(document.getElementById('smoke-layer'));
    
    showElement(videoContainerEl, 'flex');
    showElement(fpsOverlayEl);
    videoContainerEl.style.opacity = '1';
    
    setStatus(statusEl, 'SYSTEM INITIALIZING...');

    // Initialize Audio on first user gesture
    await audio.init();
    
    // Show Tutorial and wait for user to click OK
    await showTutorial(mode);

    // Switch to Game Music (depending on mode)
    const musicKey = mode === GameMode.BUBBLE ? 'bubble' : 'egg';
    audio.playMusic(musicKey, 0.4);

    // Clear old data to prevent "ghost" poses from previous games
    currentPoseResults = null;
    handPoints = [];
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
        loop(); // Start processing frames immediately to warm up the model

        setStatus(statusEl, 'STAND IN FRAME');
        
        // Wait for the first valid result from the model (warm-up phase)
        await new Promise((resolve) => {
            const checkReady = () => {
                if (!isStarted) return; // User exited during warm-up
                if (currentPoseResults && currentPoseResults.poseLandmarks) {
                    resolve();
                } else {
                    requestAnimationFrame(checkReady);
                }
            };
            checkReady();
        });

        if (!isStarted) return;

        // Small extra delay to ensure GPU has finished all initial compilations
        if (!isStarted) return;
        
        // Calibration Phase
        setStatus(statusEl, 'ALIGN YOURSELF');
        game.startCalibration(currentPlayArea);
        
        // Wait for calibration to complete
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

        setStatus(statusEl, 'LOCKED IN!');
        await new Promise(r => setTimeout(r, 800));

        if (!isStarted) return;

        await runCountdown(countdownEl, () => !isStarted);
        
        if (!isStarted) return; // User exited during countdown
        
        hideElement(statusEl);
        showElement(scoreContainerEl);
        updateScore(scoreValEl, 0);
        
        if (selectedDuration > 0) {
            showElement(gameTimerEl);
            updateTimer(gameTimerEl, selectedDuration);
        } else {
            hideElement(gameTimerEl);
        }
        
        game.start(selectedMode, selectedDuration);
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

// Timer Selection Logic
document.querySelectorAll('.timer-selector').forEach(selector => {
    selector.addEventListener('click', (e) => {
        if (e.target.classList.contains('timer-btn')) {
            // Remove active from all in this selector
            selector.querySelectorAll('.timer-btn').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            
            const time = parseInt(e.target.dataset.time);
            selectedDuration = time;
        }
    });
});

backToMenuBtn.addEventListener('click', returnToMenu);
homeBtn.addEventListener('click', returnToMenu);

startBtn.addEventListener('click', () => start(GameMode.BUBBLE));
eggBtn.addEventListener('click', () => start(GameMode.EGG));

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
    navMenu.classList.toggle('menu-closed');
    navMenu.classList.toggle('menu-open');
});

// Close menu when clicking any link inside it
navMenu.querySelectorAll('a, button').forEach(item => {
    item.addEventListener('click', () => {
        if (item.id !== 'menu-toggle') {
            navMenu.classList.add('menu-closed');
            navMenu.classList.remove('menu-open');
        }
    });
});

// Close menu when clicking outside
document.addEventListener('click', (e) => {
    if (!navMenu.contains(e.target) && !menuToggle.contains(e.target)) {
        navMenu.classList.add('menu-closed');
        navMenu.classList.remove('menu-open');
    }
});
window.addEventListener('click', async (e) => {
    try {
        await audio.init();
        
        // Check if we clicked a button that starts the game
        const isStartButtonClick = e.target.closest('#start-btn') || e.target.closest('#egg-btn');
        
        if (!isStarted && !isStartButtonClick) {
            audio.playMusic('home', 0.3);
        }
    } catch (e) {
        console.warn('Initial audio start failed:', e);
    }
}, { once: true });

requestAnimationFrame(renderLoop);
