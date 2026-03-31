import React from 'react';

class QuizErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("QuizErrorBoundary caught an error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="app-container" style={{ zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', width: '100vw' }}>
          <div className="card-face" style={{ width: '100%', maxWidth: '600px', padding: '3rem', margin: '0 auto', background: 'rgba(50, 0, 0, 0.5)', backdropFilter: 'blur(16px)', borderRadius: '24px', border: '1px solid rgba(255,100,100,0.3)', textAlign: 'center' }}>
            <h2 style={{ color: '#ff6b6b', marginBottom: '1rem', fontSize: '2rem' }}>Oops! Ein unerwarteter Fehler im Quiz</h2>
            <p style={{ color: 'var(--text-light)', marginBottom: '1.5rem', lineHeight: '1.5' }}>
              Wir konnten die nächste Frage nicht laden. Der Fehler wurde protokolliert.
            </p>

            <pre style={{ textAlign: 'left', background: 'var(--bg-dark)', padding: '1rem', borderRadius: '12px', fontSize: '0.8rem', color: '#ff8a8a', overflowX: 'auto', marginBottom: '1.5rem', whiteSpace: 'pre-wrap', maxHeight: '200px', overflowY: 'auto' }}>
              {this.state.error && this.state.error.toString()}
              {"\n"}
              {this.state.errorInfo && this.state.errorInfo.componentStack}
            </pre>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <button 
                  className="btn-primary" 
                  onClick={() => { 
                    this.setState({ hasError: false, error: null, errorInfo: null }); 
                    if (this.props.onReset) this.props.onReset();
                  }}
                >
                  Zurück zum Dashboard
                </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default QuizErrorBoundary;
