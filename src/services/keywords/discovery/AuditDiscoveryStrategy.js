'use strict';

const prisma   = require('../../../config/prisma');
const AppError = require('../../../common/AppError');

const STOPWORDS = new Set([
  'the','and','for','with','that','this','from','have','will','are','was','not',
  'but','they','its','you','can','all','our','your','has','been','more','about',
  'into','than','when','what','which','who','how','also','get','use','any','his',
  'her','we','by','be','at','or','is','in','it','of','on','to','an','a',
]);

/**
 * AuditDiscoveryStrategy
 *
 * Extracts keyword suggestions from a completed SEO audit record.
 * Sources: page title, H1, meta description stored in rawCrawlData.
 *
 * Returns at most 15 unique suggestions ordered by frequency.
 */
class AuditDiscoveryStrategy {
  async extract(auditId, teamId) {
    const audit = await prisma.seoAudit.findFirst({
      where:  { id: auditId, teamId },
      select: { id: true, status: true, rawCrawlData: true, url: true },
    });

    if (!audit) throw AppError.notFound('Audit');
    if (audit.status !== 'completed' && audit.status !== 'complete') {
      throw AppError.badRequest('Audit must be completed before discovering keywords.');
    }

    // ── Collect text sources ────────────────────────────────────────────────
    const sources = [];

    const crawl = audit.rawCrawlData ?? {};
    const pages  = crawl.pages ?? [];
    const first  = pages[0] ?? {};

    if (first.title)           sources.push(first.title);
    if (first.h1)              sources.push(Array.isArray(first.h1) ? first.h1.join(' ') : first.h1);
    if (first.metaDescription) sources.push(first.metaDescription);

    // Also include top-level crawlStats title-like fields if pages[] is absent
    if (crawl.crawlStats?.title) sources.push(crawl.crawlStats.title);

    if (sources.length === 0) {
      // Fall back: tokenise the URL path
      try {
        const u = new URL(audit.url);
        sources.push(u.pathname.replace(/[/-]/g, ' '));
      } catch (_) {
        // ignore malformed URL
      }
    }

    // ── Tokenise + score by frequency ───────────────────────────────────────
    const freq = new Map();
    const allText = sources.join(' ').toLowerCase();
    const tokens  = allText.split(/[\s\W]+/).filter(Boolean);

    for (const token of tokens) {
      if (token.length < 3)          continue;
      if (/^\d+$/.test(token))       continue;   // digits-only
      if (STOPWORDS.has(token))      continue;

      freq.set(token, (freq.get(token) ?? 0) + 1);
    }

    // Also add 2-gram phrases from the first title/H1 (high quality source)
    const phraseSource = (first.title ?? first.h1 ?? '').toLowerCase();
    if (phraseSource) {
      const words = phraseSource.split(/[\s\W]+/).filter((w) => w.length >= 3 && !STOPWORDS.has(w));
      for (let i = 0; i < words.length - 1; i++) {
        const bigram = `${words[i]} ${words[i + 1]}`;
        freq.set(bigram, (freq.get(bigram) ?? 0) + 2); // boost bigrams
      }
    }

    // ── Sort + slice to top 15 ───────────────────────────────────────────────
    const sorted = [...freq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([kw]) => ({ keyword: kw, source: 'audit' }));

    return sorted;
  }
}

module.exports = AuditDiscoveryStrategy;
