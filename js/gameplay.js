/**
 * Bubble Popping Gameplay Logic
 */

class Bubble {
    constructor(minX, maxX, minY) {
        this.radius = Math.random() * 20 + 20; // 20-40px
        this.x = Math.random() * (maxX - minX - this.radius * 2) + minX + this.radius;
        this.y = (minY !== undefined) ? minY - this.radius : -this.radius;
        // Speed is now in Pixels Per Second (approx 120-240px/sec)
        this.speed = Math.random() * 120 + 60; 
        this.color = `hsl(${Math.random() * 360}, 70%, 60%)`;
        this.isPopped = false;
        this.popTimer = 0;
    }

    update(dt) {
        if (!this.isPopped) {
            this.y += this.speed * dt;
        } else {
            this.popTimer += dt * 60; // Keep pop timer roughly frame-based for logic
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

class Laser {
    constructor(minX, maxX, spawnY) {
        this.minX = minX;
        this.maxX = maxX;
        this.y = spawnY;
        this.direction = Math.random() > 0.5 ? 1 : -1; // 1: L->R, -1: R->L
        
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
        // If the laser is horizontally "over" the head area
        if (this.x < headPoint.x && (this.x + this.width) > headPoint.x) {
            // Check if head is ABOVE the laser (Y is smaller in screen coords)
            if (headPoint.y < this.y) {
                return true;
            }
        }
        return false;
    }
}

export class GameplayManager {
    constructor() {
        this.bubbles = [];
        this.score = 0;
        this.lastSpawnTime = 0;
        this.spawnInterval = 1500; // spawn every 1.5s
        this.gameStarted = false;
        this.playArea = { minX: 0, maxX: 800 }; // Default
        this.laser = null;
        this.lastLaserTime = 0;
        this.laserInterval = 8000; // Laser every 8s
        this.isPenaltyActive = false;
        this.penaltyTimer = 0;
    }

    start() {
        this.gameStarted = true;
        this.bubbles = [];
        this.score = 0;
        this.laser = null;
        this.lastLaserTime = performance.now();
        this.isPenaltyActive = false;
    }

    update(canvasWidth, canvasHeight, handPoints, playArea = null, dt, headPoint = null) {
        if (!this.gameStarted || !dt) return;
        
        if (playArea) {
            this.playArea = playArea;
        }

        const now = performance.now();
        if (now - this.lastSpawnTime > this.spawnInterval) {
            this.bubbles.push(new Bubble(this.playArea.minX, this.playArea.maxX, this.playArea.minY));
            this.lastSpawnTime = now;
        }

        this.bubbles.forEach(bubble => {
            bubble.update(dt);
            
            // Check collision with each hand point
            handPoints.forEach(point => {
                if (bubble.checkCollision(point)) {
                    this.score += 10;
                }
            });
        });

        // Handle Laser

        if (!this.laser && (now - this.lastLaserTime > this.laserInterval)) {
            // Adaptive Y: Calculate based on current head position
            let spawnY = this.playArea.minY + this.playArea.size * 0.5; // Default fallback
            if (headPoint) {
                // Spawn 10% of play area size below current head
                spawnY = headPoint.y + (this.playArea.size * 0.1); 
                
                // Keep it within playable bounds
                const maxY = this.playArea.minY + this.playArea.size - 50;
                if (spawnY > maxY) spawnY = maxY;
            }

            this.laser = new Laser(this.playArea.minX, this.playArea.maxX, spawnY);
            this.lastLaserTime = now;
        }

        if (this.laser) {
            this.laser.update(dt);
            if (headPoint) {
                if (this.laser.checkCollision(headPoint)) {
                    this.isPenaltyActive = true;
                    this.penaltyTimer = 0.3;
                }
            }
            if (!this.laser.active) this.laser = null;
        }

        // Penalty timer
        if (this.penaltyTimer > 0) {
            this.penaltyTimer -= dt;
            if (this.penaltyTimer <= 0) this.isPenaltyActive = false;
        }

        // Remove bubbles that are off-screen or popped
        const maxY = (this.playArea.minY !== undefined && this.playArea.size !== undefined) 
            ? this.playArea.minY + this.playArea.size 
            : canvasHeight;

        this.bubbles = this.bubbles.filter(bubble => 
            bubble.y < maxY + bubble.radius && 
            (!bubble.isPopped || bubble.popTimer < 10)
        );
    }

    getScore() {
        return this.score;
    }

    getBubbles() {
        return this.bubbles;
    }
}
