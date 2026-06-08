import { BaseGame } from './base.js';
import { audio } from '../audio.js';

export class GravityDeniedGame extends BaseGame {
    constructor() {
        super();
        this.id = 'GRAVITY';
        this.name = 'Gravity Denied';
        this.icon = '🏍️';
        this.music = 'gravity';
        this.rules = [
            'Keep shoulders parallel the terrain slope',
            'Keep matching to ride: <span class="pts pts-up">+10 PTS / 10m</span>',
            'Wrong angle = BRAKES motorcycle 🛑',
            'JUMP to cross road pits! <span class="pts pts-penalty">CRASH (-50 PTS)</span>'
        ];
        this.tutorial = {
            title: 'GRAVITY DENIED',
            gif: 'assets/gifs/gravity_denied/tutorial.png',
            instructions: [
                'Lean your shoulders parallel to the road slope',
                'Do a quick jump to cross road pits',
                'Keep matching posture to ride at max speed!'
            ]
        };
        this.statsKeys = [
            { key: 'distance', label: 'Distance Ridden (m)', type: 'pos' },
            { key: 'perfectTime', label: 'Perfect Leaning (s)', type: 'pos' },
            { key: 'crashes', label: 'Crashes', type: 'neg' },
            { key: 'jumps', label: 'Successful Jumps', type: 'pos' }
        ];

        // Constants
        this.bikeMaxSpeed = 240; // pixels/s
        this.bikeAccel = 150;
        this.bikeBrake = 300;
        this.gravity = 900; // pixels/s^2 for jump
        this.jumpPower = -420; // initial vertical speed

        // State
        this.segments = [];
        this.bikeX = 0;
        this.bikeY = 0;
        this.bikeSpeed = 0;
        this.cameraX = 0;
        this.yOffset = 0;
        this.yVelocity = 0;
        this.isGrounded = true;
        this.crashTimer = 0;
        this.graceTimer = 0;

        // Metrics
        this.distanceAccumulator = 0;
        this.perfectLeanTimer = 0;
        this.wheelRotation = 0;

        // Jump detection
        this.headYHistory = [];
        this.headYBaseline = null;
        this.jumpCooldown = 0;

        // Target angle & current angle display
        this.targetAngle = 0;
        this.currentAngle = 0;

        // Extra internals
        this.scoreAccumulator = 0;
        this.lastAwardedDistance = 0;
        this.lastSegmentType = undefined;
        this.lastSegmentAngle = undefined;
    }

    init(playArea) {
        super.init(playArea);
        this.segments = [];
        this.bikeX = 150;
        this.bikeSpeed = 0;
        this.cameraX = 0;
        this.yOffset = 0;
        this.yVelocity = 0;
        this.isGrounded = true;
        this.crashTimer = 0;
        this.graceTimer = 0;
        this.distanceAccumulator = 0;
        this.perfectLeanTimer = 0;
        this.wheelRotation = 0;
        this.headYHistory = [];
        this.headYBaseline = null;
        this.jumpCooldown = 0;
        this.targetAngle = 0;
        this.currentAngle = 0;
        this.scoreAccumulator = 0;
        this.lastAwardedDistance = 0;
        this.lastSegmentType = undefined;
        this.lastSegmentAngle = undefined;

        this.stats = {
            distance: 0,
            perfectTime: 0,
            crashes: 0,
            jumps: 0
        };

        // Initialize first segment as a long flat road
        const startY = playArea.minY + playArea.size * 0.65;
        this.segments.push({
            startX: 0,
            startY: startY,
            endX: 600,
            endY: startY,
            angle: 0,
            type: 'flat',
            isCleared: false
        });
        
        this.bikeY = startY;
        this.extendTerrain(playArea);
    }

    reset() {
        super.reset();
        this.segments = [];
    }

