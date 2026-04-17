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
        const side = Math.random() > 0.5 ? 'left' : 'right';
        this.radius = 15;
        this.side = side;
        this.playArea = playArea;
        
        // Spawn at randomized height within play area
        const verticalRange = playArea.size * 0.7;
        this.y = playArea.minY + (playArea.size * 0.1) + Math.random() * verticalRange;
        
        if (side === 'left') {
            this.x = playArea.minX - 20;
            this.speedX = playArea.size * (0.2 + Math.random() * 0.2);
        } else {
            this.x = playArea.maxX + 20;
            this.speedX = -playArea.size * (0.2 + Math.random() * 0.2);
        }
        
        this.speedY = 30 + Math.random() * 40; // Slight fall
        this.isCaught = false;
        this.isMissed = false;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotSpeed = (Math.random() - 0.5) * 5;
    }

    update(dt) {
        if (this.isCaught) return;
        this.x += this.speedX * dt;
        this.y += this.speedY * dt;
        this.rotation += this.rotSpeed * dt;

        // Check missed
        if (this.x < this.playArea.minX - 100 || this.x > this.playArea.maxX + 100 || this.y > this.playArea.minY + this.playArea.size + 50) {
            this.isMissed = true;
        }
    }

    checkCollision(basket) {
        if (!basket || this.isCaught || this.isMissed) return false;
        
        // Simple AABB for basket
        if (this.x > basket.x - basket.width/2 && 
            this.x < basket.x + basket.width/2 && 
            this.y > basket.y - basket.height/2 && 
            this.y < basket.y + basket.height/2) {
            this.isCaught = true;
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
            } else {
                this.eggs.push(new Egg(this.playArea));
                // Gradually increase difficulty
                if (this.spawnInterval > 800) this.spawnInterval -= 50;
            }
            this.lastSpawnTime = now;
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
            this.bubbles = this.bubbles.filter(b => b.y < maxY + b.radius && (!b.isPopped || b.popTimer < 10));
            
        } else if (this.mode === GameMode.EGG) {
            this.eggs.forEach(egg => {
                egg.update(dt);
                if (this.basket && egg.checkCollision(this.basket)) {
                    this.score += 15;
                    // Flash effect could be added
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

    getScore() { return this.score; }
    getBubbles() { return this.bubbles; }
    getEggs() { return this.eggs; }
    getBasket() { return this.basket; }
}

