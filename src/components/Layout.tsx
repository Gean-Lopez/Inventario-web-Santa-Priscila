import { Link, Outlet, useLocation } from 'react-router-dom';
import { Monitor, PlusCircle, BarChart3, Download } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export default function Layout() {
  const location = useLocation();

  const navItems = [
    { name: 'Listado', path: '/', icon: Monitor },
    { name: 'Nuevo Equipo', path: '/add', icon: PlusCircle },
    { name: 'Dashboard', path: '/stats', icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.22),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.16),_transparent_24%),linear-gradient(to_bottom,_#020617,_#0f172a)]" />

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

            <a
              href="/api/export"
              className="hidden sm:inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white transition-all hover:border-indigo-400/40 hover:bg-indigo-500/15"
            >
              <Download className="h-4 w-4" />
              Exportar Excel
            </a>
          </div>
        </div>
      </header>

      <nav className="sticky top-[72px] z-30 border-b border-white/15 bg-slate-950/70 backdrop-blur-xl">
        <div className="mx-auto w-full max-w-[1320px] px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-2 py-3">
            {navItems.map(item => {
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

            <a
              href="/api/export"
              className="inline-flex sm:hidden items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition-all hover:border-white/25 hover:bg-white/15"
            >
              <Download className="h-4 w-4" />
              Exportar Excel
            </a>
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
