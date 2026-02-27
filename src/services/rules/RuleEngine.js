'use strict';

const prisma  = require('../../config/prisma');
const logger  = require('../../config/logger');
const AppError = require('../../common/AppError');

// Strategy registry — OCP: add new triggers without touching this file
const STRATEGIES = new Map();
[
  require('./strategies/CpaStrategy'),
  require('./strategies/RoasStrategy'),
  require('./strategies/CtrStrategy'),
  require('./strategies/FrequencyStrategy'),
  require('./strategies/BudgetPacingStrategy'),
].forEach((s) => STRATEGIES.set(s.type, s));

const COOLDOWN_MINUTES = 60; // minimum gap between rule firings

class RuleEngine {
  /**
   * Evaluate all active rules for a given campaign.
   * Uses idempotency: will not re-fire within cooldown window.
   *
   * @param {string} campaignId
   * @param {object} metrics  — normalized { cpa, roas, ctr, frequency, spend, impressions }
   * @returns {Array<object>} — list of fired rule results
   */
  async evaluate(campaignId, metrics) {
    const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) throw AppError.notFound('Campaign');

    const rules = await prisma.rule.findMany({
      where: { campaignId, isActive: true },
    });

    const context = { campaign, metrics, teamId: campaign.teamId };
    const results = [];

    for (const rule of rules) {
      const result = await this._evaluateRule(rule, context);
      if (result) results.push(result);
    }

    return results;
  }

  async _evaluateRule(rule, context) {
    const strategy = STRATEGIES.get(rule.triggerType);
    if (!strategy) {
      logger.warn('No strategy for trigger type', { triggerType: rule.triggerType });
      return null;
    }

    // Idempotency / cooldown guard
    if (rule.lastTriggeredAt) {
      const elapsedMinutes = (Date.now() - new Date(rule.lastTriggeredAt).getTime()) / 60_000;
      if (elapsedMinutes < COOLDOWN_MINUTES) {
        logger.debug('Rule in cooldown', { ruleId: rule.id, elapsedMinutes });
        return null;
      }
    }

    let fires = false;
    try {
      fires = strategy.evaluate(rule, context);
    } catch (err) {
      logger.error('Strategy evaluate() threw', { ruleId: rule.id, error: err.message });
      return null;
    }

    if (!fires) return null;

    // Execute the action
    const result = await strategy.execute(rule, context);

    // Apply campaign update within a transaction
    await prisma.$transaction(async (tx) => {
      if (result.campaignUpdate && Object.keys(result.campaignUpdate).length) {
        await tx.campaign.update({ where: { id: context.campaign.id }, data: result.campaignUpdate });
      }
      await tx.rule.update({
        where: { id: rule.id },
        data: { lastTriggeredAt: new Date() },
      });
    });

    logger.info('Rule fired', { ruleId: rule.id, campaignId: context.campaign.id, description: result.description });

    return { ruleId: rule.id, ...result };
  }

  /** Return all registered strategy types */
  static listTriggerTypes() {
    return [...STRATEGIES.keys()];
  }
}

module.exports = new RuleEngine();
