'use strict';

const BaseStrategy = require('./BaseStrategy');

class FrequencyStrategy extends BaseStrategy {
  get type() { return 'frequency_high'; }

  evaluate(rule, { metrics }) {
    // Ad frequency = impressions / reach (typically > 5 is fatiguing)
    const frequency = metrics.frequency || 0;
    return frequency > Number(rule.triggerValue);
  }

  async execute(rule, { metrics }) {
    const description = `Ad frequency ${metrics.frequency?.toFixed(1)} exceeded ${Number(rule.triggerValue)} → ${rule.action}`;
    return {
      action: rule.action,
      previousValue: metrics.frequency,
      newValue: Number(rule.triggerValue),
      campaignUpdate: rule.action === 'pause_campaign' ? { status: 'paused' } : {},
      description,
    };
  }
}

module.exports = new FrequencyStrategy();
