import { useState } from 'react';
import { X, Copy, CheckCircle2, KeyRound, AlertTriangle } from 'lucide-react';

interface TOTPKeyDisplayModalProps {
  secretKey: string;
  qrCodeUrl?: string; // Optional: Base64 image string or URL for the QR code
  onClose: () => void;
}

export default function TOTPKeyDisplayModal({ secretKey, qrCodeUrl, onClose }: TOTPKeyDisplayModalProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(secretKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl w-full max-w-md shadow-2xl border dark:border-slate-800 flex flex-col relative">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6 shrink-0">
          <h2 className="text-xl font-bold dark:text-white flex items-center gap-2">
            <KeyRound className="text-blue-500" />
            Your Secret Key
          </h2>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-6">
          
          {/* Security Warning */}
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 p-4 rounded-xl flex gap-3 text-amber-800 dark:text-amber-400">
            <AlertTriangle size={20} className="shrink-0 mt-0.5" />
            <p className="text-sm">
              Please save this key in a secure password manager. If you lose access to your authenticator app, you will need this key to recover your account.
            </p>
          </div>

          {/* Optional QR Code */}
          {qrCodeUrl && (
            <div className="flex justify-center bg-white p-4 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 mx-auto w-fit">
              <img src={qrCodeUrl} alt="TOTP QR Code" className="w-40 h-40 object-contain" />
            </div>
          )}

          {/* Secret Key Display */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
              Manual Setup Key
            </label>
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
              <code className="text-lg font-mono font-bold tracking-widest text-slate-900 dark:text-white break-all">
                {secretKey}
              </code>
              <button 
                onClick={copyToClipboard}
                className="ml-4 p-2 bg-white dark:bg-slate-700 rounded-lg shadow-sm border border-slate-200 dark:border-slate-600 text-slate-500 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400 transition-colors shrink-0"
                title="Copy to clipboard"
              >
                {copied ? <CheckCircle2 size={20} className="text-emerald-500" /> : <Copy size={20} />}
              </button>
            </div>
          </div>

          <button 
            onClick={onClose} 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-bold transition-colors"
          >
            I Have Saved My Key
          </button>
        </div>

      </div>
    </div>
  );
}