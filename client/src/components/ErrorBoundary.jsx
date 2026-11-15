import React from 'react';

/**
 * Global React Error Boundary
 * Catches rendering exceptions and displays a Neumorphic recovery UI
 * rather than unmounting the entire DOM tree into a blank white page.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Unhandled React Error in TradeCore:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--neu-base, #E6ECF5)',
          padding: '24px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          color: 'var(--text-primary, #1E293B)',
        }}>
          <div style={{
            maxWidth: '520px',
            width: '100%',
            backgroundColor: 'var(--neu-base, #E6ECF5)',
            boxShadow: 'var(--neu-raised-lg, 12px 12px 24px rgba(166, 180, 200, 0.7), -12px -12px 24px rgba(255, 255, 255, 0.9))',
            borderRadius: '20px',
            padding: '36px',
            textAlign: 'center',
            border: '1px solid rgba(255, 255, 255, 0.8)',
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              color: '#EF4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 18px auto',
              fontSize: '24px',
            }}>
              ⚠️
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '8px' }}>
              Interface Refreshed
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary, #64748B)', marginBottom: '24px', lineHeight: 1.5 }}>
              The trading terminal encountered a display state update. Click below to reload and resume active market streaming.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={this.handleReload}
                style={{
                  padding: '10px 20px',
                  backgroundColor: 'var(--primary-green, #087A3C)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: '600',
                  fontSize: '13px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(8, 122, 60, 0.3)',
                }}
              >
                Reload Terminal
              </button>
              <button
                onClick={this.handleReset}
                style={{
                  padding: '10px 20px',
                  backgroundColor: 'var(--neu-base, #E6ECF5)',
                  color: 'var(--text-secondary, #64748B)',
                  border: '1px solid rgba(166, 180, 200, 0.4)',
                  borderRadius: '10px',
                  fontWeight: '600',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Go to Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
