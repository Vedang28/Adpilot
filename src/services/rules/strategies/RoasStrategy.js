'use strict';

const BaseStrategy = require('./BaseStrategy');

class RoasStrategy extends BaseStrategy {
  get type() { return 'roas_below'; }

  evaluate(rule, { metrics }) {
    const roas = metrics.roas || 0;
    return roas > 0 && roas < Number(rule.triggerValue);
  }

  async execute(rule, { campaign, metrics }) {
    const description = `ROAS ${metrics.roas.toFixed(2)}x below threshold ${Number(rule.triggerValue).toFixed(2)}x → ${rule.action}`;
    let campaignUpdate = {};

    switch (rule.action) {
      case 'pause_campaign':
        campaignUpdate = { status: 'paused' };
        break;
      case 'reduce_budget_10':
        campaignUpdate = { budget: Number(campaign.budget) * 0.9 };
        break;
      case 'increase_budget_10':
        // Only increase if ROAS is > 0 (has spend) — prevents blind spend escalation
        campaignUpdate = metrics.roas > 0 ? { budget: Number(campaign.budget) * 1.1 } : {};
        break;
      default:
        campaignUpdate = { status: 'paused' };
    }

    return { action: rule.action, previousValue: metrics.roas, newValue: Number(rule.triggerValue), campaignUpdate, description };
  }
}

module.exports = new RoasStrategy();
