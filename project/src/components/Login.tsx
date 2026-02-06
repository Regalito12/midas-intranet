import { useState, useRef } from 'react';
import { User } from '../types';
import { showToast } from '../utils/toast';
import { setCurrentUser } from '../utils/localStorage';
import api from '../services/api';
import ReCAPTCHA from 'react-google-recaptcha';

interface LoginProps {
  onLogin?: (user: User) => void;
}


function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isResetting] = useState(false);
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username || !password) {
      showToast('Por favor complete todos los campos', 'error');
      return;
    }

    // Verificar reCAPTCHA
    /*
    const recaptchaValue = recaptchaRef.current?.getValue();
    if (!recaptchaValue) {
      showToast('Por favor demuestra que no eres un robot 🤖', 'error');
      return;
    }
    */

    setIsLoading(true);
    try {
      const response = await api.post('/auth/login', {
        username,
        password
      });
      const { user, accessToken, refreshToken } = response.data;

      if (user && accessToken) {
        // Guardamos usuario y tokens (enterprise)
        setCurrentUser(user);
        localStorage.setItem('accessToken', accessToken);
        if (refreshToken) {
          localStorage.setItem('refreshToken', refreshToken);
        }

        showToast('¡Bienvenido! Has iniciado sesión correctamente.', 'success');
        if (onLogin) {
          onLogin(user);
        }
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || error.response?.data?.message || 'Error al iniciar sesión';
      const errorCode = error.response?.data?.error?.code;

      showToast(`${errorMessage} ${errorCode ? `(${errorCode})` : ''}`, 'error');

      // Reset reCAPTCHA on error
      recaptchaRef.current?.reset();
    }

    setIsLoading(false);
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();

    if (!resetEmail) {
      showToast('Por favor ingresa tu email', 'error');
      return;
    }

    // Simular envío de correo de recuperación
    showToast(`Se ha enviado un enlace de recuperación a ${resetEmail}`, 'info');
    setShowForgotPassword(false);
    setResetEmail('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-[#0066CC] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md fade-in border border-gray-100">
        <div className="text-center mb-8">
          <div className="inline-block mb-4">
            <img
              src="/midas-logo.png"
              alt="MIDAS Dominicana"
              className="h-16 w-auto mx-auto"
            />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Intranet Corporativa</h2>
          <p className="text-gray-600">Accede a tu espacio de trabajo</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Usuario
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <i className="fas fa-user text-gray-400"></i>
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition bg-white text-gray-900"
                placeholder="Ingrese su usuario"
                disabled={isLoading}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Contraseña
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <i className="fas fa-lock text-gray-400"></i>
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition bg-white text-gray-900"
                placeholder="Ingrese su contraseña"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              >
                <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              </button>
            </div>
          </div>

          {/* reCAPTCHA Widget (Oculto en túneles para evitar errores de dominio) */}
          <div className="flex justify-center">
            <ReCAPTCHA
              ref={recaptchaRef}
              sitekey="6LcbQSAsAAAAAJk2_9LoViS3TrEmrQRxF0a-lspk"
              theme="light"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary text-white font-semibold py-3 px-4 rounded-lg hover:bg-[#009640] transition-all duration-300 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed btn-midas"
          >
            {isLoading ? (
              <>
                <i className="fas fa-spinner fa-spin"></i>
                <span>Iniciando sesión...</span>
              </>
            ) : (
              <>
                <i className="fas fa-sign-in-alt"></i>
                <span>Iniciar Sesión</span>
              </>
            )}
          </button>
        </form>

        <div className="text-center mt-4">
          <button
            onClick={() => setShowForgotPassword(true)}
            className="text-primary hover:text-[#009640] text-sm underline"
          >
            ¿Olvidaste tu contraseña?
          </button>
        </div>

        {showForgotPassword && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 fade-in">
            <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md border border-gray-100">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Restablecer Contraseña</h2>
                <p className="text-gray-600">Ingresa tu email para recibir un enlace de reset</p>
              </div>

              <form onSubmit={handleResetPassword} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <i className="fas fa-envelope text-gray-400"></i>
                    </div>
                    <input
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition bg-white text-gray-900"
                      placeholder="tu@email.com"
                      disabled={isResetting}
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isResetting}
                  className="w-full bg-primary text-white font-semibold py-3 px-4 rounded-lg hover:bg-[#009640] transition-all duration-300 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isResetting ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i>
                      <span>Enviando...</span>
                    </>
                  ) : (
                    <>
                      <i className="fas fa-paper-plane"></i>
                      <span>Enviar Email de Reset</span>
                    </>
                  )}
                </button>
              </form>

              <div className="text-center mt-4">
                <button
                  onClick={() => setShowForgotPassword(false)}
                  className="text-gray-600 hover:text-gray-800 text-sm underline"
                >
                  Volver al login
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Login;
