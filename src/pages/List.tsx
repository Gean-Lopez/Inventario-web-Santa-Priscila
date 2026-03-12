import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Pencil, Trash2, Upload, RefreshCw, FileText, Copy, Download, X, FileDown } from 'lucide-react';

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
  mac_address2: string;
  procesador: string;
  ram: string;
  disco: string;
  sistema_operativo: string;
  activo: string;
  etiquetado: string;
  fecha_adquisicion: string;
  fecha_inventario: string;
  tipo_recurso: string;
  marca: string;
  modelo: string;
  serie: string;
  antivirus: string;
  observacion: string;
  active_directory: string;
}

function Field({ label, value, col2 }: { label: string; value?: string | number | null; col2?: boolean }) {
  return (
    <div className={col2 ? 'col-span-2' : ''}>
      <span className="text-xs text-slate-400 block mb-0.5">{label}</span>
      <span className="text-slate-800 font-medium text-sm">{value || '—'}</span>
    </div>
  );
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
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [equipoDetalle, setEquipoDetalle] = useState<Equipo | null>(null);

  const [showScript, setShowScript] = useState(false);
  const [scriptContent, setScriptContent] = useState('');
  const [loadingScript, setLoadingScript] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [pageSize, setPageSize] = useState(10);


  const fetchEquipos = () => {
    setLoading(true);
    fetch(`/api/equipos?q=${encodeURIComponent(search)}&page=${page}&limit=${pageSize}`)
      .then(res => res.json())
      .then(data => {
        setEquipos(data.data || []);
        setTotalPages(data.totalPages || 1);
        setTotal(data.total || 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };
  

  useEffect(() => { fetchEquipos(); }, [search, page, pageSize]);


  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este equipo?')) return;
    try {
      const res = await fetch(`/api/equipos/${id}`, { method: 'DELETE' });
      if (res.ok) { setEquipoDetalle(null); fetchEquipos(); }
      else alert('❌ Error al eliminar el equipo');
    } catch { alert('❌ Error al conectar con el servidor'); }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`¿Eliminar ${selectedIds.length} equipo(s) seleccionado(s)?`)) return;
    try {
      await Promise.all(selectedIds.map(id => fetch(`/api/equipos/${id}`, { method: 'DELETE' })));
      setSelectedIds([]);
      fetchEquipos();
    } catch { alert('❌ Error al eliminar equipos'); }
  };

  const toggleSelect = (id: number) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  const toggleSelectAll = () => {
    if (selectedIds.length === equipos.length) setSelectedIds([]);
    else setSelectedIds(equipos.map(e => e.id));
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
      if (data.success) { setImportMessage(`✅ ${data.message}`); fetchEquipos(); }
      else setImportError(`❌ ${data.error}`);
    } catch { setImportError('❌ Error al importar'); }
    setImporting(false);
    e.target.value = '';
  };

  const handleVerScript = async () => {
    setShowScript(true);
    setLoadingScript(true);
    setScriptContent('');
    setError('');
    try {
      const res = await fetch('/api/script?t=' + Date.now());
      const text = await res.text();
      setScriptContent(text);
    } catch { setError('Error al cargar el script'); }
    setLoadingScript(false);
  };

  const handleCopiar = () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(scriptContent).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
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
    } catch { alert('❌ No se pudo copiar. Selecciona el texto manualmente.'); }
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
                  <p className="text-xs text-slate-500">Descarga el script, ejecútalo en las PCs para que envíen su información automáticamente.</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={handleCopiar} className="inline-flex items-center gap-1 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 py-1.5 px-3 rounded-md transition-colors">
                  <Copy size={14} />{copied ? '¡Copiado!' : 'Copiar'}
                </button>
                <button onClick={handleDescargar} className="inline-flex items-center gap-1 text-sm bg-indigo-600 hover:bg-indigo-700 text-white py-1.5 px-3 rounded-md transition-colors">
                  <Download size={14} />Descargar .ps1
                </button>
                <button onClick={() => setShowScript(false)} className="text-slate-400 hover:text-slate-600 ml-1">
                  <X size={20} />
                </button>
              </div>
            </div>
            {error && <div className="px-5 py-2 bg-red-50 text-red-600 text-sm">{error}</div>}
            <div className="overflow-auto flex-1 p-4 bg-slate-950 rounded-b-xl">
              {loadingScript
                ? <p className="text-slate-400 text-sm">Cargando script...</p>
                : <pre className="text-green-400 text-xs font-mono whitespace-pre-wrap">{scriptContent}</pre>
              }
            </div>
          </div>
        </div>
      )}

      {/* ── PANEL DETALLE ────────────────────────────── */}
      {equipoDetalle && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEquipoDetalle(null)} />
          <div className="relative bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div>
                <h2 className="text-base font-bold text-slate-800">
                  {equipoDetalle.nombre_host || equipoDetalle.nombre_pc || 'Sin nombre'}
                </h2>
                <p className="text-xs text-slate-500">ID #{equipoDetalle.id}</p>
              </div>
              <button onClick={() => setEquipoDetalle(null)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            {/* Contenido en grid 2 columnas */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-2 gap-x-8 gap-y-4">

                {/* Identificación */}
                <div className="col-span-2 border-b border-slate-100 pb-1 mb-1">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">🖥️ Identificación</span>
                </div>
                <Field label="Nombre Host"  value={equipoDetalle.nombre_host} />
                <Field label="Nombre PC"    value={equipoDetalle.nombre_pc} />
                <Field label="Usuario"      value={equipoDetalle.usuario} />
                <Field label="Tipo Recurso" value={equipoDetalle.tipo_recurso} />
                <Field label="Marca"        value={equipoDetalle.marca} />
                <Field label="Modelo"       value={equipoDetalle.modelo} />
                <Field label="Serie"        value={equipoDetalle.serie} />
                <Field label="S.O."         value={equipoDetalle.sistema_operativo} />

                {/* Red */}
                <div className="col-span-2 border-b border-slate-100 pb-1 mt-2 mb-1">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">🌐 Red</span>
                </div>
                <Field label="IP"            value={equipoDetalle.ip} />
                <Field label="IP Extendida"  value={equipoDetalle.ip_extendida} />
                <Field label="MAC Address"   value={equipoDetalle.mac_address} />
                <Field label="MAC Address 2" value={equipoDetalle.mac_address2} />

                {/* Hardware */}
                <div className="col-span-2 border-b border-slate-100 pb-1 mt-2 mb-1">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">⚙️ Hardware</span>
                </div>
                <Field label="RAM"       value={equipoDetalle.ram} />
                <Field label="Disco"     value={equipoDetalle.disco} />
                <Field label="Antivirus" value={equipoDetalle.antivirus} />
                <Field label="Procesador" value={equipoDetalle.procesador} col2 />

                {/* Organización */}
                <div className="col-span-2 border-b border-slate-100 pb-1 mt-2 mb-1">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">🏢 Organización</span>
                </div>
                <Field label="Empresa"         value={equipoDetalle.empresa} />
                <Field label="Establecimiento" value={equipoDetalle.establecimiento} />
                <Field label="Departamento"    value={equipoDetalle.departamento} />
                <Field label="Área"            value={equipoDetalle.area} />
                <Field label="Responsable"     value={equipoDetalle.responsable_equipo} />

                {/* Fechas y estado */}
                <div className="col-span-2 border-b border-slate-100 pb-1 mt-2 mb-1">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">📅 Fechas y Estado</span>
                </div>
                <Field label="F. Adquisición" value={formatFecha(equipoDetalle.fecha_adquisicion)} />
                <Field label="F. Inventario"  value={formatFecha(equipoDetalle.fecha_inventario)} />
                <Field label="Activo"         value={equipoDetalle.activo} />
                <Field label="Etiquetado"     value={equipoDetalle.etiquetado} />

                {/* Observación */}
                {equipoDetalle.observacion && (
                  <div className="col-span-2 mt-2">
                    <span className="text-xs text-slate-400 block mb-1">Observación</span>
                    <p className="text-slate-800 text-sm bg-slate-50 rounded-lg p-3">{equipoDetalle.observacion}</p>
                  </div>
                )}

              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-200 flex gap-2">
              <button
                onClick={() => { navigate(`/edit/${equipoDetalle.id}`); setEquipoDetalle(null); }}
                className="flex-1 inline-flex justify-center items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-2 px-4 rounded-md transition-colors"
              >
                <Pencil size={15} /> Editar
              </button>
              <button
                onClick={() => handleDelete(equipoDetalle.id)}
                className="inline-flex justify-center items-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-medium py-2 px-4 rounded-md transition-colors"
              >
                <Trash2 size={15} /> Eliminar
              </button>
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
          {selectedIds.length > 0 && (
            <button onClick={handleDeleteSelected}
              className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium py-2 px-4 rounded-md transition-colors">
              <Trash2 size={16} />Eliminar seleccionados ({selectedIds.length})
            </button>
          )}
          <button onClick={handleVerScript} className="inline-flex items-center gap-2 bg-slate-700 hover:bg-slate-800 text-white text-sm font-medium py-2 px-4 rounded-md transition-colors">
            <FileText size={16} />Ver Script
          </button>
          <button onClick={handleExportExcel} className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded-md transition-colors">
            <FileDown size={16} />Exportar Excel
          </button>
          <label className="cursor-pointer inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-2 px-4 rounded-md transition-colors">
            <Upload size={16} />
            {importing ? 'Importando...' : 'Importar Excel'}
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImportExcel} disabled={importing} />
          </label>
        </div>
      </div>

      {importMessage && <div className="mb-4 p-3 rounded-md text-sm font-medium bg-green-50 text-green-700">{importMessage}</div>}
      {importError && <div className="mb-4 p-3 rounded-md text-sm font-medium bg-red-50 text-red-700">{importError}</div>}

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
      <div className="rounded-lg border border-slate-200 shadow-sm">
      <table className="w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3">
                <input type="checkbox"
                  checked={selectedIds.length === equipos?.length && equipos?.length > 0}
                  onChange={toggleSelectAll}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">ID</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Nombre PC</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Usuario</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Fecha Inventario</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">IP / MAC</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Hardware</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Empresa</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Departamento</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={10} className="px-4 py-8 text-center text-slate-400">
                <RefreshCw size={20} className="animate-spin inline mr-2" />Cargando equipos...
              </td></tr>
            ) : equipos.length === 0 ? (
              <tr><td colSpan={10} className="px-4 py-8 text-center text-slate-400">No se encontraron equipos.</td></tr>
            ) : (
              equipos.filter((equipo): equipo is Equipo => equipo != null).map(equipo => (
                <tr
                  key={equipo.id}
                  onClick={() => setEquipoDetalle(equipo)}
                  className={`hover:bg-slate-50 transition-colors cursor-pointer ${selectedIds.includes(equipo.id) ? 'bg-indigo-50' : ''}`}
                >
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <input type="checkbox"
                      checked={selectedIds.includes(equipo.id)}
                      onChange={() => toggleSelect(equipo.id)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </td>
                  <td className="px-4 py-3 text-slate-500 font-mono text-xs">{equipo.id}</td>
                  <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-800">{equipo.nombre_host || equipo.nombre_pc || '-'}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-slate-600">{equipo.usuario || '-'}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-slate-600">{formatFecha(equipo.fecha_inventario)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-slate-700">{equipo.ip || '-'}</div>
                    <div className="text-xs text-slate-400">{equipo.mac_address || '-'}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-slate-700">{equipo.procesador || '-'}</div>
                    <div className="text-xs text-slate-400">{[equipo.ram && `${equipo.ram} RAM`, equipo.disco].filter(Boolean).join(' / ')}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-slate-600">{equipo.empresa || '-'}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-slate-600">{equipo.departamento || '-'}</td>
                  <td className="px-4 py-3 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                    <div className="flex gap-2">
                      <button onClick={() => navigate(`/edit/${equipo.id}`)}
                        className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 text-xs font-medium py-1 px-2 rounded hover:bg-indigo-50 transition-colors">
                        <Pencil size={13} /> Editar
                      </button>
                      <button onClick={() => handleDelete(equipo.id)}
                        className="inline-flex items-center gap-1 text-red-500 hover:text-red-700 text-xs font-medium py-1 px-2 rounded hover:bg-red-50 transition-colors">
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

      <div className="flex items-center justify-between mt-4 flex-wrap gap-3">
  <p className="text-sm text-slate-500">
    Mostrando {total === 0 ? 0 : (page - 1) * pageSize + 1} a {Math.min(page * pageSize, total)} de {total} resultados
  </p>

  <div className="flex items-center gap-3 flex-wrap">
    <div className="flex items-center gap-2">
      <label className="text-sm text-slate-500">Mostrar:</label>
      <select
        value={pageSize}
        onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
        className="border border-slate-300 rounded-md text-sm py-1 px-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        {Array.from({ length: 11 }, (_, i) => i + 10).map(n => (
          <option key={n} value={n}>{n} filas</option>
        ))}
      </select>
    </div>

    {totalPages > 1 && (
      <div className="flex items-center gap-2">
        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
          className="py-1 px-3 text-sm border border-slate-300 rounded-md disabled:opacity-40 hover:bg-slate-50 transition-colors">
          ← Anterior
        </button>
        <span className="text-sm text-slate-500">{page} / {totalPages}</span>
        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
          className="py-1 px-3 text-sm border border-slate-300 rounded-md disabled:opacity-40 hover:bg-slate-50 transition-colors">
          Siguiente →
        </button>
      </div>
    )}
  </div>
</div>


    </div>
  );
}
