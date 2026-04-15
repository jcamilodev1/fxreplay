import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error,
      errorInfo,
    });
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-[#050608]">
          <div className="max-w-md p-8 bg-[#151921] border border-[#f43f5e]/30 rounded-2xl text-center">
            <h2 className="text-xl font-bold text-[#f43f5e] mb-4">Algo salió mal</h2>
            <p className="text-slate-400 mb-4">
              Ha ocurrido un error inesperado. Por favor, recarga la página.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg transition-colors"
            >
              Recargar página
            </button>
            {import.meta.env.DEV && this.state.error && (
              <details className="mt-4 p-4 bg-black/30 rounded-lg text-left">
                <summary className="text-xs text-slate-500 cursor-pointer">Detalles del error (dev)</summary>
                <pre className="mt-2 text-xs text-red-400 overflow-auto max-h-40">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
