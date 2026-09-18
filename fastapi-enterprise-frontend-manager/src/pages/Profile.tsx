import { useState, useEffect } from "react";
import {
  User,
  Shield,
  Key,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Mail,
  Phone,
  Pencil,
  RectangleEllipsis,
} from "lucide-react";
import { UserService } from "../api/services";

import ChangePasswordModal from "../components/ChangePasswordModel";
import EditProfileModal from "../components/EditProfileModal";
import TOTPMFAModel from "../components/TOTPMFAModel"; 

export default function Profile() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showMfaSetup, setShowMfaSetup] = useState(false);
  const [showMfaDisable, setShowMfaDisable] = useState(false);

  const refreshProfile = async () => {
    const data = await UserService.getMe();
    setUser(data);
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await UserService.getMe();
        setUser(data);
      } catch (error) {
        console.error("Failed to load profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-transparent">
        <Loader2 className="animate-spin text-indigo-600 dark:text-cyan-400" size={32} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center text-slate-500 dark:text-slate-400 text-xs font-mono">
        Failed to load profile data.
      </div>
    );
  }

  // Updated helper forcing Philippine Standard Time (Asia/Manila)
  const formatDate = (date: string) => 
    new Date(date).toLocaleString('en-US', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });

  const formatDOB = (date: string) => new Date(date).toLocaleDateString('en-US', { timeZone: 'Asia/Manila' }); 
  const permissions = user.permissions?.installed_apps || user.permissions || {};

  const getInitials = () => {
    if (user.full_name) {
      const parts = user.full_name.trim().split(" ");
      if (parts.length > 1)
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      return user.full_name.substring(0, 2).toUpperCase();
    }
    return user.username.substring(0, 2).toUpperCase();
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-12 animate-fade-in">
      
      {/* HEADER HERO SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-500/10 dark:bg-cyan-500/10 border border-indigo-500/20 dark:border-cyan-500/20 rounded-2xl text-indigo-600 dark:text-cyan-400 shadow-xs">
            <User size={24} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">
              My Profile & Credentials
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Manage personal identity, security credentials, and access vectors.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Column: Identity & Security */}
        <div className="space-y-6">
          
          {/* Identity Card */}
          <div className="relative rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#13161F] p-6 shadow-sm text-center">
            <button
              onClick={() => setShowEditProfile(true)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-cyan-400 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-xl transition-all border border-transparent"
              title="Edit Profile"
            >
              <Pencil size={15} />
            </button>

            <div className="h-20 w-20 bg-gradient-to-tr from-indigo-600/10 to-cyan-600/10 border border-indigo-500/20 dark:border-cyan-500/20 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-cyan-400 font-black text-xl uppercase mx-auto mb-4 shadow-inner font-mono">
              {getInitials()}
            </div>

            <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              {user.full_name || `@${user.username}`}
            </h2>

            {user.full_name && (
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                @{user.username}
              </p>
            )}

            <div className="my-6 space-y-2.5 text-xs text-left bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 font-mono">
              <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300 break-all">
                <Mail size={14} className="text-slate-400 shrink-0" />
                {user.email || (
                  <span className="italic text-slate-400 font-sans font-normal">No email set</span>
                )}
              </div>
              <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300">
                <Phone size={14} className="text-slate-400 shrink-0" />
                {user.phone_number || (
                  <span className="italic text-slate-400 font-sans font-normal">No phone set</span>
                )}
              </div>
            </div>

            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold tracking-wider uppercase border ${
                user.is_active 
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" 
                  : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30"
              }`}
            >
              {user.is_active ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
              <span>{user.is_active ? "Account Active" : "Account Disabled"}</span>
            </div>
          </div>

          {/* Two-Factor Auth (TOTP) Card */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#13161F] p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-xs uppercase tracking-wider flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <RectangleEllipsis
                  size={16}
                  className={user.is_totp_enabled ? "text-emerald-500" : "text-indigo-500 dark:text-cyan-400"}
                />
                Two-Factor Auth
              </h3>
              
              <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider border ${
                user.is_totp_enabled 
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" 
                  : "bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-500/20"
              }`}>
                {user.is_totp_enabled ? "Enabled" : "Disabled"}
              </span>
            </div>

            {user.is_totp_enabled ? (
              <button
                onClick={() => setShowMfaDisable(true)}
                className="w-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 py-2.5 rounded-xl text-xs font-bold transition-all border border-rose-500/30 shadow-2xs"
              >
                Disable 2FA
              </button>
            ) : (
              <button
                onClick={() => setShowMfaSetup(true)}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                Enable 2FA
              </button>
            )}
          </div>

          {/* Security Card */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#13161F] p-6 shadow-sm">
            <h3 className="font-bold text-xs uppercase tracking-wider flex items-center gap-2 text-slate-700 dark:text-slate-300 mb-4">
              <Key size={15} className="text-amber-500" /> Security Credentials
            </h3>
            <button
              onClick={() => setShowPasswordModal(true)}
              className="w-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-800 dark:text-white py-2.5 rounded-xl text-xs font-bold transition-all border border-slate-200 dark:border-slate-800 shadow-2xs"
            >
              Change Password
            </button>
          </div>
        </div>

        {/* Right Column: Details & Permissions */}
        <div className="md:col-span-2 space-y-6">
          
          {/* Account Details */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#13161F] p-6 shadow-sm">
            <h3 className="font-bold text-xs uppercase tracking-wider flex items-center gap-2 text-slate-700 dark:text-slate-300 mb-6">
              <Calendar size={15} className="text-indigo-600 dark:text-cyan-400" /> Account Timeline & Metadata
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <p className="text-xs text-slate-400 mb-1 flex items-center gap-1.5 font-medium">
                  <Calendar size={13} /> Member Since
                </p>
                <p className="font-bold text-xs font-mono text-slate-800 dark:text-slate-100">
                  {formatDate(user.created_at)}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <p className="text-xs text-slate-400 mb-1 flex items-center gap-1.5 font-medium">
                  <Calendar size={13} /> Date of Birth
                </p>
                <p className="font-bold text-xs font-mono text-slate-800 dark:text-slate-100">
                  {user.date_of_birth ? (
                    formatDOB(user.date_of_birth)
                  ) : (
                    <span className="italic text-slate-400 font-sans font-normal">
                      Not set
                    </span>
                  )}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <p className="text-xs text-slate-400 mb-1 flex items-center gap-1.5 font-medium">
                  <Clock size={13} /> Last Login
                </p>
                <p className="font-bold text-xs font-mono text-slate-800 dark:text-slate-100">
                  {user.last_login_at ? formatDate(user.last_login_at) : "First Login"}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <p className="text-xs text-slate-400 mb-1 flex items-center gap-1.5 font-medium">
                  <Clock size={13} /> Last Updated
                </p>
                <p className="font-bold text-xs font-mono text-slate-800 dark:text-slate-100">
                  {formatDate(user.updated_at)}
                </p>
              </div>
            </div>
          </div>

          {/* Read-Only Permissions List */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#13161F] p-6 shadow-sm">
            <h3 className="font-bold text-xs uppercase tracking-wider flex items-center gap-2 text-slate-700 dark:text-slate-300 mb-6">
              <Shield size={15} className="text-emerald-500" /> Assigned Permissions Matrix
            </h3>

            {Object.keys(permissions).length === 0 ? (
              <p className="text-slate-500 dark:text-slate-400 text-xs italic">
                No special application permissions assigned.
              </p>
            ) : (
              <div className="space-y-3">
                {Object.entries(permissions).map(
                  ([app, actions]: [string, any]) => (
                    <div
                      key={app}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 gap-3"
                    >
                      <span className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
                        {app}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {Array.isArray(actions) &&
                          actions.map((action: string) => (
                            <span
                              key={action}
                              className="px-2.5 py-1 text-[10px] uppercase font-bold font-mono tracking-wider rounded-md bg-indigo-500/10 dark:bg-cyan-500/10 text-indigo-600 dark:text-cyan-400 border border-indigo-500/20 dark:border-cyan-500/20"
                            >
                              {action}
                            </span>
                          ))}
                      </div>
                    </div>
                  ),
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODALS */}
      {showPasswordModal && (
        <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />
      )}
      
      {showEditProfile && (
        <EditProfileModal
          user={user}
          onClose={() => setShowEditProfile(false)}
          onSuccess={refreshProfile}
        />
      )}

      {/* Dynamic TOTP Verification Flow */}
      {showMfaSetup && (
        <TOTPMFAModel 
          onClose={() => setShowMfaSetup(false)} 
          onSuccess={() => {
            setShowMfaSetup(false);
            refreshProfile(); 
          }} 
        />
      )}

      {showMfaDisable && (
        <TOTPMFAModel 
          mode="disable" 
          onClose={() => setShowMfaDisable(false)} 
          onSuccess={() => { 
            setShowMfaDisable(false); 
            refreshProfile(); 
          }} 
        />
      )}
    </div>
  );
}