
export class FeatureExtractor {
    constructor() {
        
        this.indices = {
            leftEye: {
                
                contour: [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246],
                
                top: 159, bottom: 145, left: 33, right: 133,
                
                iris: [468, 469, 470, 471, 472]
            },
            rightEye: {
                contour: [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398],
                top: 386, bottom: 374, left: 362, right: 263,
                iris: [473, 474, 475, 476, 477]
            },
            nose: 1 
        };
    }

    extract(landmarks) {
        if (!landmarks || landmarks.length === 0) return null;
        const face = landmarks[0]; 
        
        
        const leftEar = this._calculateAspect(face, this.indices.leftEye);
        const rightEar = this._calculateAspect(face, this.indices.rightEye);
        
        
        const leftIris = this._computeIrisStatus(face, this.indices.leftEye.contour, this.indices.leftEye.iris);
        const rightIris = this._computeIrisStatus(face, this.indices.rightEye.contour, this.indices.rightEye.iris);
        
        
        const headMotion = this._estimateHeadMotion(face);

     
        const features = [
            rightIris.u, rightIris.v,
            leftIris.u, leftIris.v,
            headMotion.x, headMotion.y
        ];

        return {
            features: features, 
            leftEar,
            rightEar,
            avgEar: (leftEar + rightEar) / 2.0
        };
    }

    _calculateAspect(face, idxs) {
        const top = face[idxs.top];
        const bottom = face[idxs.bottom];
        const left = face[idxs.left];
        const right = face[idxs.right];

        const vertDist = Math.hypot(top.x - bottom.x, top.y - bottom.y);
        const horizDist = Math.hypot(left.x - right.x, left.y - right.y);

        return vertDist / (horizDist + 1e-6);
    }

    _computeIrisStatus(face, contourIndices, irisIndices) {
        let xmin = Infinity, xmax = -Infinity, ymin = Infinity, ymax = -Infinity;
        
        for (const idx of contourIndices) {
            const pt = face[idx];
            if (pt.x < xmin) xmin = pt.x;
            if (pt.x > xmax) xmax = pt.x;
            if (pt.y < ymin) ymin = pt.y;
            if (pt.y > ymax) ymax = pt.y;
        }

        let cx = 0, cy = 0;
        for (const idx of irisIndices) {
            cx += face[idx].x;
            cy += face[idx].y;
        }
        cx /= irisIndices.length;
        cy /= irisIndices.length;

        if (xmax === xmin) xmax = xmin + 1e-6;
        if (ymax === ymin) ymax = ymin + 1e-6;

        let u = (cx - xmin) / (xmax - xmin);
        let v = (cy - ymin) / (ymax - ymin);
        
        u = Math.max(0.0, Math.min(u, 1.0));
        v = Math.max(0.0, Math.min(v, 1.0));

        return { u, v, cx, cy };
    }

    _estimateHeadMotion(face) {
        const nose = face[this.indices.nose];
        
        const pLeft = face[this.indices.leftEye.left];
        const pRight = face[this.indices.rightEye.right];
        
        const eyeMidpointX = (pLeft.x + pRight.x) / 2.0;
        const eyeMidpointY = (pLeft.y + pRight.y) / 2.0;
        
        return {
            x: nose.x - eyeMidpointX,
            y: nose.y - eyeMidpointY
        };
    }
}
