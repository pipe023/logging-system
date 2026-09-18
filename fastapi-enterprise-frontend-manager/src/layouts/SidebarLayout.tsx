import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Users, Shield, Sun, Moon, Server } from 'lucide-react';

export default function SidebarLayout({ isDarkMode, toggleTheme }: any) {
  const navClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 p-3 rounded-lg transition-all ${
      isActive 
        ? 'bg-blue-600 text-white shadow-md' 
        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
    }`;

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-200 dark:border-slate-800 p-6 flex flex-col gap-8 sticky top-0 h-screen">
        <div className="flex items-center gap-2">
          <Server className="text-blue-600" />
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">InfraSentinel</h1>
        </div>
        
        <nav className="flex flex-col gap-2 flex-1">
          <NavLink to="/home" className={navClass}>
            <LayoutDashboard size={20} /> Dashboard
          </NavLink>
          <NavLink to="/users" className={navClass}>
            <Users size={20} /> User Management
          </NavLink>
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        <header className="h-16 border-b border-slate-200 dark:border-slate-800 flex items-center justify-end px-8 bg-white dark:bg-slate-900">
           <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
             {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
           </button>
        </header>
        
        <main className="p-8 max-w-7xl">
          <Outlet />
        </main>
      </div>
    </div>
  );
}