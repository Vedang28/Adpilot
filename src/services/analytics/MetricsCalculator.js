'use strict';

/**
 * MetricsCalculator — pure functions (no I/O).
 * Stateless: easy to unit-test and reuse.
 */
class MetricsCalculator {
  /**
   * Revenue On Ad Spend
   * @param {number} revenue
   * @param {number} spend
   */
  static roas(revenue, spend) {
    if (!spend || spend === 0) return 0;
    return parseFloat((revenue / spend).toFixed(2));
  }

  /**
   * Cost Per Acquisition
   * @param {number} spend
   * @param {number} conversions
   */
  static cpa(spend, conversions) {
    if (!conversions || conversions === 0) return 0;
    return parseFloat((spend / conversions).toFixed(2));
  }

  /**
   * Customer Acquisition Cost
   * @param {number} totalSpend — includes sales, marketing, etc.
   * @param {number} newCustomers
   */
  static cac(totalSpend, newCustomers) {
    if (!newCustomers || newCustomers === 0) return 0;
    return parseFloat((totalSpend / newCustomers).toFixed(2));
  }

  /**
   * LTV / CAC ratio — healthy: > 3
   * @param {number} ltv
   * @param {number} cac
   */
  static ltvCacRatio(ltv, cac) {
    if (!cac || cac === 0) return 0;
    return parseFloat((ltv / cac).toFixed(2));
  }

  /**
   * Click-Through Rate (%)
   * @param {number} clicks
   * @param {number} impressions
   */
  static ctr(clicks, impressions) {
    if (!impressions || impressions === 0) return 0;
    return parseFloat(((clicks / impressions) * 100).toFixed(2));
  }

  /**
   * Spend velocity — spend per hour since campaign start
   * @param {number} spend
   * @param {Date}   startDate
   */
  static spendVelocity(spend, startDate) {
    const hoursElapsed = (Date.now() - new Date(startDate).getTime()) / 3_600_000;
    if (hoursElapsed <= 0) return 0;
    return parseFloat((spend / hoursElapsed).toFixed(4));
  }

  /**
   * Exponential Moving Average — for smoothing time-series rank/metric data.
   * alpha=0.3 gives mild smoothing; higher alpha = more reactive.
   * @param {number[]} series — chronological array of numbers
   * @param {number}   alpha  — smoothing factor (0 < alpha <= 1)
   * @returns {number} latest EMA value
   */
  static ema(series, alpha = 0.3) {
    if (!series || series.length === 0) return 0;
    let ema = series[0];
    for (let i = 1; i < series.length; i++) {
      ema = alpha * series[i] + (1 - alpha) * ema;
    }
    return parseFloat(ema.toFixed(4));
  }

  /**
   * Normalize an array of metric objects to a common schema.
   * @param {object[]} metaMetrics
   * @param {object[]} googleMetrics
   * @returns {object} aggregated
   */
  static normalize(metaMetrics = [], googleMetrics = []) {
    const sum = (arr, key) => arr.reduce((acc, m) => acc + (Number(m[key]) || 0), 0);

    const spend       = sum(metaMetrics, 'spend')       + sum(googleMetrics, 'spend');
    const clicks      = sum(metaMetrics, 'clicks')      + sum(googleMetrics, 'clicks');
    const impressions = sum(metaMetrics, 'impressions') + sum(googleMetrics, 'impressions');
    const conversions = sum(metaMetrics, 'conversions') + sum(googleMetrics, 'conversions');
    const revenue     = sum(metaMetrics, 'revenue')     + sum(googleMetrics, 'revenue');

    return {
      spend,
      clicks,
      impressions,
      conversions,
      revenue,
      roas: MetricsCalculator.roas(revenue, spend),
      cpa:  MetricsCalculator.cpa(spend, conversions),
      ctr:  MetricsCalculator.ctr(clicks, impressions),
    };
  }
}

module.exports = MetricsCalculator;
