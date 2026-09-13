import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] p-6">
          <div className="max-w-md w-full rounded-[var(--radius-card)] border border-[var(--status-critical-border)] bg-[var(--status-critical-bg)] p-6">
            <h1 className="text-lg font-semibold text-[var(--status-critical)] mb-2">
              Something went wrong
            </h1>
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              {this.state.error?.message || 'An unexpected error occurred.'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-[var(--radius-btn)] bg-[var(--accent-teal)] hover:bg-[var(--accent-teal-hover)] text-white text-sm font-medium transition"
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
