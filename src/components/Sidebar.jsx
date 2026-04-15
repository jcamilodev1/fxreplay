import { useState, useEffect } from 'react';
import { Activity, LayoutDashboard, BarChart3, History, Settings, PanelLeftClose, PanelLeftOpen, LogOut, Menu, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

const Sidebar = ({ onOpenSettings }) => {
  const [collapsed, setCollapsed] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  // Close mobile sidebar on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setMobileOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const handleNavClick = () => {
    if (window.innerWidth <= 768) {
      setMobileOpen(false);
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="logo-area">
          <div className="logo-icon">
            <Activity className="text-white" size={collapsed && !mobileOpen ? 20 : 24} />
          </div>
          {(!collapsed || mobileOpen) && (
            <div className="brand-name">
              <h1>FX Replay</h1>
              <p>Backtesting Pro</p>
            </div>
          )}
        </div>

        <nav className="nav-section">
          <div className="nav-link active" title="Dashboard" onClick={handleNavClick}>
            <LayoutDashboard size={18} />
            {(!collapsed || mobileOpen) && 'Dashboard'}
          </div>
          <div className="nav-link" title="Analizador" onClick={handleNavClick}>
            <BarChart3 size={18} />
            {(!collapsed || mobileOpen) && 'Analizador'}
          </div>
          <div className="nav-link" title="Historial" onClick={handleNavClick}>
            <History size={18} />
            {(!collapsed || mobileOpen) && 'Historial'}
          </div>
          <div
            className="nav-link cursor-pointer"
            title="Configuración"
            onClick={(e) => {
              handleNavClick();
              onOpenSettings();
            }}
          >
            <Settings size={18} />
            {(!collapsed || mobileOpen) && 'Configuración'}
          </div>
          <div className="nav-link text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 mt-auto cursor-pointer" title="Cerrar Sesión" onClick={() => { handleNavClick(); handleLogout(); }}>
            <LogOut size={18} />
            {(!collapsed || mobileOpen) && 'Cerrar Sesión'}
          </div>
        </nav>

        {(!collapsed || mobileOpen) && (
          <div className="sidebar-profile">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-linear-to-tr from-blue-500 to-purple-500 shrink-0" />
              <div>
                <div className="text-sm font-bold">Trader Pro</div>
                <div className="text-[10px] text-slate-400 uppercase tracking-tighter">Premium Plan</div>
              </div>
            </div>
            <button className="w-full py-2 bg-blue-600/20 text-blue-400 rounded-lg text-xs font-bold hover:bg-blue-600/30 transition-all border border-blue-500/20">
              Mejorar Plan
            </button>
          </div>
        )}

        {collapsed && !mobileOpen && (
          <div className="sidebar-profile-mini">
            <div className="w-10 h-10 rounded-full bg-linear-to-tr from-blue-500 to-purple-500" />
          </div>
        )}

        <button
          onClick={() => {
            if (window.innerWidth <= 768) {
              setMobileOpen(false);
            } else {
              setCollapsed(c => !c);
            }
          }}
          className="sidebar-toggle"
          title={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
        >
          {collapsed && !mobileOpen ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </aside>

      {/* Mobile toggle button */}
      <button
        onClick={() => setMobileOpen(o => !o)}
        className="md:hidden fixed top-3 left-3 z-50 p-2 bg-[#0a0c10]/80 border border-white/10 rounded-lg backdrop-blur-md text-white hover:bg-[#151921] transition-colors"
        aria-label="Toggle menu"
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>
    </>
  );
};

export default Sidebar;
