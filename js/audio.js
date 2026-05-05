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
            timer: 'assets/audio/timer.mp3',
            home: 'assets/audio/background_home.mp3',
            bubble: 'assets/audio/background_bubble_hunter.mp3',
            egg: 'assets/audio/background_egg_catcher.mp3'
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

    playMusic(key, volume = 0.4) {
        if (!this.enabled || !this.sounds[key]) return;
        
        // Stop any other music that might be playing
        ['home', 'bubble', 'egg'].forEach(k => {
            if (k !== key) this.stop(k);
        });

        const music = this.sounds[key];
        music.loop = true;
        music.volume = volume;
        music.play().catch(e => console.warn('Music play failed:', e));
    }

    stopMusic() {
        ['home', 'bubble', 'egg'].forEach(k => this.stop(k));
    }
}

export const audio = new AudioManager();
