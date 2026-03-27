import React, { useState } from 'react';
import authService from '../services/authService';

const Login = ({ onLoginSuccess }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await authService.login(username, password);
            onLoginSuccess();
            // Intentionally not setting loading to false here to avoid unmounted component state updates
        } catch (err) {
            setError(err.message || 'Authentication failed. Please check your credentials or system status.');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#070b14] flex font-sans text-gray-100 selection:bg-cyan-500/30">
            {/* Left Column: Branding and Information */}
            <div className="hidden lg:flex lg:w-1/2 relative bg-slate-900 border-r border-cyan-500/20 flex-col justify-between p-12 overflow-hidden">
                {/* Background Grid Pattern for infrastructure feel */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#06b6d4 1px, transparent 1px), linear-gradient(90deg, #06b6d4 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px]"></div>

                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-10">
                        <div className="w-10 h-10 bg-cyan-500 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.5)]">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-slate-900" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                        </div>
                        <h1 className="text-sm font-bold tracking-widest text-cyan-400 uppercase">Secure Access Node</h1>
                    </div>

                    <h2 className="text-4xl font-extrabold leading-tight text-white mb-4 shadow-sm drop-shadow-md">
                        Smart Adaptive <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                            Traffic Signal
                        </span>
                        <br /> Management System
                    </h2>

                    <p className="text-slate-400 text-lg max-w-md border-l-2 border-cyan-500 pl-4 py-1">
                        AI-Powered Urban Traffic Control Platform
                    </p>
                </div>

                <div className="relative z-10 flex flex-col gap-2">
                    <p className="text-xs text-slate-500 font-mono">AUTHORIZED PERSONNEL ONLY</p>
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                        <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">Department of Science & Technology – Smart Automation</p>
                    </div>
                </div>
            </div>

            {/* Right Column: Login Card */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative">
                {/* System Status Indicators in top right */}
                <div className="absolute top-6 right-8 flex items-center gap-4">
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] font-mono text-slate-500 mb-1">v1.0.0-PROD</span>
                        <span className="px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-bold uppercase rounded-full flex items-center gap-2 shadow-[0_0_10px_rgba(6,182,212,0.1)]">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#06b6d4]"></span>
                            AI Engine Connected
                        </span>
                    </div>
                </div>

                <div className="w-full max-w-sm">
                    <div className="text-center mb-10 lg:hidden">
                        <div className="w-12 h-12 bg-cyan-500 rounded-lg mx-auto flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.5)] mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-slate-900" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                        </div>
                        <h2 className="text-xl font-bold text-white tracking-widest uppercase">Traffic Control</h2>
                    </div>

                    <div className="bg-slate-800/80 backdrop-blur-xl border border-slate-700/50 p-8 rounded-2xl shadow-2xl relative overflow-hidden">
                        {/* Top glowing accent line */}
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-70"></div>

                        <div className="mb-8">
                            <h3 className="text-2xl font-bold text-white mb-2">System Authenticate</h3>
                            <p className="text-sm text-slate-400">Enter your credentials to access the control network.</p>
                        </div>

                        {error && (
                            <div className="mb-6 bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-4 py-3 rounded-lg flex items-start gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                <span>{error}</span>
                            </div>
                        )}

                        <form onSubmit={handleLogin} className="space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2" htmlFor="username">Operator ID</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <svg className="h-5 w-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                    </div>
                                    <input
                                        type="text"
                                        id="username"
                                        className="w-full bg-slate-900/50 border border-slate-700 text-white rounded-lg pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-mono placeholder:text-slate-600"
                                        placeholder="ORG-US-8902"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest" htmlFor="password">Security Key</label>
                                    <a href="#" className="text-[10px] text-cyan-500 hover:text-cyan-400 hover:underline">Reset Key?</a>
                                </div>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <svg className="h-5 w-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                    </div>
                                    <input
                                        type="password"
                                        id="password"
                                        className="w-full bg-slate-900/50 border border-slate-700 text-white rounded-lg pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-mono placeholder:text-slate-600 tracking-widest"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className={`w-full mt-2 py-3 px-4 flex justify-center items-center gap-2 rounded-lg text-sm font-bold text-slate-900 uppercase tracking-widest transition-all ${loading ? 'bg-cyan-600/50 cursor-not-allowed text-slate-700' : 'bg-cyan-500 hover:bg-cyan-400 hover:shadow-[0_0_15px_rgba(6,182,212,0.4)]'}`}
                            >
                                {loading ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-slate-800" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                        Establishing Uplink...
                                    </>
                                ) : (
                                    'Initialize Connection'
                                )}
                            </button>
                        </form>
                    </div>

                    <div className="mt-8 text-center text-xs text-slate-600 font-mono">
                        <p>Warning: Access is restricted to authorized entities.</p>
                        <p>Unauthorized access attempts are logged and monitored.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
