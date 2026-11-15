'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import ErpIcon from '@/components/erp/ErpIcon';

export default function ModuloDinamicoPage() {
  const { slug } = useParams();
  const supabase = createClient();

  const [modulo, setModulo] = useState(null);
  const [registros, setRegistros] = useState([]);
  const [valoresForm, setValoresForm] = useState({});
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (slug) cargarModulo();
  }, [slug]);

  async function cargarModulo() {
    setCargando(true);
    const { data: mod } = await supabase
      .from('tbl_modulos_erp')
      .select('*')
      .eq('slug', slug)
      .single();

    if (mod) {
      setModulo(mod);
      const inicial = {};
      (mod.campos_json || []).forEach(c => { inicial[c] = ''; });
      setValoresForm(inicial);

      const { data: regs } = await supabase
        .from('tbl_registros_modulos')
        .select('*')
        .eq('id_modulo', mod.id_modulo)
        .order('id_registro', { ascending: false });

      if (regs) setRegistros(regs);
    }
    setCargando(false);
  }

  async function guardarRegistro(e) {
    e.preventDefault();
    const sesion = JSON.parse(localStorage.getItem('candy_erp_sesion') || '{}');

    const { error } = await supabase.from('tbl_registros_modulos').insert([{
      id_modulo: modulo.id_modulo,
      datos_json: valoresForm,
      registrado_por: sesion.nombre || 'Administrador',
      estado: 'Activo'
    }]);

    if (!error) {
      const limpio = {};
      (modulo.campos_json || []).forEach(c => { limpio[c] = ''; });
      setValoresForm(limpio);
      cargarModulo();
    }
  }

  async function eliminarRegistro(id) {
    await supabase.from('tbl_registros_modulos').delete().eq('id_registro', id);
    cargarModulo();
  }

  if (cargando) return <p style={{ padding: 30, fontSize: 13.5, color: 'var(--texto-2)' }}>Cargando módulo corporativo...</p>;
  if (!modulo) return <p style={{ padding: 30 }}>No se encontró el módulo solicitado.</p>;

  const campos = Array.isArray(modulo.campos_json) ? modulo.campos_json : [];
  const filtrados = registros.filter(r =>
    JSON.stringify(r.datos_json).toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div>
      <div className="erp-page-header erp-anim-1">
        <div>
          <span className="erp-badge erp-badge--uva">{modulo.area_departamento}</span>
          <h1 className="erp-page-title">{modulo.nombre_modulo}</h1>
          <p className="erp-page-subtitle">{modulo.descripcion}</p>
        </div>
        <span className="erp-badge erp-badge--verde">{registros.length} registros activos</span>
      </div>

      <form onSubmit={guardarRegistro} className="erp-card erp-anim-2">
        <div className="erp-card__header">
          <div className="erp-card__title">
            <ErpIcon name="plus" size={17} style={{ color: 'var(--marca)' }} />
            <span>Capturar nuevo registro en {modulo.nombre_modulo}</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
          {campos.map(campo => (
            <div key={campo}>
              <label className="erp-label">{campo} *</label>
              <input
                required
                className="erp-input"
                placeholder={`Ingresa ${campo.toLowerCase()}...`}
                value={valoresForm[campo] || ''}
                onChange={e => setValoresForm({ ...valoresForm, [campo]: e.target.value })}
              />
            </div>
          ))}
        </div>

        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" className="erp-btn erp-btn--primario">
            <ErpIcon name="check" size={15} />
            <span>Guardar registro</span>
          </button>
        </div>
      </form>

      <div className="erp-tabla-wrap erp-anim-3">
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--linea)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <div style={{ position: 'relative', width: 'min(360px, 100%)' }}>
            <input
              className="erp-input"
              style={{ paddingLeft: 34 }}
              placeholder={`Filtrar registros en ${modulo.nombre_modulo}...`}
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
            />
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--tenue)' }}>
              <ErpIcon name="search" size={15} />
            </span>
          </div>
        </div>

        <table className="erp-tabla">
          <thead>
            <tr>
              <th>Folio</th>
              {campos.map(c => <th key={c}>{c}</th>)}
              <th>Responsable</th>
              <th>Fecha</th>
              <th style={{ textAlign: 'right' }}>Acción</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 ? (
              <tr>
                <td colSpan={campos.length + 4} style={{ textAlign: 'center', padding: 32, color: 'var(--tenue)' }}>
                  Sin registros capturados en este departamento.
                </td>
              </tr>
            ) : (
              filtrados.map(reg => (
                <tr key={reg.id_registro}>
                  <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>#{reg.id_registro}</td>
                  {campos.map(c => <td key={c}>{reg.datos_json?.[c] || '—'}</td>)}
                  <td><span className="erp-badge erp-badge--uva">{reg.registrado_por}</span></td>
                  <td>{new Date(reg.fecha_registro).toLocaleDateString('es-MX')}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      onClick={() => eliminarRegistro(reg.id_registro)}
                      className="erp-btn erp-btn--secundario"
                      style={{ padding: '5px 10px', fontSize: 12, color: 'var(--naranja)' }}
                    >
                      <ErpIcon name="trash" size={14} />
                      <span>Baja</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}