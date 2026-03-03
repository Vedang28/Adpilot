'use strict';

const logger = require('../../config/logger');

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
// Model fallback chain — each has its own free-tier quota bucket
const MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-lite'];

class GeminiService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || null;
  }

  get isAvailable() {
    return !!this.apiKey;
  }

  async generate(prompt, opts = {}) {
    if (!this.apiKey) {
      logger.warn('GeminiService: GEMINI_API_KEY not set — returning null');
      return null;
    }

    const { maxTokens = 4096, temperature = 0.8 } = opts;

    // Try each model in order — each has its own free quota bucket
    for (const model of MODELS) {
      try {
        const url = `${GEMINI_BASE}/${model}:generateContent?key=${this.apiKey}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: maxTokens, temperature },
            // Disable thinking tokens for structured JSON output (faster + saves token budget)
            thinkingConfig: { thinkingBudget: 0 },
          }),
        });

        if (res.status === 429 || res.status === 503) {
          const errBody = await res.text();
          logger.warn(`GeminiService: ${model} quota/overload (${res.status}), trying next model`);
          continue; // try next model
        }

        if (!res.ok) {
          const errBody = await res.text();
          logger.error('Gemini API error', { model, status: res.status, body: errBody.substring(0, 300) });
          return null;
        }

        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
        if (text) {
          logger.info(`GeminiService: used ${model}`);
          return text;
        }
      } catch (err) {
        logger.error('GeminiService.generate failed', { model, message: err.message });
      }
    }

    logger.error('GeminiService: all models exhausted');
    return null;
  }

  /**
   * Parse JSON from Gemini response.
   * Strips markdown fences then extracts the first complete JSON object or array.
   */
  parseJSON(raw) {
    if (!raw) return null;
    try {
      // Strip markdown code fences
      const stripped = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
      // Find the outermost JSON structure
      const start = stripped.search(/[\[{]/);
      if (start === -1) return null;
      const isArray = stripped[start] === '[';
      const end = isArray ? stripped.lastIndexOf(']') : stripped.lastIndexOf('}');
      if (end === -1) return null;
      return JSON.parse(stripped.slice(start, end + 1));
    } catch {
      logger.error('GeminiService: JSON parse failed', { raw: raw.substring(0, 200) });
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

Return ONLY a JSON array (no markdown, no backticks):
[
  {
    "headline": "max 40 chars",
    "primaryText": "main ad copy, 2-3 sentences",
    "description": "one line, max 90 chars",
    "callToAction": "e.g. Learn More, Shop Now",
    "qualityScore": number 70-95,
    "reasoning": "why this variation works"
  }
]

Variation 1: Pain-point/emotional angle
Variation 2: Benefit/value-proposition angle
Variation 3: Social proof/urgency angle`;

    const raw = await this.generate(prompt, { temperature: 0.85 });
    return this.parseJSON(raw);
  }

  async generateAuditSummary({ url, score, grade, categories, issues, performanceMetrics }) {
    const issueList = (issues || []).slice(0, 10)
      .map(i => `[${i.severity}] ${i.message}`).join('\n');

    const prompt = `You are an SEO expert. Write an executive summary for this audit.

Website: ${url}
Score: ${score}/100 (Grade: ${grade})
Categories: Technical=${categories?.technical?.score ?? 'N/A'}, Content=${categories?.content?.score ?? 'N/A'}, Structure=${categories?.structure?.score ?? 'N/A'}, Performance=${categories?.performance?.score ?? 'N/A'}

Issues:
${issueList}

Performance: LCP=${performanceMetrics?.lcp ?? 'N/A'}ms, CLS=${performanceMetrics?.cls ?? 'N/A'}

Return ONLY JSON:
{
  "summary": "2-3 paragraph executive summary",
  "priorityActions": ["top 5 actions"],
  "estimatedImpact": "what fixing these could improve",
  "timelineEstimate": "rough fix timeline"
}`;

    const raw = await this.generate(prompt, { temperature: 0.6, maxTokens: 1024 });
    return this.parseJSON(raw);
  }

  async generateContentBrief({ keyword, url, auditScore, topIssues, relatedKeywords }) {
    const prompt = `You are an SEO content strategist. Generate a detailed content brief.

Target Keyword: ${keyword}
${url ? `Website: ${url}` : ''}
${auditScore !== undefined ? `SEO Score: ${auditScore}/100` : ''}
${relatedKeywords?.length ? `Related Keywords: ${relatedKeywords.join(', ')}` : ''}
${topIssues?.length ? `Top Issues: ${topIssues.map(i => i.message || i).slice(0, 5).join('; ')}` : ''}

Return ONLY a JSON object (no markdown, no backticks):
{
  "title": "SEO-optimized H1 title targeting the keyword",
  "metaDescription": "150-160 character meta description",
  "targetWordCount": 1500,
  "outline": [{"heading": "Section heading", "subpoints": ["subpoint 1", "subpoint 2"]}],
  "relatedKeywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "searchIntent": "informational",
  "competitorAngle": "how to differentiate from competitors covering this topic",
  "callToAction": "primary CTA for this content"
}

searchIntent must be one of: informational, commercial, transactional, navigational.`;

    const raw = await this.generate(prompt, { temperature: 0.7, maxTokens: 1500 });
    return this.parseJSON(raw);
  }

  async analyzeCompetitor({ domain, title, description, ctas, topKeywords, techStack, headings }) {
    const headingList = (headings || []).slice(0, 5).map(h => h.text).join(', ');
    const prompt = `Analyze this competitor and provide strategic insights.

Competitor: ${domain}
Title: ${title || 'N/A'}
Description: ${description || 'N/A'}
Main Headings: ${headingList || 'N/A'}
CTAs: ${(ctas || []).join(', ') || 'N/A'}
Keywords: ${(topKeywords || []).map(k => k.word || k).slice(0, 15).join(', ')}
Tech Stack: ${(techStack || []).join(', ') || 'N/A'}

Return ONLY a JSON object (no markdown, no backticks):
{
  "keywordGaps": [{"keyword": "string", "opportunity": "brief opportunity note", "difficulty": "low|medium|high"}],
  "messagingAngles": ["3 angles to differentiate from them"],
  "weaknesses": ["gaps in their strategy to exploit"],
  "strengths": ["their strengths you must counter"],
  "suggestedAds": [{"headline": "string", "body": "string", "angle": "string"}]
}

Return 3-5 items in each array.`;

    const raw = await this.generate(prompt, { temperature: 0.7 });
    return this.parseJSON(raw);
  }
}

module.exports = new GeminiService();
