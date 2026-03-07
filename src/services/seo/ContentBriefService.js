'use strict';

const natural  = require('natural');
const prisma   = require('../../config/prisma');
const logger   = require('../../config/logger');
const AppError = require('../../common/AppError');
const config   = require('../../config');
const gemini      = require('../ai/GeminiService');
const ollama      = require('../ai/OllamaService');
const huggingface = require('../ai/HuggingFaceService');
const anthropic   = require('../ai/AnthropicService');

const TfIdf     = natural.TfIdf;
const tokenizer = new natural.WordTokenizer();
const stopwords = new Set([
  'a','an','the','and','or','but','in','on','at','to','for','of','with','by',
  'is','are','was','were','be','been','being','have','has','had','do','does',
  'did','will','would','could','should','may','might','shall','can',
  'this','that','these','those','it','its','i','we','you','he','she','they',
  'not','from','up','out','as','into','if','then','so','than',
]);

const SEARCH_INTENTS = ['informational', 'commercial', 'transactional', 'navigational'];

class ContentBriefService {
  /**
   * Generate a content brief for a target keyword.
   * Uses OpenAI gpt-4o-mini if OPENAI_API_KEY is set; otherwise falls back to
   * the deterministic TF-IDF algorithm.
   *
   * @param {string} teamId
   * @param {string} targetKeyword
   * @returns {object} saved brief
   */
  async generate(teamId, targetKeyword) {
    if (!targetKeyword?.trim()) throw AppError.badRequest('targetKeyword is required');

    let aiResult = null;

    // 1. Ollama (local, free, no API key)
    if (!aiResult && await ollama.isAvailable()) {
      aiResult = await this._generateWithOllama(teamId, targetKeyword);
    }

    // 2. OpenAI (paid)
    if (!aiResult && config.openaiApiKey) {
      aiResult = await this._generateWithAI(targetKeyword);
    }

    // 3. Gemini (free key)
    if (!aiResult && gemini.isAvailable) {
      aiResult = await this._generateWithGemini(teamId, targetKeyword);
    }

    // 4. HuggingFace (free key, Mistral-7B)
    if (!aiResult && huggingface.isAvailable) {
      aiResult = await this._generateWithHuggingFace(teamId, targetKeyword);
    }

    // 5. Anthropic Claude (paid key, very reliable fallback)
    if (!aiResult && anthropic.isAvailable) {
      aiResult = await this._generateWithAnthropic(teamId, targetKeyword);
    }

    if (aiResult) {
      // AI path
      const brief = await prisma.contentBrief.create({
        data: {
          teamId,
          targetKeyword,
          title:           aiResult.title,
          outline:         aiResult.outline,
          relatedKeywords: aiResult.relatedKeywords ?? [],
          status:          'draft',
        },
      });
      return { ...brief, ...aiResult, _source: 'ai' };
    }

    // Fallback: deterministic TF-IDF
    return this._generateFallback(teamId, targetKeyword);
  }

  /**
   * Generate brief via HuggingFace Inference API (free key, Mistral-7B).
   */
  async _generateWithHuggingFace(teamId, targetKeyword) {
    try {
      const relatedKeywords = await prisma.keyword.findMany({
        where:  { teamId },
        select: { keyword: true },
        take:   12,
      });
      const result = await huggingface.generateContentBrief({
        keyword:         targetKeyword,
        relatedKeywords: relatedKeywords.map(k => k.keyword),
      });
      if (!result || !result.title || !Array.isArray(result.outline)) return null;
      if (!SEARCH_INTENTS.includes(result.searchIntent)) result.searchIntent = 'informational';
      return { ...result, _source: 'huggingface' };
    } catch (err) {
      logger.warn('ContentBriefService: HuggingFace generation failed', { err: err.message });
      return null;
    }
  }

  /**
   * Call OpenAI gpt-4o-mini and parse JSON response.
   * Returns null on any error so caller falls back gracefully.
   */
  async _generateWithAI(keyword) {
    try {
      const { default: OpenAI } = await import('openai');
      const openai = new OpenAI({ apiKey: config.openaiApiKey });

      const prompt = `You are an expert SEO content strategist. Generate a detailed content brief for the keyword: "${keyword}".
Return ONLY a valid JSON object with these exact fields:
{
  "title": "SEO-optimized H1 title",
  "metaDescription": "150-160 character meta description",
  "targetWordCount": 1500,
  "outline": [{ "heading": "Section heading", "subpoints": ["subpoint 1", "subpoint 2"] }],
  "relatedKeywords": ["keyword1", "keyword2", "keyword3"],
  "searchIntent": "informational",
  "competitorAngle": "Brief note on what competitors cover and how to differentiate",
  "callToAction": "Primary CTA suggestion for this content"
}
searchIntent must be one of: informational, commercial, transactional, navigational.
Return ONLY the JSON object, no markdown, no extra text.`;

      const res = await openai.chat.completions.create({
        model:       'gpt-4o-mini',
        messages:    [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens:  1500,
      });

      const raw = res.choices[0]?.message?.content?.trim() ?? '';
      // Strip accidental markdown fences
      const jsonStr = raw.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '');
      const parsed  = JSON.parse(jsonStr);

      // Validate key fields
      if (!parsed.title || !Array.isArray(parsed.outline)) throw new Error('Invalid AI response shape');
      if (!SEARCH_INTENTS.includes(parsed.searchIntent)) parsed.searchIntent = 'informational';

      return parsed;
    } catch (err) {
      logger.warn('ContentBriefService: OpenAI generation failed — using fallback', { err: err.message });
      return null;
    }
  }

