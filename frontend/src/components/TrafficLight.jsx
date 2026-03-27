import React from 'react';

const TrafficLight = ({ signal, timer, label }) => {
    const isRed = signal === 'Red';
    const isYellow = signal === 'Yellow';
    const isGreen = signal === 'Green';

    return (
        <div className="flex flex-col items-center group">
            <h3 className="text-gray-400 font-bold mb-2 tracking-widest uppercase text-[10px] group-hover:text-white transition-colors">{label}</h3>
            <div className="flex flex-col gap-2 bg-slate-900/90 p-2.5 rounded-full border border-white/10 shadow-lg backdrop-blur-sm group-hover:border-white/20 transition-colors">
                <div className={`w-8 h-8 rounded-full transition-all duration-300 ${isRed ? 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.6)] scale-110' : 'bg-red-950/30 opacity-40'}`} />
                <div className={`w-8 h-8 rounded-full transition-all duration-300 ${isYellow ? 'bg-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.6)] scale-110' : 'bg-yellow-950/30 opacity-40'}`} />
                <div className={`w-8 h-8 rounded-full transition-all duration-300 ${isGreen ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.6)] scale-110' : 'bg-green-950/30 opacity-40'}`} />
            </div>
            <div className={`mt-3 text-xl font-mono font-bold drop-shadow-md ${isRed ? 'text-red-400' : isYellow ? 'text-yellow-400' : 'text-emerald-400'}`}>
                {timer}s
            </div>
        </div>
    );
};

export default TrafficLight;
