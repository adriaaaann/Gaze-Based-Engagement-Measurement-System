import { config } from './config.js';
import { Router } from './router.js';
import { CameraManager } from '../vision/camera.js';
import { MediaPipeTracker } from '../vision/tracker_mediapipe.js';
import { FeatureExtractor } from '../vision/features.js';
import { QualityMonitor } from '../vision/quality.js';
import { DataLogger } from '../logging/logger.js';

import { CalibrationDataset } from '../calibration/dataset.js';
import { CalibrationManager } from '../calibration/calibration.js';
import { ValidationManager } from '../calibration/validation.js';
import { GazeModel } from '../model/gaze_model.js';

import { TaskEngine } from '../experiment/task_engine.js';
import { DataExporter } from '../logging/export.js';
import { MetricsEngine } from '../experiment/metrics.js';

class App {
    constructor() {
        this.router = new Router();
        this.camera = new CameraManager('webcam');
        this.tracker = new MediaPipeTracker(config);
        this.features = new FeatureExtractor();
        this.quality = new QualityMonitor();
        this.logger = new DataLogger();

        this.dataset = new CalibrationDataset();
        this.gazeModel = new GazeModel();
        this.calibration = new CalibrationManager();
        this.validation = new ValidationManager(this.gazeModel);

        this.taskEngine = new TaskEngine(this.logger);
        this.exporter = new DataExporter(this.logger);

        this.frameId = null;
        this.lastVideoTime = -1;
        
      
        this.state = 'idle';

        // UI Elements and stuff
        this.debugLog = document.getElementById('debug-log');
        this.aoiOverlay = document.getElementById('gaze-cursor');
        
        this._setupAoiOverlay();
    }

    async init() {
        try {
            this.router.navigate('screen-start');

            document.getElementById('btn-start').addEventListener('click', () => {
                this.startSystem();
            });

            
            document.getElementById('btn-run-passive').addEventListener('click', () => {
                this.taskEngine.startPassive();
            });
            document.getElementById('btn-run-adaptive').addEventListener('click', () => {
                this.taskEngine.startAdaptive();
            });
            document.getElementById('btn-show-report').addEventListener('click', () => {
                this.showResultsReport();
            });
            document.getElementById('btn-export-data').addEventListener('click', () => {
                this.exporter.exportAll();
            });
            document.getElementById('btn-restart').addEventListener('click', () => {
                this.router.navigate('screen-task');
            });

        } catch (error) {
            console.error("Initialization error:", error);
            this.updateDebug(`Init Error: ${error.message}`);
        }
    }

    async startSystem() {
        try {
            this.router.navigate('screen-calibration');
            this.updateDebug("Initializing components...");
            
            await this.camera.start();
            this.updateDebug("Camera started. Loading MediaPipe...");
            
            await this.tracker.initialize();
            this.updateDebug("System ready. Starting loop...");
            
            document.getElementById('calib-status').textContent = "System active. Align face.";
            
            // Button to enable calliba
            const btnBeginCalib = document.getElementById('btn-begin-calib');
            btnBeginCalib.disabled = false;
            btnBeginCalib.addEventListener('click', () => {
                this.runCalibrationSequence();
            });

           
            this.loop();
        } catch (error) {
            console.error("Startup error:", error);
            this.updateDebug(`Startup Error: ${error.message}`);
        }
    }