  /**
   * Generate brief via Ollama (local, free, highest priority).
   */
  async _generateWithOllama(teamId, targetKeyword) {
    try {
      const relatedKeywords = await prisma.keyword.findMany({
        where:  { teamId },
        select: { keyword: true },
        take:   15,
      });
      const result = await ollama.generateContentBrief({
        keyword:         targetKeyword,
        relatedKeywords: relatedKeywords.map(k => k.keyword),
      });
      if (!result || !result.title || !Array.isArray(result.outline)) return null;
      if (!SEARCH_INTENTS.includes(result.searchIntent)) result.searchIntent = 'informational';
      return { ...result, _source: 'ollama' };
    } catch (err) {
      logger.warn('ContentBriefService: Ollama generation failed', { err: err.message });
      return null;
    }
  }

  /**
   * Generate brief via Gemini (free tier fallback when OpenAI is absent).
   */
  async _generateWithGemini(teamId, targetKeyword) {
    try {
      const relatedKeywords = await prisma.keyword.findMany({
        where:  { teamId },
        select: { keyword: true },
        take:   20,
      });
      const result = await gemini.generateContentBrief({
        keyword:         targetKeyword,
        relatedKeywords: relatedKeywords.map(k => k.keyword),
      });
      if (!result || !result.title || !Array.isArray(result.outline)) return null;
      if (!SEARCH_INTENTS.includes(result.searchIntent)) result.searchIntent = 'informational';
      return result;
    } catch (err) {
      logger.warn('ContentBriefService: Gemini generation failed — using fallback', { err: err.message });
      return null;
    }
  }

  /**
   * Generate brief via Anthropic Claude (reliable paid-key fallback).
   */
  async _generateWithAnthropic(teamId, targetKeyword) {
    try {
      const relatedKeywords = await prisma.keyword.findMany({
        where:  { teamId },
        select: { keyword: true },
        take:   12,
      });
      const result = await anthropic.generateContentBrief({
        keyword:         targetKeyword,
        relatedKeywords: relatedKeywords.map(k => k.keyword),
        instructions:    'Make every section heading specific and actionable. Avoid generic headings like "What is X?" or "Why X Matters". Each heading should promise concrete value.',
      });
      if (!result || !result.title || !Array.isArray(result.outline)) return null;
      if (!SEARCH_INTENTS.includes(result.searchIntent)) result.searchIntent = 'informational';
      return { ...result, _source: 'anthropic' };
    } catch (err) {
      logger.warn('ContentBriefService: Anthropic generation failed', { err: err.message });
      return null;
    }
  }

  /**
   * Deterministic fallback using TF-IDF + team keyword pool.
   */
  async _generateFallback(teamId, targetKeyword) {
    const allKeywords     = await prisma.keyword.findMany({ where: { teamId } });
    const relatedKeywords = this._clusterRelated(targetKeyword, allKeywords);
    const semanticTerms   = this._extractSemanticTerms(targetKeyword, relatedKeywords);

    const avgDifficulty = relatedKeywords.length
      ? relatedKeywords.reduce((s, k) => s + (k.difficulty || 50), 0) / relatedKeywords.length
      : 50;

    const outline = this._generateOutline(targetKeyword, semanticTerms);

    const brief = await prisma.contentBrief.create({
      data: {
        teamId,
        targetKeyword,
        title:           this._generateTitle(targetKeyword),
        outline,
        relatedKeywords: relatedKeywords.map((k) => k.keyword),
        status:          'draft',
      },
    });

    return {
      ...brief,
      metaDescription:  `A comprehensive guide to ${targetKeyword}. Learn everything you need to know about ${targetKeyword} in this in-depth article.`,
      targetWordCount:  this._estimateWordCount(avgDifficulty),
      searchIntent:     'informational',
      competitorAngle:  'Cover foundational topics comprehensively while adding unique data, examples, and actionable tips.',
      callToAction:     `Start implementing ${targetKeyword} best practices today.`,
      semanticTerms,
      relatedKeywordsEnriched: relatedKeywords.slice(0, 10),
      _source: 'fallback',
    };
  }

