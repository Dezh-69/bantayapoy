import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Profile, Device } from '../lib/supabase';
import { Users as UsersIcon, Search, Shield, User, UserPlus, Phone, X, CheckCircle2 } from 'lucide-react';

export const Users = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    role: 'resident',
    full_name: '',
    contact_number: '',
    device_id: '',
  });

  // Assign Device Modal State
  const [assignModal, setAssignModal] = useState({ isOpen: false, profileId: '', selectedDeviceId: '' });
  const [isAssigning, setIsAssigning] = useState(false);

  useEffect(() => {
    fetchProfiles();
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    const { data } = await supabase.from('devices').select('*').order('created_at', { ascending: false });
    if (data) setDevices(data);
  };

  const fetchProfiles = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setProfiles(data);
    }
    setLoading(false);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: newUser
      });

      if (error) throw error;
      
      setIsModalOpen(false);
      fetchProfiles();
      setNewUser({ email: '', password: '', role: 'resident', full_name: '', contact_number: '', device_id: '' });
      alert("User created successfully!");
    } catch (error: any) {
      console.error(error);
      alert('Error creating user: ' + (error.message || 'Unknown error. Make sure Edge Functions are deployed.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAssigning(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ device_id: assignModal.selectedDeviceId || null })
        .eq('id', assignModal.profileId)
        .select();
      
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error("Update blocked by Database RLS recursion.");
      }
      
      setAssignModal({ isOpen: false, profileId: '', selectedDeviceId: '' });
      fetchProfiles();
      alert("Device assigned successfully!");
    } catch (error: any) {
      console.error(error);
      alert('Error assigning device: ' + (error.message || 'Make sure the edge function is deployed.'));
    } finally {
      setIsAssigning(false);
    }
  };

  const filteredProfiles = profiles.filter(p => 
    p.full_name?.toLowerCase().includes(search.toLowerCase()) || 
    p.role.toLowerCase().includes(search.toLowerCase())
  );

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return { bg: 'bg-[#F3E8FF]', text: 'text-purple', label: 'Admin' };
      case 'bfp_responder':
        return { bg: 'bg-tier2-bg', text: 'text-accent', label: 'BFP Responder' };
      default:
        return { bg: 'bg-[rgba(0,95,123,0.1)]', text: 'text-teal', label: 'Resident' };
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-primary-dark font-bold text-xs tracking-[0.05em] uppercase mb-1">Team Management</p>
          <h2 className="text-text-heading font-extrabold text-[40px] leading-9 tracking-[-0.019em]">
            User Management
          </h2>
          <p className="text-text-warm text-base leading-[26px] mt-2">Manage Admins, BFP Responders, and Residents.</p>
        </div>
        
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-gradient-to-b from-[#FFB3AC] to-accent text-white px-5 py-2.5 rounded font-bold text-sm hover:shadow-[0_4px_6px_-4px_rgba(0,0,0,0.1),0_10px_15px_-3px_rgba(0,0,0,0.1)] transition-all"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add User</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-surface-card border border-border rounded-lg p-4 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-faint w-4 h-4" />
          <input 
            type="text" 
            placeholder="Search by name or role..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-surface-alt border border-border rounded-md pl-10 pr-4 py-2.5 text-sm text-text placeholder-text-faint focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal/30 transition-all"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-surface-card border border-border rounded-lg overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
        {loading ? (
          <div className="flex justify-center p-12">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-border border-t-primary"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-alt border-b border-border text-xs uppercase tracking-[0.1em] text-text-body">
                  <th className="px-6 py-4 font-bold">User</th>
                  <th className="px-6 py-4 font-bold">Role</th>
                  <th className="px-6 py-4 font-bold">Contact</th>
                  <th className="px-6 py-4 font-bold">Status</th>
                  <th className="px-6 py-4 font-bold">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredProfiles.map(profile => {
                  const badge = getRoleBadge(profile.role);
                  return (
                    <tr key={profile.id} className="hover:bg-surface-alt/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-surface-cream flex items-center justify-center text-text-body font-bold">
                            {profile.full_name?.charAt(0).toUpperCase() || <User className="w-4 h-4" />}
                          </div>
                          <div>
                            <p className="font-semibold text-text-heading group-hover:text-primary transition-colors text-sm">
                              {profile.full_name || 'Unnamed User'}
                            </p>
                            <p className="text-[10px] text-text-faint font-mono">{profile.id.substring(0, 8)}...</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold tracking-[0.05em] uppercase ${badge.bg} ${badge.text}`}>
                          {profile.role === 'admin' && <Shield className="w-3 h-3" />}
                          {profile.role === 'bfp_responder' && <Shield className="w-3 h-3" />}
                          {profile.role === 'resident' && <User className="w-3 h-3" />}
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-sm text-text-body">
                          <Phone className="w-3.5 h-3.5 text-text-faint" />
                          <span className="text-xs">{profile.contact_number || 'No contact'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {profile.role === 'resident' && profile.device_id ? (
                          <span className="inline-flex items-center text-xs text-success-dark font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                            Active
                          </span>
                        ) : profile.role === 'resident' ? (
                          <div className="flex flex-col items-start gap-1">
                            <span className="inline-flex items-center text-xs text-text-faint">
                              No Device
                            </span>
                            <button
                              onClick={() => setAssignModal({ isOpen: true, profileId: profile.id, selectedDeviceId: '' })}
                              className="text-[10px] font-bold text-accent hover:underline uppercase tracking-wider"
                            >
                              ASSIGN DEVICE
                            </button>
                          </div>
                        ) : (
                          <span className="inline-flex items-center text-xs text-success-dark font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                            Active
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs text-text-muted">
                        {new Date(profile.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
                {filteredProfiles.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-text-faint">
                      <UsersIcon className="w-12 h-12 mx-auto mb-3 text-border" />
                      <p className="font-medium text-text-muted">No users found.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
          <div className="bg-surface-card border border-border rounded-lg w-full max-w-md shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-border bg-surface-alt">
              <h3 className="text-lg font-bold text-text-heading">Add New User</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-text-faint hover:text-text-muted">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-text-body mb-1.5 uppercase tracking-[0.1em]">Role</label>
                <select
                  value={newUser.role}
                  onChange={e => setNewUser({...newUser, role: e.target.value})}
                  className="w-full bg-surface-card border border-border rounded-md px-4 py-2.5 text-sm text-text focus:border-teal focus:ring-1 focus:ring-teal/30 transition-all"
                >
                  <option value="resident">Resident</option>
                  <option value="bfp_responder">BFP Responder</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {newUser.role === 'resident' && (
                <div>
                  <label className="block text-xs font-bold text-text-body mb-1.5 uppercase tracking-[0.1em]">Assign Device (Optional)</label>
                  <select
                    value={newUser.device_id}
                    onChange={e => setNewUser({...newUser, device_id: e.target.value})}
                    className="w-full bg-surface-card border border-border rounded-md px-4 py-2.5 text-sm text-text focus:border-teal focus:ring-1 focus:ring-teal/30 transition-all"
                  >
                    <option value="">-- No Device Assigned --</option>
                    {devices.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.device_code} - {d.location_desc || 'No Location'}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-text-body mb-1.5 uppercase tracking-[0.1em]">Email (For Login)</label>
                <input 
                  type="email" required
                  value={newUser.email}
                  onChange={e => setNewUser({...newUser, email: e.target.value})}
                  className="w-full bg-surface-card border border-border rounded-md px-4 py-2.5 text-sm text-text focus:border-teal focus:ring-1 focus:ring-teal/30 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-body mb-1.5 uppercase tracking-[0.1em]">Temporary Password</label>
                <input 
                  type="password" required minLength={6}
                  value={newUser.password}
                  onChange={e => setNewUser({...newUser, password: e.target.value})}
                  className="w-full bg-surface-card border border-border rounded-md px-4 py-2.5 text-sm text-text focus:border-teal focus:ring-1 focus:ring-teal/30 transition-all"
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-text-body mb-1.5 uppercase tracking-[0.1em]">Full Name</label>
                <input 
                  type="text" required
                  value={newUser.full_name}
                  onChange={e => setNewUser({...newUser, full_name: e.target.value})}
                  className="w-full bg-surface-card border border-border rounded-md px-4 py-2.5 text-sm text-text focus:border-teal focus:ring-1 focus:ring-teal/30 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-body mb-1.5 uppercase tracking-[0.1em]">Contact Number (For SMS/Viber)</label>
                <input 
                  type="tel"
                  value={newUser.contact_number}
                  onChange={e => setNewUser({...newUser, contact_number: e.target.value})}
                  className="w-full bg-surface-card border border-border rounded-md px-4 py-2.5 text-sm text-text focus:border-teal focus:ring-1 focus:ring-teal/30 transition-all"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-border mt-6">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-md text-text-muted hover:text-text-heading hover:bg-surface-alt transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 rounded-md bg-gradient-to-b from-[#FFB3AC] to-accent text-white font-bold text-sm hover:shadow-lg transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Device Modal */}
      {assignModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
          <div className="bg-surface-card border border-border rounded-lg w-full max-w-md shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-border bg-surface-alt">
              <h3 className="text-lg font-bold text-text-heading">Assign Device to User</h3>
              <button onClick={() => setAssignModal({ isOpen: false, profileId: '', selectedDeviceId: '' })} className="text-text-faint hover:text-text-muted">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleAssignDevice} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-text-body mb-1.5 uppercase tracking-[0.1em]">Select Device</label>
                <select
                  required
                  value={assignModal.selectedDeviceId}
                  onChange={e => setAssignModal({...assignModal, selectedDeviceId: e.target.value})}
                  className="w-full bg-surface-card border border-border rounded-md px-4 py-2.5 text-sm text-text focus:border-teal focus:ring-1 focus:ring-teal/30 transition-all"
                >
                  <option value="" disabled>-- Choose a device --</option>
                  {devices.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.device_code} - {d.location_desc || 'No Location'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-border mt-6">
                <button 
                  type="button" 
                  onClick={() => setAssignModal({ isOpen: false, profileId: '', selectedDeviceId: '' })}
                  className="px-4 py-2 rounded-md text-text-muted hover:text-text-heading hover:bg-surface-alt transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isAssigning || !assignModal.selectedDeviceId}
                  className="px-6 py-2 rounded-md bg-gradient-to-b from-teal to-[#004d66] text-white font-bold text-sm hover:shadow-lg transition-all disabled:opacity-50"
                >
                  {isAssigning ? 'Assigning...' : 'Assign Device'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};