'use strict';

/**
 * AnomalyDetector — Z-score based performance anomaly detection.
 *
 * Z = (x - μ) / σ
 * |Z| > threshold means the data point is statistically anomalous.
 */
class AnomalyDetector {
  static DEFAULT_THRESHOLD = 2.0; // 95th percentile

  /**
   * Compute mean and standard deviation of an array.
   */
  static stats(values) {
    const n   = values.length;
    if (n < 2) return { mean: values[0] || 0, stddev: 0 };
    const mean   = values.reduce((s, v) => s + v, 0) / n;
    const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1);
    return { mean, stddev: Math.sqrt(variance) };
  }

  /**
   * Calculate z-score for a single value against a historical series.
   * @param {number}   value    — current metric value
   * @param {number[]} history  — past values (at least 2)
   * @returns {{ zScore: number, isAnomaly: boolean, direction: 'spike'|'drop'|'normal' }}
   */
  static detect(value, history, threshold = AnomalyDetector.DEFAULT_THRESHOLD) {
    const { mean, stddev } = AnomalyDetector.stats(history);
    if (stddev === 0) return { zScore: 0, isAnomaly: false, direction: 'normal' };

    const zScore    = (value - mean) / stddev;
    const isAnomaly = Math.abs(zScore) > threshold;
    const direction = !isAnomaly ? 'normal' : zScore > 0 ? 'spike' : 'drop';

    return { zScore: parseFloat(zScore.toFixed(3)), isAnomaly, direction, mean: parseFloat(mean.toFixed(2)), stddev: parseFloat(stddev.toFixed(2)) };
  }

  /**
   * Scan all metrics in a performance object against their baselines.
   * @param {object} current   — { roas, cpa, ctr, spend, clicks }
   * @param {object} baselines — { roas: number[], cpa: number[], ... }
   * @returns {object[]} — array of anomalies with metric name, details
   */
  static scanAll(current, baselines, threshold = AnomalyDetector.DEFAULT_THRESHOLD) {
    const anomalies = [];
    for (const [metric, value] of Object.entries(current)) {
      const history = baselines[metric];
      if (!history || history.length < 2) continue;
      const result = AnomalyDetector.detect(value, history, threshold);
      if (result.isAnomaly) {
        anomalies.push({ metric, value, ...result });
      }
    }
    return anomalies;
  }
}

module.exports = AnomalyDetector;
