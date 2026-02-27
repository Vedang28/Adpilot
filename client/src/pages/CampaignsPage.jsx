import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Play, Pause, Trash2, Filter } from 'lucide-react';
import api from '../lib/api';
import Badge from '../components/ui/Badge';
import CreateCampaignModal from '../components/campaigns/CreateCampaignModal';

function SkeletonRow() {
  return (
    <tr>
      {[...Array(6)].map((_, i) => (
        <td key={i} className="py-3 pr-4">
          <div className="skeleton h-5 rounded w-24" />
        </td>
      ))}
    </tr>
  );
}

export default function CampaignsPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [filters, setFilters] = useState({ platform: '', status: '' });

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ['campaigns', filters],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters.platform) params.append('platform', filters.platform);
      if (filters.status) params.append('status', filters.status);
      return api.get(`/campaigns?${params}`).then((r) => r.data.data.campaigns);
    },
  });

  const launchMutation = useMutation({
    mutationFn: (id) => api.post(`/campaigns/${id}/launch`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['campaigns'] }),
  });

  const pauseMutation = useMutation({
    mutationFn: (id) => api.post(`/campaigns/${id}/pause`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['campaigns'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/campaigns/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['campaigns'] }),
  });

  const handleDelete = (id, name) => {
    if (window.confirm(`Delete campaign "${name}"? This cannot be undone.`)) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-bg-card border border-border rounded-lg px-3 py-2">
            <Filter className="w-4 h-4 text-text-secondary" />
            <select
              className="bg-transparent text-sm text-text-secondary focus:outline-none"
              value={filters.platform}
              onChange={(e) => setFilters({ ...filters, platform: e.target.value })}
            >
              <option value="">All Platforms</option>
              <option value="meta">Meta</option>
              <option value="google">Google</option>
              <option value="both">Both</option>
            </select>
          </div>

          <div className="flex items-center gap-2 bg-bg-card border border-border rounded-lg px-3 py-2">
            <select
              className="bg-transparent text-sm text-text-secondary focus:outline-none"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="draft">Draft</option>
            </select>
          </div>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 btn-primary"
        >
          <Plus className="w-4 h-4" />
          New Campaign
        </button>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-bg-secondary/50">
                {['Name', 'Platform', 'Status', 'Budget', 'Created', 'Actions'].map((h) => (
                  <th
                    key={h}
                    className="text-left text-text-secondary font-medium px-5 py-3.5 whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading
                ? [...Array(5)].map((_, i) => <SkeletonRow key={i} />)
                : (campaigns || []).map((c) => (
                    <tr key={c.id} className="hover:bg-bg-secondary/30 transition-colors">
                      <td className="px-5 py-3.5 font-medium text-text-primary max-w-[200px] truncate">
                        {c.name}
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge status={c.platform} />
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge status={c.status} showDot />
                      </td>
                      <td className="px-5 py-3.5 text-text-secondary whitespace-nowrap">
                        ${Number(c.budget).toLocaleString()}{' '}
                        <span className="text-xs opacity-60">/ {c.budgetType}</span>
                      </td>
                      <td className="px-5 py-3.5 text-text-secondary whitespace-nowrap">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5">
                          {c.status !== 'active' && (
                            <button
                              onClick={() => launchMutation.mutate(c.id)}
                              disabled={launchMutation.isPending}
                              title="Launch"
                              className="p-1.5 text-accent-green hover:bg-accent-green/10 rounded-lg transition-colors"
                            >
                              <Play className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {c.status === 'active' && (
                            <button
                              onClick={() => pauseMutation.mutate(c.id)}
                              disabled={pauseMutation.isPending}
                              title="Pause"
                              className="p-1.5 text-orange-400 hover:bg-orange-400/10 rounded-lg transition-colors"
                            >
                              <Pause className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(c.id, c.name)}
                            disabled={deleteMutation.isPending}
                            title="Delete"
                            className="p-1.5 text-text-secondary hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>

          {!isLoading && (!campaigns || campaigns.length === 0) && (
            <div className="text-center py-16 text-text-secondary">
              <p className="text-lg font-medium mb-1">No campaigns found</p>
              <p className="text-sm">Create your first campaign to get started.</p>
            </div>
          )}
        </div>
      </div>

      {showModal && <CreateCampaignModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
