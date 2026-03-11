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

  if (loading) return <div className="text-center py-12">Cargando dashboard...</div>;

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-md">
        <div className="flex">
          <div className="flex-shrink-0">
            <AlertCircle className="h-5 w-5 text-red-400" />
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Dashboard de Inventario Equipos</h1>
      
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        {/* Total PCs */}
        <div className="bg-white overflow-hidden shadow rounded-lg border border-slate-200">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Monitor className="h-6 w-6 text-indigo-500" aria-hidden="true" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-slate-500 truncate">Total equipos</dt>
                  <dd>
                    <div className="text-3xl font-bold text-slate-900">{stats.totalPcs}</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-slate-50 px-5 py-3">
            <div className="text-sm text-slate-500">Equipos registrados en el sistema</div>
          </div>
        </div>

        {/* Activos / inactivos */}
        <div className="bg-white overflow-hidden shadow rounded-lg border border-slate-200">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Activity className="h-6 w-6 text-emerald-500" aria-hidden="true" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-slate-500 truncate">Estado de equipos</dt>
                  <dd className="mt-1">
                    <div className="text-sm text-slate-700">
                      <span className="font-semibold text-emerald-600">{stats.activos}</span> activos
                      {' · '}
                      <span className="font-semibold text-slate-500">{stats.inactivos}</span> inactivos
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-slate-50 px-5 py-3">
            <div className="text-sm text-slate-500">Según campo "ACTIVO" del inventario</div>
          </div>
        </div>

        {/* Licencias */}
        <div className="bg-white overflow-hidden shadow rounded-lg border border-slate-200">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ShieldCheck className="h-6 w-6 text-sky-500" aria-hidden="true" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-slate-500 truncate">Licenciamiento</dt>
                  <dd className="mt-1 space-y-1 text-sm text-slate-700">
                    <div>
                      Windows: <span className="font-semibold">{stats.licencias?.conLicenciaWindows || 0}</span> con /{' '}
                      <span className="font-semibold text-amber-600">{stats.licencias?.sinLicenciaWindows || 0}</span> sin
                    </div>
                    <div>
                      Office: <span className="font-semibold">{stats.licencias?.conLicenciaOffice || 0}</span> con /{' '}
                      <span className="font-semibold text-amber-600">{stats.licencias?.sinLicenciaOffice || 0}</span> sin
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-slate-50 px-5 py-3">
            <div className="text-sm text-slate-500">Equipos con / sin licencias registradas</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mt-8">
        {/* Por tipo de recurso */}
        <div>
          <h2 className="text-xl font-bold text-slate-800 mb-4">Equipos por tipo de recurso</h2>
          <div className="bg-white shadow overflow-hidden sm:rounded-md border border-slate-200">
            <ul className="divide-y divide-slate-200">
              {(!stats.byTipoRecurso || stats.byTipoRecurso.length === 0) ? (
                <li className="px-6 py-4 text-center text-slate-500">No hay datos de tipo de recurso.</li>
              ) : (
                stats.byTipoRecurso.map((row: any, idx: number) => (
                  <li key={idx}>
                    <div className="px-4 py-3 flex items-center sm:px-6">
                      <div className="flex-shrink-0 mr-3">
                        {row.tipo_recurso === 'LAPTOP' ? (
                          <Laptop className="h-5 w-5 text-indigo-500" />
                        ) : (
                          <Cpu className="h-5 w-5 text-slate-500" />
                        )}
                      </div>
                      <div className="flex-1 flex items-center justify-between">
                        <span className="font-medium text-slate-800">{row.tipo_recurso}</span>
                        <span className="inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium bg-slate-100 text-slate-800">
                          {row.count} equipos
                        </span>
                      </div>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>

        {/* Por área */}
        <div>
          <h2 className="text-xl font-bold text-slate-800 mb-4">Equipos por área</h2>
          <div className="bg-white shadow overflow-hidden sm:rounded-md border border-slate-200 max-h-96 overflow-y-auto">
            <ul className="divide-y divide-slate-200">
              {(!stats.byArea || stats.byArea.length === 0) ? (
                <li className="px-6 py-4 text-center text-slate-500">No hay datos de áreas.</li>
              ) : (
                stats.byArea.map((row: any, idx: number) => (
                  <li key={idx}>
                    <div className="px-4 py-3 flex items-center sm:px-6">
                      <div className="flex-shrink-0 mr-3">
                        <MapPin className="h-5 w-5 text-slate-400" />
                      </div>
                      <div className="flex-1 flex items-center justify-between">
                        <span className="font-medium text-slate-800">{row.area}</span>
                        <span className="inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800">
                          {row.count} equipos
                        </span>
                      </div>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* Top sistemas operativos */}
      <div className="mt-8">
        <h2 className="text-xl font-bold text-slate-800 mb-4">Top sistemas operativos</h2>
        <div className="bg-white shadow overflow-hidden sm:rounded-md border border-slate-200 max-w-2xl">
          <ul className="divide-y divide-slate-200">
            {(!stats.byOS || stats.byOS.length === 0) ? (
              <li className="px-6 py-4 text-center text-slate-500">No hay información de sistemas operativos.</li>
            ) : (
              stats.byOS.map((row: any, idx: number) => (
                <li key={idx}>
                  <div className="px-4 py-3 flex items-center sm:px-6">
                    <div className="flex-1 flex items-center justify-between">
                      <span className="font-medium text-slate-800">{row.sistema_operativo}</span>
                      <span className="inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium bg-slate-100 text-slate-800">
                        {row.count} equipos
                      </span>
                    </div>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
