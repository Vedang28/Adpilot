'use strict';

const logger = require('../../config/logger');

/**
 * OllamaService — Local open-source LLM via Ollama.
 *
 * Ollama is completely free and runs on your machine.
 * Install: https://ollama.com/download
 * Pull a model: ollama pull llama3.2  (or mistral, gemma2, phi3)
 *
 * Set in .env:
 *   OLLAMA_URL=http://localhost:11434   (default)
 *   OLLAMA_MODEL=llama3.2              (default)
 *
 * Ollama API docs: https://github.com/ollama/ollama/blob/main/docs/api.md
 */
class OllamaService {
  constructor() {
    this.baseUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    this.model   = process.env.OLLAMA_MODEL || 'llama3.2';
    this._available = null; // null = not yet checked
  }

  /**
   * Check if Ollama is running and model is available.
   * Result is cached for 60 seconds.
   */
  async isAvailable() {
    if (this._available !== null && Date.now() - this._checkedAt < 60000) {
      return this._available;
    }

    try {
      const res = await fetch(`${this.baseUrl}/api/tags`, { signal: AbortSignal.timeout(2000) });
      if (!res.ok) { this._available = false; this._checkedAt = Date.now(); return false; }

      const data = await res.json();
      const models = (data.models || []).map(m => m.name.split(':')[0]);
      // Accept if the configured model (or any model) is available
      const modelBase = this.model.split(':')[0];
      this._available = models.length > 0 && (models.includes(modelBase) || models.length > 0);

      // Use the first available model if the configured one isn't found
      if (this._available && !models.includes(modelBase) && models.length > 0) {
        this.model = models[0];
        logger.info(`OllamaService: configured model "${modelBase}" not found, using "${this.model}"`);
      }

      this._checkedAt = Date.now();
      return this._available;
    } catch {
      this._available = false;
      this._checkedAt = Date.now();
      return false;
    }
  }

