'use strict';

const axios     = require('axios');
const BaseAdapter = require('./BaseAdapter');
const logger    = require('../../../config/logger');
const AppError  = require('../../../common/AppError');

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const ADS_URL   = 'https://googleads.googleapis.com/v14';

class GoogleAdapter extends BaseAdapter {
  get provider() { return 'google'; }

  async connect(code, redirectUri) {
    try {
      const { data } = await axios.post(TOKEN_URL, {
        code,
        client_id:     process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri:  redirectUri,
        grant_type:    'authorization_code',
      });
      const expiresAt = new Date(Date.now() + (data.expires_in || 3600) * 1000);
      return { accessToken: data.access_token, refreshToken: data.refresh_token, expiresAt };
    } catch (err) {
      throw AppError.badRequest(`Google OAuth failed: ${err.response?.data?.error_description || err.message}`);
    }
  }

  async refresh(refreshToken) {
    try {
      const { data } = await axios.post(TOKEN_URL, {
        refresh_token: refreshToken,
        client_id:     process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        grant_type:    'refresh_token',
      });
      const expiresAt = new Date(Date.now() + (data.expires_in || 3600) * 1000);
      return { accessToken: data.access_token, expiresAt };
    } catch (err) {
      throw AppError.badRequest(`Google token refresh failed: ${err.message}`);
    }
  }

  async fetchData({ accessToken, customerId, dateFrom, dateTo }) {
    try {
      const query = `
        SELECT campaign.id, campaign.name, metrics.cost_micros, metrics.clicks,
               metrics.impressions, metrics.conversions, metrics.ctr
        FROM campaign
        WHERE segments.date BETWEEN '${dateFrom}' AND '${dateTo}'
          AND campaign.status = 'ENABLED'
      `;
      const { data } = await axios.post(`${ADS_URL}/customers/${customerId}/googleAds:search`, {
        query,
      }, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'developer-token': process.env.GOOGLE_DEVELOPER_TOKEN || '',
        },
      });
      return this._normalizeResults(data.results || []);
    } catch (err) {
      logger.error('Google fetchData error', { error: err.response?.data || err.message });
      throw AppError.internal('Failed to fetch Google Ads data');
    }
  }

  _normalizeResults(raw) {
    return raw.map((row) => ({
      externalId:  row.campaign?.id,
      name:        row.campaign?.name,
      platform:    'google',
      spend:       (row.metrics?.costMicros || 0) / 1_000_000,
      clicks:      row.metrics?.clicks     || 0,
      impressions: row.metrics?.impressions || 0,
      conversions: row.metrics?.conversions || 0,
      ctr:         parseFloat(((row.metrics?.ctr || 0) * 100).toFixed(2)),
    }));
  }

  async createCampaign({ accessToken, customerId, campaignData }) {
    // Stub: real implementation uses Google Ads mutate API
    logger.info('Google createCampaign stub called', { customerId, name: campaignData.name });
    return { externalId: `google_${Date.now()}` };
  }

  async pauseCampaign({ accessToken, customerId, externalCampaignId }) {
    logger.info('Google pauseCampaign stub called', { customerId, externalCampaignId });
    return { success: true };
  }

  async validateCredentials(accessToken) {
    try {
      const { data } = await axios.get('https://oauth2.googleapis.com/tokeninfo', { params: { access_token: accessToken } });
      return !!data.aud;
    } catch {
      return false;
    }
  }
}

module.exports = new GoogleAdapter();
