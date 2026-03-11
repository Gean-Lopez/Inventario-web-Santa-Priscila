import { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, X, AlertCircle } from 'lucide-react';

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
    etiquetado: ''
  });

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEdit) {
      fetch(`/api/equipos/${id}`)
        .then(res => {
          if (!res.ok) throw new Error('Equipo no encontrado');
          return res.json();
        })
        .then(data => {
          // Convertir nulls a cadenas vacías
          const cleanData: any = Object.keys(data).reduce((acc: any, key) => {
            acc[key] = data[key] === null ? '' : data[key];
            return acc;
          }, {});

          // Normalizar / mapear campos que pueden venir de scripts o estructura antigua
          cleanData.mac_address = cleanData.mac_address || cleanData.direccion_mac || '';
          cleanData.ip = cleanData.ip || cleanData.direccion_ip || '';
          cleanData.nombre_host = cleanData.nombre_host || cleanData.nombre_pc || '';
          cleanData.modelo = cleanData.modelo || cleanData.modelo_pc || '';
          cleanData.serie = cleanData.serie || cleanData.no_serie || '';

          // Forzar empresa por defecto si viene vacía
          cleanData.empresa = cleanData.empresa || 'Santa Priscila';

          setFormData(cleanData);
          setLoading(false);
        })
        .catch(err => {
          setError(err.message);
          setLoading(false);
        });
    }
  }, [id, isEdit]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const url = isEdit ? `/api/equipos/${id}` : '/api/equipos';
      const method = isEdit ? 'PUT' : 'POST';
      
      // Convert empty strings to null for numbers
      const payload = { ...formData };
      if (payload.ram_gb === '') payload.ram_gb = null as any;
      if (payload.disco_gb === '') payload.disco_gb = null as any;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Error al guardar el equipo');
      
      navigate('/');
    } catch (err: any) {
      setError(err.message);
      setSaving(false);
    }
  };

  if (loading) return <div className="text-center py-12">Cargando...</div>;

  return (
    <div className="bg-white shadow sm:rounded-lg max-w-4xl mx-auto border border-slate-200">
      <div className="px-4 py-5 border-b border-slate-200 sm:px-6">
        <h3 className="text-lg leading-6 font-medium text-slate-900">
          {isEdit ? 'Editar Equipo' : 'Nuevo Equipo'}
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          Complete la información del equipo de cómputo.
        </p>
      </div>
      
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 m-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="px-4 py-5 sm:p-6">
        <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
          <div className="sm:col-span-2">
            <label htmlFor="empresa" className="block text-sm font-medium text-slate-700">EMPRESA</label>
            <input type="text" name="empresa" id="empresa" value={formData.empresa} onChange={handleChange} className="mt-1 block w-full shadow-sm border border-slate-300 rounded-md p-2" />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="establecimiento" className="block text-sm font-medium text-slate-700">ESTABLECIMIENTO</label>
            <input type="text" name="establecimiento" id="establecimiento" value={formData.establecimiento} onChange={handleChange} className="mt-1 block w-full shadow-sm border border-slate-300 rounded-md p-2" />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="departamento" className="block text-sm font-medium text-slate-700">DEPARTAMENTO</label>
            <input type="text" name="departamento" id="departamento" value={formData.departamento} onChange={handleChange} className="mt-1 block w-full shadow-sm border border-slate-300 rounded-md p-2" />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="area" className="block text-sm font-medium text-slate-700">AREA</label>
            <input type="text" name="area" id="area" value={formData.area} onChange={handleChange} className="mt-1 block w-full shadow-sm border border-slate-300 rounded-md p-2" />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="jefe_area" className="block text-sm font-medium text-slate-700">JEFE AREA</label>
            <input type="text" name="jefe_area" id="jefe_area" value={formData.jefe_area} onChange={handleChange} className="mt-1 block w-full shadow-sm border border-slate-300 rounded-md p-2" />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="responsable_equipo" className="block text-sm font-medium text-slate-700">RESPONSABLE DEL EQUIPO</label>
            <input type="text" name="responsable_equipo" id="responsable_equipo" value={formData.responsable_equipo} onChange={handleChange} className="mt-1 block w-full shadow-sm border border-slate-300 rounded-md p-2" />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="fecha_adquisicion" className="block text-sm font-medium text-slate-700">FECHA DE ADQUISICION</label>
            <input type="date" name="fecha_adquisicion" id="fecha_adquisicion" value={formData.fecha_adquisicion} onChange={handleChange} className="mt-1 block w-full shadow-sm border border-slate-300 rounded-md p-2" />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="fecha_instalacion" className="block text-sm font-medium text-slate-700">FECHA DE INSTALACION</label>
            <input type="date" name="fecha_instalacion" id="fecha_instalacion" value={formData.fecha_instalacion} onChange={handleChange} className="mt-1 block w-full shadow-sm border border-slate-300 rounded-md p-2" />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="proveedor" className="block text-sm font-medium text-slate-700">PROVEEDOR</label>
            <input type="text" name="proveedor" id="proveedor" value={formData.proveedor} onChange={handleChange} className="mt-1 block w-full shadow-sm border border-slate-300 rounded-md p-2" />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="tipo_recurso" className="block text-sm font-medium text-slate-700">TIPO RECURSO</label>
            <input type="text" name="tipo_recurso" id="tipo_recurso" value={formData.tipo_recurso} onChange={handleChange} placeholder="CPU / NUC / LAPTOP" className="mt-1 block w-full shadow-sm border border-slate-300 rounded-md p-2" />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="marca" className="block text-sm font-medium text-slate-700">MARCA</label>
            <input type="text" name="marca" id="marca" value={formData.marca} onChange={handleChange} className="mt-1 block w-full shadow-sm border border-slate-300 rounded-md p-2" />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="modelo" className="block text-sm font-medium text-slate-700">MODELO</label>
            <input type="text" name="modelo" id="modelo" value={formData.modelo} onChange={handleChange} className="mt-1 block w-full shadow-sm border border-slate-300 rounded-md p-2" />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="nombre_host" className="block text-sm font-medium text-slate-700">NOMBRE HOST</label>
            <input type="text" name="nombre_host" id="nombre_host" value={formData.nombre_host} onChange={handleChange} className="mt-1 block w-full shadow-sm border border-slate-300 rounded-md p-2" />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="active_directory" className="block text-sm font-medium text-slate-700">ACTIVE DIRECTORY</label>
            <input type="text" name="active_directory" id="active_directory" value={formData.active_directory} onChange={handleChange} className="mt-1 block w-full shadow-sm border border-slate-300 rounded-md p-2" />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="usuario" className="block text-sm font-medium text-slate-700">USUARIO</label>
            <input type="text" name="usuario" id="usuario" value={formData.usuario} onChange={handleChange} className="mt-1 block w-full shadow-sm border border-slate-300 rounded-md p-2" />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="contrasena" className="block text-sm font-medium text-slate-700">CONTRASEÑA</label>
            <input type="text" name="contrasena" id="contrasena" value={formData.contrasena} onChange={handleChange} className="mt-1 block w-full shadow-sm border border-slate-300 rounded-md p-2" />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="sistema_operativo" className="block text-sm font-medium text-slate-700">SISTEMA OPERATIVO</label>
            <input type="text" name="sistema_operativo" id="sistema_operativo" value={formData.sistema_operativo} onChange={handleChange} className="mt-1 block w-full shadow-sm border border-slate-300 rounded-md p-2" />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="tiene_licencia_windows" className="block text-sm font-medium text-slate-700">TIENE LICENCIA WINDOWS</label>
            <select name="tiene_licencia_windows" id="tiene_licencia_windows" value={formData.tiene_licencia_windows} onChange={handleChange} className="mt-1 block w-full shadow-sm border border-slate-300 rounded-md p-2">
              <option value="">Seleccionar</option>
              <option value="SI">SI</option>
              <option value="NO">NO</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="codigo_licencia_windows" className="block text-sm font-medium text-slate-700">CÓDIGO LICENCIA WINDOWS</label>
            <input type="text" name="codigo_licencia_windows" id="codigo_licencia_windows" value={formData.codigo_licencia_windows} onChange={handleChange} className="mt-1 block w-full shadow-sm border border-slate-300 rounded-md p-2" />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="tiene_licencia_office" className="block text-sm font-medium text-slate-700">TIENE LICENCIA OFFICE</label>
            <select name="tiene_licencia_office" id="tiene_licencia_office" value={formData.tiene_licencia_office} onChange={handleChange} className="mt-1 block w-full shadow-sm border border-slate-300 rounded-md p-2">
              <option value="">Seleccionar</option>
              <option value="SI">SI</option>
              <option value="NO">NO</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="mac_address" className="block text-sm font-medium text-slate-700">MAC ADDRESS</label>
            <input type="text" name="mac_address" id="mac_address" value={formData.mac_address} onChange={handleChange} className="mt-1 block w-full shadow-sm border border-slate-300 rounded-md p-2" />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="mac_address2" className="block text-sm font-medium text-slate-700">MAC ADDRESS 2</label>
            <input type="text" name="mac_address2" id="mac_address2" value={formData.mac_address2} onChange={handleChange} className="mt-1 block w-full shadow-sm border border-slate-300 rounded-md p-2" />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="ip" className="block text-sm font-medium text-slate-700">IP</label>
            <input type="text" name="ip" id="ip" value={formData.ip} onChange={handleChange} className="mt-1 block w-full shadow-sm border border-slate-300 rounded-md p-2" />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="ip_extendida" className="block text-sm font-medium text-slate-700">IP-EXTENDIDA</label>
            <input type="text" name="ip_extendida" id="ip_extendida" value={formData.ip_extendida} onChange={handleChange} className="mt-1 block w-full shadow-sm border border-slate-300 rounded-md p-2" />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="serie" className="block text-sm font-medium text-slate-700">SERIE</label>
            <input type="text" name="serie" id="serie" value={formData.serie} onChange={handleChange} className="mt-1 block w-full shadow-sm border border-slate-300 rounded-md p-2" />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="procesador" className="block text-sm font-medium text-slate-700">PROCESADOR</label>
            <input type="text" name="procesador" id="procesador" value={formData.procesador} onChange={handleChange} className="mt-1 block w-full shadow-sm border border-slate-300 rounded-md p-2" />
          </div>
          <div className="sm:col-span-1">
            <label htmlFor="ram" className="block text-sm font-medium text-slate-700">RAM</label>
            <input type="text" name="ram" id="ram" value={formData.ram} onChange={handleChange} className="mt-1 block w-full shadow-sm border border-slate-300 rounded-md p-2" />
          </div>
          <div className="sm:col-span-1">
            <label htmlFor="disco" className="block text-sm font-medium text-slate-700">DISCO</label>
            <input type="text" name="disco" id="disco" value={formData.disco} onChange={handleChange} className="mt-1 block w-full shadow-sm border border-slate-300 rounded-md p-2" />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="antivirus" className="block text-sm font-medium text-slate-700">ANTIVIRUS</label>
            <input type="text" name="antivirus" id="antivirus" value={formData.antivirus} onChange={handleChange} className="mt-1 block w-full shadow-sm border border-slate-300 rounded-md p-2" />
          </div>

          <div className="sm:col-span-1">
            <label htmlFor="tiene_mouse" className="block text-sm font-medium text-slate-700">TIENE MOUSE</label>
            <select name="tiene_mouse" id="tiene_mouse" value={formData.tiene_mouse} onChange={handleChange} className="mt-1 block w-full shadow-sm border border-slate-300 rounded-md p-2">
              <option value="">-</option>
              <option value="SI">SI</option>
              <option value="NO">NO</option>
            </select>
          </div>
          <div className="sm:col-span-1">
            <label htmlFor="tiene_teclado" className="block text-sm font-medium text-slate-700">TIENE TECLADO</label>
            <select name="tiene_teclado" id="tiene_teclado" value={formData.tiene_teclado} onChange={handleChange} className="mt-1 block w-full shadow-sm border border-slate-300 rounded-md p-2">
              <option value="">-</option>
              <option value="SI">SI</option>
              <option value="NO">NO</option>
            </select>
          </div>
          <div className="sm:col-span-1">
            <label htmlFor="tiene_parlante" className="block text-sm font-medium text-slate-700">TIENE PARLANTE</label>
            <select name="tiene_parlante" id="tiene_parlante" value={formData.tiene_parlante} onChange={handleChange} className="mt-1 block w-full shadow-sm border border-slate-300 rounded-md p-2">
              <option value="">-</option>
              <option value="SI">SI</option>
              <option value="NO">NO</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="fecha_inventario" className="block text-sm font-medium text-slate-700">FECHA DEL INVENTARIO</label>
            <input type="date" name="fecha_inventario" id="fecha_inventario" value={formData.fecha_inventario} onChange={handleChange} className="mt-1 block w-full shadow-sm border border-slate-300 rounded-md p-2" />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="responsable_inventario" className="block text-sm font-medium text-slate-700">RESPONSABLE DEL INVENTARIO</label>
            <input type="text" name="responsable_inventario" id="responsable_inventario" value={formData.responsable_inventario} onChange={handleChange} className="mt-1 block w-full shadow-sm border border-slate-300 rounded-md p-2" />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="fecha_mantenimiento" className="block text-sm font-medium text-slate-700">FECHA DEL MANTENIMIENTO</label>
            <input type="date" name="fecha_mantenimiento" id="fecha_mantenimiento" value={formData.fecha_mantenimiento} onChange={handleChange} className="mt-1 block w-full shadow-sm border border-slate-300 rounded-md p-2" />
          </div>

          <div className="sm:col-span-6">
            <label htmlFor="detalle_mantenimiento" className="block text-sm font-medium text-slate-700">DETALLE MANTENIMIENTO</label>
            <textarea id="detalle_mantenimiento" name="detalle_mantenimiento" rows={2} value={formData.detalle_mantenimiento} onChange={handleChange} className="mt-1 block w-full shadow-sm border border-slate-300 rounded-md p-2"></textarea>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="activo" className="block text-sm font-medium text-slate-700">ACTIVO</label>
            <select name="activo" id="activo" value={formData.activo} onChange={handleChange} className="mt-1 block w-full shadow-sm border border-slate-300 rounded-md p-2">
              <option value="">-</option>
              <option value="SI">SI</option>
              <option value="NO">NO</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="etiquetado" className="block text-sm font-medium text-slate-700">ETIQUETADO</label>
            <input type="text" name="etiquetado" id="etiquetado" value={formData.etiquetado} onChange={handleChange} className="mt-1 block w-full shadow-sm border border-slate-300 rounded-md p-2" />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="dominio" className="block text-sm font-medium text-slate-700">Dominio</label>
            <div className="mt-1">
              <input type="text" name="dominio" id="dominio" value={formData.dominio} onChange={handleChange} className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-slate-300 rounded-md p-2 border" />
            </div>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="tipo_tarjeta_red" className="block text-sm font-medium text-slate-700">Tipo Tarjeta Red</label>
            <div className="mt-1">
              <input type="text" name="tipo_tarjeta_red" id="tipo_tarjeta_red" value={formData.tipo_tarjeta_red} onChange={handleChange} placeholder="Ethernet / Wi-Fi" className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-slate-300 rounded-md p-2 border" />
            </div>
          </div>

          <div className="sm:col-span-6">
            <label htmlFor="ubicacion" className="block text-sm font-medium text-slate-700">Ubicación</label>
            <div className="mt-1">
              <input type="text" name="ubicacion" id="ubicacion" value={formData.ubicacion} onChange={handleChange} placeholder="Oficina Principal, Piso 2..." className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-slate-300 rounded-md p-2 border" />
            </div>
          </div>

          <div className="sm:col-span-6">
            <label htmlFor="observacion" className="block text-sm font-medium text-slate-700">OBSERVACIÓN</label>
            <textarea id="observacion" name="observacion" rows={3} value={formData.observacion} onChange={handleChange} className="mt-1 block w-full shadow-sm border border-slate-300 rounded-md p-2"></textarea>
          </div>
        </div>

        <div className="mt-8 border-t border-slate-200 pt-5">
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="bg-white py-2 px-4 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
            >
              <X className="h-4 w-4 inline mr-1" />
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
            >
              <Save className="h-4 w-4 inline mr-2" />
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
