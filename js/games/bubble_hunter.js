import { BaseGame } from './base.js';
import { audio } from '../audio.js';

class Bubble {
    constructor(minX, maxX, minY) {
        this.radius = Math.random() * 20 + 20; // 20-40px
        this.x = Math.random() * (maxX - minX - this.radius * 2) + minX + this.radius;
        this.y = (minY !== undefined) ? minY - this.radius : -this.radius;
        this.speed = Math.random() * 120 + 60;
        this.color = `hsl(${Math.random() * 360}, 70%, 60%)`;
        this.isPopped = false;
        this.isMissed = false;
        this.popTimer = 0;
    }

    update(dt) {
        if (!this.isPopped) {
            this.y += this.speed * dt;
        } else {
            this.popTimer += dt * 60;
        }
    }

    checkCollision(point, handRadius = 0) {
        if (!point || this.isPopped) return false;
        const dx = this.x - point.x;
        const dy = this.y - point.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < (this.radius + handRadius)) {
            this.isPopped = true;
            return true;
        }
        return false;
    }
}

class Laser {
    constructor(minX, maxX, spawnY) {
        this.minX = minX;
        this.maxX = maxX;
        this.y = spawnY;
        this.direction = Math.random() > 0.5 ? 1 : -1;

        if (this.direction === 1) {
            this.x = minX - 250;
        } else {
            this.x = maxX + 50;
        }

        this.speed = (maxX - minX) * 0.35 * this.direction;
        this.active = true;
        this.width = 200;
    }

    update(dt) {
        this.x += this.speed * dt;
        if (this.direction === 1 && this.x > this.maxX) {
            this.active = false;
        } else if (this.direction === -1 && this.x + this.width < this.minX) {
            this.active = false;
        }
    }

    checkCollision(headPoint) {
        if (!headPoint || !this.active) return false;
        if (this.x < headPoint.x && (this.x + this.width) > headPoint.x) {
            if (headPoint.y < this.y) {
                return true;
            }
        }
        return false;
    }
}

export class BubbleHunterGame extends BaseGame {
    constructor() {
        super();
        this.id = 'BUBBLE';
        this.name = 'Bubble Hunter';
        this.icon = '🧼';
        this.music = 'bubble';
        this.rules = [
            'Pop bubbles with your hands: <span class="pts pts-up">+10 PTS</span>',
            'Don\'t let them fly away: <span class="pts pts-down">-10 PTS</span>',
            'DUCK! Keep head below laser: <span class="pts pts-penalty">-50 PTS</span>'
        ];
        this.tutorial = {
            title: 'BUBBLE HUNTER',
            gif: 'assets/gifs/bubble_hunter/tutorial.gif',
            instructions: [
                'Pop bubbles with your <strong>hands</strong>',
                'Avoid the red <strong>laser</strong> (DUCK!)',
                'Don\'t let bubbles escape!'
            ]
        };
        this.statsKeys = [
            { key: 'popped', label: 'Bubbles Popped', type: 'pos' },
            { key: 'missed', label: 'Bubbles Missed', type: 'neg' },
            { key: 'lasersAvoided', label: 'Lasers Avoided', type: 'pos' },
            { key: 'lasersHit', label: 'Lasers Hit', type: 'neg' }
        ];

        this.bubbles = [];
        this.laser = null;
        this.lastSpawnTime = 0;
        this.spawnInterval = 1500;
        this.lastLaserTime = 0;
        this.laserInterval = 8000;
        this.isPenaltyActive = false;
        this.penaltyTimer = 0;
    }

    init(playArea) {
        super.init(playArea);
        this.bubbles = [];
        this.laser = null;
        this.lastSpawnTime = performance.now();
        this.lastLaserTime = performance.now();
        this.isPenaltyActive = false;
        this.penaltyTimer = 0;
        this.spawnInterval = 450;

        this.stats = {
            popped: 0,
            missed: 0,
            lasersAvoided: 0,
            lasersHit: 0
        };
    }

    reset() {
        super.reset();
        this.bubbles = [];
        this.laser = null;
        this.isPenaltyActive = false;
        this.penaltyTimer = 0;
    }

