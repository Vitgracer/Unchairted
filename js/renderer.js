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

/**
 * Draws a futuristic play area border
 */
function drawPlayArea(ctx, x, y, size, color = '#00f2ff') {
    ctx.save();
    
    // Subtle outer glow
    ctx.shadowBlur = 15;
    ctx.shadowColor = color;
    
    // Draw corners
    const cornerLen = 40;
    const thickness = 4;
    ctx.strokeStyle = color;
    ctx.lineWidth = thickness;
    ctx.lineCap = 'round';

    // Top Left
    ctx.beginPath();
    ctx.moveTo(x, y + cornerLen);
    ctx.lineTo(x, y);
    ctx.lineTo(x + cornerLen, y);
    ctx.stroke();

    // Top Right
    ctx.beginPath();
    ctx.moveTo(x + size - cornerLen, y);
    ctx.lineTo(x + size, y);
    ctx.lineTo(x + size, y + cornerLen);
    ctx.stroke();

    // Bottom Right
    ctx.beginPath();
    ctx.moveTo(x + size, y + size - cornerLen);
    ctx.lineTo(x + size, y + size);
    ctx.lineTo(x + size - cornerLen, y + size);
    ctx.stroke();

    // Bottom Left
    ctx.beginPath();
    ctx.moveTo(x + cornerLen, y + size);
    ctx.lineTo(x, y + size);
    ctx.lineTo(x, y + size - cornerLen);
    ctx.stroke();

    // Semi-transparent fill for the non-playable area
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    // Top
    ctx.fillRect(0, 0, ctx.canvas.width, y); 
    // Bottom
    ctx.fillRect(0, y + size, ctx.canvas.width, ctx.canvas.height - (y + size)); 
    // Left
    ctx.fillRect(0, y, x, size); 
    // Right
    ctx.fillRect(x + size, y, ctx.canvas.width - (x + size), size); 

    // Pulse effect for the play area label
    const pulse = (Math.sin(Date.now() / 500) + 1) / 2;
    ctx.font = 'bold 14px Outfit, sans-serif';
    ctx.fillStyle = `rgba(0, 242, 255, ${0.3 + pulse * 0.7})`;
    ctx.textAlign = 'center';
    
    // Un-mirror text (counteracting CSS flip)
    ctx.save();
    ctx.translate(x + size / 2, y + size - 10);
    ctx.scale(-1, 1);
    ctx.fillText('ACTIVE PLAY ZONE', 0, 0);
    ctx.restore();

    ctx.restore();
}

