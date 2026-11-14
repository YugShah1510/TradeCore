import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Wallet, Lock, LogOut, User as UserIcon } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

export default function Header() {
  const { user, logout } = useAuth();

  const availableCash = user?.cashAccount ? user.cashAccount.availableBalance : 100000;
  const reservedCash = user?.cashAccount ? user.cashAccount.reservedBalance : 0;

  return (
    <header style={{
      height: '64px',
      backgroundColor: 'var(--neu-base)',
      borderBottom: '1px solid var(--border-main)',
      boxShadow: 'var(--neu-raised-sm)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 28px',
      position: 'sticky',
      top: 0,
      zIndex: 50,
    }}>
      {/* Left: Quick simulated cash ticker — Neumorphic Extruded Capsules */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '7px 16px',
          backgroundColor: 'var(--neu-base)',
          borderRadius: 'var(--radius-full)',
          boxShadow: 'var(--neu-raised-sm)',
          border: '1px solid var(--border-light)',
        }}>
          <Wallet size={15} color="var(--primary-green)" />
          <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>
            Available Cash:
          </span>
          <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--primary-green)', fontFamily: 'var(--font-mono)' }}>
            ${parseFloat(availableCash).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        {reservedCash > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '7px 16px',
            backgroundColor: 'var(--neu-base)',
            borderRadius: 'var(--radius-full)',
            boxShadow: 'var(--neu-raised-sm)',
            border: '1px solid var(--border-light)',
          }}>
            <Lock size={14} color="var(--color-warning)" />
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>
              Reserved:
            </span>
            <span style={{ fontSize: '14px', fontWeight: '700', color: '#B45309', fontFamily: 'var(--font-mono)' }}>
              ${parseFloat(reservedCash).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        )}
      </div>

      {/* Right: User identity and Logout */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'var(--neu-base)',
            boxShadow: 'var(--neu-raised-sm)',
            border: '1px solid var(--border-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-secondary)',
          }}>
            <UserIcon size={18} />
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>
              {user?.name || 'Simulator User'}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {user?.email || ''}
            </div>
          </div>
        </div>

        <ThemeToggle />

        <button
          onClick={logout}
          className="btn btn-secondary"
          style={{
            padding: '7px 14px',
            fontSize: '12px',
          }}
        >
          <LogOut size={14} />
          Log Out
        </button>
      </div>
    </header>
  );
}

