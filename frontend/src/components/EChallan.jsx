import React, { useState, useEffect, useMemo } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Search, Eye, Download, CheckCircle, X, ShieldAlert, Cpu } from 'lucide-react';
import authService from '../services/authService'; // Make sure this is accessible

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

const EChallan = () => {
    const [violations, setViolations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [typeFilter, setTypeFilter] = useState('All');
    const [dateFilter, setDateFilter] = useState('');
    const [selectedImage, setSelectedImage] = useState(null);

    // --- Phase 13/14: Manual Entry State ---
    const [showManualModal, setShowManualModal] = useState(false);
    const [violationRules, setViolationRules] = useState([]);
    const [newChallan, setNewChallan] = useState({
        plate_number: '',
        violation_type: 'Speeding',
        intersection_id: 'INT-001',
        speed_detected: '',
        evidence_image: null,
        remarks: ''
    });

    // Auth info
    const currentUser = authService.getCurrentUser() || {};
    const userRole = currentUser.role || 'Viewer';

    // Derived fine amount
    const currentFineAmount = useMemo(() => {
        if (!violationRules.length) return 0;

        if (newChallan.violation_type === 'Speeding') {
            const speed = parseFloat(newChallan.speed_detected);
            if (!isNaN(speed)) {
                const overLimit = Math.max(0, speed - 60);
                let targetType = "Speeding L1";
                if (overLimit > 40) targetType = "Speeding L3";
                else if (overLimit > 20) targetType = "Speeding L2";

                const rule = violationRules.find(r => r.violation_type === targetType);
                return rule ? rule.fine_amount : 1000;
            }
            return 1000;
        } else {
            const rule = violationRules.find(r => r.violation_type === newChallan.violation_type);
            return rule ? rule.fine_amount : 500;
        }
    }, [newChallan.violation_type, newChallan.speed_detected, violationRules]);

    const handleTypeChange = (type) => {
        setNewChallan(prev => ({ ...prev, violation_type: type }));
    };

    // Submit Manual Entry
    const handleManualSubmit = async (e) => {
        e.preventDefault();

        const plateRegex = /^[A-Z]{2}[-\s]*\d{1,2}[-\s]*[A-Z]{1,2}[-\s]*\d{4}$/i;
        if (!plateRegex.test(newChallan.plate_number.trim())) {
            alert("Warning: Plate number format seems invalid (Standard is e.g: MH 01 AB 1234)");
            return;
        }

        if (!newChallan.evidence_image) {
            alert("Error: Evidence Image is strictly required for generating manual citations.");
            return;
        }

        const formData = new FormData();
        formData.append('plate_number', newChallan.plate_number);
        formData.append('violation_type', newChallan.violation_type);
        formData.append('intersection_id', newChallan.intersection_id);
        formData.append('remarks', newChallan.remarks);
        if (newChallan.violation_type === 'Speeding' && newChallan.speed_detected) {
            formData.append('speed_detected', newChallan.speed_detected);
        }
        formData.append('evidence_image', newChallan.evidence_image);

        try {
            const res = await fetch('http://127.0.0.1:8080/api/v1/violations/manual', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authService.getToken()}`
                },
                body: formData
            });

            if (res.ok) {
                setShowManualModal(false);
                setNewChallan({ plate_number: '', violation_type: 'Speeding', intersection_id: 'INT-001', speed_detected: '', evidence_image: null, remarks: '' });
                fetchViolations();
            } else {
                const data = await res.json();
                alert(`Error: ${data.detail || "Failed to submit"}`);
            }
        } catch (error) {
            console.error("Submission failed", error);
        }
    };

    // Fetch Violations
    const fetchViolations = async () => {
        try {
            let url = 'http://127.0.0.1:8080/api/v1/violations';
            const params = new URLSearchParams();
            if (dateFilter) params.append('date', dateFilter);
            
            if (searchQuery) {
                params.append('plate_number', searchQuery);
                url = `http://127.0.0.1:8080/api/v1/violations/search?${params.toString()}`;
            } else if (dateFilter) {
                url = `http://127.0.0.1:8080/api/v1/violations?${params.toString()}`;
            }

            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                setViolations(data);
            }
        } catch (error) {
            console.error("Error fetching violations:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchRules = async () => {
        try {
            const res = await fetch('http://127.0.0.1:8080/api/v1/rules');
            if (res.ok) {
                const data = await res.json();
                setViolationRules(data);
            }
        } catch (error) {
            console.error("Error fetching rules:", error);
        }
    };

    useEffect(() => {
        fetchRules();
        fetchViolations();
        const interval = setInterval(() => {
            if (!searchQuery) fetchViolations();
        }, 5000); // Live poll every 5s
        return () => clearInterval(interval);
    }, [searchQuery, dateFilter]);

    // Mark as Paid
    const handleMarkPaid = async (id) => {
        try {
            const res = await fetch(`http://127.0.0.1:8080/api/v1/violations/${id}/status?status=Paid`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${authService.getToken()}`
                }
            });
            if (res.ok) fetchViolations();
        } catch (error) {
            console.error("Failed to update status", error);
        }
    };

    // Filter Logic
    const filteredViolations = useMemo(() => {
        return violations.filter(v => {
            if (statusFilter !== 'All' && v.status !== statusFilter) return false;
            if (typeFilter !== 'All' && v.violation_type !== typeFilter) return false;
            return true;
        });
    }, [violations, statusFilter, typeFilter]);

    // PDF Generation Logic
    const handleDownloadPDF = (v) => {
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>E-Challan #${v.id}</title>
                    <style>
                        body { font-family: monospace; padding: 40px; color: #333; }
                        h1 { color: #dc2626; border-bottom: 2px solid #dc2626; padding-bottom: 10px; }
                        .details { margin: 20px 0; font-size: 14px; line-height: 1.6; }
                        .evidence { margin-top: 20px; text-align: center; }
                        img { max-width: 100%; height: auto; border: 1px solid #ccc; }
                        .footer { margin-top: 40px; font-size: 10px; color: #666; text-align: center; }
                    </style>
                </head>
                <body>
                    <h1>OFFICIAL TRAFFIC INFRACTION NOTICE</h1>
                    <div class="details">
                        <p><strong>Notice ID:</strong> CHL-${v.id}</p>
                        <p><strong>Vehicle License Plate:</strong> ${v.plate_number}</p>
                        <p><strong>Violation Type:</strong> ${v.violation_type}</p>
                        <p><strong>Timestamp:</strong> ${new Date(v.timestamp).toLocaleString()}</p>
                        <p><strong>Location:</strong> ${v.intersection_id} - ${v.lane_id}</p>
                        <p><strong>Fine Amount:</strong> ₹${v.fine_amount}</p>
                        <p><strong>Enforcement Mode:</strong> Fully Automated AI Pipeline</p>
                    </div>
                    <div class="evidence">
                        <p><strong>Photographic Evidence:</strong></p>
                        <img src="http://127.0.0.1:8080${v.evidence_image_path}" alt="ANPR Proof" />
                    </div>
                    <div class="footer">
                        Generated by AI Smart Traffic Enforcement System. Legally Binding Document.
                    </div>
                </body>
            </html>
        `);
        printWindow.document.close();
        // Give image time to load before printing
        setTimeout(() => {
            printWindow.print();
        }, 500);
    };

    // Analytics Calculation
    const analytics = useMemo(() => {
        let pendingFines = 0;
        let typeCounts = {};
        let dayCounts = {};
        let sourceCounts = { 'AI': 0, 'MANUAL': 0 };
        let revenuePerType = {};
        let plateCounts = {};

        filteredViolations.forEach(v => {
            if (v.status === 'Pending') pendingFines += (v.fine_amount || 0);

            // Types & Revenue
            typeCounts[v.violation_type] = (typeCounts[v.violation_type] || 0) + 1;
            if (v.status === 'Paid') {
                revenuePerType[v.violation_type] = (revenuePerType[v.violation_type] || 0) + (v.fine_amount || 0);
            }

            // Sources
            const source = v.source_type || 'AI';
            sourceCounts[source] = (sourceCounts[source] || 0) + 1;

            // Offenders
            plateCounts[v.plate_number] = (plateCounts[v.plate_number] || 0) + 1;

            // Days
            const day = new Date(v.timestamp).toLocaleDateString('en-US', { weekday: 'short' });
            dayCounts[day] = (dayCounts[day] || 0) + 1;
        });

        // Peak Time (Very basic hour grouping)
        let peakHour = "N/A";
        if (violations.length > 0) {
            const hours = violations.map(v => new Date(v.timestamp).getHours());
            const currentPeak = hours.sort((a, b) => hours.filter(v => v === a).length - hours.filter(v => v === b).length).pop();
            peakHour = currentPeak ? `${currentPeak}:00` : "N/A";
        }

        // Top Offenders
        const topOffenders = Object.entries(plateCounts)
            .filter(([_, count]) => count > 1)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([plate, count]) => ({ plate, count }));

        return { pendingFines, typeCounts, dayCounts, peakHour, sourceCounts, revenuePerType, topOffenders };
    }, [filteredViolations, violations]);

    // Chart Data
    const typeChartData = {
        labels: Object.keys(analytics.typeCounts),
        datasets: [{
            data: Object.values(analytics.typeCounts),
            backgroundColor: ['#ef4444', '#eab308', '#3b82f6', '#10b981', '#8b5cf6', '#d946ef'],
            borderWidth: 0,
            hoverOffset: 4
        }]
    };

    const sourceChartData = {
        labels: Object.keys(analytics.sourceCounts),
        datasets: [{
            data: Object.values(analytics.sourceCounts),
            backgroundColor: ['#10b981', '#3b82f6'],
            borderWidth: 0,
            hoverOffset: 4
        }]
    };

    const revenueChartData = {
        labels: Object.keys(analytics.revenuePerType),
        datasets: [{
            label: 'Revenue (₹)',
            data: Object.values(analytics.revenuePerType),
            backgroundColor: '#10b981',
            borderRadius: 4,
        }]
    };

    return (
        <div className="flex-1 p-6 relative z-10 overflow-y-auto custom-scrollbar">
            {/* Header & Search */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h2 className="text-xl font-bold text-white uppercase tracking-wider flex items-center gap-3">
                    <span className="p-2 bg-red-500/10 rounded-lg border border-red-500/20 text-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]">
                        <ShieldAlert className="w-6 h-6" />
                    </span>
                    AI ANPR E-Challan Deck
                </h2>

                <div className="flex bg-slate-800 rounded-lg border border-white/10 overflow-hidden focus-within:border-cyan-500 transition-colors shadow-lg">
                    <span className="pl-3 flex items-center text-gray-500"><Search className="w-4 h-4" /></span>
                    <input
                        type="text"
                        placeholder="Search License Plate..."
                        className="bg-transparent text-sm text-white px-3 py-2 outline-none w-64 placeholder-gray-500 uppercase"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                    />
                </div>

                {(userRole === 'Admin' || userRole === 'Operator') && (
                    <button
                        onClick={() => setShowManualModal(true)}
                        className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold py-2 px-4 rounded-lg shadow-lg shadow-blue-500/30 flex items-center gap-2 transition-all transform hover:scale-105"
                    >
                        <span className="text-xl leading-none">+</span> Create Entry
                    </button>
                )}
            </div>

            {/* Analytics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-slate-800/80 p-4 rounded-xl border border-white/5 shadow-xl flex flex-col justify-center">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Total Monitored</p>
                    <p className="text-3xl font-mono text-white mt-1">{filteredViolations.length}</p>
                    <div className="mt-4 pt-4 border-t border-white/5">
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-2">Repeat Offenders</p>
                        {analytics.topOffenders.length > 0 ? (
                            analytics.topOffenders.map((off, idx) => (
                                <div key={idx} className="flex justify-between text-xs font-mono text-gray-300 mb-1">
                                    <span>{off.plate}</span>
                                    <span className="text-red-400">{off.count}x</span>
                                </div>
                            ))
                        ) : <p className="text-xs text-green-500">None detected</p>}
                    </div>
                </div>

                <div className="bg-slate-800/80 p-4 rounded-xl border border-white/5 shadow-xl flex flex-col items-center justify-center">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest w-full text-left mb-2">AI vs Manual Ratio</p>
                    <div className="w-32 h-32 relative">
                        {analytics.sourceCounts['AI'] > 0 || analytics.sourceCounts['MANUAL'] > 0 ? (
                            <Doughnut data={sourceChartData} options={{ plugins: { legend: { display: false } }, cutout: '75%' }} />
                        ) : <p className="text-xs text-gray-500 mt-12 text-center">No Data</p>}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none mt-2">
                            <span className="text-xs font-bold text-gray-400">Total</span>
                        </div>
                    </div>
                    <div className="flex gap-4 mt-2 text-[10px] font-bold">
                        <span className="text-emerald-400">AI: {analytics.sourceCounts['AI'] || 0}</span>
                        <span className="text-blue-400">Manual: {analytics.sourceCounts['MANUAL'] || 0}</span>
                    </div>
                </div>

                <div className="bg-slate-800/80 p-4 rounded-xl border border-white/5 shadow-xl col-span-1 md:col-span-2">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-2">Collected Revenue per Violation Type</p>
                    <div className="h-40 w-full">
                        {Object.keys(analytics.revenuePerType).length > 0 ? (
                            <Bar data={revenueChartData} options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: { legend: { display: false } },
                                scales: {
                                    y: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
                                    x: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { display: false } }
                                }
                            }} />
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-500 text-sm">No paid violations yet</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4 mb-4">
                <input 
                    type="date"
                    className="bg-slate-800 border border-white/10 text-xs text-white px-3 py-2 rounded-lg outline-none focus:border-cyan-500"
                    value={dateFilter}
                    onChange={e => setDateFilter(e.target.value)}
                />
                <select
                    className="bg-slate-800 border border-white/10 text-xs text-white px-3 py-2 rounded-lg outline-none focus:border-cyan-500"
                    value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                >
                    <option value="All">All Statuses</option>
                    <option value="Pending">Pending Only</option>
                    <option value="Paid">Paid Only</option>
                </select>
                <select
                    className="bg-slate-800 border border-white/10 text-xs text-white px-3 py-2 rounded-lg outline-none focus:border-cyan-500"
                    value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
                >
                    <option value="All">All Violation Types</option>
                    <option value="Red Light Violation">Red Light Violation</option>
                    <option value="Speeding">Speeding</option>
                </select>
            </div>

            {/* Data Table */}
            <div className="bg-slate-800/50 rounded-xl border border-white/10 overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-400">
                        <thead className="text-xs text-gray-400 uppercase bg-black/40 border-b border-white/10">
                            <tr>
                                <th className="px-6 py-4 font-bold tracking-widest">Plate #</th>
                                <th className="px-6 py-4 font-bold tracking-widest">Type</th>
                                <th className="px-6 py-4 font-bold tracking-widest">Timestamp</th>
                                <th className="px-6 py-4 font-bold tracking-widest">Location</th>
                                <th className="px-6 py-4 font-bold tracking-widest">Source & Confidence</th>
                                <th className="px-6 py-4 font-bold tracking-widest">Fine</th>
                                <th className="px-6 py-4 font-bold tracking-widest">Status</th>
                                <th className="px-6 py-4 font-bold tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredViolations.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="text-center py-10 opacity-50">No violations found matching criteria.</td>
                                </tr>
                            ) : filteredViolations.map((v) => (
                                <tr key={v.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                    <td className="px-6 py-4 font-mono font-bold text-white tracking-widest">{v.plate_number}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 text-[10px] uppercase font-bold rounded-md border ${v.violation_type === 'Speeding' ? 'text-orange-400 bg-orange-400/10 border-orange-400/20' : 'text-red-400 bg-red-400/10 border-red-400/20'}`}>
                                            {v.violation_type}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 font-mono text-xs">{new Date(v.timestamp).toLocaleString()}</td>
                                    <td className="px-6 py-4">{v.intersection_id} / {v.lane_id}</td>

                                    <td className="px-6 py-4">
                                        {v.source_type === 'MANUAL' ? (
                                            <div className="flex flex-col gap-1">
                                                <span className="px-2 py-1 text-[9px] uppercase font-bold text-blue-400 bg-blue-400/10 border border-blue-400/20 inline-flex items-center gap-1 w-max rounded">
                                                    Manual Entry <CheckCircle className="w-3 h-3 text-green-400" title="Digital Signature Verified" />
                                                </span>
                                                {v.remarks && <span className="text-[10px] text-gray-500 truncate max-w-[150px] block" title={v.remarks}>Note: {v.remarks}</span>}
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <Cpu className="w-3 h-3 text-cyan-400" />
                                                <span className="px-2 py-1 text-[9px] uppercase font-bold text-green-400 bg-green-400/10 border border-green-400/20 ml-2 rounded">AI Source</span>
                                            </div>
                                        )}
                                    </td>

                                    <td className="px-6 py-4 text-red-400 font-bold">₹{v.fine_amount}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-md border ${v.status === 'Paid' ? 'text-green-400 bg-green-400/10 border-green-400/20' : 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20'}`}>
                                            {v.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            {v.status === 'Pending' && (
                                                <button onClick={() => handleMarkPaid(v.id)} className="p-2 text-gray-400 hover:text-green-400 hover:bg-green-400/10 rounded-lg transition-colors" title="Mark Paid">
                                                    <CheckCircle className="w-4 h-4" />
                                                </button>
                                            )}
                                            <button onClick={() => setSelectedImage(v)} className="p-2 text-gray-400 hover:text-cyan-400 hover:bg-cyan-400/10 rounded-lg transition-colors" title="View Details">
                                                <Eye className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Evidence Modal (Existing) */}
            {selectedImage && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 border border-white/10 rounded-2xl max-w-4xl w-full flex flex-col shadow-2xl overflow-hidden">
                        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/20">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <ShieldAlert className="w-5 h-5 text-red-500" />
                                Violation Evidence: {selectedImage.plate_number}
                            </h3>
                            <button onClick={() => setSelectedImage(null)} className="text-gray-400 hover:text-white transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-6 flex flex-col md:flex-row gap-6">
                            <div className="flex-1 bg-black/50 rounded-xl border border-white/5 overflow-hidden relative group">
                                {selectedImage.evidence_image_path === 'manual_entry_placeholder' ? (
                                    <div className="w-full h-64 flex items-center justify-center text-gray-500 font-mono text-sm border-2 border-dashed border-gray-700/50 rounded-lg">
                                        [ No Photographic Evidence: Field Officer Manual Report ]
                                    </div>
                                ) : (
                                    <img
                                        src={`http://127.0.0.1:8080${selectedImage.evidence_image_path}`}
                                        alt="Violation Evidence"
                                        className="w-full h-auto object-contain max-h-[60vh]"
                                        onError={(e) => { e.target.src = 'https://via.placeholder.com/800x450.png?text=Evidence+Image+Not+Found' }}
                                    />
                                )}
                            </div>
                            <div className="w-full md:w-80 flex flex-col gap-4">
                                <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5">
                                    <p className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-1">Detected Plate</p>
                                    <p className="text-2xl font-mono text-white font-bold bg-black/30 p-2 rounded text-center border border-white/10">{selectedImage.plate_number}</p>
                                </div>
                                <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5">
                                    <p className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-1">Violation Details</p>
                                    <div className="space-y-2 mt-2">
                                        <div className="flex justify-between"><span className="text-gray-500 text-sm">Type:</span><span className="text-red-400 font-bold text-sm">{selectedImage.violation_type}</span></div>
                                        <div className="flex justify-between"><span className="text-gray-500 text-sm">Fine:</span><span className="text-white font-bold text-sm">₹{selectedImage.fine_amount}</span></div>
                                        <div className="flex justify-between"><span className="text-gray-500 text-sm">Location:</span><span className="text-white text-sm">{selectedImage.intersection_id}</span></div>
                                        <div className="flex justify-between"><span className="text-gray-500 text-sm">Time:</span><span className="text-white text-sm">{new Date(selectedImage.timestamp).toLocaleTimeString()}</span></div>
                                        <div className="flex justify-between"><span className="text-gray-500 text-sm">Source:</span><span className="text-white text-sm">{selectedImage.source_type || 'AI'}</span></div>
                                        {selectedImage.speed_detected && (
                                            <div className="flex justify-between"><span className="text-gray-500 text-sm">Speed:</span><span className="text-orange-400 font-bold text-sm">{selectedImage.speed_detected} km/h</span></div>
                                        )}
                                        {selectedImage.source_type === 'MANUAL' && (
                                            <div className="flex flex-col mt-2 gap-2">
                                                <div className="flex justify-between items-center bg-green-900/20 px-2 py-1 rounded border border-green-500/30">
                                                    <span className="text-green-500 text-xs font-bold flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Digitally Signed</span>
                                                    <span className="text-green-400 text-xs">Officer #{selectedImage.officer_id}</span>
                                                </div>
                                                <div className="flex justify-between"><span className="text-gray-500 text-sm">Notes:</span><span className="text-gray-300 text-sm truncate max-w-[150px]" title={selectedImage.remarks}>{selectedImage.remarks || 'None'}</span></div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <button onClick={handleDownloadPDF} className="mt-auto w-full flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white p-3 rounded-xl transition-colors font-bold tracking-wide">
                                    <Download className="w-4 h-4" /> Download Official Notice
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- Phase 13: Manual Challan Creation Modal --- */}
            {showManualModal && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                    <div className="bg-slate-900 border-2 border-cyan-500/30 rounded-2xl max-w-md w-full shadow-[0_0_50px_rgba(6,182,212,0.1)] overflow-hidden">
                        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-gradient-to-r from-blue-900/50 to-cyan-900/50">
                            <h3 className="text-lg font-bold text-white uppercase tracking-widest flex items-center gap-2">
                                <span className="text-cyan-400">+</span> Manual Citation
                            </h3>
                            <button onClick={() => setShowManualModal(false)} className="text-gray-400 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleManualSubmit} className="p-6 flex flex-col gap-4">
                            <div>
                                <label className="block text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">License Plate</label>
                                <input
                                    type="text" required
                                    placeholder="e.g. MH 01 AB 1234"
                                    className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white font-mono uppercase focus:border-cyan-500 outline-none transition-colors"
                                    value={newChallan.plate_number}
                                    onChange={e => setNewChallan({ ...newChallan, plate_number: e.target.value.toUpperCase() })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Infraction</label>
                                    <select
                                        className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-cyan-500 outline-none transition-colors"
                                        value={newChallan.violation_type}
                                        onChange={e => handleTypeChange(e.target.value)}
                                    >
                                        <option value="Speeding">Speeding</option>
                                        <option value="Red Light Violation">Red Light Violation</option>
                                        <option value="No Helmet">No Helmet</option>
                                        <option value="Wrong Way">Wrong Way</option>
                                        <option value="Seat Belt Violation">Seat Belt Violation</option>
                                        <option value="Signal Obstruction">Signal Obstruction</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Fine (₹) [Read Only]</label>
                                    <input
                                        type="number" readOnly
                                        className="w-full bg-black/70 border border-white/5 rounded-lg px-4 py-2 text-red-500 font-bold outline-none cursor-not-allowed opacity-80"
                                        value={currentFineAmount}
                                    />
                                </div>
                            </div>

                            {newChallan.violation_type === 'Speeding' && (
                                <div>
                                    <label className="block text-xs text-orange-400 font-bold uppercase tracking-widest mb-1">Detected Speed (km/h)</label>
                                    <input
                                        type="number" required placeholder="e.g. 75"
                                        className="w-full bg-orange-900/10 border border-orange-500/30 rounded-lg px-4 py-2 text-orange-400 font-bold outline-none focus:border-orange-500 transition-colors"
                                        value={newChallan.speed_detected}
                                        onChange={e => setNewChallan({ ...newChallan, speed_detected: e.target.value })}
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-sm text-cyan-400 font-bold tracking-widest mb-1 flex justify-between">
                                    <span>Evidence Upload</span>
                                    <span className="text-xs text-gray-500 uppercase">Max 5MB (JPG/PNG)</span>
                                </label>
                                <input
                                    type="file" required accept=".jpg,.jpeg,.png"
                                    className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-cyan-500/10 file:text-cyan-400 hover:file:bg-cyan-500/20"
                                    onChange={e => setNewChallan({ ...newChallan, evidence_image: e.target.files[0] })}
                                />
                            </div>

                            <div>
                                <label className="block text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Location / Zone</label>
                                <select
                                    className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-cyan-500 outline-none transition-colors"
                                    value={newChallan.intersection_id}
                                    onChange={e => setNewChallan({ ...newChallan, intersection_id: e.target.value })}
                                >
                                    <option value="INT-001">INT-001 (Main Highway)</option>
                                    <option value="INT-002">INT-002 (Downtown Crossing)</option>
                                    <option value="ZON-003">ZON-003 (School Zone)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Officer Notes (Optional)</label>
                                <textarea
                                    rows="2" placeholder="Description of the incident or reason for manual entry..."
                                    className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-sm text-gray-300 focus:border-cyan-500 outline-none transition-colors custom-scrollbar resize-none"
                                    value={newChallan.remarks}
                                    onChange={e => setNewChallan({ ...newChallan, remarks: e.target.value })}
                                ></textarea>
                            </div>

                            <div className="mt-4 pt-4 border-t border-white/10 flex justify-end gap-3">
                                <button type="button" onClick={() => setShowManualModal(false)} className="px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors text-sm font-bold">
                                    Cancel
                                </button>
                                <button type="submit" className="px-6 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold tracking-wide transition-colors shadow-lg shadow-cyan-500/20">
                                    Issue Citation
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EChallan;
