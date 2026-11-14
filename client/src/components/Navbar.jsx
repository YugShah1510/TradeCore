import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { TrendingUp, ArrowRight, User } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import Logo from './Logo';

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header style={{
      backgroundColor: 'var(--neu-base)',
      borderBottom: '1px solid var(--border-main)',
      boxShadow: 'var(--neu-raised-sm)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <div style={{
        maxWidth: '1240px',
        margin: '0 auto',
        padding: '0 24px',
        height: '68px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        {/* Brand Logo */}
        <Link to="/" style={{ textDecoration: 'none' }}>
          <Logo size={38} withText textProps={{ fontSize: '19px' }} />
        </Link>

        {/* Public Navigation Links */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
          <a href="#mechanics" style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-secondary)' }}>
            Architecture
          </a>
          <Link to="/markets" style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-secondary)' }}>
            Markets
          </Link>
          <Link to="/order-book" style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-secondary)' }}>
            Live Order Book
          </Link>
        </nav>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <ThemeToggle />

          {isAuthenticated ? (
            <>
              <button 
                onClick={() => navigate('/dashboard')} 
                className="btn btn-primary"
              >
                Go to Dashboard
                <ArrowRight size={16} />
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-secondary">
                Log In
              </Link>
              <Link to="/register" className="btn btn-primary">
                Get $100k Virtual Cash
                <ArrowRight size={16} />
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

