import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Monitor, PlusCircle, BarChart3, Download, LogIn, LogOut, Shield } from 'lucide-react';
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
      setError('La sesión de administrador expiró. Inicia sesión nuevamente.');
      setShowLogin(true);
      return;
    }
  
    window.location.reload();
  };
  

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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.22),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.16),_transparent_24%),linear-gradient(to_bottom,_#020617,_#0f172a)]" />

      {showLogin && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/85 px-4 backdrop-blur-sm"
          onClick={() => setShowLogin(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-white/15 bg-slate-900 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-200">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Login administrador</h2>
                <p className="text-sm text-slate-300">
                  Solo para crear, editar, eliminar, importar, exportar y ver script
                </p>
              </div>
            </div>

            {error && (
              <div className="mb-4 rounded-2xl border border-red-500/25 bg-red-500/15 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-100">Usuario</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="mt-2 h-11 w-full rounded-2xl border border-white/15 bg-white/[0.08] px-4 text-sm text-white focus:border-indigo-400/50 focus:outline-none focus:ring-4 focus:ring-indigo-500/15"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-100">Contraseña</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-2 h-11 w-full rounded-2xl border border-white/15 bg-white/[0.08] px-4 text-sm text-white focus:border-indigo-400/50 focus:outline-none focus:ring-4 focus:ring-indigo-500/15"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLogin(false)}
                  className="flex-1 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/15"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={logging}
                  className="flex-1 rounded-2xl bg-gradient-to-r from-indigo-500 to-blue-500 px-4 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
                >
                  {logging ? 'Ingresando...' : 'Iniciar sesión'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-40 border-b border-white/15 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto w-full max-w-[1320px] px-4 sm:px-6 lg:px-8">
          <div className="flex min-h-[72px] items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-indigo-400/30 bg-gradient-to-br from-indigo-500/25 to-blue-500/10 shadow-[0_0_30px_rgba(99,102,241,0.18)]">
                <Monitor className="h-5 w-5 text-indigo-200" />
              </div>

              <div>
                <span className="block text-[11px] font-medium uppercase tracking-[0.25em] text-slate-300">
                  Sistema
                </span>
                <span className="text-lg font-semibold tracking-tight text-white">
                  Inventario Equipos
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {isAdmin ? (
                <div className="hidden rounded-xl border border-emerald-500/25 bg-emerald-500/15 px-3 py-2 text-xs font-medium text-emerald-200 sm:block">
                  Admin: {localStorage.getItem('username') || 'admin'}
                </div>
              ) : null}

              {isAdmin && (
                <a
                  href="/api/export"
                  className="hidden sm:inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white transition-all hover:border-indigo-400/40 hover:bg-indigo-500/15"
                >
                  <Download className="h-4 w-4" />
                  Exportar CSV
                </a>
              )}

              {isAdmin ? (
                <button
                  onClick={() => handleLogout(false)}
                  className="inline-flex items-center gap-2 rounded-xl border border-red-500/25 bg-red-500/15 px-4 py-2 text-sm font-medium text-red-200 transition hover:bg-red-500/20"
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
                  className="inline-flex items-center gap-2 rounded-xl border border-indigo-400/25 bg-indigo-500/15 px-4 py-2 text-sm font-medium text-indigo-100 transition hover:bg-indigo-500/20"
                >
                  <LogIn className="h-4 w-4" />
                  Admin login
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <nav className="sticky top-[72px] z-30 border-b border-white/15 bg-slate-950/70 backdrop-blur-xl">
        <div className="mx-auto w-full max-w-[1320px] px-4 sm:px-6 lg:px-8">
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
                      ? 'bg-gradient-to-r from-indigo-500 to-blue-500 text-white shadow-lg shadow-indigo-900/30'
                      : 'border border-white/15 bg-white/10 text-white hover:border-white/25 hover:bg-white/15'
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
                className="inline-flex sm:hidden items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition-all hover:border-white/25 hover:bg-white/15"
              >
                <Download className="h-4 w-4" />
                Exportar CSV
              </a>
            )}
          </div>
        </div>
      </nav>

      <main className="mx-auto w-full max-w-[1320px] px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded-3xl border border-white/15 bg-white/[0.06] shadow-2xl shadow-black/20 backdrop-blur-xl">
          <div className="p-4 sm:p-5 lg:p-6">
            <Outlet />
          </div>
        </section>
      </main>

      <footer className="px-4 py-6 text-center text-xs text-slate-300 sm:px-6 lg:px-8">
        © {new Date().getFullYear()} Inventario Equipos · Santa Priscila
      </footer>
    </div>
  );
}
