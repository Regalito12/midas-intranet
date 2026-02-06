import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  es: {
    translation: {
      'Welcome': 'Bienvenido',
      'Login': 'Iniciar SesiÃ³n',
      'Logout': 'Cerrar SesiÃ³n',
      'Search': 'Buscar',
      'Notifications': 'Notificaciones',
      'Profile': 'Perfil',
      'Settings': 'ConfiguraciÃ³n',
      'News': 'Noticias',
      'Events': 'Eventos',
      'Home': 'Inicio',
      'Forgot Password?': 'Â¿Olvidaste tu contraseÃ±a?',
      'Email': 'Email',
      'Password': 'ContraseÃ±a',
      'Enter your email': 'Ingrese su email',
      'Enter your password': 'Ingrese su contraseÃ±a',
      'Search in intranet...': 'Buscar en la intranet...',
      'Corporate Intranet': 'Intranet Corporativa',
      'No results found': 'No se encontraron resultados',
      'Loading...': 'Cargando...',
      'Error loading data': 'Error al cargar datos',
      'Toggle theme': 'Cambiar tema',
      'Language': 'Idioma',
    },
  },
  en: {
    translation: {
      'Welcome': 'Welcome',
      'Login': 'Login',
      'Logout': 'Logout',
      'Search': 'Search',
      'Notifications': 'Notifications',
      'Profile': 'Profile',
      'Settings': 'Settings',
      'News': 'News',
      'Events': 'Events',
      'Home': 'Home',
      'Forgot Password?': 'Forgot Password?',
      'Email': 'Email',
      'Password': 'Password',
      'Enter your email': 'Enter your email',
      'Enter your password': 'Enter your password',
      'Search in intranet...': 'Search in intranet...',
      'Corporate Intranet': 'Corporate Intranet',
      'No results found': 'No results found',
      'Loading...': 'Loading...',
      'Error loading data': 'Error loading data',
      'Toggle theme': 'Toggle theme',
      'Language': 'Language',
    },
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: localStorage.getItem('language') || 'es',
    fallbackLng: 'es',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
