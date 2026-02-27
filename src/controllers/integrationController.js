'use strict';

const integrationService = require('../services/integrations/IntegrationService');
const { success, created } = require('../common/response');

exports.listProviders = async (req, res, next) => {
  try {
    const providers  = integrationService.constructor.listProviders();
    const connected  = await integrationService.listIntegrations(req.user.teamId);
    const connectedSet = new Set(connected.map((i) => i.provider));

    return success(res, {
      providers: providers.map((p) => ({ provider: p, connected: connectedSet.has(p) })),
      integrations: connected,
    });
  } catch (err) { next(err); }
};

exports.connect = async (req, res, next) => {
  try {
    const { provider }   = req.params;
    const { code, redirectUri } = req.body;
    const integration = await integrationService.connect(req.user.teamId, provider, code, redirectUri);
    return created(res, { integration });
  } catch (err) { next(err); }
};

exports.disconnect = async (req, res, next) => {
  try {
    await integrationService.disconnect(req.user.teamId, req.params.provider);
    return success(res, { message: `${req.params.provider} integration disconnected` });
  } catch (err) { next(err); }
};

exports.syncData = async (req, res, next) => {
  try {
    const { provider }   = req.params;
    const { dateFrom, dateTo, accountId } = req.body;
    const data = await integrationService.syncData(req.user.teamId, provider, { dateFrom, dateTo, accountId });
    return success(res, { provider, records: data.length, data });
  } catch (err) { next(err); }
};
