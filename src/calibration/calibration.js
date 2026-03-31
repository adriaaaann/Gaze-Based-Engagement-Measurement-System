export class CalibrationManager {
    constructor() {
        this.points = [];
        this.currentIndex = 0;
        this.isCalibrating = false;
        this.isRecordingPoint = false;
        
        
        this.dwellTimeMs = 400;
        this.baseSamplesPerPoint = 60; 
        this.edgeRowSamplesPerPoint = 80; 
        this.currentSampleCount = 0;
        this.currentTargetSamples = 60;
        
        
        this.pointFeatureBuffer = [];

        
        this.dotElement = null;
        this._createDot();
    }

    _createDot() {
        this.dotElement = document.createElement('div');
        this.dotElement.id = 'calib-dot';
        this.dotElement.style.position = 'absolute';
        this.dotElement.style.width = '30px';
        this.dotElement.style.height = '30px';
        this.dotElement.style.borderRadius = '50%';
        this.dotElement.style.backgroundColor = 'red';
        this.dotElement.style.transform = 'translate(-50%, -50%)';
        this.dotElement.style.display = 'none';
        this.dotElement.style.zIndex = '9999';
        this.dotElement.style.transition = 'top 0.2s, left 0.2s';
        document.body.appendChild(this.dotElement);
    }

    setRegions() {
        this.points = [];
        const w = window.innerWidth;
        const h = window.innerHeight;
        
        this.points = [
            { label: 'CENTER', x: w * 0.5, y: h * 0.5, isEdgeRow: false },
            { label: 'TOP', x: w * 0.5, y: h * 0.1, isEdgeRow: true },
            { label: 'BOTTOM', x: w * 0.5, y: h * 0.9, isEdgeRow: true },
            { label: 'LEFT', x: w * 0.1, y: h * 0.5, isEdgeRow: false },
            { label: 'RIGHT', x: w * 0.9, y: h * 0.5, isEdgeRow: false }
        ];
    }

    start(onCompleteCallback) {
        this.setRegions();
        this.currentIndex = 0;
        this.isCalibrating = true;
        this.onComplete = onCompleteCallback;
        this.dotElement.style.display = 'block';
        this._showNextPoint();
    }

    _showNextPoint() {
        if (this.currentIndex >= this.points.length) {
            this._finish();
            return;
        }

        const point = this.points[this.currentIndex];
        this.dotElement.style.left = `${point.x}px`;
        this.dotElement.style.top = `${point.y}px`;
        
        this.currentTargetSamples = point.isEdgeRow ? this.edgeRowSamplesPerPoint : this.baseSamplesPerPoint;
        
        this.isRecordingPoint = false;
        this.currentSampleCount = 0;
        this.pointFeatureBuffer = [];

        setTimeout(() => {
            this.isRecordingPoint = true;
        }, this.dwellTimeMs);
    }

    recordSample(features, dataset) {
        if (!this.isCalibrating || !this.isRecordingPoint) return;

        this.pointFeatureBuffer.push(features);
        this.currentSampleCount++;
        
        if (this.currentSampleCount >= this.currentTargetSamples) {
            this.isRecordingPoint = false;
            
           
            const point = this.points[this.currentIndex];
            const medianVector = this._calculateMedianVector(this.pointFeatureBuffer);
            
            
            dataset.addSample(medianVector, point.label);
            
            this.currentIndex++;
            this._showNextPoint();
        }
    }

    _calculateMedianVector(buffer) {
        if (buffer.length === 0) return [];
        const numFeatures = buffer[0].length;
        const medianVec = new Array(numFeatures).fill(0);

        for (let i = 0; i < numFeatures; i++) {
           
            const columnValues = buffer.map(vec => vec[i]).sort((a, b) => a - b);
            
            const half = Math.floor(columnValues.length / 2);
            if (columnValues.length % 2 === 0) {
                medianVec[i] = (columnValues[half - 1] + columnValues[half]) / 2.0;
            } else {
                medianVec[i] = columnValues[half];
            }
        }
        return medianVec;
    }

    _finish() {
        this.isCalibrating = false;
        this.dotElement.style.display = 'none';
        if (this.onComplete) {
            this.onComplete();
        }
    }
}
