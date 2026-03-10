import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, X, AlertCircle } from 'lucide-react';

export default function Form() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [formData, setFormData] = useState({
    nombre_pc: '',
    usuario: '',
    dominio: '',
    direccion_ip: '',
    direccion_mac: '',
    tipo_tarjeta_red: '',
    sistema_operativo: '',
    ram_gb: '',
    procesador: '',
    disco_gb: '',
    modelo_pc: '',
    no_serie: '',
    ubicacion: '',
    observaciones: ''
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
          // Convert nulls to empty strings for inputs
          const cleanData = Object.keys(data).reduce((acc: any, key) => {
            acc[key] = data[key] === null ? '' : data[key];
            return acc;
          }, {});
          setFormData(cleanData);
          setLoading(false);
        })
        .catch(err => {
          setError(err.message);
          setLoading(false);
        });
    }
  }, [id, isEdit]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
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
          
          <div className="sm:col-span-3">
            <label htmlFor="nombre_pc" className="block text-sm font-medium text-slate-700">Nombre PC *</label>
            <div className="mt-1">
              <input required type="text" name="nombre_pc" id="nombre_pc" value={formData.nombre_pc} onChange={handleChange} className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-slate-300 rounded-md p-2 border" />
            </div>
          </div>

          <div className="sm:col-span-3">
            <label htmlFor="usuario" className="block text-sm font-medium text-slate-700">Usuario Asignado</label>
            <div className="mt-1">
              <input type="text" name="usuario" id="usuario" value={formData.usuario} onChange={handleChange} className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-slate-300 rounded-md p-2 border" />
            </div>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="dominio" className="block text-sm font-medium text-slate-700">Dominio</label>
            <div className="mt-1">
              <input type="text" name="dominio" id="dominio" value={formData.dominio} onChange={handleChange} className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-slate-300 rounded-md p-2 border" />
            </div>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="direccion_ip" className="block text-sm font-medium text-slate-700">Dirección IP</label>
            <div className="mt-1">
              <input type="text" name="direccion_ip" id="direccion_ip" value={formData.direccion_ip} onChange={handleChange} placeholder="192.168.1.X" className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-slate-300 rounded-md p-2 border font-mono" />
            </div>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="direccion_mac" className="block text-sm font-medium text-slate-700">Dirección MAC</label>
            <div className="mt-1">
              <input type="text" name="direccion_mac" id="direccion_mac" value={formData.direccion_mac} onChange={handleChange} placeholder="00:00:00:00:00:00" className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-slate-300 rounded-md p-2 border font-mono uppercase" />
            </div>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="tipo_tarjeta_red" className="block text-sm font-medium text-slate-700">Tipo Tarjeta Red</label>
            <div className="mt-1">
              <input type="text" name="tipo_tarjeta_red" id="tipo_tarjeta_red" value={formData.tipo_tarjeta_red} onChange={handleChange} placeholder="Ethernet / Wi-Fi" className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-slate-300 rounded-md p-2 border" />
            </div>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="sistema_operativo" className="block text-sm font-medium text-slate-700">Sistema Operativo</label>
            <div className="mt-1">
              <input type="text" name="sistema_operativo" id="sistema_operativo" value={formData.sistema_operativo} onChange={handleChange} placeholder="Windows 11 Pro" className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-slate-300 rounded-md p-2 border" />
            </div>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="ram_gb" className="block text-sm font-medium text-slate-700">RAM (GB)</label>
            <div className="mt-1">
              <input type="number" name="ram_gb" id="ram_gb" value={formData.ram_gb} onChange={handleChange} min="1" className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-slate-300 rounded-md p-2 border" />
            </div>
          </div>

          <div className="sm:col-span-3">
            <label htmlFor="procesador" className="block text-sm font-medium text-slate-700">Procesador</label>
            <div className="mt-1">
              <input type="text" name="procesador" id="procesador" value={formData.procesador} onChange={handleChange} className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-slate-300 rounded-md p-2 border" />
            </div>
          </div>

          <div className="sm:col-span-3">
            <label htmlFor="disco_gb" className="block text-sm font-medium text-slate-700">Disco (GB)</label>
            <div className="mt-1">
              <input type="number" name="disco_gb" id="disco_gb" value={formData.disco_gb} onChange={handleChange} min="1" className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-slate-300 rounded-md p-2 border" />
            </div>
          </div>

          <div className="sm:col-span-3">
            <label htmlFor="modelo_pc" className="block text-sm font-medium text-slate-700">Modelo PC</label>
            <div className="mt-1">
              <input type="text" name="modelo_pc" id="modelo_pc" value={formData.modelo_pc} onChange={handleChange} placeholder="Intel NUC" className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-slate-300 rounded-md p-2 border" />
            </div>
          </div>

          <div className="sm:col-span-3">
            <label htmlFor="no_serie" className="block text-sm font-medium text-slate-700">No. Serie</label>
            <div className="mt-1">
              <input type="text" name="no_serie" id="no_serie" value={formData.no_serie} onChange={handleChange} className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-slate-300 rounded-md p-2 border font-mono uppercase" />
            </div>
          </div>

          <div className="sm:col-span-6">
            <label htmlFor="ubicacion" className="block text-sm font-medium text-slate-700">Ubicación</label>
            <div className="mt-1">
              <input type="text" name="ubicacion" id="ubicacion" value={formData.ubicacion} onChange={handleChange} placeholder="Oficina Principal, Piso 2..." className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-slate-300 rounded-md p-2 border" />
            </div>
          </div>

          <div className="sm:col-span-6">
            <label htmlFor="observaciones" className="block text-sm font-medium text-slate-700">Observaciones</label>
            <div className="mt-1">
              <textarea id="observaciones" name="observaciones" rows={3} value={formData.observaciones} onChange={handleChange} className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border border-slate-300 rounded-md p-2"></textarea>
            </div>
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
