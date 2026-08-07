import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Profile, StationSettings } from '../lib/supabase';
import { CardListSkeleton } from '../components/SkeletonLoaders';
import { Users, Search, Phone, User, CheckCircle2, XCircle, MapPin, Building2, BadgeCheck, ChevronDown, ChevronUp } from 'lucide-react';

export const ResponderTeam = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [stationInfo, setStationInfo] = useState<StationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stationExpanded, setStationExpanded] = useState(true);

  useEffect(() => {
    fetchTeamAndStation();
  }, []);

  const fetchTeamAndStation = async () => {
    setLoading(true);
    
    // Fetch profiles
    const profilesPromise = supabase
      .from('profiles')
      .select('*')
      .eq('role', 'bfp_responder')
      .order('full_name', { ascending: true });
      
    // Fetch station settings
    const stationPromise = supabase
      .from('station_settings')
      .select('*')
      .eq('id', 1)
      .single();

    const [profilesRes, stationRes] = await Promise.all([profilesPromise, stationPromise]);

    if (profilesRes.data) setProfiles(profilesRes.data);
    if (profilesRes.error) console.error(profilesRes.error);
    
    if (stationRes.data) setStationInfo(stationRes.data as StationSettings);
    if (stationRes.error) console.error(stationRes.error);

    setLoading(false);
  };

  const filtered = profiles.filter(p =>
    p.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.contact_number?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-primary">
          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          <span className="text-[10px] font-bold uppercase tracking-[0.1em]">Personnel Directory</span>
        </div>
        <h1 className="text-3xl font-black tracking-tight text-text-heading">Team Management</h1>
        <p className="text-sm text-text-muted mt-1">Station information, key personnel, and registered BFP responders.</p>
      </div>

      {/* ─── Station Information Card ─── */}
      <div className="bg-[#F6F3F2] border border-[#E5E2E1] rounded-lg overflow-hidden">
        <button
          onClick={() => setStationExpanded(e => !e)}
          className="w-full flex items-center justify-between px-6 py-5 hover:bg-[#F2EDEC] transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#FEE2E2] rounded-lg flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 text-[#B91C1C]" />
            </div>
            <div className="text-left">
              <h3 className="text-text-heading font-bold text-sm">Station Information</h3>
              <p className="text-[10px] text-text-faint font-bold uppercase tracking-widest mt-0.5">BFP Unit Details & Key Personnel</p>
            </div>
          </div>
          {stationExpanded ? <ChevronUp className="w-5 h-5 text-text-faint" /> : <ChevronDown className="w-5 h-5 text-text-faint" />}
        </button>

        {stationExpanded && (
          <div className="px-6 pb-6 pt-0 space-y-6">
            {/* Station Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-lg p-4 border border-[#E5E2E1]">
                <p className="text-[10px] font-bold uppercase tracking-widest text-text-faint mb-1">Station Name</p>
                <p className="text-sm font-bold text-text-heading">{stationInfo?.station_name || 'Not set'}</p>
              </div>
              <div className="bg-white rounded-lg p-4 border border-[#E5E2E1]">
                <p className="text-[10px] font-bold uppercase tracking-widest text-text-faint mb-1">Address</p>
                <p className="text-sm font-bold text-text-heading flex items-start gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#B91C1C] shrink-0 mt-0.5" />
                  {stationInfo?.address || 'Not set'}
                </p>
              </div>
              <div className="bg-white rounded-lg p-4 border border-[#E5E2E1]">
                <p className="text-[10px] font-bold uppercase tracking-widest text-text-faint mb-1">Contact Number</p>
                <p className="text-sm font-bold text-text-heading flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-text-faint" />
                  {stationInfo?.contact_number || 'Not set'}
                </p>
              </div>
              <div className="bg-white rounded-lg p-4 border border-[#E5E2E1]">
                <p className="text-[10px] font-bold uppercase tracking-widest text-text-faint mb-1">Email</p>
                <p className="text-sm font-bold text-text-heading">{stationInfo?.email || 'Not set'}</p>
              </div>
            </div>

            {/* Key Personnel */}
            <div>
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#B91C1C] mb-3 flex items-center gap-1.5">
                <BadgeCheck className="w-3.5 h-3.5" />
                Key Personnel
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {stationInfo?.key_personnel?.map((person, i) => (
                  <div key={i} className="bg-white rounded-lg p-4 border border-[#E5E2E1] flex items-center gap-3 hover:shadow-sm transition-shadow">
                    <div className="w-10 h-10 rounded-full bg-[#FEE2E2] flex items-center justify-center text-[#B91C1C] font-bold text-sm shrink-0">
                      {person.name.split(' ').pop()?.charAt(0) || '?'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-text-faint truncate">{person.title}</p>
                      <p className="text-sm font-bold text-text-heading truncate">{person.name}</p>
                      <p className="text-[11px] text-text-muted flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3" /> {person.contact}
                      </p>
                    </div>
                  </div>
                ))}
                {(!stationInfo?.key_personnel || stationInfo.key_personnel.length === 0) && (
                  <p className="text-xs text-text-faint">No key personnel configured.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── Registered Responders ─── */}
      <div>
        <h2 className="text-lg font-bold text-text-heading mb-4">Registered Responders</h2>

        {/* Search */}
        <div className="relative max-w-md mb-4">
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
        <div className="text-xs text-text-faint mt-4">
          Showing {filtered.length} of {profiles.length} responder{profiles.length !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  );
};
