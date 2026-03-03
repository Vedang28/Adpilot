# AdPilot — Feature Status Dashboard

> **Rule:** Update this file whenever a feature's status changes.
> **Purpose:** Single source of truth for what's live, what needs setup, and what's still mock.

---

## Status Legend

| Icon | Status | Meaning |
|------|--------|---------|
| 🟢 | **LIVE** | Works with real data, zero additional setup |
| 🟡 | **SEEDED** | Real algorithm + real logic, running on demo seed data until ad platform is connected |
| 🔵 | **FREE_KEY** | Works with a free API key (no credit card) |
| 🟠 | **PAID_API** | Requires a paid external service |
| 🔴 | **MOCK** | Returns deterministic/fake data regardless of input |
| ⚫ | **PLANNED** | UI/route exists, backend not implemented |

---

## How to run a full feature test

```bash
# 1. Start services
docker compose up -d
npm run dev         # backend → port 3000
cd client && npm run dev  # frontend → port 5173

# 2. Get a token
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@adpilot.com","password":"password123"}' \
  | node -e "process.stdin.resume();let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).data.accessToken))")

echo "TOKEN=$TOKEN"

# 3. Test each feature below — commands are in each section
```

---

## 1. Authentication & Team

| Feature | Status | Test Command |
|---------|--------|-------------|
| Register | 🟢 LIVE | `POST /api/v1/auth/register` |
| Login | 🟢 LIVE | `POST /api/v1/auth/login` |
| Refresh token | 🟢 LIVE | `POST /api/v1/auth/refresh` |
| Demo login | 🟢 LIVE | `POST /api/v1/auth/demo-login` |
| Get profile | 🟢 LIVE | `GET /api/v1/users/me` |
| Team CRUD | 🟢 LIVE | `GET /api/v1/team` |
| Member invites | 🟢 LIVE | `POST /api/v1/team/invites` |

**Test:**
```bash
curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@adpilot.com","password":"password123"}' | jq '.data.accessToken'
```

---

## 2. Campaign Management

| Feature | Status | Notes |
|---------|--------|-------|
| List campaigns | 🟢 LIVE | Real DB read |
| Create campaign | 🟢 LIVE | Persists to DB |
| Update campaign | 🟢 LIVE | Real DB write |
| Delete campaign | 🟢 LIVE | Soft delete via `deleted_at` |
| Launch / Pause | 🟢 LIVE | Updates `status` field |
| Campaign metrics | 🟡 SEEDED | `performance` JSON has real seeded values; goes fully live when Meta/Google syncs |

**Test:**
```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/v1/campaigns | jq '.data.campaigns | length'
```

---

## 3. Ad Studio

| Feature | Status | Notes |
|---------|--------|-------|
| List / Create / Edit ads | 🟢 LIVE | Real DB |
| **AI Ad Generation** | 🔵 FREE_KEY | Priority chain: Ollama (local) → Gemini (free) → OpenAI → fallback mock |

**Setup to activate real AI:**
```bash
# Option A — Ollama (completely free, runs locally)
# Install: https://ollama.com/download
ollama pull llama3.2    # or mistral, gemma2
# Set in .env:
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2

# Option B — Gemini (free: 15 req/min, 1M tokens/day)
# Get key: https://aistudio.google.com/apikey
GEMINI_API_KEY=your_key_here
```

**Test:**
```bash
CAMPAIGN_ID=$(curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/v1/campaigns | jq -r '.data.campaigns[0].id')

curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"productName":"AdPilot","targetAudience":"digital marketers","platform":"Meta"}' \
  "http://localhost:3000/api/v1/campaigns/$CAMPAIGN_ID/ads/generate" \
  | jq '.data.variations[0].headline, .data.variations[0].isAiGenerated'
```

---

## 4. Analytics & Dashboard

