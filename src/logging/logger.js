

export class DataLogger {
    constructor() {
        this.records = [];  
        this.events = [];  
        this.startTime = performance.now();
        this.currentTrialId = null;
        this.currentTaskMode = 'idle';
        this.activeTargetAoi = null;
        this.activeTargetIndex = 0;
    }

    setTrialContext(trialId, taskMode, targetAoi, targetIndex = 0) {
        this.currentTrialId = trialId;
        this.currentTaskMode = taskMode;
        this.activeTargetAoi = targetAoi;
        this.activeTargetIndex = targetIndex;
    }

    logFrame(data) {
        const record = {
            timestamp: performance.now() - this.startTime,
            trialId: this.currentTrialId,
            taskMode: this.currentTaskMode,
            activeTargetAoi: this.activeTargetAoi,
            activeTargetIndex: this.activeTargetIndex,
            predictedAoi: data.prediction ? data.prediction.aoi : null,
            predictionConfidence: data.prediction ? data.prediction.rawProbability : null,
            facePresent: data.quality.facePresent,
            blink: data.quality.blink,
            validSample: data.quality.validSample,
            features: data.features 
        };
        this.records.push(record);
    }

    logEvent(eventName, payload = {}) {
        const eventRecord = {
            timestamp: performance.now() - this.startTime,
            trialId: this.currentTrialId,
            type: eventName,
            ...payload
        };
        this.events.push(eventRecord);
        console.log(`[EventLogger] ${eventName}`, payload);
    }

    getSummary() {
        const total = this.records.length;
        if (total === 0) return "No records logged.";

        const faces = this.records.filter(r => r.facePresent).length;
        const blinks = this.records.filter(r => r.blink).length;
        const facePercent = ((faces / total) * 100).toFixed(1);

        return `Total Frames: ${total}\nTotal Events: ${this.events.length}\nFace Present: ${faces} (${facePercent}%)\nBlinks Detected: ${blinks}`;
    }

    clear() {
        this.records = [];
        this.events = [];
        this.startTime = performance.now();
        this.currentTrialId = null;
    }
}
