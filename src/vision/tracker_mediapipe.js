/**
 * MediaPipe Face Landmarker Wrapper
 */
import { FaceLandmarker, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3";

export class MediaPipeTracker {
    constructor(config) {
        this.faceLandmarker = null;
        this.config = config;
        this.isInitialized = false;
    }

    async initialize() {
        try {
            const vision = await FilesetResolver.forVisionTasks(
                "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
            );
            
            this.faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
                baseOptions: {
                    modelAssetPath: this.config.vision.modelAssetPath,
                    delegate: "GPU"
                },
                outputFaceBlendshapes: true,
                runningMode: "VIDEO",
                numFaces: 1
            });

            this.isInitialized = true;
            console.log("MediaPipe initialized successfully.");
            return true;
        } catch (error) {
            console.error("Failed to initialize MediaPipe:", error);
            throw error;
        }
    }

    detect(videoElement, timestamp) {
        if (!this.isInitialized || !this.faceLandmarker) return null;
        
        try {
            const results = this.faceLandmarker.detectForVideo(videoElement, timestamp);
            return results;
        } catch (error) {
            console.error("Detection error:", error);
            return null;
        }
    }
}
