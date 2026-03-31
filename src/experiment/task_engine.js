import { VideoPassiveTask } from './passive/video_task.js';
import { VideoAdaptiveSearchTask } from './adaptive/video_search_task.js';

export class TaskEngine {
    constructor(logger) {
        this.logger = logger;
        this.activeTask = null;
        this.statusText = document.getElementById('task-engine-status');

        this.hudPredicted = document.getElementById('hud-predicted-aoi');
        this.hudConf = document.getElementById('hud-confidence');
        this.hudTarget = document.getElementById('hud-active-target');
        this.hudProgress = document.getElementById('hud-hold-progress');
    }

    startPassive() {
        if (this.activeTask) this.activeTask.abort();
        if (this.statusText) this.statusText.textContent = "Running: Passive Video Trial (Watch naturally)";
        
        this.activeTask = new VideoPassiveTask(this.logger, () => {
            if (this.statusText) this.statusText.textContent = "Passive Trial Complete.";
            this.activeTask = null;
        });
        
        this.activeTask.start();
    }

    startAdaptive() {
        if (this.activeTask) this.activeTask.abort();
        if (this.statusText) this.statusText.textContent = "Running: Adaptive Video Search (Look to unlock gates)";
        
        this.activeTask = new VideoAdaptiveSearchTask(this.logger, () => {
            if (this.statusText) this.statusText.textContent = "Adaptive Trial Complete.";
            this.activeTask = null;
        });
        
        this.activeTask.start();
    }

    update(prediction) {
        this._updateHud(prediction);

        if (this.activeTask) {
            this.activeTask.update(prediction);
        }
    }

    _updateHud(prediction) {
        if (!prediction) {
            if (this.hudPredicted) this.hudPredicted.textContent = "Predicted: None";
            if (this.hudConf) this.hudConf.textContent = "Confidence: 0%";
            return;
        }

        if (this.hudPredicted) this.hudPredicted.textContent = `Predicted: ${prediction.aoi}`;
        
        let confPercent = 0;
        if (prediction.allProbabilities && prediction.aoi !== 'UNKNOWN') {
             confPercent = (prediction.allProbabilities[prediction.aoi] * 100).toFixed(1);
        } else if (prediction.rawProbability) {
             confPercent = (prediction.rawProbability * 100).toFixed(1);
        }
        
        if (this.hudConf) this.hudConf.textContent = `Confidence: ${confPercent}%`;

        if (this.activeTask) {
            if (this.hudTarget) {
                const targetText = this.activeTask.targetAoi || this.activeTask.sequence[this.activeTask.currentIndex] || 'N/A';
                const progressText = ` (${this.activeTask.currentIndex + 1}/${this.activeTask.sequence.length})`;
                this.hudTarget.textContent = `Active Target: ${targetText}${progressText}`;
            }
            
            if (this.activeTask.consecutiveFrames !== undefined && this.activeTask.requiredHoldFrames !== undefined) {
                const prog = Math.min(100, Math.round((this.activeTask.consecutiveFrames / this.activeTask.requiredHoldFrames) * 100));
                if (this.hudProgress) this.hudProgress.textContent = `Hold Progress: ${prog}%`;
            } else if (this.activeTask.dwellDurationMs) {
                const elapsed = performance.now() - this.activeTask.targetOnsetMs;
                const remaining = Math.max(0, this.activeTask.dwellDurationMs - elapsed);
                if (this.hudProgress) this.hudProgress.textContent = `Remaining: ${(remaining / 1000).toFixed(1)}s`;
            } else {
                if (this.hudProgress) this.hudProgress.textContent = `Hold Progress: N/A`;
            }
        } else {
            if (this.hudTarget) this.hudTarget.textContent = `Active Target: N/A`;
            if (this.hudProgress) this.hudProgress.textContent = `Progress: N/A`;
        }
    }

    abort() {
        if (this.activeTask) {
            this.activeTask.abort();
            this.activeTask = null;
        }
        if (this.statusText) this.statusText.textContent = "Task Aborted.";
    }
}
