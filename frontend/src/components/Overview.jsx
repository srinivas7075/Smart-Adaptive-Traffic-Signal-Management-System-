import React, { useEffect, useRef, useState } from 'react';
import Chart from 'chart.js/auto';
import { ArrowUpRight, ArrowDownRight, Activity, Users, AlertTriangle, Clock, Car, Crosshair } from 'lucide-react';
import axios from 'axios';

const Overview = () => {
    const chartRef = useRef(null);
    const trafficChartRef = useRef(null);

    // Dynamic State
    const [kpi, setKpi] = useState({
        total_violations_today: 0,
        active_accidents: 0,
        parking_occupancy_percent: 0,
        ai_model_accuracy: 94.5,
        detection_latency_ms: 45,
        system_status: "Connecting..."
    });
    const [alerts, setAlerts] = useState([]);

    useEffect(() => {
        // Fetch KPIs
        const fetchKpi = async () => {
            try {
                // Ensure auth token is sent if needed, using interceptor or defaults if configured
                const res = await axios.get('http://127.0.0.1:8080/api/v1/system/kpi');
                setKpi(res.data);
            } catch (err) {
                console.error("Failed to fetch KPIs:", err);
                setKpi(prev => ({ ...prev, system_status: "Offline" }));
            }
        };

        fetchKpi();
        const kpiInterval = setInterval(fetchKpi, 5000); // Polling fallback for KPI numbers

        // WebSocket for Live Alerts
        const ws = new WebSocket('ws://localhost:8000/ws/v1/alerts');
        ws.onopen = () => console.log('WebSocket Connected for Alerts');
        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

                let newAlert = { id: Date.now(), time: timestamp, type: message.type };

                if (message.type === 'VIOLATION_ALERT') {
                    newAlert.title = `${message.data.violation_type} Detected`;
                    newAlert.desc = `Lane: ${message.data.lane} • Plate: ${message.data.plate}`;
                    newAlert.color = "text-yellow-500";
                    newAlert.bg = "bg-yellow-500/10";
                    newAlert.border = "border-yellow-500/20";
                } else if (message.type === 'ACCIDENT_ALERT') {
                    newAlert.title = `ACCIDENT REPORTED`;
                    newAlert.desc = `Lane: ${message.data.lane} • Severity: ${message.data.severity}`;
                    newAlert.color = "text-red-500";
                    newAlert.bg = "bg-red-500/10";
                    newAlert.border = "border-red-500/20";
                }

                setAlerts(prev => [newAlert, ...prev].slice(0, 50)); // Keep last 50
            } catch (e) {
                console.error('Error parsing WS message', e);
            }
        };
        ws.onerror = (e) => console.error('WebSocket Error', e);

        // --- Charts Implementation (Mock visual data for now, connected to live streams in advanced Phase) ---
        // 1. Violations Chart
        const ctx = document.getElementById('speedChart');
        if (ctx) {
            const context = ctx.getContext('2d');
            if (chartRef.current) chartRef.current.destroy();

            const gradient = context.createLinearGradient(0, 0, 0, 400);
            gradient.addColorStop(0, 'rgba(248, 113, 113, 0.8)');
            gradient.addColorStop(1, 'rgba(239, 68, 68, 0.2)');

            chartRef.current = new Chart(context, {
                type: 'bar',
                data: {
                    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                    datasets: [{
                        label: 'Violations',
                        data: [12, 19, 3, 5, 2, 3, 10], // Static for overview
                        backgroundColor: gradient,
                        borderRadius: 8,
                        borderWidth: 0,
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { display: false },
                        x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
                    }
                }
            });
        }

        // 2. Traffic Flow Chart
        const ctx2 = document.getElementById('trafficChart');
        if (ctx2) {
            const context2 = ctx2.getContext('2d');
            if (trafficChartRef.current) trafficChartRef.current.destroy();

            const gradientLine = context2.createLinearGradient(0, 0, 0, 400);
            gradientLine.addColorStop(0, 'rgba(56, 189, 248, 0.5)');
            gradientLine.addColorStop(1, 'rgba(56, 189, 248, 0.0)');

            trafficChartRef.current = new Chart(context2, {
                type: 'line',
                data: {
                    labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
                    datasets: [{
                        label: 'Traffic Volume',
                        data: [30, 20, 80, 75, 95, 60],
                        borderColor: '#38bdf8',
                        backgroundColor: gradientLine,
                        tension: 0.4,
                        fill: true,
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { display: false },
                        x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
                    }
                }
            });
        }

        return () => {
            clearInterval(kpiInterval);
            ws.close();
            if (chartRef.current) chartRef.current.destroy();
            if (trafficChartRef.current) trafficChartRef.current.destroy();
        };
    }, []);

    return (
        <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
            {/* Header Stats */}
            <div className="grid grid-cols-4 gap-6 mb-8">
                <StatCard
                    title="Active Accidents"
                    value={kpi.active_accidents.toString()}
                    icon={AlertTriangle}
                    trend={kpi.active_accidents > 0 ? "+1" : "0"}
                    color={kpi.active_accidents > 0 ? "text-red-400" : "text-green-400"}
                    detail={kpi.active_accidents > 0 ? "Requires Immediate Action" : "All Clear"}
                    bgGradient={kpi.active_accidents > 0 ? "from-red-500/10 to-orange-500/10" : "from-green-500/10 to-emerald-500/10"}
                    trendNegative={kpi.active_accidents === 0}
                />
                <StatCard
                    title="Daily Violations"
                    value={kpi.total_violations_today.toString()}
                    icon={Crosshair}
                    trend="Live"
                    color="text-yellow-400"
                    detail="Logged via ANPR Pipeline"
                    bgGradient="from-yellow-500/10 to-orange-500/10"
                />
                <StatCard
                    title="Avg Parking Load"
                    value={`${kpi.parking_occupancy_percent}%`}
                    icon={Car}
                    trend="Stable"
                    color="text-blue-400"
                    detail="City-wide occupancy"
                    bgGradient="from-blue-500/10 to-indigo-500/10"
                />
                <StatCard
                    title="AI System Health"
                    value={`${kpi.ai_model_accuracy}%`}
                    icon={Activity}
                    trend={`${kpi.detection_latency_ms}ms`}
                    color="text-cyan-400"
                    detail={kpi.system_status}
                    bgGradient="from-cyan-500/10 to-blue-500/10"
                    trendNegative={true} // Reusing true for green color
                />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-3 gap-6 mb-8 h-80">
                <div className="col-span-2 bg-slate-900/60 backdrop-blur-md rounded-3xl p-6 border border-white/10 shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
                    <div className="flex justify-between items-center mb-4 relative z-10">
                        <h3 className="text-gray-200 font-bold text-lg flex items-center gap-2">
                            Daily Flow Trend
                            <span className="text-xs font-normal text-gray-500 px-2 py-0.5 rounded-full border border-white/10">Traffic Module</span>
                        </h3>
                    </div>
                    <div className="h-60 relative w-full">
                        <canvas id="trafficChart"></canvas>
                    </div>
                </div>

                <div className="col-span-1 bg-slate-900/60 backdrop-blur-md rounded-3xl p-6 border border-white/10 shadow-xl relative overflow-hidden flex flex-col">
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-red-600/10 rounded-full blur-[60px] translate-y-1/2 -translate-x-1/3 pointer-events-none"></div>
                    <div className="flex justify-between items-center mb-4 relative z-10">
                        <h3 className="text-gray-200 font-bold text-lg">Violation Hotspots</h3>
                    </div>
                    <div className="flex-1 relative w-full">
                        <canvas id="speedChart"></canvas>
                    </div>
                </div>
            </div>

            {/* Recent Alerts Feed */}
            <div className="bg-slate-900/60 backdrop-blur-md rounded-3xl border border-white/10 shadow-xl overflow-hidden flex flex-col" style={{ minHeight: "300px" }}>
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5 sticky top-0 z-10 backdrop-blur-md">
                    <h3 className="text-gray-200 font-bold text-lg flex items-center gap-3">
                        Live Incident Stream
                        <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                        </span>
                    </h3>
                    <button onClick={() => setAlerts([])} className="text-xs text-gray-400 hover:text-white transition-colors">Clear Stream</button>
                </div>

                <div className="divide-y divide-white/5 overflow-y-auto custom-scrollbar flex-1 relative">
                    {alerts.length === 0 ? (
                        <div className="absolute inset-0 flex items-center justify-center text-gray-500 font-medium">
                            No recent incidents detected. Monitoring live...
                        </div>
                    ) : (
                        alerts.map((alert) => (
                            <div key={alert.id} className="p-4 flex items-center gap-4 hover:bg-white/5 transition-colors cursor-default animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className={`w-12 h-12 rounded-full ${alert.bg} flex items-center justify-center border ${alert.border} shrink-0`}>
                                    <AlertTriangle className={`w-5 h-5 ${alert.color}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className={`font-bold text-sm truncate ${alert.color}`}>{alert.title}</h4>
                                    <p className="text-xs text-gray-400 truncate mt-0.5">{alert.desc}</p>
                                </div>
                                <span className="text-xs text-gray-500 font-mono shrink-0 bg-white/5 px-2 py-1 rounded border border-white/5">{alert.time}</span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

const StatCard = ({ title, value, icon: Icon, trend, color, detail, bgGradient, trendNegative }) => (
    <div className={`rounded-3xl p-6 border border-white/5 bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm shadow-lg hover:-translate-y-1 transition-transform duration-300 relative overflow-hidden group`}>
        <div className={`absolute inset-0 bg-gradient-to-br ${bgGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>
        <div className="relative z-10">
            <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-2xl bg-white/5 border border-white/5 ${color} transition-transform duration-300 group-hover:scale-110`}>
                    <Icon className="w-6 h-6" />
                </div>
                <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${trendNegative ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                    {trendNegative ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                    {trend}
                </div>
            </div>
            <h3 className="text-gray-400 text-sm font-medium uppercase tracking-wider mb-1">{title}</h3>
            <div className={`text-4xl font-black text-white tracking-tight mb-2 group-hover:scale-105 origin-left transition-transform`}>{value}</div>
            <p className="text-xs text-gray-500 font-medium">{detail}</p>
        </div>
    </div>
);

export default Overview;
