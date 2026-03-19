import { useMemo, useState } from 'react';
import { Download, FileText, X, AlertCircle, CalendarDays } from 'lucide-react';
import { saveAs } from 'file-saver';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';

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

interface ActaEntregaProps {
  equipo: Equipo | null;
  onClose: () => void;
}

function textValue(value?: string | null) {
  return value && String(value).trim() ? String(value).trim() : '';
}

function formatFechaInput(fecha: string) {
  if (!fecha) return '';
  const d = new Date(fecha);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
}

function formatFechaDoc(fecha: string) {
  if (!fecha) return '';
  const d = new Date(fecha);
  if (isNaN(d.getTime())) return fecha;
  return d.toLocaleDateString('es-EC', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function checkboxWord(value: boolean) {
  return value ? '☒' : '☐';
}

function SummaryField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] bg-[var(--bg-soft)] px-4 py-4">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--text-soft)]">
        {label}
      </p>
      <p className="mt-2 text-sm font-medium text-[var(--text)]">{value || '—'}</p>
    </div>
  );
}

export default function ActaEntrega({ equipo, onClose }: ActaEntregaProps) {
  const [cargo, setCargo] = useState('');
  const [correo, setCorreo] = useState('');
  const [telefonoExtension, setTelefonoExtension] = useState('');
  const [nombreRecibe, setNombreRecibe] = useState(equipo?.responsable_equipo || '');
  const [fechaEntrega, setFechaEntrega] = useState(formatFechaInput(new Date().toISOString()));
  const [entregaPor, setEntregaPor] = useState('John Alvarez');
  const [observacionExtra, setObservacionExtra] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const nombreEquipo = useMemo(
    () => equipo?.nombre_host || equipo?.nombre_pc || 'equipo',
    [equipo]
  );

  if (!equipo) return null;

  const tipo = (equipo.tipo_recurso || '').toUpperCase();
  const esDesktop = tipo.includes('CPU') || tipo.includes('DESKTOP');
  const esLaptop = tipo.includes('LAPTOP') || tipo.includes('NOTEBOOK');
  const esHH = tipo.includes('HH') || tipo.includes('HANDHELD');

  const observacionFinal = [textValue(equipo.observacion), textValue(observacionExtra)]
    .filter(Boolean)
    .join(' | ');

  const inputClass =
    'apple-input h-12 w-full rounded-2xl px-4 text-sm text-[var(--text)] placeholder:text-[var(--text-faint)]';
  const textareaClass =
    'apple-input w-full rounded-2xl px-4 py-3 text-sm text-[var(--text)] placeholder:text-[var(--text-faint)]';

  const generarDocumento = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch('/plantillas/AE-JA-2026-OC-4.docx');
      if (!response.ok) {
        throw new Error('No se pudo cargar la plantilla DOCX.');
      }

      const arrayBuffer = await response.arrayBuffer();
      const zip = new PizZip(arrayBuffer);

      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
      });

      doc.render({
        id: equipo.id,
        empresa: textValue(equipo.empresa || 'Santa Priscila'),
        establecimiento: textValue(equipo.establecimiento),
        departamento: textValue(equipo.departamento),
        area: textValue(equipo.area),
        responsable_equipo: textValue(equipo.responsable_equipo),
        nombre_host: textValue(equipo.nombre_host),
        nombre_pc: textValue(equipo.nombre_pc),
        nombre_equipo: textValue(nombreEquipo),
        usuario: textValue(equipo.usuario),
        ip: textValue(equipo.ip),
        ip_extendida: textValue(equipo.ip_extendida),
        mac_address: textValue(equipo.mac_address),
        mac_address2: textValue(equipo.mac_address2),
        procesador: textValue(equipo.procesador),
        ram: textValue(equipo.ram),
        disco: textValue(equipo.disco),
        sistema_operativo: textValue(equipo.sistema_operativo),
        activo: textValue(equipo.activo),
        etiquetado: textValue(equipo.etiquetado),
        fecha_adquisicion: formatFechaDoc(equipo.fecha_adquisicion),
        fecha_inventario: formatFechaDoc(equipo.fecha_inventario),
        tipo_recurso: textValue(equipo.tipo_recurso),
        marca: textValue(equipo.marca),
        modelo: textValue(equipo.modelo),
        serie: textValue(equipo.serie),
        antivirus: textValue(equipo.antivirus),
        observacion: textValue(observacionFinal),
        active_directory: textValue(equipo.active_directory),
        cargo: textValue(cargo),
        correo: textValue(correo),
        telefono_extension: textValue(telefonoExtension),
        nombre_recibe: textValue(nombreRecibe),
        entrega_por: textValue(entregaPor),
        fecha_entrega: formatFechaDoc(fechaEntrega),
        check_desktop: checkboxWord(esDesktop),
        check_laptop: checkboxWord(esLaptop),
        check_hh: checkboxWord(esHH),
        teclado_serial: '',
        mouse_serial: '',
        monitor: '',
        cargador: esLaptop ? 'SI' : '',
        base_refrigerante: '',
        telefono_serial: '',
        ip_telefono: '',
        software_office: '☒',
        software_antivirus: equipo.antivirus ? '☒' : '☐',
        software_adobe_reader: '☒',
        software_photoshop: '☐',
        software_compresor: '☒',
        software_chrome: '☒',
        software_ecuapass: '☐',
        software_project: '☐',
        software_visio: '☐',
        software_outlook: '☒',
        software_vpn: '☒',
        software_ipspnet: '☒',
        software_ipsprrhh: '☐',
        software_otro_1: '☐',
        software_otro_2: '☐',
        software_otro_3: '☐',
      });

      const blob = doc.getZip().generate({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      saveAs(blob, `AE-${equipo.id}-${nombreEquipo}.docx`);
    } catch (err: any) {
      setError(err?.message || 'No se pudo generar el documento.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center bg-[var(--overlay)] px-4 py-6 backdrop-blur-xl"
      onClick={onClose}
    >
      <div
        className="surface-card w-full max-w-5xl overflow-hidden rounded-[34px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-[var(--border)] bg-[var(--bg-soft)] px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-[22px] bg-[var(--primary-soft)] text-[var(--primary)]">
                <FileText size={18} />
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--text-soft)]">
                  Acta de entrega
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--text)]">
                  Generar documento desde plantilla
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-soft)]">
                  Completa los datos editables y descarga el archivo `.docx` manteniendo el formato
                  original de tu plantilla.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="rounded-2xl bg-[var(--bg-elevated)] p-2 text-[var(--text-soft)] transition hover:opacity-90"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {error && (
          <div className="border-b border-red-500/20 bg-red-500/10 px-6 py-3 text-sm text-red-700 dark:text-red-300">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} />
              {error}
            </div>
          </div>
        )}

        <div className="max-h-[calc(100vh-10rem)] overflow-y-auto px-6 py-6">
          <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-4">
              <div className="surface-panel rounded-[28px] p-5">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--text-soft)]">
                  Resumen del equipo
                </p>
                <h3 className="mt-2 text-xl font-semibold text-[var(--text)]">{nombreEquipo}</h3>
                <p className="mt-1 text-sm text-[var(--text-soft)]">
                  Base informativa del acta a partir del equipo seleccionado.
                </p>

                <div className="mt-5 grid gap-3">
                  <SummaryField label="Responsable" value={textValue(equipo.responsable_equipo)} />
                  <SummaryField label={'\u00c1rea'} value={textValue(equipo.area)} />
                  <SummaryField label="Establecimiento" value={textValue(equipo.establecimiento)} />
                  <SummaryField label="Tipo" value={textValue(equipo.tipo_recurso)} />
                  <SummaryField
                    label="Marca / Modelo"
                    value={[textValue(equipo.marca), textValue(equipo.modelo)].filter(Boolean).join(' / ')}
                  />
                  <SummaryField label="Serie" value={textValue(equipo.serie)} />
                </div>
              </div>
            </div>

            <div className="surface-panel rounded-[28px] p-5">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--bg-soft)] text-[var(--text-soft)]">
                  <CalendarDays size={18} />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-soft)]">
                    Campos editables
                  </p>
                  <p className="text-sm text-[var(--text-soft)]">
                    {'Informaci\u00f3n que se insertar\u00e1 en el documento final.'}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-1">
                  <label className="mb-2 block text-sm font-medium text-[var(--text)]">Cargo</label>
                  <input
                    value={cargo}
                    onChange={(e) => setCargo(e.target.value)}
                    className={inputClass}
                    placeholder="Ej. Analista de sistemas"
                  />
                </div>

                <div className="md:col-span-1">
                  <label className="mb-2 block text-sm font-medium text-[var(--text)]">Correo</label>
                  <input
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                    className={inputClass}
                    placeholder="usuario@empresa.com"
                  />
                </div>

                <div className="md:col-span-1">
                  <label className="mb-2 block text-sm font-medium text-[var(--text)]">
                    {'Tel\u00e9fono / Extensi\u00f3n'}
                  </label>
                  <input
                    value={telefonoExtension}
                    onChange={(e) => setTelefonoExtension(e.target.value)}
                    className={inputClass}
                    placeholder="0999999999 / Ext. 123"
                  />
                </div>

                <div className="md:col-span-1">
                  <label className="mb-2 block text-sm font-medium text-[var(--text)]">
                    Nombre quien recibe
                  </label>
                  <input
                    value={nombreRecibe}
                    onChange={(e) => setNombreRecibe(e.target.value)}
                    className={inputClass}
                    placeholder="Nombre completo"
                  />
                </div>

                <div className="md:col-span-1">
                  <label className="mb-2 block text-sm font-medium text-[var(--text)]">
                    Nombre quien entrega
                  </label>
                  <input
                    value={entregaPor}
                    onChange={(e) => setEntregaPor(e.target.value)}
                    className={inputClass}
                    placeholder="Nombre completo"
                  />
                </div>

                <div className="md:col-span-1">
                  <label className="mb-2 block text-sm font-medium text-[var(--text)]">
                    Fecha de entrega
                  </label>
                  <input
                    type="date"
                    value={fechaEntrega}
                    onChange={(e) => setFechaEntrega(e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-[var(--text)]">
                    {'Observaci\u00f3n adicional'}
                  </label>
                  <textarea
                    value={observacionExtra}
                    onChange={(e) => setObservacionExtra(e.target.value)}
                    rows={4}
                    className={textareaClass}
                    placeholder="Texto opcional para agregar a observaciones"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-[var(--border)] bg-[var(--bg-soft)] px-6 py-4">
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              onClick={onClose}
              className="apple-button-secondary inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium transition hover:opacity-90"
            >
              <X size={14} />
              Cerrar
            </button>

            <button
              onClick={generarDocumento}
              disabled={loading}
              className="apple-button-primary inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium transition hover:brightness-105 disabled:opacity-50"
            >
              <Download size={14} />
              {loading ? 'Generando...' : 'Descargar acta .docx'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
