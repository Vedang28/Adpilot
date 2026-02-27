'use strict';

const prisma      = require('../../config/prisma');
const encryption  = require('./TokenEncryptionService');
const AppError    = require('../../common/AppError');
const logger      = require('../../config/logger');

// Adapter registry — OCP: new adapters plug in here
const ADAPTERS = new Map();
[
  require('./adapters/MetaAdapter'),
  require('./adapters/GoogleAdapter'),
  require('./adapters/SlackAdapter'),
].forEach((a) => ADAPTERS.set(a.provider, a));

const ENCRYPTED_FIELDS = ['accessToken', 'refreshToken'];

class IntegrationService {
  getAdapter(provider) {
    const adapter = ADAPTERS.get(provider);
    if (!adapter) throw AppError.badRequest(`Unsupported provider: ${provider}`);
    return adapter;
  }

  /** Persist a new integration with encrypted tokens */
  async connect(teamId, provider, code, redirectUri) {
    const adapter = this.getAdapter(provider);
    const tokens  = await adapter.connect(code, redirectUri);

    const encrypted = encryption.encryptFields(tokens, ENCRYPTED_FIELDS);

    const integration = await prisma.integration.upsert({
      where:  { teamId_provider: { teamId, provider } },
      create: { teamId, provider, ...encrypted, status: 'active' },
      update: { ...encrypted, status: 'active', lastSyncAt: new Date() },
    });

    logger.info('Integration connected', { teamId, provider });
    return this._safeReturn(integration);
  }

  /** Fetch and decrypt tokens; refresh if expired */
  async getTokens(teamId, provider) {
    const integration = await prisma.integration.findUnique({
      where: { teamId_provider: { teamId, provider } },
    });
    if (!integration) throw AppError.notFound(`${provider} integration`);
    if (integration.status !== 'active') throw AppError.badRequest(`${provider} integration is ${integration.status}`);

    const decrypted = encryption.decryptFields(integration, ENCRYPTED_FIELDS);

    // Auto-refresh if token expires within 5 minutes
    const isExpiring = decrypted.tokenExpiresAt
      && new Date(decrypted.tokenExpiresAt).getTime() - Date.now() < 5 * 60 * 1000;

    if (isExpiring && decrypted.refreshToken) {
      const adapter    = this.getAdapter(provider);
      const refreshed  = await adapter.refresh(decrypted.refreshToken);
      const encrypted  = encryption.encryptFields(refreshed, ['accessToken']);
      await prisma.integration.update({
        where: { id: integration.id },
        data:  { accessToken: encrypted.accessToken, tokenExpiresAt: refreshed.expiresAt },
      });
      decrypted.accessToken  = refreshed.accessToken;
      decrypted.tokenExpiresAt = refreshed.expiresAt;
    }

    return decrypted;
  }

  async disconnect(teamId, provider) {
    const integration = await prisma.integration.findUnique({
      where: { teamId_provider: { teamId, provider } },
    });
    if (!integration) throw AppError.notFound(`${provider} integration`);

    await prisma.integration.update({
      where: { id: integration.id },
      data:  { status: 'disconnected', accessToken: null, refreshToken: null },
    });
    logger.info('Integration disconnected', { teamId, provider });
  }

  async listIntegrations(teamId) {
    const integrations = await prisma.integration.findMany({ where: { teamId } });
    return integrations.map((i) => this._safeReturn(i));
  }

  async syncData(teamId, provider, params) {
    const tokens  = await this.getTokens(teamId, provider);
    const adapter = this.getAdapter(provider);
    const data    = await adapter.fetchData({ ...params, accessToken: tokens.accessToken });

    await prisma.integration.update({
      where: { id: tokens.id },
      data:  { lastSyncAt: new Date() },
    });

    return data;
  }

  /** Strip tokens before returning to callers */
  _safeReturn(integration) {
    // eslint-disable-next-line no-unused-vars
    const { accessToken, refreshToken, ...safe } = integration;
    return safe;
  }

  static listProviders() {
    return [...ADAPTERS.keys()];
  }
}

module.exports = new IntegrationService();