| Feature | Status | Notes |
|---------|--------|-------|
| Overview metrics | 🟡 SEEDED | ROAS, spend, clicks, CTR — real math on seeded data |
| Campaign performance table | 🟡 SEEDED | Goes live when Meta/Google connected |
| Anomaly detection | 🟡 SEEDED | Real Z-score algorithm, runs on seeded metrics |
| Date range filtering | 🟢 LIVE | 7d / 30d / 90d filters work |
| CSV export | 🟢 LIVE | Exports whatever data is in DB |

**Why SEEDED not MOCK:** The analytics algorithm is real (statistical Z-score, weighted averages).
The input data is seeded/demo until you connect an ad platform.

**Test:**
```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/v1/analytics/overview?range=30d" \
  | jq '.data | {totalSpend, avgROAS, totalCampaigns}'

curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/v1/analytics/anomalies | jq '.data | length'
```

---

## 5. Budget Protection AI (Sentinel)

| Feature | Status | Notes |
|---------|--------|-------|
| Scan campaigns | 🟡 SEEDED | Real ROAS/CTR/CPA analysis on seeded `performance` JSON |
| Alert rules CRUD | 🟢 LIVE | Stored in DB, evaluated on real thresholds |
| Apply fix (pause/reduce budget) | 🟢 LIVE | Directly updates campaign in DB |
| Per-campaign health | 🟡 SEEDED | Same as scan |

**Why SEEDED not MOCK:** `BudgetGuardian.js` reads actual `campaign.performance` field and runs
real threshold checks (ROAS < 1.0 = critical, CTR < 0.5% = warning, etc.).
Seed data contains realistic performance values. Goes fully live when Meta/Google syncs real-time metrics.

**Test:**
```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/v1/budget-ai/scan \
  | jq '.data | {status, campaignCount, alertCount: (.alerts | length)}'

# Apply a fix
CAMPAIGN_ID=$(curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/v1/campaigns | jq -r '.data.campaigns[0].id')

curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"campaignId\":\"$CAMPAIGN_ID\",\"action\":\"reduce_budget\"}" \
  http://localhost:3000/api/v1/budget-ai/apply-fix | jq '.data.message'
```

---

## 6. Scaling Predictor (Apex)

| Feature | Status | Notes |
|---------|--------|-------|
| Single campaign readiness | 🟡 SEEDED | Real scoring: ROAS (30%), CTR (20%), budget utilization (20%), spend maturity (15%), age (15%) |
| All campaigns readiness | 🟡 SEEDED | Same algorithm, all active campaigns |

**Why SEEDED not MOCK:** `ScalingAnalyzer.js` computes a deterministic weighted score from actual campaign metrics.
Score components are mathematically derived — not random. Same campaign always gets same score until metrics change.

**Test:**
```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/v1/scaling/all-campaigns \
  | jq '.data.campaigns[] | {name: .campaignName, score, verdict}'

CAMPAIGN_ID=$(curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/v1/campaigns | jq -r '.data.campaigns[0].id')

curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/v1/scaling/readiness?campaignId=$CAMPAIGN_ID" \
  | jq '{score, verdict, factors: [.factors[] | {name, score, detail}]}'
```

---

## 7. Competitor Hijack Engine (Radar)

| Feature | Status | Notes |
|---------|--------|-------|
| Competitor CRUD | 🟢 LIVE | DB store |
| **Hijack analysis — crawl** | 🟢 LIVE | Puppeteer crawls real competitor site (title, headings, CTAs, tech stack, keywords) |
| **Hijack analysis — AI insights** | 🔵 FREE_KEY | Ollama or Gemini enrichment (keyword gaps, weaknesses, suggested ads) |
| **Ad spend data** | 🔴 NEVER_FREE | Requires SEMrush ($119/mo) or SpyFu ($39/mo) — always shows null with honest note |

**What "LIVE crawl" means:** Puppeteer fetches the actual competitor URL, extracts real H1–H3 headings,
real CTA buttons, detects real tech stack (Google Analytics, Facebook Pixel, Stripe, etc.),
and builds real keyword frequency from visible text.

**Setup to activate AI insights:**
```bash
# Ollama (free, local) or Gemini (free key)
OLLAMA_URL=http://localhost:11434   # OR
GEMINI_API_KEY=your_key_here
```

