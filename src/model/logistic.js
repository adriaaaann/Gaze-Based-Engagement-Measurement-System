export class LogisticRegression {
    constructor(learningRate = 0.1, epochs = 1000) {
        this.learningRate = learningRate;
        this.epochs = epochs;
        this.weights = []; 
        this.biases = []; 
        this.classes = []; 
        this.isTrained = false;
    }

    
    _softmax(logits) {
        const maxLogit = Math.max(...logits); 
        const exps = logits.map(l => Math.exp(l - maxLogit));
        const sumExps = exps.reduce((a, b) => a + b, 0);
        return exps.map(e => e / sumExps);
    }

    train(X, y) {
        if (!X || X.length === 0 || !y || X.length !== y.length) return false;

        const numSamples = X.length;
        const numFeatures = X[0].length;
        
        this.classes = [...new Set(y)].sort();
        const numClasses = this.classes.length;

        this.weights = Array.from({ length: numClasses }, () => Array(numFeatures).fill(0));
        this.biases = Array(numClasses).fill(0);

        const Y_onehot = y.map(label => {
            const index = this.classes.indexOf(label);
            const encoded = Array(numClasses).fill(0);
            encoded[index] = 1;
            return encoded;
        });

        for (let epoch = 0; epoch < this.epochs; epoch++) {
            let dw = Array.from({ length: numClasses }, () => Array(numFeatures).fill(0));
            let db = Array(numClasses).fill(0);

            for (let i = 0; i < numSamples; i++) {
                const logits = [];
                for (let c = 0; c < numClasses; c++) {
                    let score = this.biases[c];
                    for (let f = 0; f < numFeatures; f++) {
                        score += this.weights[c][f] * X[i][f];
                    }
                    logits.push(score);
                }

                const probs = this._softmax(logits);

                for (let c = 0; c < numClasses; c++) {
                    const error = probs[c] - Y_onehot[i][c];
                    db[c] += error;
                    for (let f = 0; f < numFeatures; f++) {
                        dw[c][f] += error * X[i][f];
                    }
                }
            }

            for (let c = 0; c < numClasses; c++) {
                this.biases[c] -= (this.learningRate / numSamples) * db[c];
                for (let f = 0; f < numFeatures; f++) {
                    this.weights[c][f] -= (this.learningRate / numSamples) * dw[c][f];
                }
            }
        }

        this.isTrained = true;
        return true;
    }

    predict(features) {
        if (!this.isTrained) return null;

        const logits = [];
        for (let c = 0; c < this.classes.length; c++) {
            let score = this.biases[c];
            for (let f = 0; f < features.length; f++) {
                score += this.weights[c][f] * features[f];
            }
            logits.push(score);
        }

        const probs = this._softmax(logits);
        
        let maxIdx = 0;
        let maxProb = probs[0];
        for (let i = 1; i < probs.length; i++) {
            if (probs[i] > maxProb) {
                maxProb = probs[i];
                maxIdx = i;
            }
        }

        return {
            classAoi: this.classes[maxIdx],
            probability: maxProb,
            allProbabilities: Object.fromEntries(this.classes.map((cls, idx) => [cls, probs[idx]]))
        };
    }
}
