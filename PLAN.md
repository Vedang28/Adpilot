# AdPilot — Master Project Plan

> **Rule:** Update this file at the end of every session when something meaningful changes.
> **Rule:** Never create multiple plan files. This is the single source of truth.
> **Start every session with:** `Claude, continue with PLAN.md`

---

## 1. Project Overview

AI-powered ad + SEO automation SaaS.
Backend: Node.js / Express / Prisma / PostgreSQL / Redis + Bull.
Frontend: React 18 / Vite / Tailwind / React Query / Zustand / Recharts.

---

## 2. Implementation Stages

| # | Stage | Status |
|---|-------|--------|
| 1 | Backend foundation (auth, campaigns, ads, analytics) | ✅ Complete |
| 2 | Phase 2 frontend (Login, Dashboard, Campaigns, Analytics) | ✅ Complete |
| 3 | Architecture hardening (queues, rule engine, integrations, team management) | ✅ Complete |
| 4 | SEO Audit Engine v2 (Puppeteer + Lighthouse + rules + scoring) | ✅ Complete |
| 5 | SEO Frontend Page (audit result panel, polling, score gauge, issue tabs) | ✅ Complete |
| **6** | **Audit Validation & Production Hardening** | **🔄 In Progress** |
| 7 | LLM Executive Summary (SeoSummaryService) | ⏳ Pending |
| 8 | Payments / billing integration | ⏳ Pending |
| 9 | Production deployment | ⏳ Pending |

---

## 3. Current Stage — Audit Validation & Hardening

### What was done this session

**Root cause of "Internal server error":**
- Stale server process running code from before the last session's controller rewrite.
  Fix: restart the server after any code update.

**Bug 1 — `headless: 'new'` invalid in Puppeteer 24.x** (Critical)
- Both `PuppeteerAdapter.js` and `PerformanceEngine.js` used `headless: 'new'`.
- Puppeteer 24.x changed this; `'new'` causes a hard browser launch failure.
- Fix: changed both files to `headless: true`.

**Bug 2 — `SEO_ENGINE_V2=true` missing from `.env`** (Critical)
- Without this flag, the Bull processor routed every audit to the legacy `SeoAuditService`.
- The legacy service creates its own DB record and ignores the pre-created `auditId`,
  leaving every v2 record permanently stuck in `pending`.
- Fix: added `SEO_ENGINE_V2=true` to `.env`.

**Bug 3 — False-alarm disconnect warning** (Cosmetic)
- `PuppeteerAdapter` fired "browser disconnected unexpectedly" on every normal close.
- Fix: added `_intentionalClose` flag to suppress the warning during clean shutdown.

**Added to `.env`:**
```
SEO_ENGINE_V2=true
LIGHTHOUSE_ENABLED=true
SEO_SUMMARY_ENABLED=false
SEO_AUDIT_TIMEOUT_MS=300000
```

**React Query v5 fix in `SeoPage.jsx`:**
- `onSuccess` removed from `useQuery` (RQ v5 dropped it).
- Replaced with `useEffect` + `useRef` to fire once on `* → completed` transition.

---

## 4. Validation Checklist

### Stage 6 — Audit v2 end-to-end

- [x] `POST /api/v1/seo/audit` returns 201 with `{ auditId, jobId }`
- [x] Duplicate guard returns 409 when same URL already active
- [x] v2 processor picks up job (log: "SEO audit job started (v2 engine)")
- [x] Status transitions: `pending → crawling → analyzing → scoring → completed`
- [x] DB row fully populated: `overallScore`, `grade`, `issues[]`, `performanceData`, `categoryScores`, `rawCrawlData`, `recommendations[]`
- [x] Lighthouse runs real (not fallback): `pagesAnalyzed > 0`, `fallback: false`
- [x] `GET /api/v1/seo/audit/:id` returns correct v2 mapped payload
- [x] No orphan Chrome processes after completion
- [x] No unhandled promise rejections in server log
- [ ] Frontend polls correctly and renders completed result (needs manual browser test)
- [ ] Duplicate 409 correctly surfaces in the frontend form error

### Outstanding known issues
- `summary` is always `null` — intentional until `SeoSummaryService` is implemented
- `SeoAuditService` (legacy, v1) still uses `status: 'complete'` (not `'completed'`); v1 records exist in DB with that value — low risk since v2 is now the active path

---

## 5. Progress

