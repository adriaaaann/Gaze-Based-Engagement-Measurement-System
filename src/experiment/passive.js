export class PassiveTask {
    constructor(logger, onComplete) {
        this.logger = logger;
        this.onComplete = onComplete;
        
        this.sequence = ['LEFT', 'TOP', 'RIGHT', 'BOTTOM'];
        this.currentIndex = 0;
        this.trialId = `passive_${Date.now()}`;
        
        this.dwellDurationMs = 3000; 
        this.timer = null;
        this.targetOnsetMs = 0;
        this.hasFixated = false;
        
        this.canvas = document.getElementById('search-canvas');
        this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
        this.animationFrame = null;
        this.distractors = [];
    }

    start() {
        this.currentIndex = 0;
        this.logger.setTrialContext(this.trialId, 'passive', this.sequence[this.currentIndex]);
        this.logger.logEvent('trial_start');
        
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

        this.logger.setTrialContext(this.trialId, 'passive', targetAoi);
        this.logger.logEvent('target_changed', { target: targetAoi });
        
        this._generateScene(targetAoi);
        if (!this.animationFrame) {
            this._renderLoop();
        }

        this.timer = setTimeout(() => {
            this.currentIndex++;
            this._showNextTarget();
        }, this.dwellDurationMs);
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

        // Draw Target (`Waldo`)
        if (this.targetObj) {
            this.ctx.fillStyle = this.targetObj.color;
            this.ctx.beginPath();
            this.ctx.arc(this.targetObj.x, this.targetObj.y, this.targetObj.size, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 4;
            this.ctx.stroke();
        }

        // Draw Distractors (drifting)
        for (const d of this.distractors) {
            d.y += d.velocity;
            // Simple bounce constraints
            if (d.y < h * 0.1 || d.y > h * 0.9) d.velocity *= -1;

            this.ctx.fillStyle = d.color;
            this.ctx.fillRect(d.x - d.size/2, d.y - d.size/2, d.size, d.size);
        }

        this.animationFrame = requestAnimationFrame(() => this._renderLoop());
    }

    // Called every frame by Task Engine
    update(prediction) {
        if (!prediction || this.currentIndex >= this.sequence.length) return;

        const currentAoi = prediction.aoi;
        const targetAoi = this.sequence[this.currentIndex];

        if (currentAoi === targetAoi && !this.hasFixated) {
            this.hasFixated = true;
            const ttff = performance.now() - this.targetOnsetMs;
            this.logger.logEvent('first_fixation', { target: targetAoi, latencyMs: ttff });
            this.logger.logEvent('recovery');
        } else if (currentAoi !== targetAoi && currentAoi !== 'UNKNOWN' && currentAoi !== 'CENTER') {
            // Very noisy capture check (we let real Distraction metrics handle strict counts)
            if (this.hasFixated) {
                this.hasFixated = false;
                this.targetOnsetMs = performance.now(); // Reset latency counter for the Re-Fixation
                this.logger.logEvent('distraction_capture', { distractedAoi: currentAoi });
            }
        }
    }

    _finish() {
        if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
        if (this.ctx) this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
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
    }
}
