import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Shield,
  Search,
  RefreshCw,
  Plus,
  X,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  FileText,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import api from '../lib/api';

// ─── Skeleton helpers ─────────────────────────────────────────────────────────
function SkeletonRow({ cols = 5 }) {
  return (
    <tr>
      {[...Array(cols)].map((_, i) => (
        <td key={i} className="px-5 py-3.5">
          <div className="skeleton h-4 rounded w-full" />
        </td>
      ))}
    </tr>
  );
}

function SkeletonCard() {
  return <div className="skeleton h-24 rounded-xl" />;
}

// ─── Score circle ─────────────────────────────────────────────────────────────
function ScoreCircle({ score }) {
  const s = Number(score) || 0;
  const color =
    s >= 80 ? 'text-accent-green border-accent-green' :
    s >= 60 ? 'text-orange-400 border-orange-400' :
              'text-red-400 border-red-400';
  return (
    <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center font-bold text-sm shrink-0 ${color}`}>
      {s}
    </div>
  );
}

// ─── Difficulty progress bar ──────────────────────────────────────────────────
function DifficultyBar({ value }) {
  const v = Math.min(100, Math.max(0, Number(value) || 0));
  const color = v >= 70 ? 'bg-red-400' : v >= 40 ? 'bg-orange-400' : 'bg-accent-green';
  return (
    <div className="flex items-center gap-2 min-w-[80px]">
      <div className="flex-1 h-1.5 bg-bg-secondary rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${v}%` }} />
      </div>
      <span className="text-xs text-text-secondary w-7 text-right">{v}</span>
    </div>
  );
}

// ─── Priority badge ───────────────────────────────────────────────────────────
function PriorityBadge({ priority }) {
  const p = (priority || 'low').toLowerCase();
  const cls =
    p === 'high'   ? 'bg-red-500/10 text-red-400 border-red-500/20' :
    p === 'medium' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                     'bg-text-secondary/10 text-text-secondary border-text-secondary/20';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {p.charAt(0).toUpperCase() + p.slice(1)}
    </span>
  );
}

// ─── Opportunity Score badge ──────────────────────────────────────────────────
function OpportunityBadge({ score }) {
  const s = Number(score) || 0;
  const cls =
    s >= 80 ? 'bg-accent-green/10 text-accent-green border-accent-green/20' :
    s >= 50 ? 'bg-accent-blue/10 text-accent-blue border-accent-blue/20' :
              'bg-text-secondary/10 text-text-secondary border-text-secondary/20';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {s}
    </span>
  );
}

// ─── Rank Change indicator ────────────────────────────────────────────────────
function RankChange({ change }) {
  const c = Number(change) || 0;
  if (c === 0) return <span className="flex items-center gap-1 text-text-secondary text-xs"><Minus className="w-3 h-3" />0</span>;
  if (c > 0) return <span className="flex items-center gap-1 text-accent-green text-xs"><ChevronUp className="w-3 h-3" />+{c}</span>;
  return <span className="flex items-center gap-1 text-red-400 text-xs"><ChevronDown className="w-3 h-3" />{c}</span>;
}

