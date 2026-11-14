import React from 'react';
import { Inbox } from 'lucide-react';

export default function EmptyState({ icon: Icon = Inbox, title = 'No records found', message, action }) {
  return (
    <div style={{
      padding: '48px 24px',
      textAlign: 'center',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--neu-base)',
      borderRadius: 'var(--radius-md)',
      boxShadow: 'var(--neu-inset)',
      border: '1px solid rgba(255, 255, 255, 0.4)',
      margin: '16px 0',
    }}>
      <div style={{
        width: '54px',
        height: '54px',
        borderRadius: 'var(--radius-full)',
        backgroundColor: 'var(--neu-base)',
        border: '1px solid rgba(255, 255, 255, 0.8)',
        boxShadow: 'var(--neu-raised-sm)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-muted)',
        marginBottom: '14px',
      }}>
        <Icon size={24} />
      </div>
      <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px', letterSpacing: '-0.01em' }}>
        {title}
      </h3>
      {message && (
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '400px', marginBottom: '18px', lineHeight: '1.5' }}>
          {message}
        </p>
      )}
      {action}
    </div>
  );
}

