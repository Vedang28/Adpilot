'use strict';

const AuditDiscoveryStrategy = require('./discovery/AuditDiscoveryStrategy');

/**
 * KeywordDiscoveryService
 *
 * Thin strategy wrapper that keeps the controller free of discovery logic.
 * New strategies (AI, GSC, competitor) can be added here without touching the API layer.
 *
 * Current strategies:
 *   - AuditDiscoveryStrategy  (default) — extracts from completed SEO audit data
 */
class KeywordDiscoveryService {
  constructor() {
    this.auditStrategy = new AuditDiscoveryStrategy();
  }

  /**
   * Discover keyword suggestions from a completed audit.
   *
   * @param {string} auditId
   * @param {string} teamId
   * @returns {Promise<Array<{ keyword: string, source: string }>>}
   */
  async discoverFromAudit(auditId, teamId) {
    return this.auditStrategy.extract(auditId, teamId);
  }
}

module.exports = new KeywordDiscoveryService();
