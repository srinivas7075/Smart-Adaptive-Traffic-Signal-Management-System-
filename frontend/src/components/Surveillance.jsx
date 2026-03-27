import React, { useEffect, useState } from 'react';
import TrafficLight from './TrafficLight';
import axios from 'axios';
import { AlertCircle, CarFront } from 'lucide-react';

const Surveillance = ({ trafficData, videoFeedUrl, videoProgress, isSeeking, handleSeek, setVideoProgress, setIsSeeking }) => {

    const [accidents, setAccidents] = useState([]);
    const [parking, setParking] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [accRes, parkRes] = await Promise.all([
                    axios.get('http://127.0.0.1:8080/api/v1/accidents'),
                    axios.get('http://127.0.0.1:8080/api/v1/parking/occupancy')
                ]);
                setAccidents(accRes.data);
                setParking(parkRes.data);
            } catch (err) {
                console.error("Failed to fetch cross-module data", err);
            }
        };
        fetchData();
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, []);

    const getIntersection = (label) => trafficData.intersections.find(i => i.label === label) || { label, signal: 'Red', timer: 0, vehicle_count: 0, queue_len: 0, density: 0 };

    // Helpers for coloring
    const getCongestionColor = (density) => {
        if (density > 70) return 'text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.5)]';
        if (density > 40) return 'text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]';
        return 'text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.5)]';
    };

    const getCongestionBg = (density) => {
        if (density > 70) return 'bg-gradient-to-r from-red-600 to-red-400';
        if (density > 40) return 'bg-gradient-to-r from-yellow-600 to-yellow-400';
        return 'bg-gradient-to-r from-green-600 to-green-400';
    };

    return (
        <div className="flex-1 flex flex-col lg:flex-row bg-slate-900/50 backdrop-blur-md rounded-3xl shadow-2xl border border-white/10 m-4 relative overflow-y-auto custom-scrollbar">
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[100px] pointer-events-none"></div>

            {/* LEFT COLUMN: Video + Upload (40% width) */}
            <div className="w-full lg:w-[40%] flex flex-col border-r border-white/10 bg-black/40 backdrop-blur-sm relative z-10">

                {/* Video Area (Top) */}
                <div className="flex-1 p-6 flex items-center justify-center relative min-h-[300px]">
                    <div className="w-full aspect-video bg-black rounded-2xl border border-white/10 flex items-center justify-center overflow-hidden relative shadow-[0_0_50px_rgba(0,0,0,0.5)] group">
                        <img
                            src={videoFeedUrl}
                            alt="Live Analysis Feed"
                            className="w-full h-full object-contain"
                            onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                            }}
                        />
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 text-center p-4" style={{ display: 'none' }}>
                            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-20"></span>
                                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                            </div>
                            <p className="text-sm font-medium mb-1 text-gray-300">No Video Stream</p>
                            <p className="text-xs text-gray-500">Upload file to begin analysis</p>
                        </div>

                        {/* ROI Overlay Hint */}
                        <div className="absolute top-4 left-4 pointer-events-none">
                            <span className="text-[10px] uppercase font-bold tracking-widest bg-black/60 px-3 py-1.5 rounded-lg text-cyan-400 border border-cyan-500/30 backdrop-blur-md shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                                Live AI Vision
                            </span>
                        </div>

                        {/* Tactical Compass Overlay */}
                        <div className="absolute top-4 right-4 pointer-events-none opacity-60 mix-blend-screen">
                            <div className="w-12 h-12 relative flex items-center justify-center">
                                {/* Outer Ring */}
                                <div className="absolute inset-0 border-2 border-dashed border-cyan-500/50 rounded-full animate-[spin_10s_linear_infinite]"></div>
                                {/* Inner Ring */}
                                <div className="absolute inset-1 border border-blue-500/30 rounded-full"></div>
                                {/* North Pointer */}
                                <div className="absolute top-0 text-[8px] font-black text-red-500 -mt-1 font-mono">N</div>
                                {/* Crosshairs */}
                                <div className="w-full h-px bg-cyan-500/30 absolute"></div>
                                <div className="h-full w-px bg-cyan-500/30 absolute"></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Upload Control (Bottom) */}
                <div className="p-6 border-t border-white/10 bg-black/20 shrink-0">
                    <div className="flex flex-col gap-4">
                        {/* Seek Control */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Analysis Progress</span>
                                <span className="text-xs text-cyan-400 font-mono font-bold drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]">{Math.round(videoProgress)}%</span>
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
                                className="w-full h-1.5 bg-gray-700/50 rounded-lg appearance-none cursor-pointer accent-cyan-400 hover:accent-cyan-300"
                            />
                        </div>

                        <div className="flex justify-between items-center">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Data Source</label>
                            <span className="text-[10px] text-green-400 flex items-center gap-2 font-bold px-3 py-1 bg-green-500/10 rounded-full border border-green-500/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse shadow-[0_0_10px_#4ade80]"></span>
                                SYSTEM ONLINE
                            </span>
                        </div>

                        <div className="relative group">
                            <input
                                type="file"
                                id="video-upload-surveillance"
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
                                htmlFor="video-upload-surveillance"
                                className="flex items-center justify-center w-full py-4 px-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-xl cursor-pointer transform transition-all active:scale-95 shadow-[0_0_20px_rgba(37,99,235,0.3)] border border-blue-400/30 group-hover:shadow-[0_0_30px_rgba(37,99,235,0.5)]"
                            >
                                <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                                <span className="font-bold text-sm tracking-widest uppercase">UPLOAD TRAFFIC FEED</span>
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            {/* RIGHT COLUMN: Signals & Analytics (60% width) */}
            <div className="flex-1 bg-gradient-to-br from-slate-900/50 to-slate-800/50 p-6 relative z-10 flex flex-col">

                {/* Top Stats Row */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                    {[getIntersection('North'), getIntersection('South'), getIntersection('East'), getIntersection('West')].map((lane) => (
                        <div key={lane.label} className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10 hover:border-white/20 hover:bg-white/10 transition-all duration-300 group shadow-lg">
                            <h4 className="text-[10px] uppercase font-bold text-gray-400 mb-2 tracking-widest flex justify-between items-center">
                                {lane.label} Lane
                                <div className={`w-2 h-2 rounded-full shadow-[0_0_10px_currentColor] ${lane.density > 40 ? 'bg-orange-500 text-orange-500 animate-pulse' : 'bg-green-500 text-green-500'}`}></div>
                            </h4>
                            <div className="flex justify-between items-end mb-2">
                                <div>
                                    <div className="text-2xl font-black text-white leading-none mb-1 tracking-tight group-hover:scale-110 origin-left transition-transform">{lane.vehicle_count}</div>
                                    <div className="text-[10px] text-gray-400 font-bold uppercase">Vehicles</div>
                                </div>
                                <div className="text-right">
                                    <div className={`text-lg font-bold leading-none mb-1 ${getCongestionColor(lane.density)}`}>
                                        {lane.queue_len ? lane.queue_len.toFixed(0) : 0}m
                                    </div>
                                    <div className="text-[10px] text-gray-400 font-medium">Auto Queue</div>
                                </div>
                            </div>
                            {/* Density Bar */}
                            <div className="w-full bg-gray-700/30 h-1.5 mt-2 rounded-full overflow-hidden">
                                <div
                                    className={`h-full ${getCongestionBg(lane.density)} transition-all duration-500 ease-out shadow-[0_0_10px_currentColor]`}
                                    style={{ width: `${Math.min(lane.density || 0, 100)}%` }}
                                ></div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="grid grid-rows-1 gap-6 mb-6">
                    {/* Signal Control Zone */}
                    <div className="bg-gradient-to-br from-slate-800/40 to-slate-900/40 rounded-3xl border border-white/10 p-6 flex flex-col relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>

                        <div className="flex justify-between items-center mb-6 relative z-10">
                            <h3 className="text-sm font-bold text-gray-300 uppercase tracking-widest flex items-center gap-3">
                                <span className="relative flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                                </span>
                                Signal Control Hub
                            </h3>
                            <span className="text-[10px] px-4 py-1.5 rounded-full bg-gradient-to-r from-blue-600/20 to-cyan-600/20 text-cyan-300 border border-cyan-500/30 font-bold tracking-wide shadow-[0_0_15px_rgba(34,211,238,0.2)]">
                                MODE: ADAPTIVE AI
                            </span>
                        </div>

                        <div className="flex-1 flex justify-around items-center gap-4 lg:gap-8 px-4 relative z-10">
                            <SignalCard data={getIntersection("North")} />
                            <SignalCard data={getIntersection("South")} />
                            {/* Divider with glow */}
                            <div className="w-px h-32 bg-gradient-to-b from-transparent via-blue-500/50 to-transparent mx-2 shadow-[0_0_10px_#3b82f6]"></div>
                            <SignalCard data={getIntersection("East")} />
                            <SignalCard data={getIntersection("West")} />
                        </div>
                    </div>
                </div>

                {/* Cross-Module Integration Row */}
                <div className="grid grid-cols-2 gap-6 mt-auto">
                    {/* Accidents Integration */}
                    <div className="bg-black/20 rounded-3xl border border-white/5 p-5 backdrop-blur-sm shadow-inner group transition-all hover:bg-black/30">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-red-500" />
                            Live Anomaly Map (Accidents)
                        </h3>
                        {accidents.filter(a => a.resolved_status === "Active").length > 0 ? (
                            <div className="space-y-3 max-h-32 overflow-y-auto custom-scrollbar pr-2">
                                {accidents.filter(a => a.resolved_status === "Active").map(acc => (
                                    <div key={acc.id} className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex justify-between items-center animate-pulse">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                            <div>
                                                <div className="text-sm font-bold text-red-400">Crash in {acc.lane_id}</div>
                                                <div className="text-[10px] text-gray-400 font-mono text-opacity-80">Severity: {acc.severity}</div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-20 text-xs font-bold text-green-500/50 border border-dashed border-white/10 rounded-xl bg-white/5">
                                Zero Active Incidents
                            </div>
                        )}
                    </div>

                    {/* Smart Parking Integration */}
                    <div className="bg-black/20 rounded-3xl border border-white/5 p-5 backdrop-blur-sm shadow-inner group transition-all hover:bg-black/30">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <CarFront className="w-4 h-4 text-blue-400" />
                            Smart Parking Occupancy
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            {parking.length > 0 ? parking.slice(0, 4).map(slot => (
                                <div key={slot.id} className="bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col items-center justify-center relative overflow-hidden">
                                    {/* Background fill based on occupancy text trick */}
                                    <div className="absolute inset-x-0 bottom-0 bg-blue-500/20" style={{ height: slot.status.replace('% Occupied', '') + '%' }}></div>
                                    <div className="text-[10px] text-gray-400 uppercase font-bold z-10">{slot.slot_id}</div>
                                    <div className="text-lg font-black text-cyan-300 z-10">{slot.status}</div>
                                </div>
                            )) : (
                                <div className="col-span-2 flex items-center justify-center h-20 text-xs font-bold text-gray-500 border border-dashed border-white/10 rounded-xl bg-white/5">
                                    No Parking Sensors Active
                                </div>
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

// Signal Card Component with Neon Glow
const SignalCard = ({ data }) => (
    <div className={`flex flex-col items-center justify-center p-5 bg-slate-800/40 rounded-3xl border 
        ${data.signal === 'Green'
            ? 'border-green-500/50 shadow-[0_0_30px_-5px_rgba(34,197,94,0.3)] bg-gradient-to-b from-green-900/10 to-transparent'
            : 'border-white/5 shadow-lg bg-white/5'} 
        w-full max-w-[150px] transition-all duration-500 backdrop-blur-md group hover:-translate-y-1`}>

        <div className="mb-5 transform scale-100 group-hover:scale-105 transition-transform duration-300">
            <TrafficLight
                label={data.label}
                signal={data.signal}
                timer={data.timer}
            />
        </div>
        <div className="w-full flex flex-col gap-2 px-1">
            <div className="flex justify-between items-center text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                <span>Queue</span>
                <span className="font-mono text-white text-xs">{data.queue_len ? Math.round(data.queue_len) : 0}m</span>
            </div>
            {/* Prediction Indicator */}
            <div className="flex justify-between items-center text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                <span>Pred.</span>
                <span className="font-mono text-cyan-400 text-xs drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]">+{Math.round((data.queue_len || 0) * 0.1)}m</span>
            </div>
        </div>
    </div>
);

export default Surveillance;
