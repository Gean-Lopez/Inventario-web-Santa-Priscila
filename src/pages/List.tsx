import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Pencil, Trash2, Upload, RefreshCw, FileText, Copy, Download, X, FileDown} from 'lucide-react';

interface Equipo {
  id: number;
  empresa: string;
  establecimiento: string;
  departamento: string;
  area: string;
  responsable_equipo: string;
  nombre_host: string;
  nombre_pc: string;
  usuario: string;
  ip: string;
  ip_extendida: string;
  mac_address: string;
  procesador: string;
  ram: string;
  disco: string;
  sistema_operativo: string;
  activo: string;
  etiquetado: string;
  fecha_adquisicion: string;
  fecha_inventario: string;
}

export default function List() {
  const navigate = useNavigate();
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState('');
  const [importError, setImportError] = useState('');

  // Modal script
  const [showScript, setShowScript] = useState(false);
  const [scriptContent, setScriptContent] = useState('');
  const [loadingScript, setLoadingScript] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const fetchEquipos = () => {
    setLoading(true);
    fetch(`/api/equipos?q=${encodeURIComponent(search)}&page=${page}`)
      .then(res => res.json())
      .then(data => {
        setEquipos(data.data || []);
        setTotalPages(data.totalPages || 1);
        setTotal(data.total || 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchEquipos();
  }, [search, page]);

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar este equipo?')) return;
    await fetch(`/api/equipos/${id}`, { method: 'DELETE' });
    fetchEquipos();
  };
  const handleExportExcel = () => {
    const a = document.createElement('a');
    a.href = '/api/export';
    a.download = 'inventario_equipos.xlsx';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };
  

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportMessage('');
    setImportError('');
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/importexcel', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        setImportMessage(`✅ ${data.message}`);
        fetchEquipos();
      } else {
        setImportError(`❌ ${data.error}`);
      }
    } catch {
      setImportError('❌ Error al importar');
    }
    setImporting(false);
    e.target.value = '';
  };

  const handleVerScript = async () => {
    setShowScript(true);
    setLoadingScript(true);
    setError('');
    try {
      const res = await fetch('/api/script');
      const text = await res.text();
      setScriptContent(text);
    } catch {
      setError('Error al cargar el script');
    }
    setLoadingScript(false);
  };

  // ✅ Copiar compatible con HTTP (sin HTTPS)
  const handleCopiar = () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(scriptContent).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        });
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = scriptContent;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      alert('❌ No se pudo copiar. Selecciona el texto manualmente.');
    }
  };

  const handleDescargar = () => {
    const blob = new Blob([scriptContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'inventario_equipos.ps1';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const formatFecha = (fecha: string) => {
    if (!fecha) return '—';
    const d = new Date(fecha);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <div className="p-6">

      {/* ── MODAL SCRIPT ─────────────────────────────── */}
      {showScript && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl mx-4 flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-slate-600" />
                <div>
                  <h2 className="text-base font-semibold text-slate-800">Script de inventario (PowerShell)</h2>
                  <p className="text-xs text-slate-500">
                    Descarga el script, ejecútalo en las PCs para que envíen su información automáticamente a este sistema.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopiar}
                  className="inline-flex items-center gap-1 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 py-1.5 px-3 rounded-md transition-colors"
                >
                  <Copy size={14} />
                  {copied ? '¡Copiado!' : 'Copiar'}
                </button>
                <button
                  onClick={handleDescargar}
                  className="inline-flex items-center gap-1 text-sm bg-indigo-600 hover:bg-indigo-700 text-white py-1.5 px-3 rounded-md transition-colors"
                >
                  <Download size={14} />
                  Descargar .ps1
                </button>
                <button onClick={() => setShowScript(false)} className="text-slate-400 hover:text-slate-600 ml-1">
                  <X size={20} />
                </button>
              </div>
            </div>
            {error && <div className="px-5 py-2 bg-red-50 text-red-600 text-sm">{error}</div>}
            <div className="overflow-auto flex-1 p-4 bg-slate-950 rounded-b-xl">
              {loadingScript ? (
                <p className="text-slate-400 text-sm">Cargando script...</p>
              ) : (
                <pre className="text-green-400 text-xs font-mono whitespace-pre-wrap">{scriptContent}</pre>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── ENCABEZADO ────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Inventario de Equipos</h1>
          <p className="text-sm text-slate-500">{total} equipos registrados</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {/* ✅ Solo estos dos botones — Nuevo Equipo ya está en el navbar */}
          <button
            onClick={handleVerScript}
            className="inline-flex items-center gap-2 bg-slate-700 hover:bg-slate-800 text-white text-sm font-medium py-2 px-4 rounded-md transition-colors"
          >
            <FileText size={16} />
            Ver Script
          </button>
          <label className="cursor-pointer inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-2 px-4 rounded-md transition-colors">
            <Upload size={16} />
            {importing ? 'Importando...' : 'Importar Excel'}
            <input
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleImportExcel}
              disabled={importing}
            />
            <button
               onClick={handleExportExcel}
               className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded-md transition-colors"
> 
  <FileDown size={16} />
  Exportar Excel
</button>
          </label>
        </div>
      </div>

      {/* Mensajes import */}
      {importMessage && (
        <div className="mb-4 p-3 rounded-md text-sm font-medium bg-green-50 text-green-700">{importMessage}</div>
      )}
      {importError && (
        <div className="mb-4 p-3 rounded-md text-sm font-medium bg-red-50 text-red-700">{importError}</div>
      )}

      {/* ── BUSCADOR ──────────────────────────────────── */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar por nombre, usuario o IP..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* ── TABLA ─────────────────────────────────────── */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">ID</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Nombre PC</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Usuario</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Responsable</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Fecha Adquisición</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">IP / MAC</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Hardware</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Empresa</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Departamento</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Etiqueta</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Ubicación</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={12} className="px-4 py-8 text-center text-slate-400">
                  <RefreshCw size={20} className="animate-spin inline mr-2" />
                  Cargando equipos...
                </td>
              </tr>
            ) : equipos.length === 0 ? (
              <tr>
                <td colSpan={12} className="px-4 py-8 text-center text-slate-400">
                  No se encontraron equipos.
                </td>
              </tr>
            ) : (
              equipos.map(equipo => (
                <tr key={equipo.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-slate-500 font-mono text-xs">{equipo.id}</td>
                  <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-800">
                    {equipo.nombre_host || equipo.nombre_pc || '-'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-slate-600">{equipo.usuario || '-'}</td>
                  {/* ✅ NUEVA: Responsable */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="font-medium text-slate-800">{equipo.responsable_equipo || '—'}</div>
                  </td>
                  {/* ✅ NUEVA: Fecha Adquisición */}
                  <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                    {formatFecha(equipo.fecha_adquisicion)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-slate-700">{equipo.ip || '-'}</div>
                    <div className="text-xs text-slate-400">{equipo.ip_extendida || '-'}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-slate-700">{equipo.procesador || '-'}</div>
                    <div className="text-xs text-slate-400">
                      {[equipo.ram && `${equipo.ram} RAM`, equipo.disco].filter(Boolean).join(' / ')}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-slate-600">{equipo.empresa || '-'}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-slate-600">{equipo.departamento || '-'}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-slate-600">{equipo.etiquetado || '-'}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-slate-600">{equipo.activo || '-'}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex gap-2">
                      {/* ✅ Ruta corregida a /add/:id */}
                      <button
                        onClick={() => navigate(`/edit/${equipo.id}`)}
                        className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 text-xs font-medium py-1 px-2 rounded hover:bg-indigo-50 transition-colors"
                      >
                        <Pencil size={13} /> Editar
                      </button>
                      <button
                        onClick={() => handleDelete(equipo.id)}
                        className="inline-flex items-center gap-1 text-red-500 hover:text-red-700 text-xs font-medium py-1 px-2 rounded hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={13} /> Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── PAGINACIÓN ────────────────────────────────── */}
      <div className="flex items-center justify-between mt-4">
        <p className="text-sm text-slate-500">
          Mostrando {total === 0 ? 0 : (page - 1) * 50 + 1} a {Math.min(page * 50, total)} de {total} resultados
        </p>
        {totalPages > 1 && (
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="py-1 px-3 text-sm border border-slate-300 rounded-md disabled:opacity-40 hover:bg-slate-50 transition-colors"
            >
              ← Anterior
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="py-1 px-3 text-sm border border-slate-300 rounded-md disabled:opacity-40 hover:bg-slate-50 transition-colors"
            >
              Siguiente →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
