'use strict';

/**
 * BaseCrawlerAdapter — interface contract for all web crawlers.
 *
 * Implementations must override fetchPage() and close().
 * CrawlEngine depends only on this interface — swapping Puppeteer for
 * Playwright (or any other headless tool) requires no changes outside
 * of the concrete adapter.
 *
 * RawPageData contract (what fetchPage must return):
 * {
 *   url:                string,    // the URL that was requested
 *   finalUrl:           string,    // URL after all redirects (may differ)
 *   depth:              number,    // BFS depth (0 = seed page)
 *   statusCode:         number,    // HTTP status code; 0 if navigation failed
 *   redirectChain:      string[],  // intermediate URLs traversed
 *   failed:             boolean,   // true if navigation/timeout error
 *   failReason:         string|null,
 *   loadTimeMs:         number,    // wall-clock ms from request to DOMContentLoaded
 *   title:              string|null,
 *   titleLength:        number,
 *   metaDescription:    string|null,
 *   metaDescLength:     number,
 *   h1Count:            number,
 *   h1Text:             string|null,  // first H1 text (for cross-page duplicate detection)
 *   h2Count:            number,
 *   wordCount:          number,
 *   imagesMissingAlt:   number,
 *   totalImages:        number,
 *   internalLinksCount: number,
 *   externalLinksCount: number,
 *   internalLinks:      string[],  // normalized absolute internal URLs
 *   canonicalTag:       string|null,
 *   hasSchema:          boolean,
 *   hasOpenGraph:       boolean,
 *   hasViewport:        boolean,
 *   isHttps:            boolean,
 * }
 *
 * CrawlEngine adds these fields after BFS completes:
 *   inboundLinkCount:   number
 *   isOrphan:           boolean
 */
class BaseCrawlerAdapter {
  /**
   * Fetch a single page and extract all SEO-relevant data from it.
   *
   * MUST NOT throw for non-2xx responses or navigation errors — return a
   * RawPageData with { failed: true, failReason, statusCode } instead.
   * Only throw for programming errors (bad arguments, etc.).
   *
   * @param {string} url     - Absolute URL to fetch
   * @param {number} depth   - BFS depth of this page (informational)
   * @param {object} options
   * @param {number} [options.timeout] - Navigation timeout override in ms
   * @returns {Promise<RawPageData>}
   */
  // eslint-disable-next-line no-unused-vars
  async fetchPage(url, depth, options = {}) {
    throw new Error(`${this.constructor.name} must implement fetchPage()`);
  }

  /**
   * Release all browser/network resources held by this adapter.
   * Called by AuditOrchestrator in a finally block — must be idempotent.
   *
   * @returns {Promise<void>}
   */
  async close() {
    throw new Error(`${this.constructor.name} must implement close()`);
  }
}

module.exports = BaseCrawlerAdapter;
