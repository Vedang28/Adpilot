import { useQuery } from '@tanstack/react-query';
import { LayoutDashboard, Zap, DollarSign, TrendingUp } from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import api from '../lib/api';
import StatCard from '../components/ui/StatCard';
import Badge from '../components/ui/Badge';

const COLORS = ['#3B82F6', '#8B5CF6', '#10B981'];

// Mock time-series data
const timeData = [
  { month: 'Sep', spend: 1200, roas: 3.1 },
  { month: 'Oct', spend: 2100, roas: 3.5 },
  { month: 'Nov', spend: 1800, roas: 2.9 },
  { month: 'Dec', spend: 3200, roas: 4.1 },
  { month: 'Jan', spend: 2700, roas: 3.8 },
  { month: 'Feb', spend: 4880, roas: 3.7 },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-bg-card border border-border rounded-lg px-3 py-2 text-xs">
      <p className="text-text-secondary mb-1 font-medium">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {p.dataKey === 'spend' ? '$' : ''}{p.value}{p.dataKey === 'roas' ? 'x' : ''}
        </p>
      ))}
    </div>
  );
};

export default function AnalyticsPage() {
  const { data: overview, isLoading: loadingOverview } = useQuery({
    queryKey: ['analytics', 'overview'],
    queryFn: () => api.get('/analytics/overview').then((r) => r.data.data),
  });

  const { data: campaigns, isLoading: loadingCampaigns } = useQuery({
    queryKey: ['analytics', 'campaigns'],
    queryFn: () => api.get('/analytics/campaigns').then((r) => r.data.data.campaigns),
  });

  // Compute platform distribution for pie chart
  const platformCounts = (campaigns || []).reduce((acc, c) => {
    acc[c.platform] = (acc[c.platform] || 0) + 1;
    return acc;
  }, {});
  const pieData = Object.entries(platformCounts).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {loadingOverview
          ? [...Array(4)].map((_, i) => <div key={i} className="skeleton h-36 rounded-xl" />)
          : (
            <>
              <StatCard icon={LayoutDashboard} label="Total Campaigns" value={overview?.totalCampaigns ?? 0} change={12} iconColor="text-accent-blue" iconBg="bg-accent-blue/10" />
              <StatCard icon={Zap} label="Active Campaigns" value={overview?.activeCampaigns ?? 0} change={5} iconColor="text-accent-green" iconBg="bg-accent-green/10" />
              <StatCard icon={DollarSign} label="Total Ad Spend" value={overview?.totalAdSpend ?? 0} change={-3} prefix="$" iconColor="text-accent-purple" iconBg="bg-accent-purple/10" />
              <StatCard icon={TrendingUp} label="Avg ROAS" value={overview?.avgROAS ?? 0} change={8} suffix="x" iconColor="text-orange-400" iconBg="bg-orange-400/10" />
            </>
          )}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pie: platform distribution */}
        <div className="card">
          <h3 className="text-sm font-semibold text-text-primary mb-4">Campaigns by Platform</h3>
          {loadingCampaigns ? (
            <div className="skeleton h-52 rounded-lg" />
          ) : (
            <ResponsiveContainer width="100%" height={210}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#0F1219', border: '1px solid #1A1E2E', borderRadius: 8, fontSize: 12 }}
                  itemStyle={{ color: '#E8ECF4' }}
                />
                <Legend
                  formatter={(val) => <span className="text-xs text-text-secondary capitalize">{val}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Line: spend over time */}
        <div className="card">
          <h3 className="text-sm font-semibold text-text-primary mb-4">Spend & ROAS over Time</h3>
          <ResponsiveContainer width="100%" height={210}>
            <LineChart data={timeData} margin={{ left: -20, right: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1A1E2E" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: '#8892A8', fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis yAxisId="left" tick={{ fill: '#8892A8', fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: '#8892A8', fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Line yAxisId="left" type="monotone" dataKey="spend" name="Spend" stroke="#3B82F6" strokeWidth={2} dot={false} />
              <Line yAxisId="right" type="monotone" dataKey="roas" name="ROAS" stroke="#10B981" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Performance Table */}
      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-text-primary">Campaign Performance</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-bg-secondary/30">
                {['Campaign', 'Platform', 'Status', 'Spend', 'ROAS', 'Clicks', 'Impressions'].map((h) => (
                  <th key={h} className="text-left text-text-secondary font-medium px-5 py-3 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loadingCampaigns
                ? [...Array(4)].map((_, i) => (
                    <tr key={i}>
                      {[...Array(7)].map((__, j) => (
                        <td key={j} className="px-5 py-3">
                          <div className="skeleton h-4 rounded w-16" />
                        </td>
                      ))}
                    </tr>
                  ))
                : (campaigns || []).map((c) => (
                    <tr key={c.id} className="hover:bg-bg-secondary/30 transition-colors">
                      <td className="px-5 py-3.5 font-medium text-text-primary max-w-[160px] truncate">{c.name}</td>
                      <td className="px-5 py-3.5"><Badge status={c.platform} /></td>
                      <td className="px-5 py-3.5"><Badge status={c.status} showDot /></td>
                      <td className="px-5 py-3.5 text-text-secondary">${c.spend.toLocaleString()}</td>
                      <td className="px-5 py-3.5 text-text-secondary">{c.roas > 0 ? `${c.roas}x` : '—'}</td>
                      <td className="px-5 py-3.5 text-text-secondary">{c.clicks.toLocaleString()}</td>
                      <td className="px-5 py-3.5 text-text-secondary">{c.impressions.toLocaleString()}</td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
