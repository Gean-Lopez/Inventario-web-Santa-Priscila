import { useState, useEffect } from 'react';
import {
  Monitor,
  Activity,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

export default function Stats() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/stats')
      .then((res) => {
        if (!res.ok) throw new Error('Error al cargar estadísticas');
        return res.json();
      })
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="py-16 text-center text-sm text-slate-200">
        Cargando dashboard...
      </div>
    );
  }

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

  const tipoRecursoChart =
    stats?.byTipoRecurso?.map((row: any) => ({
      name: row.tipo_recurso || 'Sin tipo',
      value: Number(row.count) || 0,
    })) || [];

  const areaChart =
    stats?.byArea?.slice(0, 8).map((row: any) => ({
      name: row.area || 'Sin área',
      total: Number(row.count) || 0,
    })) || [];

  const osChart =
    stats?.byOS?.slice(0, 8).map((row: any) => ({
      name: row.sistema_operativo || 'Sin sistema',
      total: Number(row.count) || 0,
    })) || [];

  const COLORS = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#14b8a6', '#f97316'];

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
        <h1 className="text-3xl font-semibold tracking-tight text-white">
          Dashboard de Inventario
        </h1>
        <p className="mt-2 text-sm text-slate-200">
          Resumen visual de equipos, licencias, áreas y sistemas operativos.
        </p>
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
                      <div className="text-4xl font-semibold tracking-tight text-white">
                        {card.value}
                      </div>
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
            <h2 className="text-xl font-semibold text-white">
              Equipos por tipo de recurso
            </h2>
            <p className="mt-1 text-sm text-slate-200">
              Distribución por categoría principal.
            </p>
          </div>

          <div className="h-[340px]">
            {tipoRecursoChart.length === 0 ? (
              <div className="rounded-2xl border border-white/15 bg-white/[0.08] px-4 py-5 text-center text-sm text-slate-200">
                No hay datos de tipo de recurso.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={tipoRecursoChart}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={110}
                    paddingAngle={4}
                  >
                    {tipoRecursoChart.map((_: any, index: number) => (
                      <Cell
                        key={index}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-white/15 bg-slate-900/70 p-6 shadow-2xl shadow-black/20">
          <div className="mb-5">
            <h2 className="text-xl font-semibold text-white">Equipos por área</h2>
            <p className="mt-1 text-sm text-slate-200">
              Áreas con mayor número de equipos registrados.
            </p>
          </div>

          <div className="h-[340px]">
            {areaChart.length === 0 ? (
              <div className="rounded-2xl border border-white/15 bg-white/[0.08] px-4 py-5 text-center text-sm text-slate-200">
                No hay datos de áreas.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={areaChart}
                  margin={{ top: 10, right: 10, left: 0, bottom: 30 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis
                    dataKey="name"
                    stroke="#cbd5e1"
                    angle={-15}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis stroke="#cbd5e1" />
                  <Tooltip />
                  <Bar
                    dataKey="total"
                    fill="#8b5cf6"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-white/15 bg-slate-900/70 p-6 shadow-2xl shadow-black/20">
        <div className="mb-5">
          <h2 className="text-xl font-semibold text-white">
            Top sistemas operativos
          </h2>
          <p className="mt-1 text-sm text-slate-200">
            Sistemas operativos más registrados en el inventario.
          </p>
        </div>

        <div className="h-[360px]">
          {osChart.length === 0 ? (
            <div className="rounded-2xl border border-white/15 bg-white/[0.08] px-4 py-5 text-center text-sm text-slate-200">
              No hay información de sistemas operativos.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={osChart}
                layout="vertical"
                margin={{ top: 10, right: 20, left: 30, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis type="number" stroke="#cbd5e1" />
                <YAxis
                  dataKey="name"
                  type="category"
                  stroke="#cbd5e1"
                  width={170}
                />
                <Tooltip />
                <Bar
                  dataKey="total"
                  fill="#06b6d4"
                  radius={[0, 8, 8, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