    loop() {
        const video = this.camera.getVideoElement();
        
        if (video.currentTime !== this.lastVideoTime) {
            this.lastVideoTime = video.currentTime;
            const startTimeMs = performance.now();
            
            // Laandmarks be detected
            const results = this.tracker.detect(video, startTimeMs);
            
            if (results && results.faceLandmarks && results.faceLandmarks.length > 0) {
                // features be extracted
                const feats = this.features.extract(results.faceLandmarks);
                
                // quality be checked 
                const qual = this.quality.evaluate(feats, results);
                
                
                const prediction = this.gazeModel.predict(feats.features);

                // 5. Logg be logg
                this.logger.logFrame({ features: feats, quality: qual, prediction: prediction });
                
                
                if (qual.validSample) {
                    if (this.state === 'calibration') {
                        
                        this.calibration.recordSample(feats.features, this.dataset);
                    } 
                    else if (this.state === 'validation') {
                        
                        this.validation.recordSample(feats.features);
                        this._updateAoiOverlay(feats.features);
                    }
                    else if (this.state === 'tracking') {
                        
                        this._updateAoiOverlay(feats.features);
                        this.taskEngine.update(prediction);
                    }
                }

                // Updated UI, max distraction
                this.updateDebug(
                    `FPS: ${(1000 / (performance.now() - startTimeMs)).toFixed(1)}\n` +
                    `Face Present: ${qual.facePresent}\n` +
                    `Blink: ${qual.blink}\n` +
                    `Valid Sample: ${qual.validSample}\n` +
                    `Gaze [uR,vR,uL,vL]: ${feats.features.slice(0,4).map(f => f.toFixed(3)).join(', ')}\n` +
                    `Head [X,Y]: ${feats.features.slice(4,6).map(f => f.toFixed(3)).join(', ')}\n` +
                    `Total Frames Logged: ${this.logger.records.length}`
                );
            } else {
                this.updateDebug("No face detected.");
            }
        }
        
        this.frameId = requestAnimationFrame(() => this.loop());
    }

    updateDebug(msg) {
        if (this.debugLog) {
            this.debugLog.textContent = msg;
        }
    }

  

    _setupAoiOverlay() {
        if (this.aoiOverlay) {
            this.aoiOverlay.style.position = 'absolute';
            this.aoiOverlay.style.border = '4px solid rgba(0, 255, 100, 0.8)';
            this.aoiOverlay.style.backgroundColor = 'rgba(0, 255, 100, 0.2)';
            this.aoiOverlay.style.display = 'none';
            this.aoiOverlay.style.zIndex = '9997';
            this.aoiOverlay.style.pointerEvents = 'none';
            this.aoiOverlay.style.transition = 'all 0.1s ease';
            this.aoiOverlay.style.transform = '';
            this.aoiOverlay.style.borderRadius = '0';
        }
    }

    _updateAoiOverlay(features) {
        if (!this.aoiOverlay) return;
        if (!this.gazeModel.isTrained) return;

        const pred = this.gazeModel.predict(features);

        if (pred) {
            if (this.aoiOverlay.style.display === 'none') {
                this.aoiOverlay.style.display = 'block';
            }
            
            const w = window.innerWidth;
            const h = window.innerHeight;
            
            // AOIs figured out
            if (pred.aoi === 'CENTER') {
                this.aoiOverlay.style.left = `${w * 0.3}px`;
                this.aoiOverlay.style.top = `${h * 0.3}px`;
                this.aoiOverlay.style.width = `${w * 0.4}px`;
                this.aoiOverlay.style.height = `${h * 0.4}px`;
            } else if (pred.aoi === 'TOP') {
                this.aoiOverlay.style.left = '0px';
                this.aoiOverlay.style.top = '0px';
                this.aoiOverlay.style.width = `${w}px`;
                this.aoiOverlay.style.height = `${h * 0.3}px`;
            } else if (pred.aoi === 'BOTTOM') {
                this.aoiOverlay.style.left = '0px';
                this.aoiOverlay.style.top = `${h * 0.7}px`;
                this.aoiOverlay.style.width = `${w}px`;
                this.aoiOverlay.style.height = `${h * 0.3}px`;
            } else if (pred.aoi === 'LEFT') {
                this.aoiOverlay.style.left = '0px';
                this.aoiOverlay.style.top = `${h * 0.3}px`;
                this.aoiOverlay.style.width = `${w * 0.3}px`;
                this.aoiOverlay.style.height = `${h * 0.4}px`;
            } else if (pred.aoi === 'RIGHT') {
                this.aoiOverlay.style.left = `${w * 0.7}px`;
                this.aoiOverlay.style.top = `${h * 0.3}px`;
                this.aoiOverlay.style.width = `${w * 0.3}px`;
                this.aoiOverlay.style.height = `${h * 0.4}px`;
            } else {
                this.aoiOverlay.style.display = 'none';
            }
        }
    }

