import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

import { User } from './types';
import { ConfigProvider } from './context/ConfigContext';
import { getCurrentUser, logoutUser, initializeStorage, setCurrentUser as updateStoredUser } from './utils/localStorage';

initializeStorage();

import Loading from './components/common/Loading';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      setCurrentUser(user);
      setIsAuthenticated(true);
    }
    // Simulate a minimum loading time for smoother UX
    setTimeout(() => {
      setIsLoading(false);
      const splash = document.getElementById('splash-screen');
      if (splash) {
        splash.classList.add('splash-fade-out');
        setTimeout(() => splash.remove(), 500);
      }
    }, 300);

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'midas_user' && !e.newValue) {
        setCurrentUser(null);
        setIsAuthenticated(false);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    logoutUser();
    setCurrentUser(null);
    setIsAuthenticated(false);
  };

  const handleUpdateUser = (updatedUser: User) => {
    setCurrentUser(updatedUser);
    updateStoredUser(updatedUser);
  };

  if (isLoading) {
    return <Loading />;
  }

  return (
    <ConfigProvider>
      <Routes>
        <Route path="/login" element={!isAuthenticated ? <Login onLogin={handleLogin} /> : <Navigate to="/" replace />} />
        <Route path="/*" element={isAuthenticated && currentUser ? <Dashboard user={currentUser} onLogout={handleLogout} onUpdateUser={handleUpdateUser} /> : <Navigate to="/login" state={{ from: location }} replace />} />
      </Routes>
    </ConfigProvider>
  );
}

export default App;
