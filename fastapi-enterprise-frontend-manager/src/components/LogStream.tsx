import { Terminal } from 'lucide-react';

interface LogStreamProps {
  logs: any[];
  title?: string;
}

export const LogStream = ({ logs, title = "Live Audit Stream" }: LogStreamProps) => {
  const getServiceName = (log: any) => log.service_name || log.service || log.app_name || "SYSTEM";

  return (
    <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111] overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#161616]">
        <div className="flex items-center gap-3">
          <Terminal size={16} className="text-emerald-500" />
          <h2 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">{title}</h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Live</span>
        </div>
      </div>

      <div className="p-6 font-mono text-[11px] bg-[#050505] overflow-x-auto max-h-[400px] overflow-y-auto">
        {logs.map((log, i) => {
          const isError = log.level === 'ERROR' || log.message?.includes("403");
          const isWarning = log.level === 'WARNING';
          
          return (
            <div key={log.id || i} className={`py-1 border-b border-white/5 flex gap-4 ${
              isError ? "text-red-400" : isWarning ? "text-amber-400" : "text-emerald-500/80"
            }`}>
              <span className="opacity-40 w-24 shrink-0">{new Date(log.timestamp).toLocaleTimeString()}</span>
              <span className="font-bold w-12 shrink-0">[{log.level || "INF"}]</span>
              <span className="w-24 shrink-0 truncate">({getServiceName(log)})</span>
              <span className="truncate">{log.message || log}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
};