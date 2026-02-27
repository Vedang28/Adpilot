'use strict';

/**
 * BaseStrategy — interface every rule strategy must implement.
 *
 * Strategy Pattern: each concrete class encapsulates one trigger type,
 * keeping RuleEngine open for extension but closed for modification (OCP).
 */
class BaseStrategy {
  /** @returns {string} trigger type identifier */
  get type() {
    throw new Error('BaseStrategy.type must be implemented');
  }

  /**
   * Evaluate whether the rule should fire.
   * @param {object} rule      — Rule record from DB
   * @param {object} context   — { campaign, metrics, teamId }
   * @returns {boolean}
   */
  // eslint-disable-next-line no-unused-vars
  evaluate(rule, context) {
    throw new Error('BaseStrategy.evaluate() must be implemented');
  }

  /**
   * Execute the rule action (after evaluate returns true).
   * @returns {object} — { action, previousValue, newValue, description }
   */
  // eslint-disable-next-line no-unused-vars
  async execute(rule, context) {
    throw new Error('BaseStrategy.execute() must be implemented');
  }
}

module.exports = BaseStrategy;
