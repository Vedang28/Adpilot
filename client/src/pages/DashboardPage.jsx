import { useQuery } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import api from '../lib/api';

// ── Helpers ────────────────────────────────────────────────────────────────────
function timeAgo(dateStr) {
  const secs = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (secs < 60)    return 'just now';
  if (secs < 3600)  return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

// ── SVG Icons ─────────────────────────────────────────────────────────────────
const AdsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(139,92,246,0.9)" strokeWidth="1.5">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <path d="M8 12h8M12 8v8"/>
  </svg>
);
const KeywordsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(16,185,129,0.9)" strokeWidth="1.5">
    <circle cx="11" cy="11" r="8"/>
    <path d="M21 21l-4.35-4.35M8 11h6M11 8v6"/>
  </svg>
);
const CompetitorsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(245,158,11,0.9)" strokeWidth="1.5">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);
const AlertsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(239,68,68,0.9)" strokeWidth="1.5">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>
);
const TrendUpIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
    <polyline points="17 6 23 6 23 12"/>
  </svg>
);
const TrendDownIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5">
    <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/>
    <polyline points="17 18 23 18 23 12"/>
  </svg>
);

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, delta, deltaLabel, urgent, accentColor }) {
  const hasDelta = delta !== undefined && delta !== null && delta > 0;
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 14,
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10,
          background: `${accentColor}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {icon}
        </div>
        {urgent > 0 && (
          <span style={{
            background: 'rgba(239,68,68,0.15)', color: '#ef4444',
            fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
          }}>
            {urgent} urgent
          </span>
        )}
      </div>
      <div>
        <div style={{ fontSize: 28, fontWeight: 700, color: 'rgba(255,255,255,0.9)', lineHeight: 1 }}>
          {value ?? '—'}
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>{label}</div>
      </div>
      {hasDelta && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#10b981' }}>
          <TrendUpIcon />
          <span>+{delta} {deltaLabel}</span>
        </div>
      )}
    </div>
  );
}

// ── Action Item Card ───────────────────────────────────────────────────────────
const PRIORITY_STYLE = {
  HIGH:   { bg: 'rgba(239,68,68,0.1)',    color: '#ef4444',  label: 'HIGH' },
  MEDIUM: { bg: 'rgba(245,158,11,0.1)',   color: '#f59e0b',  label: 'MED' },
  LOW:    { bg: 'rgba(16,185,129,0.1)',   color: '#10b981',  label: 'LOW' },
};

function ActionItem({ item }) {
  const navigate = useNavigate();
  const style = PRIORITY_STYLE[item.priority] || PRIORITY_STYLE.LOW;
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 12,
      padding: '14px 16px',
      marginBottom: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{
          background: style.bg, color: style.color,
          fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
          padding: '2px 8px', borderRadius: 20,
        }}>
          {style.label}
        </span>
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)', marginBottom: 4 }}>
        {item.title}
      </div>
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginBottom: 12, lineHeight: 1.5 }}>
        {item.description}
      </div>
      {item.ctaUrl && (
        <button
          onClick={() => navigate(item.ctaUrl)}
          style={{
            background: 'rgba(139,92,246,0.15)', color: '#8b5cf6',
            border: '1px solid rgba(139,92,246,0.25)', borderRadius: 8,
            fontSize: 12, fontWeight: 600, padding: '6px 14px', cursor: 'pointer',
          }}
        >
          {item.cta} →
        </button>
      )}
    </div>
  );
}

// ── Activity Feed Item ─────────────────────────────────────────────────────────
function FeedItem({ item }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 0',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
    }}>
      {item.unread && (
        <div style={{
          width: 6, height: 6, borderRadius: '50%',
          background: '#8b5cf6', marginTop: 5, flexShrink: 0,
        }} />
      )}
      <div style={{ flex: 1, minWidth: 0, paddingLeft: item.unread ? 0 : 16 }}>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', lineHeight: 1.4 }}>
          {item.message.slice(0, 90)}{item.message.length > 90 ? '…' : ''}
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 3 }}>
          {item.timeAgo}
        </div>
      </div>
    </div>
  );
}

// ── Keyword Trend Row ──────────────────────────────────────────────────────────
function TrendRow({ kw }) {
  const isUp = kw.trend === 'rising';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
    }}>
      {isUp ? <TrendUpIcon /> : <TrendDownIcon />}
      <span style={{ flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>{kw.keyword}</span>
      {kw.change && (
        <span style={{ fontSize: 11, color: isUp ? '#10b981' : '#ef4444', fontWeight: 600 }}>
          {isUp ? '+' : ''}{kw.change}
        </span>
      )}
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const navigate = useNavigate();

  const { data: metrics, isLoading } = useQuery({
    queryKey: ['dashboard', 'metrics'],
    queryFn: () => api.get('/dashboard/metrics').then(r => r.data.data),
    refetchInterval: 60_000,
  });

  const stats = metrics?.stats ?? {};
  const health = metrics?.health ?? { score: 0, label: 'Loading...' };
  const actionItems = metrics?.actionItems ?? [];
  const feed = metrics?.activityFeed ?? [];
  const trends = metrics?.keywordTrends ?? [];

  const healthPct = health.score;
  const healthColor = healthPct >= 75 ? '#10b981' : healthPct >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'rgba(255,255,255,0.9)', margin: 0 }}>
          Daily Briefing
        </h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
          Your ad intelligence summary
        </p>
      </div>

      {/* Zone A: Health Bar */}
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 14, padding: '16px 20px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>
              {isLoading ? 'Loading...' : health.label}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
              {actionItems.length > 0 ? `${actionItems.length} action${actionItems.length !== 1 ? 's' : ''} suggested` : 'All systems active'}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: healthColor }}>{healthPct}%</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>health score</div>
          </div>
        </div>
        <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 3,
            width: `${healthPct}%`,
            background: `linear-gradient(90deg, ${healthColor}aa, ${healthColor})`,
            transition: 'width 0.8s ease',
          }} />
        </div>
      </div>

      {/* Zone B: 4 Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {isLoading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} style={{ height: 130, borderRadius: 14, background: 'rgba(255,255,255,0.04)' }} className="animate-pulse" />
          ))
        ) : (
          <>
            <StatCard
              icon={<AdsIcon />}
              label="Ads Created"
              value={stats.adsCreated?.value ?? 0}
              delta={stats.adsCreated?.delta}
              deltaLabel="this week"
              accentColor="#8b5cf6"
            />
            <StatCard
              icon={<KeywordsIcon />}
              label="Keywords"
              value={stats.keywords?.value ?? 0}
              delta={stats.keywords?.delta}
              deltaLabel="rising"
              accentColor="#10b981"
            />
            <StatCard
              icon={<CompetitorsIcon />}
              label="Competitors"
              value={stats.competitors?.value ?? 0}
              delta={stats.competitors?.delta}
              deltaLabel="new"
              accentColor="#f59e0b"
            />
            <StatCard
              icon={<AlertsIcon />}
              label="Active Alerts"
              value={stats.alerts?.value ?? 0}
              urgent={stats.alerts?.urgent}
              accentColor="#ef4444"
            />
          </>
        )}
      </div>

      {/* Zone C: Action Items + Activity Feed */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Left: Action Items */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: 11 }}>
                TODAY'S ACTIONS
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                Recommended next steps
              </div>
            </div>
          </div>
          {isLoading ? (
            [...Array(2)].map((_, i) => (
              <div key={i} style={{ height: 90, borderRadius: 12, background: 'rgba(255,255,255,0.04)', marginBottom: 10 }} />
            ))
          ) : actionItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>✓</div>
              All caught up — no actions needed
            </div>
          ) : (
            actionItems.map((item, i) => <ActionItem key={i} item={item} />)
          )}
        </div>

        {/* Right: Activity Feed + Keyword Trends */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>
            RECENT ACTIVITY
          </div>
          {feed.length === 0 ? (
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', padding: '20px 0' }}>
              No recent activity yet. Generate your first ad to get started.
            </div>
          ) : (
            feed.slice(0, 4).map((item, i) => <FeedItem key={i} item={item} />)
          )}

          {trends.length > 0 && (
            <>
              <div style={{
                fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.85)',
                textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 20, marginBottom: 10,
              }}>
                KEYWORD TRENDS
              </div>
              {trends.map((kw, i) => <TrendRow key={i} kw={kw} />)}
            </>
          )}

          {trends.length === 0 && feed.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                QUICK LINKS
              </div>
              {[
                { label: 'Research keywords', path: '/research' },
                { label: 'Generate ad copy', path: '/ads' },
                { label: 'Analyze competitor', path: '/research' },
              ].map((l, i) => (
                <button
                  key={i}
                  onClick={() => navigate(l.path)}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    background: 'transparent', border: 'none',
                    fontSize: 12, color: '#8b5cf6', cursor: 'pointer',
                    padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.05)',
                  }}
                >
                  {l.label} →
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Demo mode notice */}
      {metrics?.demoMode && (
        <div style={{
          background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
          borderRadius: 8, padding: '10px 16px', fontSize: 12, color: 'rgba(245,158,11,0.9)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          Showing estimated data. Connect your ad account to see real metrics.
          <Link to="/settings" style={{ color: '#f59e0b', marginLeft: 4 }}>Connect now</Link>
        </div>
      )}
    </div>
  );
}
