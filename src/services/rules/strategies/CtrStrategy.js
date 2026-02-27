'use strict';

const BaseStrategy = require('./BaseStrategy');

class CtrStrategy extends BaseStrategy {
  get type() { return 'ctr_below'; }

  evaluate(rule, { metrics }) {
    const ctr = metrics.ctr || 0;
    // Only fire when there is meaningful impression data (>= 1000 impressions)
    return metrics.impressions >= 1000 && ctr < Number(rule.triggerValue);
  }

  async execute(rule, { metrics }) {
    const description = `CTR ${metrics.ctr?.toFixed(2)}% below ${Number(rule.triggerValue)}% with ${metrics.impressions} impressions → ${rule.action}`;
    return {
      action: rule.action,
      previousValue: metrics.ctr,
      newValue: Number(rule.triggerValue),
      campaignUpdate: rule.action === 'pause_campaign' ? { status: 'paused' } : {},
      description,
    };
  }
}

module.exports = new CtrStrategy();
