export class ValidationManager {
    constructor(gazeModel) {
        this.gazeModel = gazeModel;
        this.points = [];
        this.currentIndex = 0;
        this.isValidating = false;
        this.isRecordingPoint = false;

        
        this.dwellTimeMs = 400; 
        this.samplesPerPoint = 30; 
        this.currentSampleCount = 0;
        
        this.currentPointMatches = [];
        this.allMatches = [];

       
        this.dotElement = null;
        this._createDot();
    }

    _createDot() {
        this.dotElement = document.createElement('div');
        this.dotElement.id = 'valid-dot';
        this.dotElement.style.position = 'absolute';
        this.dotElement.style.width = '20px';
        this.dotElement.style.height = '20px';
        this.dotElement.style.borderRadius = '50%';
        this.dotElement.style.backgroundColor = 'blue'; 
        this.dotElement.style.transform = 'translate(-50%, -50%)';
        this.dotElement.style.display = 'none';
        this.dotElement.style.zIndex = '9998';
        this.dotElement.style.transition = 'top 0.2s, left 0.2s';
        document.body.appendChild(this.dotElement);
    }

    generateRegions() {
        this.points = [];
        const w = window.innerWidth;
        const h = window.innerHeight;
        
       
        this.points = [
            { label: 'CENTER', x: w * 0.5, y: h * 0.5 },
            { label: 'TOP', x: w * 0.5, y: h * 0.2 },
            { label: 'BOTTOM', x: w * 0.5, y: h * 0.8 },
            { label: 'LEFT', x: w * 0.2, y: h * 0.5 },
            { label: 'RIGHT', x: w * 0.8, y: h * 0.5 }
        ];
    }

    start(onCompleteCallback) {
        this.generateRegions();
        this.currentIndex = 0;
        this.allMatches = [];
        this.isValidating = true;
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
        
        this.currentPointMatches = [];
        this.isRecordingPoint = false;
        this.currentSampleCount = 0;

        setTimeout(() => {
            this.isRecordingPoint = true;
        }, this.dwellTimeMs);
    }

    recordSample(features) {
        if (!this.isValidating || !this.isRecordingPoint) return;

        const point = this.points[this.currentIndex];
        const prediction = this.gazeModel.predict(features);

        if (prediction) {
            const isMatch = (prediction.aoi === point.label);
            this.currentPointMatches.push(isMatch ? 1 : 0);
        }
        
        this.currentSampleCount++;
        
        if (this.currentSampleCount >= this.samplesPerPoint) {
            this.allMatches.push(...this.currentPointMatches);

            this.isRecordingPoint = false;
            this.currentIndex++;
            this._showNextPoint();
        }
    }

    _finish() {
        this.isValidating = false;
        this.dotElement.style.display = 'none';

        let accuracy = 0;
        if (this.allMatches.length > 0) {
            const correctVotes = this.allMatches.reduce((a, b) => a + b, 0);
            accuracy = (correctVotes / this.allMatches.length) * 100.0;
        }

        const results = { accuracy, rawMatches: this.allMatches };

        if (this.onComplete) {
            this.onComplete(results);
        }
    }
}
