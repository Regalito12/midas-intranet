
interface EmptyStateProps {
    title: string;
    message: string;
    icon?: string;
    actionLabel?: string;
    onAction?: () => void;
    className?: string;
}

function EmptyState({
    title,
    message,
    icon = 'fa-folder-open',
    actionLabel,
    onAction,
    className = ''
}: EmptyStateProps) {
    return (
        <div className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className} fade-in`}>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-full p-6 mb-4 relative group">
                <div className="absolute inset-0 bg-primary opacity-10 rounded-full group-hover:scale-110 transition-transform duration-500"></div>
                <i className={`fas ${icon} text-4xl text-primary relative z-10`}></i>
            </div>
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">{title}</h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-sm mb-6">{message}</p>

            {actionLabel && onAction && (
                <button
                    onClick={onAction}
                    className="btn-midas px-6 py-2 rounded-lg font-semibold flex items-center space-x-2 group"
                >
                    <i className="fas fa-plus transform group-hover:rotate-90 transition-transform"></i>
                    <span>{actionLabel}</span>
                </button>
            )}
        </div>
    );
}

export default EmptyState;
