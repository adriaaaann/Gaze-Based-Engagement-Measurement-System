
export class QualityMonitor {
    constructor() {
        this.blinkThreshold = 0.2; 
    }

    evaluate(features, rawResults) {
        const result = {
            facePresent: false,
            blink: false,
            validSample: false
        };

        if (!rawResults || !rawResults.faceLandmarks || rawResults.faceLandmarks.length === 0) {
            return result;
        }

        result.facePresent = true;

        if (features) {
            if (features.avgEar < this.blinkThreshold) {
                result.blink = true;
            }

            if (result.facePresent && !result.blink) {
                result.validSample = true;
            }
        }

        return result;
    }
}
