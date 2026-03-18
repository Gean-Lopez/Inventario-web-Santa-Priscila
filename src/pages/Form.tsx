import { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, X, AlertCircle, ShieldAlert } from 'lucide-react';

export default function Form() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [formData, setFormData] = useState({
    empresa: 'Santa Priscila',
    establecimiento: '',
    departamento: '',
    area: '',
    jefe_area: '',
    responsable_equipo: '',
    fecha_adquisicion: '',
    fecha_instalacion: '',
    proveedor: '',
    tipo_recurso: '',
    marca: '',
    modelo: '',
    nombre_host: '',
    active_directory: '',
    nombre_pc: '',
    usuario: '',
    contrasena: '',
    sistema_operativo: '',
    tiene_licencia_windows: '',
    codigo_licencia_windows: '',
    tiene_licencia_office: '',
    mac_address: '',
    mac_address2: '',
    ip: '',
    ip_extendida: '',
    serie: '',
    procesador: '',
    ram: '',
    disco: '',
    antivirus: '',
    tiene_mouse: '',
    tiene_teclado: '',
    tiene_parlante: '',
    fecha_inventario: '',
    responsable_inventario: '',
    fecha_mantenimiento: '',
    detalle_mantenimiento: '',
    activo: '',
    observacion: '',
    etiquetado: '',
    dominio: '',
    tipo_tarjeta_red: '',
    ubicacion: ''
  });

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    setIsAdmin(!!token && role === 'admin');
  }, []);

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    if (isEdit) {
      fetch(`/api/equipos/${id}`)
        .then((res) => {
          if (!res.ok) throw new Error('Equipo no encontrado');
          return res.json();
        })
        .then((data) => {
          const cleanData: any = Object.keys(data).reduce((acc: any, key) => {
            acc[key] = data[key] === null ? '' : data[key];
            return acc;
          }, {});

          cleanData.mac_address = cleanData.mac_address || cleanData.direccion_mac || '';
          cleanData.ip = cleanData.ip || cleanData.direccion_ip || '';
          cleanData.nombre_host = cleanData.nombre_host || cleanData.nombre_pc || '';
          cleanData.modelo = cleanData.modelo || cleanData.modelo_pc || '';
          cleanData.serie = cleanData.serie || cleanData.no_serie || '';
          cleanData.empresa = cleanData.empresa || 'Santa Priscila';

          setFormData((prev) => ({ ...prev, ...cleanData }));
          setLoading(false);
        })
        .catch((err) => {
          setError(err.message);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [id, isEdit, isAdmin]);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const emptyToNull = (value: any) => {
    if (value === '' || value === undefined) return null;
    return value;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!isAdmin) {
      setError('Debes iniciar sesión como administrador para guardar equipos.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const url = isEdit ? `/api/equipos/${id}` : '/api/equipos';
      const method = isEdit ? 'PUT' : 'POST';
      const token = localStorage.getItem('token');

      if (!token) {
        throw new Error('Token requerido. Inicia sesión nuevamente.');
      }

      const payload = {
        empresa: emptyToNull(formData.empresa) || 'Santa Priscila',
        establecimiento: emptyToNull(formData.establecimiento),
        departamento: emptyToNull(formData.departamento),
        area: emptyToNull(formData.area),
        jefe_area: emptyToNull(formData.jefe_area),
        responsable_equipo: emptyToNull(formData.responsable_equipo),
        fecha_adquisicion: emptyToNull(formData.fecha_adquisicion),
        fecha_instalacion: emptyToNull(formData.fecha_instalacion),
        proveedor: emptyToNull(formData.proveedor),
        tipo_recurso: emptyToNull(formData.tipo_recurso),
        marca: emptyToNull(formData.marca),
        modelo: emptyToNull(formData.modelo),
        nombre_host: emptyToNull(formData.nombre_host),
        nombre_pc: emptyToNull(formData.nombre_pc),
        active_directory: emptyToNull(formData.active_directory || formData.dominio),
        usuario: emptyToNull(formData.usuario),
        contrasena: emptyToNull(formData.contrasena),
        sistema_operativo: emptyToNull(formData.sistema_operativo),
        tiene_licencia_windows: emptyToNull(formData.tiene_licencia_windows),
        codigo_licencia_windows: emptyToNull(formData.codigo_licencia_windows),
        tiene_licencia_office: emptyToNull(formData.tiene_licencia_office),
        mac_address: emptyToNull(formData.mac_address),
        mac_address2: emptyToNull(formData.mac_address2),
        ip: emptyToNull(formData.ip),
        ip_extendida: emptyToNull(formData.ip_extendida),
        serie: emptyToNull(formData.serie),
        procesador: emptyToNull(formData.procesador),
        ram: emptyToNull(formData.ram),
        disco: emptyToNull(formData.disco),
        antivirus: emptyToNull(formData.antivirus),
        tiene_mouse: emptyToNull(formData.tiene_mouse),
        tiene_teclado: emptyToNull(formData.tiene_teclado),
        tiene_parlante: emptyToNull(formData.tiene_parlante),
        fecha_inventario: emptyToNull(formData.fecha_inventario),
        responsable_inventario: emptyToNull(formData.responsable_inventario),
        fecha_mantenimiento: emptyToNull(formData.fecha_mantenimiento),
        detalle_mantenimiento: emptyToNull(formData.detalle_mantenimiento),
        activo: emptyToNull(formData.activo),
        observacion: emptyToNull(formData.observacion),
        etiquetado: emptyToNull(formData.etiquetado),
        dominio: emptyToNull(formData.dominio),
        tipo_tarjeta_red: emptyToNull(formData.tipo_tarjeta_red),
        ubicacion: emptyToNull(formData.ubicacion)
      };

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || 'Error al guardar el equipo');
      }

      navigate('/', {
        state: { refresh: true, ts: Date.now() }
      });
    } catch (err: any) {
      setError(err.message || 'Error al guardar el equipo');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="py-16 text-center text-sm text-slate-300">Cargando...</div>;
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="rounded-[28px] border border-amber-500/20 bg-amber-500/10 p-6 shadow-xl shadow-black/20">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-6 w-6 text-amber-200" />
            <div>
              <h2 className="text-lg font-semibold text-amber-100">Acceso restringido</h2>
              <p className="mt-2 text-sm text-amber-200">
                Debes iniciar sesión como administrador para crear o editar equipos.
              </p>
              <button
                onClick={() => navigate('/')}
                className="mt-4 rounded-2xl border border-slate-700 bg-slate-800/80 px-4 py-2 text-sm font-medium text-white transition hover:border-slate-600 hover:bg-slate-800"
              >
                Volver al listado
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const inputClass =
    'mt-2 h-11 w-full rounded-2xl border border-slate-700/70 bg-slate-950/70 px-4 text-sm text-slate-100 placeholder:text-slate-500 transition focus:border-blue-400/60 focus:outline-none focus:ring-4 focus:ring-blue-500/10';

  const textareaClass =
    'mt-2 w-full rounded-2xl border border-slate-700/70 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 transition focus:border-blue-400/60 focus:outline-none focus:ring-4 focus:ring-blue-500/10';

  const sectionTitle = (title: string, subtitle?: string) => (
    <div className="sm:col-span-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-950/40 px-4 py-4">
        <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-200">
          {title}
        </h3>
        {subtitle ? <p className="mt-1 text-xs text-slate-400">{subtitle}</p> : null}
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <span className="mb-2 inline-flex rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-200">
            {isEdit ? 'Edición de registro' : 'Nuevo registro'}
          </span>
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            {isEdit ? 'Editar Equipo' : 'Nuevo Equipo'}
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Complete la información del equipo de cómputo.
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-[28px] border border-slate-800 bg-slate-900/85 shadow-2xl shadow-black/20">
        {error && (
          <div className="m-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 text-red-200" />
              <p className="text-sm text-red-100">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 lg:p-8">
          <div className="grid grid-cols-1 gap-x-5 gap-y-6 sm:grid-cols-6">
            {sectionTitle('Organización', 'Datos del área, responsable y ubicación organizacional.')}

            <div className="sm:col-span-2">
              <label htmlFor="empresa" className="text-sm font-medium text-slate-200">
                Empresa
              </label>
              <input type="text" name="empresa" id="empresa" value={formData.empresa} onChange={handleChange} className={inputClass} />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="establecimiento" className="text-sm font-medium text-slate-200">
                Establecimiento
              </label>
              <input type="text" name="establecimiento" id="establecimiento" value={formData.establecimiento} onChange={handleChange} className={inputClass} />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="departamento" className="text-sm font-medium text-slate-200">
                Departamento
              </label>
              <input type="text" name="departamento" id="departamento" value={formData.departamento} onChange={handleChange} className={inputClass} />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="area" className="text-sm font-medium text-slate-200">
                Área
              </label>
              <input type="text" name="area" id="area" value={formData.area} onChange={handleChange} className={inputClass} />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="jefe_area" className="text-sm font-medium text-slate-200">
                Jefe área
              </label>
              <input type="text" name="jefe_area" id="jefe_area" value={formData.jefe_area} onChange={handleChange} className={inputClass} />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="responsable_equipo" className="text-sm font-medium text-slate-200">
                Responsable del equipo
              </label>
              <input type="text" name="responsable_equipo" id="responsable_equipo" value={formData.responsable_equipo} onChange={handleChange} className={inputClass} />
            </div>

            {sectionTitle('Identificación del equipo', 'Información principal para identificar y clasificar el equipo.')}

            <div className="sm:col-span-2">
              <label htmlFor="tipo_recurso" className="text-sm font-medium text-slate-200">
                Tipo recurso
              </label>
              <input type="text" name="tipo_recurso" id="tipo_recurso" value={formData.tipo_recurso} onChange={handleChange} placeholder="CPU / NUC / LAPTOP" className={inputClass} />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="marca" className="text-sm font-medium text-slate-200">
                Marca
              </label>
              <input type="text" name="marca" id="marca" value={formData.marca} onChange={handleChange} className={inputClass} />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="modelo" className="text-sm font-medium text-slate-200">
                Modelo
              </label>
              <input type="text" name="modelo" id="modelo" value={formData.modelo} onChange={handleChange} className={inputClass} />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="nombre_host" className="text-sm font-medium text-slate-200">
                Nombre host
              </label>
              <input type="text" name="nombre_host" id="nombre_host" value={formData.nombre_host} onChange={handleChange} className={inputClass} />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="nombre_pc" className="text-sm font-medium text-slate-200">
                Nombre PC
              </label>
              <input type="text" name="nombre_pc" id="nombre_pc" value={formData.nombre_pc} onChange={handleChange} className={inputClass} />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="serie" className="text-sm font-medium text-slate-200">
                Serie
              </label>
              <input type="text" name="serie" id="serie" value={formData.serie} onChange={handleChange} className={inputClass} />
            </div>

            {sectionTitle('Acceso y sistema', 'Credenciales, dominio y configuración base del sistema.')}

            <div className="sm:col-span-2">
              <label htmlFor="active_directory" className="text-sm font-medium text-slate-200">
                Active Directory
              </label>
              <input type="text" name="active_directory" id="active_directory" value={formData.active_directory} onChange={handleChange} className={inputClass} />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="usuario" className="text-sm font-medium text-slate-200">
                Usuario
              </label>
              <input type="text" name="usuario" id="usuario" value={formData.usuario} onChange={handleChange} className={inputClass} />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="contrasena" className="text-sm font-medium text-slate-200">
                Contraseña
              </label>
              <input type="text" name="contrasena" id="contrasena" value={formData.contrasena} onChange={handleChange} className={inputClass} />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="sistema_operativo" className="text-sm font-medium text-slate-200">
                Sistema operativo
              </label>
              <input type="text" name="sistema_operativo" id="sistema_operativo" value={formData.sistema_operativo} onChange={handleChange} className={inputClass} />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="dominio" className="text-sm font-medium text-slate-200">
                Dominio
              </label>
              <input type="text" name="dominio" id="dominio" value={formData.dominio} onChange={handleChange} className={inputClass} />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="tipo_tarjeta_red" className="text-sm font-medium text-slate-200">
                Tipo tarjeta red
              </label>
              <input type="text" name="tipo_tarjeta_red" id="tipo_tarjeta_red" value={formData.tipo_tarjeta_red} onChange={handleChange} placeholder="Ethernet / Wi-Fi" className={inputClass} />
            </div>

            {sectionTitle('Licenciamiento', 'Estado de licencias de Windows y Office.')}

            <div className="sm:col-span-2">
              <label htmlFor="tiene_licencia_windows" className="text-sm font-medium text-slate-200">
                Tiene licencia Windows
              </label>
              <select name="tiene_licencia_windows" id="tiene_licencia_windows" value={formData.tiene_licencia_windows} onChange={handleChange} className={inputClass}>
                <option value="">Seleccionar</option>
                <option value="SI">SI</option>
                <option value="NO">NO</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="codigo_licencia_windows" className="text-sm font-medium text-slate-200">
                Código licencia Windows
              </label>
              <input type="text" name="codigo_licencia_windows" id="codigo_licencia_windows" value={formData.codigo_licencia_windows} onChange={handleChange} className={inputClass} />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="tiene_licencia_office" className="text-sm font-medium text-slate-200">
                Tiene licencia Office
              </label>
              <select name="tiene_licencia_office" id="tiene_licencia_office" value={formData.tiene_licencia_office} onChange={handleChange} className={inputClass}>
                <option value="">Seleccionar</option>
                <option value="SI">SI</option>
                <option value="NO">NO</option>
              </select>
            </div>

            {sectionTitle('Red y hardware', 'Conectividad, componentes y especificaciones técnicas.')}

            <div className="sm:col-span-2">
              <label htmlFor="mac_address" className="text-sm font-medium text-slate-200">
                MAC address
              </label>
              <input type="text" name="mac_address" id="mac_address" value={formData.mac_address} onChange={handleChange} className={inputClass} />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="mac_address2" className="text-sm font-medium text-slate-200">
                MAC address 2
              </label>
              <input type="text" name="mac_address2" id="mac_address2" value={formData.mac_address2} onChange={handleChange} className={inputClass} />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="ip" className="text-sm font-medium text-slate-200">
                IP
              </label>
              <input type="text" name="ip" id="ip" value={formData.ip} onChange={handleChange} className={inputClass} />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="ip_extendida" className="text-sm font-medium text-slate-200">
                IP extendida
              </label>
              <input type="text" name="ip_extendida" id="ip_extendida" value={formData.ip_extendida} onChange={handleChange} className={inputClass} />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="procesador" className="text-sm font-medium text-slate-200">
                Procesador
              </label>
              <input type="text" name="procesador" id="procesador" value={formData.procesador} onChange={handleChange} className={inputClass} />
            </div>

            <div className="sm:col-span-1">
              <label htmlFor="ram" className="text-sm font-medium text-slate-200">
                RAM
              </label>
              <input type="text" name="ram" id="ram" value={formData.ram} onChange={handleChange} className={inputClass} />
            </div>

            <div className="sm:col-span-1">
              <label htmlFor="disco" className="text-sm font-medium text-slate-200">
                Disco
              </label>
              <input type="text" name="disco" id="disco" value={formData.disco} onChange={handleChange} className={inputClass} />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="antivirus" className="text-sm font-medium text-slate-200">
                Antivirus
              </label>
              <input type="text" name="antivirus" id="antivirus" value={formData.antivirus} onChange={handleChange} className={inputClass} />
            </div>

            <div className="sm:col-span-1">
              <label htmlFor="tiene_mouse" className="text-sm font-medium text-slate-200">
                Tiene mouse
              </label>
              <select name="tiene_mouse" id="tiene_mouse" value={formData.tiene_mouse} onChange={handleChange} className={inputClass}>
                <option value="">-</option>
                <option value="SI">SI</option>
                <option value="NO">NO</option>
              </select>
            </div>

            <div className="sm:col-span-1">
              <label htmlFor="tiene_teclado" className="text-sm font-medium text-slate-200">
                Tiene teclado
              </label>
              <select name="tiene_teclado" id="tiene_teclado" value={formData.tiene_teclado} onChange={handleChange} className={inputClass}>
                <option value="">-</option>
                <option value="SI">SI</option>
                <option value="NO">NO</option>
              </select>
            </div>

            <div className="sm:col-span-1">
              <label htmlFor="tiene_parlante" className="text-sm font-medium text-slate-200">
                Tiene parlante
              </label>
              <select name="tiene_parlante" id="tiene_parlante" value={formData.tiene_parlante} onChange={handleChange} className={inputClass}>
                <option value="">-</option>
                <option value="SI">SI</option>
                <option value="NO">NO</option>
              </select>
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="ubicacion" className="text-sm font-medium text-slate-200">
                Ubicación
              </label>
              <input type="text" name="ubicacion" id="ubicacion" value={formData.ubicacion} onChange={handleChange} placeholder="Oficina Principal, Piso 2..." className={inputClass} />
            </div>

            {sectionTitle('Fechas y estado', 'Control de inventario, mantenimiento y observaciones.')}

            <div className="sm:col-span-2">
              <label htmlFor="fecha_adquisicion" className="text-sm font-medium text-slate-200">
                Fecha de adquisición
              </label>
              <input type="date" name="fecha_adquisicion" id="fecha_adquisicion" value={formData.fecha_adquisicion} onChange={handleChange} className={inputClass} />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="fecha_instalacion" className="text-sm font-medium text-slate-200">
                Fecha de instalación
              </label>
              <input type="date" name="fecha_instalacion" id="fecha_instalacion" value={formData.fecha_instalacion} onChange={handleChange} className={inputClass} />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="proveedor" className="text-sm font-medium text-slate-200">
                Proveedor
              </label>
              <input type="text" name="proveedor" id="proveedor" value={formData.proveedor} onChange={handleChange} className={inputClass} />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="fecha_inventario" className="text-sm font-medium text-slate-200">
                Fecha del inventario
              </label>
              <input type="date" name="fecha_inventario" id="fecha_inventario" value={formData.fecha_inventario} onChange={handleChange} className={inputClass} />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="responsable_inventario" className="text-sm font-medium text-slate-200">
                Responsable del inventario
              </label>
              <input type="text" name="responsable_inventario" id="responsable_inventario" value={formData.responsable_inventario} onChange={handleChange} className={inputClass} />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="fecha_mantenimiento" className="text-sm font-medium text-slate-200">
                Fecha del mantenimiento
              </label>
              <input type="date" name="fecha_mantenimiento" id="fecha_mantenimiento" value={formData.fecha_mantenimiento} onChange={handleChange} className={inputClass} />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="activo" className="text-sm font-medium text-slate-200">
                Activo
              </label>
              <select name="activo" id="activo" value={formData.activo} onChange={handleChange} className={inputClass}>
                <option value="">-</option>
                <option value="SI">SI</option>
                <option value="NO">NO</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="etiquetado" className="text-sm font-medium text-slate-200">
                Etiquetado
              </label>
              <input type="text" name="etiquetado" id="etiquetado" value={formData.etiquetado} onChange={handleChange} className={inputClass} />
            </div>

            <div className="sm:col-span-6">
              <label htmlFor="detalle_mantenimiento" className="text-sm font-medium text-slate-200">
                Detalle mantenimiento
              </label>
              <textarea id="detalle_mantenimiento" name="detalle_mantenimiento" rows={3} value={formData.detalle_mantenimiento} onChange={handleChange} className={textareaClass} />
            </div>

            <div className="sm:col-span-6">
              <label htmlFor="observacion" className="text-sm font-medium text-slate-200">
                Observación
              </label>
              <textarea id="observacion" name="observacion" rows={4} value={formData.observacion} onChange={handleChange} className={textareaClass} />
            </div>
          </div>

          <div className="mt-8 flex flex-col-reverse gap-3 border-t border-slate-800 pt-6 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-800/80 px-5 py-3 text-sm font-medium text-white transition hover:border-slate-600 hover:bg-slate-800"
            >
              <X className="h-4 w-4" />
              Cancelar
            </button>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-blue-500 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