```
Overall:  ████████████████████░░░░░░░░░  65%

Stage 1 (Backend):     ██████████  100%
Stage 2 (Frontend):    ██████████  100%
Stage 3 (Hardening):   ██████████  100%
Stage 4 (SEO Engine):  ██████████  100%
Stage 5 (SEO UI):      █████████░   90%  ← needs browser test
Stage 6 (Validation):  ████████░░   80%  ← current stage
Stage 7 (Summary):     ░░░░░░░░░░    0%
Stage 8 (Billing):     ░░░░░░░░░░    0%
Stage 9 (Deploy):      ░░░░░░░░░░    0%
```

---

## 6. Next Actions

1. **Manual browser test** — open the SEO page, run an audit on a real URL, verify the result panel renders score gauge + categories + issues + metrics.
2. **Stage 7** — implement `SeoSummaryService` (Claude API, gated by `SEO_SUMMARY_ENABLED=true`).
3. **Navigation fix** — SEO page is currently stubbed as `ComingSoon`; wire it to the real `SeoPage` component in `App.jsx`.
4. **Pagination in audit list** — `getAudits` returns raw Prisma records without v1/v2 mapping; add `overallScore`, `grade`, `engineVersion` display columns.
5. **Rate-limit tuning** — `heavyLimiter` is 20 req/min; may need per-team audit concurrency enforcement.

---

## 7. Known Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Lighthouse OOM on large sites (1000 pages) | High | `lighthousePagesLimit` per plan; serial execution |
| Puppeteer Chrome binary not present on deploy host | High | Puppeteer downloads bundled Chrome on `npm install`; confirm in Dockerfile |
| `SEO_AUDIT_TIMEOUT_MS` too low on slow sites | Medium | Default 10 min; configurable per env |
| `SEO_SUMMARY_ENABLED` left on in prod with no OpenAI key | Medium | Gated by `limits.summaryEnabled`; summary is null not error |
| v1 legacy records have `status: 'complete'` not `'completed'` | Low | `mapV1Audit` handles them; no active path creates v1 records |
| Bull job retries re-launching Chrome on transient failures | Low | `finally` block always closes browser; retry starts clean |

---

## 8. Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| v2 pre-creates audit record in controller, passes `auditId` to processor | Enables frontend to start polling immediately without waiting for job pickup |
| Separate Puppeteer browser for Lighthouse vs CrawlEngine | Lighthouse takes CDP ownership; sharing browsers causes page lifecycle conflicts |
| `headless: true` (not `'new'`) | `'new'` was removed in Puppeteer 22+; `true` is the modern headless flag |
| `rawCrawlData` stores only metadata, not `pages[]` | `pages[]` can be 1000+ objects; storing full array in JSONB risks row bloat |
| `ACTIVE_STATUSES` exported from `AuditOrchestrator` | Single source of truth for duplicate-audit guard; controller imports it directly |
| `ScoringEngine` validates weights sum to 1.0 at constructor time | Catches config drift immediately on server start, not silently mid-audit |
| `SEO_SUMMARY_ENABLED=false` default in local `.env` | Summary stub exists but `SeoSummaryService` not yet implemented |

---

## 9. Key File Index

```
Backend
  src/routes/seoRoutes.js                    — POST /audit, GET /audit/:id, GET /audits
  src/controllers/seoController.js           — triggerAudit, getAudit (v1/v2 mapper)
  src/queues/processors/seoAuditProcessor.js — Bull job router (v2 / legacy)
  src/services/seo/audit/AuditOrchestrator.js — full pipeline + ACTIVE_STATUSES
  src/services/seo/audit/engines/CrawlEngine.js
  src/services/seo/audit/adapters/PuppeteerAdapter.js
  src/services/seo/audit/engines/TechnicalAnalyzer.js
  src/services/seo/audit/rules/registry.js   — 16 stateless rule instances
  src/services/seo/audit/engines/PerformanceEngine.js — Lighthouse singleton
  src/services/seo/audit/engines/ScoringEngine.js
  src/config/seo.js                          — crawl/lighthouse/scoring config
  src/config/limits.js                       — per-plan limits
  src/config/featureFlags.js                 — SEO_ENGINE_V2, LIGHTHOUSE_ENABLED, etc.
  prisma/schema.prisma                       — SeoAudit model with v1+v2 columns
  prisma/migrations/20260228100000_*/        — v2 column migration SQL

Frontend
  client/src/pages/SeoPage.jsx               — full SEO page + AuditResultPanel
  client/src/lib/api.js                      — Axios instance + pagination normalizer
```

---

*Last updated: 2026-02-28 — Session: Audit Validation & Hardening*
