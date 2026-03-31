//Best way to do eye tracking method so far (#3)
export class CalibrationDataset {
    constructor() {
        this.X = []; 
        this.y = []; 
    }

    addSample(features, label) {
       
        const featureVector = [...features, 1.0];
        
        this.X.push(featureVector);
        this.y.push(label);
    }

    getDataset() {
        return { X: this.X, y: this.y };
    }

    clear() {
        this.X = [];
        this.y = [];
    }
}