    // Generate random segment based on last segment
    extendTerrain(playArea) {
        const minSegs = 6;
        // Safe vertical bounds: road must stay within 30%-85% of play area
        const minY = playArea.minY + playArea.size * 0.30;
        const maxY = playArea.minY + playArea.size * 0.85;

        while (this.segments.length < minSegs) {
            const last = this.segments[this.segments.length - 1];
            const startX = last.endX;
            const startY = last.endY;

            // Choose segment type
            let type;
            let angle = 0;
            let length = (Math.random() * 120 + 180); // horizontal width

            // Constraints: at least 3 segments between pits
            let canBePit = true;
            for (let i = 1; i <= 3; i++) {
                const idx = this.segments.length - i;
                if (idx >= 0 && this.segments[idx].type === 'pit') {
                    canBePit = false;
                    break;
                }
            }
            const heightFactor = (startY - playArea.minY) / playArea.size; // 0 (top) to 1 (bottom)

            const choices = ['flat', 'climb', 'descent'];
            if (canBePit) {
                choices.push('pit');
            }

            const chosen = choices[Math.floor(Math.random() * choices.length)];

            if (chosen === 'flat') {
                type = 'flat';
                angle = 0;
                length = (Math.random() * 120 + 200);
            } else if (chosen === 'climb') {
                // If already too high, force descent or flat
                if (heightFactor < 0.40) {
                    type = 'gentle_descent';
                    angle = -15;
                } else {
                    const steep = Math.random() > 0.5;
                    type = steep ? 'steep_climb' : 'gentle_climb';
                    angle = steep ? 25 : 15;
                }
            } else if (chosen === 'descent') {
                // If already too low, force climb or flat
                if (heightFactor > 0.80) {
                    type = 'gentle_climb';
                    angle = 15;
                } else {
                    const steep = Math.random() > 0.5;
                    type = steep ? 'steep_descent' : 'gentle_descent';
                    angle = steep ? -25 : -15;
                }
            } else {
                // Pit
                type = 'pit';
                angle = 0;
                length = 100; // standard pit gap width
            }

            const rad = angle * Math.PI / 180;
            const endX = startX + length;
            let endY = type === 'pit' ? startY : startY - length * Math.tan(rad);

            // Clamp endY to safe bounds
            if (type !== 'pit') {
                endY = Math.max(minY, Math.min(maxY, endY));
                // Recalculate actual angle from clamped endY
                const dy = startY - endY;
                const actualRad = Math.atan2(dy, length);
                angle = Math.round(actualRad * 180 / Math.PI);
                if (Math.abs(angle) < 3) {
                    angle = 0;
                    type = 'flat';
                }
            }

            this.segments.push({
                startX,
                startY,
                endX,
                endY,
                angle,
                type,
                isCleared: false
            });
        }
    }

    // Get ground Y coordinate and current segment info at world X
    getTerrainAt(worldX) {
        for (let i = 0; i < this.segments.length; i++) {
            const seg = this.segments[i];
            if (worldX >= seg.startX && worldX <= seg.endX) {
                if (seg.type === 'pit') {
                    // Return the gap y level, but tell the caller it's a pit
                    return { y: seg.startY, angle: 0, type: 'pit', segment: seg };
                }
                const ratio = (worldX - seg.startX) / (seg.endX - seg.startX);
                const y = seg.startY + ratio * (seg.endY - seg.startY);
                return { y, angle: seg.angle, type: seg.type, segment: seg };
            }
        }
        // Fallback to last segment end
        const last = this.segments[this.segments.length - 1];
        return { y: last.endY, angle: last.angle, type: last.type, segment: last };
    }

