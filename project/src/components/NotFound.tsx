
import { Link } from 'react-router-dom';

function NotFound() {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-4">
            <div className="relative mb-8">
                <div className="absolute inset-0 bg-primary opacity-20 blur-3xl rounded-full"></div>
                <h1 className="relative text-9xl font-black text-gray-200 dark:text-gray-800 drop-shadow-sm select-none">404</h1>
                <div className="absolute inset-0 flex items-center justify-center">
                    <i className="fas fa-search text-6xl text-primary animate-bounce"></i>
                </div>
            </div>

            <div className="text-center z-10">
                <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">Página no encontrada</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-8 text-lg max-w-md mx-auto">
                    La página que buscas no existe o ha sido movida.
                </p>

                <div className="relative inline-block group hover-lift">
                    <Link
                        to="/"
                        className="px-8 py-4 bg-primary text-white rounded-xl shadow-lg shadow-primary/30 flex items-center space-x-3 transition-all hover:bg-[#009640]"
                    >
                        <i className="fas fa-home text-xl"></i>
                        <span className="font-bold text-lg">Volver al Inicio</span>
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default NotFound;
