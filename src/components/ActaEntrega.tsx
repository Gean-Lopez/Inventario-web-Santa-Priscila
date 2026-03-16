import { useMemo, useState } from 'react';
import { Download, FileText, X, AlertCircle } from 'lucide-react';
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
      className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto bg-slate-950/85 px-4 pb-6 pt-16 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl overflow-hidden rounded-3xl border border-white/15 bg-slate-900 shadow-2xl shadow-black/40"
        onClick={e => e.stopPropagation()}
      >
        <div className="border-b border-white/15 bg-white/[0.06] px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-200">
                <FileText size={18} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white">Generar acta exacta desde plantilla</h2>
                <p className="text-xs text-slate-200">
                  Se mantendrá el formato original del archivo Word que preparaste.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="rounded-xl p-2 text-slate-200 transition hover:bg-white/10 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {error && (
          <div className="border-b border-red-500/20 bg-red-500/10 px-5 py-3 text-sm text-red-200">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} />
              {error}
            </div>
          </div>
        )}

        <div className="max-h-[calc(100vh-12rem)] overflow-y-auto p-5">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="rounded-2xl border border-white/15 bg-white/[0.04] p-4">
              <h3 className="mb-3 text-sm font-semibold text-white">Datos del equipo</h3>
              <div className="grid grid-cols-1 gap-3 text-sm">
                <div>
                  <span className="block text-xs uppercase tracking-[0.16em] text-slate-300">Responsable</span>
                  <span className="text-white">{textValue(equipo.responsable_equipo) || '—'}</span>
                </div>
                <div>
                  <span className="block text-xs uppercase tracking-[0.16em] text-slate-300">Área</span>
                  <span className="text-white">{textValue(equipo.area) || '—'}</span>
                </div>
                <div>
                  <span className="block text-xs uppercase tracking-[0.16em] text-slate-300">Establecimiento</span>
                  <span className="text-white">{textValue(equipo.establecimiento) || '—'}</span>
                </div>
                <div>
                  <span className="block text-xs uppercase tracking-[0.16em] text-slate-300">Equipo</span>
                  <span className="text-white">{textValue(nombreEquipo) || '—'}</span>
                </div>
                <div>
                  <span className="block text-xs uppercase tracking-[0.16em] text-slate-300">Tipo</span>
                  <span className="text-white">{textValue(equipo.tipo_recurso) || '—'}</span>
                </div>
                <div>
                  <span className="block text-xs uppercase tracking-[0.16em] text-slate-300">Marca / Modelo</span>
                  <span className="text-white">
                    {textValue(equipo.marca) || '—'} / {textValue(equipo.modelo) || '—'}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/15 bg-white/[0.04] p-4">
              <h3 className="mb-3 text-sm font-semibold text-white">Campos editables</h3>
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-sm text-slate-200">Cargo</label>
                  <input
                    value={cargo}
                    onChange={e => setCargo(e.target.value)}
                    className="h-11 w-full rounded-2xl border border-white/15 bg-white/[0.08] px-4 text-sm text-white placeholder:text-slate-400 focus:border-indigo-400/50 focus:outline-none focus:ring-4 focus:ring-indigo-500/15"
                    placeholder="Ej. Analista de sistemas"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm text-slate-200">Correo</label>
                  <input
                    value={correo}
                    onChange={e => setCorreo(e.target.value)}
                    className="h-11 w-full rounded-2xl border border-white/15 bg-white/[0.08] px-4 text-sm text-white placeholder:text-slate-400 focus:border-indigo-400/50 focus:outline-none focus:ring-4 focus:ring-indigo-500/15"
                    placeholder="usuario@empresa.com"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm text-slate-200">Teléfono / Extensión</label>
                  <input
                    value={telefonoExtension}
                    onChange={e => setTelefonoExtension(e.target.value)}
                    className="h-11 w-full rounded-2xl border border-white/15 bg-white/[0.08] px-4 text-sm text-white placeholder:text-slate-400 focus:border-indigo-400/50 focus:outline-none focus:ring-4 focus:ring-indigo-500/15"
                    placeholder="0999999999 / Ext. 123"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm text-slate-200">Nombre quien recibe</label>
                  <input
                    value={nombreRecibe}
                    onChange={e => setNombreRecibe(e.target.value)}
                    className="h-11 w-full rounded-2xl border border-white/15 bg-white/[0.08] px-4 text-sm text-white placeholder:text-slate-400 focus:border-indigo-400/50 focus:outline-none focus:ring-4 focus:ring-indigo-500/15"
                    placeholder="Nombre completo"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm text-slate-200">Nombre quien entrega</label>
                  <input
                    value={entregaPor}
                    onChange={e => setEntregaPor(e.target.value)}
                    className="h-11 w-full rounded-2xl border border-white/15 bg-white/[0.08] px-4 text-sm text-white placeholder:text-slate-400 focus:border-indigo-400/50 focus:outline-none focus:ring-4 focus:ring-indigo-500/15"
                    placeholder="Nombre completo"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm text-slate-200">Fecha de entrega</label>
                  <input
                    type="date"
                    value={fechaEntrega}
                    onChange={e => setFechaEntrega(e.target.value)}
                    className="h-11 w-full rounded-2xl border border-white/15 bg-white/[0.08] px-4 text-sm text-white focus:border-indigo-400/50 focus:outline-none focus:ring-4 focus:ring-indigo-500/15"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm text-slate-200">Observación adicional</label>
                  <textarea
                    value={observacionExtra}
                    onChange={e => setObservacionExtra(e.target.value)}
                    rows={3}
                    className="w-full rounded-2xl border border-white/15 bg-white/[0.08] px-4 py-3 text-sm text-white placeholder:text-slate-400 focus:border-indigo-400/50 focus:outline-none focus:ring-4 focus:ring-indigo-500/15"
                    placeholder="Texto opcional para agregar a observaciones"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-white/15 bg-slate-900/95 px-5 py-4">
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              onClick={onClose}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/15"
            >
              <X size={14} />
              Cerrar
            </button>

            <button
              onClick={generarDocumento}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-500 px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
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
