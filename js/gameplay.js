export const GameMode = {
    BUBBLE: 'BUBBLE',
    EGG: 'EGG'
};

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

    checkCollision(point) {
        if (!point || this.isPopped) return false;
        const dx = this.x - point.x;
        const dy = this.y - point.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < this.radius) {
            this.isPopped = true;
            return true;
        }
        return false;
    }
}

class Egg {
    constructor(playArea) {
        this.playArea = playArea;
        this.radius = 18;
        this.isCaught = false;
        this.isMissed = false;
        this.isBreaking = false;
        this.breakTimer = 0;
        this.rotation = 0;
        this.rotSpeed = 6 + Math.random() * 4;

        // Choose perch: 0:TL, 1:BL, 2:TR, 3:BR
        this.perchIndex = Math.floor(Math.random() * 4);
        this.progress = 0; // 0 to 1 (rolling)
        this.rollSpeed = 0.2 + (Math.random() * 0.15); 
        
        this.updatePosition();
    }

    updatePosition() {
        const { minX, maxX, minY, size } = this.playArea;
        const perchWidth = size * 0.3;
        
        // Final catch points (ends of perches)
        const perches = [
            { x1: minX, y1: minY + size*0.05, x2: minX + perchWidth, y2: minY + size*0.25 }, // TL (Extremely High)
            { x1: minX, y1: minY + size*0.55, x2: minX + perchWidth, y2: minY + size*0.85 }, // BL (Extremely Low)
            { x1: maxX, y1: minY + size*0.05, x2: maxX - perchWidth, y2: minY + size*0.25 }, // TR (Extremely High)
            { x1: maxX, y1: minY + size*0.55, x2: maxX - perchWidth, y2: minY + size*0.85 }  // BR (Extremely Low)
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
            const dist = Math.sqrt((this.x - basket.x)**2 + (this.y - basket.y)**2);
            if (dist < (this.radius + basket.width/2)) {
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
    }

    start(mode = GameMode.BUBBLE) {
        this.mode = mode;
        this.gameStarted = true;
        this.bubbles = [];
        this.eggs = [];
        this.basket = null;
        this.score = 0;
        this.laser = null;
        this.lastLaserTime = performance.now();
        this.isPenaltyActive = false;
        
        if (this.mode === GameMode.EGG) {
            this.spawnInterval = 2000; // Slower start for eggs
        } else {
            this.spawnInterval = 1500;
        }
    }

    update(canvasWidth, canvasHeight, handPoints, playArea = null, dt, headPoint = null) {
        if (!this.gameStarted || !dt) return;
        
        if (playArea) {
            this.playArea = playArea;
        }

        const now = performance.now();

        // 1. Handle Basket Logic (Egg Mode Only)
        if (this.mode === GameMode.EGG) {
            if (handPoints.length === 2) {
                const p1 = handPoints[0];
                const p2 = handPoints[1];
                const dx = p1.x - p2.x;
                const dy = p1.y - p2.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                // If hands are close (less than 15% of play area size)
                if (dist < this.playArea.size * 0.18) {
                    this.basket = {
                        x: (p1.x + p2.x) / 2,
                        y: (p1.y + p2.y) / 2,
                        width: 100,
                        height: 60
                    };
                } else {
                    this.basket = null;
                }
            } else {
                this.basket = null;
            }
        }

        // 2. Spawn Elements
        if (now - this.lastSpawnTime > this.spawnInterval) {
            if (this.mode === GameMode.BUBBLE) {
                this.bubbles.push(new Bubble(this.playArea.minX, this.playArea.maxX, this.playArea.minY));
                this.lastSpawnTime = now;
            } else {
                // EGG Mode: Smarter spawning to avoid simultaneous falls
                const newEgg = new Egg(this.playArea);
                const arrivalFor = (egg) => ((1 - egg.progress) / egg.rollSpeed) * 1000;
                const myArrival = arrivalFor(newEgg);
                const minConflictDist = 700; 

                let conflict = false;
                this.eggs.forEach(egg => {
                    const otherArrival = arrivalFor(egg);
                    if (Math.abs(myArrival - otherArrival) < minConflictDist) {
                        conflict = true;
                    }
                });

                if (!conflict) {
                    this.eggs.push(newEgg);
                    this.lastSpawnTime = now;
                    if (this.spawnInterval > 700) this.spawnInterval -= 35;
                }
            }
        }

        // 3. Update Elements
        if (this.mode === GameMode.BUBBLE) {
            this.bubbles.forEach(bubble => {
                bubble.update(dt);
                handPoints.forEach(point => {
                    if (bubble.checkCollision(point)) {
                        this.score += 10;
                    }
                });
            });
            
            // Remove off-screen/popped
            const maxY = this.playArea.minY + this.playArea.size;
            this.bubbles.forEach(b => {
                if (!b.isPopped && !b.isMissed && b.y > maxY) {
                    this.score = Math.max(0, this.score - 10);
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
                }
                if (this.basket && egg.checkCollision(this.basket)) {
                    this.score += 10;
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
                    }
                    this.isPenaltyActive = true;
                    this.penaltyTimer = 0.3;
                }
                if (!this.laser.active) this.laser = null;
            }
        } else {
            // Ensure no laser persists if mode switched (though start() resets it)
            this.laser = null;
        }

        if (this.penaltyTimer > 0) {
            this.penaltyTimer -= dt;
            if (this.penaltyTimer <= 0) this.isPenaltyActive = false;
        }
    }

    getPerches() {
        const { minX, maxX, minY, size } = this.playArea;
        const perchWidth = size * 0.3;
        return [
            { x1: minX, y1: minY + size*0.05, x2: minX + perchWidth, y2: minY + size*0.25, label: 'TL' },
            { x1: minX, y1: minY + size*0.55, x2: minX + perchWidth, y2: minY + size*0.85, label: 'BL' },
            { x1: maxX, y1: minY + size*0.05, x2: maxX - perchWidth, y2: minY + size*0.25, label: 'TR' },
            { x1: maxX, y1: minY + size*0.55, x2: maxX - perchWidth, y2: minY + size*0.85, label: 'BR' }
        ];
    }

    getScore() { return this.score; }
    getBubbles() { return this.bubbles; }
    getEggs() { return this.eggs; }
    getBasket() { return this.basket; }
}