    update(dt, handPoints, headPoint, playArea, difficultyPhase, addEffect) {
        const now = performance.now();

        // 1. Spawning bubbles
        let currentSpawnInterval = this.spawnInterval;
        if (difficultyPhase === 1) currentSpawnInterval *= 0.6;
        if (difficultyPhase === 2) currentSpawnInterval *= 0.4;

        if (now - this.lastSpawnTime > currentSpawnInterval) {
            const b = new Bubble(playArea.minX, playArea.maxX, playArea.minY);
            if (difficultyPhase === 1) b.speed *= 1.4;
            if (difficultyPhase === 2) b.speed *= 1.8;
            this.bubbles.push(b);
            this.lastSpawnTime = now;
        }

        // 2. Update Bubbles and check collisions
        this.bubbles.forEach(bubble => {
            bubble.update(dt);
            handPoints.forEach(point => {
                if (bubble.checkCollision(point, 40)) {
                    this.score += 10;
                    this.stats.popped++;
                    addEffect('+10', 'pos');
                    audio.play('pop', 0.6);
                }
            });
        });

        // Remove off-screen/popped
        const maxY = playArea.minY + playArea.size;
        this.bubbles.forEach(b => {
            if (!b.isPopped && !b.isMissed && b.y > maxY) {
                this.score = Math.max(0, this.score - 10);
                this.stats.missed++;
                addEffect('-10', 'neg');
                b.isMissed = true;
            }
        });
        this.bubbles = this.bubbles.filter(b => b.y < maxY + b.radius && (!b.isPopped || b.popTimer < 10));

        // 3. Spawning Laser
        if (!this.laser && (now - this.lastLaserTime > this.laserInterval)) {
            let spawnY = playArea.minY + playArea.size * 0.5;
            if (headPoint) {
                spawnY = headPoint.y + (playArea.size * 0.1);
                const maxAllowedY = playArea.minY + playArea.size - 50;
                if (spawnY > maxAllowedY) spawnY = maxAllowedY;
            }
            this.laser = new Laser(playArea.minX, playArea.maxX, spawnY);
            this.lastLaserTime = now;
        }

        // 4. Update Laser and check collisions
        if (this.laser) {
            this.laser.update(dt);
            if (headPoint && this.laser.checkCollision(headPoint)) {
                if (!this.isPenaltyActive) {
                    this.score = Math.max(0, this.score - 50);
                    this.stats.lasersHit++;
                    addEffect('-50', 'penalty');
                    audio.play('laserFail', 0.8);
                }
                this.isPenaltyActive = true;
                this.penaltyTimer = 0.3;
            }
            if (!this.laser.active) {
                if (!this.isPenaltyActive) this.stats.lasersAvoided++;
                this.laser = null;
            }
        }

        if (this.penaltyTimer > 0) {
            this.penaltyTimer -= dt;
            if (this.penaltyTimer <= 0) this.isPenaltyActive = false;
        }
    }