  _clusterRelated(target, keywords) {
    const targetTokens = new Set(tokenizer.tokenize(target.toLowerCase()).filter((t) => !stopwords.has(t)));
    return keywords.filter((kw) => {
      const tokens = new Set(tokenizer.tokenize(kw.keyword.toLowerCase()).filter((t) => !stopwords.has(t)));
      const intersection = [...targetTokens].filter((t) => tokens.has(t)).length;
      const union = new Set([...targetTokens, ...tokens]).size;
      return union > 0 && intersection / union >= 0.2;
    });
  }

  _extractSemanticTerms(targetKeyword, relatedKeywords) {
    const tfidf  = new TfIdf();
    const corpus = [targetKeyword, ...relatedKeywords.map((k) => k.keyword)];
    corpus.forEach((doc) => tfidf.addDocument(doc));
    const terms = {};
    tfidf.listTerms(0).slice(0, 20).forEach(({ term, tfidf: score }) => {
      if (!stopwords.has(term) && term.length > 2) terms[term] = parseFloat(score.toFixed(3));
    });
    return Object.entries(terms).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([term, score]) => ({ term, score }));
  }

  _estimateWordCount(avgDifficulty) {
    if (avgDifficulty < 30) return 800;
    if (avgDifficulty < 50) return 1200;
    if (avgDifficulty < 70) return 1800;
    return 2500;
  }

  _generateTitle(keyword) {
    const yr = new Date().getFullYear();
    const kCap = keyword.charAt(0).toUpperCase() + keyword.slice(1);
    const templates = [
      `${kCap}: The ${yr} Practical Guide (With Real Examples)`,
      `How to Get Results With ${kCap} — Actionable ${yr} Playbook`,
      `${kCap} Explained: What Actually Works in ${yr}`,
      `The ${yr} ${kCap} Handbook — From Basics to Advanced`,
    ];
    // deterministic pick based on keyword hash so it doesn't change on re-render
    const idx = keyword.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % templates.length;
    return templates[idx];
  }

  _generateOutline(keyword, semanticTerms) {
    const yr = new Date().getFullYear();
    const kCap = keyword.charAt(0).toUpperCase() + keyword.slice(1);
    const topTerms = semanticTerms.slice(0, 4).map((t) => t.term);
    return [
      {
        heading:   `The ${yr} State of ${kCap}: Key Trends You Can't Ignore`,
        subpoints: [`Why ${keyword} is more competitive than ever`, 'What top performers do differently', 'Benchmarks and industry data'],
      },
      {
        heading:   `${kCap} Fundamentals — What You Must Get Right First`,
        subpoints: ['Core mechanics and how they work', 'Common beginner mistakes that kill results', 'The 80/20 rule: where to focus your effort'],
      },
      ...(topTerms.length >= 1 ? [{
        heading:   `${kCap} + ${topTerms[0].charAt(0).toUpperCase() + topTerms[0].slice(1)}: The Winning Combination`,
        subpoints: ['Why this combination outperforms alternatives', 'Step-by-step implementation', 'Real-world results and case studies'],
      }] : []),
      ...(topTerms.length >= 2 ? [{
        heading:   `Advanced ${kCap}: ${topTerms[1].charAt(0).toUpperCase() + topTerms[1].slice(1)} Strategies That Scale`,
        subpoints: ['Tactics used by top 10% performers', 'Tools and automation to multiply output', 'How to measure and optimize continuously'],
      }] : []),
      {
        heading:   `${kCap} Toolkit: The Best Tools, Frameworks, and Resources (${yr})`,
        subpoints: ['Free vs. paid options compared', 'What the data says about ROI', 'Setup guide for each recommendation'],
      },
      {
        heading:   `Measuring ${kCap} Success: Metrics That Actually Matter`,
        subpoints: ['KPIs worth tracking (and ones to ignore)', 'Dashboard setup and reporting cadence', 'When to pivot vs. double down'],
      },
      {
        heading:   `Common ${kCap} Mistakes and How to Fix Them Fast`,
        subpoints: ['Top 5 errors that waste budget and time', 'Diagnostic checklist', 'Quick wins to implement today'],
      },
    ];
  }

  async getBriefs(teamId, { page = 1, limit = 10 } = {}) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      prisma.contentBrief.findMany({ where: { teamId }, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      prisma.contentBrief.count({ where: { teamId } }),
    ]);
    return { items, total };
  }

  /**
   * Delete a single content brief (team-scoped).
   */
  async deleteBrief(id, teamId) {
    const brief = await prisma.contentBrief.findFirst({ where: { id, teamId }, select: { id: true } });
    if (!brief) throw AppError.notFound('Brief');
    await prisma.contentBrief.delete({ where: { id } });
  }
}

module.exports = new ContentBriefService();
