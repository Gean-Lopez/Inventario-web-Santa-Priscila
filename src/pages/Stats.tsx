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
      <div className="inventory-stats py-16 text-center text-sm text-[var(--text-soft)]">
        Cargando dashboard...
      </div>
    );
  }

  if (error) {
    return (
      <div className="inventory-stats rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
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

  const COLORS = [
    '#3b82f6',
    '#06b6d4',
    '#22c55e',
    '#f59e0b',
    '#8b5cf6',
    '#ef4444',
    '#14b8a6',
    '#f97316',
  ];

  const cards = [
    {
      title: 'Total equipos',
      value: stats.totalPcs,
      subtitle: 'Equipos registrados en el sistema',
      icon: Monitor,
      iconClass: 'text-[var(--primary)]',
      iconBg: 'bg-[var(--primary-soft)] border-[var(--border)]',
    },
    {
      title: 'Estado de equipos',
      value: (
        <div className="space-y-1 text-sm">
          <div>
            <span className="font-semibold text-emerald-600 dark:text-emerald-300">{stats.activos}</span>{' '}
            <span className="text-slate-300">activos</span>
          </div>
          <div>
            <span className="font-semibold text-slate-100">{stats.inactivos}</span>{' '}
            <span className="text-slate-400">inactivos</span>
          </div>
        </div>
      ),
      subtitle: 'Según campo ACTIVO del inventario',
      icon: Activity,
      iconClass: 'text-emerald-600 dark:text-emerald-300',
      iconBg: 'bg-emerald-500/10 border-emerald-500/20',
    },
    {
      title: 'Licenciamiento',
      value: (
        <div className="space-y-1 text-sm text-slate-300">
          <div>
            Windows:{' '}
            <span className="font-semibold text-slate-100">
              {stats.licencias?.conLicenciaWindows || 0}
            </span>{' '}
            con /{' '}
            <span className="font-semibold text-amber-600 dark:text-amber-300">
              {stats.licencias?.sinLicenciaWindows || 0}
            </span>{' '}
            sin
          </div>
          <div>
            Office:{' '}
            <span className="font-semibold text-slate-100">
              {stats.licencias?.conLicenciaOffice || 0}
            </span>{' '}
            con /{' '}
            <span className="font-semibold text-amber-600 dark:text-amber-300">
              {stats.licencias?.sinLicenciaOffice || 0}
            </span>{' '}
            sin
          </div>
        </div>
      ),
      subtitle: 'Equipos con o sin licencias registradas',
      icon: ShieldCheck,
      iconClass: 'text-cyan-600 dark:text-cyan-300',
      iconBg: 'bg-cyan-500/10 border-cyan-500/20',
    },
  ];

  const chartCardClass = 'surface-card rounded-[30px] p-6';

  return (
    <div className="inventory-stats space-y-8">
      <div>
        <span className="apple-chip mb-2 inline-flex rounded-full px-3 py-1 text-xs font-medium">
          Panel analítico
        </span>
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--text)]">
          Dashboard de Inventario
        </h1>
        <p className="mt-2 text-sm text-[var(--text-soft)]">
          Resumen visual de equipos, licencias, áreas y sistemas operativos.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        {cards.map((card, idx) => {
          const Icon = card.icon;

          return (
            <div
              key={idx}
              className="surface-card rounded-[30px] p-6"
            >
              <div className="mb-6 flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-300">{card.title}</p>
                </div>

                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${card.iconBg}`}
                >
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

              <div className="mt-5 border-t border-slate-800 pt-4 text-sm text-slate-400">
                {card.subtitle}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className={chartCardClass}>
          <div className="mb-5">
            <h2 className="text-xl font-semibold text-white">
              Equipos por tipo de recurso
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Distribución por categoría principal.
            </p>
          </div>

          <div className="h-[340px]">
            {tipoRecursoChart.length === 0 ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-950/40 px-4 py-5 text-center text-sm text-slate-400">
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
                    innerRadius={72}
                    outerRadius={108}
                    paddingAngle={4}
                  >
                    {tipoRecursoChart.map((_: any, index: number) => (
                      <Cell
                        key={index}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--bg-elevated-strong)',
                      border: '1px solid var(--border)',
                      borderRadius: '16px',
                      color: 'var(--text)',
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className={chartCardClass}>
          <div className="mb-5">
            <h2 className="text-xl font-semibold text-white">Equipos por área</h2>
            <p className="mt-1 text-sm text-slate-400">
              Áreas con mayor número de equipos registrados.
            </p>
          </div>

          <div className="h-[340px]">
            {areaChart.length === 0 ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-950/40 px-4 py-5 text-center text-sm text-slate-400">
                No hay datos de áreas.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={areaChart}
                  margin={{ top: 10, right: 10, left: 0, bottom: 30 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="name"
                    stroke="var(--text-soft)"
                    angle={-15}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis stroke="var(--text-soft)" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--bg-elevated-strong)',
                      border: '1px solid var(--border)',
                      borderRadius: '16px',
                      color: 'var(--text)',
                    }}
                  />
                  <Bar
                    dataKey="total"
                    fill="#3b82f6"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className={chartCardClass}>
        <div className="mb-5">
          <h2 className="text-xl font-semibold text-white">
            Top sistemas operativos
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Sistemas operativos más registrados en el inventario.
          </p>
        </div>

        <div className="h-[360px]">
          {osChart.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-950/40 px-4 py-5 text-center text-sm text-slate-400">
              No hay información de sistemas operativos.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={osChart}
                layout="vertical"
                margin={{ top: 10, right: 20, left: 30, bottom: 10 }}
              >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" stroke="var(--text-soft)" />
                <YAxis
                  dataKey="name"
                  type="category"
                  stroke="var(--text-soft)"
                  width={170}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-elevated-strong)',
                    border: '1px solid var(--border)',
                    borderRadius: '16px',
                    color: 'var(--text)',
                  }}
                />
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
