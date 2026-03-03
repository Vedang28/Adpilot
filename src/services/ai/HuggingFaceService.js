'use strict';

const logger = require('../../config/logger');

/**
 * HuggingFaceService — Free hosted inference via HuggingFace API.
 *
 * Free tier: unlimited (rate limited, ~30 req/min on free plan).
 * No credit card needed for basic use.
 * Get free token: https://huggingface.co/settings/tokens
 *
 * Using Mistral-7B-Instruct — best free model for instruction following / JSON output.
 * Model docs: https://huggingface.co/mistralai/Mistral-7B-Instruct-v0.3
 *
 * Set in .env:
 *   HUGGINGFACE_API_KEY=hf_xxxxxxxxxxxx
 *   HUGGINGFACE_MODEL=mistralai/Mistral-7B-Instruct-v0.3   (optional, this is the default)
 */
class HuggingFaceService {
  constructor() {
    this.apiKey  = process.env.HUGGINGFACE_API_KEY || null;
    this.model   = process.env.HUGGINGFACE_MODEL   || 'mistralai/Mistral-7B-Instruct-v0.3';
    this.baseUrl = 'https://api-inference.huggingface.co/models';
  }

  get isAvailable() {
    return !!this.apiKey;
  }

  /**
   * Call HuggingFace Inference API.
   * Returns the generated text string or null.
   */
  async generate(prompt, opts = {}) {
    if (!this.apiKey) return null;

    const { maxTokens = 1024, temperature = 0.7 } = opts;

    try {
      const res = await fetch(`${this.baseUrl}/${this.model}`, {
        method:  'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_new_tokens:  maxTokens,
            temperature,
            return_full_text: false,
            do_sample:       true,
          },
        }),
        signal: AbortSignal.timeout(30000),
      });

      if (!res.ok) {
        const err = await res.text();
        // Model loading (503) — transient, not an error
        if (res.status === 503) {
          logger.warn('HuggingFaceService: model loading, skip', { model: this.model });
        } else {
          logger.error('HuggingFaceService API error', { status: res.status, body: err.substring(0, 200) });
        }
        return null;
      }

      const data = await res.json();
      // HF returns array: [{ generated_text: "..." }]
      const text = Array.isArray(data) ? data[0]?.generated_text : data?.generated_text;
      return text?.trim() ?? null;
    } catch (err) {
      logger.error('HuggingFaceService.generate failed', { message: err.message });
      return null;
    }
  }

  /**
   * Parse JSON from HuggingFace response, stripping markdown fences.
   */
  parseJSON(raw) {
    if (!raw) return null;
    try {
      const cleaned = raw.replace(/```json\s*|```\s*/g, '').trim();
      const start   = cleaned.search(/[\[{]/);
      const end     = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'));
      if (start === -1 || end === -1) return null;
      return JSON.parse(cleaned.slice(start, end + 1));
    } catch {
      logger.warn('HuggingFaceService: JSON parse failed', { raw: raw.substring(0, 200) });
      return null;
    }
  }

  /**
   * Format prompt for Mistral instruction-following format.
   * Mistral uses [INST] ... [/INST] tags.
   */
  _instruct(userMsg) {
    return `<s>[INST] ${userMsg} [/INST]`;
  }

  async generateAds({ product, targetAudience, platform, tone, campaignObjective }) {
    const prompt = this._instruct(
      `You are an expert ad copywriter. Generate exactly 3 ad variations as a JSON array.

Product: ${product}
Target Audience: ${targetAudience}
Platform: ${platform || 'Meta + Google'}
Tone: ${tone || 'professional'}
Objective: ${campaignObjective || 'conversions'}

Return ONLY this JSON array, no other text:
[{"headline":"max 40 chars","primaryText":"2-3 sentences","description":"max 90 chars","callToAction":"e.g. Learn More","qualityScore":85,"reasoning":"why this works"}]

Variation 1: pain-point angle. Variation 2: value angle. Variation 3: social proof angle.`
    );

    const raw = await this.generate(prompt, { temperature: 0.85, maxTokens: 800 });
    return this.parseJSON(raw);
  }

  async generateContentBrief({ keyword, relatedKeywords = [] }) {
    const prompt = this._instruct(
      `You are an SEO content strategist. Generate a content brief for keyword: "${keyword}".
${relatedKeywords.length ? `Related: ${relatedKeywords.slice(0, 8).join(', ')}` : ''}

Return ONLY this JSON, no other text:
{"title":"SEO title","metaDescription":"150-160 chars","targetWordCount":1500,"searchIntent":"informational","outline":[{"heading":"Section","subpoints":["point"]}],"relatedKeywords":["kw1","kw2"],"callToAction":"CTA"}`
    );

    const raw = await this.generate(prompt, { temperature: 0.7, maxTokens: 700 });
    return this.parseJSON(raw);
  }

  async analyzeCompetitor({ domain, title, description, ctas, topKeywords, techStack }) {
    const prompt = this._instruct(
      `Analyze this competitor website strategically.

Domain: ${domain}
Title: ${title || 'N/A'}
Description: ${description || 'N/A'}
CTAs: ${(ctas || []).slice(0, 5).join(', ') || 'N/A'}
Keywords: ${(topKeywords || []).map(k => k.word || k).slice(0, 10).join(', ')}
Tech: ${(techStack || []).join(', ') || 'N/A'}

Return ONLY this JSON, no other text:
{"keywordGaps":[{"keyword":"string","opportunity":"note","difficulty":"low"}],"messagingAngles":["angle1","angle2","angle3"],"weaknesses":["w1","w2"],"suggestedAds":[{"headline":"string","body":"string","angle":"string"}]}`
    );

    const raw = await this.generate(prompt, { temperature: 0.7, maxTokens: 600 });
    return this.parseJSON(raw);
  }
}

module.exports = new HuggingFaceService();
