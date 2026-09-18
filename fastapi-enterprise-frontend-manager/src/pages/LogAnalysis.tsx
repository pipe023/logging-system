import { useEffect, useState } from 'react';
import { Users, ShieldCheck, Activity, CheckCircle2, Code2, AlertTriangle, ShieldAlert, LayoutDashboard } from 'lucide-react';
import { SystemService } from '../api/services';

interface DashboardData {
  metrics: {
    total_users: number;
    human_users: number;
    service_accounts: number;
    total_apps: number;
  };
  apps: any;
  logs: string[];
  installed_apps: string[];
  fetchedAt: string;
}

export default function Home() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    SystemService.getDashboardMetrics()
      .then((res: any) => {
        setData({
          metrics: res.metrics || { total_users: 0, human_users: 0, service_accounts: 0, total_apps: 0 },
          apps: res.apps || {},
          logs: res.logs || [],
          installed_apps: res.installed_apps || [],
          fetchedAt: new Date().toISOString(),
        });
        setLoading(false);
      })
      .catch((err) => {
        console.error("Dashboard Load Error:", err);
        setLoading(false);
      });
  }, []);

  if (loading || !data) return (
    <div className="flex h-[calc(100vh-4rem)] items-center justify-center bg-transparent">
      <div className="flex items-center gap-2.5 text-indigo-500 dark:text-cyan-400 font-mono text-sm">
        <Activity className="animate-spin w-5 h-5" />
        <span>Initializing System Monitor...</span>
      </div>
    </div>
  );

  const uniqueSystemsCount = 2; 

  const errorCount = data.logs.filter(log => log.includes("ERROR") || log.includes("403") || log.includes("422") || log.includes("Failed")).length;
  const warningCount = data.logs.filter(log => log.includes("WARNING") || log.includes("WARN")).length;
  const systemStatus = errorCount > 5 ? "DEGRADED" : "OPERATIONAL";

  return (
    <div className="w-full max-w-7xl mx-auto space-y-5 pb-12 animate-fade-in">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-500/10 dark:bg-cyan-500/10 border border-indigo-500/20 dark:border-cyan-500/20 rounded-2xl text-indigo-600 dark:text-cyan-400 shadow-xs">
            <LayoutDashboard size={24} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">
              System Overview
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Real-time health monitoring and audit trail telemetry.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Live Polling Active
          </span>
        </div>
      </div>

      {/* UNIFIED COMPACT METRICS BAR */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 bg-white dark:bg-[#13161F] p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
        
        {/* Total Users */}
        <div className="flex items-center gap-3.5 p-2 border-r border-slate-100 dark:border-slate-800/80 last:border-0">
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20 shrink-0">
            <Users className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block truncate">Total Users</span>
            <p className="text-xl font-black text-slate-900 dark:text-white tracking-tight">{data.metrics.total_users}</p>
          </div>
        </div>

        {/* Active Log Sources */}
        <div className="flex items-center gap-3.5 p-2 border-r border-slate-100 dark:border-slate-800/80 last:border-0">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block truncate">Log Sources</span>
            <p className="text-xl font-black text-slate-900 dark:text-white tracking-tight">{uniqueSystemsCount}</p>
          </div>
        </div>

        {/* System Status */}
        <div className="flex items-center gap-3.5 p-2 border-r border-slate-100 dark:border-slate-800/80 last:border-0">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-500 border border-cyan-500/20 shrink-0">
            <Activity className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block truncate">System Status</span>
            <p className="text-xs font-black text-emerald-500 tracking-tight flex items-center gap-1 mt-0.5 truncate">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> {systemStatus}
            </p>
          </div>
        </div>

        {/* Active Warnings */}
        <div className="flex items-center gap-3.5 p-2 border-r border-slate-100 dark:border-slate-800/80 last:border-0">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block truncate">Warnings</span>
            <p className="text-xl font-black text-amber-500 tracking-tight">{warningCount}</p>
          </div>
        </div>

        {/* Critical Failures */}
        <div className="flex items-center gap-3.5 p-2 col-span-2 sm:col-span-1">
          <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20 shrink-0">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block truncate">Failures</span>
            <p className="text-xl font-black text-rose-500 tracking-tight">{errorCount}</p>
          </div>
        </div>

      </section>

      {/* LIVE AUDIT STREAM */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#13161F] shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Code2 className="w-4 h-4" />
            </div>
            <h2 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Live Audit Stream</h2>
          </div>
          
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-bold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </div>
        </div>

        <div className="p-6 font-mono text-xs bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-200 overflow-x-auto max-h-[500px] overflow-y-auto transition-colors">
          {data.logs.length === 0 ? (
            <p className="text-slate-500 italic py-4 text-center">No system log entries recorded yet.</p>
          ) : (
            data.logs.map((log, i) => {
              const isError = log.includes("ERROR") || log.includes("403") || log.includes("422") || log.includes("Failed");
              const isWarning = log.includes("WARNING") || log.includes("WARN");
              
              return (
                <div 
                  key={i} 
                  className={`py-1.5 px-3 rounded-lg my-1 flex gap-3 items-center transition-colors border-l-2 ${
                    isError 
                      ? "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500" 
                      : isWarning 
                      ? "bg-amber-500/10 text-amber-800 dark:text-amber-200 border-amber-500" 
                      : "bg-white dark:bg-slate-900/40 text-slate-700 dark:text-cyan-300/90 border-slate-300 dark:border-cyan-500/40 hover:bg-slate-100 dark:hover:bg-slate-900 shadow-2xs dark:shadow-none"
                  }`}
                >
                  <span className="opacity-40 text-[10px] shrink-0">{(i + 1).toString().padStart(2, '0')}</span>
                  <span className={`font-bold text-[10px] px-1.5 py-0.5 rounded border shrink-0 ${
                    isError 
                      ? "bg-rose-500/20 border-rose-500/30 text-rose-600 dark:text-rose-400" 
                      : isWarning 
                      ? "bg-amber-500/20 border-amber-500/30 text-amber-600 dark:text-amber-400" 
                      : "bg-slate-200 dark:bg-cyan-500/10 border-slate-300 dark:border-cyan-500/20 text-slate-700 dark:text-cyan-400"
                  }`}>
                    {isError ? "ERR" : isWarning ? "WRN" : "INF"}
                  </span>
                  <span className="truncate">{log}</span>
                </div>
              );
            })
          )}
        </div>
      </section>

    </div>
  );
}