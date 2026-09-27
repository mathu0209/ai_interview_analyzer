import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  onReset: () => void;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(err: Error): State {
    return { hasError: true, message: err.message || 'Something went wrong' };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-8 text-center max-w-md">
            <p className="text-4xl mb-4">!</p>
            <p className="text-slate-700 font-semibold mb-2">Something went wrong</p>
            <p className="text-sm text-slate-500 mb-6">{this.state.message}</p>
            <button
              onClick={() => {
                this.setState({ hasError: false, message: '' });
                this.props.onReset();
              }}
              className="px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 transition-all shadow-md"
            >
              Back to Setup
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
