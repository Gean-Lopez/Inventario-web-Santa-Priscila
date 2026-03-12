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
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <header className="border-b border-slate-300 bg-slate-50">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Monitor className="h-6 w-6 text-slate-700" />
            <span className="text-lg font-semibold tracking-tight">Inventario Equipos</span>
          </div>
        </div>
      </header>

      <nav className="border-b border-slate-200 bg-white">
      <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 py-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'inline-flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-md transition-all',
                    isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.name}
                </Link>
              );
            })}
            <a
              href="/api/export"
              className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-md text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              <Download className="h-4 w-4" />
              Exportar CSV
            </a>
          </div>
        </div>
      </nav>

      <main className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <section className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
          <Outlet />
        </section>
      </main>

      <footer className="text-center text-xs text-slate-500 py-4">
        © {new Date().getFullYear()} Inventario Equipos · Santa Priscila
      </footer>
    </div>
  );
}
