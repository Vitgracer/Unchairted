import { BaseGame } from './base.js';
import { audio } from '../audio.js';

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

export class EggCatcherGame extends BaseGame {
    constructor() {
        super();
        this.id = 'EGG';
        this.name = 'Egg Catcher';
        this.icon = '🥚';
        this.music = 'egg';
        this.rules = [
            'Bring hands together to spawn the basket',
            'Catch eggs in dashed target zones: <span class="pts pts-up">+10 PTS</span>',
            'If an egg breaks on the floor: <span class="pts pts-down">-10 PTS</span>'
        ];
        this.tutorial = {
            title: 'EGG CATCHER',
            gif: 'assets/gifs/egg_catcher/tutorial.gif',
            instructions: [
                'Bring <strong>hands together</strong> to spawn basket',
                'Catch eggs in the target zones',
                'Don\'t let them break on the floor!'
            ]
        };
        this.statsKeys = [
            { key: 'eggsCaught', label: 'Eggs Caught', type: 'pos' },
            { key: 'eggsBroken', label: 'Eggs Broken', type: 'neg' }
        ];

        this.eggs = [];
        this.basket = null;
        this.lastSpawnTime = 0;
        this.spawnInterval = 500;
        this.lastPerchIndex = -1;
    }

    init(playArea) {
        super.init(playArea);
        this.eggs = [];
        this.basket = null;
        this.lastSpawnTime = performance.now();
        this.spawnInterval = 500;
        this.lastPerchIndex = -1;

        this.stats = {
            eggsCaught: 0,
            eggsBroken: 0
        };
    }

    reset() {
        super.reset();
        this.eggs = [];
        this.basket = null;
        this.lastPerchIndex = -1;
    }

    async onBeforeStart() {
        const statusEl = document.getElementById('status');
        const interlockOverlayEl = document.getElementById('interlock-overlay');
        
        if (statusEl) statusEl.classList.add('hidden');
        if (interlockOverlayEl) {
            interlockOverlayEl.classList.remove('hidden');
            interlockOverlayEl.style.display = 'flex';
        }
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        if (interlockOverlayEl) {
            interlockOverlayEl.classList.add('hidden');
            interlockOverlayEl.style.display = '';
        }
    }

    update(dt, handPoints, headPoint, playArea, difficultyPhase, addEffect) {
        const now = performance.now();

        // 1. Handle Basket Logic
        if (handPoints.length === 2) {
            const p1 = handPoints[0];
            const p2 = handPoints[1];
            const dx = p1.x - p2.x;
            const dy = p1.y - p2.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // If hands are close (less than 27% of play area size)
            if (dist < playArea.size * 0.27) {
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

        // 2. Spawn Eggs
        let currentSpawnInterval = this.spawnInterval;
        if (difficultyPhase === 1) currentSpawnInterval *= 0.6;
        if (difficultyPhase === 2) currentSpawnInterval *= 0.4;

        if (now - this.lastSpawnTime > currentSpawnInterval) {
            const newEgg = new Egg(playArea, this.lastPerchIndex);
            if (difficultyPhase === 1) newEgg.rollSpeed *= 1.8;
            if (difficultyPhase === 2) newEgg.rollSpeed *= 2.6;

            const arrivalFor = (egg) => ((1 - egg.progress) / egg.rollSpeed) * 1000;
            const myArrival = arrivalFor(newEgg);
            const minConflictDist = 1000; // 1 second

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

        // 3. Update Eggs & collisions
        this.eggs.forEach(egg => {
            const wasBreaking = egg.isBreaking;
            egg.update(dt);
            if (!wasBreaking && egg.isBreaking) {
                this.score = Math.max(0, this.score - 10);
                this.stats.eggsBroken++;
                addEffect('-10', 'neg');
                audio.play('eggCrash', 0.5);
            }
            if (this.basket && egg.checkCollision(this.basket)) {
                this.score += 10;
                this.stats.eggsCaught++;
                addEffect('+10', 'pos');
                audio.play('eggCatch', 0.7);
            }
        });

        // Remove missed/caught
        this.eggs = this.eggs.filter(egg => !egg.isMissed && !egg.isCaught);
    }

    getPerches(playArea) {
        const { minX, maxX, minY, size } = playArea;
        const perchWidth = size * 0.3;
        return [
            { x1: minX, y1: minY + size * 0.05, x2: minX + perchWidth, y2: minY + size * 0.25, label: 'TL' },
            { x1: minX, y1: minY + size * 0.55, x2: minX + perchWidth, y2: minY + size * 0.85, label: 'BL' },
            { x1: maxX, y1: minY + size * 0.05, x2: maxX - perchWidth, y2: minY + size * 0.25, label: 'TR' },
            { x1: maxX, y1: minY + size * 0.55, x2: maxX - perchWidth, y2: minY + size * 0.85, label: 'BR' }
        ];
    }

    draw(ctx, canvas, playArea, handPoints, headPoint) {
        // Draw Perches
        const perches = this.getPerches(playArea);
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 14;
        ctx.lineCap = 'round';

        perches.forEach(p => {
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

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.lineWidth = 14;

            // Catch Zone Target
            ctx.save();
            const isNear = this.basket && Math.sqrt((p.x2 - this.basket.x) ** 2 + (p.y2 - this.basket.y) ** 2) < 70;

            ctx.translate(p.x2, p.y2);

            if (isNear) {
                ctx.shadowBlur = 15;
                ctx.shadowColor = '#ff0000';
                ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
                ctx.lineWidth = 3;
            } else {
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
                ctx.lineWidth = 2;
            }

            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.arc(0, 0, 35, 0, Math.PI * 2);
            ctx.stroke();

            ctx.setLineDash([]);
            ctx.globalAlpha = isNear ? 0.6 : 0.2;
            ctx.fillStyle = isNear ? '#00f2ff' : '#ffffff';
            ctx.beginPath();
            ctx.arc(0, 0, 4, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        });
        ctx.restore();

        // Draw Eggs
        this.eggs.forEach(egg => {
            ctx.save();
            ctx.translate(egg.x, egg.y);

            if (egg.isBreaking) {
                const alpha = 1 - (egg.breakTimer / 0.6);
                ctx.globalAlpha = alpha;

                ctx.beginPath();
                ctx.arc(0, 5, egg.radius * 0.8, 0, Math.PI * 2);
                ctx.fillStyle = '#ffcc00';
                ctx.fill();

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
                ctx.beginPath();
                ctx.ellipse(0, 0, egg.radius * 0.8, egg.radius, 0, 0, Math.PI * 2);

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
        });

        // Draw Basket
        if (this.basket) {
            ctx.save();
            ctx.translate(this.basket.x, this.basket.y);
            ctx.save();
            ctx.scale(-1, 1);

            const w = this.basket.width;
            const h = this.basket.height;

            ctx.font = `${h * 1.4}px serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🧺', 0, 0);

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
    }
}
