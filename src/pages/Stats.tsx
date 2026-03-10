import { useState, useEffect } from 'react';
import { Monitor, HardDrive, MapPin, AlertCircle } from 'lucide-react';

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
      
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {/* Total PCs */}
        <div className="bg-white overflow-hidden shadow rounded-lg border border-slate-200">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Monitor className="h-6 w-6 text-indigo-500" aria-hidden="true" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-slate-500 truncate">Total Equipos</dt>
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

        {/* Total RAM */}
        <div className="bg-white overflow-hidden shadow rounded-lg border border-slate-200">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <HardDrive className="h-6 w-6 text-emerald-500" aria-hidden="true" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-slate-500 truncate">RAM Total Instalada</dt>
                  <dd>
                    <div className="text-3xl font-bold text-slate-900">{stats.totalRam} <span className="text-lg font-medium text-slate-500">GB</span></div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-slate-50 px-5 py-3">
            <div className="text-sm text-slate-500">Suma de memoria de todos los equipos</div>
          </div>
        </div>
      </div>

      <h2 className="text-xl font-bold text-slate-800 mt-8 mb-4">Equipos por Ubicación</h2>
      <div className="bg-white shadow overflow-hidden sm:rounded-md border border-slate-200">
        <ul className="divide-y divide-slate-200">
          {stats.byLocation.length === 0 ? (
            <li className="px-6 py-4 text-center text-slate-500">No hay datos de ubicación.</li>
          ) : (
            stats.byLocation.map((loc: any, idx: number) => (
              <li key={idx}>
                <div className="px-4 py-4 flex items-center sm:px-6">
                  <div className="min-w-0 flex-1 sm:flex sm:items-center sm:justify-between">
                    <div className="truncate">
                      <div className="flex text-sm">
                        <MapPin className="flex-shrink-0 mr-1.5 h-5 w-5 text-slate-400" />
                        <p className="font-medium text-indigo-600 truncate">{loc.ubicacion || 'Sin ubicación asignada'}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex-shrink-0 sm:mt-0 sm:ml-5">
                      <div className="flex overflow-hidden">
                        <span className="inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800">
                          {loc.count} equipos
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
