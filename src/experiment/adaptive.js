export class AdaptiveTask {
    constructor(logger, onComplete) {
        this.logger = logger;
        this.onComplete = onComplete;
        
        this.sequence = ['LEFT', 'TOP', 'RIGHT', 'BOTTOM'];
        this.currentIndex = 0;
        this.trialId = `adaptive_${Date.now()}`;
        
        this.targetAoi = null;
        this.consecutiveFrames = 0;
        
        this.requiredHoldFrames = 20; 

        this.isDistracted = false;
        this.gateActiveStartMs = 0;

        this.canvas = document.getElementById('search-canvas');
        this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
        this.animationFrame = null;
        this.distractors = [];
    }

    start() {
        this.currentIndex = 0;
        this.logger.setTrialContext(this.trialId, 'adaptive', this.sequence[this.currentIndex]);
        this.logger.logEvent('trial_start');
        
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

        this.logger.setTrialContext(this.trialId, 'adaptive', this.targetAoi);
        this.logger.logEvent('gate_active', { target: this.targetAoi });
        
        this._generateScene(this.targetAoi);
        if (!this.animationFrame) {
            this._renderLoop();
        }
    }

    _generateScene(targetAoi) {
        if (!this.canvas) return;
        
        const w = window.innerWidth;
        const h = window.innerHeight;
        this.canvas.width = w;
        this.canvas.height = h;
        
        this.distractors = [];
        const aois = ['LEFT', 'TOP', 'RIGHT', 'BOTTOM'];

        for (const aoi of aois) {
            let tx = w / 2;
            let ty = h / 2;

            if (aoi === 'LEFT') { tx = w * 0.15; ty = h * 0.5; }
            else if (aoi === 'RIGHT') { tx = w * 0.85; ty = h * 0.5; }
            else if (aoi === 'TOP') { tx = w * 0.5; ty = h * 0.15; }
            else if (aoi === 'BOTTOM') { tx = w * 0.5; ty = h * 0.85; }

            tx += (Math.random() - 0.5) * 50;
            ty += (Math.random() - 0.5) * 50;

            if (aoi === targetAoi) {
                this.targetObj = { x: tx, y: ty, aoi: aoi, isTarget: true, color: '#ff3366', size: 40 };
            } else {
                const colors = ['#33ccff', '#ffcc00', '#cc33ff', '#33ffcc'];
                this.distractors.push({
                    x: tx, y: ty, aoi: aoi, isTarget: false,
                    color: colors[Math.floor(Math.random() * colors.length)],
                    size: 30 + Math.random() * 20,
                    velocity: (Math.random() - 0.5) * 2 // Slow drift
                });
            }
        }
    }

    _renderLoop() {
        if (!this.ctx) return;
        const w = this.canvas.width;
        const h = this.canvas.height;
        
        this.ctx.clearRect(0, 0, w, h);

        if (this.targetObj) {
            this.ctx.fillStyle = this.targetObj.color;
            this.ctx.beginPath();
            
            let growSize = this.targetObj.size;
            if (this.consecutiveFrames > 0) {
                 growSize += (this.consecutiveFrames / this.requiredHoldFrames) * 15;
            }

            this.ctx.arc(this.targetObj.x, this.targetObj.y, growSize, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 4;
            this.ctx.stroke();
        }

        for (const d of this.distractors) {
            d.y += d.velocity;
            if (d.y < h * 0.1 || d.y > h * 0.9) d.velocity *= -1;

            this.ctx.fillStyle = d.color;
            this.ctx.fillRect(d.x - d.size/2, d.y - d.size/2, d.size, d.size);
        }

        this.animationFrame = requestAnimationFrame(() => this._renderLoop());
    }

    update(prediction) {
        if (!prediction || !this.targetAoi) return;

        const currentAoi = prediction.aoi;

        if (currentAoi === this.targetAoi) {
            if (this.consecutiveFrames === 0) {
                this.logger.logEvent('hold_started', { target: this.targetAoi });
            }

            if (this.isDistracted) {
                this.isDistracted = false;
                this.logger.logEvent('recovery');
            }

            this.consecutiveFrames++;

            if (this.consecutiveFrames >= this.requiredHoldFrames) {
                const latency = performance.now() - this.gateActiveStartMs;
                this.logger.logEvent('target_confirmed', { target: this.targetAoi, unlockLatencyMs: latency });
                this.logger.logEvent('gate_unlocked', { target: this.targetAoi, unlockLatencyMs: latency });
                
                this.currentIndex++;
                this._showNextTarget();
            }
        } else {
            if (this.consecutiveFrames > 0 && currentAoi !== 'UNKNOWN') {
                this.logger.logEvent('hold_broken', { target: this.targetAoi, brokenBy: currentAoi });
                
                if (!this.isDistracted) {
                    this.isDistracted = true;
                    this.logger.logEvent('distraction_capture', { distractedAoi: currentAoi });
                }
                this.consecutiveFrames = 0;
            }
        }
    }

    _finish() {
        if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
        if (this.ctx) this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

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
    }
}
