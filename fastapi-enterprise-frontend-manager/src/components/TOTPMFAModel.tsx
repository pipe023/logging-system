import { useState, useEffect } from 'react';
import { UserService } from '../api/services';
import { Loader2, X, ShieldCheck, Copy, CheckCircle2, ShieldAlert, Lock } from 'lucide-react';
import { notify} from '../utils/toast';

export default function TOTPMFAModel({ 
  onClose, 
  onSuccess,
  mode = 'setup' 
}: { 
  onClose: () => void;
  onSuccess: () => void; 
  mode?: 'setup' | 'disable';
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  // Setup State
  const [secretKey, setSecretKey] = useState<string>('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isFetching, setIsFetching] = useState(mode === 'setup');
  const [copied, setCopied] = useState(false);

  // Disable State
  const [password, setPassword] = useState('');

  // 1. Fetch secret key only if in setup mode
  useEffect(() => {
    if (mode !== 'setup') return;

    const fetchMfaSetup = async () => {
      try {
        const response = await UserService.getKey2FA();
        setSecretKey(response.secret);
      } catch (err: any) {
        console.error("Failed to initialize MFA setup:", err);
        setError("Failed to generate MFA credentials.");
      } finally {
        setIsFetching(false);
      }
    };
    fetchMfaSetup();
  }, [mode]);

  // 2. Handle 2FA Setup Verification
  const handleSetupVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (verificationCode.length !== 6) return;

    setIsSubmitting(true);
    try {
      await UserService.verifyMfaSetup(verificationCode);
      notify.success("Two-Factor Authentication enabled successfully!");
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Invalid code.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Handle 2FA Disable
  const handleDisable = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await UserService.disableMFA(password);
      notify.success("Two-Factor Authentication has been disabled.");
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Incorrect password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(secretKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl w-full max-w-md shadow-2xl border dark:border-slate-800 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6 shrink-0">
          <h2 className="text-xl font-bold dark:text-white flex items-center gap-2">
            {mode === 'setup' ? <ShieldCheck className="text-emerald-500" /> : <ShieldAlert className="text-red-500" />}
            {mode === 'setup' ? 'Setup 2FA (TOTP)' : 'Disable 2FA'}
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* --- DISABLE MODE UI --- */}
        {mode === 'disable' ? (
          <form onSubmit={handleDisable} className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Disabling 2FA reduces your account security. Please enter your password to confirm.
            </p>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="password" 
                placeholder="Enter current password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 p-3 border rounded-xl dark:bg-slate-800 dark:border-slate-700 dark:text-white outline-none focus:border-red-500 transition-colors"
                required
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button type="submit" disabled={isSubmitting || !password} className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-bold">
              {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : "Confirm Disable"}
            </button>
          </form>
        ) : (
          /* --- SETUP MODE UI --- */
          <div className="overflow-y-auto pr-2">
            {isFetching ? (
              <div className="flex justify-center py-12"><Loader2 className="animate-spin text-blue-600" size={40} /></div>
            ) : (
              <div className="space-y-6">
                <p className="text-sm text-slate-600 dark:text-slate-300">Enter this secret key into your authenticator app:</p>
                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border dark:border-slate-700">
                  <code className="text-sm font-bold tracking-widest dark:text-white">{secretKey}</code>
                  <button onClick={copyToClipboard} className="text-slate-400 hover:text-blue-600">
                    {copied ? <CheckCircle2 size={18} className="text-emerald-500" /> : <Copy size={18} />}
                  </button>
                </div>
                <form onSubmit={handleSetupVerify} className="space-y-4">
                  <input 
                    type="text" maxLength={6} placeholder="000000" value={verificationCode} 
                    onChange={e => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                    className="w-full p-3 border rounded-xl dark:bg-slate-800 dark:border-slate-700 dark:text-white text-center font-mono text-2xl tracking-[0.5em]" 
                    required 
                  />
                  {error && <p className="text-sm text-red-500 text-center">{error}</p>}
                  <button type="submit" disabled={isSubmitting || verificationCode.length !== 6} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold">
                    {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : "Verify & Enable"}
                  </button>
                </form>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}