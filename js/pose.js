/**
 * Wraps MediaPipe Pose detection logic.
 */
export async function initPose(onResults) {
    if (typeof Pose === 'undefined') {
        throw new Error('Mediapipe Pose is not available!');
    }

    const pose = new Pose({
        locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
        }
    });

    pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
    });

    pose.onResults(onResults);
    return pose;
}

export async function processFrame(video, pose, hiddenCanvas, hiddenCtx) {
    const vWidth = video.videoWidth;
    const vHeight = video.videoHeight;

    if (vWidth === 0 || vHeight === 0) {
        return;
    }

    // Crop and resize for MediaPipe
    const minDim = Math.min(vWidth, vHeight);
    const sx = (vWidth - minDim) / 2;
    const sy = (vHeight - minDim) / 2;

    // Draw to hidden canvas for optimization (192x192)
    hiddenCtx.drawImage(video, sx, sy, minDim, minDim, 0, 0, 192, 192);

    // Send to MediaPipe
    try {
        await pose.send({ image: hiddenCanvas });
    } catch (err) {
        console.error('Error sending frame to Pose:', err);
    }
}
