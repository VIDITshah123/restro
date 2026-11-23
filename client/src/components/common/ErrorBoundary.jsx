import React from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/admin/tables';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0a0a0a] text-gray-200 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-[#121212] border border-amber-500/20 rounded-2xl p-8 shadow-2xl text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <AlertTriangle className="text-amber-500" size={28} />
            </div>

            <h2 className="text-xl font-serif font-black text-white mb-2">
              Something went wrong
            </h2>
            <p className="text-gray-400 text-sm mb-6 leading-relaxed">
              An unexpected error occurred while rendering this section. You can reload the page or navigate back to the tables view.
            </p>

            {this.state.error?.message && (
              <div className="mb-6 p-3 bg-red-950/20 border border-red-500/20 rounded-xl text-xs text-red-300 font-mono text-left overflow-auto max-h-24">
                {this.state.error.message}
              </div>
            )}

            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReload}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-bold text-sm transition-colors cursor-pointer"
              >
                <RotateCcw size={16} />
                Reload Page
              </button>
              <button
                onClick={this.handleGoHome}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-semibold text-sm border border-white/10 transition-colors cursor-pointer"
              >
                <Home size={16} />
                Go to Tables
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