    update(dt, handPoints, headPoint, playArea, difficultyPhase, addEffect, shoulderPoints = []) {
        if (this.crashTimer > 0) {
            this.crashTimer -= dt;
            this.bikeSpeed = 0;
            
            // Keep camera centered on the bike and extend/clean terrain
            this.cameraX = this.bikeX - playArea.size * 0.25;
            this.extendTerrain(playArea);
            this.segments = this.segments.filter(s => s.endX > this.cameraX - 100);
            
            return;
        }

        // 1. Process Shoulder Lean Angle
        if (shoulderPoints && shoulderPoints.length === 2) {
            const L = shoulderPoints[0];
            const R = shoulderPoints[1];
            const dx = L.x - R.x;
            const dy = L.y - R.y;
            const rad = Math.atan2(dy, dx);
            this.currentAngle = -(rad * 180 / Math.PI);
        } else {
            // No shoulder input, default to upright
            this.currentAngle = 0;
        }

        // 2. Track terrain at bike position
        const terrain = this.getTerrainAt(this.bikeX);
        this.targetAngle = terrain.angle;

        // Detect segment transitions to trigger grace period
        if (this.lastSegmentType !== terrain.type || this.lastSegmentAngle !== terrain.angle) {
            if (this.lastSegmentType !== undefined) {
                this.graceTimer = 1.3; // 1.3 seconds to adjust
            }
            this.lastSegmentType = terrain.type;
            this.lastSegmentAngle = terrain.angle;
        }

        if (this.graceTimer > 0) {
            this.graceTimer -= dt;
        }

        // 3. Jump Detection (relative head height)
        // Only detect jumps when the player is roughly upright (not leaning hard)
        if (headPoint) {
            this.headYHistory.push(headPoint.y);
            if (this.headYHistory.length > 60) { // Keep last ~1s at 60fps
                this.headYHistory.shift();
            }

            if (this.jumpCooldown > 0) {
                this.jumpCooldown -= dt;
            }

            // Only update baseline when player is mostly upright (not leaning)
            // This prevents leaning from shifting the baseline and causing false jumps
            if (Math.abs(this.currentAngle) < 10 && this.headYHistory.length > 10) {
                // Use the BOTTOM portion of recent history as baseline (higher Y = lower on screen)
                const sorted = [...this.headYHistory].sort((a, b) => b - a); // descending (highest Y first)
                // Take the median of the bottom 60% as the stable resting position
                const bottomHalf = sorted.slice(0, Math.floor(sorted.length * 0.6));
                this.headYBaseline = bottomHalf.reduce((a, b) => a + b, 0) / bottomHalf.length;
            }

            // Jump condition: head must move UP significantly AND quickly
            // - threshold: 55px above baseline (much less sensitive)
            // - cooldown: 1.5s between jumps
            // - require at least 2 recent frames showing upward motion
            if (this.headYBaseline !== null && this.jumpCooldown <= 0 && this.isGrounded) {
                const threshold = 55;
                const isAboveThreshold = headPoint.y < this.headYBaseline - threshold;

                // Check that head is actually moving upward (not just tilted)
                const recentFrames = this.headYHistory.slice(-5);
                let movingUp = false;
                if (recentFrames.length >= 4) {
                    // Head Y should be decreasing (going up) over last few frames
                    const oldY = recentFrames[0];
                    const newY = recentFrames[recentFrames.length - 1];
                    movingUp = (oldY - newY) > 20; // at least 20px upward motion in recent frames
                }

                if (isAboveThreshold && movingUp) {
                    // Trigger Jump!
                    this.yVelocity = this.jumpPower;
                    this.isGrounded = false;
                    this.jumpCooldown = 1.5; // longer cooldown to prevent spam
                    this.stats.jumps++;
                    addEffect('JUMP! ✈️', 'pos');
                    audio.play('pop', 0.8);
                }
            }
        }

        // 4. Update Jumping/Airborne Physics
        if (!this.isGrounded) {
            this.yOffset += this.yVelocity * dt;
            this.yVelocity += this.gravity * dt;

            // Check landing
            const groundY = terrain.y;

            // If bike Y goes below ground Y (remembere Y is down!)
            if (this.yOffset >= 0) {
                // Landing!
                if (terrain.type === 'pit') {
                    // Crash into pit!
                    this.triggerCrash(addEffect);
                } else {
                    // Safe landing
                    this.yOffset = 0;
                    this.yVelocity = 0;
                    this.isGrounded = true;
                    this.graceTimer = 0.8; // landing grace
                    audio.play('pop', 0.5);
                }
            }
        } else {
            // Grounded: check if we roll into a pit
            if (terrain.type === 'pit') {
                // If we walk/drive directly into a pit without jumping, crash!
                this.triggerCrash(addEffect);
            }
        }

        // 5. Evaluate Posture and Update Speed
        let isCorrect = false;
        if (terrain.type === 'pit') {
            // In a pit (airborne), we don't care about angle, just focus on crossing it
            isCorrect = true;
        } else {
            // Tolerance is ~12 degrees
            const tolerance = 12;
            const diff = Math.abs(this.currentAngle - this.targetAngle);
            isCorrect = diff < tolerance;
        }

        // Adjust speed based on posture match or grace period
        if (isCorrect || this.graceTimer > 0) {
            let accelMultiplier = 1;
            if (difficultyPhase === 1) accelMultiplier = 1.25;
            if (difficultyPhase === 2) accelMultiplier = 1.5;
            
            this.bikeSpeed = Math.min(this.bikeMaxSpeed * accelMultiplier, this.bikeSpeed + this.bikeAccel * dt);

            // Accumulate perfect leaning stats (only when on a slope, and matching perfectly without grace)
            if (Math.abs(this.targetAngle) > 10 && isCorrect && this.graceTimer <= 0) {
                this.perfectLeanTimer += dt;
                this.stats.perfectTime = Math.round(this.perfectLeanTimer);
                
                // Reward points for maintaining pose on slope
                this.scoreAccumulator = (this.scoreAccumulator || 0) + dt;
                if (this.scoreAccumulator >= 1.0) {
                    this.score += 5;
                    addEffect('+5 XP', 'pos');
                    this.scoreAccumulator -= 1.0;
                }
            }
        } else {
            // Incorrect posture: brake!
            this.bikeSpeed = Math.max(0, this.bikeSpeed - this.bikeBrake * dt);
        }

        // Move bike forward
        if (this.crashTimer <= 0) {
            this.bikeX += this.bikeSpeed * dt;
            this.wheelRotation += (this.bikeSpeed / 15) * dt;

            // Accumulate distance (100 pixels = 1 meter)
            const metersMoved = (this.bikeSpeed * dt) / 100;
            this.distanceAccumulator += metersMoved;
            this.stats.distance = Math.round(this.distanceAccumulator);

            // Award score for every 10 meters ridden
            this.lastAwardedDistance = this.lastAwardedDistance || 0;
            if (this.stats.distance - this.lastAwardedDistance >= 10) {
                this.score += 10;
                addEffect('+10 METERS', 'pos');
                this.lastAwardedDistance = this.stats.distance;
                audio.play('pop', 0.4);
            }
        }

        // Keep camera centered on the bike (fixed horizontal offset)
        this.cameraX = this.bikeX - playArea.size * 0.25;

        // Extend and clean terrain
        this.extendTerrain(playArea);
        this.segments = this.segments.filter(s => s.endX > this.cameraX - 100);
    }

