/**
 * Handles drawing landmarks on the canvas.
 */
export function drawPose(ctx, results, video, canvas) {
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (results.poseLandmarks) {
        // Map landmarks back from square crop to video aspect ratio
        const vWidth = video.videoWidth;
        const vHeight = video.videoHeight;
        const minDim = Math.min(vWidth, vHeight);
        const sx = (vWidth - minDim) / 2;
        const sy = (vHeight - minDim) / 2;

        const adjustedLandmarks = results.poseLandmarks.map(lm => ({
            ...lm,
            x: (lm.x * minDim + sx) / vWidth,
            y: (lm.y * minDim + sy) / vHeight
        }));

        const mpPose = window.Pose || {};
        const mpDraw = window;

        const connectors = window.POSE_CONNECTIONS || mpPose.POSE_CONNECTIONS;
        const drawConn = mpDraw.drawConnectors;
        const drawLand = mpDraw.drawLandmarks;

        if (drawConn && connectors) {
            drawConn(ctx, adjustedLandmarks, connectors,
                { color: '#00FF00', lineWidth: 4 });
        }
        if (drawLand) {
            drawLand(ctx, adjustedLandmarks,
                { color: '#FF0000', lineWidth: 2, radius: 4 });
        }
    }
    ctx.restore();
}
