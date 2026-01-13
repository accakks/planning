import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Briefcase, LogOut } from 'lucide-react';

interface LayoutProps {
    children: React.ReactNode;
    onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, onLogout }) => {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
            <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex">
                            <div className="flex-shrink-0 flex items-center">
                                <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-rose-500 to-orange-500">
                                    Planning App
                                </span>
                            </div>
                            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                                <NavLink
                                    to="/"
                                    className={({ isActive }) =>
                                        `inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${isActive
                                            ? 'border-rose-500 text-slate-900'
                                            : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
                                        }`
                                    }
                                    end // Exact match for home
                                >
                                    <LayoutDashboard className="w-4 h-4 mr-2" />
                                    Dashboard
                                </NavLink>
                                <NavLink
                                    to="/work"
                                    className={({ isActive }) =>
                                        `inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${isActive
                                            ? 'border-indigo-500 text-slate-900'
                                            : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
                                        }`
                                    }
                                >
                                    <Briefcase className="w-4 h-4 mr-2" />
                                    Work
                                </NavLink>
                            </div>
                        </div>
                        <div className="flex items-center">
                            <button
                                onClick={onLogout}
                                className="p-2 rounded-md text-slate-400 hover:text-slate-500 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500"
                                title="Logout"
                            >
                                <LogOut className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="flex-grow">
                {children}
            </main>
        </div>
    );
};

export default Layout;
