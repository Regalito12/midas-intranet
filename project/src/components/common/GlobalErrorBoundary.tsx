import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class GlobalErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    private handleReset = () => {
        // Clear all application data
        localStorage.clear();
        // Force reload
        window.location.href = '/';
    };

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                    <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center border border-gray-200">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i className="fas fa-exclamation-triangle text-2xl text-red-500"></i>
                        </div>
                        <h1 className="text-2xl font-bold text-gray-800 mb-2">Algo saliÃ³ mal</h1>
                        <p className="text-gray-600 mb-6">
                            La aplicación ha encontrado un error inesperado. Es posible que los datos guardados estén corruptos.
                        </p>

                        <div className="bg-gray-100 p-3 rounded-lg text-left mb-6 overflow-hidden">
                            <p className="text-xs font-mono text-gray-500 break-all">
                                {this.state.error?.message || 'Error desconocido'}
                            </p>
                        </div>

                        <button
                            onClick={this.handleReset}
                            className="w-full bg-primary text-white font-semibold py-3 px-4 rounded-lg hover:bg-[#009640] transition-colors flex items-center justify-center space-x-2"
                        >
                            <i className="fas fa-sync-alt"></i>
                            <span>Restaurar Sistema</span>
                        </button>
                        <p className="text-xs text-gray-400 mt-4">
                            Esto cerrará tu sesión y limpiará datos temporales para solucionar el problema.
                        </p>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default GlobalErrorBoundary;
