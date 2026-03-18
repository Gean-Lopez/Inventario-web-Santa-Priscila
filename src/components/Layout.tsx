import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Monitor,
  PlusCircle,
  BarChart3,
  Download,
  LogIn,
  LogOut,
  Shield,
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useEffect, useMemo, useRef, useState } from 'react';

export function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

function parseJwt(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => `%${('00' + c.charCodeAt(0).toString(16)).slice(-2)}`)
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();

  const [showLogin, setShowLogin] = useState(false);
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [logging, setLogging] = useState(false);
  const [error, setError] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  const logoutTimer = useRef<number | null>(null);

  const handleLogout = (expired = false) => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('username');
    setIsAdmin(false);

    if (logoutTimer.current) {
      window.clearTimeout(logoutTimer.current);
      logoutTimer.current = null;
    }

    if (expired) {
      sessionStorage.setItem(
        'session_expired_message',
        'La sesión de administrador expiró. Inicia sesión nuevamente.'
      );
      window.location.reload();
      return;
    }

    window.location.reload();
  };

  useEffect(() => {
    const flashMessage = sessionStorage.getItem('session_expired_message');

    if (flashMessage) {
      setError(flashMessage);
      setShowLogin(true);
      sessionStorage.removeItem('session_expired_message');
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');

    if (logoutTimer.current) {
      window.clearTimeout(logoutTimer.current);
      logoutTimer.current = null;
    }

    if (!token || role !== 'admin') {
      setIsAdmin(false);
      return;
    }

    const decoded = parseJwt(token);

    if (!decoded?.exp) {
      handleLogout(true);
      return;
    }

    const expiresAt = decoded.exp * 1000;
    const remaining = expiresAt - Date.now();

    if (remaining <= 0) {
      handleLogout(true);
      navigate('/');
      return;
    }

    setIsAdmin(true);

    logoutTimer.current = window.setTimeout(() => {
      handleLogout(true);
      navigate('/');
    }, remaining);

    return () => {
      if (logoutTimer.current) {
        window.clearTimeout(logoutTimer.current);
        logoutTimer.current = null;
      }
    };
  }, [location.pathname, showLogin, navigate]);

  const navItems = useMemo(
    () => [
      { name: 'Listado', path: '/', icon: Monitor },
      ...(isAdmin ? [{ name: 'Nuevo Equipo', path: '/add', icon: PlusCircle }] : []),
      { name: 'Dashboard', path: '/stats', icon: BarChart3 },
    ],
    [isAdmin]
  );

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLogging(true);
    setError('');

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || 'Error al iniciar sesión');
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('role', data.user.role);
      localStorage.setItem('username', data.user.username);

      setIsAdmin(true);
      setShowLogin(false);
      setPassword('');

      window.location.reload();
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLogging(false);
    }
  };

  const baseInputClass =
    'mt-2 h-11 w-full rounded-2xl border border-slate-700/70 bg-slate-950/70 px-4 text-sm text-slate-100 placeholder:text-slate-500 transition focus:border-blue-400/60 focus:outline-none focus:ring-4 focus:ring-blue-500/10';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.12),_transparent_26%),linear-gradient(to_bottom,_#0b1220,_#0f172a_42%,_#111827)]" />

      {showLogin && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-sm"
          onClick={() => setShowLogin(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl shadow-black/40"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-500/10 text-blue-200">
                <Shield className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-lg font-semibold text-white">Login administrador</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Acceso para crear, editar, eliminar, importar, exportar y ver el script.
                </p>
              </div>
            </div>

            {error && (
              <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-200">Usuario</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={baseInputClass}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-200">Contraseña</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={baseInputClass}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLogin(false)}
                  className="flex-1 rounded-2xl border border-slate-700 bg-slate-800/80 px-4 py-3 text-sm font-medium text-slate-100 transition hover:border-slate-600 hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={logging}
                  className="flex-1 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-blue-500 disabled:opacity-50"
                >
                  {logging ? 'Ingresando...' : 'Iniciar sesión'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-40 border-b border-slate-800/90 bg-slate-950/90 backdrop-blur-xl">
        <div className="mx-auto w-full max-w-[1360px] px-4 sm:px-6 lg:px-8">
          <div className="flex min-h-[74px] items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-700 bg-slate-900 text-blue-200 shadow-lg shadow-black/20">
                <Monitor className="h-5 w-5" />
              </div>

              <div>
                <span className="block text-[11px] font-medium uppercase tracking-[0.22em] text-slate-400">
                  Sistema
                </span>
                <span className="text-lg font-semibold tracking-tight text-white">
                  Inventario Equipos
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {isAdmin ? (
                <div className="hidden rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-200 sm:block">
                  Admin: {localStorage.getItem('username') || 'admin'}
                </div>
              ) : null}

              {isAdmin ? (
                <button
                  onClick={() => handleLogout(false)}
                  className="inline-flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-200 transition hover:bg-red-500/15"
                >
                  <LogOut className="h-4 w-4" />
                  Cerrar sesión
                </button>
              ) : (
                <button
                  onClick={() => {
                    setError('');
                    setShowLogin(true);
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500"
                >
                  <LogIn className="h-4 w-4" />
                  Admin login
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <nav className="sticky top-[74px] z-30 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto w-full max-w-[1360px] px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-2 py-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                location.pathname === item.path ||
                (item.path !== '/' && location.pathname.startsWith(item.path));

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'border border-blue-500/30 bg-blue-500/15 text-blue-100'
                      : 'border border-slate-700 bg-slate-900 text-slate-100 hover:border-slate-600 hover:bg-slate-800'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.name}
                </Link>
              );
            })}

            {isAdmin && (
              <a
                href="/api/export"
                className="inline-flex sm:hidden items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-100 transition hover:border-slate-600 hover:bg-slate-800"
              >
                <Download className="h-4 w-4" />
                Exportar Excel
              </a>
            )}
          </div>
        </div>
      </nav>

      <main className="mx-auto w-full max-w-[1360px] px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded-[28px] border border-slate-800 bg-slate-900/80 shadow-2xl shadow-black/20">
          <div className="p-4 sm:p-5 lg:p-6">
            <Outlet />
          </div>
        </section>
      </main>

      <footer className="px-4 py-6 text-center text-xs text-slate-500 sm:px-6 lg:px-8">
        © {new Date().getFullYear()} Inventario Equipos · Santa Priscila
      </footer>
    </div>
  );
}
