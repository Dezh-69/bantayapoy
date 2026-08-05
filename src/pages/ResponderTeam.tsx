import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Profile } from '../lib/supabase';
import { CardListSkeleton } from '../components/SkeletonLoaders';
import { Users, Search, Phone, Shield, User, CheckCircle2, XCircle } from 'lucide-react';

export const ResponderTeam = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchTeam();
  }, []);

  const fetchTeam = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'bfp_responder')
      .order('full_name', { ascending: true });

    if (data) setProfiles(data);
    if (error) console.error(error);
    setLoading(false);
  };

  const filtered = profiles.filter(p =>
    p.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.contact_number?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-primary">
          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          <span className="text-[10px] font-bold uppercase tracking-[0.1em]">Personnel Directory</span>
        </div>
        <h1 className="text-3xl font-black tracking-tight text-text-heading">Team Management</h1>
        <p className="text-sm text-text-muted mt-1">View all BFP responders registered in the system.</p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-faint" />
        <input
          type="text"
          placeholder="Search by name or contact..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-surface-alt border border-border rounded-md pl-10 pr-4 py-2.5 text-sm text-text placeholder-text-faint focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
        />
      </div>

      {/* Team Table */}
      <div className="bg-surface-card border border-border rounded-lg overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
        {loading ? (
          <div className="p-6">
            <CardListSkeleton count={4} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-alt border-b border-border text-xs uppercase tracking-[0.1em] text-text-body">
                  <th className="px-6 py-4 font-bold">Responder</th>
                  <th className="px-6 py-4 font-bold">Contact</th>
                  <th className="px-6 py-4 font-bold">Status</th>
                  <th className="px-6 py-4 font-bold">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(p => (
                  <tr key={p.id} className="hover:bg-surface-alt/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#FEE2E2] flex items-center justify-center text-[#B91C1C] font-bold">
                          {p.full_name?.charAt(0).toUpperCase() || <User className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className="font-semibold text-text-heading text-sm">{p.full_name || 'Unnamed'}</p>
                          <p className="text-[10px] text-text-faint font-mono">{p.id.substring(0, 8)}...</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-sm text-text-body">
                        <Phone className="w-3.5 h-3.5 text-text-faint" />
                        <span className="text-xs">{p.contact_number || 'No contact'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {p.is_active ? (
                        <span className="inline-flex items-center text-xs text-success-dark font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-xs text-[#DC2626] font-semibold">
                          <XCircle className="w-3.5 h-3.5 mr-1" />
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-text-muted">
                      {new Date(p.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-text-faint">
                      <Users className="w-12 h-12 mx-auto mb-3 text-border" />
                      <p className="font-medium text-text-muted">No team members found.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="text-xs text-text-faint">
        Showing {filtered.length} of {profiles.length} responder{profiles.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
};
