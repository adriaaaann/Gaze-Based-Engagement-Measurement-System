//best eye tracking result

import { LogisticRegression } from './logistic.js';

export class GazeModel {
    constructor() {
        this.model = new LogisticRegression(0.05, 500);
        this.isTrained = false;
        
        
        this.mean = null;
        this.std = null;

      
        this.historySize = 5;
        this.predictionHistory = [];
        this.activeAoi = 'UNKNOWN';
    }

    _computeNormalizationParams(X) {
        const numSamples = X.length;
        const numFeatures = X[0].length;
        
        this.mean = new Array(numFeatures).fill(0);
        this.std = new Array(numFeatures).fill(0);

        for (let i = 0; i < numSamples; i++) {
            for (let j = 0; j < numFeatures; j++) {
                this.mean[j] += X[i][j];
            }
        }
        for (let j = 0; j < numFeatures; j++) {
            this.mean[j] /= numSamples;
        }

        for (let i = 0; i < numSamples; i++) {
            for (let j = 0; j < numFeatures; j++) {
                this.std[j] += Math.pow(X[i][j] - this.mean[j], 2);
            }
        }
        for (let j = 0; j < numFeatures; j++) {
            this.std[j] = Math.sqrt(this.std[j] / numSamples);
            if (this.std[j] === 0) this.std[j] = 1e-6; 
        }
    }

    _normalize(X) {
        return X.map(row => 
            row.map((val, j) => {
             
                if (j === row.length - 1 && val === 1.0) return 1.0;
                return (val - this.mean[j]) / this.std[j];
            })
        );
    }

    train(dataset) {
        
        const { X, y } = dataset.getDataset();
        if (X.length === 0) return false;

        console.log(`Training Logistic Classifier with ${X.length} samples. Feature vector size: ${X[0].length}`);

      
        this._computeNormalizationParams(X);
        const X_norm = this._normalize(X);

        try {
            const success = this.model.train(X_norm, y);
            if (success) {
                this.isTrained = true;
                console.log(`Model trained. Classes identified: ${this.model.classes.join(', ')}`);
                return true;
            }
            return false;
        } catch (error) {
            console.error("Training failed:", error);
            return false;
        }
    }

    predictRaw(features) {
        if (!this.isTrained) return null;

       
        const queryVector = [...features, 1.0];
        
       
        const normalizedQuery = this._normalize([queryVector])[0];

        try {
            return this.model.predict(normalizedQuery);
        } catch (error) {
            console.error("Prediction failed:", error);
            return null;
        }
    }

    predict(features) {
        const rawPrediction = this.predictRaw(features);
        if (!rawPrediction) return null;

       
        this.predictionHistory.push(rawPrediction.classAoi);
        if (this.predictionHistory.length > this.historySize) {
            this.predictionHistory.shift();
        }

      
        const counts = {};
        for (const aoi of this.predictionHistory) {
            counts[aoi] = (counts[aoi] || 0) + 1;
        }

        
        let majorityAoi = this.activeAoi;
        let maxCount = 0;
        for (const [aoi, count] of Object.entries(counts)) {
            if (count > maxCount) {
                maxCount = count;
                majorityAoi = aoi;
            }
        }

     
        if (majorityAoi !== this.activeAoi && maxCount >= Math.floor(this.historySize / 2) + 1) {
            this.activeAoi = majorityAoi;
        }

        return {
            aoi: this.activeAoi,
            rawProbability: rawPrediction.probability,
            rawAoi: rawPrediction.classAoi,
            allProbabilities: rawPrediction.allProbabilities
        };
    }
}
