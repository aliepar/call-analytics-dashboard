"use client";
import React, { useState, useEffect } from "react";
import { 
  Phone, DollarSign, CheckCircle2, Clock, ArrowUpLeft, 
  ArrowUpRight, Loader2, Search, ArrowUpDown, Calendar, AlertTriangle 
} from "lucide-react";
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, 
  CartesianGrid, Tooltip, PieChart, Pie, Cell, BarChart, Bar, LineChart, Line 
} from "recharts";

// 1. IMPORT THE JSON DATABASE (Loads your external file records)
import ENDPOINT_LIVE_DATA from "./mockData.json";

interface CDRRecord {
  id: string;
  callerName: string;
  callerNumber: string;
  receiverNumber: string;
  city: string;
  callDirection: boolean; 
  callStatus: boolean;    
  callDuration: number;   
  callCost: string;       
  callStartTime: string;  
  callEndTime: string;    
}

type SortField = "callDuration" | "callCost" | "callStartTime" | null;
type SortOrder = "asc" | "desc";

export default function Dashboard() {
  const [records, setRecords] = useState<CDRRecord[]>([]);
  const [filterDirection, setFilterDirection] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortField, setSortField] = useState<SortField>("callStartTime");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const rawData = ENDPOINT_LIVE_DATA as CDRRecord[];
      const enhancedRecords = rawData.map((record, index) => ({
        ...record,
        callDirection: index % 2 === 0, 
        callStatus: index % 3 !== 0     
      }));
      setRecords(enhancedRecords);
    } catch (err) {
      setError("Data compilation anomaly encountered.");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };
  const processedRecords = records
    .filter(record => {
      if (filterDirection === "inbound") return record.callDirection === true;
      if (filterDirection === "outbound") return record.callDirection === false;
      return true;
    })
    .filter(record => {
      const query = searchQuery.toLowerCase().trim();
      if (!query) return true;
      return (
        record.callerName?.toLowerCase().includes(query) ||
        record.callerNumber?.includes(query) ||
        record.receiverNumber?.includes(query) ||
        record.city?.toLowerCase().includes(query)
      );
    });

  if (sortField) {
    processedRecords.sort((a, b) => {
      if (sortField === "callStartTime") {
        return sortOrder === "asc" 
          ? new Date(a.callStartTime).getTime() - new Date(b.callStartTime).getTime()
          : new Date(b.callStartTime).getTime() - new Date(a.callStartTime).getTime();
      }
      const valA = sortField === "callCost" ? parseFloat(a.callCost || "0") : a.callDuration;
      const valB = sortField === "callCost" ? parseFloat(b.callCost || "0") : b.callDuration;
      return sortOrder === "asc" ? valA - valB : valB - valA;
    });
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 space-y-4">
        <div className="p-4 bg-rose-50 text-rose-700 rounded-xl max-w-md text-center border border-rose-100 shadow-sm">
          <AlertTriangle className="h-6 w-6 text-rose-500 mx-auto mb-2" />
          <p className="font-semibold">Endpoint Data Error</p>
          <p className="text-sm text-rose-600/90 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  // KPI Metric Calculators
  const totalCalls = processedRecords.length;
  const totalCost = processedRecords.reduce((acc, curr) => acc + parseFloat(curr.callCost || "0"), 0);
  const avgDuration = totalCalls > 0 ? processedRecords.reduce((acc, curr) => acc + curr.callDuration, 0) / totalCalls : 0;
  const connectedCount = processedRecords.filter(r => r.callStatus === true).length;
  const failedCount = processedRecords.filter(r => r.callStatus === false).length;

  // Call Duration Aggregators
  const longestCall = totalCalls > 0 ? Math.max(...processedRecords.map(r => r.callDuration || 0)) : 0;
  const shortestCall = totalCalls > 0 ? Math.min(...processedRecords.map(r => r.callDuration || 0)) : 0;

  // City Metrics Mapping Engines
  const cityMetricsMap: { [key: string]: { city: string; totalDuration: number; totalCost: number; callCount: number } } = {};
  processedRecords.forEach(record => {
    const city = record.city || "Unknown";
    if (!cityMetricsMap[city]) {
      cityMetricsMap[city] = { city, totalDuration: 0, totalCost: 0, callCount: 0 };
    }
    cityMetricsMap[city].totalDuration += record.callDuration || 0;
    cityMetricsMap[city].totalCost += parseFloat(record.callCost || "0");
    cityMetricsMap[city].callCount += 1;
  });

  const cityDurationBarData = Object.values(cityMetricsMap)
    .map(c => ({ city: c.city.slice(0, 10), avgDuration: Math.round((c.totalDuration / c.callCount) * 10) / 10 }))
    .sort((a, b) => b.avgDuration - a.avgDuration).slice(0, 5);

  const cityCostBarData = Object.values(cityMetricsMap)
    .map(c => ({ city: c.city.slice(0, 10), totalCost: Math.round(c.totalCost * 100) / 100 }))
    .sort((a, b) => b.totalCost - a.totalCost).slice(0, 5);

  const cityVolumePieData = Object.values(cityMetricsMap)
    .map(c => ({ name: c.city.slice(0, 12), value: c.callCount }))
    .sort((a, b) => b.value - a.value).slice(0, 5);

  // Timeline Ingestion Parsing
  const hourlyDataMap: { [key: string]: { hour: string; calls: number } } = {};
  processedRecords.forEach(record => {
    const date = new Date(record.callStartTime);
    const hourLabel = isNaN(date.getTime()) ? "00:00" : `${String(date.getHours()).padStart(2, '0')}:00`;
    if (!hourlyDataMap[hourLabel]) hourlyDataMap[hourLabel] = { hour: hourLabel, calls: 0 };
    hourlyDataMap[hourLabel].calls += 1;
  });

  const trendChartData = Object.values(hourlyDataMap).sort((a, b) => a.hour.localeCompare(b.hour));
  const PIE_THEME_COLORS = ["#3b82f6", "#6366f1", "#10b981", "#f59e0b", "#ec4899"];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 space-y-4">
        <Loader2 className="h-8 w-8 text-slate-900 animate-spin" />
        <p className="text-slate-500 font-medium text-sm">Initializing analytics components...</p>
      </div>
    );
  }
  return (
    <div className="p-8 space-y-8 bg-slate-50 min-h-screen text-slate-900 font-sans">
      {/* Dashboard Control Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Call Analytics Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">Real-time Call Detail Record.</p>
        </div>
        
        <div className="flex items-center space-x-2 bg-white p-1 rounded-xl shadow-sm border border-slate-200 self-start">
          <button onClick={() => setFilterDirection("all")} className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${filterDirection === "all" ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"}`}>All Traffic</button>
          <button onClick={() => setFilterDirection("inbound")} className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${filterDirection === "inbound" ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"}`}>Inbound</button>
          <button onClick={() => setFilterDirection("outbound")} className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${filterDirection === "outbound" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"}`}>Outbound</button>
        </div>
      </div>

      {/* Card Summary Rows */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1"><p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Calls</p><p className="text-2xl font-bold text-slate-900">{totalCalls}</p></div>
          <div className="p-2.5 bg-slate-100 rounded-xl text-slate-700"><Phone className="h-4 w-4" /></div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1"><p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Cost</p><p className="text-2xl font-bold text-slate-900">${totalCost.toFixed(2)}</p></div>
          <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600"><DollarSign className="h-4 w-4" /></div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1"><p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Avg Duration</p><p className="text-2xl font-bold text-slate-900">{avgDuration.toFixed(1)} <span className="text-xs font-normal text-slate-400">sec</span></p></div>
          <div className="p-2.5 bg-amber-50 rounded-xl text-amber-600"><Clock className="h-4 w-4" /></div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1"><p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Successful</p><p className="text-2xl font-bold text-emerald-600">{connectedCount}</p></div>
          <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600"><CheckCircle2 className="h-4 w-4" /></div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1"><p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Failed Calls</p><p className="text-2xl font-bold text-rose-600">{failedCount}</p></div>
          <div className="p-2.5 bg-rose-50 rounded-xl text-rose-600"><CheckCircle2 className="h-4 w-4" /></div>
        </div>
      </div>

      {/* Analytics Chart Elements Group */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-base font-bold text-slate-900">Call Duration Analytics</h3>
            <p>Displays call duration insight by City</p>
            <div className="text-xs font-medium text-slate-400">Max: {longestCall}s | Min: {shortestCall}s</div>
          </div>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cityDurationBarData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="city" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", fontSize: "12px" }} />
                <Bar dataKey="avgDuration" name="Avg Duration (secs)" fill="#6366f1" radius={6} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 mb-4">Financial Cost Expenditure</h3>
          <p>Display Total Costs per City</p>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cityCostBarData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="city" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip formatter={(value) => [`$${value}`, "Total Spend"]} contentStyle={{ backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", fontSize: "12px" }} />
                <Bar dataKey="totalCost" name="Total Spend ($)" fill="#10b981" radius={6} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm md:col-span-2">
          <h3 className="text-base font-bold text-slate-900 mb-4">Call Activity Timeline </h3>
          <p>Dispalys Call Activity Hourly</p>
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendChartData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="hour" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", fontSize: "12px" }} />
                <Line type="monotone" dataKey="calls" name="Calls Flow Frequency" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <h3 className="text-base font-bold text-slate-900 mb-2">Calls Distribution</h3>
          <p>Displays totall call by City </p>
          <div className="h-40 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={cityVolumePieData} cx="50%" cy="50%" innerRadius={0} outerRadius={60} dataKey="value" label={({ name }) => name}>
                  {cityVolumePieData.map((entry, index) => <Cell key={`cell-${index}`} fill={PIE_THEME_COLORS[index % PIE_THEME_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ fontSize: "12px", borderRadius: "8px" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Call Logs Structured Table Component */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div><h2 className="text-lg font-bold text-slate-900">Recent Call Logs Records</h2><p className="text-xs text-slate-400 mt-0.5">Filter, search and review individual call details logs.</p></div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input type="text" placeholder="Search name, phone number, or city..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all text-slate-800" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="px-6 py-4">Caller Name / Number</th><th className="px-6 py-4">Receiver Number</th><th className="px-6 py-4">City</th><th className="px-6 py-4">Direction/Status</th>
                <th className="px-6 py-4 text-right cursor-pointer hover:bg-slate-100/50 transition-colors select-none" onClick={() => handleSort("callDuration")}><div className="flex items-center justify-end space-x-1"><span>Duration</span><ArrowUpDown className="h-3 w-3 text-slate-400" /></div></th>
                <th className="px-6 py-4 text-right cursor-pointer hover:bg-slate-100/50 transition-colors select-none" onClick={() => handleSort("callCost")}><div className="flex items-center justify-end space-x-1"><span>Cost</span><ArrowUpDown className="h-3 w-3 text-slate-400" /></div></th>
                <th className="px-6 py-4 text-right cursor-pointer hover:bg-slate-100/50 transition-colors select-none" onClick={() => handleSort("callStartTime")}><div className="flex items-center justify-end space-x-1"><span>Start Time</span><ArrowUpDown className="h-3 w-3 text-slate-400" /></div></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {processedRecords.length > 0 ? (processedRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4"><div className="font-semibold text-slate-900">{record.callerName}</div><div className="text-xs text-slate-400 mt-0.5">{record.callerNumber}</div></td>
                    <td className="px-6 py-4"><div className="font-medium text-slate-800">{record.receiverNumber}</div></td>
                    <td className="px-6 py-4"><div className="text-slate-600 font-medium">{record.city}</div></td>
                    <td className="px-6 py-4 flex flex-col space-y-1 items-start">
                      {record.callDirection ? (<span className="inline-flex items-center px-2 py-0.5 text-xs font-medium text-blue-700 bg-blue-50 rounded">Inbound</span>) : (<span className="inline-flex items-center px-2 py-0.5 text-xs font-medium text-indigo-700 bg-indigo-50 rounded">Outbound</span>)}
                      {record.callStatus ? (<span className="inline-flex items-center px-2 py-0.5 text-xs font-medium text-emerald-700 bg-emerald-50 rounded">Connected</span>) : (<span className="inline-flex items-center px-2 py-0.5 text-xs font-medium text-rose-700 bg-rose-50 rounded">Failed</span>)}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-slate-900">{record.callDuration}s</td>
                    <td className="px-6 py-4 text-right font-semibold text-emerald-600">${parseFloat(record.callCost || "0").toFixed(2)}</td>
                    <td className="px-6 py-4 text-right text-xs text-slate-500 font-medium">{new Date(record.callStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                  </tr>
                ))) : (<tr><td colSpan={7} className="px-6 py-12 text-center text-sm text-slate-400 bg-slate-50/20">No matching call logs match your configurations filters parameters.</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
