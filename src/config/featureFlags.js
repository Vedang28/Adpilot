'use strict';

/**
 * Runtime feature flags for AdPilot.
 *
 * Flags are read from environment variables at process start so they can be
 * toggled via infrastructure (env var update + rolling restart) without a
 * code deploy.
 *
 * Convention:
 *   - Default ON features: read `!== 'false'`  (truthy unless explicitly disabled)
 *   - Default OFF features: read `=== 'true'`  (falsy unless explicitly enabled)
 */
module.exports = {

  seoEngine: {
    /**
     * When true: route audit jobs through the new v2 engine
     * (Puppeteer + Lighthouse + full rule set + weighted scoring).
     *
     * When false: fall through to the legacy SeoAuditService
     * (axios + Cheerio, single-page, no Lighthouse).
     *
     * Default: OFF — must opt in explicitly.
     * Flip via: SEO_ENGINE_V2=true
     */
    v2: process.env.SEO_ENGINE_V2 === 'true',
  },

  lighthouse: {
    /**
     * Disable Lighthouse entirely (e.g., staging environments without
     * enough RAM, or when Chrome crashes under load).
     *
     * Default: ON.
     * Flip via: LIGHTHOUSE_ENABLED=false
     */
    enabled: process.env.LIGHTHOUSE_ENABLED !== 'false',
  },

  seoSummary: {
    /**
     * Generate LLM executive summary after scoring.
     * Disable to save Claude API tokens during development.
     *
     * Default: ON.
     * Flip via: SEO_SUMMARY_ENABLED=false
     */
    enabled: process.env.SEO_SUMMARY_ENABLED !== 'false',
  },
};