    draw(ctx, canvas, playArea, handPoints, headPoint) {
        const sx = playArea.minX;
        const sy = playArea.minY;
        const minDim = playArea.size;

        // 1. Draw Laser
        if (this.laser) {
            const laser = this.laser;
            ctx.save();

            const time = Date.now();
            const pulseAlpha = 0.7 + Math.sin(time / 200) * 0.3;
            const warningPulse = (Math.sin(time / 150) + 1) / 2;

            // Alarm Tint & Border
            ctx.fillStyle = `rgba(255, 0, 0, ${0.07 * warningPulse})`;
            ctx.fillRect(sx, sy, minDim, minDim);

            ctx.strokeStyle = `rgba(255, 0, 0, ${0.12 * warningPulse})`;
            ctx.lineWidth = 14;
            ctx.strokeRect(sx, sy, minDim, minDim);
            ctx.strokeStyle = `rgba(255, 0, 0, ${0.25 * warningPulse})`;
            ctx.lineWidth = 4;
            ctx.strokeRect(sx, sy, minDim, minDim);

            // Neon Dotted Guide Line
            ctx.strokeStyle = `rgba(255, 0, 0, ${0.15 + warningPulse * 0.2})`;
            ctx.lineWidth = 2;
            ctx.setLineDash([8, 6]);
            ctx.beginPath();
            ctx.moveTo(sx, laser.y);
            ctx.lineTo(sx + minDim, laser.y);
            ctx.stroke();

            // Flashing duck tag
            ctx.fillStyle = `rgba(0, 0, 0, ${0.45 * warningPulse})`;
            ctx.fillRect(sx, sy + minDim * 0.08, minDim, 50);

            ctx.font = '900 20px Syncopate, sans-serif';
            ctx.fillStyle = `rgba(255, 0, 0, ${0.5 + warningPulse * 0.5})`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.save();
            ctx.translate(sx + minDim / 2, sy + minDim * 0.08 + 25);
            ctx.scale(-1, 1);
            ctx.fillText('⚠️ LASER WARNING ⚠️', 0, 0);
            ctx.restore();

            // Duck tags at laser sides
            ctx.font = '900 12px Syncopate, sans-serif';
            ctx.fillStyle = `rgba(255, 0, 0, ${0.4 + warningPulse * 0.6})`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            [sx + 50, sx + minDim - 50].forEach(x => {
                ctx.save();
                ctx.translate(x, laser.y);
                ctx.scale(-1, 1);
                ctx.fillText('⚠️ DUCK!', 0, 0);
                ctx.restore();
            });

            // The Laser Beam itself
            const glowHeight = 100;
            const outerGrad = ctx.createLinearGradient(laser.x, laser.y - glowHeight / 2, laser.x, laser.y + glowHeight / 2);
            outerGrad.addColorStop(0, 'rgba(255, 0, 0, 0)');
            outerGrad.addColorStop(0.5, `rgba(255, 0, 0, ${0.3 * pulseAlpha})`);
            outerGrad.addColorStop(1, 'rgba(255, 0, 0, 0)');
            ctx.fillStyle = outerGrad;
            ctx.fillRect(laser.x, laser.y - glowHeight / 2, laser.width, glowHeight);

            const beamGrad = ctx.createLinearGradient(laser.x, laser.y - 6, laser.x, laser.y + 6);
            beamGrad.addColorStop(0, 'rgba(255, 50, 0, 0.4)');
            beamGrad.addColorStop(0.5, `rgba(255, 0, 0, ${0.9 * pulseAlpha})`);
            beamGrad.addColorStop(1, 'rgba(255, 50, 0, 0.4)');
            ctx.fillStyle = beamGrad;
            ctx.fillRect(laser.x, laser.y - 6, laser.width, 12);

            ctx.fillStyle = `rgba(255, 255, 255, ${0.95 * pulseAlpha})`;
            ctx.fillRect(laser.x + 10, laser.y - 1, laser.width - 20, 2);

            ctx.restore();
        }

        // 2. Draw Bubbles
        this.bubbles.forEach(bubble => {
            ctx.save();
            if (bubble.isPopped) {
                ctx.beginPath();
                ctx.arc(bubble.x, bubble.y, bubble.radius * (1 + bubble.popTimer / 10), 0, Math.PI * 2);
                ctx.strokeStyle = bubble.color;
                ctx.globalAlpha = 1 - bubble.popTimer / 10;
                ctx.lineWidth = 1;
                ctx.stroke();
            } else {
                const grad = ctx.createRadialGradient(bubble.x, bubble.y, 0, bubble.x, bubble.y, bubble.radius);
                grad.addColorStop(0, bubble.color);
                grad.addColorStop(0.8, bubble.color);
                grad.addColorStop(1, 'rgba(255,255,255,0)');

                ctx.globalAlpha = 0.7;
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        });

        // 3. Draw Hand Interaction Zones (Bubble Mode) - 40px radius
        ctx.save();
        handPoints.forEach(hand => {
            if (hand) {
                ctx.save();
                ctx.beginPath();
                ctx.arc(hand.x, hand.y, 40, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(255, 0, 0, 0.4)';
                ctx.setLineDash([5, 5]);
                ctx.lineWidth = 2;
                ctx.stroke();

                ctx.fillStyle = 'rgba(255, 0, 0, 0.05)';
                ctx.fill();
                ctx.restore();
            }
        });
        ctx.restore();

        // 4. Draw DUCK! penalty overlay
        if (this.isPenaltyActive) {
            ctx.save();
            ctx.fillStyle = 'rgba(255, 0, 0, 0.4)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.fillStyle = 'white';
            ctx.font = '900 80px Outfit, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowBlur = 20;
            ctx.shadowColor = 'black';

            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.scale(-1, 1);
            ctx.fillText('DUCK!', 0, 0);
            ctx.restore();
        }
    }
}
