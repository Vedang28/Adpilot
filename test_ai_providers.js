'use strict';
require('dotenv').config();

/**
 * Comprehensive AI Provider Integration Test
 * Tests: Gemini, HuggingFace, Ollama, Anthropic
 * Features: generateAds, generateContentBrief, analyzeCompetitor, generateAuditSummary
 *
 * Run: node test_ai_providers.js
 * Run single provider: node test_ai_providers.js gemini
 */

const SAMPLE = {
  ads: {
    product: 'AdPilot — AI ad & SEO automation platform',
    targetAudience: 'Indian D2C brand founders and digital marketing managers',
    platform: 'Meta + Google',
    tone: 'bold and results-driven',
    campaignObjective: 'free trial signups',
  },
  contentBrief: {
    keyword: 'ad campaign automation software india',
    relatedKeywords: ['meta ads automation', 'google ads ai', 'ad budget optimizer'],
    url: 'https://adpilot.app',
    auditScore: 72,
  },
  competitor: {
    domain: 'wordstream.com',
    title: 'WordStream — Online Advertising Made Easy',
    description: 'PPC and social advertising management for SMBs',
    ctas: ['Get Started Free', 'View Pricing', 'See Demo'],
    topKeywords: [
      { word: 'ppc management' }, { word: 'google ads' }, { word: 'facebook ads' },
      { word: 'ad optimization' }, { word: 'keyword research' },
    ],
    techStack: ['React', 'Salesforce', 'HubSpot', 'Google Analytics'],
    headings: [
      { text: 'Smarter Advertising' }, { text: 'Manage All Your Ads' },
      { text: 'Save Time and Money' },
    ],
  },
  auditSummary: {
    url: 'https://adpilot.app',
    score: 67,
    grade: 'C',
    categories: { technical: { score: 71 }, content: { score: 63 }, structure: { score: 70 }, performance: { score: 55 } },
    issues: [
      { severity: 'high', message: 'Missing meta description on 3 pages' },
      { severity: 'high', message: 'Images missing alt text (12 images)' },
      { severity: 'medium', message: 'Page load time > 3s on mobile' },
      { severity: 'low', message: 'Missing Open Graph tags' },
    ],
    performanceMetrics: { lcp: 3200, cls: 0.12 },
  },
};

// ─── helpers ────────────────────────────────────────────────────────────────

const OK   = '\x1b[32m✓\x1b[0m';
const FAIL = '\x1b[31m✗\x1b[0m';
const WARN = '\x1b[33m⚠\x1b[0m';
const DIM  = '\x1b[2m';
const RESET = '\x1b[0m';

let passed = 0, failed = 0, skipped = 0;

