import { useState, useEffect } from 'react';
import { BASE_URL } from '../../services/api';

interface AvatarProps {
    src?: string | null;
    name: string;
    className?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
    showStatus?: boolean;
    isOnline?: boolean;
}

export function Avatar({ src, name, className = '', size = 'md', showStatus = false, isOnline = false }: AvatarProps) {
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        setHasError(false);
    }, [src]);

    const getFullImageUrl = (url: string | null | undefined) => {
        if (!url) return null;
        if (url.startsWith('http')) return url;
        if (url.startsWith('data:')) return url;

        // Si es un nombre de archivo relativo del sistema (avatar- o optimized-avatar-)
        if (url.includes('avatar-')) {
            // Asegurar que use el prefijo de optimized si el archivo existe (o simplemente intentar la ruta de uploads)
            const filename = url.startsWith('optimized-') ? url : url;
            return `${BASE_URL}/uploads/${filename}`;
        }

        return url;
    };

    const imageUrl = getFullImageUrl(src);

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(part => part[0])
            .slice(0, 2)
            .join('')
            .toUpperCase();
    };

    const getBgColor = (name: string) => {
        const colors = [
            'bg-red-500',
            'bg-blue-500',
            'bg-green-500',
            'bg-yellow-500',
            'bg-purple-500',
            'bg-pink-500',
            'bg-indigo-500',
            'bg-teal-500'
        ];
        const index = name.length % colors.length;
        return colors[index];
    };

    const getSizeClasses = () => {
        switch (size) {
            case 'sm': return 'w-8 h-8 text-xs';
            case 'md': return 'w-10 h-10 text-sm';
            case 'lg': return 'w-16 h-16 text-lg';
            case 'xl': return 'w-20 h-20 text-xl';
            case '2xl': return 'w-24 h-24 text-2xl';
            default: return 'w-10 h-10 text-sm';
        }
    };

    return (
        <div className={`relative inline-block ${className}`}>
            <div
                className={`${getSizeClasses()} rounded-full flex items-center justify-center font-bold text-white shadow-sm overflow-hidden border-2 ${showStatus
                    ? (isOnline ? 'border-primary' : 'border-gray-200 dark:border-gray-700')
                    : 'border-transparent'
                    } ${!src || hasError ? getBgColor(name) : 'bg-gray-100 dark:bg-gray-800'}`}
            >
                {imageUrl && !hasError ? (
                    <img
                        src={imageUrl}
                        alt={name}
                        className="w-full h-full object-cover"
                        onError={() => setHasError(true)}
                    />
                ) : (
                    <span>{getInitials(name)}</span>
                )}
            </div>

            {showStatus && isOnline && (
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-primary border-2 border-white dark:border-gray-800 rounded-full"></div>
            )}
        </div>
    );
}
