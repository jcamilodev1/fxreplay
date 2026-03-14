import { useState } from 'react';
import { Activity, LayoutDashboard, BarChart3, History, Settings, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(true);

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <div className="logo-area">
        <div className="logo-icon">
          <Activity className="text-white" size={collapsed ? 20 : 24} />
        </div>
        {!collapsed && (
          <div className="brand-name">
            <h1>FX Replay</h1>
            <p>Backtesting Pro</p>
          </div>
        )}
      </div>

      <nav className="nav-section">
        <div className="nav-link active" title="Dashboard">
          <LayoutDashboard size={18} />
          {!collapsed && 'Dashboard'}
        </div>
        <div className="nav-link" title="Analizador">
          <BarChart3 size={18} />
          {!collapsed && 'Analizador'}
        </div>
        <div className="nav-link" title="Historial">
          <History size={18} />
          {!collapsed && 'Historial'}
        </div>
        <div className="nav-link" title="Configuración">
          <Settings size={18} />
          {!collapsed && 'Configuración'}
        </div>
      </nav>

      {!collapsed && (
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

      {collapsed && (
        <div className="sidebar-profile-mini">
          <div className="w-10 h-10 rounded-full bg-linear-to-tr from-blue-500 to-purple-500" />
        </div>
      )}

      <button
        onClick={() => setCollapsed(c => !c)}
        className="sidebar-toggle"
        title={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
      >
        {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
      </button>
    </aside>
  );
};

export default Sidebar;
