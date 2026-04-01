import React from 'react';

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('AppErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="app-container" style={{ zIndex: 10, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card-face" style={{ width: '100%', maxWidth: '560px', padding: '2rem', textAlign: 'center' }}>
            <h2 style={{ color: 'var(--text-light)', marginBottom: '0.8rem' }}>Hoppla, da ist etwas schiefgelaufen.</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.1rem' }}>Bitte lade die Seite neu.</p>
            <button className="btn-primary" onClick={() => window.location.reload()}>
              Seite neu laden
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default AppErrorBoundary;
