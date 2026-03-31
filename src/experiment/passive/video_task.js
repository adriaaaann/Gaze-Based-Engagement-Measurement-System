import { TrialManager } from '../trials.js';

export class VideoPassiveTask {
    constructor(logger, onComplete) {
        this.logger = logger;
        this.onComplete = onComplete;
        
        // Sequence requirements
        this.sequence = [];
        this.currentIndex = 0;
        this.trialId = `passive_video_${Date.now()}`;
        
        // Timing
        this.dwellDurationMs = 5000;
        this.timer = null;
        this.targetOnsetMs = 0;
        this.hasFixated = false;
        
        // DOM Elements
        this.videoElem = document.getElementById('background-video');
        this.canvas = document.getElementById('search-canvas');
        this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
        this.animationFrame = null;
        
        // Using a free public CDN video loop for ecological validity
        this.videoSrc = "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4";
    }

    start() {
        this.currentIndex = 0;
        this.sequence = TrialManager.generateTargetSequence(18);
        
        // Init Video
        if (this.videoElem) {
            this.videoElem.src = this.videoSrc;
            this.videoElem.style.display = 'block';
            this.videoElem.playbackRate = 1.0;
            this.videoElem.play().catch(e => console.error("Video autoplay blocked:", e));
        }

        this.logger.setTrialContext(this.trialId, 'passive', this.sequence[this.currentIndex], this.currentIndex, this.sequence);
        this.logger.logEvent('trial_start', { sequence: this.sequence });
        
        this._showNextTarget();
    }

    _showNextTarget() {
        if (this.currentIndex >= this.sequence.length) {
            this._finish();
            return;
        }

        const targetAoi = this.sequence[this.currentIndex];
        this.targetOnsetMs = performance.now();
        this.hasFixated = false;

        this.logger.setTrialContext(this.trialId, 'passive', targetAoi, this.currentIndex, this.sequence);
        this.logger.logEvent('target_changed', { target: targetAoi, targetIndex: this.currentIndex });
        
        this._generateOverlay(targetAoi);
        if (!this.animationFrame) {
            this._renderLoop();
        }

        this.timer = setTimeout(() => {
            this.currentIndex++;
            this._showNextTarget();
        }, this.dwellDurationMs);
    }

    _generateOverlay(targetAoi) {
        if (!this.canvas) return;
        
        const w = window.innerWidth;
        const h = window.innerHeight;
        this.canvas.width = w;
        this.canvas.height = h;
        
        this.targetObj = null;
        
        let tx = w / 2;
        let ty = h / 2;

        if (targetAoi === 'LEFT') { tx = w * 0.15; ty = h * 0.5; }
        else if (targetAoi === 'RIGHT') { tx = w * 0.85; ty = h * 0.5; }
        else if (targetAoi === 'TOP') { tx = w * 0.5; ty = h * 0.15; }
        else if (targetAoi === 'BOTTOM') { tx = w * 0.5; ty = h * 0.85; }

        tx += (Math.random() - 0.5) * 50;
        ty += (Math.random() - 0.5) * 50;

        // The Target over the video (High contrast)
        this.targetObj = { x: tx, y: ty, aoi: targetAoi, color: 'rgba(255, 51, 102, 0.9)', size: 45 };
    }

    _renderLoop() {
        if (!this.ctx) return;
        const w = this.canvas.width;
        const h = this.canvas.height;
        
        this.ctx.clearRect(0, 0, w, h);

        if (this.targetObj) {
            // Draw a high visibility ring so the video plays "inside" it
            this.ctx.beginPath();
            this.ctx.arc(this.targetObj.x, this.targetObj.y, this.targetObj.size, 0, Math.PI * 2);
            this.ctx.strokeStyle = this.targetObj.color;
            this.ctx.lineWidth = 10;
            this.ctx.stroke();
            
            this.ctx.beginPath();
            this.ctx.arc(this.targetObj.x, this.targetObj.y, this.targetObj.size + 15, 0, Math.PI * 2);
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        }

        this.animationFrame = requestAnimationFrame(() => this._renderLoop());
    }

    update(prediction) {
        if (!prediction || this.currentIndex >= this.sequence.length) return;

        const currentAoi = prediction.aoi;
        const targetAoi = this.sequence[this.currentIndex];

        if (currentAoi === targetAoi && !this.hasFixated) {
            this.hasFixated = true;
            const ttff = performance.now() - this.targetOnsetMs;
            this.logger.logEvent('first_fixation', { target: targetAoi, latencyMs: ttff, targetIndex: this.currentIndex });
            this.logger.logEvent('recovery');
        } else if (currentAoi !== targetAoi && currentAoi !== 'UNKNOWN' && currentAoi !== 'CENTER') {
            if (this.hasFixated) {
                this.hasFixated = false;
                this.targetOnsetMs = performance.now();
                this.logger.logEvent('distraction_capture', { distractedAoi: currentAoi, targetIndex: this.currentIndex });
            }
        }
    }

    _finish() {
        if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
        if (this.ctx) this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (this.videoElem) {
            this.videoElem.pause();
            this.videoElem.style.display = 'none';
            this.videoElem.src = "";
        }
        
        this.logger.logEvent('trial_end');
        this.logger.setTrialContext(null, 'idle', null);
        
        if (this.onComplete) {
            this.onComplete();
        }
    }

    abort() {
        if (this.timer) clearTimeout(this.timer);
        if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
        if (this.ctx) this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        if (this.videoElem) {
            this.videoElem.pause();
            this.videoElem.style.display = 'none';
            this.videoElem.src = "";
        }
    }
}
