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

function drawLine(ctx, p1, p2, color = '#ff0000', width = 4) {
    if (!p1 || !p2) return;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.stroke();
}

function drawPoint(ctx, p, color = '#FF0000', radius = 6, glowColor = null) {
    if (!p) return;
    ctx.save();

    if (glowColor) {
        ctx.shadowBlur = 15;
        ctx.shadowColor = glowColor;
    }

    ctx.beginPath();
    ctx.arc(p.x, p.y, radius, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();

    // Add a small white "highlight" in the center for a 3D effect
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius * 0.4, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fill();

    ctx.restore();
}

/**
 * Draws a futuristic play area border
 */
function drawPlayArea(ctx, x, y, size, color = '#ff0000', hideLabel = false) {
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

    // Semi-transparent fill for the non-playable area (Dark Pastel Red/Black)
    ctx.fillStyle = 'rgba(20, 0, 0, 0.6)';
    // Top
    ctx.fillRect(0, 0, ctx.canvas.width, y);
    // Bottom
    ctx.fillRect(0, y + size, ctx.canvas.width, ctx.canvas.height - (y + size));
    // Left
    ctx.fillRect(0, y, x, size);
    // Right
    ctx.fillRect(x + size, y, ctx.canvas.width - (x + size), size);

    // Pulse effect for the play area label
    if (!hideLabel) {
        const pulse = (Math.sin(Date.now() / 500) + 1) / 2;
        ctx.font = 'bold 14px Outfit, sans-serif';
        ctx.fillStyle = `rgba(255, 0, 0, ${0.4 + pulse * 0.6})`;
        ctx.textAlign = 'center';

        // Un-mirror text (counteracting CSS flip)
        ctx.save();
        ctx.translate(x + size / 2, y + size - 10);
        ctx.scale(-1, 1);
        ctx.fillText('ACTIVE PLAY ZONE', 0, 0);
        ctx.restore();
    }

    ctx.restore();
}

function drawPerches(ctx, perches, basket = null) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';

    perches.forEach(p => {
        // 1. Draw Perch Pipe
        ctx.beginPath();
        ctx.moveTo(p.x1, p.y1);
        ctx.lineTo(p.x2, p.y2);
        ctx.stroke();

        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 3;
        ctx.moveTo(p.x1, p.y1);
        ctx.lineTo(p.x2, p.y2);
        ctx.stroke();

        // Reset for next pipes
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 14;

        // 2. Draw Catch Zone Target (Phantom Basket)
        ctx.save();
        const isNear = basket && Math.sqrt((p.x2 - basket.x) ** 2 + (p.y2 - basket.y) ** 2) < 70;

        ctx.translate(p.x2, p.y2);

        // Target glow
        if (isNear) {
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#ff0000';
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
            ctx.lineWidth = 3;
        } else {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.lineWidth = 2;
        }

        // Draw a dashed target circle/bracket
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.arc(0, 0, 35, 0, Math.PI * 2);
        ctx.stroke();

        // Small inner icon
        ctx.setLineDash([]);
        ctx.globalAlpha = isNear ? 0.6 : 0.2;
        ctx.fillStyle = isNear ? '#00f2ff' : '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    });
    ctx.restore();
}

function drawEgg(ctx, egg) {
    ctx.save();
    ctx.translate(egg.x, egg.y);

    if (egg.isBreaking) {
        // Draw broken egg (yolk splash)
        const alpha = 1 - (egg.breakTimer / 0.6);
        ctx.globalAlpha = alpha;

        // Center yolk
        ctx.beginPath();
        ctx.arc(0, 5, egg.radius * 0.8, 0, Math.PI * 2);
        ctx.fillStyle = '#ffcc00';
        ctx.fill();

        // White splashes
        ctx.fillStyle = '#ffffff';
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const dist = egg.radius * 1.2;
            ctx.beginPath();
            ctx.arc(Math.cos(angle) * dist, Math.sin(angle) * dist + 5, egg.radius * 0.4, 0, Math.PI * 2);
            ctx.fill();
        }
    } else {
        ctx.rotate(egg.rotation);
        // Egg shape
        ctx.beginPath();
        ctx.ellipse(0, 0, egg.radius * 0.8, egg.radius, 0, 0, Math.PI * 2);

        // Gradient for 3D look
        const grad = ctx.createRadialGradient(-egg.radius * 0.3, -egg.radius * 0.3, 2, 0, 0, egg.radius);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(1, '#e0e0e0');

        ctx.fillStyle = grad;
        ctx.fill();

        ctx.strokeStyle = 'rgba(0,0,0,0.1)';
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    ctx.restore();
}

function drawBasket(ctx, basket) {
    if (!basket) return;
    ctx.save();

    ctx.translate(basket.x, basket.y);

    // Un-mirror for the emoji/text
    ctx.save();
    ctx.scale(-1, 1);

    const w = basket.width;
    const h = basket.height;

    // Draw 🧺 Emoji - increased size
    ctx.font = `${h * 1.4}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🧺', 0, 0);

    // Subtle overlay
    const grad = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
    grad.addColorStop(0, 'rgba(255, 215, 0, 0.1)');
    grad.addColorStop(1, 'rgba(255, 140, 0, 0.05)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
    ctx.restore();
}

function drawCalibration(ctx, gameplayManager) {
    if (!gameplayManager || !gameplayManager.isCalibrating) return;

    if (gameplayManager.calibrationPassed) {
        // Draw PASSED animation
        const timer = gameplayManager.calibrationFinishTimer;
        const alpha = Math.min(1, timer * 2);
        const scale = 0.8 + Math.sin(timer * 10) * 0.1;

        ctx.save();
        ctx.translate(ctx.canvas.width / 2, ctx.canvas.height / 2);
        ctx.scale(-scale, scale); // Un-mirror and scale

        ctx.font = '900 120px Outfit, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Outer glow
        ctx.shadowBlur = 30;
        ctx.shadowColor = '#00FF00';

        ctx.fillStyle = `rgba(0, 255, 0, ${alpha})`;
        ctx.fillText('PASSED', 0, 0);

        // Subtle scanline effect on text
        ctx.globalCompositeOperation = 'source-atop';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        for (let i = -100; i < 100; i += 10) {
            ctx.fillRect(-400, i + (Date.now() % 500) / 50, 800, 2);
        }

        ctx.restore();
        return;
    }

    // Separate hips to draw them as a unified "Core Zone"
    const hips = gameplayManager.calibrationTargets.filter(t => t.id.includes('Hip'));
    const others = gameplayManager.calibrationTargets.filter(t => !t.id.includes('Hip'));

    // 1. Draw "PLEASE STAND UP!" at the top
    ctx.save();
    const minY = (gameplayManager.playArea && gameplayManager.playArea.minY !== undefined) ? gameplayManager.playArea.minY : 0;
    ctx.translate(ctx.canvas.width / 2, minY + 45);
    ctx.scale(-1, 1); // Un-mirror text

    // Pulse animation
    const pulse = (Math.sin(Date.now() / 400) + 1) / 2;

    // Main Text: PLEASE STAND UP!
    ctx.font = '900 48px Syncopate, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // White Neon Glow
    ctx.shadowBlur = 20 + pulse * 15;
    ctx.shadowColor = '#FFFFFF';

    ctx.fillStyle = '#FFFFFF'; // Pure Glowing White
    ctx.fillText('PLEASE STAND UP!', 0, 0);

    // Subtext
    ctx.font = 'bold 14px Outfit, sans-serif';
    ctx.fillStyle = `rgba(255, 255, 255, ${0.7 + pulse * 0.3})`;
    ctx.shadowBlur = 0;
    ctx.restore();

    // Draw Others
    others.forEach(target => {
        ctx.save();
        const color = target.isActive ? '#00FF00' : '#FF0000';
        const pulse = (Math.sin(Date.now() / 300) + 1) / 2;
        ctx.shadowBlur = target.isActive ? 25 : 15;
        ctx.shadowColor = color;

        ctx.beginPath();
        ctx.arc(target.x, target.y, target.radius, 0, Math.PI * 2);
        ctx.strokeStyle = color;
        ctx.lineWidth = 4;
        if (!target.isActive) ctx.setLineDash([10, 5]);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(target.x, target.y, target.radius * (0.8 + pulse * 0.1), 0, Math.PI * 2);
        ctx.fillStyle = target.isActive ? `rgba(0, 255, 0, 0.2)` : `rgba(255, 0, 0, ${0.1 + pulse * 0.1})`;
        ctx.fill();

        ctx.save();
        ctx.translate(target.x, target.y);
        ctx.scale(-1, 1);
        ctx.font = 'bold 18px Outfit, sans-serif';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        if (target.isActive) {
            ctx.fillText(target.label, 0, -8);
            ctx.font = 'bold 12px Outfit, sans-serif';
            ctx.fillStyle = '#00FF00';
            ctx.fillText('LOCKED', 0, 12);
        } else {
            ctx.fillText(target.label, 0, 0);
        }
        ctx.restore();
        ctx.restore();
    });

    // Draw Hips as a unified Capsule (Cyber Belt)
    if (hips.length === 2) {
        const [h1, h2] = hips;
        const allActive = h1.isActive && h2.isActive;
        const anyActive = h1.isActive || h2.isActive;
        const color = allActive ? '#00FF00' : (anyActive ? '#FFFF00' : '#FF0000');
        const pulse = (Math.sin(Date.now() / 300) + 1) / 2;

        ctx.save();
        ctx.shadowBlur = anyActive ? 20 : 10;
        ctx.shadowColor = color;

        // Draw unified background (Pill/Capsule shape)
        const radius = h1.radius;
        const leftX = Math.min(h1.x, h2.x);
        const rightX = Math.max(h1.x, h2.x);
        const width = rightX - leftX;

        ctx.beginPath();
        ctx.arc(leftX, h1.y, radius, Math.PI / 2, Math.PI * 1.5);
        ctx.lineTo(rightX, h1.y - radius);
        ctx.arc(rightX, h1.y, radius, -Math.PI / 2, Math.PI / 2);
        ctx.closePath();

        // Fill
        ctx.fillStyle = allActive ? 'rgba(0, 255, 0, 0.15)' : (anyActive ? 'rgba(255, 255, 0, 0.1)' : 'rgba(255, 0, 0, 0.05)');
        ctx.fill();

        // Stroke
        ctx.strokeStyle = color;
        ctx.lineWidth = 4;
        if (!allActive) ctx.setLineDash([15, 8]);
        ctx.stroke();

        // Inner pulses at hip points
        hips.forEach(h => {
            if (h.isActive) {
                ctx.beginPath();
                ctx.arc(h.x, h.y, radius * 0.4, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
                ctx.fill();
            }
        });

        // Unified Label
        ctx.save();
        ctx.translate((leftX + rightX) / 2, h1.y);
        ctx.scale(-1, 1);
        ctx.font = '900 20px Syncopate, sans-serif';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        if (allActive) {
            ctx.fillText('HIPS', 0, -10);
            ctx.font = 'bold 13px Outfit, sans-serif';
            ctx.fillStyle = '#00FF00';
            ctx.fillText('STABILIZED', 0, 14);
        } else {
            ctx.fillText('HIPS', 0, 0);
        }
        ctx.restore();

        ctx.restore();
    }
}

export function drawPose(ctx, results, video, canvas, gameplayManager = null) {
    ctx.save();
    if (video && video.videoWidth > 0) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

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

    // Face blurring for Gravity Denied gameplay
    if (gameplayManager && gameplayManager.gameStarted && gameplayManager.activeGame && gameplayManager.activeGame.id === 'GRAVITY' && lms && mapLM) {
        const nosePt = mapLM(lms[0]);
        let faceWidth = 0;
        
        if (lms[7] && lms[8] && lms[7].visibility > 0.3 && lms[8].visibility > 0.3) {
            const earL = mapLM(lms[7]);
            const earR = mapLM(lms[8]);
            const dx = earL.x - earR.x;
            const dy = earL.y - earR.y;
            faceWidth = Math.sqrt(dx * dx + dy * dy) * 1.1;
        } else if (lms[2] && lms[5] && lms[2].visibility > 0.3 && lms[5].visibility > 0.3) {
            const eyeL = mapLM(lms[2]);
            const eyeR = mapLM(lms[5]);
            const dx = eyeL.x - eyeR.x;
            const dy = eyeL.y - eyeR.y;
            faceWidth = Math.sqrt(dx * dx + dy * dy) * 2.2;
        }

        if (faceWidth > 20 && nosePt) {
            const cx = nosePt.x;
            const cy = nosePt.y;
            const r = (faceWidth / 2) * 1.5;

            if (r > 0) {
                // 1. Smooth Blur
                ctx.save();
                ctx.beginPath();
                ctx.arc(cx, cy, r, 0, 2 * Math.PI);
                ctx.clip();

                ctx.filter = 'blur(20px)';
                ctx.drawImage(canvas, 0, 0);
                ctx.restore();

                // // 2. Glowing neon circle boundary
                // ctx.save();
                // ctx.strokeStyle = '#ff0055';
                // ctx.lineWidth = 3;
                // ctx.shadowBlur = 15;
                // ctx.shadowColor = '#ff0055';
                // ctx.beginPath();
                // ctx.arc(cx, cy, r, 0, 2 * Math.PI);
                // ctx.stroke();
                // ctx.restore();
            }
        }
    }

    // 0. Draw Calibration Targets (if active)
    if (gameplayManager && gameplayManager.isCalibrating) {
        drawCalibration(ctx, gameplayManager);
    }

    // 1. Draw Play Area Boundary (if active)
    if (gameplayManager && (gameplayManager.gameStarted || gameplayManager.isCalibrating)) {
        drawPlayArea(ctx, sx, sy, minDim, '#ff0000', gameplayManager.isCalibrating);
    }

    // 2. Draw Active Game Elements
    if (gameplayManager && gameplayManager.gameStarted && gameplayManager.activeGame) {
        const handPoints = lms ? [
            getCenterOfMass(lms, [15, 17, 19, 21]), // Left
            getCenterOfMass(lms, [16, 18, 20, 22])  // Right
        ].filter(p => p !== null).map(p => mapLM(p)) : [];

        const shoulderPoints = lms ? [
            mapLM(lms[11]), // Left Shoulder
            mapLM(lms[12])  // Right Shoulder
        ] : [];

        gameplayManager.activeGame.draw(ctx, canvas, { minX: sx, maxX: sx + minDim, minY: sy, size: minDim }, handPoints, headPoint, shoulderPoints);
    }

    // 3. Draw Skeleton
    if (lms && mapLM) {
        const head = headPoint;
        const leftHandArr = getCenterOfMass(lms, [15, 17, 19, 21]);
        const rightHandArr = getCenterOfMass(lms, [16, 18, 20, 22]);
        const leftHand = leftHandArr ? mapLM(leftHandArr) : null;
        const rightHand = rightHandArr ? mapLM(rightHandArr) : null;

        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ff0000';

        if (gameplayManager && (gameplayManager.mode === 'BUBBLE' || gameplayManager.isCalibrating)) {
            ctx.shadowColor = '#ff0000';
            drawPoint(ctx, head, '#ff0000', 12, '#ff0000'); // Larger neon red head
        }

        // Draw hand points only if no basket/active container is being drawn
        const isBasketActive = gameplayManager && gameplayManager.activeGame && gameplayManager.activeGame.basket;
        const isGravityActive = gameplayManager && gameplayManager.activeGame && gameplayManager.activeGame.id === 'GRAVITY';
        if (!isBasketActive && !isGravityActive) {
            drawPoint(ctx, leftHand, '#ff0000', 10, '#ff0000'); // Neon red hands
            drawPoint(ctx, rightHand, '#ff0000', 10, '#ff0000');
        }
    }

    // 4. Floating Score Effects (TikTok/Stream style)
    if (gameplayManager && gameplayManager.getEffects()) {
        gameplayManager.getEffects().forEach(fx => {
            ctx.save();
            ctx.globalAlpha = fx.life;

            if (fx.type === 'penalty') {
                ctx.font = `900 ${fx.size}px Syncopate, sans-serif`;
                ctx.fillStyle = '#ff0055';
                ctx.shadowBlur = 10;
                ctx.shadowColor = '#ff0055';
            } else {
                ctx.font = `900 ${fx.size}px Outfit, sans-serif`;
                ctx.fillStyle = fx.type === 'pos' ? '#00ffcc' : '#ff9900';
                ctx.shadowBlur = 5;
                ctx.shadowColor = 'rgba(0,0,0,0.5)';
            }

            ctx.textAlign = 'center';

            ctx.translate(fx.x, fx.y);
            ctx.scale(-1, 1);
            ctx.fillText(fx.text, 0, 0);
            ctx.restore();
        });
    }

    ctx.restore();
}