    runCalibrationSequence() {
        document.getElementById('calib-instructions').style.display = 'none';
        this.dataset.clear();
        this.state = 'calibration';

        this.calibration.start(() => {
            console.log("Calibration points collected. Training model...");
            const success = this.gazeModel.train(this.dataset);
            
            if (success) {
                console.log("Model trained successfully. Starting validation...");
                this.runValidationSequence();
            } else {
                console.error("Model training failed.");
                this.state = 'idle';
                document.getElementById('calib-instructions').style.display = 'block';
                document.getElementById('calib-status').textContent = "Calibration failed. Try again.";
            }
        });
    }

    runValidationSequence() {
        this.state = 'validation';
        console.log("Starting validation sequence...");

        document.getElementById('calib-status').textContent = "Validation: look at the blue dots.";
        document.getElementById('calib-instructions').style.display = 'block';

        setTimeout(() => {
            document.getElementById('calib-instructions').style.display = 'none';
            this.validation.start((results) => {
                console.log("Validation complete:", results);
                this.state = 'tracking';
                
                this.router.navigate('screen-results');
                
                const resultsDiv = document.getElementById('results-summary');
                resultsDiv.innerHTML = `
                    <h3>Calibration Complete</h3>
                    <p>Classification Accuracy: ${results.accuracy.toFixed(1)}%</p>
                `;
                
                setTimeout(() => {
                    this.router.navigate('screen-task');
                    const taskContainer = document.getElementById('stimulus-container');
                    taskContainer.innerHTML = '<h2>AOI Array Active</h2><p id="task-engine-status">Ready for trials.</p>';
                    document.body.appendChild(this.aoiOverlay);
                }, 5000);
            });
        }, 2000);
    }

    showResultsReport() {
        this.router.navigate('screen-results');
        const metricsEngine = new MetricsEngine();
        const metricsData = metricsEngine.compute(this.logger.events, this.logger.records);
        
        let html = `<h3>Experiment Report</h3>`;
        if (Object.keys(metricsData).length === 0) {
            html += `<p>No task data recorded yet.</p>`;
        } else {
            for (const id in metricsData) {
                const m = metricsData[id];
                html += `<div style="border: 1px solid lime; padding: 10px; margin-bottom: 10px; border-radius: 5px; background: rgba(0,255,100,0.1);">
                    <h4>${m.task_type.toUpperCase()} Task (${m.trial_id})</h4>
                    <p><strong>Duration:</strong> ${(m.duration_ms / 1000).toFixed(1)}s</p>
                    <p><strong>Target Completions:</strong> ${m.gates_unlocked}</p>
                    <p><strong>Avg Acquisition Latency / TTFF:</strong> ${m.target_acquisition_latency_ms} ms</p>
                    <p><strong>Avg Unlock Latency:</strong> ${m.avg_unlock_latency_ms} ms</p>
                    <p><strong>Distraction Captures:</strong> ${m.distraction_capture_count}</p>
                    <p><strong>Hold Breaks:</strong> ${m.hold_breaks}</p>
                    <p><strong>Target Dwell Ratio:</strong> ${m.dwell_percent}</p>
                    <p><strong>Search Efficiency:</strong> ${m.search_efficiency || 'N/A'}</p>
                    <p><strong>AOI Transition Entropy:</strong> ${m.aoi_transition_entropy}</p>
                </div>`;
            }
        }
        document.getElementById('results-summary').innerHTML = html;
        document.getElementById('btn-restart').textContent = "Back to Tasks";
    }
}

//
window.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init();
});
