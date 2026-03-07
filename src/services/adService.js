'use strict';

const adRepo = require('../repositories/adRepository');
const campaignRepo = require('../repositories/campaignRepository');
const { AppError } = require('../middleware/errorHandler');
const gemini      = require('./ai/GeminiService');
const ollama      = require('./ai/OllamaService');
const huggingface = require('./ai/HuggingFaceService');
const anthropic   = require('./ai/AnthropicService');
const { withTimeout } = require('../utils/timeout');

// Per-provider timeouts — Ollama is local but can be slow on first token
const TIMEOUT_MS = { ollama: 8000, gemini: 8000, huggingface: 10000, anthropic: 8000 };

async function getAdsByCampaign(campaignId, teamId) {
  // Verify campaign belongs to team
  const campaign = await campaignRepo.findByIdRaw(campaignId, teamId);
  if (!campaign) {
    throw new AppError('Campaign not found', 404);
  }
  return adRepo.findByCampaign(campaignId);
}

async function createAd(campaignId, data) {
  return adRepo.create({ ...data, campaignId });
}

async function updateAd(id, data) {
  const ad = await adRepo.findById(id);
  if (!ad) {
    throw new AppError('Ad not found', 404);
  }
  return adRepo.update(id, data);
}

async function deleteAd(id) {
  const ad = await adRepo.findById(id);
  if (!ad) {
    throw new AppError('Ad not found', 404);
  }
  return adRepo.deleteOne(id);
}

async function generateAdWithAI(campaignId, brief, teamId) {
  // Campaign lookup is optional — allows generation without a campaign context
  let campaign = null;
  if (campaignId) {
    campaign = await campaignRepo.findByIdRaw(campaignId, teamId);
    if (!campaign) throw new AppError('Campaign not found', 404);
  }

  const adParams = {
    product:           brief.productName || brief.keyword || campaign?.name || 'your product',
    keyword:           brief.keyword,
    targetAudience:    brief.targetAudience || 'general audience',
    platform:          brief.platform || campaign?.platform || 'meta',
    tone:              brief.tone,
    campaignObjective: brief.goal || brief.objective || campaign?.objective,
  };

  const ANGLES = ['Social Proof', 'Problem/Solution', 'Curiosity', 'Fear of Missing Out'];

  const toVariations = (aiResult, source) =>
    Array.isArray(aiResult)
      ? aiResult.map((v, i) => ({
          // New frontend format
          angle:         v.angle || ANGLES[i % ANGLES.length],
          headline:      v.headline,
          body:          v.body || v.primaryText || v.description || '',
          cta:           v.cta || v.callToAction || 'Learn More',
          qualityScore:  v.qualityScore ?? Math.floor(65 + Math.random() * 30),
          qualityReason: v.qualityReason || v.reasoning || '',
          hook:          v.hook || '',
          bestFor:       v.bestFor || '',
          // Legacy format kept for save-to-campaign flow
          primaryText:   v.body || v.primaryText || '',
          callToAction:  v.cta || v.callToAction || 'Learn More',
          platform:      campaign?.platform || brief.platform || 'meta',
          status:        'draft',
          isAiGenerated: true,
          aiSource:      source,
        }))
      : null;

  // Helper: call a provider with timeout — returns null on timeout/error
  const tryProvider = async (label, fn) => {
    try {
      return toVariations(await withTimeout(fn(), TIMEOUT_MS[label] || 10000), label);
    } catch { return null; }
  };

  // 1. Try Anthropic Claude first (most reliable, has key)
  if (anthropic.isAvailable) {
    const result = await tryProvider('anthropic', () => anthropic.generateAds(adParams));
    if (result) return result;
  }

  // 2. Try Gemini (free key)
  if (gemini.isAvailable) {
    const result = await tryProvider('gemini', () => gemini.generateAds(adParams));
    if (result) return result;
  }

  // 3. Try Ollama (local — slow on first token, 8s timeout)
  if (await ollama.isAvailable()) {
    const result = await tryProvider('ollama', () => ollama.generateAds(adParams));
    if (result) return result;
  }

  // 4. Try HuggingFace (free key, Mistral-7B)
  if (huggingface.isAvailable) {
    const result = await tryProvider('huggingface', () => huggingface.generateAds(adParams));
    if (result) return result;
  }

  // Fallback: mock variations (labelled as mock)
  const pl = campaign?.platform || brief.platform || 'meta';
  const prod = brief.productName || brief.keyword || 'Your Product';
  return [
    { angle: 'Social Proof',       headline: `${prod} – Trusted by Thousands`,      body: `Discover how ${prod} can transform your results. Join thousands of happy customers.`, cta: 'Learn More',    qualityScore: 72, qualityReason: 'Social proof builds trust quickly.', platform: pl, status: 'draft', isMock: true },
    { angle: 'Problem/Solution',   headline: `Tired of Mediocre Results?`,           body: `${prod} solves the #1 problem you've been struggling with. Get real results fast.`,   cta: 'Try Risk-Free', qualityScore: 78, qualityReason: 'Pain-point hook drives high relevance.', platform: pl, status: 'draft', isMock: true },
    { angle: 'Curiosity',          headline: `The Secret Behind Top Performers`,     body: `What if the difference between you and the best wasn't skill — it was ${prod}?`,       cta: 'Find Out',      qualityScore: 69, qualityReason: 'Curiosity gap encourages clicks.', platform: pl, status: 'draft', isMock: true },
    { angle: 'Fear of Missing Out', headline: `Only 48 Hours Left – Don't Miss Out`, body: `${prod} is changing the game. Those who move first win. Don't let competitors get there first.`, cta: 'Act Now', qualityScore: 74, qualityReason: 'Urgency + FOMO drives conversion.', platform: pl, status: 'draft', isMock: true },
  ];
}

module.exports = {
  getAdsByCampaign,
  createAd,
  updateAd,
  deleteAd,
  generateAdWithAI,
};
