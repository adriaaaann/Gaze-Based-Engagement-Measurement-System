export class MetricsEngine {
    constructor() {}

    /**
     * Compute advanced behavioral metrics from the raw frame stream and the discrete event stream.
     * @param {Array} events - Discrete logger events.
     * @param {Array} records - Continuous frame data.
     * @returns {Object} Dictionary of metrics split by trialId.
     */
    compute(events, records) {
        const trials = {};

        // 1. Base Initialization & Event Parsing
        for (const ev of events) {
            if (!ev.trialId) continue;
            
            if (!trials[ev.trialId]) {
                trials[ev.trialId] = {
                    id: ev.trialId,
                    type: ev.trialId.split('_')[0],
                    startTime: 0,
                    endTime: 0,
                    
                    // Search & Distraction Metrics
                    distractionCaptures: 0,
                    holdBreaks: 0,
                    gatesUnlocked: 0,
                    totalUnlockLatencyMs: 0,
                    firstFixations: 0,
                    totalTtffMs: 0,
                    
                    // Arrays to store states for Entropy 
                    aoiSequence: []
                };
            }
            
            const t = trials[ev.trialId];
            
            if (ev.type === 'trial_start') t.startTime = ev.timestamp;
            if (ev.type === 'trial_end') t.endTime = ev.timestamp;
            
            if (ev.type === 'distraction_capture') t.distractionCaptures++;
            if (ev.type === 'hold_broken') t.holdBreaks++;
            
            if (ev.type === 'gate_unlocked' || ev.type === 'target_confirmed') {
                if (ev.type === 'gate_unlocked') {
                    t.gatesUnlocked++;
                    t.totalUnlockLatencyMs += ev.unlockLatencyMs || 0;
                }
            }
            
            if (ev.type === 'first_fixation') {
                t.firstFixations++;
                t.totalTtffMs += ev.latencyMs || 0;
            }
        }

        // 2. Continuous Tracking Analysis (Dwell & Entropy)
        const dwellCounts = {};
        let currentAoiState = null;

        for (const record of records) {
            if (!record.trialId || !record.activeTargetAoi) continue;
            const tId = record.trialId;
            const t = trials[tId];
            if (!t) continue;

            // Track Dwell (Passive Only usually but calculate for both)
            if (!dwellCounts[tId]) dwellCounts[tId] = { total: 0, matched: 0 };
            dwellCounts[tId].total++;
            if (record.predictedAoi === record.activeTargetAoi) {
                dwellCounts[tId].matched++;
            }

            // Track state changes for Entropy
            // Only tracking actual regions (ignore UNKNOWN or blink frames to keep Markov chain clean)
            if (record.predictedAoi && record.predictedAoi !== 'UNKNOWN') {
                if (record.predictedAoi !== currentAoiState) {
                    t.aoiSequence.push(record.predictedAoi);
                    currentAoiState = record.predictedAoi;
                }
            }
        }

        // 3. Final Calculations formulation
        const finalMetrics = {};
        for (const id in trials) {
            const t = trials[id];
            
            const duration = t.endTime - t.startTime;
            let completionRate = t.type === 'adaptive' ? `${t.gatesUnlocked}/18` : 'N/A';
            let searchEfficiency = t.type === 'adaptive' && duration > 0 ? (t.gatesUnlocked / (duration / 1000)).toFixed(2) + ' targets/sec' : 'N/A';
            let avgUnlock = (t.gatesUnlocked > 0 && t.type === 'adaptive') ? Math.round(t.totalUnlockLatencyMs / t.gatesUnlocked) : 'N/A';
            let distCaptures = t.distractionCaptures;
            let breaks = t.type === 'adaptive' ? t.holdBreaks : 'N/A';
            let gates = t.type === 'adaptive' ? `${t.gatesUnlocked}/18` : 'N/A';

            let avgTtff = (t.firstFixations > 0) ? Math.round(t.totalTtffMs / t.firstFixations) : 'N/A';
            let dwellPercent = 'N/A';
            
            if (dwellCounts[id] && dwellCounts[id].total > 0) {
                dwellPercent = ((dwellCounts[id].matched / dwellCounts[id].total) * 100).toFixed(1) + '%';
            }

            // Compute AOI Transition Entropy
            const entropy = this._computeEntropy(t.aoiSequence);

            finalMetrics[id] = {
                trial_id: t.id,
                task_type: t.type,
                duration_ms: duration,
                target_acquisition_latency_ms: avgTtff,
                distraction_capture_count: distCaptures,
                gates_unlocked: gates,
                hold_breaks: breaks,
                avg_unlock_latency_ms: avgUnlock,
                dwell_percent: dwellPercent,
                aoi_transition_entropy: entropy.toFixed(3),
                search_efficiency: searchEfficiency
            };
        }

        return finalMetrics;
    }

    /**
     * Compute Shannon Entropy of first-order Markov transitions: H = - Σ P(i→j) * log2(P(i→j))
     */
    _computeEntropy(sequence) {
        if (!sequence || sequence.length < 2) return 0.0;

        const transitions = {};
        let totalTransitions = 0;

        for (let i = 0; i < sequence.length - 1; i++) {
            const stateA = sequence[i];
            const stateB = sequence[i + 1];
            const key = `${stateA}->${stateB}`;
            
            transitions[key] = (transitions[key] || 0) + 1;
            totalTransitions++;
        }

        if (totalTransitions === 0) return 0.0;

        let entropy = 0.0;
        for (const key in transitions) {
            const p = transitions[key] / totalTransitions;
            entropy -= (p * Math.log2(p));
        }

        return entropy;
    }
}