export function drawPose(ctx, results, video, canvas, gameplayManager = null) {
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Draw Gameplay Elements (if active)
    const vWidth = video.videoWidth;
    const vHeight = video.videoHeight;
    const minDim = Math.min(vWidth, vHeight);
    const sx = (vWidth - minDim) / 2;
    const sy = (vHeight - minDim) / 2;

    const lms = results.poseLandmarks;
    const mapLM = lms ? (lm) => ({
        x: (lm.x * minDim + sx) / vWidth * canvas.width,
        y: (lm.y * minDim + sy) / vHeight * canvas.height
    }) : null;

    const headPoint = (lms && mapLM) ? mapLM(lms[0]) : null;

    // 1. Draw Gameplay Elements (if active)
    if (gameplayManager && gameplayManager.gameStarted) {
        // Draw Play Area Boundary
        drawPlayArea(ctx, sx, sy, minDim);

        // Draw Laser (Obstacle)
        if (gameplayManager.laser) {
            const laser = gameplayManager.laser;
            ctx.save();
            
            // 1. Draw "Scanline"
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.15)';
            ctx.setLineDash([5, 10]);
            ctx.beginPath();
            ctx.moveTo(sx, laser.y);
            ctx.lineTo(sx + minDim, laser.y);
            ctx.stroke();

            // 2. Head Safety Indicator
            if (headPoint) {
                const isUnder = headPoint.y > laser.y;
                const nearLaser = laser.x < headPoint.x + 100 && (laser.x + laser.width) > headPoint.x - 100;

                ctx.save();
                ctx.setLineDash([2, 5]);
                ctx.lineWidth = 2;
                ctx.strokeStyle = isUnder ? 'rgba(0, 255, 0, 0.5)' : 'rgba(255, 0, 0, 0.8)';
                
                if (!isUnder && nearLaser) {
                    ctx.shadowBlur = 15;
                    ctx.shadowColor = 'red';
                    ctx.lineWidth = 4;
                }

                ctx.beginPath();
                ctx.moveTo(headPoint.x, headPoint.y);
                ctx.lineTo(headPoint.x, laser.y);
                ctx.stroke();
                
                ctx.beginPath();
                ctx.arc(headPoint.x, laser.y, 5, 0, Math.PI * 2);
                ctx.fillStyle = isUnder ? '#00FF00' : '#FF0000';
                ctx.fill();
                ctx.restore();
            }

            // 3. OPTIMIZED LASER (Smooth gradients, no expensive shadows)
            const time = Date.now();
            const pulseAlpha = 0.7 + Math.sin(time / 200) * 0.3; // Light pulsing for visibility
            
            // --- Outer Glow (Massive Vertical Gradient - very fast) ---
            const glowHeight = 100; // Increased for maximum visibility on mobile
            const outerGrad = ctx.createLinearGradient(laser.x, laser.y - glowHeight/2, laser.x, laser.y + glowHeight/2);
            outerGrad.addColorStop(0, 'rgba(255, 0, 0, 0)');
            outerGrad.addColorStop(0.5, `rgba(255, 0, 0, ${0.3 * pulseAlpha})`);
            outerGrad.addColorStop(1, 'rgba(255, 0, 0, 0)');
            ctx.fillStyle = outerGrad;
            ctx.fillRect(laser.x, laser.y - glowHeight/2, laser.width, glowHeight);

            // --- Main Beam Body (Neon core) ---
            const beamGrad = ctx.createLinearGradient(laser.x, laser.y - 6, laser.x, laser.y + 6);
            beamGrad.addColorStop(0, 'rgba(255, 50, 0, 0.4)');
            beamGrad.addColorStop(0.5, `rgba(255, 0, 0, ${0.9 * pulseAlpha})`);
            beamGrad.addColorStop(1, 'rgba(255, 50, 0, 0.4)');
            ctx.fillStyle = beamGrad;
            ctx.fillRect(laser.x, laser.y - 6, laser.width, 12);

            // --- Razor Core (Extreme heat) ---
            ctx.fillStyle = `rgba(255, 255, 255, ${0.95 * pulseAlpha})`;
            ctx.fillRect(laser.x + 10, laser.y - 1, laser.width - 20, 2);
            
            ctx.restore();
        }

        gameplayManager.getBubbles().forEach(bubble => {
            if (bubble.isPopped) {
                ctx.beginPath();
                ctx.arc(bubble.x, bubble.y, bubble.radius * (1 + bubble.popTimer/5), 0, Math.PI * 2);
                ctx.strokeStyle = bubble.color;
                ctx.lineWidth = 3 * (1 - bubble.popTimer/10);
                ctx.stroke();
            } else {
                ctx.beginPath();
                ctx.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2);
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
                
                ctx.beginPath();
                ctx.arc(bubble.x - bubble.radius/3, bubble.y - bubble.radius/3, bubble.radius/4, 0, Math.PI*2);
                ctx.fillStyle = 'rgba(255,255,255,0.4)';
                ctx.fill();
            }
        });
    }

    // 2. Draw Skeleton
    if (lms && mapLM) {
        const head = headPoint; 
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

    // 3. Penalty Flash Overlay
    if (gameplayManager && gameplayManager.isPenaltyActive) {
        ctx.save();
        ctx.fillStyle = 'rgba(255, 0, 0, 0.4)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = 'white';
        ctx.font = '900 80px Outfit, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowBlur = 20;
        ctx.shadowColor = 'black';
        
        // Mirror un-flip for text (same as play area label)
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.scale(-1, 1);
        ctx.fillText('DUCK!', 0, 0);
        ctx.restore();
    }

    ctx.restore();
}
