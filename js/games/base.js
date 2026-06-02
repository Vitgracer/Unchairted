export class BaseGame {
    constructor() {
        this.id = '';
        this.name = '';
        this.icon = '';
        this.music = '';
        this.rules = [];
        this.tutorial = {
            title: '',
            gif: '',
            instructions: []
        };
        this.statsKeys = []; // Array of { key, label, type ('pos' | 'neg') }
        this.score = 0;
        this.stats = {};
        this.locked = false;
        this.comingSoon = false;
    }

    init(playArea) {
        this.score = 0;
        this.stats = {};
    }

    reset() {
        this.score = 0;
        this.stats = {};
    }

    async onBeforeStart() {
        // Subclasses can implement logic here (e.g. tutorials or custom countdowns)
    }

    update(dt, handPoints, headPoint, playArea, difficultyPhase, addEffect) {
        // Update game state
    }

    draw(ctx, canvas, playArea, handPoints, headPoint) {
        // Render game objects onto the canvas
    }
}