**Test:**
```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/v1/research/hijack-analysis?domain=notion.so" \
  | jq '{title: .data.title, techStack: .data.techStack, isReal: .data.isReal, hasAiInsights: .data.hasAiInsights}'
```

---

## 8. SEO Audit Engine (Forge)

| Feature | Status | Notes |
|---------|--------|-------|
| Trigger audit | 🟢 LIVE | Enqueues Bull job, returns auditId immediately |
| Crawl + technical rules | 🟢 LIVE | 16 rules via Puppeteer: title, meta, H1, canonical, OG, schema, HTTPS, etc. |
| Performance audit (Lighthouse) | 🟢 LIVE | Runs when `LIGHTHOUSE_ENABLED=true` (default) |
| Scoring engine | 🟢 LIVE | Deterministic weighted scoring, letter grade A–F |
| AI executive summary | 🔵 FREE_KEY | Ollama or Gemini when `SEO_SUMMARY_ENABLED=true` |
| Duplicate guard | 🟢 LIVE | 409 if same team+URL already running |

**Setup to activate AI summary:**
```bash
SEO_SUMMARY_ENABLED=true
OLLAMA_URL=http://localhost:11434   # OR
GEMINI_API_KEY=your_key_here
```

**Test:**
```bash
# Trigger audit
AUDIT_ID=$(curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com"}' \
  http://localhost:3000/api/v1/seo/audit | jq -r '.data.auditId')

echo "Audit ID: $AUDIT_ID"

# Poll for result (takes 30-120 seconds)
sleep 30
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/v1/seo/audit/$AUDIT_ID" \
  | jq '{status: .data.status, score: .data.overallScore, grade: .data.grade}'
```

---

## 9. Keyword Tracking (Beacon)

| Feature | Status | Notes |
|---------|--------|-------|
| Add / List / Delete keywords | 🟢 LIVE | Real DB |
| Opportunity score | 🟢 LIVE | Real math: `(volume × CTR_potential) / (difficulty × competition_factor)` |
| **Rank tracking — real Google** | 🔵 FREE_KEY | ValueSERP (50 free/month) |
| **Rank tracking — free scrape** | 🟢 LIVE | DuckDuckGo HTML scraper (no key, no limit) — used when ValueSERP not set |
| **Rank tracking — fallback** | 🟡 SEEDED | ±3 drift from seeded starting position (last resort) |
| Rank history | 🟢 LIVE | Stored in `KeywordRank` table |
| Gap analysis | 🟢 LIVE | Real SQL: competitor rank ≤ 20 AND your rank > 50 |

**Setup to get real Google ranks:**
```bash
# Option A — ValueSERP (50 free/month, no credit card)
VALUESERP_API_KEY=your_key_here

# Option B — DuckDuckGo scraper (built-in, zero setup, no API key needed)
# Already active by default when VALUESERP_API_KEY is not set
```

**Test:**
```bash
# Add a keyword
curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"keyword":"ad automation tool","searchVolume":1200,"difficulty":45}' \
  http://localhost:3000/api/v1/seo/keywords | jq '.data.keyword.id'

# Sync ranks (calls real SERP or DuckDuckGo scraper)
curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/v1/seo/keywords/sync | jq '.data'
```

---

## 10. Content Briefs

| Feature | Status | Notes |
|---------|--------|-------|
| **Brief generation** | 🔵 FREE_KEY | Ollama (local) → OpenAI → Gemini → TF-IDF fallback |
| List / Delete briefs | 🟢 LIVE | Real DB |

**Without any API key:** TF-IDF algorithm generates a deterministic structured brief from your keyword pool. Still useful, just not AI-generated prose.

**Test:**
```bash
curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"targetKeyword":"ad automation software"}' \
  http://localhost:3000/api/v1/seo/briefs \
  | jq '{title: .data.brief.title, source: .data.brief._source}'
```

---

## 11. Rules Engine & Automation

