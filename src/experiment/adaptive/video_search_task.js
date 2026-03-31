import { TrialManager } from '../trials.js';

export class VideoAdaptiveSearchTask {
    constructor(logger, onComplete) {
        this.logger = logger;
        this.onComplete = onComplete;
        
        // Sequence requirements
        this.sequence = [];
        this.currentIndex = 0;
        this.trialId = `adaptive_video_${Date.now()}`;
        
        // Fixation Gating Logic
        this.targetAoi = null;
        this.consecutiveFrames = 0;
        this.requiredHoldFrames = 20; // ~660ms

        // State tracking
        this.isDistracted = false;
        this.gateActiveStartMs = 0;
        this.firstCorrectHitTime = null;

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

        this.logger.setTrialContext(this.trialId, 'adaptive', this.sequence[this.currentIndex], this.currentIndex, this.sequence);
        this.logger.logEvent('trial_start', { sequence: this.sequence });
        
        this._showNextTarget();
    }

    _showNextTarget() {
        if (this.currentIndex >= this.sequence.length) {
            this._finish();
            return;
        }

        this.targetAoi = this.sequence[this.currentIndex];
        this.consecutiveFrames = 0;
        this.isDistracted = false;
        this.gateActiveStartMs = performance.now();
        this.firstCorrectHitTime = null;

        this.logger.setTrialContext(this.trialId, 'adaptive', this.targetAoi, this.currentIndex, this.sequence);
        this.logger.logEvent('gate_active', { target: this.targetAoi, targetIndex: this.currentIndex });
        
        this._generateOverlay(this.targetAoi);
        if (!this.animationFrame) {
            this._renderLoop();
        }
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
        this.targetObj = { x: tx, y: ty, aoi: targetAoi, color: 'rgba(51, 204, 255, 0.9)', size: 45 };
    }

    _renderLoop() {
        if (!this.ctx) return;
        const w = this.canvas.width;
        const h = this.canvas.height;
        
        this.ctx.clearRect(0, 0, w, h);

        if (this.targetObj) {
            // Draw a high visibility ring so the video plays "inside" it
            this.ctx.beginPath();
            
            // Visual feedback as gate charges
            let growSize = this.targetObj.size;
            if (this.consecutiveFrames > 0) {
                 growSize += (this.consecutiveFrames / this.requiredHoldFrames) * 20;
            }

            this.ctx.arc(this.targetObj.x, this.targetObj.y, growSize, 0, Math.PI * 2);
            this.ctx.strokeStyle = this.targetObj.color;
            this.ctx.lineWidth = 10;
            this.ctx.stroke();
            
            this.ctx.beginPath();
            this.ctx.arc(this.targetObj.x, this.targetObj.y, growSize + 15, 0, Math.PI * 2);
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        }

        this.animationFrame = requestAnimationFrame(() => this._renderLoop());
    }

    update(prediction) {
        if (!prediction || !this.targetAoi) return;

        const currentAoi = prediction.aoi;

        if (currentAoi === this.targetAoi) {
            if (this.firstCorrectHitTime === null) {
                this.firstCorrectHitTime = performance.now();
                const ttff = this.firstCorrectHitTime - this.gateActiveStartMs;
                this.logger.logEvent('first_fixation', { target: this.targetAoi, latencyMs: ttff, targetIndex: this.currentIndex });
            }

            if (this.consecutiveFrames === 0) {
                this.logger.logEvent('hold_started', { target: this.targetAoi, targetIndex: this.currentIndex });
            }

            if (this.isDistracted) {
                this.isDistracted = false;
                this.logger.logEvent('recovery');
            }

            this.consecutiveFrames++;

            if (this.consecutiveFrames >= this.requiredHoldFrames) {
                const latency = performance.now() - this.gateActiveStartMs;
                this.logger.logEvent('target_confirmed', { target: this.targetAoi, unlockLatencyMs: latency, targetIndex: this.currentIndex });
                this.logger.logEvent('gate_unlocked', { target: this.targetAoi, unlockLatencyMs: latency, targetIndex: this.currentIndex });
                
                this.currentIndex++;
                this._showNextTarget();
            }
        } else {
            if (this.consecutiveFrames > 0 && currentAoi !== 'UNKNOWN') {
                this.logger.logEvent('hold_broken', { target: this.targetAoi, brokenBy: currentAoi, targetIndex: this.currentIndex });
                
                if (!this.isDistracted) {
                    this.isDistracted = true;
                    this.logger.logEvent('distraction_capture', { distractedAoi: currentAoi, targetIndex: this.currentIndex });
                }
                this.consecutiveFrames = 0;
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

        this.logger.logEvent('task_complete');
        this.logger.logEvent('trial_end');
        this.logger.setTrialContext(null, 'idle', null);
        
        if (this.onComplete) {
            this.onComplete();
        }
    }

    abort() {
        if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
        if (this.ctx) this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (this.videoElem) {
            this.videoElem.pause();
            this.videoElem.style.display = 'none';
            this.videoElem.src = "";
        }
    }
}
