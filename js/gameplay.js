import { getGameById } from './games/registry.js';

export const GameMode = {
    BUBBLE: 'BUBBLE',
    EGG: 'EGG'
};

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
        this.activeGame = null;
        this.score = 0;
        this.gameStarted = false;
        this.playArea = { minX: 0, maxX: 800, minY: 0, size: 800 };
        this.effects = [];
        this.duration = 60;
        this.remainingTime = 60;
        this.difficultyPhase = 0; // 0, 1, 2
        this.isCalibrating = false;
        this.calibrationTargets = [];
    }

    get mode() {
        return this.activeGame ? this.activeGame.id : 'BUBBLE';
    }

    get stats() {
        return this.activeGame ? this.activeGame.stats : {};
    }

    addEffect(text, type) {
        const x = this.playArea.maxX - 60 - (Math.random() * 40);
        const y = this.playArea.minY + this.playArea.size - 40;
        this.effects.push(new ScoreEffect(text, type, x, y));
    }

    reset() {
        if (this.activeGame) {
            this.activeGame.reset();
        }
        this.score = 0;
        this.effects = [];
        this.gameStarted = false;
        this.isCalibrating = false;
        this.calibrationTargets = [];
        this.remainingTime = this.duration;
    }

    start(gameOrId, duration = 60) {
        const gameInstance = typeof gameOrId === 'string' ? getGameById(gameOrId) : gameOrId;
        if (!gameInstance) return;

        this.activeGame = gameInstance;
        this.duration = duration;
        this.remainingTime = duration === 0 ? Infinity : duration;
        this.reset();
        this.activeGame.init(this.playArea);
        this.gameStarted = true;
    }

    startCalibration(playArea = null, gameOrId = null) {
        if (playArea) {
            this.playArea = playArea;
        }
        if (gameOrId) {
            const gameInstance = typeof gameOrId === 'string' ? getGameById(gameOrId) : gameOrId;
            if (gameInstance) {
                this.activeGame = gameInstance;
            }
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
            // Play popup sound using the audio context
            import('./audio.js').then(module => {
                module.audio.play('pop', 1.0);
            });
        }
    }

    update(canvasWidth, canvasHeight, handPoints, playArea = null, dt, headPoint = null, shoulderPoints = []) {
        if (!this.gameStarted || !dt) return;

        if (playArea) {
            this.playArea = playArea;
        }

        // Update Timer
        if (this.duration > 0) {
            this.remainingTime -= dt;
            if (this.remainingTime <= 0) {
                this.remainingTime = 0;
                this.gameStarted = false;
                return;
            }

            const progress = (this.duration - this.remainingTime) / this.duration;
            if (progress < 0.2) this.difficultyPhase = 0;
            else if (progress < 0.6) this.difficultyPhase = 1;
            else this.difficultyPhase = 2;
        } else {
            this.difficultyPhase = 1;
        }

        // Delegate update to active game
        if (this.activeGame) {
            this.activeGame.update(dt, handPoints, headPoint, this.playArea, this.difficultyPhase, (text, type) => this.addEffect(text, type), shoulderPoints);
            this.score = this.activeGame.score;
        }

        // Update Effects
        this.effects.forEach(fx => fx.update(dt));
        this.effects = this.effects.filter(fx => fx.life > 0);
    }

    getScore() { return this.score; }
    getEffects() { return this.effects; }
}
