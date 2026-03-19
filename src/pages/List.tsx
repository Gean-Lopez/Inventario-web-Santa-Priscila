import { useState, useEffect } from 'react';
import type { ChangeEvent } from 'react';
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
      <span className="mb-1 block text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--text-soft)]">
        {label}
      </span>
      <span className="text-sm font-medium text-slate-100">{value || '—'}</span>
    </div>
  );
}

function getActivoBadge(value?: string) {
  if (value === 'SI') {
    return 'inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300';
  }
  if (value === 'NO') {
    return 'inline-flex items-center rounded-full border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-700 dark:text-red-300';
  }
  return 'inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--bg-soft)] px-2.5 py-1 text-xs font-medium text-[var(--text-soft)]';
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

  const readJsonSafely = async (res: Response) => {
    const raw = await res.text();
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return { error: raw.startsWith('<!DOCTYPE') ? 'El servidor devolvio una pagina HTML inesperada.' : raw };
    }
  };

  const fetchEquipos = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/equipos?q=${encodeURIComponent(search)}&page=${page}&limit=${pageSize}&filterBy=${encodeURIComponent(filterBy)}&sortBy=${encodeURIComponent(sortBy)}&sortDir=${sortDir}`
      );
      const data = await readJsonSafely(res);
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

  const handleImportExcel = async (e: ChangeEvent<HTMLInputElement>) => {
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

      const data = await readJsonSafely(res);

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
    'apple-input h-12 rounded-2xl px-4 text-sm text-[var(--text)] placeholder:text-[var(--text-faint)]';

  const panelClass =
    'surface-card rounded-[30px]';

  return (
    <div className="inventory-list space-y-6">
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
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-[var(--overlay)] p-4 backdrop-blur-xl">
          <div className="surface-card flex max-h-[90vh] w-full max-w-7xl flex-col overflow-hidden rounded-[34px]">
            <div className="border-b border-[var(--border)] bg-[var(--bg-soft)] px-6 py-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <span className="apple-chip inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]">
                    Importacion Excel
                  </span>
                  <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[var(--text)]">
                    Revisar importacion
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm text-[var(--text-soft)]">
                    Filas: {importPreview.totalRows} · Nuevos: {importPreview.readyToImport.length} ·
                    Duplicados: {importPreview.duplicates.length} · Invalidos: {importPreview.invalidRows.length}
                  </p>
                </div>

                <button
                  onClick={() => setShowImportPreview(false)}
                  className="self-start rounded-2xl bg-[var(--bg-elevated)] p-2 text-[var(--text-soft)] transition hover:opacity-90"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="px-6 pb-2 pt-5">
              <div className="grid gap-3 md:grid-cols-4">
                <div className="rounded-[24px] bg-[var(--bg-elevated)] px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">
                    Filas totales
                  </p>
                  <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[var(--text)]">
                    {importPreview.totalRows}
                  </p>
                </div>
                <div className="rounded-[24px] border border-emerald-500/20 bg-emerald-500/10 px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-300">
                    Listos
                  </p>
                  <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[var(--text)]">
                    {importPreview.readyToImport.length}
                  </p>
                </div>
                <div className="rounded-[24px] border border-amber-500/20 bg-amber-500/10 px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-600 dark:text-amber-300">
                    Duplicados
                  </p>
                  <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[var(--text)]">
                    {importPreview.duplicates.length}
                  </p>
                </div>
                <div className="rounded-[24px] border border-rose-500/20 bg-rose-500/10 px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-rose-600 dark:text-rose-300">
                    Invalidos
                  </p>
                  <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[var(--text)]">
                    {importPreview.invalidRows.length}
                  </p>
                </div>
              </div>
            </div>

            <div className="max-h-[62vh] overflow-y-auto space-y-5 px-6 pb-6 pt-2">
              <section className="rounded-[28px] border border-emerald-500/12 bg-emerald-500/6 p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-[var(--text)]">
                      Listos para importar
                    </h3>
                    <p className="mt-1 text-sm text-[var(--text-soft)]">
                      Registros nuevos que ya cumplen las validaciones.
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-500/12 px-3 py-1 text-sm font-medium text-emerald-600 dark:text-emerald-300">
                    {importPreview.readyToImport.length}
                  </span>
                </div>

                <div className="overflow-x-auto rounded-[24px] border border-[var(--border)] bg-[var(--bg-elevated)]">
                  <table className="min-w-full text-sm">
                    <thead className="thead-surface text-[var(--text-soft)]">
                      <tr>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em]">Fila</th>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em]">Host / PC</th>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em]">Responsable</th>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em]">Serie</th>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em]">MAC</th>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em]">IP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.readyToImport.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-6 text-center text-[var(--text-soft)]">
                            No hay registros nuevos listos para importar.
                          </td>
                        </tr>
                      ) : (
                        importPreview.readyToImport.map((item) => (
                          <tr key={item.importKey} className="border-t border-[var(--border)] text-[var(--text)]">
                            <td className="px-4 py-3 font-mono text-xs text-[var(--text-soft)]">{item.rowIndex}</td>
                            <td className="px-4 py-3 font-medium">{item.equipo.nombre_host || item.equipo.nombre_pc || '-'}</td>
                            <td className="px-4 py-3">{item.equipo.responsable_equipo || '-'}</td>
                            <td className="px-4 py-3">{item.equipo.serie || '-'}</td>
                            <td className="px-4 py-3">{item.equipo.mac_address || '-'}</td>
                            <td className="px-4 py-3">{item.equipo.ip || '-'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="rounded-[28px] border border-amber-500/12 bg-amber-500/6 p-4">
                <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-[var(--text)]">
                      Duplicados detectados
                    </h3>
                    <p className="mt-1 text-sm text-[var(--text-soft)]">
                      Puedes revisar y decidir si algunos duplicados tambien deben entrar.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() =>
                        setSelectedDuplicateKeys(importPreview.duplicates.map((d) => d.importKey))
                      }
                      className="apple-button-secondary rounded-2xl px-3 py-2 text-sm font-medium transition hover:opacity-90"
                    >
                      Seleccionar todos
                    </button>
                    <button
                      onClick={() => setSelectedDuplicateKeys([])}
                      className="apple-button-secondary rounded-2xl px-3 py-2 text-sm font-medium transition hover:opacity-90"
                    >
                      Quitar todos
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-[24px] border border-[var(--border)] bg-[var(--bg-elevated)]">
                  <table className="min-w-full text-sm">
                    <thead className="thead-surface text-[var(--text-soft)]">
                      <tr>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em]">Agregar</th>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em]">Fila</th>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em]">Motivo</th>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em]">Host / PC</th>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em]">Responsable</th>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em]">Serie</th>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em]">MAC</th>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em]">Existe ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.duplicates.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-4 py-6 text-center text-[var(--text-soft)]">
                            No se detectaron duplicados.
                          </td>
                        </tr>
                      ) : (
                        importPreview.duplicates.map((item) => (
                          <tr key={`${item.importKey}-${item.rowIndex}`} className="border-t border-[var(--border)] text-[var(--text)]">
                            <td className="px-4 py-3">
                              <input
                                type="checkbox"
                                checked={selectedDuplicateKeys.includes(item.importKey)}
                                onChange={() => toggleDuplicateSelection(item.importKey)}
                                className="h-4 w-4 rounded border-[var(--border-strong)] bg-white/80 text-[var(--primary)]"
                              />
                            </td>
                            <td className="px-4 py-3 font-mono text-xs text-[var(--text-soft)]">{item.rowIndex}</td>
                            <td className="px-4 py-3">{item.duplicateReason || '-'}</td>
                            <td className="px-4 py-3 font-medium">{item.equipo.nombre_host || item.equipo.nombre_pc || '-'}</td>
                            <td className="px-4 py-3">{item.equipo.responsable_equipo || '-'}</td>
                            <td className="px-4 py-3">{item.equipo.serie || '-'}</td>
                            <td className="px-4 py-3">{item.equipo.mac_address || '-'}</td>
                            <td className="px-4 py-3">{item.existing?.id || '-'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="rounded-[28px] border border-rose-500/12 bg-rose-500/6 p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-[var(--text)]">
                      Filas invalidas
                    </h3>
                    <p className="mt-1 text-sm text-[var(--text-soft)]">
                      Estas filas se bloquean antes de llegar a la base de datos.
                    </p>
                  </div>
                  <span className="rounded-full bg-rose-500/12 px-3 py-1 text-sm font-medium text-rose-600 dark:text-rose-300">
                    {importPreview.invalidRows.length}
                  </span>
                </div>

                <div className="overflow-x-auto rounded-[24px] border border-[var(--border)] bg-[var(--bg-elevated)]">
                  <table className="min-w-full text-sm">
                    <thead className="thead-surface text-[var(--text-soft)]">
                      <tr>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em]">Fila</th>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em]">Motivo</th>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em]">Host / PC</th>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em]">Responsable</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.invalidRows.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-6 text-center text-[var(--text-soft)]">
                            No hay filas invalidas.
                          </td>
                        </tr>
                      ) : (
                        importPreview.invalidRows.map((item, idx) => (
                          <tr key={`${item.rowIndex}-${idx}`} className="border-t border-[var(--border)] text-[var(--text)]">
                            <td className="px-4 py-3 font-mono text-xs text-[var(--text-soft)]">{item.rowIndex}</td>
                            <td className="px-4 py-3">{item.reason || '-'}</td>
                            <td className="px-4 py-3 font-medium">{item.equipo?.nombre_host || item.equipo?.nombre_pc || '-'}</td>
                            <td className="px-4 py-3">{item.equipo?.responsable_equipo || '-'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>

            <div className="border-t border-[var(--border)] bg-[var(--bg-soft)] px-6 py-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-medium text-[var(--text)]">
                    Se importaran {importPreview.readyToImport.length + selectedDuplicateKeys.length} registros
                  </p>
                  <p className="mt-1 text-xs text-[var(--text-soft)]">
                    Nuevos: {importPreview.readyToImport.length} · Duplicados seleccionados: {selectedDuplicateKeys.length}
                  </p>
                </div>

                <div className="flex flex-col-reverse gap-3 sm:flex-row">
                  <button
                    onClick={() => setShowImportPreview(false)}
                    className="apple-button-secondary rounded-2xl px-5 py-3 text-sm font-medium transition hover:opacity-90"
                  >
                    Cancelar
                  </button>

                  <button
                    onClick={confirmImportExcel}
                    disabled={importingPreview}
                    className="apple-button-primary rounded-2xl px-5 py-3 text-sm font-medium transition hover:brightness-105 disabled:opacity-60"
                  >
                    {importingPreview ? 'Importando...' : 'Importar seleccionados'}
                  </button>
                </div>
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
        <div className="fixed inset-0 z-[120] flex justify-end p-3 sm:p-4">
          <div
            className="absolute inset-0 bg-[var(--overlay)] backdrop-blur-xl"
            onClick={() => setEquipoDetalle(null)}
          />
          <div className="surface-card relative flex h-full w-full max-w-2xl flex-col overflow-hidden rounded-[32px]">
            <div className="border-b border-[var(--border)] bg-[var(--bg-soft)] px-6 py-5">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--text-soft)]">
                    Ficha de equipo
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--text)]">
                    {equipoDetalle.nombre_host || equipoDetalle.nombre_pc || 'Sin nombre'}
                  </h2>
                  <p className="mt-1 text-sm text-[var(--text-soft)]">ID #{equipoDetalle.id}</p>
                </div>
                <button
                  onClick={() => setEquipoDetalle(null)}
                  className="rounded-2xl bg-[var(--bg-elevated)] p-2 text-[var(--text-soft)] transition hover:opacity-90"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-[24px] bg-[var(--bg-elevated)] px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-soft)]">Usuario</p>
                  <p className="mt-2 text-sm font-medium text-[var(--text)]">
                    {equipoDetalle.usuario || 'Sin usuario'}
                  </p>
                </div>
                <div className="rounded-[24px] bg-[var(--bg-elevated)] px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-soft)]">Tipo</p>
                  <p className="mt-2 text-sm font-medium text-[var(--text)]">
                    {equipoDetalle.tipo_recurso || 'Sin tipo'}
                  </p>
                </div>
                <div className="rounded-[24px] bg-[var(--bg-elevated)] px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-soft)]">Estado</p>
                  <div className="mt-2">{equipoDetalle.activo ? <span className={getActivoBadge(equipoDetalle.activo)}>{equipoDetalle.activo}</span> : <span className="text-sm text-[var(--text-soft)]">Sin estado</span>}</div>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-[var(--bg-elevated)] p-6">
              <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                <div className="col-span-2 border-b border-[var(--border)] pb-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary)]">
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

                <div className="col-span-2 mt-2 border-b border-[var(--border)] pb-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-300">
                    Red
                  </span>
                </div>

                <Field label="IP" value={equipoDetalle.ip} />
                <Field label="IP Extendida" value={equipoDetalle.ip_extendida} />
                <Field label="MAC Address" value={equipoDetalle.mac_address} />
                <Field label="MAC Address 2" value={equipoDetalle.mac_address2} />

                <div className="col-span-2 mt-2 border-b border-[var(--border)] pb-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-300">
                    Hardware
                  </span>
                </div>

                <Field label="RAM" value={equipoDetalle.ram} />
                <Field label="Disco" value={equipoDetalle.disco} />
                <Field label="Antivirus" value={equipoDetalle.antivirus} />
                <Field label="Procesador" value={equipoDetalle.procesador} col2 />

                <div className="col-span-2 mt-2 border-b border-[var(--border)] pb-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-600 dark:text-violet-300">
                    Organización
                  </span>
                </div>

                <Field label="Empresa" value={equipoDetalle.empresa} />
                <Field label="Establecimiento" value={equipoDetalle.establecimiento} />
                <Field label="Departamento" value={equipoDetalle.departamento} />
                <Field label="Área" value={equipoDetalle.area} />
                <Field label="Responsable" value={equipoDetalle.responsable_equipo} />

                <div className="col-span-2 mt-2 border-b border-[var(--border)] pb-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-600 dark:text-amber-300">
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
                    <span className="mb-2 block text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--text-soft)]">
                      Observación
                    </span>
                    <p className="rounded-[24px] border border-[var(--border)] bg-[var(--bg-soft)] p-4 text-sm text-[var(--text)]">
                      {equipoDetalle.observacion}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-[var(--border)] bg-[var(--bg-soft)] px-6 py-4">
              {isAdmin ? (
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setEquipoActa(equipoDetalle);
                      setShowActa(true);
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-sm font-medium text-cyan-700 transition hover:opacity-90 dark:text-cyan-300"
                  >
                    <FileText size={15} />
                    Acta
                  </button>

                  <button
                    onClick={() => {
                      navigate(`/edit/${equipoDetalle.id}`);
                      setEquipoDetalle(null);
                    }}
                    className="apple-button-primary inline-flex flex-1 items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium transition hover:brightness-105"
                  >
                    <Pencil size={15} />
                    Editar
                  </button>

                  <button
                    onClick={() => handleDelete(equipoDetalle.id)}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-700 transition hover:opacity-90 dark:text-red-300"
                  >
                    <Trash2 size={15} />
                    Eliminar
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                  <ShieldAlert size={18} />
                  Inicia sesi?n como administrador para editar o eliminar este equipo.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.9fr)]">
        <div className="surface-card relative overflow-hidden rounded-[34px] px-6 py-7 sm:px-8">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-[radial-gradient(circle_at_top_left,_rgba(0,113,227,0.14),_transparent_58%)]" />
          <div className="relative">
            <span className="apple-chip inline-flex rounded-full px-3 py-1 text-xs font-medium">
              Centro de control
            </span>
            <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-[-0.04em] text-[var(--text)] sm:text-5xl">
              Inventario de equipos
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--text-soft)]">
              {'Una vista m\u00e1s clara para explorar activos, revisar responsables y abrir fichas detalladas sin salir del listado.'}

            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="metric-card rounded-[28px] px-5 py-5">
                <span className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--text-soft)]">
                  Registros
                </span>
                <div className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-[var(--text)]">
                  {total}
                </div>
                <p className="mt-2 text-sm text-[var(--text-soft)]">
                  Equipos visibles en el inventario actual.
                </p>
              </div>

              <div className="metric-card rounded-[28px] px-5 py-5">
                <span className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--text-soft)]">
                  Seleccionados
                </span>
                <div className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-[var(--text)]">
                  {selectedIds.length}
                </div>
                <p className="mt-2 text-sm text-[var(--text-soft)]">
                  {'Listos para edici\u00f3n, borrado o revisi\u00f3n manual.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <aside className="surface-card rounded-[34px] px-6 py-6">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--text-soft)]">
            Acciones
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--text)]">
            {'Flujo r\u00e1pido'}
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--text-soft)]">
            {'Ejecuta acciones comunes y mant\u00e9n visible el estado actual del listado.'}
          </p>

          <div className="mt-5 rounded-[24px] bg-[var(--bg-soft)] px-4 py-4">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-soft)]">
              Contexto actual
            </p>
            <div className="mt-3 space-y-2 text-sm text-[var(--text)]">
              <p>Filtro: {filterBy === 'all' ? 'Todos los campos' : filterBy}</p>
              <p>{`P\u00e1gina: ${page} de ${totalPages}`}</p>
              <p>Orden: {sortBy} / {sortDir}</p>
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            {selectedIds.length > 0 && isAdmin && (
              <button
                onClick={handleDeleteSelected}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-700 transition hover:opacity-90 dark:text-red-300"
              >
                <Trash2 size={16} />
                Eliminar seleccionados ({selectedIds.length})
              </button>
            )}

            {isAdmin && (
              <>
                <button
                  onClick={handleVerScript}
                  className="apple-button-secondary inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium transition hover:opacity-90"
                >
                  <FileText size={16} />
                  Ver script
                </button>

                <button
                  onClick={handleExportExcel}
                  className="apple-button-primary inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium transition hover:brightness-105"
                >
                  <FileDown size={16} />
                  Exportar Excel
                </button>

                <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-medium text-white shadow-[0_12px_24px_rgba(16,185,129,0.18)] transition hover:brightness-105">
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
        </aside>
      </section>


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

      <section className="space-y-6">
        <div className="surface-card rounded-[30px] p-5">
          <div className="mb-5">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--text-soft)]">
              Buscar y refinar
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--text)]">
              Explorador
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text-soft)]">
              Ajusta búsqueda, filtro y orden antes de entrar al detalle de cada equipo.
            </p>
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
            <div className="min-w-0">
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

            <div className="min-w-0">
              <label
                htmlFor="filterBy"
                className="mb-1 block text-xs font-medium uppercase tracking-[0.16em] text-slate-400"
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
                className={`${inputClass} w-full`}
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

            <div className="min-w-0">
              <label
                htmlFor="sortBy"
                className="mb-1 block text-xs font-medium uppercase tracking-[0.16em] text-slate-400"
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
                className={`${inputClass} w-full`}
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

            <div className="min-w-0">
              <label
                htmlFor="sortDir"
                className="mb-1 block text-xs font-medium uppercase tracking-[0.16em] text-slate-400"
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
                className={`${inputClass} w-full`}
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

          <div className="mt-4 rounded-[24px] bg-[var(--bg-elevated)] px-4 py-4">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-soft)]">
              Resumen
            </p>
            <div className="mt-3 grid gap-2 text-sm text-[var(--text)] sm:grid-cols-3">
              <p>Filtro activo: {filterBy === 'all' ? 'Todos los campos' : filterBy}</p>
              <p>Orden actual: {sortBy} / {sortDir}</p>
              <p>Tamaño de página: {pageSize} filas</p>
            </div>
          </div>
        </div>

        <div className="surface-card min-w-0 overflow-hidden rounded-[30px]">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-5">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text)]">
              {filterBy === 'all' ? 'Listado principal' : `Resultados por filtro: ${filterBy}`}
            </h2>
            <p className="mt-1 text-sm text-[var(--text-soft)]">
              {filterBy === 'all'
                ? 'Haz clic en una fila para abrir una ficha lateral con el detalle completo.'
                : 'La tabla muestra solo la informaci\u00f3n del filtro seleccionado.'}
            </p>
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="min-w-[900px] table-fixed text-sm">
            <thead className="thead-surface sticky top-0 z-10 border-b border-[var(--border)]">
              <tr>
                <th className="w-[40px] px-3 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === equipos?.length && equipos?.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-[var(--border-strong)] bg-white/80 text-blue-500"
                  />
                </th>
                <th className="w-[70px] px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">
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
                      ? '?rea'
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
                      className={`cursor-pointer border-b border-[var(--border)] transition hover:bg-[var(--primary-soft)]/60 ${
                        selectedIds.includes(equipo.id) ? 'bg-[var(--primary-soft)]' : ''
                      }`}
                    >
                      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(equipo.id)}
                          onChange={() => toggleSelect(equipo.id)}
                          className="rounded border-[var(--border-strong)] bg-white/80 text-blue-500"
                        />
                      </td>

                      <td className="px-3 py-3 font-mono text-xs text-[var(--text-soft)]">{equipo.id}</td>

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
                              {equipo.activo || '?'}
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
      </section>

      <div className="surface-card flex flex-col gap-4 rounded-[28px] px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
        <p className="text-sm text-[var(--text-soft)]">
          Mostrando {total === 0 ? 0 : (page - 1) * pageSize + 1} a{' '}
          {Math.min(page * pageSize, total)} de {total} resultados
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm text-[var(--text-soft)]">Mostrar</label>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="apple-input rounded-xl px-3 py-2 text-sm text-[var(--text)] focus:outline-none"
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
                className="apple-button-secondary rounded-xl px-3 py-2 text-sm transition hover:opacity-90 disabled:opacity-40"
              >
                Anterior
              </button>
              <span className="px-2 text-sm text-[var(--text-soft)]">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="apple-button-secondary rounded-xl px-3 py-2 text-sm transition hover:opacity-90 disabled:opacity-40"
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

