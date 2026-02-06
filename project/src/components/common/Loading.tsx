
export default function Loading() {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-4">
            <div className="relative">
                {/* Logo/Icon container */}
                <div className="w-24 h-24 bg-white dark:bg-gray-800 rounded-2xl shadow-lg flex items-center justify-center mb-8 relative overflow-hidden">
                    <div className="absolute inset-0 bg-primary opacity-10 animate-pulse"></div>
                    <img
                        src="/midas-icon.png"
                        alt="MIDAS Dominicana"
                        className="w-16 h-16 object-contain relative z-10"
                    />
                </div>

                {/* Spinner ring */}
                <div className="absolute -inset-4 border-4 border-gray-200 dark:border-gray-700 rounded-full opacity-30"></div>
                <div className="absolute -inset-4 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>

            <div className="text-center space-y-2 mt-4">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">Cargando MIDAS</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Preparando tu espacio de trabajo...</p>
            </div>
        </div>
    );
}
