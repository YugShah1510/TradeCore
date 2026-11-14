import React from 'react';
import { NavLink } from 'react-router-dom';
import Logo from './Logo';
import {
  LayoutDashboard,
  TrendingUp,
  ArrowLeftRight,
  BookOpen,
  PieChart,
  FileText,
  History,
  BarChart3,
  Settings,
  ShieldAlert,
} from 'lucide-react';

export default function Sidebar() {
  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Markets', path: '/markets', icon: TrendingUp },
    { label: 'Trade', path: '/trade', icon: ArrowLeftRight },
    { label: 'Order Book', path: '/order-book', icon: BookOpen },
    { label: 'Portfolio', path: '/portfolio', icon: PieChart },
    { label: 'Orders', path: '/orders', icon: FileText },
    { label: 'Trade History', path: '/history', icon: History },
    { label: 'Analytics', path: '/analytics', icon: BarChart3 },
    { label: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <aside style={{
      width: '240px',
      backgroundColor: 'var(--neu-base)',
      borderRight: '1px solid var(--border-main)',
      boxShadow: 'var(--neu-raised-sm)',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      position: 'sticky',
      top: 0,
      flexShrink: 0,
    }}>
      {/* Brand Header */}
      <div style={{
        padding: '20px 24px',
        borderBottom: '1px solid var(--border-main)',
        display: 'flex',
        alignItems: 'center',
      }}>
        <Logo size={34} withText textProps={{ fontSize: '18px' }} />
      </div>

      {/* Navigation Links */}
      <nav style={{ padding: '16px 12px', flex: 1, overflowY: 'auto' }}>
        <div style={{
          fontSize: '11px',
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: 'var(--text-light)',
          padding: '0 12px 8px',
        }}>
          Main Menu
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '13px',
                  fontWeight: isActive ? '700' : '500',
                  color: isActive ? 'var(--primary-green)' : 'var(--text-secondary)',
                  backgroundColor: 'var(--neu-base)',
                  boxShadow: isActive ? 'var(--neu-inset-sm)' : 'none',
                  border: isActive ? '1px solid var(--border-light)' : '1px solid transparent',
                  transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                })}
              >
                <Icon size={17} strokeWidth={2} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>

      {/* Educational Notice Banner */}
      <div className="glass-panel" style={{
        padding: '14px',
        margin: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', color: 'var(--primary-green)' }}>
          <ShieldAlert size={16} />
          <span style={{ fontSize: '12px', fontWeight: '700' }}>Simulated Engine</span>
        </div>
        <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
          All trades and funds are virtual. No real money or live exchange execution involved.
        </p>
      </div>
    </aside>
  );
}

