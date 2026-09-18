import { useState } from "react";
import { apiClient } from "../api/client";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { notify } from "../utils/toast";

export default function ChangePasswordModal({
  onClose,
}: {
  onClose: () => void;
}) {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [passwordError, setPasswordError] = useState<string | string[] | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (newPassword !== confirmPassword) {
      notify.error("New passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await apiClient.post("/users/me/change-password", {
        old_password: oldPassword,
        new_password: newPassword,
      });

      notify.success("Password updated successfully!");
      onClose();
      window.location.reload();
    } catch (err: any) {
      const errData = err.response?.data;
      const errorDetail = errData?.detail;

      if (Array.isArray(errorDetail)) {
        setPasswordError(errorDetail.map((d: any) => d.msg));
      } else if (typeof errorDetail === "string") {
        setPasswordError(errorDetail);
      } else {
        const fallbackMsg =
          errorDetail ||
          "Failed to update password. Please ensure it does not match previous credentials.";
        setPasswordError(fallbackMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-slate-900 p-8 rounded-2xl w-full max-w-sm shadow-2xl border dark:border-slate-800"
      >
        <h2 className="text-xl font-bold mb-2 dark:text-white">
          Security Update Required
        </h2>
        <p className="text-sm text-slate-500 mb-6">
          Verify your current credentials to set a new password.
        </p>

        {passwordError && (
          <div className="p-3 mb-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-500 text-xs">
            <p className="font-bold mb-1">Password Update Error:</p>
            {Array.isArray(passwordError) ? (
              <ul className="list-disc pl-4 space-y-0.5">
                {passwordError.map((errItem, idx) => (
                  <li key={idx}>{errItem}</li>
                ))}
              </ul>
            ) : (
              <p>{passwordError}</p>
            )}
          </div>
        )}

        <div className="relative mb-4">
          <input
            type={showOldPassword ? "text" : "password"}
            placeholder="Old Password"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            className="w-full p-3 pr-10 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white outline-none focus:border-blue-500 transition-colors"
            required
          />
          <button
            type="button"
            onClick={() => setShowOldPassword(!showOldPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          >
            {showOldPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        <div className="relative mb-4">
          <input
            type={showNewPassword ? "text" : "password"}
            placeholder="New Password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full p-3 pr-10 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white outline-none focus:border-blue-500 transition-colors"
            required
          />
          <button
            type="button"
            onClick={() => setShowNewPassword(!showNewPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          >
            {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        <div className="relative mb-6">
          <input
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Confirm New Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full p-3 pr-10 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white outline-none focus:border-blue-500 transition-colors"
            required
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          >
            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        <div className="space-y-3">
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold flex justify-center hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" /> : "Set New Password"}
          </button>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="w-full bg-transparent text-slate-600 dark:text-slate-400 py-3 rounded-lg font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}