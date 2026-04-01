import { initCamera, handleResize } from './camera.js';
import { initPose, processFrame } from './pose.js';
import { drawPose } from './renderer.js';
import { setStatus, updateFPS, hideElement, showElement, runCountdown, updateScore } from './ui.js';
import { GameplayManager } from './gameplay.js';

const video = document.getElementById('input-video');
const canvas = document.getElementById('output-canvas');
const ctx = canvas.getContext('2d');
const hiddenCanvas = document.getElementById('hidden-canvas');
const hiddenCtx = hiddenCanvas.getContext('2d');
const startBtn = document.getElementById('start-btn');
const statusEl = document.getElementById('status');
const renderFpsEl = document.getElementById('render-fps');
const poseFpsEl = document.getElementById('pose-fps');
const countdownEl = document.getElementById('countdown');
const scoreContainerEl = document.getElementById('score-container');
const scoreValEl = document.getElementById('score-val');

const game = new GameplayManager();
let pose;
let isStarted = false;
let currentPoseResults = null;

// FPS tracking
let renderFrameCount = 0;
let lastRenderFpsUpdate = 0;
let lastPoseTime = 0;
let poseFrameCount = 0;
let lastPoseFpsUpdate = 0;

function onPoseResults(results) {
    currentPoseResults = results;
    const now = performance.now();
    
    // Pose FPS
    if (lastPoseTime > 0) {
        poseFrameCount++;
        const updated = updateFPS(poseFpsEl, poseFrameCount, lastPoseFpsUpdate, now);
        poseFrameCount = updated.frameCount;
        lastPoseFpsUpdate = updated.lastUpdateTime;
    }
    lastPoseTime = now;

    // Handle gameplay updates
    if (game.gameStarted && results.poseLandmarks) {
        // Prepare hand points for collision
        const lms = results.poseLandmarks;
        const vWidth = video.videoWidth;
        const vHeight = video.videoHeight;
        const minDim = Math.min(vWidth, vHeight);
        const sx = (vWidth - minDim) / 2;
        const sy = (vHeight - minDim) / 2;

        const mapLM = (lm) => ({
            x: (lm.x * minDim + sx) / vWidth * canvas.width,
            y: (lm.y * minDim + sy) / vHeight * canvas.height
        });

        // Simplified hand center calculation (same as renderer)
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

        const handPoints = [
            getHandCenter([15, 17, 19, 21]), // Left
            getHandCenter([16, 18, 20, 22])  // Right
        ].filter(p => p !== null);

        const playArea = {
            minX: sx,
            maxX: sx + minDim
        };

        game.update(canvas.width, canvas.height, handPoints, playArea);
        updateScore(scoreValEl, game.getScore());
    }
}

async function loop() {
    if (!isStarted) return;
    await processFrame(video, pose, hiddenCanvas, hiddenCtx);
    requestAnimationFrame(loop);
}

function renderLoop(now) {
    if (isStarted) {
        renderFrameCount++;
        const updated = updateFPS(renderFpsEl, renderFrameCount, lastRenderFpsUpdate, now);
        renderFrameCount = updated.frameCount;
        lastRenderFpsUpdate = updated.lastUpdateTime;

        // Draw everything
        drawPose(ctx, currentPoseResults || {}, video, canvas, game);
    }
    requestAnimationFrame(renderLoop);
}

async function start() {
    hideElement(startBtn);
    setStatus(statusEl, 'Camera initialization...');

    try {
        await initCamera(video);
        
        const updateSize = () => handleResize(video, canvas);
        window.addEventListener('resize', updateSize);
        updateSize();

        setStatus(statusEl, 'Model is loading..');
        pose = await initPose(onPoseResults);

        isStarted = true;
        setStatus(statusEl, 'Preparation...');

        // Start Countdown
        await runCountdown(countdownEl);
        
        // Start Game
        showElement(scoreContainerEl);
        game.start();
        setStatus(statusEl, 'Enjoy! :)');

        loop();
    } catch (err) {
        console.error('Camera Error:', err);
        let errorMsg = err.message;
        
        if (err.name === 'NotAllowedError') {
            errorMsg = 'Access denied! Click the camera icon in your address bar and reset permissions, then refresh the page.';
        } else if (err.name === 'NotFoundError') {
            errorMsg = 'No camera device found. Please connect a webcam.';
        } else if (err.name === 'NotReadableError') {
            errorMsg = 'Camera is currently in use by another app!';
        }

        setStatus(statusEl, `<span style="color: #ff4444; font-weight: bold;">Error: ${err.name}</span><br><small style="color: #fff;">${errorMsg}</small>`, true);
        startBtn.style.display = 'block';
        startBtn.textContent = 'Retry Camera Access';
    }
}

startBtn.addEventListener('click', start);
requestAnimationFrame(renderLoop);
