export const GameMode = {
    BUBBLE: 'BUBBLE',
    EGG: 'EGG'
};

import { audio } from './audio.js';

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

class Egg {
    constructor(playArea, excludePerchIndex = -1) {
        this.playArea = playArea;
        
        // Choose perch: 0:TL, 1:BL, 2:TR, 3:BR (exclude the last one)
        let index;
        do {
            index = Math.floor(Math.random() * 4);
        } while (index === excludePerchIndex && excludePerchIndex !== -1);
        
        this.perchIndex = index;
        this.radius = 30;
        this.isCaught = false;
        this.isMissed = false;
        this.isBreaking = false;
        this.breakTimer = 0;
        this.rotation = 0;
        this.rotSpeed = 6 + Math.random() * 4;

        this.progress = 0; // 0 to 1 (rolling)
        this.rollSpeed = 0.30 + (Math.random() * 0.2);

        this.updatePosition();
    }

    updatePosition() {
        const { minX, maxX, minY, size } = this.playArea;
        const perchWidth = size * 0.3;

        // Final catch points (ends of perches)
        const perches = [
            { x1: minX, y1: minY + size * 0.05, x2: minX + perchWidth, y2: minY + size * 0.25 }, // TL (Extremely High)
            { x1: minX, y1: minY + size * 0.55, x2: minX + perchWidth, y2: minY + size * 0.85 }, // BL (Extremely Low)
            { x1: maxX, y1: minY + size * 0.05, x2: maxX - perchWidth, y2: minY + size * 0.25 }, // TR (Extremely High)
            { x1: maxX, y1: minY + size * 0.55, x2: maxX - perchWidth, y2: minY + size * 0.85 }  // BR (Extremely Low)
        ];

        const p = perches[this.perchIndex];
        this.x = p.x1 + (p.x2 - p.x1) * this.progress;
        this.y = p.y1 + (p.y2 - p.y1) * this.progress;
    }

    update(dt) {
        if (this.isCaught || this.isMissed) return;

        if (this.isBreaking) {
            this.breakTimer += dt;
            if (this.breakTimer > 0.6) this.isMissed = true;
            return;
        }

        this.progress += this.rollSpeed * dt;
        this.rotation += this.rotSpeed * dt;

        if (this.progress >= 1) {
            this.progress = 1;
            // Point of no return - if not caught now, it breaks
            this.updatePosition();
            this.isBreaking = true;
        } else {
            this.updatePosition();
        }
    }

