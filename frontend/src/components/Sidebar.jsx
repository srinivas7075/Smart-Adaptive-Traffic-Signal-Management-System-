import React from 'react';
import { LayoutDashboard, Video, Car, TriangleAlert, ParkingCircle, FileText, BarChart3, Settings, User, LogOut } from 'lucide-react';
import authService from '../services/authService';

const Sidebar = ({ activeTab, setActiveTab }) => {
    const menuItems = [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard, color: 'text-purple-400' },
        { id: 'surveillance', label: 'Surveillance', icon: Video, color: 'text-cyan-400' },
        { id: 'echallan', label: 'E-Challan', icon: FileText, color: 'text-yellow-400' },
    ];

    return (
        <div className="w-64 bg-slate-900/80 backdrop-blur-xl border-r border-white/10 flex flex-col h-full shrink-0 shadow-2xl z-20">
            {/* Logo Area */}
            <div className="h-20 flex items-center gap-4 px-6 border-b border-white/5 bg-gradient-to-r from-transparent to-white/5">
                <div className="relative">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-400 to-blue-600 flex items-center justify-center shrink-0 shadow-lg shadow-cyan-500/30">
                        <Car className="text-white w-6 h-6" />
                    </div>
                    <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-slate-900 rounded-full"></span>
                </div>
                <div>
                    <h1 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400 tracking-tight">Smart Traffic</h1>
                    <p className="text-[10px] text-gray-400 font-medium tracking-widest uppercase">Control System</p>
                </div>
            </div>

            {/* Menu */}
            <div className="flex-1 py-6 px-4 space-y-2 overflow-y-auto custom-scrollbar">
                <p className="px-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4">Dashboards</p>
                {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 text-sm font-semibold relative overflow-hidden group ${isActive
                                ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/25 scale-105'
                                : 'text-gray-400 hover:bg-white/5 hover:text-white'
                                }`}
                        >
                            {/* Hover Effect */}
                            {!isActive && <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>}

                            <Icon className={`w-5 h-5 transition-colors ${isActive ? 'text-white' : item.color} group-hover:text-white`} />
                            <span className="relative">{item.label}</span>
                            {isActive && <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>}
                        </button>
                    );
                })}
            </div>

            {/* Bottom User Area */}
            <div className="p-4 border-t border-white/5 bg-black/20">
                <button
                    onClick={() => { authService.logout(); window.location.reload(); }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-gradient-to-r from-gray-800 to-gray-900 border border-white/5 hover:border-white/10 transition-all group relative overflow-hidden text-left"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center text-gray-400 group-hover:text-red-400 transition-colors border border-white/5">
                        <User className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0 text-left relative">
                        <p className="text-sm font-bold text-white truncate capitalize">{authService.getCurrentUser()?.role || "User"}</p>
                        <p className="text-[10px] text-indigo-400 truncate group-hover:text-red-400 transition-colors tracking-widest uppercase">Logout</p>
                    </div>
                    <LogOut className="w-5 h-5 text-gray-500 group-hover:text-red-400 transition-colors relative" />
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
