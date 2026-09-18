import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Search, Loader2, AlertCircle, X, HelpCircle, Eye, EyeOff } from "lucide-react";
import {
  UserRegistrationService,
  InstalledAppsService,
} from "../api/services";
import { notify } from "../utils/toast";

export default function Register() {
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [availableApps, setAvailableApps] = useState<
    Record<string, string[]>
  >({});

  const [permissions, setPermissions] = useState<
    Record<string, string[]>
  >({});

  const [formData, setFormData] = useState({
    username: "",
    password: "",
    confirm_password: "",
  });

  const [error, setError] = useState<string | string[] | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    InstalledAppsService.getInstalledApps()
      .then((res: any) => {
        const apps = res?.installed_apps ?? res ?? {};
        setAvailableApps(apps);
      })
      .catch((err) => {
        console.error("Failed to load apps:", err);
        setError("Could not load application registry.");
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredApps = useMemo(() => {
    return Object.entries(availableApps).filter(([app]) =>
      app.toLowerCase().includes(search.toLowerCase())
    );
  }, [search, availableApps]);

  const togglePermission = (app: string, action: string) => {
    setPermissions((prev) => {
      const current = prev[app] || [];

      const updated = current.includes(action)
        ? current.filter((a) => a !== action)
        : [...current, action];

      const newState = { ...prev, [app]: updated };

      if (updated.length === 0) {
        delete newState[app];
      }

      return newState;
    });
  };

  const passwordRequirements = {
    length: formData.password.length === 16,
    uppercase: (formData.password.match(/[A-Z]/g) || []).length >= 4,
    lowercase: (formData.password.match(/[a-z]/g) || []).length >= 4,
    number: (formData.password.match(/\d/g) || []).length >= 4,
    special: (formData.password.match(/[!@#$%^&*(),.?":{}|<>]/g) || []).length >= 4,
  };

  const isPasswordValid = Object.values(passwordRequirements).every(Boolean);

  const isInvalid =
    !formData.username ||
    !formData.password ||
    !formData.confirm_password ||
    !isPasswordValid ||
    formData.password !== formData.confirm_password;

  const handleInitialRegisterClick = () => {
    setError(null);

    if (!formData.username || !formData.password || !formData.confirm_password) {
      setError("All fields are required.");
      return;
    }

    if (!isPasswordValid) {
      setError("Password must be exactly 16 characters with at least 4 uppercase, 4 lowercase, 4 numbers, and 4 special characters.");
      return;
    }

    if (formData.password !== formData.confirm_password) {
      setError("Passwords do not match.");
      return;
    }

    setShowConfirmModal(true);
  };

  const executeRegistration = async () => {
    setShowConfirmModal(false);
    setError(null);

    try {
      await UserRegistrationService.registerUser({
        username: formData.username,
        password: formData.password,
        confirm_password: formData.confirm_password,
        permissions,
      });
      notify.success("User has been registered.");
      navigate("/users");
    } catch (err: any) {
      const errData = err.response?.data;
      
      if (Array.isArray(errData?.detail)) {
        const formattedErrors = errData.detail.map((d: any) => d.msg);
        setError(formattedErrors);
      } else {
        setError(errData?.detail || "Registration failed. Please check the fields.");
      }
      notify.error("Registration failed.");
    }
  };

  if (loading)
    return (
      <div className="flex h-screen items-center justify-center bg-transparent">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    );

  return (
    <div className="w-full relative pb-12 animate-fade-in flex justify-center">
      
      {/* Background Decorative Tech Glows */}
      <div className="absolute top-10 left-20 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 right-10 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-2xl rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl p-8 md:p-12 shadow-xl shadow-slate-900/5 dark:shadow-black/20 relative z-10">

        <h1 className="text-3xl font-black bg-gradient-to-r from-slate-900 via-slate-800 to-slate-600 dark:from-white dark:via-slate-200 dark:to-slate-400 bg-clip-text text-transparent tracking-tight text-center mb-2">
          Account Registration
        </h1>

        <p className="text-center text-slate-500 dark:text-slate-400 text-sm mb-8">
          Provision new infrastructure access and permissions matrix.
        </p>

        {/* ERROR DISPLAY */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/40 rounded-xl text-red-600 dark:text-red-400 text-sm backdrop-blur-md">
            <div className="flex items-center gap-2 font-bold mb-1">
              <AlertCircle size={16} className="shrink-0" />
              <span>Please address the following:</span>
            </div>
            {Array.isArray(error) ? (
              <ul className="list-disc pl-5 space-y-1 mt-2 text-xs">
                {error.map((errItem, idx) => (
                  <li key={idx}>{errItem}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-xs">{error}</p>
            )}
          </div>
        )}

        {/* INPUTS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
          <input
            placeholder="Username"
            value={formData.username}
            className="md:col-span-2 px-4 py-3 rounded-xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500/50 transition-all shadow-sm text-sm"
            onChange={(e) =>
              setFormData({ ...formData, username: e.target.value })
            }
          />

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              maxLength={16}
              value={formData.password}
              className="w-full px-4 py-3 pr-10 rounded-xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500/50 transition-all shadow-sm text-sm"
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
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
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <div className="relative">
            <input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm Password"
              maxLength={16}
              value={formData.confirm_password}
              className="w-full px-4 py-3 pr-10 rounded-xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500/50 transition-all shadow-sm text-sm"
              onChange={(e) =>
                setFormData({ ...formData, confirm_password: e.target.value })
              }
            />
            <button
              type="button"
              onMouseDown={() => setShowConfirmPassword(true)}
              onMouseUp={() => setShowConfirmPassword(false)}
              onMouseLeave={() => setShowConfirmPassword(false)}
              onTouchStart={() => setShowConfirmPassword(true)}
              onTouchEnd={() => setShowConfirmPassword(false)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 focus:outline-none select-none"
              title="Hold to view password"
            >
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {/* PASSWORD REQUIREMENTS CHECKLIST */}
        <div className="mb-6 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 backdrop-blur-md">
          <h4 className="text-xs font-bold uppercase tracking-wider mb-2 text-slate-700 dark:text-slate-300">
            Password Policy Requirements
          </h4>
          <ul className="space-y-1 text-xs">
            <li className={passwordRequirements.length ? "text-emerald-500 dark:text-emerald-400" : "text-slate-400"}>
              • Exact length: {formData.password.length}/16 characters
            </li>
            <li className={passwordRequirements.uppercase ? "text-emerald-500 dark:text-emerald-400" : "text-slate-400"}>
              • At least 4 uppercase letters
            </li>
            <li className={passwordRequirements.lowercase ? "text-emerald-500 dark:text-emerald-400" : "text-slate-400"}>
              • At least 4 lowercase letters
            </li>
            <li className={passwordRequirements.number ? "text-emerald-500 dark:text-emerald-400" : "text-slate-400"}>
              • At least 4 numbers
            </li>
            <li className={passwordRequirements.special ? "text-emerald-500 dark:text-emerald-400" : "text-slate-400"}>
              • At least 4 special characters (!@#$%^&*)
            </li>
          </ul>
        </div>

        {/* ASSIGNED ACCESS PREVIEW */}
        {Object.keys(permissions).length > 0 && (
          <div className="mb-6 p-4 rounded-xl border border-blue-500/30 bg-blue-500/5 backdrop-blur-md">
            <h3 className="text-xs font-bold uppercase tracking-wider mb-2 text-blue-500">
              Assigned App Access Matrix
            </h3>

            {Object.entries(permissions).map(([app, actions]) => (
              <div key={app} className="text-xs py-0.5">
                <span className="font-bold capitalize text-slate-800 dark:text-slate-200">{app}:</span>{" "}
                <span className="text-slate-500 dark:text-slate-400 font-mono">
                  {actions.join(", ")}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* SEARCH APPS */}
        <div className="relative mb-4">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            placeholder="Search applications..."
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500/50 transition-all shadow-sm text-sm"
          />
        </div>

        {/* APPS LIST CONTAINER */}
        <div className="h-[280px] overflow-y-auto space-y-3 pr-1 custom-scrollbar">
          {filteredApps.map(([app, actions]) => (
            <div
              key={app}
              className={`p-4 rounded-2xl border transition-all ${
                permissions[app]
                  ? "bg-blue-500/5 border-blue-500/30 shadow-sm"
                  : "bg-slate-50/60 dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-800/80"
              }`}
            >
              <h4 className="font-bold capitalize text-xs tracking-wider text-slate-700 dark:text-slate-300 mb-2.5">{app}</h4>

              <div className="flex gap-2 flex-wrap">
                {actions.map((action) => (
                  <button
                    key={action}
                    type="button"
                    onClick={() => togglePermission(app, action)}
                    className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg border transition-all ${
                      permissions[app]?.includes(action)
                        ? "bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/20"
                        : "bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/60 text-slate-500 hover:border-slate-400 dark:hover:border-slate-500"
                    }`}
                  >
                    {action}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* SUBMIT & CANCEL BUTTONS */}
        <div className="flex flex-col gap-3 mt-8">
          <button
            type="button"
            onClick={handleInitialRegisterClick}
            disabled={isInvalid}
            className={`w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg ${
              isInvalid
                ? "bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed shadow-none"
                : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-500/25 border border-blue-400/30"
            }`}
          >
            <span>Create Account</span> 
            <ArrowRight size={16} />
          </button>

          <button
            type="button"
            onClick={() => navigate("/users")}
            className="w-full py-3 rounded-xl font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100/80 dark:bg-slate-800/40 hover:bg-slate-200 dark:hover:bg-slate-800/80 transition-all border border-slate-200/60 dark:border-slate-700/50 text-sm"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3 text-blue-500">
                <HelpCircle size={22} />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Confirm Creation</h3>
              </div>
              <button 
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              Are you sure you want to provision this new user account with the configured permissions matrix?
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-2.5 rounded-xl font-medium text-sm bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all"
              >
                Go Back
              </button>
              <button
                type="button"
                onClick={executeRegistration}
                className="flex-1 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white transition-all shadow-lg shadow-blue-500/25 border border-blue-400/30"
              >
                Yes, Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}