    checkCollision(basket) {
        if (!basket || this.isCaught || this.isMissed || this.isBreaking) return false;

        // We only allow catching near the end of the perch (progress > 0.85)
        if (this.progress > 0.85) {
            const dist = Math.sqrt((this.x - basket.x) ** 2 + (this.y - basket.y) ** 2);
            if (dist < (this.radius + basket.width / 2)) {
                this.isCaught = true;
                return true;
            }
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

class ScoreEffect {
    constructor(text, type, x, y) {
        this.text = text;
        this.type = type; // 'pos', 'neg', 'penalty'
        this.x = x;
        this.y = y;
        this.life = 1.0;
        this.velocity = Math.random() * 100 + 150; // speed up
        this.drift = (Math.random() - 0.5) * 60; // horizontal wobble
        this.size = type === 'penalty' ? 28 : 22;
    }

    update(dt) {
        this.y -= this.velocity * dt;
        this.x += this.drift * Math.sin(Date.now() / 200) * dt;
        this.life -= dt * 0.7; // last ~1.4 seconds
    }
}

export class GameplayManager {
    constructor() {
        this.mode = GameMode.BUBBLE;
        this.bubbles = [];
        this.eggs = [];
        this.basket = null;
        this.score = 0;
        this.lastSpawnTime = 0;
        this.spawnInterval = 1500;
        this.gameStarted = false;
        this.playArea = { minX: 0, maxX: 800, minY: 0, size: 800 };
        this.laser = null;
        this.lastLaserTime = 0;
        this.laserInterval = 8000;
        this.isPenaltyActive = false;
        this.penaltyTimer = 0;
        this.effects = [];
        this.duration = 60; // default 1 min
        this.remainingTime = 60;
        this.difficultyPhase = 0; // 0, 1, 2

        this.isCalibrating = false;
        this.calibrationTargets = [];
        this.lastPerchIndex = -1;
    }

    addEffect(text, type) {
        // Spawn on the right side of the play area
        const x = this.playArea.maxX - 60 - (Math.random() * 40);
        const y = this.playArea.minY + this.playArea.size - 40;
        this.effects.push(new ScoreEffect(text, type, x, y));
    }

    reset() {
        this.bubbles = [];
        this.eggs = [];
        this.basket = null;
        this.score = 0;
        this.laser = null;
        this.lastLaserTime = performance.now();
        this.isPenaltyActive = false;
        this.effects = [];
        this.gameStarted = false;
        this.isCalibrating = false;
        this.calibrationTargets = [];
        this.remainingTime = this.duration;
        this.lastPerchIndex = -1;

        // Statistics
        this.stats = {
            popped: 0,
            missed: 0,
            eggsCaught: 0,
            eggsBroken: 0,
            lasersAvoided: 0,
            lasersHit: 0
        };
    }

    start(mode = GameMode.BUBBLE, duration = 60) {
        this.mode = mode;
        this.duration = duration;
        this.remainingTime = duration === 0 ? Infinity : duration;
        this.reset();
        this.gameStarted = true;

        if (this.mode === GameMode.EGG) {
            this.spawnInterval = 500;
        } else {
            this.spawnInterval = 450;
        }
    }

    startCalibration(playArea = null) {
        if (playArea) {
            this.playArea = playArea;
        }
        this.isCalibrating = true;
        this.calibrationPassed = false;
        this.calibrationFinishTimer = 0;

        const { minX, maxX, minY, size } = this.playArea;
        const centerX = minX + size / 2;

        this.calibrationTargets = [
            { id: 'head', x: centerX, y: minY + size * 0.25, radius: 80, isActive: false, label: 'HEAD' },
            { id: 'leftHand', x: maxX - size * 0.2, y: minY + size * 0.60, radius: 65, isActive: false, label: 'LEFT HAND' },
            { id: 'rightHand', x: minX + size * 0.2, y: minY + size * 0.60, radius: 65, isActive: false, label: 'RIGHT HAND' },
            { id: 'leftHip', x: centerX + size * 0.08, y: minY + size * 0.85, radius: 85, isActive: false, label: 'LEFT HIP' },
            { id: 'rightHip', x: centerX - size * 0.08, y: minY + size * 0.85, radius: 85, isActive: false, label: 'RIGHT HIP' }
        ];
    }

    updateCalibration(headPoint, handPoints, hipPoints = null, dt = 1 / 60) {
        if (!this.isCalibrating) return;

        // If calibration is already passed, just update the timer
        if (this.calibrationPassed) {
            this.calibrationFinishTimer += dt;
            if (this.calibrationFinishTimer > 1.5) {
                this.isCalibrating = false;
            }
            return;
        }

        let allActive = true;
        this.calibrationTargets.forEach(target => {
            let active = false;
            if (target.id === 'head' && headPoint) {
                const dist = Math.sqrt((headPoint.x - target.x) ** 2 + (headPoint.y - target.y) ** 2);
                if (dist < target.radius) active = true;
            } else if (target.id.includes('Hand') && handPoints) {
                handPoints.forEach(hand => {
                    const dist = Math.sqrt((hand.x - target.x) ** 2 + (hand.y - target.y) ** 2);
                    if (dist < target.radius) active = true;
                });
            } else if (target.id.includes('Hip') && hipPoints) {
                hipPoints.forEach(hip => {
                    const dist = Math.sqrt((hip.x - target.x) ** 2 + (hip.y - target.y) ** 2);
                    if (dist < target.radius) active = true;
                });
            }
            target.isActive = active;
            if (!active) allActive = false;
        });

        if (allActive) {
            this.calibrationPassed = true;
            this.calibrationFinishTimer = 0;
            audio.play('pop', 1.0); // Success sound
        }
    }

    update(canvasWidth, canvasHeight, handPoints, playArea = null, dt, headPoint = null) {
        if (!this.gameStarted || !dt) return;

        if (playArea) {
            this.playArea = playArea;
        }

        const now = performance.now();

        // Update Timer
        if (this.duration > 0) {
            this.remainingTime -= dt;
            if (this.remainingTime <= 0) {
                this.remainingTime = 0;
                this.gameStarted = false;
                return;
            }

            // Difficulty scaling (20% easy, 40% medium, 40% hard)
            const progress = (this.duration - this.remainingTime) / this.duration;
            if (progress < 0.2) this.difficultyPhase = 0;
            else if (progress < 0.6) this.difficultyPhase = 1;
            else this.difficultyPhase = 2;
        } else {
            // Infinite mode - scale by time?
            const elapsed = now - this.lastSpawnTime; // No, just use a slow scale
            this.difficultyPhase = 1; // Default to medium for infinite
        }

        // 1. Handle Basket Logic (Egg Mode Only)
        if (this.mode === GameMode.EGG) {
            if (handPoints.length === 2) {
                const p1 = handPoints[0];
                const p2 = handPoints[1];
                const dx = p1.x - p2.x;
                const dy = p1.y - p2.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                // If hands are close (less than 15% of play area size)
                if (dist < this.playArea.size * 0.27) {
                    this.basket = {
                        x: (p1.x + p2.x) / 2,
                        y: (p1.y + p2.y) / 2,
                        width: 140,
                        height: 90
                    };
                } else {
                    this.basket = null;
                }
            } else {
                this.basket = null;
            }
        }

        // 2. Spawn Elements
        let currentSpawnInterval = this.spawnInterval;
        if (this.difficultyPhase === 1) currentSpawnInterval *= 0.6;
        if (this.difficultyPhase === 2) currentSpawnInterval *= 0.4;

        if (now - this.lastSpawnTime > currentSpawnInterval) {
            if (this.mode === GameMode.BUBBLE) {
                const b = new Bubble(this.playArea.minX, this.playArea.maxX, this.playArea.minY);
                if (this.difficultyPhase === 1) b.speed *= 1.4;
                if (this.difficultyPhase === 2) b.speed *= 1.8;
                this.bubbles.push(b);
                this.lastSpawnTime = now;
            } else {
                // EGG Mode: Smarter spawning to avoid simultaneous falls
                const newEgg = new Egg(this.playArea, this.lastPerchIndex);
                // Aggressive scaling for Eggs
                if (this.difficultyPhase === 1) newEgg.rollSpeed *= 1.8;
                if (this.difficultyPhase === 2) newEgg.rollSpeed *= 2.6;

                const arrivalFor = (egg) => ((1 - egg.progress) / egg.rollSpeed) * 1000;
                const myArrival = arrivalFor(newEgg);
                const minConflictDist = 1000; // DOUBLED DISTANCE (was 700)

                let conflict = false;
                this.eggs.forEach(egg => {
                    const otherArrival = arrivalFor(egg);
                    if (Math.abs(myArrival - otherArrival) < minConflictDist) {
                        conflict = true;
                    }
                });

                if (!conflict) {
                    this.eggs.push(newEgg);
                    this.lastPerchIndex = newEgg.perchIndex;
                    this.lastSpawnTime = now;
                }
            }
        }

        // 3. Update Elements
        if (this.mode === GameMode.BUBBLE) {
            this.bubbles.forEach(bubble => {
                bubble.update(dt);
                handPoints.forEach(point => {
                    if (bubble.checkCollision(point, 40)) {
                        this.score += 10;
                        this.stats.popped++;
                        this.addEffect('+10', 'pos');
                        audio.play('pop', 0.6);
                    }
                });
            });

            // Remove off-screen/popped
            const maxY = this.playArea.minY + this.playArea.size;
            this.bubbles.forEach(b => {
                if (!b.isPopped && !b.isMissed && b.y > maxY) {
                    this.score = Math.max(0, this.score - 10);
                    this.stats.missed++;
                    this.addEffect('-10', 'neg');
                    b.isMissed = true;
                }
            });
            this.bubbles = this.bubbles.filter(b => b.y < maxY + b.radius && (!b.isPopped || b.popTimer < 10));

        } else if (this.mode === GameMode.EGG) {
            this.eggs.forEach(egg => {
                const wasBreaking = egg.isBreaking;
                egg.update(dt);
                if (!wasBreaking && egg.isBreaking) {
                    this.score = Math.max(0, this.score - 10);
                    this.stats.eggsBroken++;
                    this.addEffect('-10', 'neg');
                    audio.play('eggCrash', 0.5);
                }
                if (this.basket && egg.checkCollision(this.basket)) {
                    this.score += 10;
                    this.stats.eggsCaught++;
                    this.addEffect('+10', 'pos');
                    audio.play('eggCatch', 0.7);
                }
            });

            // Remove missed/caught
            this.eggs = this.eggs.filter(egg => !egg.isMissed && !egg.isCaught);
        }

        // 4. Handle Laser (Disabled in EGG mode as requested)
        if (this.mode === GameMode.BUBBLE) {
            if (!this.laser && (now - this.lastLaserTime > this.laserInterval)) {
                let spawnY = this.playArea.minY + this.playArea.size * 0.5;
                if (headPoint) {
                    spawnY = headPoint.y + (this.playArea.size * 0.1);
                    const maxY = this.playArea.minY + this.playArea.size - 50;
                    if (spawnY > maxY) spawnY = maxY;
                }
                this.laser = new Laser(this.playArea.minX, this.playArea.maxX, spawnY);
                this.lastLaserTime = now;
            }

            if (this.laser) {
                this.laser.update(dt);
                if (headPoint && this.laser.checkCollision(headPoint)) {
                    if (!this.isPenaltyActive) {
                        this.score = Math.max(0, this.score - 50);
                        this.stats.lasersHit++;
                        this.addEffect('-50', 'penalty');
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
        } else {
            // Ensure no laser persists if mode switched (though start() resets it)
            this.laser = null;
        }

        if (this.penaltyTimer > 0) {
            this.penaltyTimer -= dt;
            if (this.penaltyTimer <= 0) this.isPenaltyActive = false;
        }

        // Update Effects
        this.effects.forEach(fx => fx.update(dt));
        this.effects = this.effects.filter(fx => fx.life > 0);
    }

    getPerches() {
        const { minX, maxX, minY, size } = this.playArea;
        const perchWidth = size * 0.3;
        return [
            { x1: minX, y1: minY + size * 0.05, x2: minX + perchWidth, y2: minY + size * 0.25, label: 'TL' },
            { x1: minX, y1: minY + size * 0.55, x2: minX + perchWidth, y2: minY + size * 0.85, label: 'BL' },
            { x1: maxX, y1: minY + size * 0.05, x2: maxX - perchWidth, y2: minY + size * 0.25, label: 'TR' },
            { x1: maxX, y1: minY + size * 0.55, x2: maxX - perchWidth, y2: minY + size * 0.85, label: 'BR' }
        ];
    }

    getScore() { return this.score; }
    getBubbles() { return this.bubbles; }
    getEggs() { return this.eggs; }
    getBasket() { return this.basket; }
    getEffects() { return this.effects; }
}

