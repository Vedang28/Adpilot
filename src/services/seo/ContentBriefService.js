'use strict';

const natural = require('natural');
const prisma  = require('../../config/prisma');
const logger  = require('../../config/logger');
const AppError = require('../../common/AppError');

const TfIdf     = natural.TfIdf;
const tokenizer = new natural.WordTokenizer();
const stopwords = new Set([
  'a','an','the','and','or','but','in','on','at','to','for','of','with','by',
  'is','are','was','were','be','been','being','have','has','had','do','does',
  'did','will','would','could','should','may','might','shall','can',
  'this','that','these','those','it','its','i','we','you','he','she','they',
  'not','from','up','out','as','into','if','then','so','than',
]);

class ContentBriefService {
  /**
   * Generate a deterministic content brief for a target keyword.
   * Cluster related keywords → compute TF-IDF semantic terms → build outline.
   *
   * @param {string} teamId
   * @param {string} targetKeyword
   * @returns {object} brief
   */
  async generate(teamId, targetKeyword) {
    if (!targetKeyword?.trim()) throw AppError.badRequest('targetKeyword is required');

    // Load team's keyword pool
    const allKeywords = await prisma.keyword.findMany({ where: { teamId } });

    // Cluster related keywords using simple string similarity
    const relatedKeywords = this._clusterRelated(targetKeyword, allKeywords);

    // TF-IDF: build semantic corpus from keyword strings
    const semanticTerms = this._extractSemanticTerms(targetKeyword, relatedKeywords);

    // Estimate recommended word count from difficulty/competition proxy
    const avgDifficulty = relatedKeywords.length
      ? relatedKeywords.reduce((s, k) => s + (k.difficulty || 50), 0) / relatedKeywords.length
      : 50;
    const recommendedWordCount = this._estimateWordCount(avgDifficulty);

    // Generate heading outline
    const outline = this._generateOutline(targetKeyword, semanticTerms);

    const brief = await prisma.contentBrief.create({
      data: {
        teamId,
        targetKeyword,
        title: this._generateTitle(targetKeyword),
        outline,
        relatedKeywords: relatedKeywords.map((k) => k.keyword),
        status: 'draft',
      },
    });

    return {
      ...brief,
      semanticTerms,
      recommendedWordCount,
      relatedKeywordsEnriched: relatedKeywords.slice(0, 10),
    };
  }

  _clusterRelated(target, keywords) {
    const targetTokens = new Set(tokenizer.tokenize(target.toLowerCase()).filter((t) => !stopwords.has(t)));

    return keywords.filter((kw) => {
      const tokens = new Set(tokenizer.tokenize(kw.keyword.toLowerCase()).filter((t) => !stopwords.has(t)));
      // Jaccard similarity
      const intersection = [...targetTokens].filter((t) => tokens.has(t)).length;
      const union = new Set([...targetTokens, ...tokens]).size;
      return union > 0 && intersection / union >= 0.2;
    });
  }

  _extractSemanticTerms(targetKeyword, relatedKeywords) {
    const tfidf   = new TfIdf();
    const corpus  = [targetKeyword, ...relatedKeywords.map((k) => k.keyword)];
    corpus.forEach((doc) => tfidf.addDocument(doc));

    const terms = {};
    tfidf.listTerms(0).slice(0, 20).forEach(({ term, tfidf: score }) => {
      if (!stopwords.has(term) && term.length > 2) terms[term] = parseFloat(score.toFixed(3));
    });
    return Object.entries(terms).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([term, score]) => ({ term, score }));
  }

  _estimateWordCount(avgDifficulty) {
    // Higher difficulty keywords need more comprehensive content
    if (avgDifficulty < 30) return 800;
    if (avgDifficulty < 50) return 1200;
    if (avgDifficulty < 70) return 1800;
    return 2500;
  }

  _generateTitle(keyword) {
    const templates = [
      `The Complete Guide to ${keyword}`,
      `${keyword}: Everything You Need to Know`,
      `How to Master ${keyword} in 2024`,
      `${keyword} Explained: A Comprehensive Overview`,
    ];
    return templates[Math.floor(Math.random() * templates.length)];
  }

  _generateOutline(keyword, semanticTerms) {
    const topTerms = semanticTerms.slice(0, 6).map((t) => t.term);
    return [
      { level: 'h2', text: `What is ${keyword}?`, wordCount: 200 },
      { level: 'h2', text: `Why ${keyword} Matters`, wordCount: 250 },
      ...topTerms.slice(0, 3).map((term) => ({
        level: 'h2',
        text: `${keyword} and ${term.charAt(0).toUpperCase() + term.slice(1)}`,
        wordCount: 300,
      })),
      { level: 'h2', text: `Best Practices for ${keyword}`, wordCount: 400, children: [
        { level: 'h3', text: 'Getting Started', wordCount: 150 },
        { level: 'h3', text: 'Advanced Techniques', wordCount: 200 },
      ]},
      { level: 'h2', text: `Common ${keyword} Mistakes to Avoid`, wordCount: 200 },
      { level: 'h2', text: `Frequently Asked Questions`, wordCount: 200 },
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
}

module.exports = new ContentBriefService();
