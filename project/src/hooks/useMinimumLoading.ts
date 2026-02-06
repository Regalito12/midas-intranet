import { useState, useCallback } from 'react';

/**
 * Custom hook that ensures a minimum loading time for better UX.
 * Prevents the loading state from flashing too quickly.
 * 
 * @param minLoadingTime - Minimum time in ms to show loading (default: 500ms)
 * @returns [isLoading, setLoadingWithMinTime, startLoading]
 */
export function useMinimumLoading(minLoadingTime: number = 500) {
    const [isLoading, setIsLoading] = useState(true);
    const [loadingStartTime, setLoadingStartTime] = useState<number>(Date.now());

    const startLoading = useCallback(() => {
        setIsLoading(true);
        setLoadingStartTime(Date.now());
    }, []);

    const stopLoading = useCallback(() => {
        const elapsedTime = Date.now() - loadingStartTime;
        const remainingTime = Math.max(0, minLoadingTime - elapsedTime);

        if (remainingTime > 0) {
            setTimeout(() => setIsLoading(false), remainingTime);
        } else {
            setIsLoading(false);
        }
    }, [loadingStartTime, minLoadingTime]);

    return { isLoading, startLoading, stopLoading };
}

/**
 * Simpler version: wraps an async function to ensure minimum loading time
 */
export async function withMinimumLoading<T>(
    asyncFn: () => Promise<T>,
    setLoading: (loading: boolean) => void,
    minTime: number = 400
): Promise<T> {
    const startTime = Date.now();
    setLoading(true);

    try {
        const result = await asyncFn();
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, minTime - elapsed);

        if (remaining > 0) {
            await new Promise(resolve => setTimeout(resolve, remaining));
        }

        return result;
    } finally {
        setLoading(false);
    }
}