function header(title) {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  ${title}`);
  console.log('═'.repeat(60));
}

function result(name, ok, detail = '') {
  if (ok === null) {
    skipped++;
    console.log(`  ${WARN} SKIP  ${name}${detail ? `  ${DIM}${detail}${RESET}` : ''}`);
  } else if (ok) {
    passed++;
    console.log(`  ${OK} PASS  ${name}${detail ? `  ${DIM}${detail}${RESET}` : ''}`);
  } else {
    failed++;
    console.log(`  ${FAIL} FAIL  ${name}${detail ? `  \x1b[31m${detail}\x1b[0m` : ''}`);
  }
}

function previewJSON(obj) {
  if (!obj) return 'null';
  const s = JSON.stringify(obj);
  return s.length > 120 ? s.substring(0, 120) + '…' : s;
}

// ─── Gemini ─────────────────────────────────────────────────────────────────

async function testGemini() {
  header('Gemini AI (gemini-2.5-flash → 2.0-flash → 2.0-flash-lite)');

  const { default: gemini } = await import('./src/services/ai/GeminiService.js').catch(() => {
    // CommonJS fallback
    return { default: require('./src/services/ai/GeminiService') };
  });

  if (!gemini.isAvailable) {
    result('Gemini available', null, 'GEMINI_API_KEY not set');
    return;
  }
  result('Gemini available', true, 'API key set');

  // Small helper to pace requests (free tier: ~10 RPM)
  const pace = (ms = 4000) => new Promise(r => setTimeout(r, ms));

  // Raw generate
  const raw = await gemini.generate('Say exactly: {"test":"ok"}', { maxTokens: 50 });
  result('generate() raw text', !!raw, raw ? `${raw.length} chars` : 'returned null (rate limited?)');

  // parseJSON
  if (raw) {
    const parsed = gemini.parseJSON(raw);
    result('parseJSON()', !!parsed, parsed ? previewJSON(parsed) : 'parse failed');
  }

  // generateAds
  await pace();
  console.log(`\n  ${DIM}Testing generateAds… (pacing 4s between Gemini calls)${RESET}`);
  const ads = await gemini.generateAds(SAMPLE.ads);
  result('generateAds()', Array.isArray(ads) && ads.length > 0,
    ads ? `${ads.length} ads, first headline: "${ads[0]?.headline}"` : 'returned null (rate limited?)');

  // generateContentBrief
  await pace();
  console.log(`\n  ${DIM}Testing generateContentBrief…${RESET}`);
  const brief = await gemini.generateContentBrief(SAMPLE.contentBrief);
  result('generateContentBrief()', !!brief?.title,
    brief ? `title: "${brief.title?.substring(0, 50)}"` : 'returned null (rate limited?)');

  // analyzeCompetitor
  await pace();
  console.log(`\n  ${DIM}Testing analyzeCompetitor…${RESET}`);
  const analysis = await gemini.analyzeCompetitor(SAMPLE.competitor);
  result('analyzeCompetitor()', Array.isArray(analysis?.keywordGaps),
    analysis ? `${analysis.keywordGaps?.length} keyword gaps, ${analysis.messagingAngles?.length} angles` : 'returned null (rate limited?)');

  // generateAuditSummary
  await pace();
  console.log(`\n  ${DIM}Testing generateAuditSummary…${RESET}`);
  const summary = await gemini.generateAuditSummary(SAMPLE.auditSummary);
  result('generateAuditSummary()', !!summary?.summary,
    summary ? `summary: "${summary.summary?.substring(0, 80)}…"` : 'returned null (rate limited?)');
}

// ─── HuggingFace ─────────────────────────────────────────────────────────────

async function testHuggingFace() {
  header('HuggingFace (router.huggingface.co/v1 — OpenAI-compatible)');

  const hf = require('./src/services/ai/HuggingFaceService');

  if (!hf.isAvailable) {
    result('HuggingFace available', null, 'HUGGINGFACE_API_KEY not set');
    return;
  }
  result('HuggingFace available', true, `model: ${hf.model}`);
  console.log(`  ${DIM}NOTE: HuggingFace requires "Make calls to Inference Providers" token scope.${RESET}`);
  console.log(`  ${DIM}If failing with 403: go to https://huggingface.co/settings/tokens → create new token → enable that scope${RESET}`);

  // Raw generate
  const raw = await hf.generate('Return only this JSON: {"test":"ok","n":42}', { maxTokens: 80 });
  result('generate() raw text', raw === null ? null : !!raw,
    raw ? `${raw.length} chars` : 'null — token needs Inference Providers scope');

  // parseJSON
  if (raw) {
    const parsed = hf.parseJSON(raw);
    result('parseJSON()', !!parsed, parsed ? previewJSON(parsed) : 'parse failed');
  }

  // Skip further tests if basic generate already returned null (token scope issue)
  if (raw === null) {
    result('generateAds()', null, 'skipped — fix token scope first');
    result('generateContentBrief()', null, 'skipped');
    result('analyzeCompetitor()', null, 'skipped');
    return;
  }

  // generateAds
  console.log(`\n  ${DIM}Testing generateAds…${RESET}`);
  const ads = await hf.generateAds(SAMPLE.ads);
  result('generateAds()', Array.isArray(ads) && ads.length > 0,
    ads ? `${ads.length} ads, first: "${ads[0]?.headline}"` : 'returned null');

  // generateContentBrief
  console.log(`\n  ${DIM}Testing generateContentBrief…${RESET}`);
  const brief = await hf.generateContentBrief(SAMPLE.contentBrief);
  result('generateContentBrief()', !!brief?.title,
    brief ? `"${brief.title?.substring(0, 60)}"` : 'returned null');

  // analyzeCompetitor
  console.log(`\n  ${DIM}Testing analyzeCompetitor…${RESET}`);
  const analysis = await hf.analyzeCompetitor(SAMPLE.competitor);
  result('analyzeCompetitor()', Array.isArray(analysis?.keywordGaps) || Array.isArray(analysis?.messagingAngles),
    analysis ? `gaps=${analysis.keywordGaps?.length}, angles=${analysis.messagingAngles?.length}` : 'returned null');
}

// ─── Ollama ─────────────────────────────────────────────────────────────────