| Feature | Status | Notes |
|---------|--------|-------|
| Rule CRUD | 🟢 LIVE | Create / update / delete rules in DB |
| Rule evaluation | 🟡 SEEDED | Evaluates against `campaign.performance` — real logic on seeded metrics |
| Pause campaign action | 🟢 LIVE | Updates campaign.status = 'paused' in DB |
| Reduce budget action | 🟢 LIVE | Updates campaign.budget in DB |
| Mirror to Meta/Google | 🟠 PAID_API | Only fires if integration is connected (requires OAuth) |

**Test:**
```bash
# Create a rule
curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Low ROAS pause","triggerType":"roas_below","threshold":1.5,"action":"pause_campaign","isActive":true}' \
  http://localhost:3000/api/v1/rules | jq '.data.rule.id'

curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/v1/rules | jq '.data.rules | length'
```

---

## 12. Integrations

| Feature | Status | Notes |
|---------|--------|-------|
| Meta Ads OAuth connect | 🟠 PAID_API | Requires Facebook App (free to create, ad account needed for data) |
| Google Ads OAuth connect | 🟠 PAID_API | Requires Google Cloud project + Google Ads account |
| Slack OAuth connect | 🟠 PAID_API | Requires Slack App (free to create) |
| List integrations | 🟢 LIVE | Shows connected/disconnected status |

**Why PAID_API for Meta/Google:** Not a dollar cost, but requires creating a developer app
and having a real ad account. The OAuth flows are implemented and working.

---

## 13. Notifications

| Feature | Status | Notes |
|---------|--------|-------|
| List / Mark read / Delete | 🟢 LIVE | Real DB |
| Budget Protection auto-notify | 🟢 LIVE | Created by apply-fix endpoint |
| Campaign status notify | 🟢 LIVE | Created on campaign launch/pause |

---

## API Key Setup Checklist

Copy this into your `.env` file. Mark off each one as you add it.

```bash
# ── Completely Free (no credit card) ────────────────────────────
# [ ] Ollama (local, unlimited) — https://ollama.com/download
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2

# [ ] Gemini (15 req/min, 1M tokens/day) — https://aistudio.google.com/apikey
GEMINI_API_KEY=

# [ ] ValueSERP (50 searches/month) — https://www.valueserp.com/
VALUESERP_API_KEY=

# ── Paid / OAuth ─────────────────────────────────────────────────
# [ ] OpenAI (pay-per-use) — https://platform.openai.com
OPENAI_API_KEY=

# [ ] Meta Ads (free app, need ad account) — https://developers.facebook.com/
META_APP_ID=
META_APP_SECRET=

# [ ] Google Ads (free app, need ads account) — https://console.cloud.google.com/
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

---

## Feature Completeness Summary

```
🟢 LIVE (zero setup needed)        14 features
🟡 SEEDED (real logic, demo data)   6 features  → becomes 🟢 when Meta/Google connected
🔵 FREE_KEY (free API, no CC)       5 features  → set GEMINI_API_KEY or run Ollama
🟠 PAID_API / OAuth                 3 features  → Meta, Google, Slack OAuth
🔴 NEVER_FREE                       1 feature   → Competitor ad spend (SEMrush/SpyFu only)
```

---

## What to do RIGHT NOW (in order of impact)

1. **Install Ollama** (5 min, completely free) — unlocks AI ad gen, content briefs, competitor insights
   ```bash
   # macOS
   brew install ollama
   ollama serve &
   ollama pull llama3.2
   ```
   Then add to `.env`: `OLLAMA_URL=http://localhost:11434` and `OLLAMA_MODEL=llama3.2`

2. **Get Gemini key** (2 min, free) — backup AI when Ollama not running
   Visit: https://aistudio.google.com/apikey → copy key → add to `.env`

3. **Run seed** — populate demo data for Budget/Scaling/Analytics
   ```bash
   node src/scripts/seed.js
   ```

4. **Test everything** — use the test commands in each section above

5. **Connect Meta or Google Ads** (OAuth flow in UI) — makes all 🟡 SEEDED features fully 🟢 LIVE
