/**
 * Manages game sound effects and music.
 */

class AudioManager {
    constructor() {
        this.sounds = {};
        this.enabled = true;
        this.initialized = false;
    }

    async init() {
        if (this.initialized) return;

        const soundFiles = {
            pop: 'assets/audio/pop.mp3',
            eggCatch: 'assets/audio/egg_catch.mp3',
            eggCrash: 'assets/audio/egg_crash.mp3',
            laserFail: 'assets/audio/laser_fail.mp3',
            timer: 'assets/audio/timer.mp3'
        };

        for (const [key, path] of Object.entries(soundFiles)) {
            const audio = new Audio(path);
            audio.load();
            this.sounds[key] = audio;
        }

        this.initialized = true;
        console.log('Audio System Initialized');
    }

    play(key, volume = 1.0) {
        if (!this.enabled || !this.sounds[key]) return;

        // Clone for overlapping sounds (e.g. multiple pops)
        const sound = this.sounds[key].cloneNode();
        sound.volume = volume;
        sound.play().catch(e => console.warn('Audio play failed:', e));
    }

    playLoop(key, volume = 0.5) {
        if (!this.enabled || !this.sounds[key]) return null;

        const sound = this.sounds[key];
        sound.loop = true;
        sound.volume = volume;
        sound.play().catch(e => console.warn('Audio loop failed:', e));
        return sound;
    }

    stop(key) {
        if (this.sounds[key]) {
            this.sounds[key].pause();
            this.sounds[key].currentTime = 0;
        }
    }
}

export const audio = new AudioManager();