    triggerCrash(addEffect) {
        this.crashTimer = 1.5; // immobilize for 1.5s
        this.bikeSpeed = 0;
        this.stats.crashes++;
        this.score = Math.max(0, this.score - 50);
        addEffect('-50 CRASH', 'penalty');
        audio.play('bikeCrash', 1.0);

        // Find the pit segment we crashed in
        const terrain = this.getTerrainAt(this.bikeX);
        if (terrain && terrain.segment && terrain.type === 'pit') {
            // Place bike after the pit
            this.bikeX = terrain.segment.endX + 20;
        }
        this.yOffset = 0;
        this.yVelocity = 0;
        this.isGrounded = true;
        this.graceTimer = 1.5;
    }

    draw(ctx, canvas, playArea, handPoints, headPoint, shoulderPoints = []) {
        const sx = playArea.minX;
        const sy = playArea.minY;
        const minDim = playArea.size;

        // Render World coordinates mapped to Screen space
        const toScreenX = (worldX) => sx + (worldX - this.cameraX);
        const toScreenY = (worldY) => worldY; // Vertical coordinates are absolute in screen space

        // 1. Draw Hills / Terrain
        ctx.save();
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#00f2ff';

        this.segments.forEach(seg => {
            const x1 = toScreenX(seg.startX);
            const x2 = toScreenX(seg.endX);
            const y1 = toScreenY(seg.startY);
            const y2 = toScreenY(seg.endY);

            // Don't draw offscreen segments
            if (x2 < sx || x1 > sx + minDim) return;

            if (seg.type === 'pit') {
                // Draw pit background gap
                ctx.save();
                ctx.strokeStyle = 'rgba(255, 0, 85, 0.4)';
                ctx.lineWidth = 4;
                ctx.setLineDash([6, 6]);
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();

                // Draw pit neon alert block under the road
                ctx.fillStyle = 'rgba(255, 0, 85, 0.08)';
                ctx.fillRect(x1, y1, x2 - x1, sy + minDim - y1);
                ctx.restore();
            } else {
                // Draw solid neon road line
                ctx.strokeStyle = '#00f2ff';
                ctx.lineWidth = 6;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();

                // Draw subtle grid/lines below the ground
                ctx.save();
                ctx.strokeStyle = 'rgba(0, 242, 255, 0.06)';
                ctx.lineWidth = 1;
                for (let x = Math.ceil(x1/30)*30; x < x2; x += 30) {
                    const ratio = (x - x1) / (x2 - x1);
                    const y = y1 + ratio * (y2 - y1);
                    ctx.beginPath();
                    ctx.moveTo(x, y);
                    ctx.lineTo(x, sy + minDim);
                    ctx.stroke();
                }
                ctx.restore();
            }
        });
        ctx.restore();

        // 2. Draw Motorcycle and Rider
        ctx.save();
        const bikeScreenX = toScreenX(this.bikeX);
        const terrain = this.getTerrainAt(this.bikeX);
        const bikeScreenY = toScreenY(terrain.y) + this.yOffset;

        // Rotate the bike based on the terrain angle (when grounded) or vertical speed (when airborne)
        let bikeAngle = terrain.angle;
        if (!this.isGrounded) {
            // Tilt slightly forward/backward depending on vertical speed
            bikeAngle = terrain.angle + (this.yVelocity / 15);
        }
        const bikeAngleRad = bikeAngle * Math.PI / 180;

        ctx.translate(bikeScreenX, bikeScreenY);
        ctx.rotate(-bikeAngleRad); // minus because canvas rotation direction is opposite

        // Drawing parameters
        const wheelRad = 16;
        const bikeLen = 32;

        // Crash effect: flicker/red bike if crashed
        if (this.crashTimer > 0) {
            if (Math.floor(Date.now() / 100) % 2 === 0) {
                ctx.shadowColor = '#ff0055';
                ctx.strokeStyle = '#ff0055';
            } else {
                ctx.shadowColor = 'transparent';
                ctx.strokeStyle = 'rgba(255,255,255,0.1)';
            }
        } else {
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#ffff00';
            ctx.strokeStyle = '#ffff00'; // Neon yellow frame
        }

        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Draw wheels
        const drawWheel = (wheelX, wheelY) => {
            ctx.save();
            ctx.translate(wheelX, wheelY);
            ctx.rotate(this.wheelRotation);
            // Tire
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.arc(0, 0, wheelRad, 0, Math.PI * 2);
            ctx.stroke();
            // Inner rim (neon glowing)
            ctx.strokeStyle = ctx.shadowColor;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, wheelRad - 4, 0, Math.PI * 2);
            ctx.stroke();
            // Spokes
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(-wheelRad, 0); ctx.lineTo(wheelRad, 0);
            ctx.moveTo(0, -wheelRad); ctx.lineTo(0, wheelRad);
            ctx.stroke();
            ctx.restore();
        };

