import { useEffect, useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  ResponsiveContainer, 
  LineChart, Line, 
  PieChart, Pie, Cell, 
  XAxis, YAxis, Tooltip, Legend, CartesianGrid 
} from 'recharts';
import { 
  Activity, Layers, AlertOctagon, BarChart3, 
  User, Bell, X, Filter, ShieldCheck, TrendingUp, PieChart as PieChartIcon, CheckCircle2, AlertTriangle, ChevronDown, ChevronUp 
} from 'lucide-react';
import { LoggingService, type LogItem } from '../api/services';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function LogAnalysis() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  
  // Collapse state for managing large systems list
  const [isMatrixExpanded, setIsMatrixExpanded] = useState<boolean>(false);

  // URL Persistence
  const timeRange = searchParams.get('range') || '24h';
  const filterService = searchParams.get('service') || '';

  const setTimeRange = (range: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('range', range);
    setSearchParams(params);
  };

  const setServiceFilter = (service: string) => {
    const params = new URLSearchParams(searchParams);
    if (service) {
      params.set('service', service);
    } else {
      params.delete('service');
    }
    setSearchParams(params);
  };

  const getServiceName = useCallback((log: any) => {
    return log.service_name || log.service || log.app_name || "SYSTEM";
  }, []);

  // Optimized User Map Lookup
  const userMap = useMemo(() => {
    const map = new Map<string, string>();
    users.forEach((u) => {
      const userId = u.id ?? u.user_id ?? u.users_id;
      const userName = u.username ?? u.name ?? u.email;
      if (userId) map.set(String(userId), userName || `User ${userId}`);
    });
    return map;
  }, [users]);

  // Primary Data Fetching Engine
  const fetchData = useCallback(async () => {
    try {
      const [logsResponse, usersData, statsData] = await Promise.all([
        LoggingService.getLogs({ limit: 100 }), 
        LoggingService.getUsers().catch(() => []),
        LoggingService.getSummary().catch(() => ({}))
      ]);

      const responseAny = logsResponse as any;
      const actualLogs: LogItem[] = Array.isArray(logsResponse) 
        ? logsResponse 
        : (responseAny?.logs || responseAny?.items || responseAny?.data || []);

      const usersAny = usersData as any;
      const actualUsers = Array.isArray(usersData) 
        ? usersData 
        : (usersAny?.data || []);

      setLogs(actualLogs);
      setUsers(actualUsers);
      setStats(statsData || {});
    } catch (e) {
      console.error("Error loading analysis data", e);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Date Range & Service Filtering
  const filteredLogs = useMemo(() => {
    let data = logs;
    if (timeRange !== 'all') {
      const now = Date.now();
      const rangeInMs = timeRange === '1h' ? 3600000 : timeRange === '6h' ? 21600000 : 86400000;
      data = data.filter(l => {
        const timestamp = new Date(l.timestamp).getTime();
        return !isNaN(timestamp) && (now - timestamp) < rangeInMs;
      });
    }
    if (filterService) {
      data = data.filter(l => getServiceName(l) === filterService);
    }
    return data;
  }, [logs, timeRange, filterService, getServiceName]);

  // Global System Health Score Calculation
  const healthScore = useMemo(() => {
    const total = logs.length;
    if (total === 0) return 100;
    
    const errors = logs.filter(l => {
      const lvl = String(l.level || '').toUpperCase();
      return lvl.includes('ERR') || lvl.includes('FAIL') || lvl.includes('FATAL');
    }).length;

    const warnings = logs.filter(l => {
      const lvl = String(l.level || '').toUpperCase();
      return lvl.includes('WARN');
    }).length;
    
    const deduction = ((errors * 3 + warnings * 1) / total) * 100;
    const score = Math.max(0, Math.min(100, 100 - deduction));
    return Number(score.toFixed(1));
  }, [logs]);

  // Per-System / Per-Service Health Breakdown Computation
  const subsystemHealthMetrics = useMemo(() => {
    const serviceMap: Record<string, { total: number; errors: number; warnings: number }> = {};

    logs.forEach(l => {
      const name = getServiceName(l);
      if (!serviceMap[name]) {
        serviceMap[name] = { total: 0, errors: 0, warnings: 0 };
      }
      serviceMap[name].total += 1;

      const lvl = String(l.level || '').toUpperCase();
      if (lvl.includes('ERR') || lvl.includes('FAIL') || lvl.includes('FATAL')) {
        serviceMap[name].errors += 1;
      } else if (lvl.includes('WARN')) {
        serviceMap[name].warnings += 1;
      }
    });

    return Object.entries(serviceMap).map(([name, data]) => {
      const deduction = ((data.errors * 3 + data.warnings * 1) / data.total) * 100;
      const score = Math.max(0, Math.min(100, 100 - deduction));
      
      let status = 'Optimal';
      if (score < 70) status = 'Critical';
      else if (score < 90) status = 'Degraded';

      return {
        name,
        totalLogs: data.total,
        errors: data.errors,
        warnings: data.warnings,
        score: Number(score.toFixed(1)),
        status
      };
    }).sort((a, b) => a.score - b.score); // Sort lowest health score to top
  }, [logs, getServiceName]);

  // Service Breakdown for Pie Chart & Dropdown
  const serviceData = useMemo(() => {
    const dist = stats.service_distribution || {};
    if (Object.keys(dist).length > 0) {
      return Object.entries(dist).map(([name, count]) => ({ name, count: Number(count) }));
    }
    const counts: Record<string, number> = {};
    logs.forEach(l => {
      const name = getServiceName(l);
      counts[name] = (counts[name] || 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }, [stats, logs, getServiceName]);

  // Severity Trend Line Chart Buckets
  const trendData = useMemo(() => {
    const hours = timeRange === '1h' ? 1 : timeRange === '6h' ? 6 : 24;
    const buckets: Record<string, { time: string; INFO: number; WARN: number; ERR: number }> = {};
    
    const now = new Date();
    for (let i = hours - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 3600000);
      const timeKey = `${String(d.getHours()).padStart(2, '0')}:00`;
      buckets[timeKey] = { time: timeKey, INFO: 0, WARN: 0, ERR: 0 };
    }

    filteredLogs.forEach(l => {
      if (!l.timestamp) return;
      const logDate = new Date(l.timestamp);
      if (isNaN(logDate.getTime())) return;
      
      const timeKey = `${String(logDate.getHours()).padStart(2, '0')}:00`;
      if (buckets[timeKey]) {
        const lvl = String(l.level || '').toUpperCase();
        if (lvl.includes('INFO')) buckets[timeKey].INFO += 1;
        else if (lvl.includes('WARN')) buckets[timeKey].WARN += 1;
        else if (lvl.includes('ERR') || lvl.includes('FAIL') || lvl.includes('FATAL')) buckets[timeKey].ERR += 1;
      }
    });

    return Object.values(buckets);
  }, [filteredLogs, timeRange]);

  // Login Performance Aggregation
  const loginPieData = useMemo(() => {
    let success = 0;
    let failed = 0;

    logs.forEach(l => {
      const msg = String(l.message || "").toLowerCase();
      const lvl = String(l.level || "").toUpperCase();

      if (
        msg.includes("success") || 
        msg.includes("logged in") || 
        msg.includes("authenticated")
      ) {
        success++;
      } else if (
        msg.includes("fail") || 
        msg.includes("invalid") || 
        msg.includes("denied") || 
        msg.includes("unauthorized") ||
        (msg.includes("login") && (lvl.includes("ERR") || lvl.includes("WARN")))
      ) {
        failed++;
      }
    });

    const total = success + failed;
    return [
      { name: 'Successful', value: success },
      { name: 'Failed', value: failed, percentage: total > 0 ? ((failed / total) * 100).toFixed(1) : "0.0" }
    ];
  }, [logs]);

  // Top Failed Users & Target Services Breakdown
  const topFailedUsers = useMemo(() => {
    const tracker: Record<string, { timestamp: string; service: string }[]> = {};

    logs.forEach(log => {
      const msg = String(log.message || "").toLowerCase();
      const lvl = String(log.level || "").toUpperCase();

      const isFailedLogin =
        msg.includes("fail") ||
        msg.includes("invalid") ||
        msg.includes("denied") ||
        (msg.includes("login") && (lvl.includes("ERR") || lvl.includes("WARN")));

      if (!isFailedLogin) return;

      const match = log.message?.match(/username:\s*([^\s]+)/i);
      const username =
        match?.[1] ||
        userMap.get(String(log.user_id)) ||
        (log.user_id ? `ID: ${log.user_id}` : 'Unknown');

      const service = getServiceName(log);

      if (!tracker[username]) tracker[username] = [];
      tracker[username].push({ timestamp: log.timestamp, service });
    });

    return Object.entries(tracker)
      .map(([user, records]) => {
        const serviceCounts = records.reduce((acc: Record<string, number>, item) => {
          acc[item.service] = (acc[item.service] || 0) + 1;
          return acc;
        }, {});

        const primaryService = Object.entries(serviceCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'SYSTEM';

        return {
          user,
          count: records.length,
          records,
          primaryService
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [logs, userMap, getServiceName]);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-12 animate-fade-in">
      
      {/* Failed Attempts Modal */}
      {selectedUser && (
        <FailedAttemptsModal 
          username={selectedUser}
          records={topFailedUsers.find(u => u.user === selectedUser)?.records || []}
          onClose={() => setSelectedUser(null)}
        />
      )}

      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-500/15 dark:bg-cyan-500/10 border border-indigo-500/20 dark:border-cyan-500/20 rounded-2xl text-indigo-600 dark:text-cyan-400 shadow-xs">
            <PieChartIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">
              Log Analytics Engine
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Deep diagnostic metrics, traffic distributions, and anomaly monitoring.
            </p>
          </div>
        </div>

        {filterService && (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 rounded-xl text-xs font-bold">
              Service: {filterService}
              <button onClick={() => setServiceFilter('')} className="hover:opacity-75 ml-1">
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          </div>
        )}
      </div>

      {/* CRITICAL ALERTS BANNER */}
      {logs.some(l => String(l.level || '').toUpperCase().includes('ERR') || String(l.level || '').toUpperCase().includes('FAIL')) && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-4 text-rose-600 dark:text-rose-400 shadow-sm overflow-x-auto">
          <div className="p-2 bg-rose-500/20 rounded-xl shrink-0">
            <Bell className="w-4 h-4" />
          </div>
          <span className="text-xs font-black uppercase tracking-wider shrink-0">Active Critical Alerts:</span>
          <div className="flex items-center gap-3">
            {logs.filter(l => String(l.level || '').toUpperCase().includes('ERR') || String(l.level || '').toUpperCase().includes('FAIL')).slice(0, 3).map((l, i) => (
              <span key={i} className="text-xs font-mono bg-rose-500/10 px-3 py-1 rounded-lg border border-rose-500/10 shrink-0 truncate max-w-xs">
                {l.message}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* METRIC KPI CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Total Volume" value={stats.total_logs || logs.length} icon={<Activity className="w-4 h-4 text-blue-500"/>} trend="+12% vs last hr" />
        <MetricCard title="Unique Services" value={serviceData.length} icon={<Layers className="w-4 h-4 text-purple-500"/>} trend="All active" />
        <MetricCard title="Critical Errors" value={stats.level_distribution?.ERROR || logs.filter(l => String(l.level || '').toUpperCase().includes('ERR')).length} icon={<AlertOctagon className="w-4 h-4 text-rose-500"/>} trend="Requires review" />
        <MetricCard title="System Health" value={`${healthScore}%`} icon={<ShieldCheck className="w-4 h-4 text-emerald-500"/>} trend={healthScore > 90 ? "Optimal performance" : "Degraded state"} />
      </div>

      {/* PER-SYSTEM HEALTH MONITORING MATRIX */}
      <div className="bg-white dark:bg-[#13161F] p-6 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500"/> Subsystem Health Matrix (Per-System Breakdown)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Real-time health score calculation per individual microservice/subsystem.</p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800">
              Monitored Subsystems: {subsystemHealthMetrics.length}
            </span>
            <button
              onClick={() => setIsMatrixExpanded(!isMatrixExpanded)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 transition cursor-pointer"
            >
              {isMatrixExpanded ? (
                <>Collapse Matrix <ChevronUp className="w-3.5 h-3.5" /></>
              ) : (
                <>Expand Matrix <ChevronDown className="w-3.5 h-3.5" /></>
              )}
            </button>
          </div>
        </div>

        {/* Collapsible Subsystem Health Grid Cards Container */}
        {isMatrixExpanded && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-100 dark:border-slate-800/80 animate-fade-in">
            {subsystemHealthMetrics.length === 0 ? (
              <div className="col-span-full py-8 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                No subsystem log distribution found.
              </div>
            ) : (
              subsystemHealthMetrics.map((sub) => (
                <div 
                  key={sub.name}
                  onClick={() => setServiceFilter(sub.name)}
                  className={`p-4 rounded-xl border transition cursor-pointer flex flex-col justify-between gap-3 ${
                    filterService === sub.name 
                      ? 'bg-indigo-500/10 border-indigo-500/40 shadow-sm' 
                      : 'bg-slate-50/50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[160px]">
                      {sub.name}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1 ${
                      sub.status === 'Optimal' ? 'bg-emerald-500/10 text-emerald-500' :
                      sub.status === 'Degraded' ? 'bg-amber-500/10 text-amber-500' : 'bg-rose-500/10 text-rose-500'
                    }`}>
                      {sub.status === 'Optimal' ? <CheckCircle2 className="w-3 h-3"/> : <AlertTriangle className="w-3 h-3"/>}
                      {sub.status}
                    </span>
                  </div>

                  <div>
                    <div className="flex justify-between items-center text-xs font-semibold mb-1">
                      <span className="text-slate-400 text-[11px]">Health Score</span>
                      <span className={sub.score > 90 ? 'text-emerald-500' : sub.score > 75 ? 'text-amber-500' : 'text-rose-500'}>
                        {sub.score}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 ${
                          sub.score > 90 ? 'bg-emerald-500' : sub.score > 75 ? 'bg-amber-500' : 'bg-rose-500'
                        }`}
                        style={{ width: `${sub.score}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-slate-400 font-medium pt-1 border-t border-slate-200/60 dark:border-slate-800">
                    <span>Total: <strong className="text-slate-600 dark:text-slate-300">{sub.totalLogs}</strong></span>
                    <span>Errs: <strong className="text-rose-500">{sub.errors}</strong></span>
                    <span>Warns: <strong className="text-amber-500">{sub.warnings}</strong></span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* ANALYTICS CHARTS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Service Noise Distribution */}
        <div className="bg-white dark:bg-[#13161F] p-6 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-500"/> Noise Distribution by Service
              </h3>
              <span className="text-[10px] text-slate-400 font-medium">Click slices to filter</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">Proportional breakdown of log volume generated across subsystems.</p>
          </div>

          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={serviceData} 
                  dataKey="count" 
                  nameKey="name" 
                  cx="50%" 
                  cy="50%" 
                  outerRadius={85} 
                  innerRadius={45}
                  paddingAngle={3}
                  label={({ name, percent }: { name?: string; percent?: number }) => {
                    const pNum = percent ?? 0;
                    return pNum > 0.03 ? `${name ?? ''}` : '';
                  }}
                  onClick={(d: any) => setServiceFilter(d.name)}
                  cursor="pointer"
                >
                  {serviceData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="none" />)}
                </Pie>
                <Tooltip contentStyle={{backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', color: '#fff', fontSize: '12px'}} />
                <Legend wrapperStyle={{fontSize: '11px', paddingTop: '10px'}} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Login Performance & Failed Users Box */}
        <div className="bg-white dark:bg-[#13161F] p-6 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                <User className="w-4 h-4 text-emerald-500"/> Authentication & Login Health
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500">Secure</span>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400">Successful Logins</span>
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-1">{loginPieData[0]?.value || 0}</p>
              </div>
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400">Failed Rate</span>
                <p className="text-lg font-bold text-rose-600 dark:text-rose-400 mt-1">{loginPieData[1]?.percentage}%</p>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Top Flagged Accounts / Failed Logins</h4>
            <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
              {topFailedUsers.length === 0 ? (
                <div className="text-xs text-slate-500 py-4 text-center bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                  No failed login attempts recorded
                </div>
              ) : (
                topFailedUsers.map((item, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => setSelectedUser(item.user)} 
                    className="flex justify-between items-center p-2.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition border border-slate-100 dark:border-slate-800/60"
                  >
                    <div>
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">{item.user}</span>
                      <span className="text-[10px] text-slate-400">
                        Target Service: <strong className="text-indigo-500 dark:text-indigo-400">{item.primaryService}</strong>
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-lg">
                      {item.count} fails
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Severity Trend Line Chart */}
        <div className="bg-white dark:bg-[#13161F] p-6 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-sm lg:col-span-2">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h3 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-purple-500"/> Severity Timeline Trend
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Tracking frequency of INFO, WARN, and ERROR conditions over time.</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Filter Dropdown */}
              <div className="relative flex items-center">
                <Filter className="w-3.5 h-3.5 absolute left-3 text-slate-400 pointer-events-none" />
                <select
                  value={filterService}
                  onChange={(e) => setServiceFilter(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 outline-none cursor-pointer"
                >
                  <option value="">All Services</option>
                  {serviceData.map((svc) => (
                    <option key={svc.name} value={svc.name}>
                      {svc.name} ({svc.count})
                    </option>
                  ))}
                </select>
              </div>

              {/* Time Range Filter Buttons */}
              <div className="flex gap-1 bg-slate-50 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
                {['1h', '6h', '24h', 'all'].map((range) => (
                  <button 
                    key={range} 
                    onClick={() => setTimeRange(range)} 
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                      timeRange === range 
                        ? 'bg-purple-600 text-white shadow-sm' 
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  >
                    {range.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="h-[300px] w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} vertical={false} />
                <XAxis dataKey="time" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', color: '#fff', fontSize: '12px'}} />
                <Legend wrapperStyle={{fontSize: '11px', paddingTop: '15px'}} />
                <Line type="monotone" dataKey="INFO" stroke="#3b82f6" strokeWidth={2.5} dot={false} name="Info Logs" />
                <Line type="monotone" dataKey="WARN" stroke="#f59e0b" strokeWidth={2.5} dot={false} name="Warnings" />
                <Line type="monotone" dataKey="ERR" stroke="#ef4444" strokeWidth={2.5} dot={{r: 4, fill: '#ef4444'}} name="Errors / Failures" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}

// Helper Subcomponents
const MetricCard = ({ title, value, icon, trend }: { title: string; value: any; icon: React.ReactNode; trend: string }) => (
  <div className="bg-white dark:bg-[#13161F] p-5 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-sm flex flex-col justify-between">
    <div className="flex items-center justify-between mb-3">
      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">{title}</span>
      <div className="p-2 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800">{icon}</div>
    </div>
    <div>
      <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{value ?? 0}</p>
      <span className="text-[10px] font-medium text-slate-400 mt-1 block flex items-center gap-1">
        <TrendingUp className="w-3 h-3 text-emerald-500" /> {trend}
      </span>
    </div>
  </div>
);

const FailedAttemptsModal = ({ username, records, onClose }: { username: string; records: any[]; onClose: () => void }) => (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div className="bg-white dark:bg-[#13161F] p-6 rounded-2xl w-full max-w-md border border-slate-200 dark:border-slate-800 shadow-2xl animate-fade-in">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-rose-500/10 rounded-xl text-rose-500">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Security Audit Trail</h3>
            <p className="text-xs text-slate-500">{username}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-400 hover:text-slate-200">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="max-h-60 overflow-y-auto space-y-2 pr-1 font-mono text-xs">
        {records.map((rec, i) => (
          <div key={i} className="flex justify-between items-center p-2.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300">
            <span>{new Date(rec.timestamp).toLocaleString()}</span>
            <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-lg text-[10px] font-sans font-bold">
              {rec.service}
            </span>
          </div>
        ))}
      </div>
    </div>
  </div>
);