import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    console.error('[ErrorBoundary] Uncaught React Error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F6F8FB] flex items-center justify-center p-6 select-none font-sans">
          <div className="max-w-xl w-full bg-white border border-[#E5E7EB] rounded-[10px] shadow-lg p-8 space-y-6">
            <div className="flex items-start gap-4 text-red-500">
              <div className="p-3 bg-red-50 rounded-full shrink-0 border border-red-100 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h1 className="text-lg font-black text-gray-900 tracking-tight">Application Render Error</h1>
                <p className="text-xs font-semibold text-gray-500">An unexpected React rendering exception has crashed the view tree.</p>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Error Stack Trace</span>
              <div className="bg-[#F6F8FB] border border-[#E5E7EB] rounded-[6px] p-4 font-mono text-[10px] text-red-700 overflow-auto max-h-[220px] whitespace-pre-wrap select-text leading-relaxed">
                {this.state.error?.toString()}
                {"\n"}
                {this.state.errorInfo?.componentStack}
              </div>
            </div>

            <div className="flex items-center gap-3 pt-3 border-t border-[#E5E7EB]">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-[#2F80ED] hover:bg-[#1B6FD1] text-white text-xs font-bold rounded-[6px] transition-colors cursor-pointer focus:outline-none flex items-center gap-1.5 shadow-sm"
              >
                <RotateCw className="w-3.5 h-3.5" /> Reload Application
              </button>
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null, errorInfo: null });
                  window.location.hash = '/dashboard';
                  window.location.reload();
                }}
                className="px-4 py-2 bg-white border border-[#E5E7EB] hover:bg-[#F6F8FB] text-gray-700 text-xs font-bold rounded-[6px] transition-colors cursor-pointer focus:outline-none flex items-center gap-1.5"
              >
                <Home className="w-3.5 h-3.5" /> Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
