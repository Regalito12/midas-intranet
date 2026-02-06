/**
 * Footer component with MIDAS Dominicana branding
 */

export default function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-4 px-6 mt-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <img
                        src="/midas-icon.png"
                        alt="MIDAS"
                        className="h-8 w-auto"
                    />
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                        <span className="font-semibold text-gray-800 dark:text-white">MIDAS Dominicana</span>
                        <span className="mx-2">•</span>
                        <span>Intranet Corporativa v1.0</span>
                    </div>
                </div>

                <div className="text-xs text-gray-500 dark:text-gray-500 text-center sm:text-right">
                    <p>© {currentYear} MIDAS Dominicana. Todos los derechos reservados.</p>
                </div>
            </div>
        </footer>
    );
}
