import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  ShieldAlert,
} from 'lucide-react';
import ActaEntrega from '../components/ActaEntrega';

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

interface ImportPreviewItem {
  rowIndex: number;
  importKey: string;
  equipo: Equipo & Record<string, any>;
  duplicateReason?: string;
  existing?: Record<string, any>;
  reason?: string;
}

interface ImportPreviewState {
  totalRows: number;
  readyToImport: ImportPreviewItem[];
  duplicates: ImportPreviewItem[];
  invalidRows: ImportPreviewItem[];
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
      <span className="mb-1 block text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400">
        {label}
      </span>
      <span className="text-sm font-medium text-slate-100">{value || '—'}</span>
    </div>
  );
}

function getActivoBadge(value?: string) {
  if (value === 'SI') {
    return 'inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-200';
  }
  if (value === 'NO') {
    return 'inline-flex items-center rounded-full border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-200';
  }
  return 'inline-flex items-center rounded-full border border-slate-600/70 bg-slate-800/80 px-2.5 py-1 text-xs font-medium text-slate-300';
}

export default function List() {
  const navigate = useNavigate();
  const location = useLocation();

  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [search, setSearch] = useState('');
  const [filterBy, setFilterBy] = useState('all');
  const [sortBy, setSortBy] = useState('id');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState('');
  const [importError, setImportError] = useState('');

  const [importPreview, setImportPreview] = useState<ImportPreviewState | null>(null);
  const [showImportPreview, setShowImportPreview] = useState(false);
  const [selectedDuplicateKeys, setSelectedDuplicateKeys] = useState<string[]>([]);
  const [importingPreview, setImportingPreview] = useState(false);

  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [equipoDetalle, setEquipoDetalle] = useState<Equipo | null>(null);

  const [showScript, setShowScript] = useState(false);
  const [scriptContent, setScriptContent] = useState('');
  const [loadingScript, setLoadingScript] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const [pageSize, setPageSize] = useState(10);
  const [isAdmin, setIsAdmin] = useState(false);

  const [showActa, setShowActa] = useState(false);
  const [equipoActa, setEquipoActa] = useState<Equipo | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    setIsAdmin(!!token && role === 'admin');
  }, [equipoDetalle, showScript, showActa]);

  const getAuthHeaders = (): HeadersInit => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchEquipos = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/equipos?q=${encodeURIComponent(search)}&page=${page}&limit=${pageSize}&filterBy=${encodeURIComponent(filterBy)}&sortBy=${encodeURIComponent(sortBy)}&sortDir=${sortDir}`
      );
      const data = await res.json();
      setEquipos(data.data || []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEquipos();
  }, [search, page, pageSize, filterBy, sortBy, sortDir]);

  useEffect(() => {
    if ((location.state as any)?.refresh) {
      setSelectedIds([]);
      setEquipoDetalle(null);
      setSearch('');
      setFilterBy('all');
      setPage(1);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const handleDelete = async (id: number) => {
    if (!isAdmin) {
      alert('Debes iniciar sesión como admin para eliminar');
      return;
    }

    if (!confirm('¿Estás seguro de que deseas eliminar este equipo?')) return;

    try {
      const res = await fetch(`/api/equipos/${id}`, {
        method: 'DELETE',
        headers: {
          ...getAuthHeaders(),
        },
      });

      const data = await res.json().catch(() => null);

      if (res.ok) {
        setEquipoDetalle(null);
        fetchEquipos();
      } else {
        alert(data?.error || 'Error al eliminar el equipo');
      }
    } catch {
      alert('Error al conectar con el servidor');
    }
  };

  const handleDeleteSelected = async () => {
    if (!isAdmin) {
      alert('Debes iniciar sesión como admin para eliminar');
      return;
    }

    if (selectedIds.length === 0) return;
    if (!confirm(`¿Eliminar ${selectedIds.length} equipos seleccionados?`)) return;

    try {
      const results = await Promise.all(
        selectedIds.map((id) =>
          fetch(`/api/equipos/${id}`, {
            method: 'DELETE',
            headers: {
              ...getAuthHeaders(),
            },
          })
        )
      );

      const hasError = results.some((r) => !r.ok);

      if (hasError) {
        alert('Uno o más equipos no pudieron eliminarse');
      }

      setSelectedIds([]);
      fetchEquipos();
    } catch {
      alert('Error al eliminar equipos');
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === equipos.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(equipos.map((e) => e.id));
    }
  };

  const handleExportExcel = async () => {
    if (!isAdmin) {
      alert('Debes iniciar sesión como admin para exportar');
      return;
    }

    try {
      const res = await fetch('/api/export', {
        headers: {
          ...getAuthHeaders(),
        },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Error al exportar');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'inventarioequipos.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || 'Error al exportar');
    }
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isAdmin) {
      alert('Debes iniciar sesión como admin para importar');
      e.target.value = '';
      return;
    }

    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportMessage('');
    setImportError('');
    setImportPreview(null);
    setSelectedDuplicateKeys([]);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/importexcel/preview', {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
        },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || 'Error al analizar el Excel');
      }

      setImportPreview(data);
      setSelectedDuplicateKeys(
        (data.duplicates || []).map((d: ImportPreviewItem) => d.importKey)
      );
      setShowImportPreview(true);
    } catch (err: any) {
      setImportError(err.message || 'Error al importar');
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  const toggleDuplicateSelection = (importKey: string) => {
    setSelectedDuplicateKeys((prev) =>
      prev.includes(importKey)
        ? prev.filter((k) => k !== importKey)
        : [...prev, importKey]
    );
  };

  const confirmImportExcel = async () => {
    if (!importPreview) return;

    try {
      setImportingPreview(true);
      setImportError('');
      setImportMessage('');

      const selectedDuplicates = importPreview.duplicates.filter((item) =>
        selectedDuplicateKeys.includes(item.importKey)
      );

      const res = await fetch('/api/importexcel/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          readyToImport: importPreview.readyToImport,
          selectedDuplicates,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || 'Error al confirmar importación');
      }

      setImportMessage(data.message || 'Importación completada');
      setShowImportPreview(false);
      setImportPreview(null);
      setSelectedDuplicateKeys([]);
      fetchEquipos();
    } catch (err: any) {
      setImportError(err.message || 'Error al confirmar importación');
    } finally {
      setImportingPreview(false);
    }
  };

  const handleVerScript = async () => {
    if (!isAdmin) {
      alert('Debes iniciar sesión como admin para ver el script');
      return;
    }

    setShowScript(true);
    setLoadingScript(true);
    setScriptContent('');
    setError('');

    try {
      const res = await fetch(`/api/script?t=${Date.now()}`, {
        headers: {
          ...getAuthHeaders(),
          'Cache-Control': 'no-cache',
        },
        cache: 'no-store',
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Error al cargar el script');
      }

      const text = await res.text();
      setScriptContent(text);
    } catch (err: any) {
      setError(err.message || 'Error al cargar el script');
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
      alert('No se pudo copiar. Selecciona el texto manualmente.');
    }
  };

  const handleDescargar = () => {
    const blob = new Blob([scriptContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'inventarioequipos.ps1';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const formatFecha = (fecha?: string) => {
    if (!fecha) return '';
    const d = new Date(fecha);
    if (isNaN(d.getTime())) return '';
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
    isAllView ||
    filterBy === 'departamento' ||
    filterBy === 'area' ||
    filterBy === 'establecimiento';
  const showEstado =
    isAllView || filterBy === 'activo' || filterBy === 'antivirus' || filterBy === 'etiquetado';

  const visibleColumns =
    2 +
    (showNombre ? 1 : 0) +
    (showUsuario ? 1 : 0) +
    (showResponsable ? 1 : 0) +
    (showIPMAC ? 1 : 0) +
    (showHardware ? 1 : 0) +
    (showDepartamento ? 1 : 0) +
    (showEstado ? 1 : 0);

  const inputClass =
    'h-12 rounded-2xl border border-slate-700/70 bg-slate-950/70 px-4 text-sm text-slate-100 placeholder:text-slate-500 transition focus:border-blue-400/60 focus:outline-none focus:ring-4 focus:ring-blue-500/10';

  const panelClass =
    'rounded-[28px] border border-slate-800 bg-slate-900/85 shadow-2xl shadow-black/20';

  return (
    <div className="space-y-6">
      {showActa && equipoActa && (
        <ActaEntrega
          equipo={equipoActa}
          onClose={() => {
            setShowActa(false);
            setEquipoActa(null);
          }}
        />
      )}

      {showImportPreview && importPreview && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-7xl overflow-hidden rounded-[28px] border border-slate-800 bg-slate-900 shadow-2xl shadow-black/40">
            <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/95 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Revisar importación</h2>
                <p className="text-sm text-slate-400">
                  Filas: {importPreview.totalRows} · Nuevos: {importPreview.readyToImport.length} ·
                  Duplicados: {importPreview.duplicates.length} · Inválidos:{' '}
                  {importPreview.invalidRows.length}
                </p>
              </div>

              <button
                onClick={() => setShowImportPreview(false)}
                className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="max-h-[68vh] overflow-y-auto space-y-6 p-6">
              <div>
                <h3 className="mb-3 text-base font-semibold text-emerald-300">
                  Listos para importar ({importPreview.readyToImport.length})
                </h3>

                <div className="overflow-x-auto rounded-2xl border border-slate-800">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-950/70 text-slate-400">
                      <tr>
                        <th className="px-3 py-2 text-left">Fila</th>
                        <th className="px-3 py-2 text-left">Host / PC</th>
                        <th className="px-3 py-2 text-left">Responsable</th>
                        <th className="px-3 py-2 text-left">Serie</th>
                        <th className="px-3 py-2 text-left">MAC</th>
                        <th className="px-3 py-2 text-left">IP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.readyToImport.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-3 py-4 text-center text-slate-500">
                            No hay registros nuevos listos para importar
                          </td>
                        </tr>
                      ) : (
                        importPreview.readyToImport.map((item) => (
                          <tr
                            key={item.importKey}
                            className="border-t border-slate-800 text-slate-200"
                          >
                            <td className="px-3 py-2">{item.rowIndex}</td>
                            <td className="px-3 py-2">
                              {item.equipo.nombre_host || item.equipo.nombre_pc || '-'}
                            </td>
                            <td className="px-3 py-2">
                              {item.equipo.responsable_equipo || '-'}
                            </td>
                            <td className="px-3 py-2">{item.equipo.serie || '-'}</td>
                            <td className="px-3 py-2">{item.equipo.mac_address || '-'}</td>
                            <td className="px-3 py-2">{item.equipo.ip || '-'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-base font-semibold text-amber-300">
                    Duplicados detectados ({importPreview.duplicates.length})
                  </h3>

                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        setSelectedDuplicateKeys(importPreview.duplicates.map((d) => d.importKey))
                      }
                      className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white transition hover:border-slate-600 hover:bg-slate-800/80"
                    >
                      Seleccionar todos
                    </button>
                    <button
                      onClick={() => setSelectedDuplicateKeys([])}
                      className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white transition hover:border-slate-600 hover:bg-slate-800/80"
                    >
                      Quitar todos
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-800">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-950/70 text-slate-400">
                      <tr>
                        <th className="px-3 py-2 text-left">Agregar</th>
                        <th className="px-3 py-2 text-left">Fila</th>
                        <th className="px-3 py-2 text-left">Motivo</th>
                        <th className="px-3 py-2 text-left">Host / PC</th>
                        <th className="px-3 py-2 text-left">Responsable</th>
                        <th className="px-3 py-2 text-left">Serie</th>
                        <th className="px-3 py-2 text-left">MAC</th>
                        <th className="px-3 py-2 text-left">Existe ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.duplicates.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-3 py-4 text-center text-slate-500">
                            No se detectaron duplicados
                          </td>
                        </tr>
                      ) : (
                        importPreview.duplicates.map((item) => (
                          <tr
                            key={`${item.importKey}-${item.rowIndex}`}
                            className="border-t border-slate-800 text-slate-200"
                          >
                            <td className="px-3 py-2">
                              <input
                                type="checkbox"
                                checked={selectedDuplicateKeys.includes(item.importKey)}
                                onChange={() => toggleDuplicateSelection(item.importKey)}
                                className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-blue-500"
                              />
                            </td>
                            <td className="px-3 py-2">{item.rowIndex}</td>
                            <td className="px-3 py-2">{item.duplicateReason || '-'}</td>
                            <td className="px-3 py-2">
                              {item.equipo.nombre_host || item.equipo.nombre_pc || '-'}
                            </td>
                            <td className="px-3 py-2">
                              {item.equipo.responsable_equipo || '-'}
                            </td>
                            <td className="px-3 py-2">{item.equipo.serie || '-'}</td>
                            <td className="px-3 py-2">{item.equipo.mac_address || '-'}</td>
                            <td className="px-3 py-2">{item.existing?.id || '-'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h3 className="mb-3 text-base font-semibold text-rose-300">
                  Filas inválidas ({importPreview.invalidRows.length})
                </h3>

                <div className="overflow-x-auto rounded-2xl border border-slate-800">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-950/70 text-slate-400">
                      <tr>
                        <th className="px-3 py-2 text-left">Fila</th>
                        <th className="px-3 py-2 text-left">Motivo</th>
                        <th className="px-3 py-2 text-left">Host / PC</th>
                        <th className="px-3 py-2 text-left">Responsable</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.invalidRows.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-3 py-4 text-center text-slate-500">
                            No hay filas inválidas
                          </td>
                        </tr>
                      ) : (
                        importPreview.invalidRows.map((item, idx) => (
                          <tr
                            key={`${item.rowIndex}-${idx}`}
                            className="border-t border-slate-800 text-slate-200"
                          >
                            <td className="px-3 py-2">{item.rowIndex}</td>
                            <td className="px-3 py-2">{item.reason || '-'}</td>
                            <td className="px-3 py-2">
                              {item.equipo?.nombre_host || item.equipo?.nombre_pc || '-'}
                            </td>
                            <td className="px-3 py-2">
                              {item.equipo?.responsable_equipo || '-'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-800 bg-slate-900/95 px-6 py-4">
              <p className="text-sm text-slate-400">
                Se importarán{' '}
                {importPreview.readyToImport.length + selectedDuplicateKeys.length} registros
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowImportPreview(false)}
                  className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-medium text-white transition hover:border-slate-600 hover:bg-slate-800/80"
                >
                  Cancelar
                </button>

                <button
                  onClick={confirmImportExcel}
                  disabled={importingPreview}
                  className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-500 disabled:opacity-60"
                >
                  {importingPreview ? 'Importando...' : 'Importar seleccionados'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showScript && (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-slate-950/85 px-4 pb-4 pt-28 backdrop-blur-sm"
          onClick={() => setShowScript(false)}
        >
          <div
            className="flex max-h-[calc(100vh-8rem)] w-full max-w-5xl flex-col overflow-hidden rounded-[28px] border border-slate-800 bg-slate-900 shadow-2xl shadow-black/40"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="shrink-0 border-b border-slate-800 bg-slate-900/95 px-5 py-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-500/10 text-blue-200">
                    <FileText size={18} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-semibold text-white">
                      Script de inventario PowerShell
                    </h2>
                    <p className="text-xs text-slate-400">
                      Descarga el script y ejecútalo en las PCs para enviar su información
                      automáticamente.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowScript(false)}
                  className="self-end rounded-xl p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white md:self-auto"
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

            <div className="flex-1 overflow-y-auto bg-slate-950 p-4">
              {loadingScript ? (
                <p className="text-sm text-slate-300">Cargando script...</p>
              ) : (
                <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-2xl border border-slate-800 bg-slate-950/80 p-4 text-xs font-mono text-emerald-300">
                  {scriptContent}
                </pre>
              )}
            </div>

            <div className="shrink-0 border-t border-slate-800 bg-slate-900/95 px-5 py-4">
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  onClick={() => setShowScript(false)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-medium text-white transition hover:border-slate-600 hover:bg-slate-800/80"
                >
                  <X size={14} />
                  Cerrar
                </button>
                <button
                  onClick={handleCopiar}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-medium text-white transition hover:border-slate-600 hover:bg-slate-800/80"
                >
                  <Copy size={14} />
                  {copied ? '¡Copiado!' : 'Copiar'}
                </button>
                <button
                  onClick={handleDescargar}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-500"
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
          <div
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            onClick={() => setEquipoDetalle(null)}
          />
          <div className="relative flex h-full w-full max-w-2xl flex-col border-l border-slate-800 bg-slate-900 shadow-2xl shadow-black/50">
            <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/95 px-6 py-5">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  {equipoDetalle.nombre_host || equipoDetalle.nombre_pc || 'Sin nombre'}
                </h2>
                <p className="mt-1 text-xs text-slate-400">ID #{equipoDetalle.id}</p>
              </div>
              <button
                onClick={() => setEquipoDetalle(null)}
                className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                <div className="col-span-2 border-b border-slate-800 pb-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-200">
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

                <div className="col-span-2 mt-2 border-b border-slate-800 pb-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">
                    Red
                  </span>
                </div>

                <Field label="IP" value={equipoDetalle.ip} />
                <Field label="IP Extendida" value={equipoDetalle.ip_extendida} />
                <Field label="MAC Address" value={equipoDetalle.mac_address} />
                <Field label="MAC Address 2" value={equipoDetalle.mac_address2} />

                <div className="col-span-2 mt-2 border-b border-slate-800 pb-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">
                    Hardware
                  </span>
                </div>

                <Field label="RAM" value={equipoDetalle.ram} />
                <Field label="Disco" value={equipoDetalle.disco} />
                <Field label="Antivirus" value={equipoDetalle.antivirus} />
                <Field label="Procesador" value={equipoDetalle.procesador} col2 />

                <div className="col-span-2 mt-2 border-b border-slate-800 pb-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-200">
                    Organización
                  </span>
                </div>

                <Field label="Empresa" value={equipoDetalle.empresa} />
                <Field label="Establecimiento" value={equipoDetalle.establecimiento} />
                <Field label="Departamento" value={equipoDetalle.departamento} />
                <Field label="Área" value={equipoDetalle.area} />
                <Field label="Responsable" value={equipoDetalle.responsable_equipo} />

                <div className="col-span-2 mt-2 border-b border-slate-800 pb-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-200">
                    Fechas y estado
                  </span>
                </div>

                <Field
                  label="F. Adquisición"
                  value={formatFecha(equipoDetalle.fecha_adquisicion)}
                />
                <Field
                  label="F. Inventario"
                  value={formatFecha(equipoDetalle.fecha_inventario)}
                />
                <Field label="Activo" value={equipoDetalle.activo} />
                <Field label="Etiquetado" value={equipoDetalle.etiquetado} />

                {equipoDetalle.observacion && (
                  <div className="col-span-2 mt-2">
                    <span className="mb-2 block text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400">
                      Observación
                    </span>
                    <p className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-100">
                      {equipoDetalle.observacion}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-slate-800 bg-slate-900/95 px-6 py-4">
              {isAdmin ? (
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setEquipoActa(equipoDetalle);
                      setShowActa(true);
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-sm font-medium text-cyan-200 transition hover:bg-cyan-500/15"
                  >
                    <FileText size={15} />
                    Acta
                  </button>

                  <button
                    onClick={() => {
                      navigate(`/edit/${equipoDetalle.id}`);
                      setEquipoDetalle(null);
                    }}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-blue-500"
                  >
                    <Pencil size={15} />
                    Editar
                  </button>

                  <button
                    onClick={() => handleDelete(equipoDetalle.id)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-200 transition hover:bg-red-500/15"
                  >
                    <Trash2 size={15} />
                    Eliminar
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                  <ShieldAlert size={18} />
                  Inicia sesión como administrador para editar o eliminar este equipo.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <span className="mb-2 inline-flex rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-200">
            Gestión centralizada
          </span>
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            Inventario de Equipos
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            Administra equipos, consulta detalles, importa registros y exporta información.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {selectedIds.length > 0 && isAdmin && (
            <button
              onClick={handleDeleteSelected}
              className="inline-flex items-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-200 transition hover:bg-red-500/15"
            >
              <Trash2 size={16} />
              Eliminar seleccionados ({selectedIds.length})
            </button>
          )}

          {isAdmin && (
            <>
              <button
                onClick={handleVerScript}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-medium text-white transition hover:border-slate-600 hover:bg-slate-800/80"
              >
                <FileText size={16} />
                Ver Script
              </button>

              <button
                onClick={handleExportExcel}
                className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-500"
              >
                <FileDown size={16} />
                Exportar Excel
              </button>

              <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-500">
                <Upload size={16} />
                {importing ? 'Analizando...' : 'Importar Excel'}
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={handleImportExcel}
                  disabled={importing}
                />
              </label>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/85 px-4 py-4">
          <span className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
            Registros
          </span>
          <div className="mt-2 text-2xl font-semibold text-white">{total}</div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/85 px-4 py-4">
          <span className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
            Seleccionados
          </span>
          <div className="mt-2 text-2xl font-semibold text-white">{selectedIds.length}</div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/85 px-4 py-4">
          <span className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
            Página
          </span>
          <div className="mt-2 text-2xl font-semibold text-white">
            {page} <span className="text-base font-medium text-slate-500">/ {totalPages}</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/85 px-4 py-4">
          <span className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
            Filtro activo
          </span>
          <div className="mt-2 text-lg font-semibold text-white">
            {filterBy === 'all' ? 'Todos los campos' : filterBy}
          </div>
        </div>
      </div>

      {importMessage && (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-200">
          {importMessage}
        </div>
      )}

      {importError && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-200">
          {importError}
        </div>
      )}

      {!isAdmin && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Solo el usuario admin puede ver el script, importar, exportar, editar o eliminar equipos.
        </div>
      )}

      <div className={`${panelClass} p-4 sm:p-5`}>
        <div className="flex flex-col gap-4">
          <div className="w-full">
            <label
              htmlFor="search"
              className="mb-1 block text-xs font-medium uppercase tracking-[0.16em] text-slate-400"
            >
              Buscar
            </label>
            <div className="relative">
              <Search
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <input
                id="search"
                type="text"
                placeholder="Buscar por el valor del filtro seleccionado..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className={`${inputClass} w-full pl-11 pr-4`}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div className="flex min-w-[220px] flex-col gap-1">
              <label
                htmlFor="filterBy"
                className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400"
              >
                Filtrar por
              </label>
              <select
                id="filterBy"
                value={filterBy}
                onChange={(e) => {
                  setFilterBy(e.target.value);
                  setPage(1);
                }}
                className={inputClass}
              >
                <option value="all" className="bg-slate-900">
                  Todos los campos
                </option>
                <option value="nombre_pc" className="bg-slate-900">
                  Nombre PC
                </option>
                <option value="nombre_host" className="bg-slate-900">
                  Nombre Host
                </option>
                <option value="usuario" className="bg-slate-900">
                  Usuario
                </option>
                <option value="responsable_equipo" className="bg-slate-900">
                  Responsable
                </option>
                <option value="ip" className="bg-slate-900">
                  IP
                </option>
                <option value="mac_address" className="bg-slate-900">
                  MAC
                </option>
                <option value="departamento" className="bg-slate-900">
                  Departamento
                </option>
                <option value="area" className="bg-slate-900">
                  Área
                </option>
                <option value="establecimiento" className="bg-slate-900">
                  Establecimiento
                </option>
                <option value="serie" className="bg-slate-900">
                  Serie
                </option>
                <option value="marca" className="bg-slate-900">
                  Marca
                </option>
                <option value="modelo" className="bg-slate-900">
                  Modelo
                </option>
                <option value="procesador" className="bg-slate-900">
                  Procesador
                </option>
                <option value="tipo_recurso" className="bg-slate-900">
                  Tipo recurso
                </option>
                <option value="activo" className="bg-slate-900">
                  Estado
                </option>
                <option value="antivirus" className="bg-slate-900">
                  Antivirus
                </option>
                <option value="etiquetado" className="bg-slate-900">
                  Etiquetado
                </option>
              </select>
            </div>

            <div className="flex min-w-[220px] flex-col gap-1">
              <label
                htmlFor="sortBy"
                className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400"
              >
                Ordenar por
              </label>
              <select
                id="sortBy"
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setPage(1);
                }}
                className={inputClass}
              >
                <option value="id" className="bg-slate-900">
                  ID
                </option>
                <option value="fecha_inventario" className="bg-slate-900">
                  Fecha inventario
                </option>
                <option value="fecha_adquisicion" className="bg-slate-900">
                  Fecha adquisición
                </option>
                <option value="fecha_instalacion" className="bg-slate-900">
                  Fecha instalación
                </option>
                <option value="fecha_mantenimiento" className="bg-slate-900">
                  Fecha mantenimiento
                </option>
                <option value="nombre_host" className="bg-slate-900">
                  Nombre host
                </option>
                <option value="nombre_pc" className="bg-slate-900">
                  Nombre PC
                </option>
                <option value="responsable_equipo" className="bg-slate-900">
                  Responsable
                </option>
                <option value="departamento" className="bg-slate-900">
                  Departamento
                </option>
                <option value="area" className="bg-slate-900">
                  Área
                </option>
                <option value="serie" className="bg-slate-900">
                  Serie
                </option>
                <option value="marca" className="bg-slate-900">
                  Marca
                </option>
                <option value="modelo" className="bg-slate-900">
                  Modelo
                </option>
                <option value="activo" className="bg-slate-900">
                  Estado
                </option>
              </select>
            </div>

            <div className="flex min-w-[180px] flex-col gap-1">
              <label
                htmlFor="sortDir"
                className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400"
              >
                Dirección
              </label>
              <select
                id="sortDir"
                value={sortDir}
                onChange={(e) => {
                  setSortDir(e.target.value as 'asc' | 'desc');
                  setPage(1);
                }}
                className={inputClass}
              >
                <option value="desc" className="bg-slate-900">
                  Descendente
                </option>
                <option value="asc" className="bg-slate-900">
                  Ascendente
                </option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className={panelClass}>
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/95 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-white">
              {filterBy === 'all' ? 'Listado principal' : `Resultados por filtro: ${filterBy}`}
            </h2>
            <p className="text-xs text-slate-400">
              {filterBy === 'all'
                ? 'Haz clic en una fila para ver el detalle completo del equipo.'
                : 'La tabla muestra solo la información del filtro seleccionado.'}
            </p>
          </div>
        </div>

        <div className="w-full overflow-x-auto rounded-b-[28px]">
          <table className="min-w-[900px] table-fixed text-sm">
            <thead className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/95">
              <tr>
                <th className="w-[40px] px-3 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === equipos?.length && equipos?.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-slate-600 bg-slate-800 text-blue-500"
                  />
                </th>
                <th className="w-[70px] px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  ID
                </th>
                {showNombre && (
                  <th className="w-[220px] px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                    {filterBy === 'nombre_host' ? 'Nombre Host' : 'Nombre PC'}
                  </th>
                )}
                {showUsuario && (
                  <th className="w-[180px] px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Usuario
                  </th>
                )}
                {showResponsable && (
                  <th className="w-[220px] px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Responsable
                  </th>
                )}
                {showIPMAC && (
                  <th className="w-[220px] px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                    {filterBy === 'mac_address'
                      ? 'MAC Address'
                      : filterBy === 'ip'
                      ? 'IP'
                      : 'IP / MAC'}
                  </th>
                )}
                {showHardware && (
                  <th className="w-[260px] px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Hardware
                  </th>
                )}
                {showDepartamento && (
                  <th className="w-[180px] px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                    {filterBy === 'area'
                      ? 'Área'
                      : filterBy === 'establecimiento'
                      ? 'Establecimiento'
                      : 'Departamento'}
                  </th>
                )}
                {showEstado && (
                  <th className="w-[140px] px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
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
                  <td colSpan={visibleColumns} className="px-4 py-12 text-center text-slate-300">
                    <RefreshCw size={20} className="mr-2 inline animate-spin" />
                    Cargando equipos...
                  </td>
                </tr>
              ) : equipos.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumns} className="px-4 py-12 text-center text-slate-400">
                    No se encontraron equipos.
                  </td>
                </tr>
              ) : (
                equipos
                  .filter((equipo): equipo is Equipo => equipo != null)
                  .map((equipo) => (
                    <tr
                      key={equipo.id}
                      onClick={() => setEquipoDetalle(equipo)}
                      className={`cursor-pointer border-b border-slate-800/80 transition hover:bg-slate-800/60 ${
                        selectedIds.includes(equipo.id) ? 'bg-blue-500/10' : ''
                      }`}
                    >
                      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(equipo.id)}
                          onChange={() => toggleSelect(equipo.id)}
                          className="rounded border-slate-600 bg-slate-800 text-blue-500"
                        />
                      </td>

                      <td className="px-3 py-3 font-mono text-xs text-slate-400">{equipo.id}</td>

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
                              <div className="truncate text-xs text-slate-500">
                                {equipo.tipo_recurso || 'Sin tipo'}
                              </div>
                            </>
                          )}
                        </td>
                      )}

                      {showUsuario && (
                        <td className="truncate px-3 py-3 text-slate-200">
                          {equipo.usuario || '-'}
                        </td>
                      )}

                      {showResponsable && (
                        <td className="truncate px-3 py-3 text-slate-200">
                          {equipo.responsable_equipo || '-'}
                        </td>
                      )}

                      {showIPMAC && (
                        <td className="px-3 py-3">
                          {filterBy === 'ip' ? (
                            <div className="truncate text-slate-100">{equipo.ip || '-'}</div>
                          ) : filterBy === 'mac_address' ? (
                            <div className="truncate text-slate-100">
                              {equipo.mac_address || '-'}
                            </div>
                          ) : (
                            <>
                              <div className="truncate text-slate-100">{equipo.ip || '-'}</div>
                              <div className="truncate text-xs text-slate-500">
                                {equipo.mac_address || '-'}
                              </div>
                            </>
                          )}
                        </td>
                      )}

                      {showHardware && (
                        <td className="px-3 py-3">
                          {filterBy === 'serie' ? (
                            <div className="truncate text-slate-100">{equipo.serie || '-'}</div>
                          ) : filterBy === 'marca' ? (
                            <div className="truncate text-slate-100">{equipo.marca || '-'}</div>
                          ) : filterBy === 'modelo' ? (
                            <div className="truncate text-slate-100">{equipo.modelo || '-'}</div>
                          ) : filterBy === 'procesador' ? (
                            <div className="truncate text-slate-100">
                              {equipo.procesador || '-'}
                            </div>
                          ) : filterBy === 'tipo_recurso' ? (
                            <div className="truncate text-slate-100">
                              {equipo.tipo_recurso || '-'}
                            </div>
                          ) : (
                            <>
                              <div className="truncate text-slate-100">
                                {equipo.procesador || '-'}
                              </div>
                              <div className="truncate text-xs text-slate-500">
                                {[equipo.ram && `${equipo.ram} RAM`, equipo.disco]
                                  .filter(Boolean)
                                  .join(' / ')}
                              </div>
                            </>
                          )}
                        </td>
                      )}

                      {showDepartamento && (
                        <td className="truncate px-3 py-3 text-slate-200">
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
                            <span className="text-slate-200">{equipo.antivirus || '-'}</span>
                          ) : filterBy === 'etiquetado' ? (
                            <span className="text-slate-200">{equipo.etiquetado || '-'}</span>
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

      <div className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/85 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
        <p className="text-sm text-slate-300">
          Mostrando {total === 0 ? 0 : (page - 1) * pageSize + 1} a{' '}
          {Math.min(page * pageSize, total)} de {total} resultados
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-300">Mostrar</label>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            >
              {Array.from({ length: 11 }, (_, i) => i + 10).map((n) => (
                <option key={n} value={n}>
                  {n} filas
                </option>
              ))}
            </select>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white transition hover:border-slate-600 hover:bg-slate-800/80 disabled:opacity-40"
              >
                Anterior
              </button>
              <span className="px-2 text-sm text-slate-300">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white transition hover:border-slate-600 hover:bg-slate-800/80 disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
