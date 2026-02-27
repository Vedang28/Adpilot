'use strict';

const BaseStrategy = require('./BaseStrategy');

class BudgetPacingStrategy extends BaseStrategy {
  get type() { return 'budget_pacing_anomaly'; }

  /**
   * Fires when spend pacing deviates > triggerValue% from ideal.
   * Ideal pacing at hour H of a 24h day = budget * (H/24).
   */
  evaluate(rule, { campaign, metrics }) {
    const now = new Date();
    const hourOfDay  = now.getHours() + now.getMinutes() / 60;
    const idealPct   = hourOfDay / 24;
    const spendPct   = metrics.spend / Number(campaign.budget);
    const deviation  = Math.abs(spendPct - idealPct) / idealPct;

    return deviation > Number(rule.triggerValue) / 100;
  }

  async execute(rule, { campaign, metrics }) {
    const now         = new Date();
    const hourOfDay   = now.getHours() + now.getMinutes() / 60;
    const idealPct    = hourOfDay / 24;
    const spendPct    = metrics.spend / Number(campaign.budget);
    const overspend   = spendPct > idealPct;

    const description = `Budget pacing anomaly: spent ${(spendPct * 100).toFixed(1)}% at ${(idealPct * 100).toFixed(1)}% of day — ${overspend ? 'overspending' : 'underspending'}`;

    let campaignUpdate = {};
    if (overspend && rule.action === 'reduce_budget_10') {
      campaignUpdate = { budget: Number(campaign.budget) * 0.9 };
    }

    return { action: rule.action, previousValue: spendPct, newValue: idealPct, campaignUpdate, description };
  }
}

module.exports = new BudgetPacingStrategy();
