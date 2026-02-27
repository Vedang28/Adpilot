'use strict';

/**
 * BaseAdapter — Adapter Pattern interface for all platform integrations.
 * Each adapter must implement all methods below.
 * This allows the IntegrationService to remain platform-agnostic (DIP).
 */
class BaseAdapter {
  /** @returns {string} Provider slug: 'meta' | 'google' | 'slack' */
  get provider() { throw new Error('provider must be implemented'); }

  /**
   * Exchange authorization code for access/refresh tokens.
   * @param {string} code — OAuth authorization code
   * @param {string} teamId
   * @returns {{ accessToken, refreshToken, expiresAt }}
   */
  // eslint-disable-next-line no-unused-vars
  async connect(code, teamId)         { throw new Error('connect() not implemented'); }

  /**
   * Refresh an expired access token using the refresh token.
   * @param {string} refreshToken
   * @returns {{ accessToken, expiresAt }}
   */
  // eslint-disable-next-line no-unused-vars
  async refresh(refreshToken)          { throw new Error('refresh() not implemented'); }

  /**
   * Fetch performance metrics for a date range.
   * @param {{ accessToken, dateFrom, dateTo, accountId }} params
   */
  // eslint-disable-next-line no-unused-vars
  async fetchData(params)              { throw new Error('fetchData() not implemented'); }

  /**
   * Create a campaign on the platform.
   * @param {{ accessToken, campaignData }} params
   */
  // eslint-disable-next-line no-unused-vars
  async createCampaign(params)         { throw new Error('createCampaign() not implemented'); }

  /**
   * Pause a campaign on the platform.
   * @param {{ accessToken, externalCampaignId }} params
   */
  // eslint-disable-next-line no-unused-vars
  async pauseCampaign(params)          { throw new Error('pauseCampaign() not implemented'); }

  /** Validate that stored credentials are still valid. */
  // eslint-disable-next-line no-unused-vars
  async validateCredentials(accessToken) { throw new Error('validateCredentials() not implemented'); }
}

module.exports = BaseAdapter;