  /**
   * Generate text using Ollama's /api/generate endpoint.
   * Returns the response string or null on failure.
   */
  async generate(prompt, opts = {}) {
    const available = await this.isAvailable();
    if (!available) return null;

    const { temperature = 0.8, maxTokens = 2048 } = opts;

    try {
      const res = await fetch(`${this.baseUrl}/api/generate`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model:  this.model,
          prompt,
          stream: false,
          options: {
            temperature,
            num_predict: maxTokens,
          },
        }),
        signal: AbortSignal.timeout(60000), // 60s timeout for local inference
      });

      if (!res.ok) {
        logger.error('OllamaService.generate: non-OK response', { status: res.status });
        return null;
      }

      const data = await res.json();
      return data?.response?.trim() ?? null;
    } catch (err) {
      logger.error('OllamaService.generate failed', { message: err.message });
      return null;
    }
  }

  /**
   * Parse JSON from Ollama response, stripping markdown fences.
   */
  parseJSON(raw) {
    if (!raw) return null;
    try {
      // Strip markdown code fences that models often add
      const cleaned = raw.replace(/```json\s*|```\s*/g, '').trim();
      // Find the first { or [ and the last } or ]
      const start = cleaned.search(/[\[{]/);
      const end   = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'));
      if (start === -1 || end === -1) return null;
      return JSON.parse(cleaned.slice(start, end + 1));
    } catch {
      logger.error('OllamaService: JSON parse failed', { raw: raw.substring(0, 200) });
      return null;
    }
  }

  async generateAds({ product, targetAudience, platform, tone, campaignObjective }) {
    const prompt = `You are an expert ad copywriter. Generate exactly 3 ad variations as a JSON array.

Product/Service: ${product}
Target Audience: ${targetAudience}
Platform: ${platform || 'Meta + Google'}
Tone: ${tone || 'professional but engaging'}
Objective: ${campaignObjective || 'conversions'}

Return ONLY a valid JSON array, no markdown, no explanation:
[
  {
    "headline": "max 40 chars",
    "primaryText": "main ad copy, 2-3 sentences",
    "description": "one line, max 90 chars",
    "callToAction": "e.g. Learn More",
    "qualityScore": 85,
    "reasoning": "why this variation works"
  }
]

Variation 1: Pain-point/emotional angle
Variation 2: Benefit/value-proposition angle
Variation 3: Social proof/urgency angle

ONLY return the JSON array. No other text.`;

    const raw = await this.generate(prompt, { temperature: 0.85, maxTokens: 1024 });
    return this.parseJSON(raw);
  }

  async generateContentBrief({ keyword, relatedKeywords = [], url, auditScore }) {
    const prompt = `You are an SEO content strategist. Generate a detailed content brief.

Target Keyword: ${keyword}
${relatedKeywords.length ? `Related Keywords: ${relatedKeywords.slice(0, 10).join(', ')}` : ''}
${url ? `Website: ${url}` : ''}
${auditScore !== undefined ? `Current SEO Score: ${auditScore}/100` : ''}

Return ONLY a valid JSON object, no markdown:
{
  "title": "SEO-optimized H1 title",
  "metaDescription": "150-160 char meta description",
  "targetWordCount": 1500,
  "searchIntent": "informational",
  "outline": [{"heading": "Section heading", "subpoints": ["point 1", "point 2"]}],
  "relatedKeywords": ["keyword1", "keyword2", "keyword3"],
  "competitorAngle": "how to differentiate",
  "callToAction": "primary CTA suggestion"
}

searchIntent must be one of: informational, commercial, transactional, navigational.
ONLY return the JSON. No other text.`;

    const raw = await this.generate(prompt, { temperature: 0.7, maxTokens: 1000 });
    return this.parseJSON(raw);
  }

  async analyzeCompetitor({ domain, title, description, ctas, topKeywords, techStack, headings }) {
    const headingList = (headings || []).slice(0, 5).map(h => h.text).join(', ');
    const prompt = `Analyze this competitor website and provide strategic insights.

Competitor: ${domain}
Title: ${title || 'N/A'}
Description: ${description || 'N/A'}
Main Headings: ${headingList || 'N/A'}
CTAs: ${(ctas || []).join(', ') || 'N/A'}
Top Keywords: ${(topKeywords || []).map(k => k.word || k).slice(0, 12).join(', ')}
Tech Stack: ${(techStack || []).join(', ') || 'N/A'}

Return ONLY a valid JSON object, no markdown:
{
  "keywordGaps": [{"keyword": "string", "opportunity": "brief note", "difficulty": "low"}],
  "messagingAngles": ["angle 1", "angle 2", "angle 3"],
  "weaknesses": ["weakness 1", "weakness 2", "weakness 3"],
  "strengths": ["strength 1", "strength 2"],
  "suggestedAds": [{"headline": "string", "body": "string", "angle": "string"}]
}

Return 3-5 items per array. ONLY return the JSON. No other text.`;

    const raw = await this.generate(prompt, { temperature: 0.7, maxTokens: 800 });
    return this.parseJSON(raw);
  }

  async generateAuditSummary({ url, score, grade, issues = [], categories = {} }) {
    const issueList = issues.slice(0, 8).map(i => `- [${i.severity}] ${i.message}`).join('\n');
    const prompt = `You are an SEO expert. Write an executive summary for this website audit.

Website: ${url}
SEO Score: ${score}/100 (Grade: ${grade})
Technical: ${categories?.technical?.score ?? 'N/A'}, Content: ${categories?.content?.score ?? 'N/A'}, Performance: ${categories?.performance?.score ?? 'N/A'}

Top Issues:
${issueList}

Return ONLY a valid JSON object, no markdown:
{
  "summary": "2-3 sentence executive summary",
  "priorityActions": ["action 1", "action 2", "action 3", "action 4", "action 5"],
  "estimatedImpact": "what fixing these could improve",
  "timelineEstimate": "rough fix timeline"
}

ONLY return the JSON. No other text.`;

    const raw = await this.generate(prompt, { temperature: 0.6, maxTokens: 600 });
    return this.parseJSON(raw);
  }
}

module.exports = new OllamaService();