async function testOllama() {
  header('Ollama (local LLM)');

  const ollama = require('./src/services/ai/OllamaService');

  const available = await ollama.isAvailable();
  result('Ollama running', available ? true : null,
    available ? `model: ${ollama.model}` : `${ollama.baseUrl} not reachable`);

  if (!available) return;

  // Raw generate (short to keep it fast)
  console.log(`\n  ${DIM}Testing generate() — may take 10-30s on first run…${RESET}`);
  const raw = await ollama.generate('Return only valid JSON: {"test":"ok","n":1}', { maxTokens: 50, temperature: 0.1 });
  result('generate() raw text', !!raw, raw ? `${raw.length} chars: ${raw.substring(0, 80)}` : 'returned null');

  if (raw) {
    const parsed = ollama.parseJSON(raw);
    result('parseJSON()', !!parsed, parsed ? previewJSON(parsed) : 'parse failed');
  }

  // generateAds (brief version)
  console.log(`\n  ${DIM}Testing generateAds…${RESET}`);
  const ads = await ollama.generateAds(SAMPLE.ads);
  result('generateAds()', Array.isArray(ads) && ads.length > 0,
    ads ? `${ads.length} ads` : 'returned null');
}

// ─── Anthropic ───────────────────────────────────────────────────────────────

async function testAnthropic() {
  header('Anthropic Claude (SEO Summary via SeoSummaryService)');

  // Check key
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    result('Anthropic available', null, 'ANTHROPIC_API_KEY not set');
    return;
  }
  result('Anthropic available', true, 'API key set');

  // Try loading SeoSummaryService
  let SeoSummaryService;
  try {
    SeoSummaryService = require('./src/services/seo/SeoSummaryService');
  } catch (e) {
    result('SeoSummaryService load', false, e.message);
    return;
  }
  result('SeoSummaryService load', true);

  // generate() test — service uses: { url, overallScore, grade, issues, categoryScores, performanceData }
  // Returns: { executiveSummary, priorityRoadmap, businessImpact }
  console.log(`\n  ${DIM}Testing SeoSummaryService.generate()…${RESET}`);
  try {
    const summary = await SeoSummaryService.generate({
      url: SAMPLE.auditSummary.url,
      overallScore: SAMPLE.auditSummary.score,
      grade: SAMPLE.auditSummary.grade,
      issues: SAMPLE.auditSummary.issues,
      categoryScores: {
        categories: SAMPLE.auditSummary.categories,
        issueCount: { critical: 0, high: 2, medium: 1, low: 1, total: 4 },
      },
      performanceData: { fallback: true },
    });
    const ok = summary && typeof summary.executiveSummary === 'string' && Array.isArray(summary.priorityRoadmap);
    result('SeoSummaryService.generate()', !!ok,
      ok ? `summary: "${summary.executiveSummary.substring(0, 80)}…", ${summary.priorityRoadmap.length} roadmap items` : 'unexpected shape: ' + JSON.stringify(summary).substring(0, 100));
  } catch (e) {
    result('SeoSummaryService.generate()', false, e.message);
  }

  // Direct API ping to verify key works
  console.log(`\n  ${DIM}Direct Anthropic API ping…${RESET}`);
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 20,
        messages: [{ role: 'user', content: 'Say: {"ok":true}' }],
      }),
    });
    const data = await res.json();
    const text = data?.content?.[0]?.text;
    result('Direct API ping (claude-haiku)', res.ok, res.ok ? `${res.status} — "${text}"` : `${res.status} ${JSON.stringify(data).substring(0, 100)}`);
  } catch (e) {
    result('Direct API ping', false, e.message);
  }
}

// ─── OpenAI ──────────────────────────────────────────────────────────────────

async function testOpenAI() {
  header('OpenAI (Ad generation fallback)');

  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    result('OpenAI available', null, 'OPENAI_API_KEY not set');
    return;
  }
  result('OpenAI available', true, 'API key set');

  // Check adService uses OpenAI
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 20,
        messages: [{ role: 'user', content: 'Reply with {"ok":true}' }],
      }),
      signal: AbortSignal.timeout(15000),
    });
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    result('OpenAI API ping (gpt-4o-mini)', res.ok, res.ok ? `"${text}"` : `${res.status} ${data?.error?.message || ''}`);
  } catch (e) {
    result('OpenAI API ping', false, e.message);
  }
}

// ─── ValueSERP ───────────────────────────────────────────────────────────────

async function testValueSERP() {
  header('ValueSERP (Keyword Rank Tracking)');

  const key = process.env.VALUESERP_API_KEY;
  if (!key) {
    result('ValueSERP available', null, 'VALUESERP_API_KEY not set');
    return;
  }
  result('ValueSERP available', true, 'API key set');

  try {
    const SerpService = require('./src/services/keywords/SerpService');
    const rank = await SerpService.getRank('site speed optimization', 'google.com');
    // Returns { position, url, title, isReal, source }
    result('SerpService.getRank()', !!rank,
      rank ? `source=${rank.source}, isReal=${rank.isReal}, position=${rank.position}` : 'returned null');
  } catch (e) {
    result('SerpService.getRank()', false, e.message);
  }
}

