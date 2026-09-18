import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { 
  Download, AlertCircle, 
  ShieldAlert, Info, Bug, Search, X, ChevronLeft, ChevronRight, RotateCcw, FileText, FileSearch, ChevronDown
} from 'lucide-react';
import { LoggingService } from '../api/services';

// --- Debounce Custom Hook ---
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

// --- Custom Tailwind Dropdown Component ---
function CustomDropdown({ 
  value, 
  onChange, 
  options, 
  placeholder 
}: { 
  value: string; 
  onChange: (val: string) => void; 
  options: { label: string; value: string }[]; 
  placeholder: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value);
  const selectedLabel = selectedOption ? selectedOption.label : placeholder;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between gap-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 px-3.5 py-2 rounded-xl text-xs text-slate-700 dark:text-slate-300 outline-none font-medium min-w-[140px] hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-2xs"
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-52 max-h-60 overflow-y-auto bg-white dark:bg-[#181b26] border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 p-1 space-y-0.5">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors truncate ${
                value === opt.value
                  ? 'bg-indigo-500/10 text-indigo-600 dark:text-cyan-400 font-semibold'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Logs() {
  // Data States
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Pagination States
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(50);
  const [total, setTotal] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 400);

  const [selectedUser, setSelectedUser] = useState("ALL");
  const [selectedService, setSelectedService] = useState("ALL");
  const [selectedLevel, setSelectedLevel] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Master accumulation pools & service-to-user mappings
  const [allKnownServices, setAllKnownServices] = useState<string[]>([]);
  const [serviceUserMap, setServiceUserMap] = useState<Record<string, Set<string>>>({});

  // Modal & Loading States
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  
  const exportAbortControllerRef = useRef<AbortController | null>(null);

  // --- Robust Local Time Formatter Helper ---
  const formatPhilippineTime = (dateString: string) => {
    if (!dateString) return '';
    
    const parts = dateString.split(/[- :T]/);
    if (parts.length >= 6) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; 
      const day = parseInt(parts[2], 10);
      const hour = parseInt(parts[3], 10);
      const minute = parseInt(parts[4], 10);
      const second = parseInt(parts[5], 10);

      const date = new Date(year, month, day, hour, minute, second);
      if (isNaN(date.getTime())) return dateString;

      return date.toLocaleString('en-US', {
        month: 'numeric',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    }

    return dateString;
  };

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedUser("ALL");
    setSelectedService("ALL");
    setSelectedLevel("ALL");
    setStartDate("");
    setEndDate("");
    setPage(1);
  };

  const getServiceName = (log: any) => 
    log.service_name || log.service || log.app_name || "SYSTEM";

  // Accumulate services and map valid non-system user IDs dynamically
  useEffect(() => {
    if (logs && logs.length > 0) {
      setAllKnownServices(prev => {
        const set = new Set([...prev, ...logs.map(l => getServiceName(l)).filter(Boolean)]);
        return Array.from(set);
      });
      
      setServiceUserMap(prev => {
        const updated = { ...prev };
        logs.forEach(log => {
          const sName = getServiceName(log);
          const uId = log.user_id ? String(log.user_id).trim() : null;
          
          if (sName) {
            if (!updated[sName]) updated[sName] = new Set();
            // Only add actual specific user IDs (exclude null / SYSTEM strings)
            if (uId && uId.toUpperCase() !== 'SYSTEM') {
              updated[sName].add(uId);
            }
          }
        });
        return updated;
      });
    }
  }, [logs]);

  // Derive available specific user IDs based on selected service
  const availableUsersForService = useMemo(() => {
    const userSet = new Set<string>();

    if (selectedService === "ALL") {
      Object.values(serviceUserMap).forEach(sSet => {
        sSet.forEach(u => userSet.add(u));
      });
    } else {
      const targetSet = serviceUserMap[selectedService];
      if (targetSet) {
        targetSet.forEach(u => userSet.add(u));
      }
    }
    return Array.from(userSet);
  }, [selectedService, serviceUserMap]);

  const resolveUserDisplay = (userId: string) => {
    if (userId === 'SYSTEM') return 'SYSTEM';
    return `User ${userId}`;
  };

  // Reset user filter if the selected user does not belong to the newly selected service
  useEffect(() => {
    if (selectedUser !== "ALL" && selectedUser !== "SYSTEM" && !availableUsersForService.includes(selectedUser)) {
      setSelectedUser("ALL");
    }
  }, [selectedService, availableUsersForService, selectedUser]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearchQuery, selectedUser, selectedService, selectedLevel, startDate, endDate]);

  // Primary API Data Fetcher
  const fetchData = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      let activeSearch = debouncedSearchQuery.trim();
      let activeLevel: string | undefined = selectedLevel !== "ALL" ? selectedLevel : undefined;
      let activeService: string | undefined = selectedService !== "ALL" ? selectedService : undefined;
      
      // If selectedUser is SYSTEM, we don't pass user_id to backend so we can fetch all and filter both null and 'SYSTEM' client-side
      let activeUser: string | undefined = (selectedUser !== "ALL" && selectedUser !== "SYSTEM") ? selectedUser : undefined;

      const levelMatch = activeSearch.match(/level:([^\s]+)/i);
      const serviceMatch = activeSearch.match(/service:([^\s]+)/i);
      const userMatch = activeSearch.match(/user:([^\s]+)/i);

      if (levelMatch) {
        activeLevel = levelMatch[1].toUpperCase();
        activeSearch = activeSearch.replace(levelMatch[0], '').trim();
      }
      if (serviceMatch) {
        activeService = serviceMatch[1];
        activeSearch = activeSearch.replace(serviceMatch[0], '').trim();
      }
      if (userMatch) {
        const val = userMatch[1];
        activeUser = val.toUpperCase() === 'SYSTEM' ? undefined : val;
        activeSearch = activeSearch.replace(userMatch[0], '').trim();
      }

      const queryParams: Record<string, any> = {
        page,
        limit,
        level: activeLevel ?? undefined,
        service: activeService ?? undefined,
        user_id: activeUser ?? undefined,
        search: activeSearch || undefined,
        startDate: startDate ? new Date(`${startDate}T00:00:00`).toISOString() : undefined,
        endDate: endDate ? new Date(`${endDate}T23:59:59.999`).toISOString() : undefined,
      };

      const logRes = await LoggingService.getLogs(queryParams);

      let fetchedLogs: any[] = [];
      let totalItems = 0;

      if (Array.isArray(logRes)) {
        fetchedLogs = logRes;
        totalItems = logRes.length;
      } else if (logRes && typeof logRes === 'object') {
        const responseAny = logRes as any;
        fetchedLogs = responseAny.data || responseAny.items || [];
        totalItems = responseAny.total ?? fetchedLogs.length;
      }

      // If user selected "SYSTEM", filter client-side to capture logs where user_id is null, undefined, empty, or literal "SYSTEM"
      if (selectedUser === 'SYSTEM') {
        fetchedLogs = fetchedLogs.filter(log => {
          const uId = log.user_id;
          return uId === null || uId === undefined || String(uId).trim() === '' || String(uId).toUpperCase() === 'SYSTEM';
        });
        totalItems = fetchedLogs.length;
      }

      setLogs(fetchedLogs);
      setTotal(totalItems);
      setTotalPages(Math.ceil(totalItems / limit) || 1);

      await LoggingService.getSummary().catch(() => {});
    } catch (e) {
      console.error("Error syncing logging data:", e);
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [page, limit, selectedLevel, selectedService, selectedUser, debouncedSearchQuery, startDate, endDate]);

  useEffect(() => {
    fetchData(true);
  }, [fetchData]);

  useEffect(() => {
    const interval = setInterval(() => { 
      fetchData(false); 
    }, 8000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const exportToPDF = async () => {
    exportAbortControllerRef.current = new AbortController();

    try {
      setIsDownloading(true);

      let activeSearch = debouncedSearchQuery.trim();
      let activeLevel: string | undefined = selectedLevel !== "ALL" ? selectedLevel : undefined;
      let activeService: string | undefined = selectedService !== "ALL" ? selectedService : undefined;
      let activeUser: string | undefined = (selectedUser !== "ALL" && selectedUser !== "SYSTEM") ? selectedUser : undefined;

      const levelMatch = activeSearch.match(/level:([^\s]+)/i);
      const serviceMatch = activeSearch.match(/service:([^\s]+)/i);
      const userMatch = activeSearch.match(/user:([^\s]+)/i);

      if (levelMatch) {
        activeLevel = levelMatch[1].toUpperCase();
        activeSearch = activeSearch.replace(levelMatch[0], '').trim();
      }
      if (serviceMatch) {
        activeService = serviceMatch[1];
        activeSearch = activeSearch.replace(serviceMatch[0], '').trim();
      }
      if (userMatch) {
        const val = userMatch[1];
        activeUser = val.toUpperCase() === 'SYSTEM' ? undefined : val;
        activeSearch = activeSearch.replace(userMatch[0], '').trim();
      }

      const allQueryParams: Record<string, any> = {
        page: 1,
        limit: 10000, 
        level: activeLevel ?? undefined,
        service: activeService ?? undefined,
        user_id: activeUser ?? undefined,
        search: activeSearch || undefined,
        startDate: startDate ? new Date(`${startDate}T00:00:00`).toISOString() : undefined,
        endDate: endDate ? new Date(`${endDate}T23:59:59.999`).toISOString() : undefined,
      };

      const completeLogRes = await LoggingService.getLogs(allQueryParams);
      
      let allFilteredLogs = logs; 
      if (Array.isArray(completeLogRes)) {
        allFilteredLogs = completeLogRes;
      } else if (completeLogRes && typeof completeLogRes === 'object') {
        const responseAny = completeLogRes as any;
        allFilteredLogs = responseAny.data || responseAny.items || [];
      }

      if (selectedUser === 'SYSTEM') {
        allFilteredLogs = allFilteredLogs.filter(log => {
          const uId = log.user_id;
          return uId === null || uId === undefined || String(uId).trim() === '' || String(uId).toUpperCase() === 'SYSTEM';
        });
      }

      const response = await fetch('http://localhost:8000/api/v1/logging_app/generate-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          logs: allFilteredLogs,
          model: 'llama3.2',
          focus: 'comprehensive_system_log_analyzer_report'
        }),
        signal: exportAbortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error("Failed to generate the server-side PDF report.");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `system_log_analyzer_report_${new Date().toISOString().slice(0, 10)}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      setShowExportModal(false);
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log("PDF report generation was cancelled by the user.");
      } else {
        console.error("Error downloading report:", error);
        alert("An error occurred while building the report PDF on the server.");
      }
    } finally {
      setIsDownloading(false);
      exportAbortControllerRef.current = null;
    }
  };

  const handleCancelExport = () => {
    if (exportAbortControllerRef.current) {
      exportAbortControllerRef.current.abort();
    }
    setIsDownloading(false);
    setShowExportModal(false);
  };

  const getLevelBadge = (level: string) => {
    const lvl = level?.toUpperCase();
    switch (lvl) {
      case 'ERROR':
      case 'FATAL':
        return <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold bg-rose-500/10 border border-rose-500/20 text-rose-500 dark:text-rose-400"><ShieldAlert size={12}/> {lvl}</span>;
      case 'WARN':
      case 'WARNING':
        return <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400"><AlertCircle size={12}/> {lvl}</span>;
      case 'DEBUG':
        return <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400"><Bug size={12}/> {lvl}</span>;
      default:
        return <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400"><Info size={12}/> {lvl || 'INFO'}</span>;
    }
  };

  const serviceOptions = [
    { label: "All Services", value: "ALL" },
    ...allKnownServices.map(s => ({ label: s, value: s }))
  ];

  const levelOptions = [
    { label: "All Levels", value: "ALL" },
    { label: "INFO", value: "INFO" },
    { label: "WARN", value: "WARN" },
    { label: "ERROR", value: "ERROR" },
    { label: "DEBUG", value: "DEBUG" }
  ];

  const userOptions = [
    { label: "All Users", value: "ALL" },
    { label: "SYSTEM", value: "SYSTEM" },
    ...availableUsersForService.map(id => ({ label: resolveUserDisplay(id), value: id }))
  ];

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-12 animate-fade-in">
      
      <style>{`
        input[type="date"]::-webkit-calendar-picker-indicator {
          filter: invert(0.8) hue-rotate(180deg);
          cursor: pointer;
        }
      `}</style>

      {/* HEADER HERO SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-500/10 dark:bg-cyan-500/10 border border-indigo-500/20 dark:border-cyan-500/20 rounded-2xl text-indigo-600 dark:text-cyan-400 shadow-xs">
            <FileSearch size={24} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">
              Centralized Logging System
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Filter, query, and analyze events from all integrated systems in real-time.
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2.5">
          <button 
            onClick={() => setShowExportModal(true)} 
            disabled={logs.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold transition-all shadow-sm"
          >
            <Download className="w-4 h-4" /> Export Report
          </button>
        </div>
      </div>

      {/* SEARCH & FILTERS CONTAINER */}
      <div className="bg-white dark:bg-[#13161F] p-5 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-sm space-y-4">
        
        <div className="relative flex items-center bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 focus-within:ring-2 focus-within:ring-indigo-500 dark:focus-within:ring-cyan-500 transition-all">
          <Search className="w-4 h-4 text-slate-400 shrink-0 mr-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder='Search logs (e.g. "timeout", "level:warn", "service:auth", "user:102")...'
            className="w-full bg-transparent outline-none text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 font-mono"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="text-slate-400 hover:text-slate-200 p-1">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/60">
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            
            <CustomDropdown
              value={selectedService}
              onChange={setSelectedService}
              options={serviceOptions}
              placeholder="All Services"
            />

            <CustomDropdown
              value={selectedLevel}
              onChange={setSelectedLevel}
              options={levelOptions}
              placeholder="All Levels"
            />

            <CustomDropdown
              value={selectedUser}
              onChange={setSelectedUser}
              options={userOptions}
              placeholder="All Users"
            />

            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/60 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-2xs">
              <input 
                type="date" 
                aria-label="Start date"
                className="bg-transparent text-xs text-slate-700 dark:text-slate-200 outline-none cursor-pointer font-medium placeholder:text-slate-400 w-[110px]" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)} 
              />

              <span className="text-slate-400 text-xs px-1">to</span>

              <input 
                type="date" 
                aria-label="End date"
                className="bg-transparent text-xs text-slate-700 dark:text-slate-200 outline-none cursor-pointer font-medium placeholder:text-slate-400 w-[110px]" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)} 
              />

              {(startDate || endDate) && (
                <button 
                  onClick={() => { setStartDate(""); setEndDate(""); }}
                  className="text-slate-400 hover:text-rose-500 ml-1 p-0.5 rounded-md transition-colors"
                  title="Clear dates"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <button 
            onClick={resetFilters} 
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-500 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors ml-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset Filters
          </button>
        </div>
      </div>

      {/* LOGS CONSOLE VIEW TABLE CONTAINER */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#13161F] shadow-sm overflow-hidden">
        <div className="px-6 py-3.5 border-b border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30 flex justify-between items-center text-xs text-slate-500 dark:text-slate-400">
          <span>Showing <strong className="text-slate-800 dark:text-slate-200">{logs.length}</strong> of <strong className="text-slate-800 dark:text-slate-200">{total}</strong> entries</span>
          <span className="flex items-center gap-1.5 text-emerald-500 font-bold uppercase tracking-wider text-[10px]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Live Polling Active
          </span>
        </div>

        <div className="hidden md:flex items-center gap-4 px-7 py-3 bg-slate-100/70 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800/80 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">
          <span className="w-36 shrink-0">Timestamp</span>
          <span className="w-24 shrink-0">Level</span>
          <span className="w-32 shrink-0">Service Name</span>
          <span className="w-28 shrink-0">User ID</span>
          <span className="flex-1">Log Message</span>
        </div>

        <div className="p-4 font-mono text-xs bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-200 overflow-x-auto max-h-[600px] overflow-y-auto transition-colors">
          {loading ? (
            <div className="text-center py-20 text-slate-500 animate-pulse">Loading system logs...</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-20 text-slate-600 dark:text-slate-500">No logs match the selected filter criteria.</div>
          ) : (
            logs.map((log: any, i: number) => {
              const isError = log.level?.toUpperCase() === 'ERROR' || log.level?.toUpperCase() === 'FATAL';
              const isWarning = log.level?.toUpperCase() === 'WARN' || log.level?.toUpperCase() === 'WARNING';
              
              return (
                <div 
                  key={log.id || i} 
                  className={`py-2 px-3 my-0.5 rounded-lg border-b border-slate-200/50 dark:border-white/5 flex items-center gap-4 transition-colors border-l-2 ${
                    isError 
                      ? "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500" 
                      : isWarning 
                      ? "bg-amber-500/10 text-amber-800 dark:text-amber-200 border-amber-500" 
                      : "bg-white dark:bg-slate-900/40 text-slate-700 dark:text-cyan-300/90 border-slate-300 dark:border-cyan-500/40 hover:bg-slate-100 dark:hover:bg-slate-900 shadow-2xs dark:shadow-none"
                  }`}
                >
                  <span className="opacity-60 dark:opacity-40 text-slate-500 dark:text-slate-400 w-36 shrink-0 text-[11px]">
                    {formatPhilippineTime(log.timestamp)}
                  </span>
                  <span className="w-24 shrink-0">{getLevelBadge(log.level)}</span>
                  
                  <span className="text-slate-700 dark:text-slate-300 w-32 shrink-0 truncate">
                    {getServiceName(log)}
                  </span>
                  
                  <span className="text-indigo-600 dark:text-cyan-400/80 w-28 shrink-0 truncate">
                    {(!log.user_id || String(log.user_id).toUpperCase() === 'SYSTEM') ? "SYSTEM" : log.user_id}
                  </span>

                  <span className="text-slate-800 dark:text-slate-200 break-all">{log.message}</span>
                </div>
              );
            })
          )}
        </div>

        <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30 flex flex-wrap justify-between items-center text-xs text-slate-500 dark:text-slate-400 gap-4">
          <div className="flex items-center gap-2">
            <span>Per page:</span>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 py-1 rounded-lg text-xs text-slate-700 dark:text-slate-300 outline-none font-medium"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={250}>250</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(p - 1, 1))}
              disabled={page <= 1 || loading}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="font-semibold text-slate-700 dark:text-slate-300 px-2">
              Page {page} of {totalPages}
            </span>

            <button
              onClick={() => setPage(p => Math.min(p + 1, totalPages))}
              disabled={page >= totalPages || loading}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* CONFIRMATION MODAL FOR EXPORTING PDF */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#13161F] border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl transition-all">
            <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400 mb-4">
              <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">System Log Analyzer Report</h3>
                <p className="text-xs text-slate-500">Health & Error Analysis</p>
              </div>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
              Generate a comprehensive analyzer report summarizing system health, error trends, user actions, and actionable fix tips from the current logs?
            </p>

            <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 mb-6 text-xs space-y-2 text-slate-600 dark:text-slate-400 font-mono">
              <div className="flex justify-between">
                <span>Dataset Size:</span>
                <strong className="text-slate-800 dark:text-slate-200">{total} entries (Full Filtered Set)</strong>
              </div>
              <div className="flex justify-between">
                <span>Service Filter:</span>
                <strong className="text-slate-800 dark:text-slate-200">{selectedService}</strong>
              </div>
              <div className="flex justify-between">
                <span>Log Level:</span>
                <strong className="text-slate-800 dark:text-slate-200">{selectedLevel}</strong>
              </div>
              <div className="flex justify-between">
                <span>User Filter:</span>
                <strong className="text-slate-800 dark:text-slate-200">{selectedUser === 'ALL' ? 'All Users' : resolveUserDisplay(selectedUser)}</strong>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={handleCancelExport}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={exportToPDF}
                disabled={isDownloading}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-xl text-xs font-bold transition-all shadow-md disabled:cursor-not-allowed"
              >
                {isDownloading ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Analyzing All Logs & Generating Report...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" /> Download Analyzer Report
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}