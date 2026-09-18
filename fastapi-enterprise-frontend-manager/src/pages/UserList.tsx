import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, UserPlus, Edit2, Lock as LockIcon, RefreshCw, 
  User as UserIcon, Activity, ShieldCheck, Filter, RotateCcw, ChevronLeft, ChevronRight, Users
} from 'lucide-react';
import { SystemService } from '../api/services';

type ApiUser = {
  id: string;
  username: string;
  permissions: Record<string, any>;
  is_active: boolean;
  last_login_at: string;
  requires_password_change: boolean;
  locked_until: string | null;
};

export default function UserList() {
  const navigate = useNavigate();
  
  // Data States
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE' | 'LOCKED'>('ALL');

  // Pagination States
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(25);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await SystemService.getUserList();
      setUsers(data || []);
    } catch (err) {
      console.error("Failed to fetch users:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Reset to page 1 on search or filter change
  useEffect(() => {
    setPage(1);
  }, [searchTerm, statusFilter]);

  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('ALL');
    setPage(1);
  };

  // Filter Logic
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = user.username.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            user.id.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (!matchesSearch) return false;

      if (statusFilter === 'ACTIVE') return user.is_active && !user.locked_until;
      if (statusFilter === 'INACTIVE') return !user.is_active;
      if (statusFilter === 'LOCKED') return Boolean(user.locked_until);

      return true;
    });
  }, [users, searchTerm, statusFilter]);

  // Pagination Slice
  const totalPages = Math.ceil(filteredUsers.length / limit) || 1;
  const paginatedUsers = useMemo(() => {
    const start = (page - 1) * limit;
    return filteredUsers.slice(start, start + limit);
  }, [filteredUsers, page, limit]);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-12 animate-fade-in">
      
      {/* HEADER HERO SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-cyan-400">
              <Users size={22} />
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">
              User Directory & Access Control
            </h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 ml-1">
            Monitor identity states, session privileges, and security lockouts across the system.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button 
            onClick={loadUsers} 
            className="flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-[#13161F] border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all shadow-2xs"
            title="Refresh Directory"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
          
          <button 
            onClick={() => navigate('/users/register')}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            <UserPlus size={14} /> Add User
          </button>
        </div>
      </div>

      {/* SEARCH & FILTER TOOLBAR CONTAINER */}
      <div className="bg-white dark:bg-[#13161F] p-5 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-sm space-y-4">
        
        {/* Global Search Bar */}
        <div className="relative flex items-center bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 focus-within:ring-2 focus-within:ring-indigo-500 dark:focus-within:ring-cyan-500 transition-all">
          <Search className="w-4 h-4 text-slate-400 shrink-0 mr-3" />
          <input 
            type="text" 
            placeholder="Search users by username or user ID..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent outline-none text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 font-mono"
          />
        </div>

        {/* Filter Options */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/60">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/60 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-500">
              <Filter size={13} />
              <span>Status:</span>
            </div>

            <select 
              className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-xl text-xs text-slate-600 dark:text-slate-300 outline-none font-medium"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="LOCKED">Locked Out</option>
            </select>
          </div>

          <button 
            onClick={resetFilters}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors ml-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset Filters
          </button>
        </div>
      </div>

      {/* HIGH-DENSITY DATA TABLE CONTAINER */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#13161F] shadow-sm overflow-hidden">
        <div className="px-6 py-3.5 border-b border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30 flex justify-between items-center text-xs text-slate-500 dark:text-slate-400">
          <span>Showing <strong className="text-slate-800 dark:text-slate-200">{paginatedUsers.length}</strong> of <strong className="text-slate-800 dark:text-slate-200">{filteredUsers.length}</strong> filtered records</span>
          <span className="flex items-center gap-1.5 text-indigo-600 dark:text-cyan-400 font-bold uppercase tracking-wider text-[10px]">
            <ShieldCheck size={13} /> Role Directory Secure
          </span>

        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center text-slate-500 animate-pulse font-mono text-xs gap-2">
            <Activity className="animate-spin" size={16} /> Syncing User Directory...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-mono text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-6">Username / Identity</th>
                  <th className="py-3.5 px-6 hidden md:table-cell">Last Login</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/50 dark:divide-slate-800/60">
                {paginatedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-16 text-center text-slate-500 font-sans italic">
                      No matching user accounts found.
                    </td>
                  </tr>
                ) : (
                  paginatedUsers.map((user) => (
                    <tr 
                      key={user.id} 
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition-colors group"
                    >
                      <td className="py-3.5 px-6 font-sans">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-cyan-400 shrink-0">
                            <UserIcon size={15} />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white tracking-tight">
                              @{user.username}
                            </p>
                            <p className="text-[11px] text-slate-400 font-mono">
                              ID: {user.id}
                            </p>
                          </div>
                        </div>
                      </td>
                      
                      <td className="py-3.5 px-6 hidden md:table-cell text-slate-600 dark:text-slate-400 text-[11px]">
                        {user.last_login_at ? new Date(user.last_login_at).toLocaleString() : 'Never'}
                      </td>

                      <td className="py-3.5 px-6 font-sans">
                        {user.locked_until ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                            <LockIcon size={11} /> Locked
                          </span>
                        ) : user.is_active ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">
                            Inactive
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-6 text-right">
                        <button 
                          onClick={() => navigate(`/users/edit/${user.id}`, { state: { user } })} 
                          className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 dark:hover:text-cyan-400 hover:bg-indigo-50 dark:hover:bg-slate-800 transition-colors border border-transparent"
                          title="Edit User"
                        >
                          <Edit2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30 flex flex-wrap justify-between items-center text-xs text-slate-500 dark:text-slate-400 gap-4 font-mono">
          <div className="flex items-center gap-2">
            <span>Per page:</span>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 py-1 rounded-lg text-xs text-slate-700 dark:text-slate-300 outline-none font-medium"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(p - 1, 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="font-semibold text-slate-700 dark:text-slate-300 px-2">
              Page {page} of {totalPages}
            </span>

            <button
              onClick={() => setPage(p => Math.min(p + 1, totalPages))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

    </div>
  );
}