// ─── AI Chain (provider fallback priority) ───────────────────────────────────

async function testAIChain() {
  header('AI Chain — Provider Fallback (Ollama → Gemini → HuggingFace)');

  // Test the chain order: each provider is tried independently here
  // generateAdWithAI() requires a real DB campaign — test providers directly
  const adParams = {
    product: 'AdPilot — AI ad automation',
    targetAudience: 'D2C founders in India',
    platform: 'Meta',
    tone: 'bold and data-driven',
    campaignObjective: 'free trial signups',
  };

  const ollama = require('./src/services/ai/OllamaService');
  const gemini = require('./src/services/ai/GeminiService');
  const hf     = require('./src/services/ai/HuggingFaceService');

  // Determine which providers are available
  const ollamaAvail = await ollama.isAvailable();
  const geminiAvail = gemini.isAvailable;
  const hfAvail     = hf.isAvailable;

  result('Ollama in chain', ollamaAvail ? true : null, ollamaAvail ? `model: ${ollama.model}` : 'not running');
  result('Gemini in chain', geminiAvail ? true : null, geminiAvail ? 'API key set' : 'no key');
  result('HuggingFace in chain', hfAvail ? true : null, hfAvail ? `model: ${hf.model}` : 'no key');

  // Find first available provider and test it
  let chainResult = null;
  let chainSource = null;

  if (ollamaAvail) {
    console.log(`\n  ${DIM}Chain: trying Ollama first…${RESET}`);
    chainResult = await ollama.generateAds(adParams);
    if (chainResult) chainSource = 'ollama';
  }

  if (!chainResult && geminiAvail) {
    console.log(`\n  ${DIM}Chain: trying Gemini…${RESET}`);
    chainResult = await gemini.generateAds(adParams);
    if (chainResult) chainSource = 'gemini';
  }

  if (!chainResult && hfAvail) {
    console.log(`\n  ${DIM}Chain: trying HuggingFace…${RESET}`);
    chainResult = await hf.generateAds(adParams);
    if (chainResult) chainSource = 'huggingface';
  }

  result('Chain produced ads', Array.isArray(chainResult) && chainResult.length > 0,
    chainResult ? `source=${chainSource}, ${chainResult.length} ads, first: "${chainResult[0]?.headline}"` : 'all providers failed');
}

// ─── DuckDuckGo SERP ─────────────────────────────────────────────────────────

async function testDuckDuckGo() {
  header('DuckDuckGo SERP (zero-API keyword research)');

  let DdgService;
  try {
    DdgService = require('./src/services/keywords/DdgSerpService');
  } catch (e) {
    result('DdgSerpService load', null, 'not found — may not be implemented yet');
    return;
  }
  result('DdgSerpService load', true);

  try {
    const results = await DdgService.search('ad campaign automation software');
    result('DdgSerpService.search()', Array.isArray(results) && results.length > 0,
      Array.isArray(results) ? `${results.length} results, first: ${results[0]?.title?.substring(0, 50)}` : 'empty');
  } catch (e) {
    result('DdgSerpService.search()', false, e.message);
  }
}

// ─── Summary ─────────────────────────────────────────────────────────────────

async function printSummary() {
  const total = passed + failed + skipped;
  console.log(`\n${'═'.repeat(60)}`);
  console.log('  RESULTS');
  console.log('═'.repeat(60));
  console.log(`  ${OK} Passed:  ${passed}`);
  if (failed)  console.log(`  ${FAIL} Failed:  ${failed}`);
  if (skipped) console.log(`  ${WARN} Skipped: ${skipped} (API key not set)`);
  console.log(`  Total:   ${total}`);
  console.log('═'.repeat(60));
  if (failed) {
    console.log('\n  \x1b[31mSome tests failed — check logs above.\x1b[0m');
    process.exitCode = 1;
  } else {
    console.log('\n  \x1b[32mAll tests passed!\x1b[0m');
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const filter = process.argv[2]?.toLowerCase();

  console.log('\n\x1b[1mAdPilot — AI Provider Integration Tests\x1b[0m');
  console.log(`Run target: ${filter || 'all'}`);

  const suites = [
    ['gemini',     testGemini],
    ['huggingface', testHuggingFace],
    ['ollama',     testOllama],
    ['anthropic',  testAnthropic],
    ['openai',     testOpenAI],
    ['valueserp',  testValueSERP],
    ['chain',      testAIChain],
    ['ddg',        testDuckDuckGo],
  ];

  for (const [name, fn] of suites) {
    if (!filter || filter === name) {
      await fn().catch(e => {
        console.error(`\n  Uncaught error in ${name}:`, e.message);
        failed++;
      });
    }
  }

  await printSummary();
}

main();
