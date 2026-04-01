import { initCamera, handleResize } from './camera.js';
import { initPose, processFrame } from './pose.js';
import { drawPose } from './renderer.js';
import { setStatus, updateFPS, hideElement } from './ui.js';

const video = document.getElementById('input-video');
const canvas = document.getElementById('output-canvas');
const ctx = canvas.getContext('2d');
const hiddenCanvas = document.getElementById('hidden-canvas');
const hiddenCtx = hiddenCanvas.getContext('2d');
const startBtn = document.getElementById('start-btn');
const statusEl = document.getElementById('status');
const renderFpsEl = document.getElementById('render-fps');
const poseFpsEl = document.getElementById('pose-fps');

let pose;
let isStarted = false;

// FPS tracking
let renderFrameCount = 0;
let lastRenderFpsUpdate = 0;
let lastPoseTime = 0;
let poseFrameCount = 0;
let lastPoseFpsUpdate = 0;

function onPoseResults(results) {
    const now = performance.now();
    
    // Pose FPS
    if (lastPoseTime > 0) {
        poseFrameCount++;
        const updated = updateFPS(poseFpsEl, poseFrameCount, lastPoseFpsUpdate, now);
        poseFrameCount = updated.frameCount;
        lastPoseFpsUpdate = updated.lastUpdateTime;
    }
    lastPoseTime = now;

    // Drawing
    drawPose(ctx, results, video, canvas);
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
        setStatus(statusEl, 'Works well :)');

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
