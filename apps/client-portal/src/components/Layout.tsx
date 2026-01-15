import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutGrid, BookOpen, ShieldAlert, BarChart3, LogOut, CreditCard } from 'lucide-react';
import { useAuthStore } from '../store/auth';

export function Layout() {
    const { user, logout } = useAuthStore();
    const navigate = useNavigate();

    const handleLogout = () => { logout(); navigate('/login'); };

    const navItems = [
        { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/works', icon: BookOpen, label: 'Minhas Obras' },
        { to: '/detections', icon: Search, label: 'Detecções' },
        { to: '/reports', icon: FileText, label: 'Relatórios' },
    ];

    return (
        <div className="app-layout">
            <aside className="sidebar">
                <div className="sidebar-header">
                    <div className="sidebar-logo"><Shield size={24} />ProtecLiter</div>
                </div>
                <nav className="sidebar-nav">
                    {/* Replaced navItems.map with hardcoded Link components as per instruction */}
                    <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} end={true}>
                        <LayoutGrid size={20} />
                        Dashboard
                    </NavLink>
                    <NavLink to="/works" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                        <BookOpen size={20} />
                        Minhas Obras
                    </NavLink>
                    <NavLink to="/detections" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                        <ShieldAlert size={20} />
                        Detecções
                    </NavLink>
                    <NavLink to="/reports" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                        <BarChart3 size={20} />
                        Relatórios
                    </NavLink>
                    <NavLink to="/subscription" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                        <CreditCard size={20} />
                        Assinatura
                    </NavLink>
                </nav>
                <div className="user-menu">
                    <div className="user-info">
                        <div className="user-avatar">{user?.name.charAt(0).toUpperCase() || 'U'}</div>
                        <div style={{ flex: 1 }}>
                            <div className="user-name">{user?.name || 'Cliente'}</div>
                            <div className="user-role">Cliente</div>
                        </div>
                        <button onClick={handleLogout} className="btn btn-secondary btn-sm" title="Sair"><LogOut size={16} /></button>
                    </div>
                </div>
            </aside>
            <main className="main-content"><Outlet /></main>
        </div>
    );
}
