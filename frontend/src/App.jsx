import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Overview from './components/Overview';
import Surveillance from './components/Surveillance';
import EChallan from './components/EChallan';
import AuthLayout from './components/AuthLayout';

function App() {
  const [activeTab, setActiveTab] = useState('overview');

  // ---- Global Traffic State ----
  const [trafficData, setTrafficData] = useState({
    intersections: [
      { id: 1, label: "North", signal: "Red", timer: 0, vehicle_count: 0, queue_len: 0, density: 0 },
      { id: 2, label: "South", signal: "Red", timer: 0, vehicle_count: 0, queue_len: 0, density: 0 },
      { id: 3, label: "East", signal: "Red", timer: 0, vehicle_count: 0, queue_len: 0, density: 0 },
      { id: 4, label: "West", signal: "Red", timer: 0, vehicle_count: 0, queue_len: 0, density: 0 },
    ]
  });

  const [videoProgress, setVideoProgress] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const videoFeedUrl = "http://127.0.0.1:8080/video_feed";

  // ---- Data Polling ----
  useEffect(() => {
    // Reset Backend Simulation on Load
    fetch('http://127.0.0.1:8080/reset', { method: 'POST' }).catch(err => console.error(err));

    const fetchData = async () => {
      try {
        const res = await fetch('http://127.0.0.1:8080/status');
        if (res.ok) {
          const data = await res.json();
          if (data && data.intersections) {
            setTrafficData(data);
          }
        }

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
    const interval = setInterval(fetchData, 500);
    return () => clearInterval(interval);
  }, [isSeeking]);

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
    <AuthLayout>
      <div className="flex min-h-screen bg-slate-900 font-sans text-gray-100 selection:bg-cyan-500/30">
        {/* Sidebar */}
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-h-screen relative">

          {/* Ambient Background Glow */}
          <div className="absolute top-0 left-0 w-full h-full pointer-events-none fixed">
            <div className="absolute top-[-10%] left-[20%] w-[30%] h-[30%] bg-blue-600/20 rounded-full blur-[120px]"></div>
            <div className="absolute bottom-[-10%] right-[20%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[150px]"></div>
          </div>

          {/* Top Header */}
          <div className="h-20 flex items-center justify-between px-8 shrink-0 relative z-10">
            <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-200 to-gray-400 capitalize drop-shadow-sm tracking-tight">{activeTab}</h2>
            <div className="flex items-center gap-6">
              <span className="text-[10px] font-bold px-3 py-1.5 bg-green-500/10 text-green-400 rounded-full border border-green-500/20 flex items-center gap-2 shadow-[0_0_10px_rgba(74,222,128,0.1)]">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse shadow-[0_0_8px_#4ade80]"></span>
                SYSTEM ONLINE
              </span>
              <div className="text-right">
                <p className="text-xs font-bold text-gray-300">{new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                <p className="text-[10px] text-gray-500 font-mono tracking-wider">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </div>
          </div>

          {/* Dynamic View */}
          <div className="flex-1 p-0 relative z-10 flex flex-col">
            {activeTab === 'overview' && <Overview />}
            {activeTab === 'surveillance' && (
              <Surveillance
                trafficData={trafficData}
                videoFeedUrl={videoFeedUrl}
                videoProgress={videoProgress}
                setVideoProgress={setVideoProgress}
                isSeeking={isSeeking}
                setIsSeeking={setIsSeeking}
                handleSeek={handleSeek}
              />
            )}
            {activeTab === 'echallan' && <EChallan />}
          </div>

        </div>
      </div>
    </AuthLayout>
  )
}

export default App;

