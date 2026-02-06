import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';

interface Config {
    company_name: string;
    company_logo: string;
    primary_color: string;
    secondary_color: string;
    allowed_ip_range?: string;
}

interface ConfigContextType {
    config: Config;
    refreshConfig: () => Promise<void>;
    loading: boolean;
}

const defaultConfig: Config = {
    company_name: 'MIDAS Intranet',
    company_logo: '',
    primary_color: 'var(--primary-color)',
    secondary_color: '#0F172A',
    allowed_ip_range: '',
};

const ConfigContext = createContext<ConfigContextType>({
    config: defaultConfig,
    refreshConfig: async () => { },
    loading: true,
});

export const ConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [config, setConfig] = useState<Config>(defaultConfig);
    const [loading, setLoading] = useState(true);

    const fetchConfig = async () => {
        try {
            const response = await api.get('/config');
            if (response.data) {
                setConfig(response.data);
                // Aplicar colores CSS variables para uso global
                document.documentElement.style.setProperty('--primary-color', response.data.primary_color);
                document.documentElement.style.setProperty('--secondary-color', response.data.secondary_color);
            }
        } catch (error) {
            console.error('Error fetching config:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConfig();
    }, []);

    return (
        <ConfigContext.Provider value={{ config, refreshConfig: fetchConfig, loading }}>
            {children}
        </ConfigContext.Provider>
    );
};

export const useConfig = () => useContext(ConfigContext);
