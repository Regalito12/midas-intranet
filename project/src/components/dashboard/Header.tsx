import { useState, useEffect } from 'react';
import { Bell, Search, Menu, LogOut, User as UserIcon, Sun, Moon, X, Check } from 'lucide-react';
import { User, Module } from '../../types';
import { Avatar } from '../common/Avatar';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../services/api';

interface HeaderProps {
  user: User;
  onLogout: () => void;
  onMenuToggle: () => void;
  onNavigate: (module: Module) => void;
}

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  related_id?: number;
}

interface SearchResult {
  id: string;
  title: string;
  subtitle: string;
  avatar?: string;
  type: 'employee' | 'news' | 'policy';
  url: string;
}

function Header({ user, onLogout, onMenuToggle, onNavigate }: HeaderProps) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  // Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);

  const { isDark, toggleTheme } = useTheme();

  const handleSearch = async (term: string) => {
    try {
      const response = await api.get(`/search?q=${term}`);
      setSearchResults(response.data);
      setShowResults(true);
    } catch (error) {
      console.error('Search error:', error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Refetch cada 60 segundos
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoadingNotifications(true);
      const response = await api.get('/notifications');
      setNotifications(response.data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      // Si falla la API, mostrar notificaciones vacías
      setNotifications([]);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const markAsRead = async (id: number) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev =>
        prev.map(n => ({ ...n, is_read: true }))
      );
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'request': return 'fa-shopping-cart';
      case 'ticket': return 'fa-headset';
      case 'news': return 'fa-newspaper';
      case 'payroll': return 'fa-money-bill-wave';
      default: return 'fa-bell';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'request': return 'bg-yellow-500';
      case 'ticket': return 'bg-purple-500';
      case 'news': return 'bg-green-500';
      case 'payroll': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Ahora mismo';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays < 7) return `Hace ${diffDays}d`;
    return date.toLocaleDateString('es-DO', { month: 'short', day: 'numeric' });
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm.length >= 2) {
        handleSearch(searchTerm);
      } else {
        setSearchResults([]);
        setShowResults(false);
      }
    }, 400); // 400ms debounce

    return () => clearTimeout(timer);
  }, [searchTerm]);

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 z-30 transition-colors duration-300">
      <div className="h-full px-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuToggle}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg lg:hidden transition-colors"
          >
            <Menu className="w-6 h-6 text-gray-600 dark:text-gray-300" />
          </button>

          <div className="flex items-center gap-3 cursor-pointer" onClick={() => onNavigate('home')}>
            <img
              src="/midas-icon.png"
              alt="MIDAS"
              className="h-10 w-auto"
            />
            <span className="text-xl font-bold text-[#2D3748] dark:text-white hidden sm:block">
              MIDAS <span className="text-gray-500 dark:text-gray-400 text-sm font-normal">Dominicana</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <div className="hidden md:flex flex-col relative" style={{ zIndex: 100 }}>
            <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-2 w-64 transition-colors">
              <Search className="w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar (min 2 letras)..."
                className="bg-transparent border-none outline-none ml-2 text-sm w-full text-gray-700 dark:text-gray-200 placeholder-gray-400"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => {
                  if (searchResults.length > 0) setShowResults(true);
                }}
                onBlur={() => setTimeout(() => setShowResults(false), 300)}
              />
            </div>

            {showResults && searchResults.length > 0 && (
              <div className="absolute top-full left-0 w-full mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden" style={{ zIndex: 9999 }}>
                {searchResults.map((result) => (
                  <button
                    key={`${result.type}-${result.id}`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      onNavigate(result.url as Module || 'home');
                      setShowResults(false);
                      setSearchTerm('');
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-50 dark:border-gray-700 last:border-0 flex items-center gap-3 transition-colors"
                  >
                    {result.avatar ? (
                      <img src={result.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                        <i className={`fas ${result.type === 'policy' ? 'fa-file-alt' : 'fa-search'} text-gray-500 text-xs`}></i>
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">{result.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{result.subtitle}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {showResults && searchResults.length === 0 && searchTerm.length >= 2 && (
              <div className="absolute top-full left-0 w-full mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-100 dark:border-gray-700 p-4 text-center" style={{ zIndex: 9999 }}>
                <p className="text-xs text-gray-500">No se encontraron resultados</p>
              </div>
            )}
          </div>

          <button
            onClick={toggleTheme}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors relative"
            title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          >
            {isDark ? (
              <Sun className="w-5 h-5 text-yellow-400" />
            ) : (
              <Moon className="w-5 h-5 text-gray-600" />
            )}
          </button>

          {/* Notifications Button */}
          <div className="relative">
            <button
              onClick={() => {
                setIsNotificationsOpen(!isNotificationsOpen);
                setIsProfileOpen(false);
              }}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors relative"
            >
              <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 rounded-full text-white text-xs font-bold flex items-center justify-center border-2 border-white dark:border-gray-800">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {isNotificationsOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setIsNotificationsOpen(false)}
                />
                <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 z-20 animate-in fade-in slide-in-from-top-2 duration-200 max-h-[70vh] flex flex-col">
                  {/* Header */}
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                      <Bell className="w-4 h-4" />
                      Notificaciones
                      {unreadCount > 0 && (
                        <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full">
                          {unreadCount} nuevas
                        </span>
                      )}
                    </h3>
                    <div className="flex items-center gap-2">
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllAsRead}
                          className="text-xs text-primary hover:text-[#009640] font-semibold flex items-center gap-1"
                        >
                          <Check className="w-3 h-3" />
                          Marcar todas
                        </button>
                      )}
                      <button
                        onClick={() => setIsNotificationsOpen(false)}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Notifications List */}
                  <div className="flex-1 overflow-y-auto">
                    {loadingNotifications ? (
                      <div className="p-8 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto"></div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Cargando...</p>
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="p-8 text-center">
                        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
                          <Bell className="w-8 h-8 text-gray-400" />
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 font-medium">No hay notificaciones</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          Te avisaremos cuando haya algo nuevo
                        </p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100 dark:divide-gray-700">
                        {notifications.map((notification) => (
                          <div
                            key={notification.id}
                            onClick={() => !notification.is_read && markAsRead(notification.id)}
                            className={`px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-750 transition cursor-pointer ${!notification.is_read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                              }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`${getNotificationColor(notification.type)} w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0`}>
                                <i className={`fas ${getNotificationIcon(notification.type)} text-white text-sm`}></i>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <p className={`font-semibold text-sm ${!notification.is_read ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                                    {notification.title}
                                  </p>
                                  {!notification.is_read && (
                                    <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1.5"></span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                                  {notification.message}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                  {formatTimeAgo(notification.created_at)}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => {
                setIsProfileOpen(!isProfileOpen);
                setIsNotificationsOpen(false);
              }}
              className="flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 p-1.5 rounded-lg transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-600"
            >
              <div className="rounded-full shadow-md">
                <Avatar
                  src={user?.avatar}
                  name={user?.name || 'Usuario'}
                  size="sm"
                />
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-200 leading-none">{user?.name || 'Usuario'}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{user?.position || (user?.role === 'admin' ? 'Administrador' : 'Empleado')}</p>
              </div>
            </button>

            {isProfileOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setIsProfileOpen(false)}
                />
                <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 py-2 z-20 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 md:hidden">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.name || 'Usuario'}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email || 'Sin email'}</p>
                  </div>

                  <button
                    onClick={() => {
                      onNavigate('profile');
                      setIsProfileOpen(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors"
                  >
                    <UserIcon className="w-4 h-4" />
                    Mi Perfil
                  </button>

                  <div className="my-1 border-t border-gray-100 dark:border-gray-700"></div>

                  <button
                    onClick={onLogout}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Cerrar Sesión
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;