// ─── Generate Brief Modal ─────────────────────────────────────────────────────
function GenerateBriefModal({ onClose }) {
  const queryClient = useQueryClient();
  const [targetKeyword, setTargetKeyword] = useState('');

  const mutation = useMutation({
    mutationFn: (data) => api.post('/seo/briefs', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seo', 'briefs'] });
      onClose();
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!targetKeyword.trim()) return;
    mutation.mutate({ targetKeyword: targetKeyword.trim() });
  };

  const errMsg = mutation.error?.response?.data?.error?.message || mutation.error?.message;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-bg-card border border-border rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-text-primary">Generate Content Brief</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {errMsg && (
            <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-3 py-2 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errMsg}</span>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              Target Keyword
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. best running shoes 2025"
              value={targetKeyword}
              onChange={(e) => setTargetKeyword(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary">
              {mutation.isPending ? 'Generating…' : 'Generate Brief'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Audits Tab ───────────────────────────────────────────────────────────────
function AuditsTab() {
  const queryClient = useQueryClient();
  const [url, setUrl] = useState('');

  const { data: audits, isLoading, error } = useQuery({
    queryKey: ['seo', 'audits'],
    queryFn: () => api.get('/seo/audits').then((r) => r.data.data),
  });

  const auditMutation = useMutation({
    mutationFn: (data) => api.post('/seo/audit', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seo', 'audits'] });
      setUrl('');
    },
  });

  const handleRunAudit = (e) => {
    e.preventDefault();
    if (!url.trim()) return;
    auditMutation.mutate({ url: url.trim() });
  };

  const errMsg = auditMutation.error?.response?.data?.error?.message || auditMutation.error?.message;

  return (
    <div className="space-y-6">
      {/* Run audit form */}
      <div className="card">
        <h3 className="text-sm font-semibold text-text-primary mb-3">Run New Audit</h3>
        <form onSubmit={handleRunAudit} className="flex flex-col sm:flex-row gap-3">
          <input
            type="url"
            className="input-field flex-1"
            placeholder="https://example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
          />
          <button
            type="submit"
            disabled={auditMutation.isPending}
            className="btn-primary flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <Search className="w-4 h-4" />
            {auditMutation.isPending ? 'Running…' : 'Run Audit'}
          </button>
        </form>
        {errMsg && (
          <p className="mt-3 flex items-center gap-1.5 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />{errMsg}
          </p>
        )}
        {auditMutation.isSuccess && (
          <p className="mt-3 text-accent-green text-sm">Audit queued successfully.</p>
        )}
      </div>

      {/* Audits list */}
      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-text-primary">Past Audits</h3>
        </div>
        {isLoading ? (
          <div className="p-5 space-y-3">
            {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-400 text-sm">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-60" />
            Failed to load audits.
          </div>
        ) : !audits?.length ? (
          <div className="p-12 text-center text-text-secondary text-sm">
            No audits yet. Run your first audit above.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {audits.map((audit) => (
              <div key={audit.id} className="flex items-center gap-4 px-5 py-4 hover:bg-bg-secondary/30 transition-colors">
                <ScoreCircle score={audit.score} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{audit.url}</p>
                  <p className="text-xs text-text-secondary mt-0.5">
                    {new Date(audit.createdAt || audit.date).toLocaleDateString('en-US', {
                      year: 'numeric', month: 'short', day: 'numeric',
                    })}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-text-secondary">Issues</p>
                  <p className="text-sm font-semibold text-text-primary">{audit.issuesCount ?? audit.issues ?? 0}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Keywords Tab ─────────────────────────────────────────────────────────────
function KeywordsTab() {
  const queryClient = useQueryClient();

  const { data: keywords, isLoading, error } = useQuery({
    queryKey: ['seo', 'keywords'],
    queryFn: () => api.get('/seo/keywords').then((r) => r.data.data),
  });

  const syncMutation = useMutation({
    mutationFn: () => api.post('/seo/keywords/sync'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['seo', 'keywords'] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
          className="btn-secondary flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
          {syncMutation.isPending ? 'Syncing…' : 'Sync Ranks'}
        </button>
      </div>

      {syncMutation.isSuccess && (
        <p className="text-accent-green text-sm">Ranks synced successfully.</p>
      )}
      {syncMutation.error && (
        <p className="text-red-400 text-sm">
          {syncMutation.error?.response?.data?.error?.message || 'Sync failed.'}
        </p>
      )}

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-bg-secondary/50">
                {['Keyword', 'Volume', 'Difficulty', 'Current Rank', 'Change', 'Opportunity'].map((h) => (
                  <th key={h} className="text-left text-text-secondary font-medium px-5 py-3.5 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                [...Array(6)].map((_, i) => <SkeletonRow key={i} cols={6} />)
              ) : error ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-red-400 text-sm">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-60" />
                    Failed to load keywords.
                  </td>
                </tr>
              ) : !keywords?.length ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-text-secondary text-sm">
                    No keywords tracked yet.
                  </td>
                </tr>
              ) : (
                keywords.map((kw) => (
                  <tr key={kw.id || kw.keyword} className="hover:bg-bg-secondary/30 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-text-primary max-w-[200px] truncate">
                      {kw.keyword}
                    </td>
                    <td className="px-5 py-3.5 text-text-secondary whitespace-nowrap">
                      {Number(kw.volume || 0).toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5">
                      <DifficultyBar value={kw.difficulty} />
                    </td>
                    <td className="px-5 py-3.5 text-text-secondary">
                      {kw.currentRank ?? kw.rank ?? '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      <RankChange change={kw.change} />
                    </td>
                    <td className="px-5 py-3.5">
                      <OpportunityBadge score={kw.opportunityScore ?? kw.opportunity} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Gaps Tab ─────────────────────────────────────────────────────────────────
function GapsTab() {
  const { data: gaps, isLoading, error } = useQuery({
    queryKey: ['seo', 'gaps'],
    queryFn: () => api.get('/seo/gaps').then((r) => r.data.data),
  });

  return (
    <div className="card p-0 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-bg-secondary/50">
              {['Keyword', 'Competitor', 'Their Rank', 'Our Rank', 'Priority'].map((h) => (
                <th key={h} className="text-left text-text-secondary font-medium px-5 py-3.5 whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              [...Array(5)].map((_, i) => <SkeletonRow key={i} cols={5} />)
            ) : error ? (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center text-red-400 text-sm">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-60" />
                  Failed to load gaps.
                </td>
              </tr>
            ) : !gaps?.length ? (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center text-text-secondary text-sm">
                  No keyword gaps found.
                </td>
              </tr>
            ) : (
              gaps.map((gap) => (
                <tr key={gap.id || `${gap.keyword}-${gap.competitor}`} className="hover:bg-bg-secondary/30 transition-colors">
                  <td className="px-5 py-3.5 font-medium text-text-primary max-w-[180px] truncate">
                    {gap.keyword}
                  </td>
                  <td className="px-5 py-3.5 text-text-secondary max-w-[160px] truncate">
                    {gap.competitor}
                  </td>
                  <td className="px-5 py-3.5 text-text-secondary">
                    {gap.theirRank ?? gap.competitorRank ?? '—'}
                  </td>
                  <td className="px-5 py-3.5 text-text-secondary">
                    {gap.ourRank ?? gap.myRank ?? '—'}
                  </td>
                  <td className="px-5 py-3.5">
                    <PriorityBadge priority={gap.priority} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Content Briefs Section ───────────────────────────────────────────────────
function ContentBriefs() {
  const [showModal, setShowModal] = useState(false);

  const { data: briefs, isLoading, error } = useQuery({
    queryKey: ['seo', 'briefs'],
    queryFn: () => api.get('/seo/briefs').then((r) => r.data.data),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-text-primary">Content Briefs</h2>
          <p className="text-xs text-text-secondary mt-0.5">AI-generated content strategy documents</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Generate Brief
        </button>
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-28 rounded-xl" />)}
        </div>
      ) : error ? (
        <div className="card text-center text-red-400 text-sm py-8">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-60" />
          Failed to load briefs.
        </div>
      ) : !briefs?.length ? (
        <div className="card text-center text-text-secondary text-sm py-10">
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No content briefs yet</p>
          <p className="mt-1">Generate a brief using a target keyword to get started.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {briefs.map((brief) => (
            <div key={brief.id} className="card hover:border-accent-blue/40 transition-colors cursor-pointer">
              <div className="flex items-start justify-between gap-2">
                <div className="w-8 h-8 rounded-lg bg-accent-purple/10 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-accent-purple" />
                </div>
                <PriorityBadge priority={brief.priority || 'medium'} />
              </div>
              <h3 className="mt-3 text-sm font-semibold text-text-primary leading-snug line-clamp-2">
                {brief.targetKeyword || brief.title}
              </h3>
              <p className="mt-1 text-xs text-text-secondary">
                {new Date(brief.createdAt || brief.date).toLocaleDateString('en-US', {
                  year: 'numeric', month: 'short', day: 'numeric',
                })}
              </p>
            </div>
          ))}
        </div>
      )}

      {showModal && <GenerateBriefModal onClose={() => setShowModal(false)} />}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const TABS = ['Audits', 'Keywords', 'Gaps'];

export default function SeoPage() {
  const [activeTab, setActiveTab] = useState('Audits');

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-accent-green/10 flex items-center justify-center">
          <Shield className="w-5 h-5 text-accent-green" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-text-primary">SEO Intelligence</h1>
          <p className="text-sm text-text-secondary">Audits, keyword tracking, and competitive gaps</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <div className="flex gap-1">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab
                  ? 'border-accent-blue text-accent-blue'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {activeTab === 'Audits'   && <AuditsTab />}
      {activeTab === 'Keywords' && <KeywordsTab />}
      {activeTab === 'Gaps'     && <GapsTab />}

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Content Briefs section */}
      <ContentBriefs />
    </div>
  );
}
