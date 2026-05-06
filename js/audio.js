/**
 * Manages game sound effects and music.
 * Optimized for mobile using a hybrid approach:
 * - Web Audio API for short sound effects (latency-free, multi-channel, works on mobile)
 * - HTML5 Audio for long music tracks (streaming, memory-efficient)
 */

class AudioManager {
    constructor() {
        this.ctx = null;
        this.sfxBuffers = {};
        this.musicTracks = {};
        this.enabled = true;
        this.initialized = false;
        
        // Configuration
        this.sfxFiles = {
            pop: 'assets/audio/pop.mp3',
            eggCatch: 'assets/audio/egg_catch.mp3',
            eggCrash: 'assets/audio/egg_crash.mp3',
            laserFail: 'assets/audio/laser_fail.mp3',
            timer: 'assets/audio/timer.mp3'
        };
        
        this.musicFiles = {
            home: 'assets/audio/background_home.mp3',
            bubble: 'assets/audio/background_bubble_hunter.mp3',
            egg: 'assets/audio/background_egg_catcher.mp3'
        };
    }

    async init() {
        if (this.initialized) return;

        try {
            // 1. Initialize Web Audio Context
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContextClass();
            
            // 2. Setup Music Tracks (HTML5 Audio)
            for (const [key, path] of Object.entries(this.musicFiles)) {
                const audio = new Audio(path);
                audio.load();
                this.musicTracks[key] = audio;
            }

            // 3. Load SFX (Fetch and Decode)
            const loadSfx = async (key, url) => {
                try {
                    const response = await fetch(url);
                    const arrayBuffer = await response.arrayBuffer();
                    this.sfxBuffers[key] = await this.ctx.decodeAudioData(arrayBuffer);
                } catch (e) {
                    console.warn(`Failed to load SFX: ${key} from ${url}`, e);
                }
            };

            // Load all SFX in parallel
            await Promise.all(
                Object.entries(this.sfxFiles).map(([k, v]) => loadSfx(k, v))
            );

            // 4. Unlock Context for Mobile
            if (this.ctx.state === 'suspended') {
                await this.ctx.resume();
            }

            this.initialized = true;
            console.log('Audio System Initialized (Hybrid Mobile-Ready)');
        } catch (error) {
            console.error('Audio Initialization failed:', error);
        }
    }

    /**
     * Plays a short sound effect using Web Audio API.
     * Guaranteed to work on mobile once initialized.
     */
    play(key, volume = 1.0) {
        if (!this.enabled || !this.initialized) return;

        // Ensure context is active (browsers can suspend it)
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        if (this.sfxBuffers[key]) {
            const source = this.ctx.createBufferSource();
            source.buffer = this.sfxBuffers[key];
            
            const gainNode = this.ctx.createGain();
            gainNode.gain.value = volume;
            
            source.connect(gainNode);
            gainNode.connect(this.ctx.destination);
            
            source.start(0);
        } else if (this.musicTracks[key]) {
            // Fallback: if they called play('home') instead of playMusic('home')
            this.playMusic(key, volume);
        }
    }

    /**
     * Plays a looping music track using HTML5 Audio.
     */
    playMusic(key, volume = 0.4) {
        if (!this.enabled || !this.initialized || !this.musicTracks[key]) return;
        
        // Stop any other music
        Object.keys(this.musicTracks).forEach(k => {
            if (k !== key) this.stop(k);
        });

        const music = this.musicTracks[key];
        music.loop = true;
        music.volume = volume;
        
        // Use play() promise to handle potential blocks
        music.play().catch(e => console.warn(`Music play failed for ${key}:`, e));
    }

    /**
     * Stops a specific music track.
     */
    stop(key) {
        const music = this.musicTracks[key];
        if (music) {
            music.pause();
            music.currentTime = 0;
        }
    }

    /**
     * Stops all currently playing music.
     */
    stopMusic() {
        Object.keys(this.musicTracks).forEach(k => this.stop(k));
    }
}

export const audio = new AudioManager();
