/**
 * Handles custom drawing of landmarks, skeleton, and gameplay elements.
 */

function getCenterOfMass(landmarks, indices) {
    let x = 0, y = 0, z = 0, count = 0;
    indices.forEach(idx => {
        if (landmarks[idx]) {
            x += landmarks[idx].x;
            y += landmarks[idx].y;
            z += landmarks[idx].z;
            count++;
        }
    });
    if (count === 0) return null;
    return { x: x / count, y: y / count, z: z / count };
}

function drawLine(ctx, p1, p2, color = '#00FF00', width = 4) {
    if (!p1 || !p2) return;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.stroke();
}

function drawPoint(ctx, p, color = '#FF0000', radius = 6) {
    if (!p) return;
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
}

export function drawPose(ctx, results, video, canvas, gameplayManager = null) {
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Draw Gameplay Elements (if active)
    if (gameplayManager && gameplayManager.gameStarted) {
        gameplayManager.getBubbles().forEach(bubble => {
            ctx.beginPath();
            ctx.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2);
            
            if (bubble.isPopped) {
                // Expanding bubble or particles
                ctx.strokeStyle = bubble.color;
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 5]);
                ctx.stroke();
            } else {
                const gradient = ctx.createRadialGradient(
                    bubble.x - bubble.radius / 3, 
                    bubble.y - bubble.radius / 3, 
                    bubble.radius / 10,
                    bubble.x, 
                    bubble.y, 
                    bubble.radius
                );
                gradient.addColorStop(0, 'white');
                gradient.addColorStop(0.2, bubble.color);
                gradient.addColorStop(1, 'rgba(0,0,0,0)');
                
                ctx.fillStyle = gradient;
                ctx.fill();
            }
        });
    }

    // 2. Draw Skeleton
    if (results.poseLandmarks) {
        const vWidth = video.videoWidth;
        const vHeight = video.videoHeight;
        const minDim = Math.min(vWidth, vHeight);
        const sx = (vWidth - minDim) / 2;
        const sy = (vHeight - minDim) / 2;

        // Map landmarks function
        const mapLM = (lm) => ({
            x: (lm.x * minDim + sx) / vWidth * canvas.width,
            y: (lm.y * minDim + sy) / vHeight * canvas.height
        });

        const lms = results.poseLandmarks;
        
        // Calculate points
        const head = mapLM(lms[0]); // Nose
        
        const leftHandArr = getCenterOfMass(lms, [15, 17, 19, 21]);
        const rightHandArr = getCenterOfMass(lms, [16, 18, 20, 22]);
        
        const leftHand = leftHandArr ? mapLM(leftHandArr) : null;
        const rightHand = rightHandArr ? mapLM(rightHandArr) : null;

        const lShoulder = mapLM(lms[11]);
        const rShoulder = mapLM(lms[12]);
        const lElbow = mapLM(lms[13]);
        const rElbow = mapLM(lms[14]);
        const lHip = mapLM(lms[23]);
        const rHip = mapLM(lms[24]);
        const lKnee = mapLM(lms[25]);
        const rKnee = mapLM(lms[26]);
        const lAnkle = mapLM(lms[27]);
        const rAnkle = mapLM(lms[28]);

        // Draw Skeleton lines
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#00FF00';
        
        drawLine(ctx, lShoulder, rShoulder);
        drawLine(ctx, lShoulder, lHip);
        drawLine(ctx, rShoulder, rHip);
        drawLine(ctx, lHip, rHip);

        drawLine(ctx, lShoulder, lElbow);
        drawLine(ctx, lElbow, leftHand);
        drawLine(ctx, rShoulder, rElbow);
        drawLine(ctx, rElbow, rightHand);

        drawLine(ctx, lHip, lKnee);
        drawLine(ctx, lKnee, lAnkle);
        drawLine(ctx, rHip, rKnee);
        drawLine(ctx, rKnee, rAnkle);

        ctx.shadowColor = '#FF0000';
        drawPoint(ctx, head, '#00FF00', 10);
        drawPoint(ctx, leftHand, '#FF0000', 8);
        drawPoint(ctx, rightHand, '#FF0000', 8);

        [lShoulder, rShoulder, lElbow, rElbow, lHip, rHip, lKnee, rKnee, lAnkle, rAnkle].forEach(p => {
            drawPoint(ctx, p, '#FFFFFF', 4);
        });
    }
    ctx.restore();
}
