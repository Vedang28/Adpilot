import { useQuery } from '@tanstack/react-query';
import { LayoutDashboard, Zap, DollarSign, TrendingUp } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import api from '../lib/api';
import StatCard from '../components/ui/StatCard';
import Badge from '../components/ui/Badge';

function SkeletonCard() {
  return <div className="skeleton h-36 rounded-xl" />;
}

function SkeletonTable() {
  return (
    <div className="space-y-3">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="skeleton h-12 rounded-lg" />
      ))}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-bg-card border border-border rounded-lg px-3 py-2 text-xs">
      <p className="text-text-secondary mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }} className="font-semibold">
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
};

export default function DashboardPage() {
  const { data: overview, isLoading: loadingOverview } = useQuery({
    queryKey: ['analytics', 'overview'],
    queryFn: () => api.get('/analytics/overview').then((r) => r.data.data),
  });

  const { data: campaigns, isLoading: loadingCampaigns } = useQuery({
    queryKey: ['analytics', 'campaigns'],
    queryFn: () => api.get('/analytics/campaigns').then((r) => r.data.data.campaigns),
  });

  const { data: recentCampaigns, isLoading: loadingRecent } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => api.get('/campaigns').then((r) => r.data.data.campaigns),
  });

  const barColors = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444'];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {loadingOverview ? (
          [...Array(4)].map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <StatCard
              icon={LayoutDashboard}
              label="Total Campaigns"
              value={overview?.totalCampaigns ?? 0}
              change={12}
              iconColor="text-accent-blue"
              iconBg="bg-accent-blue/10"
            />
            <StatCard
              icon={Zap}
              label="Active Campaigns"
              value={overview?.activeCampaigns ?? 0}
              change={5}
              iconColor="text-accent-green"
              iconBg="bg-accent-green/10"
            />
            <StatCard
              icon={DollarSign}
              label="Total Ad Spend"
              value={overview?.totalAdSpend ?? 0}
              change={-3}
              prefix="$"
              iconColor="text-accent-purple"
              iconBg="bg-accent-purple/10"
            />
            <StatCard
              icon={TrendingUp}
              label="Avg ROAS"
              value={overview?.avgROAS ?? 0}
              change={8}
              suffix="x"
              iconColor="text-orange-400"
              iconBg="bg-orange-400/10"
            />
          </>
        )}
      </div>

      {/* Bar Chart */}
      <div className="card">
        <h2 className="text-base font-semibold text-text-primary mb-4">Campaign Performance</h2>
        {loadingCampaigns ? (
          <div className="skeleton h-56 rounded-lg" />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={campaigns} margin={{ top: 4, right: 4, left: -20, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1A1E2E" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fill: '#8892A8', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                interval={0}
                tickFormatter={(v) => (v.length > 14 ? v.slice(0, 14) + '…' : v)}
              />
              <YAxis tick={{ fill: '#8892A8', fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#1A1E2E' }} />
              <Bar dataKey="clicks" name="Clicks" radius={[4, 4, 0, 0]}>
                {(campaigns || []).map((_, i) => (
                  <Cell key={i} fill={barColors[i % barColors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Recent Campaigns Table */}
      <div className="card">
        <h2 className="text-base font-semibold text-text-primary mb-4">Recent Campaigns</h2>
        {loadingRecent ? (
          <SkeletonTable />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {['Name', 'Platform', 'Status', 'Budget', 'Ads'].map((h) => (
                    <th key={h} className="text-left text-text-secondary font-medium pb-3 pr-4 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(recentCampaigns || []).slice(0, 5).map((c) => (
                  <tr key={c.id} className="hover:bg-bg-secondary/40 transition-colors">
                    <td className="py-3 pr-4 font-medium text-text-primary max-w-[160px] truncate">
                      {c.name}
                    </td>
                    <td className="py-3 pr-4">
                      <Badge status={c.platform} />
                    </td>
                    <td className="py-3 pr-4">
                      <Badge status={c.status} showDot />
                    </td>
                    <td className="py-3 pr-4 text-text-secondary">
                      ${Number(c.budget).toLocaleString()}
                    </td>
                    <td className="py-3 text-text-secondary">
                      {c._count?.ads ?? 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(!recentCampaigns || recentCampaigns.length === 0) && (
              <p className="text-center text-text-secondary py-8 text-sm">No campaigns yet.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
