import { MetricsEngine } from '../experiment/metrics.js';

export class DataExporter {
    constructor(logger) {
        this.logger = logger;
        this.metricsEngine = new MetricsEngine();
    }

    _download(filename, content, type = 'text/plain') {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    exportAll() {
        if (this.logger.records.length === 0 && this.logger.events.length === 0) {
            console.warn("No data to export.");
            return;
        }

        const rawJson = JSON.stringify(this.logger.records, null, 2);
        this._download(`raw_samples_${Date.now()}.json`, rawJson, 'application/json');

        const eventsJson = JSON.stringify(this.logger.events, null, 2);
        this._download(`events_${Date.now()}.json`, eventsJson, 'application/json');

        const csvContent = this._generateTrialMetricsCsv();
        this._download(`trial_metrics_${Date.now()}.csv`, csvContent, 'text/csv');
    }

    _generateTrialMetricsCsv() {
        const metricsData = this.metricsEngine.compute(this.logger.events, this.logger.records);

        let csv = "trial_id,task_type,duration_ms,target_acquisition_latency_ms,distraction_capture_count,gates_unlocked,hold_breaks,avg_unlock_latency_ms,dwell_percent,aoi_transition_entropy,search_efficiency\n";

        for (const id in metricsData) {
            const m = metricsData[id];
            csv += `${m.trial_id},${m.task_type},${m.duration_ms},${m.target_acquisition_latency_ms},${m.distraction_capture_count},${m.gates_unlocked},${m.hold_breaks},${m.avg_unlock_latency_ms},${m.dwell_percent},${m.aoi_transition_entropy},${m.search_efficiency}\n`;
        }

        return csv;
    }
}
