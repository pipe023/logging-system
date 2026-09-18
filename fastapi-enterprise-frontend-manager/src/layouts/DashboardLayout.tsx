import { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { 
  Home, 
  Users, 
  User, 
  FileText, 
  Sun, 
  Moon, 
  ChevronLeft,
  LogOut,
  ShieldAlert,
  AlertTriangle,
  X
} from "lucide-react";
import { UserService } from "../api/services";

interface AppUser {
  name: string;
  role: string;
  permissions?: Record<string, any>;
  is_admin?: boolean;
}

interface DashboardLayoutProps {
  isDarkMode: boolean;
  toggleTheme: () => void;
  currentUser?: AppUser;
}

export default function DashboardLayout({ isDarkMode, toggleTheme }: DashboardLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  
  // State to hold dynamically fetched user details for the layout header & permissions
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  
  const navigate = useNavigate();
  const location = useLocation();

  // Fetch the logged-in user dynamically on mount so it always matches the active session
  useEffect(() => {
    const fetchLayoutUser = async () => {
      try {
        const data = await UserService.getMe();
        
        // Correctly evaluate superuser/admin flags vs standard users
        const isAdmin = data.is_superuser || data.is_staff || data.role === "admin" || data.role === "super_admin" || data.username === "super_admin";

        setCurrentUser({
          name: data.full_name || data.username,
          role: isAdmin ? "Super Admin" : "Standard User",
          permissions: data.permissions || {},
          is_admin: isAdmin
        });
      } catch (error) {
        console.error("Failed to load layout user info:", error);
        // Fallback to localStorage if the API call encounters an issue
        try {
          const cached = localStorage.getItem("user");
          if (cached) {
            const parsed = JSON.parse(cached);
            const isCachedAdmin = parsed.is_superuser || parsed.is_staff || parsed.role === "Super Admin" || parsed.role === "admin" || parsed.role === "super_admin" || parsed.username === "super_admin";
            setCurrentUser({
              name: parsed.name || parsed.username || "User",
              role: isCachedAdmin ? "Super Admin" : "Standard User",
              permissions: parsed.permissions || {},
              is_admin: isCachedAdmin
            });
          }
        } catch (e) {
          setCurrentUser({ name: "User", role: "Standard User", permissions: {}, is_admin: false });
        }
      }
    };

    fetchLayoutUser();
  }, []);

  // Dynamic values based on the fetched currentUser state, with safe fallbacks
  const displayName = currentUser?.name || "Loading...";
  const displayRole = currentUser?.role || "";
  const displayInitials = currentUser?.name 
    ? currentUser.name.slice(0, 2).toUpperCase() 
    : "...";

  // Robust helper function to check if user has access to a specific application/module
  const hasAppAccess = (appName: string) => {
    if (!currentUser) return false;
    if (currentUser.is_admin) return true; // Admins see everything
    
    const perms = currentUser.permissions || {};
    const targetKey = appName.toLowerCase();
    
    // Check direct keys (e.g., 'users', 'Centralized Logger')
    const foundKey = Object.keys(perms).find(
      k => k.toLowerCase() === targetKey
    );

    if (foundKey) {
      const val = perms[foundKey];
      if (Array.isArray(val) && val.length > 0) return true;
      if (val === true) return true;
    }

    // Check if permissions are nested inside an 'installed_apps' dictionary or similar object
    for (const key of Object.keys(perms)) {
      if (typeof perms[key] === 'object' && perms[key] !== null) {
        const subObj = perms[key] as Record<string, any>;
        const subMatch = Object.keys(subObj).find(sk => sk.toLowerCase() === targetKey);
        if (subMatch) {
          const subVal = subObj[subMatch];
          if ((Array.isArray(subVal) && subVal.length > 0) || subVal === true) {
            return true;
          }
        }
      }
    }

    return false;
  };

  // Define all possible navigation items with respective app keys
  const allNavItems = [
    { id: "/home", label: "Home", icon: Home, alwaysShow: true }, // Home is allowed for all authenticated users
    { id: "/logs", label: "Centralized Logger", icon: FileText, appKey: "Centralized Logger" },
    { id: "/logs/system", label: "System Logs", icon: ShieldAlert, appKey: "System Logs" },
    { id: "/users", label: "User List", icon: Users, appKey: "users" },
    { id: "/me", label: "Profile", icon: User, alwaysShow: true },
  ];

  // Filter navigation items dynamically based on user role and app permissions
  const navItems = allNavItems.filter(item => {
    if (item.alwaysShow) return true;
    if (!currentUser) return false; // Prevent flicker on page refresh before user data finishes loading
    if (currentUser?.is_admin) return true;
    if (item.appKey && hasAppAccess(item.appKey)) return true;

    return false;
  });

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-[#090A0F] text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300 overflow-hidden">
      
      {/* PERSISTENT SIDEBAR */}
      <aside 
        className={`relative border-r border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0D0F17] transition-all duration-300 flex flex-col justify-between z-20 ${
          sidebarCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        <div>
          {/* Sidebar Header / Logo */}
          <div className="h-20 flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-800/80">
            {!sidebarCollapsed && (
              <div className="flex items-center gap-2.5 font-bold text-sm bg-gradient-to-r from-cyan-400 to-indigo-500 bg-clip-text text-transparent overflow-hidden">
                <FileText className="text-cyan-400 w-5 h-5 flex-shrink-0 mt-0.5" />
                <span className="tracking-tight leading-snug whitespace-normal">
                  Centralized Logging System
                </span>
              </div>
            )}
            {sidebarCollapsed && <FileText className="text-cyan-400 w-6 h-6 mx-auto" />}
            
            <button 
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex-shrink-0"
              title="Toggle Sidebar"
            >
              <ChevronLeft className={`w-4 h-4 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => navigate(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all ${
                    isActive 
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25' 
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer Controls */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800/80 space-y-2">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 hover:opacity-90 transition text-sm font-medium"
          >
            <div className="flex items-center gap-2.5 overflow-hidden">
              {isDarkMode ? <Moon className="w-4 h-4 text-cyan-400 flex-shrink-0" /> : <Sun className="w-4 h-4 text-amber-500 flex-shrink-0" />}
              {!sidebarCollapsed && <span className="text-xs truncate">{isDarkMode ? 'Dark Mode' : 'Light Mode'}</span>}
            </div>
          </button>

          <button
            onClick={() => setShowLogoutModal(true)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-rose-500 hover:bg-rose-500/10 transition text-sm font-medium"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {!sidebarCollapsed && <span className="truncate">Logout</span>}
          </button>
        </div>
      </aside>

      {/* MAIN VIEWPORT AREA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 border-b border-slate-200 dark:border-slate-800/80 bg-white/60 dark:bg-[#0D0F17]/60 backdrop-blur-md flex items-center justify-end px-6 z-10">
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold leading-tight text-slate-800 dark:text-slate-200">{displayName}</p>
              <p className="text-[10px] text-slate-400">{displayRole}</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center p-[2px] shadow-sm">
              <div className="w-full h-full bg-slate-900 rounded-full flex items-center justify-center text-xs font-bold text-white">
                {displayInitials}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-[#090A0F]">
          <Outlet />
        </main>
      </div>

      {/* LOGOUT CONFIRMATION MODAL */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
          <div 
            className="relative w-full max-w-md bg-white dark:bg-[#0D0F17] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 overflow-hidden"
          >
            {/* Close Icon Button */}
            <button 
              onClick={() => setShowLogoutModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-start gap-4">
              <div className="p-3 bg-rose-500/10 text-rose-500 rounded-2xl flex-shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Confirm Logout
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Are you sure you want to end your active session? You will need to re-authenticate to access the system.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/25 transition"
              >
                Yes, Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}