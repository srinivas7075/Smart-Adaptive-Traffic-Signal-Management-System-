import React, { useState, useEffect } from 'react';
import TrafficLight from './TrafficLight';

const Dashboard = () => {
    // Initial state
    const [trafficData, setTrafficData] = useState({
        intersections: [
            { id: 1, label: "North", signal: "Red", timer: 0, vehicle_count: 0, queue_len: 0, density: 0 },
            { id: 2, label: "South", signal: "Red", timer: 0, vehicle_count: 0, queue_len: 0, density: 0 },
            { id: 3, label: "East", signal: "Red", timer: 0, vehicle_count: 0, queue_len: 0, density: 0 },
            { id: 4, label: "West", signal: "Red", timer: 0, vehicle_count: 0, queue_len: 0, density: 0 },
        ]
    });

    // Live Clock State
    const [currentTime, setCurrentTime] = useState(new Date());
    // Video Progress State
    const [videoProgress, setVideoProgress] = useState(0);
    const [isSeeking, setIsSeeking] = useState(false);

    useEffect(() => {
        // Reset Backend Simulation on Load
        fetch('http://127.0.0.1:8080/reset', { method: 'POST' }).catch(err => console.error(err));

        // Traffic Data Polling
        const fetchData = async () => {
            try {
                const res = await fetch('http://127.0.0.1:8080/status');
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.intersections) {
                        setTrafficData(data);
                    }
                }

                // Fetch Video Progress (only if not currently seeking by user interaction)
                if (!isSeeking) {
                    const resProg = await fetch('http://127.0.0.1:8080/video-progress');
                    if (resProg.ok) {
                        const d = await resProg.json();
                        setVideoProgress(d.progress);
                    }
                }
            } catch (error) {
                // Suppress error
            }
        };
        fetchData();
        const interval = setInterval(fetchData, 500); // Faster polling for real-time feel

        // Clock Timer
        const clockInterval = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        return () => {
            clearInterval(interval);
            clearInterval(clockInterval);
        };
    }, []);

    // Helper to get specific intersection by label
    const getIntersection = (label) => trafficData.intersections.find(i => i.label === label) || { label, signal: 'Red', timer: 0, vehicle_count: 0, queue_len: 0, density: 0 };

    const handleSeek = async (e) => {
        const val = parseFloat(e.target.value);
        setVideoProgress(val);
        try {
            await fetch('http://127.0.0.1:8080/seek', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ progress: val })
            });
        } catch (err) {
            console.error("Seek error:", err);
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-gray-900 text-white font-sans">

            {/* Header */}
            <div className="h-14 px-6 bg-gray-900 border-b border-gray-800 flex items-center justify-between shrink-0 z-20 shadow-md sticky top-0">
                <h1 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500 tracking-wide uppercase">
                    SIH 2024 AI Traffic Control
                </h1>
                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                            {currentTime.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                        <p className="text-lg font-mono text-cyan-400 leading-none">
                            {currentTime.toLocaleTimeString()}
                        </p>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col lg:flex-row bg-gray-900">

                {/* LEFT COLUMN: Video + Upload (40% width on Desktop) */}
                <div className="w-full lg:w-[40%] flex flex-col border-r border-gray-800 bg-black/40 lg:sticky lg:top-14 lg:h-[calc(100vh-3.5rem)]">

                    {/* Video Area (Top) */}
                    <div className="flex-1 p-4 flex items-center justify-center overflow-hidden relative min-h-[300px]">
                        <div className="w-full h-full bg-black rounded-xl border border-gray-700/50 flex items-center justify-center overflow-hidden relative shadow-lg">
                            <img
                                src="http://127.0.0.1:8080/video_feed"
                                alt="Live Analysis Feed"
                                className="w-full h-full object-contain"
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'flex';
                                }}
                            />
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 text-center p-4" style={{ display: 'none' }}>
                                <p className="text-sm font-medium mb-1">No Video Stream</p>
                                <p className="text-xs opacity-50">Upload file below</p>
                            </div>

                            {/* ROI Overlay Hint (Static for Demo) */}
                            <div className="absolute top-2 left-2 pointer-events-none">
                                <span className="text-[10px] bg-black/50 px-2 py-1 rounded text-cyan-400 border border-cyan-400/30">
                                    ROI: Active
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Upload Control (Bottom) */}
                    <div className="p-4 border-t border-gray-800/50 bg-gray-900/50 shrink-0">
                        <div className="flex flex-col gap-2">
                            {/* Seek Control */}
                            <div className="mb-2">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Video Progress</span>
                                    <span className="text-[10px] text-cyan-400 font-mono">{Math.round(videoProgress)}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    step="0.1"
                                    value={videoProgress}
                                    onMouseDown={() => setIsSeeking(true)}
                                    onMouseUp={() => setIsSeeking(false)}
                                    onChange={handleSeek}
                                    className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500 hover:accent-cyan-400"
                                />
                            </div>

                            <div className="flex justify-between items-center mb-1">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Input Feed</label>
                                <span className="text-[10px] text-green-400 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                    System Ready
                                </span>
                            </div>
                            <div className="relative group">
                                <input
                                    type="file"
                                    id="video-upload"
                                    accept="video/*"
                                    className="hidden"
                                    onChange={async (e) => {
                                        const file = e.target.files[0];
                                        if (!file) return;
                                        const formData = new FormData();
                                        formData.append("file", file);
                                        try {
                                            const res = await fetch("http://127.0.0.1:8080/upload-video", {
                                                method: "POST",
                                                body: formData
                                            });
                                            const data = await res.json();
                                            alert("Video Loading: " + data.status);
                                        } catch (err) {
                                            alert("Error: " + err.message);
                                        }
                                    }}
                                />
                                <label
                                    htmlFor="video-upload"
                                    className="flex items-center justify-center w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-lg cursor-pointer transform transition-all active:scale-95 shadow-lg border border-blue-400/30"
                                >
                                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                                    <span className="font-bold text-sm tracking-wide">UPLOAD TRAFFIC VIDEO</span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: Signals & Analytics (60% width on Desktop) */}
                <div className="flex-1 bg-gray-900 p-6">

                    {/* Top Stats Row */}
                    <div className="grid grid-cols-4 gap-4 mb-6">
                        {[getIntersection('North'), getIntersection('South'), getIntersection('East'), getIntersection('West')].map((lane) => (
                            <div key={lane.label} className="bg-gray-800/40 rounded-lg p-3 border border-gray-700/50">
                                <h4 className="text-[10px] uppercase font-bold text-gray-500 mb-1">{lane.label} Lane</h4>
                                <div className="flex justify-between items-end">
                                    <div>
                                        <div className="text-2xl font-bold text-white leading-none">{lane.vehicle_count}</div>
                                        <div className="text-[9px] text-gray-400">Vehicles</div>
                                    </div>
                                    <div className="text-right">
                                        <div className={`text-md font-bold leading-none ${getCongestionColor(lane.density)}`}>
                                            {lane.queue_len ? lane.queue_len.toFixed(1) : 0}m
                                        </div>
                                        <div className="text-[9px] text-gray-400">Est. Queue</div>
                                    </div>
                                </div>
                                {/* Density Bar */}
                                <div className="w-full bg-gray-700 h-1 mt-2 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full ${getCongestionBg(lane.density)}`}
                                        style={{ width: `${Math.min(lane.density || 0, 100)}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-rows-1 gap-6 h-[400px]">

                        {/* Zone 1 Row */}
                        <div className="bg-gray-800/20 rounded-2xl border border-gray-800 p-4 flex flex-col relative overflow-hidden">
                            {/* Decoration */}
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-transparent to-orange-500 opacity-50"></div>

                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                    <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></span>
                                    Signal Control Status
                                </h3>
                                <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                    Mode: Adaptive AI
                                </span>
                            </div>

                            <div className="flex-1 flex justify-around items-center gap-8 px-8">
                                <SignalCard data={getIntersection("North")} />
                                <SignalCard data={getIntersection("South")} />
                                <div className="w-px h-32 bg-gray-800/50"></div>
                                <SignalCard data={getIntersection("East")} />
                                <SignalCard data={getIntersection("West")} />
                            </div>
                        </div>

                    </div>

                    {/* Analytics / Heatmap Stub */}
                    <div className="mt-6 bg-gray-800/20 rounded-2xl border border-gray-800 p-4">
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Live Congestion Heatmap</h3>
                        <div className="flex gap-2 h-24">
                            {['North', 'South', 'East', 'West'].map(label => {
                                const lane = getIntersection(label);
                                return (
                                    <div key={label} className="flex-1 rounded-lg border border-gray-700/30 flex items-center justify-center relative overflow-hidden group">
                                        <div className={`absolute inset-0 opacity-20 ${getCongestionBg(lane.density)}`}></div>
                                        <div className="z-10 text-center">
                                            <div className="text-xs font-bold text-gray-300">{label}</div>
                                            <div className="text-[10px] text-gray-500">{lane.density ? lane.density.toFixed(1) : 0}% Density</div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Helpers for coloring
const getCongestionColor = (density) => {
    if (density > 70) return 'text-red-500';
    if (density > 40) return 'text-yellow-500';
    return 'text-green-500';
};

const getCongestionBg = (density) => {
    if (density > 70) return 'bg-red-500';
    if (density > 40) return 'bg-yellow-500';
    return 'bg-green-500';
};

// Adaptable Signal Card
const SignalCard = ({ data }) => (
    <div className={`flex flex-col items-center justify-center p-4 bg-gray-800 rounded-xl border ${data.signal === 'Green' ? 'border-green-500/30 shadow-[0_0_15px_rgba(34,197,94,0.1)]' : 'border-gray-700/50'} shadow-sm w-full max-w-[140px] transition-all duration-500`}>
        <div className="mb-4 transform scale-100">
            <TrafficLight
                label={data.label}
                signal={data.signal}
                timer={data.timer}
            />
        </div>
        <div className="w-full flex flex-col gap-1">
            <div className="flex justify-between items-center text-[10px] text-gray-400">
                <span>Queue</span>
                <span className="font-mono text-white">{data.queue_len ? Math.round(data.queue_len) : 0}m</span>
            </div>
            {/* Prediction Indicator */}
            <div className="flex justify-between items-center text-[10px] text-gray-400">
                <span>Pred.</span>
                <span className="font-mono text-cyan-400">+{Math.round((data.queue_len || 0) * 0.1)}m</span>
            </div>
        </div>
    </div>
);

export default Dashboard;

