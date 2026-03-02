import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, LayoutDashboard, Megaphone, BarChart2,
  Wand2, ShieldAlert, TrendingUp, Shield, Crosshair,
  Plug, Users, Settings, Zap, X,
  ArrowRight,
} from 'lucide-react';
import { FEATURE_LIST, COLOR_MAP } from '../../config/features';

// ─── Static icon map ──────────────────────────────────────────────────────────
const FEATURE_ICONS = {
  sentinel: ShieldAlert,
  apex:     TrendingUp,
  radar:    Crosshair,
  beacon:   Shield,
  forge:    Wand2,
  pulse:    Search,
};

// ─── All commands ─────────────────────────────────────────────────────────────
const BASE_COMMANDS = [
  { id: 'dashboard',    label: 'Dashboard',     group: 'Navigate',     icon: LayoutDashboard, path: '/dashboard' },
  { id: 'campaigns',    label: 'Campaigns',     group: 'Navigate',     icon: Megaphone,       path: '/campaigns' },
  { id: 'analytics',   label: 'Analytics',     group: 'Navigate',     icon: BarChart2,       path: '/analytics' },
  { id: 'rules',        label: 'Rules',         group: 'Settings',     icon: Zap,             path: '/rules' },
  { id: 'integrations', label: 'Integrations',  group: 'Settings',     icon: Plug,            path: '/integrations' },
  { id: 'team',         label: 'Team',          group: 'Settings',     icon: Users,           path: '/team' },
  { id: 'settings',     label: 'Settings',      group: 'Settings',     icon: Settings,        path: '/settings' },
];

// Build AI feature commands from FEATURE_LIST
const AI_COMMANDS = FEATURE_LIST.map((f) => ({
  id:    f.id,
  label: `${f.codename} — ${f.label}`,
  group: 'AI Features',
  icon:  FEATURE_ICONS[f.id] ?? Zap,
  path:  f.path,
  color: f.color,
  badge: f.badge,
}));

const ALL_COMMANDS = [...AI_COMMANDS, ...BASE_COMMANDS];

// Simple fuzzy match
function fuzzyMatch(str, query) {
  if (!query) return true;
  const s = str.toLowerCase();
  const q = query.toLowerCase();
  let si = 0;
  for (let qi = 0; qi < q.length; qi++) {
    while (si < s.length && s[si] !== q[qi]) si++;
    if (si >= s.length) return false;
    si++;
  }
  return true;
}

// ─── Command Palette ──────────────────────────────────────────────────────────
export default function CommandPalette({ open, onClose }) {
  const navigate   = useNavigate();
  const [query, setQuery]     = useState('');
  const [cursor, setCursor]   = useState(0);
  const inputRef  = useRef(null);
  const listRef   = useRef(null);

  const filtered = ALL_COMMANDS.filter(
    (cmd) => fuzzyMatch(cmd.label, query) || fuzzyMatch(cmd.group, query)
  );

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery('');
      setCursor(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Reset cursor when results change
  useEffect(() => setCursor(0), [query]);

  const selectCommand = useCallback((cmd) => {
    navigate(cmd.path);
    onClose();
  }, [navigate, onClose]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setCursor((c) => Math.min(c + 1, filtered.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setCursor((c) => Math.max(c - 1, 0));
      } else if (e.key === 'Enter' && filtered[cursor]) {
        selectCommand(filtered[cursor]);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, cursor, filtered, selectCommand, onClose]);

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current) {
      const active = listRef.current.querySelector('[data-active="true"]');
      active?.scrollIntoView({ block: 'nearest' });
    }
  }, [cursor]);

  if (!open) return null;

  // Group results
  const groups = {};
  filtered.forEach((cmd) => {
    if (!groups[cmd.group]) groups[cmd.group] = [];
    groups[cmd.group].push(cmd);
  });

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-start justify-center pt-[15vh] px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="w-4 h-4 text-text-secondary shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search features, pages, settings…"
            className="flex-1 bg-transparent text-text-primary placeholder-text-secondary/60 text-sm outline-none"
          />
          <div className="flex items-center gap-1 shrink-0">
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-bg-secondary border border-border text-text-secondary">ESC</kbd>
          </div>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-80 overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-sm text-text-secondary">
              No results for &ldquo;<span className="text-text-primary">{query}</span>&rdquo;
            </div>
          ) : (
            Object.entries(groups).map(([groupName, cmds]) => {
              let globalIdx = filtered.findIndex((f) => f.id === cmds[0].id);
              return (
                <div key={groupName}>
                  <p className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-text-secondary/50">
                    {groupName}
                  </p>
                  {cmds.map((cmd) => {
                    const isActive = cursor === filtered.findIndex((f) => f.id === cmd.id);
                    const c = cmd.color ? COLOR_MAP[cmd.color] : null;
                    const Icon = cmd.icon;
                    return (
                      <button
                        key={cmd.id}
                        data-active={isActive}
                        onClick={() => selectCommand(cmd)}
                        onMouseEnter={() => setCursor(filtered.findIndex((f) => f.id === cmd.id))}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                          isActive ? 'bg-accent-blue/10' : 'hover:bg-bg-secondary/50'
                        }`}
                      >
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          c ? c.iconBg : 'bg-bg-secondary'
                        }`}>
                          <Icon className={`w-3.5 h-3.5 ${c ? c.text : 'text-text-secondary'}`} />
                        </div>
                        <span className={`flex-1 text-left font-medium ${isActive ? 'text-text-primary' : 'text-text-secondary'}`}>
                          {cmd.label}
                        </span>
                        {cmd.badge && c && (
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${c.badge}`}>
                            {cmd.badge}
                          </span>
                        )}
                        <ArrowRight className={`w-3.5 h-3.5 shrink-0 transition-opacity ${isActive ? 'opacity-100 text-accent-blue' : 'opacity-0'}`} />
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center gap-4 px-4 py-2 border-t border-border bg-bg-secondary/30">
          <span className="text-[10px] text-text-secondary flex items-center gap-1">
            <kbd className="px-1 py-0.5 text-[9px] font-mono rounded bg-bg-secondary border border-border">↑↓</kbd>
            Navigate
          </span>
          <span className="text-[10px] text-text-secondary flex items-center gap-1">
            <kbd className="px-1 py-0.5 text-[9px] font-mono rounded bg-bg-secondary border border-border">↵</kbd>
            Open
          </span>
          <span className="text-[10px] text-text-secondary flex items-center gap-1">
            <kbd className="px-1 py-0.5 text-[9px] font-mono rounded bg-bg-secondary border border-border">ESC</kbd>
            Close
          </span>
        </div>
      </div>
    </div>
  );
}
