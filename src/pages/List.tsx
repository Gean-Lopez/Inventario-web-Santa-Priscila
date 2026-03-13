import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Pencil,
  Trash2,
  Upload,
  RefreshCw,
  FileText,
  Copy,
  Download,
  X,
  FileDown,
} from 'lucide-react';

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

function Field({
  label,
  value,
  col2,
}: {
  label: string;
  value?: string | number | null;
  col2?: boolean;
}) {
  return (
    <div className={col2 ? 'col-span-2' : ''}>
      <span className="mb-1 block text-[11px] font-medium uppercase tracking-[0.16em] text-slate-300">
        {label}
      </span>
      <span className="text-sm font-medium text-white">{value || '—'}</span>
    </div>
  );
}

function getActivoBadge(value?: string) {
  if (value === 'SI') {
    return 'inline-flex items-center rounded-full border border-emerald-400/25 bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-200';
  }
  if (value === 'NO') {
    return 'inline-flex items-center rounded-full border border-red-400/25 bg-red-500/15 px-2.5 py-1 text-xs font-medium text-red-200';
  }
  return 'inline-flex items-center rounded-full border border-slate-400/25 bg-slate-500/15 px-2.5 py-1 text-xs font-medium text-slate-200';
}

export default function List() {
  const navigate = useNavigate();
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [search, setSearch] = useState('');
  const [filterBy, setFilterBy] = useState('all');
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
    fetch(
      `/api/equipos?q=${encodeURIComponent(search)}&page=${page}&limit=${pageSize}&filterBy=${encodeURIComponent(filterBy)}`
    )
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
  }, [search, page, pageSize, filterBy]);

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este equipo?')) return;
    try {
      const res = await fetch(`/api/equipos/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setEquipoDetalle(null);
        fetchEquipos();
      } else {
        alert('❌ Error al eliminar el equipo');
      }
    } catch {
      alert('❌ Error al conectar con el servidor');
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`¿Eliminar ${selectedIds.length} equipo(s) seleccionado(s)?`)) return;
    try {
      await Promise.all(selectedIds.map(id => fetch(`/api/equipos/${id}`, { method: 'DELETE' })));
      setSelectedIds([]);
      fetchEquipos();
    } catch {
      alert('❌ Error al eliminar equipos');
    }
  };

  const toggleSelect = (id: number) =>
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]));

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
    setScriptContent('');
    setError('');
    try {
      const res = await fetch('/api/script?t=' + Date.now());
      const text = await res.text();
      setScriptContent(text);
    } catch {
      setError('Error al cargar el script');
    }
    setLoadingScript(false);
  };

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
    return d.toLocaleDateString('es-EC', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const isAllView = filterBy === 'all';

  const showNombre = isAllView || filterBy === 'nombre_pc' || filterBy === 'nombre_host';
  const showUsuario = isAllView || filterBy === 'usuario';
  const showResponsable = isAllView || filterBy === 'responsable_equipo';
  const showIPMAC = isAllView || filterBy === 'ip' || filterBy === 'mac_address';
  const showHardware =
    isAllView ||
    filterBy === 'serie' ||
    filterBy === 'marca' ||
    filterBy === 'modelo' ||
    filterBy === 'procesador' ||
    filterBy === 'tipo_recurso';
  const showDepartamento =
    isAllView || filterBy === 'departamento' || filterBy === 'area' || filterBy === 'establecimiento';
  const showEstado =
    isAllView || filterBy === 'activo' || filterBy === 'antivirus' || filterBy === 'etiquetado';

  const visibleColumns =
    1 +
    1 +
    (showNombre ? 1 : 0) +
    (showUsuario ? 1 : 0) +
    (showResponsable ? 1 : 0) +
    (showIPMAC ? 1 : 0) +
    (showHardware ? 1 : 0) +
    (showDepartamento ? 1 : 0) +
    (showEstado ? 1 : 0);

  return (
    <div className="space-y-6">
      {showScript && (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-slate-950/85 px-4 pb-4 pt-28 backdrop-blur-sm"
          onClick={() => setShowScript(false)}
        >
          <div
            className="flex max-h-[calc(100vh-8rem)] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-white/15 bg-slate-900 shadow-2xl shadow-black/40"
            onClick={e => e.stopPropagation()}
          >
            <div className="shrink-0 border-b border-white/15 bg-white/[0.06] px-5 py-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-200">
                    <FileText size={18} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-semibold text-white">
                      Script de inventario (PowerShell)
                    </h2>
                    <p className="text-xs text-slate-200">
                      Descarga el script y ejecútalo en las PCs para enviar su información automáticamente.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowScript(false)}
                  className="self-end rounded-xl p-2 text-slate-200 transition hover:bg-white/10 hover:text-white md:self-auto"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {error && (
              <div className="shrink-0 border-b border-red-500/20 bg-red-500/10 px-5 py-3 text-sm text-red-200">
                {error}
              </div>
            )}

            <div className="flex-1 overflow-y-auto bg-[#020617] p-4">
              {loadingScript ? (
                <p className="text-sm text-slate-200">Cargando script...</p>
              ) : (
                <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-2xl border border-white/10 bg-slate-950/80 p-4 text-xs font-mono text-emerald-300">
                  {scriptContent}
                </pre>
              )}
            </div>

            <div className="shrink-0 border-t border-white/15 bg-slate-900/95 px-5 py-4 backdrop-blur">
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  onClick={() => setShowScript(false)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/15"
                >
                  <X size={14} />
                  Cerrar
                </button>

                <button
                  onClick={handleCopiar}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/15"
                >
                  <Copy size={14} />
                  {copied ? '¡Copiado!' : 'Copiar'}
                </button>

                <button
                  onClick={handleDescargar}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-500 px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
                >
                  <Download size={14} />
                  Descargar .ps1
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {equipoDetalle && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setEquipoDetalle(null)} />
          <div className="relative flex h-full w-full max-w-2xl flex-col border-l border-white/15 bg-slate-900 shadow-2xl shadow-black/50">
            <div className="flex items-center justify-between border-b border-white/15 bg-white/[0.06] px-6 py-5">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  {equipoDetalle.nombre_host || equipoDetalle.nombre_pc || 'Sin nombre'}
                </h2>
                <p className="mt-1 text-xs text-slate-200">ID #{equipoDetalle.id}</p>
              </div>
              <button
                onClick={() => setEquipoDetalle(null)}
                className="rounded-xl p-2 text-slate-200 transition hover:bg-white/10 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                <div className="col-span-2 border-b border-white/15 pb-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-200">
                    Identificación
                  </span>
                </div>
                <Field label="Nombre Host" value={equipoDetalle.nombre_host} />
                <Field label="Nombre PC" value={equipoDetalle.nombre_pc} />
                <Field label="Usuario" value={equipoDetalle.usuario} />
                <Field label="Tipo Recurso" value={equipoDetalle.tipo_recurso} />
                <Field label="Marca" value={equipoDetalle.marca} />
                <Field label="Modelo" value={equipoDetalle.modelo} />
                <Field label="Serie" value={equipoDetalle.serie} />
                <Field label="S.O." value={equipoDetalle.sistema_operativo} />

                <div className="col-span-2 mt-2 border-b border-white/15 pb-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-200">Red</span>
                </div>
                <Field label="IP" value={equipoDetalle.ip} />
                <Field label="IP Extendida" value={equipoDetalle.ip_extendida} />
                <Field label="MAC Address" value={equipoDetalle.mac_address} />
                <Field label="MAC Address 2" value={equipoDetalle.mac_address2} />

                <div className="col-span-2 mt-2 border-b border-white/15 pb-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">Hardware</span>
                </div>
                <Field label="RAM" value={equipoDetalle.ram} />
                <Field label="Disco" value={equipoDetalle.disco} />
                <Field label="Antivirus" value={equipoDetalle.antivirus} />
                <Field label="Procesador" value={equipoDetalle.procesador} col2 />

                <div className="col-span-2 mt-2 border-b border-white/15 pb-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-200">
                    Organización
                  </span>
                </div>
                <Field label="Empresa" value={equipoDetalle.empresa} />
                <Field label="Establecimiento" value={equipoDetalle.establecimiento} />
                <Field label="Departamento" value={equipoDetalle.departamento} />
                <Field label="Área" value={equipoDetalle.area} />
                <Field label="Responsable" value={equipoDetalle.responsable_equipo} />

                <div className="col-span-2 mt-2 border-b border-white/15 pb-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">
                    Fechas y estado
                  </span>
                </div>
                <Field label="F. Adquisición" value={formatFecha(equipoDetalle.fecha_adquisicion)} />
                <Field label="F. Inventario" value={formatFecha(equipoDetalle.fecha_inventario)} />
                <Field label="Activo" value={equipoDetalle.activo} />
                <Field label="Etiquetado" value={equipoDetalle.etiquetado} />

                {equipoDetalle.observacion && (
                  <div className="col-span-2 mt-2">
                    <span className="mb-2 block text-[11px] font-medium uppercase tracking-[0.16em] text-slate-300">
                      Observación
                    </span>
                    <p className="rounded-2xl border border-white/15 bg-white/[0.06] p-4 text-sm text-white">
                      {equipoDetalle.observacion}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 border-t border-white/15 bg-white/[0.06] px-6 py-4">
              <button
                onClick={() => {
                  navigate(`/edit/${equipoDetalle.id}`);
                  setEquipoDetalle(null);
                }}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-500 px-4 py-3 text-sm font-medium text-white transition hover:opacity-90"
              >
                <Pencil size={15} />
                Editar
              </button>
              <button
                onClick={() => handleDelete(equipoDetalle.id)}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/25 bg-red-500/15 px-4 py-3 text-sm font-medium text-red-200 transition hover:bg-red-500/20"
              >
                <Trash2 size={15} />
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <span className="mb-2 inline-flex rounded-full border border-indigo-400/25 bg-indigo-500/15 px-3 py-1 text-xs font-medium text-indigo-200">
            Gestión centralizada
          </span>
          <h1 className="text-3xl font-semibold tracking-tight text-white">Inventario de Equipos</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-200">
            Administra equipos, consulta detalles, importa registros y exporta información desde un panel moderno.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {selectedIds.length > 0 && (
            <button
              onClick={handleDeleteSelected}
              className="inline-flex items-center gap-2 rounded-2xl border border-red-500/25 bg-red-500/15 px-4 py-2.5 text-sm font-medium text-red-200 transition hover:bg-red-500/20"
            >
              <Trash2 size={16} />
              Eliminar seleccionados ({selectedIds.length})
            </button>
          )}

          <button
            onClick={handleVerScript}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/15"
          >
            <FileText size={16} />
            Ver Script
          </button>

          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
          >
            <FileDown size={16} />
            Exportar Excel
          </button>

          <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-500 px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90">
            <Upload size={16} />
            {importing ? 'Importando...' : 'Importar Excel'}
            <input
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleImportExcel}
              disabled={importing}
            />
          </label>
        </div>
      </div>

      {importMessage && (
        <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/15 px-4 py-3 text-sm font-medium text-emerald-200">
          {importMessage}
        </div>
      )}

      {importError && (
        <div className="rounded-2xl border border-red-500/25 bg-red-500/15 px-4 py-3 text-sm font-medium text-red-200">
          {importError}
        </div>
      )}

      <div className="rounded-3xl border border-white/15 bg-slate-900/70 p-4 shadow-xl shadow-black/10">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex w-full flex-col gap-3 lg:max-w-4xl lg:flex-row">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
              <input
                type="text"
                placeholder="Buscar por el valor del filtro seleccionado..."
                value={search}
                onChange={e => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="h-12 w-full rounded-2xl border border-white/15 bg-white/[0.08] pl-11 pr-4 text-sm text-white placeholder:text-slate-400 focus:border-indigo-400/50 focus:outline-none focus:ring-4 focus:ring-indigo-500/15"
              />
            </div>

            <select
              value={filterBy}
              onChange={e => {
                setFilterBy(e.target.value);
                setPage(1);
              }}
              className="h-12 rounded-2xl border border-white/15 bg-white/[0.08] px-4 text-sm text-white focus:border-indigo-400/50 focus:outline-none focus:ring-4 focus:ring-indigo-500/15"
            >
              <option value="all" className="bg-slate-900">Filtrar Por</option>
              <option value="nombre_pc" className="bg-slate-900">Nombre PC</option>
              <option value="nombre_host" className="bg-slate-900">Nombre Host</option>
              <option value="usuario" className="bg-slate-900">Usuario</option>
              <option value="responsable_equipo" className="bg-slate-900">Responsable</option>
              <option value="ip" className="bg-slate-900">IP</option>
              <option value="mac_address" className="bg-slate-900">MAC</option>
              <option value="departamento" className="bg-slate-900">Departamento</option>
              <option value="area" className="bg-slate-900">Área</option>
              <option value="establecimiento" className="bg-slate-900">Establecimiento</option>
              <option value="serie" className="bg-slate-900">Serie</option>
              <option value="marca" className="bg-slate-900">Marca</option>
              <option value="modelo" className="bg-slate-900">Modelo</option>
              <option value="procesador" className="bg-slate-900">Procesador</option>
              <option value="tipo_recurso" className="bg-slate-900">Tipo recurso</option>
              <option value="activo" className="bg-slate-900">Estado</option>
              <option value="antivirus" className="bg-slate-900">Antivirus</option>
              <option value="etiquetado" className="bg-slate-900">Etiquetado</option>
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-2xl border border-white/15 bg-white/[0.08] px-4 py-2 text-sm text-slate-100">
              Seleccionados: <span className="font-semibold text-white">{selectedIds.length}</span>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/[0.08] px-4 py-2 text-sm text-slate-100">
              Total registros: <span className="font-semibold text-white">{total}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-white/15 bg-slate-900/70 shadow-2xl shadow-black/20">
        <div className="flex items-center justify-between border-b border-white/15 bg-white/[0.06] px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-white">
              {filterBy === 'all' ? 'Listado principal' : `Resultados por filtro: ${filterBy}`}
            </h2>
            <p className="text-xs text-slate-200">
              {filterBy === 'all'
                ? 'Haz clic en una fila para ver el detalle completo del equipo.'
                : 'La tabla muestra solo la información del filtro seleccionado.'}
            </p>
          </div>
        </div>

        <div className="w-full overflow-x-auto rounded-b-3xl">
          <table className="min-w-[900px] table-fixed text-sm">
            <thead className="sticky top-0 z-10 border-b border-white/15 bg-slate-900">
              <tr>
                <th className="w-[40px] px-3 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === equipos?.length && equipos?.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-white/15 bg-slate-800 text-indigo-500"
                  />
                </th>

                <th className="w-[70px] px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-200">
                  ID
                </th>

                {showNombre && (
                  <th className="w-[220px] px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-200">
                    {filterBy === 'nombre_host' ? 'Nombre Host' : 'Nombre PC'}
                  </th>
                )}

                {showUsuario && (
                  <th className="w-[180px] px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-200">
                    Usuario
                  </th>
                )}

                {showResponsable && (
                  <th className="w-[220px] px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-200">
                    Responsable
                  </th>
                )}

                {showIPMAC && (
                  <th className="w-[220px] px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-200">
                    {filterBy === 'mac_address' ? 'MAC Address' : filterBy === 'ip' ? 'IP' : 'IP / MAC'}
                  </th>
                )}

                {showHardware && (
                  <th className="w-[260px] px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-200">
                    Hardware
                  </th>
                )}

                {showDepartamento && (
                  <th className="w-[180px] px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-200">
                    {filterBy === 'area'
                      ? 'Área'
                      : filterBy === 'establecimiento'
                      ? 'Establecimiento'
                      : 'Departamento'}
                  </th>
                )}

                {showEstado && (
                  <th className="w-[140px] px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-200">
                    {filterBy === 'antivirus'
                      ? 'Antivirus'
                      : filterBy === 'etiquetado'
                      ? 'Etiquetado'
                      : 'Estado'}
                  </th>
                )}
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={visibleColumns} className="px-4 py-12 text-center text-slate-200">
                    <RefreshCw size={20} className="mr-2 inline animate-spin" />
                    Cargando equipos...
                  </td>
                </tr>
              ) : equipos.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumns} className="px-4 py-12 text-center text-slate-200">
                    No se encontraron equipos.
                  </td>
                </tr>
              ) : (
                equipos
                  .filter((equipo): equipo is Equipo => equipo != null)
                  .map(equipo => (
                    <tr
                      key={equipo.id}
                      onClick={() => setEquipoDetalle(equipo)}
                      className={`cursor-pointer border-b border-white/10 transition hover:bg-indigo-500/10 ${
                        selectedIds.includes(equipo.id) ? 'bg-indigo-500/15' : ''
                      }`}
                    >
                      <td
                        className="px-3 py-3"
                        onClick={e => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(equipo.id)}
                          onChange={() => toggleSelect(equipo.id)}
                          className="rounded border-white/15 bg-slate-800 text-indigo-500"
                        />
                      </td>

                      <td className="px-3 py-3 font-mono text-xs text-slate-200">
                        {equipo.id}
                      </td>

                      {showNombre && (
                        <td className="px-3 py-3">
                          {filterBy === 'nombre_host' ? (
                            <div className="truncate font-medium text-white">
                              {equipo.nombre_host || '-'}
                            </div>
                          ) : filterBy === 'nombre_pc' ? (
                            <div className="truncate font-medium text-white">
                              {equipo.nombre_pc || '-'}
                            </div>
                          ) : (
                            <>
                              <div className="truncate font-medium text-white">
                                {equipo.nombre_host || equipo.nombre_pc || '-'}
                              </div>
                              <div className="text-xs text-slate-300">
                                {equipo.tipo_recurso || 'Sin tipo'}
                              </div>
                            </>
                          )}
                        </td>
                      )}

                      {showUsuario && (
                        <td className="px-3 py-3 truncate text-slate-100">
                          {equipo.usuario || '-'}
                        </td>
                      )}

                      {showResponsable && (
                        <td className="px-3 py-3 truncate text-slate-100">
                          {equipo.responsable_equipo || '-'}
                        </td>
                      )}

                      {showIPMAC && (
                        <td className="px-3 py-3">
                          {filterBy === 'ip' ? (
                            <div className="truncate text-white">{equipo.ip || '-'}</div>
                          ) : filterBy === 'mac_address' ? (
                            <div className="truncate text-white">{equipo.mac_address || '-'}</div>
                          ) : (
                            <>
                              <div className="truncate text-white">
                                {equipo.ip || '-'}
                              </div>
                              <div className="truncate text-xs text-slate-300">
                                {equipo.mac_address || '-'}
                              </div>
                            </>
                          )}
                        </td>
                      )}

                      {showHardware && (
                        <td className="px-3 py-3">
                          {filterBy === 'serie' ? (
                            <div className="truncate text-white">{equipo.serie || '-'}</div>
                          ) : filterBy === 'marca' ? (
                            <div className="truncate text-white">{equipo.marca || '-'}</div>
                          ) : filterBy === 'modelo' ? (
                            <div className="truncate text-white">{equipo.modelo || '-'}</div>
                          ) : filterBy === 'procesador' ? (
                            <div className="truncate text-white">{equipo.procesador || '-'}</div>
                          ) : filterBy === 'tipo_recurso' ? (
                            <div className="truncate text-white">{equipo.tipo_recurso || '-'}</div>
                          ) : (
                            <>
                              <div className="truncate text-white">
                                {equipo.procesador || '-'}
                              </div>
                              <div className="truncate text-xs text-slate-300">
                                {[equipo.ram && `${equipo.ram} RAM`, equipo.disco]
                                  .filter(Boolean)
                                  .join(' / ')}
                              </div>
                            </>
                          )}
                        </td>
                      )}

                      {showDepartamento && (
                        <td className="px-3 py-3 truncate text-slate-100">
                          {filterBy === 'area'
                            ? equipo.area || '-'
                            : filterBy === 'establecimiento'
                            ? equipo.establecimiento || '-'
                            : equipo.departamento || '-'}
                        </td>
                      )}

                      {showEstado && (
                        <td className="px-3 py-3">
                          {filterBy === 'antivirus' ? (
                            <span className="text-slate-100">{equipo.antivirus || '-'}</span>
                          ) : filterBy === 'etiquetado' ? (
                            <span className="text-slate-100">{equipo.etiquetado || '-'}</span>
                          ) : (
                            <span className={getActivoBadge(equipo.activo)}>
                              {equipo.activo || '—'}
                            </span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-white/15 bg-white/[0.06] px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
        <p className="text-sm text-slate-100">
          Mostrando {total === 0 ? 0 : (page - 1) * pageSize + 1} a {Math.min(page * pageSize, total)} de {total} resultados
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-100">Mostrar:</label>
            <select
              value={pageSize}
              onChange={e => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="rounded-xl border border-white/15 bg-slate-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            >
              {Array.from({ length: 11 }, (_, i) => i + 10).map(n => (
                <option key={n} value={n}>
                  {n} filas
                </option>
              ))}
            </select>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-white transition hover:bg-white/15 disabled:opacity-40"
              >
                ← Anterior
              </button>
              <span className="px-2 text-sm text-slate-100">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-white transition hover:bg-white/15 disabled:opacity-40"
              >
                Siguiente →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
