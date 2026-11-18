import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { userApi } from '../services/api';
import {
  User,
  Shield,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  LogOut,
  Bell,
  HelpCircle,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react';

export default function SettingsPage() {
  const { user, refreshUser, logout } = useAuth();
  const { theme, setTheme, resolvedTheme } = useTheme();

  // Profile Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Notification Preferences
  const [orderFillNotifications, setOrderFillNotifications] = useState(true);
  const [marketDigest, setMarketDigest] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
    }
  }, [user]);

  // Handle profile update
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');

    if (!name.trim() || !email.trim()) {
      setProfileError('Name and email cannot be empty.');
      return;
    }

    try {
      setProfileLoading(true);
      const res = await userApi.updateProfile({ name, email });
      if (res.success) {
        setProfileSuccess('Profile information updated successfully.');
        await refreshUser();
      }
    } catch (err) {
      setProfileError(err.message || 'Failed to update profile.');
    } finally {
      setProfileLoading(false);
    }
  };

  // Handle password update
  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!currentPassword || !newPassword) {
      setPasswordError('Please provide both current and new passwords.');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    try {
      setPasswordLoading(true);
      const res = await userApi.updatePassword({ currentPassword, newPassword, confirmNewPassword });
      if (res.success) {
        setPasswordSuccess('Password changed successfully.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
      }
    } catch (err) {
      setPasswordError(err.message || 'Failed to update password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">
          Account & Terminal Settings
        </h1>
        <p className="page-subtitle">
          Manage your personal credentials, simulation security, and account preferences.
        </p>
      </div>

      {/* Profile Information Card */}
      <div className="card" style={{ padding: '28px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <User size={20} color="var(--primary-green)" />
          <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>
            Personal Profile Details
          </h2>
        </div>

        {profileSuccess && (
          <div className="glass-alert glass-alert-success">
            <CheckCircle2 size={16} />
            <span style={{ fontSize: '13px' }}>{profileSuccess}</span>
          </div>
        )}

        {profileError && (
          <div className="glass-alert glass-alert-danger">
            <AlertCircle size={16} />
            <span style={{ fontSize: '13px' }}>{profileError}</span>
          </div>
        )}

        <form onSubmit={handleUpdateProfile}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                type="text"
                className="form-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Member since: {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Active'}
            </span>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={profileLoading}
            >
              {profileLoading ? 'Saving Changes...' : 'Save Profile Changes'}
            </button>
          </div>
        </form>
      </div>

      {/* Security & Password Card */}
      <div className="card" style={{ padding: '28px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <KeyRound size={20} color="var(--primary-green)" />
          <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>
            Change Password
          </h2>
        </div>

        {passwordSuccess && (
          <div className="glass-alert glass-alert-success">
            <CheckCircle2 size={16} />
            <span style={{ fontSize: '13px' }}>{passwordSuccess}</span>
          </div>
        )}

        {passwordError && (
          <div className="glass-alert glass-alert-danger">
            <AlertCircle size={16} />
            <span style={{ fontSize: '13px' }}>{passwordError}</span>
          </div>
        )}

        <form onSubmit={handleUpdatePassword}>
          <div className="form-group">
            <label className="form-label">Current Password</label>
            <input
              type="password"
              className="form-input"
              placeholder="Enter existing password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <input
                type="password"
                className="form-input"
                placeholder="At least 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <input
                type="password"
                className="form-input"
                placeholder="Repeat new password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
            <button
              type="submit"
              className="btn btn-secondary"
              disabled={passwordLoading}
            >
              {passwordLoading ? 'Updating Password...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>

      {/* Interface Appearance & Color Scheme Card */}
      <div className="card" style={{ padding: '28px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
          <Sun size={20} color="var(--primary-green)" />
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>
              Appearance & Color Scheme
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Choose your preferred visual theme. Currently active: <strong style={{ color: 'var(--primary-green)', textTransform: 'capitalize' }}>{resolvedTheme}</strong>
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
          <button
            type="button"
            onClick={() => setTheme('system')}
            className={`glass-segmented-btn ${theme === 'system' ? 'active-buy' : ''}`}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
              padding: '16px',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <Monitor size={22} />
            <span style={{ fontSize: '13px', fontWeight: '700' }}>System Default</span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Follow OS preference</span>
          </button>

          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`glass-segmented-btn ${theme === 'light' ? 'active-buy' : ''}`}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
              padding: '16px',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <Sun size={22} color="#F59E0B" />
            <span style={{ fontSize: '13px', fontWeight: '700' }}>Light Neumorphic</span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Soft pastel canvas</span>
          </button>

          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`glass-segmented-btn ${theme === 'dark' ? 'active-buy' : ''}`}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
              padding: '16px',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <Moon size={22} color="#6366F1" />
            <span style={{ fontSize: '13px', fontWeight: '700' }}>Dark Neumorphic</span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Deep obsidian relief</span>
          </button>
        </div>
      </div>

      {/* Simulation Preferences & Disclaimers */}
      <div className="card" style={{ padding: '28px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
          <Bell size={20} color="var(--primary-green)" />
          <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>
            Simulation Preferences
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <label className="apple-toggle-label">
            <div>
              <div style={{ fontSize: '14px', fontWeight: '600' }}>Order Fill Notifications</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Display visual alerts whenever a resting limit order is partially or fully filled.
              </div>
            </div>
            <div className="apple-switch">
              <input
                type="checkbox"
                checked={orderFillNotifications}
                onChange={(e) => setOrderFillNotifications(e.target.checked)}
              />
              <span className="apple-slider"></span>
            </div>
          </label>

          <label className="apple-toggle-label">
            <div>
              <div style={{ fontSize: '14px', fontWeight: '600' }}>Simulated Daily Digest</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Receive portfolio performance summaries and market volatility recaps.
              </div>
            </div>
            <div className="apple-switch">
              <input
                type="checkbox"
                checked={marketDigest}
                onChange={(e) => setMarketDigest(e.target.checked)}
              />
              <span className="apple-slider"></span>
            </div>
          </label>
        </div>
      </div>

      {/* Danger Zone / Log Out Card */}
      <div className="glass-card-danger">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--color-sell)' }}>
              Sign Out of Session
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Clear active session tokens and securely return to the public login screen.
            </p>
          </div>
          <button
            onClick={logout}
            className="btn btn-danger"
            style={{ padding: '9px 18px' }}
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