        drawWheel(-bikeLen, 0); // Back wheel
        drawWheel(bikeLen, 0);  // Front wheel

        // Chassis frame
        ctx.beginPath();
        ctx.moveTo(-bikeLen, 0);
        ctx.lineTo(-12, -14); // Swingarm to engine
        ctx.lineTo(12, -14);  // Frame main body
        ctx.lineTo(bikeLen, 0);   // Front fork bottom
        ctx.lineTo(20, -22);  // Handlebars stem
        ctx.lineTo(10, -22);  // Handles
        ctx.moveTo(12, -14);
        ctx.lineTo(-2, -26);  // Seat support
        ctx.lineTo(-20, -26); // Seat tail
        ctx.lineTo(-bikeLen, 0);
        ctx.stroke();

        // Draw engine block (gray polygon)
        ctx.fillStyle = 'rgba(150, 150, 150, 0.4)';
        ctx.beginPath();
        ctx.moveTo(-10, -8);
        ctx.lineTo(10, -8);
        ctx.lineTo(6, -14);
        ctx.lineTo(-6, -14);
        ctx.closePath();
        ctx.fill();

        // Exhaust exhaust smoke when riding
        if (this.bikeSpeed > 20 && this.crashTimer <= 0) {
            ctx.save();
            ctx.strokeStyle = 'rgba(255, 255, 0, 0.3)';
            ctx.lineWidth = 2;
            const smokeX = -bikeLen - 10 - (Math.random() * 10);
            const smokeY = -5 - (Math.random() * 8);
            ctx.beginPath();
            ctx.arc(smokeX, smokeY, Math.random() * 4 + 2, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        // Draw Rider (Stick figure leaning!)
        ctx.save();
        ctx.translate(-5, -26); // Translate to seat position
        
        // Tilt the rider relative to the bike
        const riderTiltRad = -(this.currentAngle * Math.PI / 180) + bikeAngleRad;
        ctx.rotate(riderTiltRad);

        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3.5;

        // Legs
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(10, 14); // Knee to peg
        ctx.stroke();

        // Torso
        ctx.beginPath();
        ctx.moveTo(0, 0);
        const torsoY = -24;
        ctx.lineTo(2, torsoY);
        ctx.stroke();

        // Head (helmet)
        ctx.fillStyle = '#ff00ff';
        ctx.beginPath();
        ctx.arc(2, torsoY - 8, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Arms
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(2, torsoY + 4);
        ctx.lineTo(15, torsoY + 12);
        ctx.stroke();

        ctx.restore(); // end rider
        ctx.restore(); // end bike

        // 3. Draw Leaning HUD Dial (Dashboard)
        ctx.save();
        const dialX = sx + minDim - 100;
        const dialY = sy + 90;
        ctx.translate(dialX, dialY);
        ctx.scale(-1, 1); // Unmirror to read labels correctly

        // Dial border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, 50, Math.PI, 2 * Math.PI); // Half arc
        ctx.stroke();

        // Draw Slope Marks
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        for (let a = -40; a <= 40; a += 20) {
            const rad = (a - 90) * Math.PI / 180;
            ctx.beginPath();
            ctx.moveTo(Math.cos(rad) * 44, Math.sin(rad) * 44);
            ctx.lineTo(Math.cos(rad) * 50, Math.sin(rad) * 50);
            ctx.stroke();
        }

        // Target angle indicator (neon red line)
        ctx.save();
        const targetRad = (-this.targetAngle - 90) * Math.PI / 180;
        ctx.strokeStyle = '#ff0055';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(targetRad) * 45, Math.sin(targetRad) * 45);
        ctx.stroke();
        ctx.restore();

        // Current shoulder angle indicator (neon cyan/green)
        ctx.save();
        const currentRad = (-this.currentAngle - 90) * Math.PI / 180;
        const isMatched = Math.abs(this.currentAngle - this.targetAngle) < 12;
        ctx.strokeStyle = isMatched ? '#00ffcc' : '#ff9900';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(currentRad) * 40, Math.sin(currentRad) * 40);
        ctx.stroke();
        ctx.restore();

        // Dashboard text label
        ctx.save();
        ctx.textAlign = 'center';
        
        // Current angle (YOU)
        ctx.font = '900 11px Outfit, sans-serif';
        const userColor = isMatched ? '#00ffcc' : '#ff9900';
        ctx.fillStyle = userColor;
        ctx.fillText(`YOU (SHOULDERS): ${Math.round(this.currentAngle)}°`, 0, 18);
        
        // Target angle (ROAD)
        ctx.font = '900 11px Outfit, sans-serif';
        ctx.fillStyle = '#ff0055';
        ctx.fillText(`ROAD (SLOPE): ${Math.round(this.targetAngle)}°`, 0, 32);
        
        ctx.restore();

        ctx.restore();

        // 4. Draw Alerts and Speedometer HUD (Center top)
        ctx.save();
        ctx.translate(sx + minDim / 2, sy + 75);
        ctx.scale(-1, 1); // Unmirror text
        ctx.textAlign = 'center';

        // Speedometer
        const speedKmh = Math.round(this.bikeSpeed / 4);
        ctx.font = '900 36px Outfit, sans-serif';
        ctx.fillStyle = '#fff';
        ctx.fillText(`${speedKmh} KM/H`, 0, 0);

        ctx.font = '900 12px Syncopate, sans-serif';
        ctx.fillStyle = '#00f2ff';
        ctx.fillText(`${this.stats.distance} METERS`, 0, 20);

        // Warning alerts
        ctx.font = '900 16px Syncopate, sans-serif';
        const isTransitioning = this.graceTimer > 0;

        if (this.crashTimer > 0) {
            ctx.fillStyle = '#ff0055';
            ctx.fillText('💥 CRASHED! 💥', 0, -35);
        } else if (terrain.type === 'pit') {
            const warningPulse = (Math.sin(Date.now() / 150) + 1) / 2;
            ctx.fillStyle = `rgba(255, 0, 85, ${0.5 + warningPulse * 0.5})`;
            ctx.fillText('⚠️ PIT AHEAD! JUMP! ⚠️', 0, -35);
        } else if (!isMatched) {
            if (isTransitioning) {
                ctx.fillStyle = '#ffff00';
                ctx.fillText('ADJUST LEAN!', 0, -35);
            } else {
                ctx.fillStyle = '#ff5500';
                ctx.fillText('🛑 ALIGN POSTURE! 🛑', 0, -35);
            }
        } else {
            if (Math.abs(this.targetAngle) > 10) {
                ctx.fillStyle = '#00ffcc';
                ctx.fillText('✨ PERFECT LEAN ✨', 0, -35);
            } else {
                ctx.fillStyle = 'rgba(255,255,255,0.4)';
                ctx.fillText('RIDING FLAT', 0, -35);
            }
        }

        ctx.restore();

        // 5. Draw Silhouette guidelines (Shoulders skeleton overlay on user body)
        if (shoulderPoints && shoulderPoints.length === 2) {
            ctx.save();
            const [L, R] = shoulderPoints;

            // Bright, thick shoulder line with strong glow
            const matchColor = isMatched ? '#00ff88' : '#ff0044';
            const matchGlow = isMatched ? '#00ff88' : '#ff0044';

            // Outer glow layer
            ctx.shadowBlur = 25;
            ctx.shadowColor = matchGlow;
            ctx.strokeStyle = matchColor;
            ctx.lineWidth = 10;
            ctx.lineCap = 'round';
            ctx.globalAlpha = 0.4;
            ctx.beginPath();
            ctx.moveTo(L.x, L.y);
            ctx.lineTo(R.x, R.y);
            ctx.stroke();

            // Inner bright line
            ctx.globalAlpha = 0.9;
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo(L.x, L.y);
            ctx.lineTo(R.x, R.y);
            ctx.stroke();

            // Draw joint dots
            ctx.globalAlpha = 1;
            ctx.fillStyle = matchColor;
            ctx.beginPath(); ctx.arc(L.x, L.y, 10, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(R.x, R.y, 10, 0, Math.PI*2); ctx.fill();

            // White inner dot on each joint
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(L.x, L.y, 4, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(R.x, R.y, 4, 0, Math.PI*2); ctx.fill();

            // Status label on the shoulder line
            ctx.save();
            const midX = (L.x + R.x) / 2;
            const midY = (L.y + R.y) / 2;
            ctx.translate(midX, midY - 25);
            ctx.scale(-1, 1); // unmirror text
            ctx.font = '900 14px Syncopate, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = matchColor;
            ctx.shadowBlur = 15;
            ctx.shadowColor = matchGlow;
            ctx.fillText(isMatched ? '✓ ALIGNED' : '✗ ADJUST', 0, 0);
            ctx.restore();

            // Draw head guidance if head is present
            if (headPoint) {
                // Jump threshold line
                if (this.headYBaseline !== null) {
                    const jumpTargetY = this.headYBaseline - 55;
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
                    ctx.setLineDash([5, 5]);
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(sx, jumpTargetY);
                    ctx.lineTo(sx + minDim, jumpTargetY);
                    ctx.stroke();

                    // Label
                    ctx.save();
                    ctx.translate(sx + 50, jumpTargetY - 8);
                    ctx.scale(-1, 1);
                    ctx.font = '900 8px Syncopate, sans-serif';
                    ctx.fillStyle = 'rgba(255,255,255,0.25)';
                    ctx.fillText('JUMP LINE', 0, 0);
                    ctx.restore();
                }

                // Draw Head Dot
                ctx.shadowBlur = 10;
                ctx.shadowColor = '#00f2ff';
                ctx.fillStyle = '#00f2ff';
                ctx.beginPath();
                ctx.arc(headPoint.x, headPoint.y, 10, 0, Math.PI*2);
                ctx.fill();
            }
            ctx.restore();
        }
    }
}
