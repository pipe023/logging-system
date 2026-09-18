import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  Lock,
  Shield,
  History,
  ArrowLeft,
  X,
  Loader2,
  Save,
  Trash2,
  Edit3,
  Unlock,
  Key,
  Search,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  GenerateApiKeyService,
  ChangePasswordService,
  InstalledAppsService,
  SystemService,
} from "../api/services";

import { notify } from "../utils/toast";

type ModalActionType =
  | "password"
  | "permissions"
  | "delete"
  | "unlock"
  | "apikey"
  | "future_action"
  | null;

export default function EditUser() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(location.state?.user || null);

  const [modalType, setModalType] = useState<ModalActionType>(null);
  const [loading, setLoading] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState("");
  const [generatedKey, setGeneratedKey] = useState("");
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | string[] | null>(null);
  const [active, setActive] = useState(user?.is_active ?? true);
  const [permissions, setPermissions] = useState<Record<string, string[]>>(
    user?.permissions?.installed_apps || {},
  );

  const [appSearch, setAppSearch] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Strict complexity rules checks
  const passwordRequirements = {
    length: password.length === 16,
    uppercase: (password.match(/[A-Z]/g) || []).length >= 4,
    lowercase: (password.match(/[a-z]/g) || []).length >= 4,
    number: (password.match(/\d/g) || []).length >= 4,
    special: (password.match(/[!@#$%^&*(),.?":{}|<>]/g) || []).length >= 4,
  };

  const isPasswordValid = Object.values(passwordRequirements).every(Boolean);

  const isLocked =
    user?.locked_until && new Date(user.locked_until) > new Date();

  const [availableApps, setAvailableApps] = useState<Record<string, string[]>>(
    {},
  );

  const allActions = [
    {
      title: "Security",
      desc: "Password resets",
      icon: <Lock className="text-blue-500" />,
      type: "password",
    },
    {
      title: "Access Control",
      desc: "Permissions & status",
      icon: <Shield className="text-emerald-500" />,
      type: "permissions",
    },
    {
      title: "API Access",
      desc: "Generate credentials",
      icon: <Key className="text-purple-500" />,
      type: "apikey",
    },
    ...(isLocked
      ? [
          {
            title: "Unlock Account",
            desc: "Remove account lockout",
            icon: <Unlock className="text-amber-500" />,
            type: "unlock",
          },
        ]
      : []),
    {
      title: "Danger Zone",
      desc: "Permanently remove user",
      icon: <Trash2 className="text-red-500" />,
      type: "delete",
    },
  ];

  const filteredApps = useMemo(() => {
    return Object.entries(availableApps).filter(([app]) =>
      app.toLowerCase().includes(appSearch.toLowerCase()),
    );
  }, [appSearch, availableApps]);

  useEffect(() => {
    if (!id) return;

    const initData = async () => {
      try {
        const [appsResponse, userData] = await Promise.all([
          InstalledAppsService.getInstalledApps(),
          SystemService.getUserById(id),
        ]);

        const rawApps =
          appsResponse?.installed_apps ||
          appsResponse?.data?.installed_apps ||
          appsResponse?.data ||
          appsResponse ||
          {};

        // Fallback default apps if the response is empty or missing expected keys
        const defaultApps = {
          Users: ["read", "create", "update", "delete"],
          Speedtester: ["read", "create", "delete"],
          "Centralized Logger": ["read", "create", "update", "delete"],
          System: ["read", "create", "update", "delete"],
        };

        const normalizedApps: Record<string, string[]> = {};
        
        if (Array.isArray(rawApps) && rawApps.length > 0) {
          rawApps.forEach((item: any) => {
            if (typeof item === "string") {
              normalizedApps[item] = ["read", "create", "update", "delete"];
            } else if (item && typeof item === "object") {
              const appName = item.name || item.app || item.id;
              const appActions = item.actions || item.permissions || ["read", "create", "update", "delete"];
              if (appName) {
                normalizedApps[appName] = appActions;
              }
            }
          });
        } else if (rawApps && typeof rawApps === "object" && Object.keys(rawApps).length > 0) {
          Object.entries(rawApps).forEach(([key, val]) => {
            if (Array.isArray(val)) {
              normalizedApps[key] = val;
            } else {
              normalizedApps[key] = ["read", "create", "update", "delete"];
            }
          });
        } else {
          // Fallback to default apps if API returns empty
          Object.assign(normalizedApps, defaultApps);
        }

        setAvailableApps(normalizedApps);

        const userPerms =
          userData?.permissions?.installed_apps ||
          userData?.permissions ||
          {};

        setPermissions(userPerms);
        setActive(userData?.is_active ?? userData?.data?.is_active ?? true);
      } catch (err) {
        console.error("Error loading registry:", err);
      }
    };

    initData();
  }, [id]);

  if (!user) return null;

  const togglePermission = (app: string, action: string) => {
    setPermissions((prev) => {
      const current = prev[app] || [];
      const updated = current.includes(action)
        ? current.filter((a: string) => a !== action)
        : [...current, action];
      return { ...prev, [app]: updated };
    });
  };

  const handleAction = async () => {
    setLoading(true);
    setPasswordError(null);

    try {
      switch (modalType) {
        case "apikey":
          const data = await GenerateApiKeyService.generateApiKey(user.id);
          if (data && data.api_key) setGeneratedKey(data.api_key);
          else if (typeof data === "string") setGeneratedKey(data);
          else setGeneratedKey(JSON.stringify(data));
          break;

        case "delete":
          await SystemService.deleteUser(id!);
          notify.success("User permanently deleted.");
          navigate("/users");
          break;

        case "password":
          if (!isPasswordValid) {
            setPasswordError("Password does not meet the strict 16-character and complexity requirements.");
            setLoading(false);
            return;
          }
          try {
            await ChangePasswordService.resetPassword(user.id, password);
            notify.success("Password updated successfully");
            setModalType(null);
            setPassword("");
          } catch (err: any) {
            const errData = err.response?.data;
            const errorDetail = errData?.detail;

            if (Array.isArray(errorDetail)) {
              setPasswordError(errorDetail.map((d: any) => d.msg));
            } else if (typeof errorDetail === "string") {
              setPasswordError(errorDetail);
            } else {
              setPasswordError("Failed to update password. Please ensure it does not match previous credentials.");
            }
          }
          break;

        case "permissions":
          const updatePayload = {
            is_active: active,
            permissions: permissions,
          };
          await SystemService.updateUser(user.id, updatePayload);
          notify.success("Settings updated successfully");
          setModalType(null);
          break;

        case "unlock":
          try {
            await SystemService.unlockUser(user.id);
            notify.success("Account unlocked successfully.");
            setUser((prev: any) => ({ ...prev, locked_until: null }));
            setModalType(null);
          } catch (error) {
            notify.error("Could not unlock account. Please try again.");
          }
          break;

        default:
          console.warn("Unhandled action type:", modalType);
          setModalType(null);
      }
    } catch (error) {
      console.error(`Failed to execute ${modalType} action:`, error);
      if (modalType !== "password") {
        notify.error(`An error occurred while processing the ${modalType} request.`);
      }
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string) => new Date(date).toLocaleString();

  return (
    <div className="max-w-6xl mx-auto p-8 animate-fade-in">
      <button
        onClick={() => navigate("/users")}
        className="flex items-center gap-2 text-slate-500 mb-8 hover:text-blue-600 transition-colors"
      >
        <ArrowLeft size={18} /> Back to User List
      </button>

      <div className="flex items-center gap-4 mb-8">
        <div className="h-16 w-16 bg-blue-600/10 rounded-full flex items-center justify-center text-blue-600 font-bold text-2xl uppercase">
          {user.username.substring(0, 2)}
        </div>
        <div>
          <h1 className="text-3xl font-bold dark:text-white">
            @{user.username}
          </h1>
          <p className="text-slate-500">Account ID: {user.id}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
          {allActions.map((card, index) => (
            <div
              key={card.title}
              className={
                index === allActions.length - 1 && allActions.length % 2 !== 0
                  ? "sm:col-span-2"
                  : ""
              }
            >
              <ActionCard
                {...card}
                onClick={() => setModalType(card.type as ModalActionType)}
              />
            </div>
          ))}
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm h-fit">
          <h2 className="font-bold mb-6 flex items-center gap-2 dark:text-white">
            <History size={20} /> System Audit Rail
          </h2>
          <div className="space-y-3 text-sm">
            <AuditRow label="ID" value={user.id.substring(0, 8) + "..."} />
            <AuditRow label="Username" value={`@${user.username}`} />
            <hr className="border-slate-100 dark:border-slate-800" />
            <AuditRow
              label="Active"
              value={user.is_active ? "Yes" : "No"}
              highlight={!user.is_active}
            />
            <AuditRow
              label="Pwd Reset Req."
              value={user.requires_password_change ? "Yes" : "No"}
              highlight={user.requires_password_change}
            />
            <AuditRow
              label="Failed Attempts"
              value={user.failed_login_attempts}
              highlight={user.failed_login_attempts > 0}
            />
            <AuditRow
              label="Deleted"
              value={user.is_deleted ? "Yes" : "No"}
              highlight={!!user.is_deleted}
            />
            <hr className="border-slate-100 dark:border-slate-800" />
            <AuditRow label="Created" value={formatDate(user.created_at)} />
            <AuditRow label="Updated" value={formatDate(user.updated_at)} />
            <AuditRow
              label="Last Login"
              value={formatDate(user.last_login_at)}
            />
            <AuditRow
              label="Status Changed"
              value={formatDate(user.status_changed_at)}
            />
            <AuditRow
              label="Locked Until"
              value={user.locked_until ? formatDate(user.locked_until) : "N/A"}
              highlight={!!user.locked_until}
            />
          </div>
        </div>
      </div>

      {/* MODALS */}
      {modalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div
            className={`bg-white dark:bg-slate-900 w-full ${modalType === "permissions" ? "max-w-2xl" : "max-w-md"} rounded-2xl p-6 shadow-2xl border dark:border-slate-800 flex flex-col max-h-[90vh]`}
          >
            <div className="flex justify-between items-center mb-6 shrink-0">
              <h2 className="text-xl font-bold dark:text-white capitalize">
                {modalType} Management
              </h2>
              <button
                onClick={() => {
                  setModalType(null);
                  setGeneratedKey("");
                  setAppSearch("");
                  setPassword("");
                  setPasswordError(null);
                }}
              >
                <X size={20} className="dark:text-white" />
              </button>
            </div>

            <div className="overflow-y-auto pr-2 custom-scrollbar flex-grow">
              {modalType === "password" && (
                <div className="space-y-4">
                  {passwordError && (
                    <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-xl text-red-500 text-xs">
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
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="New Password"
                      maxLength={16}
                      value={password}
                      className="w-full p-3 pr-10 border rounded-xl dark:bg-slate-800 outline-none focus:border-blue-500 transition-colors dark:text-white"
                      onChange={(e) => setPassword(e.target.value)}
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
                  
                  {/* PASSWORD REQUIREMENTS CHECKLIST */}
                  <div className="mt-4 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 backdrop-blur-md">
                    <h4 className="text-xs font-bold uppercase tracking-wider mb-2 text-slate-700 dark:text-slate-300">
                      Password Policy Requirements
                    </h4>
                    <ul className="space-y-1 text-xs">
                      <li className={passwordRequirements.length ? "text-emerald-500 dark:text-emerald-400" : "text-slate-400"}>
                        • Exact length: {password.length}/16 characters
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
                </div>
              )}

              {modalType === "permissions" && (
                <div>
                  <div className="flex items-center justify-between p-4 mb-4 border rounded-xl dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    <span className="font-bold dark:text-white">
                      Account Status: {active ? "Active" : "Disabled"}
                    </span>
                    <button
                      onClick={() => setActive(!active)}
                      className={`px-4 py-1.5 rounded-full text-sm font-bold transition-colors ${active ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`}
                    >
                      {active ? "Disable" : "Enable"}
                    </button>
                  </div>

                  <div className="relative mb-4">
                    <Search
                      className="absolute left-3 top-3 text-slate-500"
                      size={18}
                    />
                    <input
                      type="text"
                      placeholder="Search applications..."
                      value={appSearch}
                      onChange={(e) => setAppSearch(e.target.value)}
                      className="w-full pl-10 p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-blue-500 transition-colors dark:text-white"
                    />
                  </div>

                  <div className="space-y-3">
                    {filteredApps.length === 0 ? (
                      <div className="text-center text-slate-500 py-8 text-sm">
                        No applications match your search.
                      </div>
                    ) : (
                      filteredApps.map(([app, actions]) => (
                        <div
                          key={app}
                          className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <h4 className="font-bold text-slate-800 dark:text-white capitalize w-32 shrink-0">
                            {app}
                          </h4>
                          <div className="flex flex-wrap gap-2 justify-start sm:justify-end">
                            {Array.isArray(actions) && actions.map((action: string) => {
                              const isSelected = (
                                permissions[app] || []
                              ).includes(action);
                              return (
                                <button
                                  key={action}
                                  type="button"
                                  onClick={() =>
                                    togglePermission(app, action)
                                  }
                                  className={`px-3 py-1 text-xs rounded-full border transition-all ${
                                    isSelected
                                      ? "bg-blue-600 text-white border-blue-600 shadow-lg"
                                      : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400"
                                  }`}
                                >
                                  {action}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <button
                    onClick={handleAction}
                    disabled={loading}
                    className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  >
                    {loading ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <>
                        <Save size={18} /> Save Permissions
                      </>
                    )}
                  </button>
                </div>
              )}

              {modalType === "apikey" && (
                <div className="space-y-4">
                  {generatedKey ? (
                    <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-xl border border-dashed">
                      <code className="text-sm break-all dark:text-white">
                        {generatedKey}
                      </code>
                    </div>
                  ) : (
                    <p className="text-sm dark:text-slate-300">
                      Generate new API key?
                    </p>
                  )}
                </div>
              )}

              {modalType === "delete" && (
                <div className="space-y-4">
                  <p className="text-sm text-red-600">
                    Confirm by typing ID:{" "}
                    <span className="font-mono font-bold">{user.id}</span>
                  </p>
                  <input
                    type="text"
                    className="w-full p-3 border rounded-xl dark:bg-slate-800 outline-none focus:border-red-500 transition-colors dark:text-white"
                    onChange={(e) => setDeleteConfirmId(e.target.value)}
                  />
                </div>
              )}

              {modalType === "unlock" && (
                <p className="text-sm dark:text-slate-300">
                  Unlock this account?
                </p>
              )}
            </div>

            {modalType !== "permissions" && (
              <button
                onClick={handleAction}
                className={`w-full mt-6 shrink-0 py-3 rounded-xl font-bold ${modalType === "delete" ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"} text-white flex items-center justify-center gap-2 transition-colors`}
                disabled={
                  loading ||
                  (modalType === "delete" && deleteConfirmId !== user.id) ||
                  (modalType === "password" && !isPasswordValid)
                }
              >
                {loading ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <>
                    <Save size={18} /> {generatedKey ? "Done" : "Confirm"}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ActionCard({ title, desc, icon, onClick }: any) {
  return (
    <div
      className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-blue-500 transition-colors cursor-pointer"
      onClick={onClick}
    >
      <div className="mb-4">{icon}</div>
      <h3 className="font-bold text-lg dark:text-white">{title}</h3>
      <p className="text-sm text-slate-500 mb-4">{desc}</p>
      <div className="text-blue-600 font-medium flex items-center gap-2 hover:underline">
        <Edit3 size={16} /> Edit Settings
      </div>
    </div>
  );
}

function AuditRow({ label, value, highlight = false }: any) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-slate-500">{label}</span>
      <span
        className={`font-mono ${highlight ? "text-amber-600 font-bold" : "dark:text-white"}`}
      >
        {value}
      </span>
    </div>
  );
}