import { useState, useEffect } from 'react';
import { Monitor, Activity, ShieldCheck, MapPin, AlertCircle, Laptop, Cpu } from 'lucide-react';

export default function Stats() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/stats')
      .then(res => {
        if (!res.ok) throw new Error('Error al cargar estadísticas');
        return res.json();
      })
      .then(data => {
        setStats(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="py-16 text-center text-sm text-slate-200">Cargando dashboard...</div>;

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/25 bg-red-500/15 p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-200" />
          <p className="text-sm text-red-100">{error}</p>
        </div>
      </div>
    );
  }

  const cards = [
    {
      title: 'Total equipos',
      value: stats.totalPcs,
      subtitle: 'Equipos registrados en el sistema',
      icon: Monitor,
      iconClass: 'text-indigo-200',
      glow: 'from-indigo-500/25 to-blue-500/10',
    },
    {
      title: 'Estado de equipos',
      value: (
        <div className="space-y-1 text-sm">
          <div>
            <span className="font-semibold text-emerald-200">{stats.activos}</span>{' '}
            <span className="text-slate-100">activos</span>
          </div>
          <div>
            <span className="font-semibold text-white">{stats.inactivos}</span>{' '}
            <span className="text-slate-200">inactivos</span>
          </div>
        </div>
      ),
      subtitle: 'Según campo ACTIVO del inventario',
      icon: Activity,
      iconClass: 'text-emerald-200',
      glow: 'from-emerald-500/25 to-teal-500/10',
    },
    {
      title: 'Licenciamiento',
      value: (
        <div className="space-y-1 text-sm text-slate-100">
          <div>
            Windows: <span className="font-semibold text-white">{stats.licencias?.conLicenciaWindows || 0}</span> con /{' '}
            <span className="font-semibold text-amber-200">{stats.licencias?.sinLicenciaWindows || 0}</span> sin
          </div>
          <div>
            Office: <span className="font-semibold text-white">{stats.licencias?.conLicenciaOffice || 0}</span> con /{' '}
            <span className="font-semibold text-amber-200">{stats.licencias?.sinLicenciaOffice || 0}</span> sin
          </div>
        </div>
      ),
      subtitle: 'Equipos con o sin licencias registradas',
      icon: ShieldCheck,
      iconClass: 'text-sky-200',
      glow: 'from-sky-500/25 to-cyan-500/10',
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <span className="mb-2 inline-flex rounded-full border border-indigo-400/25 bg-indigo-500/15 px-3 py-1 text-xs font-medium text-indigo-200">
          Panel analítico
        </span>
        <h1 className="text-3xl font-semibold tracking-tight text-white">Dashboard de Inventario</h1>
        <p className="mt-2 text-sm text-slate-200">Resumen visual de equipos, licencias, áreas y sistemas operativos.</p>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className="overflow-hidden rounded-3xl border border-white/15 bg-slate-900/70 shadow-2xl shadow-black/20"
            >
              <div className={`bg-gradient-to-br ${card.glow} p-[1px]`}>
                <div className="h-full rounded-[calc(1.5rem-1px)] bg-slate-900/95 p-6">
                  <div className="mb-6 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-slate-100">{card.title}</p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.08]">
                      <Icon className={`h-6 w-6 ${card.iconClass}`} />
                    </div>
                  </div>

                  <div className="min-h-[72px]">
                    {typeof card.value === 'number' ? (
                      <div className="text-4xl font-semibold tracking-tight text-white">{card.value}</div>
                    ) : (
                      card.value
                    )}
                  </div>

                  <div className="mt-5 border-t border-white/15 pt-4 text-sm text-slate-200">
                    {card.subtitle}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-white/15 bg-slate-900/70 p-6 shadow-2xl shadow-black/20">
          <div className="mb-5">
            <h2 className="text-xl font-semibold text-white">Equipos por tipo de recurso</h2>
            <p className="mt-1 text-sm text-slate-200">Distribución por categoría principal.</p>
          </div>

          <div className="space-y-3">
            {(!stats.byTipoRecurso || stats.byTipoRecurso.length === 0) ? (
              <div className="rounded-2xl border border-white/15 bg-white/[0.08] px-4 py-5 text-center text-sm text-slate-200">
                No hay datos de tipo de recurso.
              </div>
            ) : (
              stats.byTipoRecurso.map((row: any, idx: number) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-2xl border border-white/15 bg-white/[0.08] px-4 py-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.1]">
                      {row.tipo_recurso === 'LAPTOP' ? (
                        <Laptop className="h-5 w-5 text-indigo-200" />
                      ) : (
                        <Cpu className="h-5 w-5 text-slate-100" />
                      )}
                    </div>
                    <span className="font-medium text-white">{row.tipo_recurso}</span>
                  </div>

                  <span className="rounded-full border border-white/15 bg-white/[0.1] px-3 py-1 text-sm text-white">
                    {row.count} equipos
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-white/15 bg-slate-900/70 p-6 shadow-2xl shadow-black/20">
          <div className="mb-5">
            <h2 className="text-xl font-semibold text-white">Equipos por área</h2>
            <p className="mt-1 text-sm text-slate-200">Áreas con mayor número de equipos registrados.</p>
          </div>

          <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
            {(!stats.byArea || stats.byArea.length === 0) ? (
              <div className="rounded-2xl border border-white/15 bg-white/[0.08] px-4 py-5 text-center text-sm text-slate-200">
                No hay datos de áreas.
              </div>
            ) : (
              stats.byArea.map((row: any, idx: number) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-2xl border border-white/15 bg-white/[0.08] px-4 py-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.1]">
                      <MapPin className="h-5 w-5 text-violet-200" />
                    </div>
                    <span className="font-medium text-white">{row.area}</span>
                  </div>

                  <span className="rounded-full bg-indigo-500/20 px-3 py-1 text-sm font-medium text-indigo-100">
                    {row.count} equipos
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-white/15 bg-slate-900/70 p-6 shadow-2xl shadow-black/20">
        <div className="mb-5">
          <h2 className="text-xl font-semibold text-white">Top sistemas operativos</h2>
          <p className="mt-1 text-sm text-slate-200">Sistemas operativos más registrados en el inventario.</p>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {(!stats.byOS || stats.byOS.length === 0) ? (
            <div className="rounded-2xl border border-white/15 bg-white/[0.08] px-4 py-5 text-center text-sm text-slate-200 lg:col-span-2">
              No hay información de sistemas operativos.
            </div>
          ) : (
            stats.byOS.map((row: any, idx: number) => (
              <div
                key={idx}
                className="flex items-center justify-between rounded-2xl border border-white/15 bg-white/[0.08] px-4 py-4"
              >
                <span className="font-medium text-white">{row.sistema_operativo}</span>
                <span className="rounded-full border border-white/15 bg-white/[0.1] px-3 py-1 text-sm text-white">
                  {row.count} equipos
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
