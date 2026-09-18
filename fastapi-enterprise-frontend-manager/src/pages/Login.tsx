import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, ArrowRight, AlertCircle, Loader2, Eye, EyeOff, ShieldCheck, Check, X } from 'lucide-react';
import { AuthService } from '../api/services'; 
import TOTPEntryModal from '../components/TOTPEntryModal'; 

interface LoginProps {
  onLoginSuccess?: (userData: any) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const navigate = useNavigate();
  
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Password requirement checkers
  const password = credentials.password;
  const hasMinUppercase = (password.match(/[A-Z]/g) || []).length >= 4;
  const hasMinLowercase = (password.match(/[a-z]/g) || []).length >= 4;
  const hasMinNumbers = (password.match(/[0-9]/g) || []).length >= 4;
  const hasMinSpecial = (password.match(/[^A-Za-z0-9]/g) || []).length >= 4;
  const isPasswordValid = hasMinUppercase && hasMinLowercase && hasMinNumbers && hasMinSpecial;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCredentials({ ...credentials, [e.target.name]: e.target.value });
    setError(''); 
  };

  const finalizeLogin = (accessToken: string, refreshToken: string, userData?: any) => {
    localStorage.setItem("access_token", accessToken);
    localStorage.setItem("refresh_token", refreshToken);

    const username = userData?.username || userData?.name || credentials.username;
    const isSuperUser = userData?.is_superuser || userData?.role === "Super Admin" || username.toLowerCase().includes('admin');

    const userToSave = {
      name: username,
      role: isSuperUser ? "Super Admin" : "Standard User"
    };

    localStorage.setItem("user", JSON.stringify(userToSave));
    
    if (onLoginSuccess) {
      onLoginSuccess(userToSave);
    }

    navigate('/home'); 
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isPasswordValid) {
      setError("Password does not meet all security requirements.");
      return;
    }

    setLoading(true);

    try {
      const response = await AuthService.login(credentials);
      
      if (response.status === 'mfa_required') {
        setMfaToken(response.mfa_token);
      } else if (response.access_token) {
        finalizeLogin(response.access_token, response.refresh_token, response.user || response);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || "Invalid username or password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleMfaSubmit = async (code: string) => {
    if (!mfaToken) return;
  
    const response = await AuthService.verifyMfa({ 
      mfa_token: mfaToken, 
      code: code 
    });
    
    finalizeLogin(response.access_token, response.refresh_token, response.user || response);
    setMfaToken(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-[#0A0F1D] text-slate-900 dark:text-white transition-colors duration-300">
      
      <div className="w-full max-w-md bg-white dark:bg-[#111620] p-10 lg:p-12 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl dark:shadow-2xl transition-colors duration-300">
        
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Welcome Back</h1>
          <p className="text-slate-500 dark:text-slate-400">
            Sign in to access Centralized Logging System.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          
          {error && (
            <div className="flex items-center gap-3 p-4 text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800/50">
              <AlertCircle size={18} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label htmlFor="username" className="text-xs font-bold text-slate-600 dark:text-slate-500 uppercase tracking-wider">
              Username
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={20} />
              <input 
                type="text" 
                id="username"
                name="username"
                required
                value={credentials.username}
                onChange={handleChange}
                placeholder="admin_user"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-[#0A0F1D] border border-slate-300 dark:border-slate-800 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-900 dark:text-white transition-all"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-xs font-bold text-slate-600 dark:text-slate-500 uppercase tracking-wider">
                Password
              </label>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={20} />
              <input 
                type={showPassword ? "text" : "password"} 
                id="password"
                name="password"
                required
                value={credentials.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full pl-10 pr-12 py-3 bg-slate-50 dark:bg-[#0A0F1D] border border-slate-300 dark:border-slate-800 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-900 dark:text-white transition-all"
              />
              <button
                type="button"
                onMouseDown={() => setShowPassword(true)}
                onMouseUp={() => setShowPassword(false)}
                onMouseLeave={() => setShowPassword(false)}
                onTouchStart={() => setShowPassword(true)}
                onTouchEnd={() => setShowPassword(false)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 focus:outline-none select-none"
                title="Hold to view password"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {/* Security Information Note Box */}
            <div className="mt-3 p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/30 text-xs space-y-2.5 transition-all">
              <div className="flex items-center gap-2 font-semibold text-blue-900 dark:text-blue-300">
                <ShieldCheck size={16} className="shrink-0 text-blue-600 dark:text-blue-400" />
                <span>Security Policy Note</span>
              </div>
              
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                For administrative compliance, your password must adhere to the following security criteria:
              </p>

              <div className="grid grid-cols-1 gap-1.5 pt-1">
                <div className={`flex items-center gap-2 transition-colors ${hasMinUppercase ? 'text-green-700 dark:text-green-400 font-medium' : 'text-slate-500 dark:text-slate-400'}`}>
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${hasMinUppercase ? 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'}`}>
                    {hasMinUppercase ? <Check size={10} /> : <X size={10} />}
                  </span>
                  <span>4 uppercase characters (A-Z)</span>
                </div>

                <div className={`flex items-center gap-2 transition-colors ${hasMinLowercase ? 'text-green-700 dark:text-green-400 font-medium' : 'text-slate-500 dark:text-slate-400'}`}>
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${hasMinLowercase ? 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'}`}>
                    {hasMinLowercase ? <Check size={10} /> : <X size={10} />}
                  </span>
                  <span>4 lowercase characters (a-z)</span>
                </div>

                <div className={`flex items-center gap-2 transition-colors ${hasMinNumbers ? 'text-green-700 dark:text-green-400 font-medium' : 'text-slate-500 dark:text-slate-400'}`}>
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${hasMinNumbers ? 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'}`}>
                    {hasMinNumbers ? <Check size={10} /> : <X size={10} />}
                  </span>
                  <span>4 numeric digits (0-9)</span>
                </div>

                <div className={`flex items-center gap-2 transition-colors ${hasMinSpecial ? 'text-green-700 dark:text-green-400 font-medium' : 'text-slate-500 dark:text-slate-400'}`}>
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${hasMinSpecial ? 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'}`}>
                    {hasMinSpecial ? <Check size={10} /> : <X size={10} />}
                  </span>
                  <span>4 special characters (!@#$...)</span>
                </div>
              </div>
            </div>

          </div>

          <button 
            type="submit"
            disabled={loading || !isPasswordValid}
            className="mt-2 w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed group shadow-lg shadow-blue-500/20"
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>
                Sign In
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

      </div>

      {mfaToken && (
        <TOTPEntryModal 
          onClose={() => setMfaToken(null)} 
          onSuccess={handleMfaSubmit}    
        />
      )}

    </div>
  );
}