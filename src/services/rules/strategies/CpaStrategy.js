'use strict';

const BaseStrategy = require('./BaseStrategy');

class CpaStrategy extends BaseStrategy {
  get type() { return 'cpa_exceeds'; }

  evaluate(rule, { metrics }) {
    const cpa = metrics.cpa || 0;
    return cpa > Number(rule.triggerValue);
  }

  async execute(rule, { campaign, metrics }) {
    const actions = {
      pause_campaign:   { status: 'paused' },
      reduce_budget_10: { budget: Number(campaign.budget) * 0.9 },
      reduce_budget_20: { budget: Number(campaign.budget) * 0.8 },
    };

    const update = actions[rule.action] || actions.pause_campaign;
    const description = `CPA $${metrics.cpa.toFixed(2)} exceeded threshold $${Number(rule.triggerValue).toFixed(2)} → ${rule.action}`;

    return {
      action: rule.action,
      previousValue: metrics.cpa,
      newValue: rule.triggerValue,
      campaignUpdate: update,
      description,
    };
  }
}

module.exports = new CpaStrategy();
