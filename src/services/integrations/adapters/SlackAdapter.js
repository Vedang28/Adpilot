'use strict';

const axios   = require('axios');
const BaseAdapter = require('./BaseAdapter');
const AppError = require('../../../common/AppError');

class SlackAdapter extends BaseAdapter {
  get provider() { return 'slack'; }

  async connect(code, redirectUri) {
    const { data } = await axios.post('https://slack.com/api/oauth.v2.access', null, {
      params: {
        code,
        client_id:     process.env.SLACK_CLIENT_ID,
        client_secret: process.env.SLACK_CLIENT_SECRET,
        redirect_uri:  redirectUri,
      },
    });
    if (!data.ok) throw AppError.badRequest(`Slack OAuth failed: ${data.error}`);
    return { accessToken: data.access_token, refreshToken: null, expiresAt: null };
  }

  async refresh() {
    throw AppError.badRequest('Slack does not use refresh tokens');
  }

  async fetchData() {
    return []; // Slack is push-only (webhooks/notifications)
  }

  async createCampaign() {
    throw AppError.badRequest('Slack does not support campaign creation');
  }

  async pauseCampaign() {
    throw AppError.badRequest('Slack does not support campaign management');
  }

  /** Send a notification message to a Slack channel */
  async sendMessage({ accessToken, channel, text, blocks }) {
    const { data } = await axios.post('https://slack.com/api/chat.postMessage', {
      channel, text, blocks,
    }, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!data.ok) throw AppError.internal(`Slack message failed: ${data.error}`);
    return { ts: data.ts, channel: data.channel };
  }

  async validateCredentials(accessToken) {
    try {
      const { data } = await axios.post('https://slack.com/api/auth.test', null, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return data.ok;
    } catch {
      return false;
    }
  }
}

module.exports = new SlackAdapter();
