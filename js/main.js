import { initCamera, handleResize } from './camera.js';
import { initPose, processFrame } from './pose.js';
import { drawPose } from './renderer.js';
import { setStatus, updateFPS, hideElement, showElement, runCountdown, updateScore, updateTimer, showGameOver } from './ui.js';
import { GameplayManager, GameMode } from './gameplay.js';

const video = document.getElementById('input-video');
const canvas = document.getElementById('output-canvas');
const ctx = canvas.getContext('2d');
const hiddenCanvas = document.getElementById('hidden-canvas');
const hiddenCtx = hiddenCanvas.getContext('2d');
const menuContainer = document.getElementById('menu-container');
const startBtn = document.getElementById('start-btn');
const eggBtn = document.getElementById('egg-btn');
const statusEl = document.getElementById('status');
const renderFpsEl = document.getElementById('render-fps');
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

// ... (onPoseResults, loop, renderLoop stay largely the same)

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
    if (game.gameStarted) {
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
        renderFrameCount++;
        const updated = updateFPS(renderFpsEl, renderFrameCount, lastRenderFpsUpdate, now);
        renderFrameCount = updated.frameCount;
        lastRenderFpsUpdate = updated.lastUpdateTime;

        let deltaTime = lastFrameTime ? (now - lastFrameTime) / 1000 : 0;
        if (deltaTime > 0.1) deltaTime = 0.1;
        lastFrameTime = now;

        if (game.gameStarted) {
            game.update(canvas.width, canvas.height, handPoints, currentPlayArea, deltaTime, headPoint);
            updateScore(scoreValEl, game.getScore());
            updateTimer(gameTimerEl, game.remainingTime);
        } else if (isStarted && !game.gameStarted && !gameOverShown && game.remainingTime === 0) {
            // Game just ended
            gameOverShown = true;
            showGameOver(gameOverEl, finalScoreEl, game.getScore());
        }

        drawPose(ctx, currentPoseResults || {}, video, canvas, game);
    } else {
        lastFrameTime = 0;
    }
    requestAnimationFrame(renderLoop);
}

// FPS tracking vars
let renderFrameCount = 0;
let lastRenderFpsUpdate = 0;
let lastPoseTime = 0;
let poseFrameCount = 0;
let lastPoseFpsUpdate = 0;
let lastFrameTime = 0;

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
        setStatus(statusEl, 'GET READY');

        await runCountdown(countdownEl);
        
        hideElement(statusEl);
        showElement(scoreContainerEl);
        if (selectedDuration > 0) showElement(gameTimerEl);
        else hideElement(gameTimerEl);
        
        game.start(selectedMode, selectedDuration);
        gameOverShown = false;

        loop();
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

backToMenuBtn.addEventListener('click', () => {
    hideElement(gameOverEl);
    hideElement(videoContainerEl);
    hideElement(scoreContainerEl);
    hideElement(gameTimerEl);
    showElement(mainUiEl);
    showElement(document.getElementById('hero-bg'));
    showElement(document.getElementById('overlay-glow'));
    if (document.getElementById('smoke-layer')) showElement(document.getElementById('smoke-layer'));
    
    isStarted = false;
    videoContainerEl.style.opacity = '0';
});

startBtn.addEventListener('click', () => start(GameMode.BUBBLE));
eggBtn.addEventListener('click', () => start(GameMode.EGG));
requestAnimationFrame(renderLoop);

