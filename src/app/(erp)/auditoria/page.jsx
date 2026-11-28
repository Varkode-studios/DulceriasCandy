'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import { createClient } from '@/lib/supabase/client';
import ErpIcon from '@/components/erp/ErpIcon';
import ErpSelect from '@/components/erp/ErpSelect';
import ErpDatePicker from '@/components/erp/ErpDatePicker';

const ETIQUETA_ACCION = {
  INICIO_SESION: { texto: 'Inicio de Sesión', clase: 'erp-badge--verde' },
  CIERRE_SESION: { texto: 'Cierre de Sesión', clase: 'erp-badge--uva' },
  INTENTO_FALLIDO: { texto: 'Intento Fallido', clase: 'erp-badge--naranja' },
  GESTION_USUARIO: { texto: 'Gestión de Usuario', clase: 'erp-badge--amarillo' },
  ALTA_PRODUCTO: { texto: 'Alta de Producto', clase: 'erp-badge--verde' },
  EDICION_PRECIO_DATOS: { texto: 'Modificación / Precio', clase: 'erp-badge--uva' },
  DESCUENTO_MASIVO: { texto: 'Descuento Masivo', clase: 'erp-badge--marca' },
  IMPORTACION_EXCEL: { texto: 'Importación Excel', clase: 'erp-badge--verde' },
  VISIBILIDAD_WEB: { texto: 'Visibilidad Web', clase: 'erp-badge--amarillo' },
  ELIMINACION_BORRADOR: { texto: 'Borrador Eliminado', clase: 'erp-badge--naranja' },
  BAJA_LOGICA: { texto: 'Baja de Catálogo', clase: 'erp-badge--naranja' },
  REACTIVACION: { texto: 'Republicación', clase: 'erp-badge--verde' },
  EDICION_BANNER: { texto: 'Banner Portada', clase: 'erp-badge--amarillo' },
  ELIMINACION_BANNER: { texto: 'Banner Eliminado', clase: 'erp-badge--naranja' },
  ENTRADA_LOTE: { texto: 'Entrada Lote PEPS', clase: 'erp-badge--verde' },
  AJUSTE_STOCK: { texto: 'Ajuste de Inventario', clase: 'erp-badge--amarillo' },
  SURTIDO_PEDIDO: { texto: 'Surtido / Picking', clase: 'erp-badge--uva' },
  ENTREGA_QR: { texto: 'Entrega Validada QR', clase: 'erp-badge--verde' }
};

function fechaMX(isoStr) {
  if (!isoStr) return '';
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Mexico_City',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date(isoStr));
  } catch {
    return '';
  }
}

export default function AuditoriaGlobalPage() {
  const supabase = createClient();

  const [usuarioActual, setUsuarioActual] = useState(null);
  const [verificandoAcceso, setVerificandoAcceso] = useState(true);
  const [registros, setRegistros] = useState([]);
  const [cargando, setCargando] = useState(true);

  // Filtros
  const [vistaRapida, setVistaRapida] = useState('todos'); // 'todos' | 'accesos' | 'operacion'
  const [busqueda, setBusqueda] = useState('');
  const [filtroModulo, setFiltroModulo] = useState('todos');
  const [filtroAccion, setFiltroAccion] = useState('todos');
  const [filtroUsuario, setFiltroUsuario] = useState('todos');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  // Paginación
  const [pagina, setPagina] = useState(1);
  const porPagina = 40;

  useEffect(() => {
    // Leer pre-filtro ?modulo=... si viene desde otro módulo (ej. Catálogo)
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const mod = params.get('modulo');
      if (mod) setFiltroModulo(mod);
    }

    inicializar();
  }, []);

  useEffect(() => {
    setPagina(1);
  }, [vistaRapida, busqueda, filtroModulo, filtroAccion, filtroUsuario, fechaDesde, fechaHasta]);

  async function inicializar() {
    let perfil = null;

    try {
      const raw = localStorage.getItem('candy_erp_sesion');
      if (raw) perfil = JSON.parse(raw);
    } catch (_) {}

    try {
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user) {
        const { data: dbPerfil } = await supabase
          .from('tbl_perfiles_usuarios')
          .select('*')
          .eq('id_usuario', authData.user.id)
          .single();
        if (dbPerfil) {
          perfil = {
            id_usuario: authData.user.id,
            nombre: dbPerfil.nombre_completo || authData.user.email,
            correo: authData.user.email,
            rol: dbPerfil.rol
          };
        }
      }
    } catch (_) {}

    setUsuarioActual(perfil);
    setVerificandoAcceso(false);

    if (perfil?.rol === 'admin') {
      cargarBitacora();
    } else {
      setCargando(false);
    }
  }

  async function cargarBitacora() {
    setCargando(true);
    const { data, error } = await supabase
      .from('tbl_bitacora_auditoria')
      .select('*')
      .order('fecha_registro', { ascending: false })
      .limit(500);

    if (!error && data) {
      setRegistros(data);
    }
    setCargando(false);
  }

  const hoyMX = fechaMX(new Date().toISOString());

  const kpis = useMemo(() => {
    const deHoy = registros.filter(r => fechaMX(r.fecha_registro) === hoyMX);
    const iniciosHoy = deHoy.filter(r => r.tipo_accion === 'INICIO_SESION').length;
    const fallidos = registros.filter(r => r.tipo_accion === 'INTENTO_FALLIDO').length;
    const usuariosActivosHoy = new Set(
      deHoy
        .filter(r => r.tipo_accion !== 'INTENTO_FALLIDO')
        .map(r => r.usuario_correo || r.usuario_nombre)
        .filter(Boolean)
    ).size;

    return {
      total: registros.length,
      iniciosHoy,
      fallidos,
      usuariosActivosHoy
    };
  }, [registros, hoyMX]);

  const modulosDisponibles = useMemo(() => {
    const base = [
      'Accesos y Seguridad',
      'Catálogo y Precios',
      'Almacén 2 Norte',
      'Surtido y Corte 4:30',
      'Recepción y Entrega QR',
      'CRM y Garantías 24h',
      'Usuarios y Roles'
    ];
    const enDB = registros.map(r => r.modulo).filter(Boolean);
    return Array.from(new Set([...base, ...enDB]));
  }, [registros]);

  const usuariosDisponibles = useMemo(() => {
    return Array.from(new Set(registros.map(r => r.usuario_nombre).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b, 'es')
    );
  }, [registros]);

  const accionesDisponibles = useMemo(() => {
    const presentes = Array.from(new Set(registros.map(r => r.tipo_accion).filter(Boolean)));
    const todas = Array.from(new Set([...Object.keys(ETIQUETA_ACCION), ...presentes]));
    return todas;
  }, [registros]);

  const filtrados = useMemo(() => {
    return registros.filter(r => {
      const esAcceso = ['INICIO_SESION', 'CIERRE_SESION', 'INTENTO_FALLIDO', 'GESTION_USUARIO'].includes(
        r.tipo_accion
      );

      if (vistaRapida === 'accesos' && !esAcceso) return false;
      if (vistaRapida === 'operacion' && esAcceso) return false;

      if (filtroModulo !== 'todos' && r.modulo !== filtroModulo) return false;
      if (filtroAccion !== 'todos' && r.tipo_accion !== filtroAccion) return false;
      if (filtroUsuario !== 'todos' && r.usuario_nombre !== filtroUsuario) return false;

      const fReg = fechaMX(r.fecha_registro);
      if (fechaDesde && fReg < fechaDesde) return false;
      if (fechaHasta && fReg > fechaHasta) return false;

      if (busqueda.trim()) {
        const q = busqueda.trim().toLowerCase();
        const heno = `${r.modulo || ''} ${r.tipo_accion || ''} ${r.nombre_referencia || ''} ${
          r.descripcion_cambio || ''
        } ${r.usuario_nombre || ''} ${r.usuario_correo || ''} ${r.id_referencia || ''}`.toLowerCase();
        if (!heno.includes(q)) return false;
      }

      return true;
    });
  }, [registros, vistaRapida, filtroModulo, filtroAccion, filtroUsuario, fechaDesde, fechaHasta, busqueda]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / porPagina));
  const pagSegura = Math.min(pagina, totalPaginas);
  const inicio = (pagSegura - 1) * porPagina;
  const visibles = filtrados.slice(inicio, inicio + porPagina);

  const hayFiltros =
    vistaRapida !== 'todos' ||
    busqueda !== '' ||
    filtroModulo !== 'todos' ||
    filtroAccion !== 'todos' ||
    filtroUsuario !== 'todos' ||
    fechaDesde !== '' ||
    fechaHasta !== '';

  function limpiarFiltros() {
    setVistaRapida('todos');
    setBusqueda('');
    setFiltroModulo('todos');
    setFiltroAccion('todos');
    setFiltroUsuario('todos');
    setFechaDesde('');
    setFechaHasta('');
  }

  function exportarExcel() {
    if (filtrados.length === 0) return;

    const filas = filtrados.map(r => ({
      Fecha: new Date(r.fecha_registro).toLocaleDateString('es-MX'),
      Hora: new Date(r.fecha_registro).toLocaleTimeString('es-MX', { hour12: false }),
      Modulo: r.modulo || '',
      Tipo_Evento: ETIQUETA_ACCION[r.tipo_accion]?.texto || r.tipo_accion,
      Usuario: r.usuario_nombre || '',
      Correo: r.usuario_correo || '',
      Rol: r.usuario_rol || '',
      Referencia: r.nombre_referencia || '',
      ID_Ref: r.id_referencia || '',
      Detalle: r.descripcion_cambio || '',
      Valor_Anterior: r.valor_anterior || '',
      Valor_Nuevo: r.valor_nuevo || ''
    }));

    const hoja = XLSX.utils.json_to_sheet(filas);
    hoja['!cols'] = [
      { wch: 12 }, { wch: 10 }, { wch: 22 }, { wch: 22 }, { wch: 24 },
      { wch: 26 }, { wch: 15 }, { wch: 28 }, { wch: 16 }, { wch: 44 },
      { wch: 22 }, { wch: 24 }
    ];

    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, 'Bitacora_SIGE_Candy');
    XLSX.writeFile(libro, `Bitacora_SIGE_Candy_${hoyMX}.xlsx`);
  }

  if (verificandoAcceso) {
    return (
      <div className="erp-card" style={{ textAlign: 'center', padding: 48, color: 'var(--texto-2)' }}>
        Verificando permisos de administrador...
      </div>
    );
  }

  if (usuarioActual?.rol !== 'admin') {
    return (
      <div className="erp-card erp-anim-1" style={{ textAlign: 'center', padding: 48, maxWidth: 520, margin: '40px auto' }}>
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            background: '#FDECE8',
            color: '#C8320A',
            display: 'grid',
            placeItems: 'center',
            margin: '0 auto 14px'
          }}
        >
          <ErpIcon name="lock" size={24} />
        </div>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>Acceso exclusivo para Dirección</h2>
        <p style={{ fontSize: 13.5, color: 'var(--texto-2)', marginBottom: 18 }}>
          La bitácora global de accesos y auditoría de SIGE Candy solo está disponible para el perfil de Administrador.
        </p>
        <Link href="/dashboard" className="erp-btn erp-btn--primario">
          Volver al Panel Principal
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* ENCABEZADO */}
      <div className="erp-page-header erp-anim-1">
        <div>
          <span className="erp-badge erp-badge--uva">
            <ErpIcon name="lock" size={12} />
            <span>SIGE Candy · Auditoría Inmutable (Solo Lectura)</span>
          </span>
          <h1 className="erp-page-title">Bitácora Global y Control de Accesos</h1>
          <p className="erp-page-subtitle">
            Historial centralizado de inicios y cierres de sesión, intentos fallidos y cambios operativos en todos los módulos.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            type="button"
            disabled={filtrados.length === 0}
            onClick={exportarExcel}
            className="erp-btn erp-btn--secundario"
          >
            <ErpIcon name="clipboard" size={15} />
            <span>Exportar Excel ({filtrados.length})</span>
          </button>

          <button
            type="button"
            onClick={cargarBitacora}
            className="erp-btn erp-btn--primario"
          >
            <ErpIcon name="refresh" size={15} />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* KPIs DE AUDITORÍA */}
      <div className="erp-kpi-grid erp-anim-2" style={{ marginBottom: 18 }}>
        <div className="erp-kpi" style={{ '--c': '#3C1053' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--texto-2)', fontWeight: 600 }}>Eventos Registrados</span>
            <span className="erp-kpi__ico" style={{ '--c': '#3C1053' }}>
              <ErpIcon name="shield" size={18} />
            </span>
          </div>
          <div className="erp-kpi__valor">{kpis.total}</div>
          <span style={{ fontSize: 12, color: 'var(--texto-2)' }}>Últimos 500 movimientos</span>
        </div>

        <div className="erp-kpi" style={{ '--c': '#00A650' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--texto-2)', fontWeight: 600 }}>Inicios de Sesión Hoy</span>
            <span className="erp-kpi__ico" style={{ '--c': '#00A650' }}>
              <ErpIcon name="check" size={18} />
            </span>
          </div>
          <div className="erp-kpi__valor">{kpis.iniciosHoy}</div>
          <span style={{ fontSize: 12, color: 'var(--texto-2)' }}>Accesos exitosos del día</span>
        </div>

        <div className="erp-kpi" style={{ '--c': '#0085CA' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--texto-2)', fontWeight: 600 }}>Personal Activo Hoy</span>
            <span className="erp-kpi__ico" style={{ '--c': '#0085CA' }}>
              <ErpIcon name="users" size={18} />
            </span>
          </div>
          <div className="erp-kpi__valor">{kpis.usuariosActivosHoy}</div>
          <span style={{ fontSize: 12, color: 'var(--texto-2)' }}>Colaboradores con actividad</span>
        </div>

        <div className="erp-kpi" style={{ '--c': '#F04E23' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--texto-2)', fontWeight: 600 }}>Intentos Fallidos</span>
            <span className="erp-kpi__ico" style={{ '--c': '#F04E23' }}>
              <ErpIcon name="alert" size={18} />
            </span>
          </div>
          <div className="erp-kpi__valor">{kpis.fallidos}</div>
          <span style={{ fontSize: 12, color: kpis.fallidos > 0 ? '#C8320A' : 'var(--texto-2)', fontWeight: kpis.fallidos > 0 ? 700 : 400 }}>
            {kpis.fallidos > 0 ? 'Accesos rechazados detectados' : 'Sin alertas de acceso'}
          </span>
        </div>
      </div>

      {/* BARRA DE FILTROS */}
      <div className="erp-card erp-anim-2" style={{ padding: '16px 20px', marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
          <div className="erp-segmented">
            <button
              type="button"
              className={vistaRapida === 'todos' ? 'activo' : ''}
              onClick={() => setVistaRapida('todos')}
            >
              Todos los eventos
            </button>
            <button
              type="button"
              className={vistaRapida === 'accesos' ? 'activo' : ''}
              onClick={() => setVistaRapida('accesos')}
            >
              Solo Accesos y Sesiones
            </button>
            <button
              type="button"
              className={vistaRapida === 'operacion' ? 'activo' : ''}
              onClick={() => setVistaRapida('operacion')}
            >
              Solo Cambios Operativos
            </button>
          </div>

          {hayFiltros && (
            <button
              type="button"
              onClick={limpiarFiltros}
              className="erp-btn erp-btn--secundario"
              style={{ padding: '6px 12px', fontSize: 12, color: 'var(--naranja)' }}
            >
              Limpiar filtros
            </button>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
          <div>
            <label className="erp-label">Búsqueda</label>
            <div style={{ position: 'relative' }}>
              <input
                className="erp-input"
                style={{ paddingLeft: 34 }}
                placeholder="Usuario, correo, producto o detalle..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
              />
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--tenue)' }}>
                <ErpIcon name="search" size={15} />
              </span>
            </div>
          </div>

          <div>
            <label className="erp-label">Módulo</label>
            <ErpSelect
              value={filtroModulo}
              onChange={setFiltroModulo}
              options={[
                { value: 'todos', label: 'Todos los módulos' },
                ...modulosDisponibles.map(m => ({ value: m, label: m }))
              ]}
            />
          </div>

          <div>
            <label className="erp-label">Tipo de evento</label>
            <ErpSelect
              value={filtroAccion}
              onChange={setFiltroAccion}
              searchPlaceholder="Buscar evento..."
              options={[
                { value: 'todos', label: 'Todos los eventos' },
                ...accionesDisponibles.map(a => ({
                  value: a,
                  label: ETIQUETA_ACCION[a]?.texto || a
                }))
              ]}
            />
          </div>

          <div>
            <label className="erp-label">Colaborador</label>
            <ErpSelect
              value={filtroUsuario}
              onChange={setFiltroUsuario}
              searchPlaceholder="Buscar colaborador..."
              options={[
                { value: 'todos', label: 'Todos los colaboradores' },
                ...usuariosDisponibles.map(u => ({ value: u, label: u }))
              ]}
            />
          </div>

          <div>
            <label className="erp-label">Desde</label>
            <ErpDatePicker value={fechaDesde} onChange={setFechaDesde} />
          </div>

          <div>
            <label className="erp-label">Hasta</label>
            <ErpDatePicker value={fechaHasta} min={fechaDesde} onChange={setFechaHasta} />
          </div>
        </div>
      </div>

      {/* TABLA DE BITÁCORA */}
      <div className="erp-anim-3">
        <div className="erp-tabla-wrap">
          <table className="erp-tabla">
            <thead>
              <tr>
                <th>Fecha y Hora</th>
                <th>Módulo</th>
                <th>Colaborador</th>
                <th>Evento</th>
                <th>Elemento / Referencia</th>
                <th>Detalle</th>
                <th>Antes → Nuevo</th>
              </tr>
            </thead>
            <tbody>
              {cargando ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 44, color: 'var(--texto-2)' }}>
                    Cargando registros de auditoría...
                  </td>
                </tr>
              ) : visibles.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 44, color: 'var(--tenue)' }}>
                    No se encontraron registros con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                visibles.map(reg => {
                  const badge = ETIQUETA_ACCION[reg.tipo_accion] || {
                    texto: reg.tipo_accion,
                    clase: 'erp-badge--uva'
                  };
                  const esAlerta = reg.tipo_accion === 'INTENTO_FALLIDO';

                  return (
                    <tr
                      key={reg.id_auditoria}
                      style={esAlerta ? { background: '#FFF6F4' } : undefined}
                    >
                      <td style={{ whiteSpace: 'nowrap', fontSize: 12 }}>
                        <b style={{ display: 'block', color: 'var(--texto)' }}>
                          {new Date(reg.fecha_registro).toLocaleDateString('es-MX')}
                        </b>
                        <small style={{ color: 'var(--tenue)', fontFamily: 'monospace' }}>
                          {new Date(reg.fecha_registro).toLocaleTimeString('es-MX', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          })}
                        </small>
                      </td>

                      <td>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--uva)' }}>
                          {reg.modulo || 'General'}
                        </span>
                      </td>

                      <td>
                        <b style={{ display: 'block', fontSize: 12.5 }}>{reg.usuario_nombre}</b>
                        <small style={{ color: 'var(--texto-2)', fontSize: 11 }}>
                          {reg.usuario_correo || reg.usuario_rol}
                        </small>
                      </td>

                      <td>
                        <span className={`erp-badge ${badge.clase}`}>{badge.texto}</span>
                      </td>

                      <td>
                        <b style={{ display: 'block', fontSize: 12.5 }}>{reg.nombre_referencia}</b>
                        {reg.id_referencia && (
                          <small style={{ fontFamily: 'monospace', color: 'var(--tenue)', fontSize: 11 }}>
                            Ref: {reg.id_referencia}
                          </small>
                        )}
                      </td>

                      <td style={{ fontSize: 12.5, maxWidth: 280 }}>{reg.descripcion_cambio}</td>

                      <td>
                        <div className="erp-audit-diff">
                          {reg.valor_anterior && <span className="erp-audit-old">{reg.valor_anterior}</span>}
                          {reg.valor_anterior && reg.valor_nuevo && <span style={{ color: 'var(--tenue)' }}>→</span>}
                          {reg.valor_nuevo && <span className="erp-audit-new">{reg.valor_nuevo}</span>}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {filtrados.length > porPagina && (
          <div className="erp-pagination">
            <span style={{ fontSize: 12.5, color: 'var(--texto-2)' }}>
              Mostrando <b>{inicio + 1}</b> – <b>{Math.min(inicio + porPagina, filtrados.length)}</b> de <b>{filtrados.length}</b> registros
            </span>

            <div className="erp-pagination__btns">
              <button
                type="button"
                disabled={pagSegura === 1}
                onClick={() => setPagina(pagSegura - 1)}
                className="erp-page-btn"
              >
                Anterior
              </button>
              {Array.from({ length: totalPaginas }, (_, i) => i + 1)
                .filter(n => n === 1 || n === totalPaginas || Math.abs(n - pagSegura) <= 1)
                .map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setPagina(n)}
                    className={`erp-page-btn ${n === pagSegura ? 'activo' : ''}`}
                  >
                    {n}
                  </button>
                ))}
              <button
                type="button"
                disabled={pagSegura === totalPaginas}
                onClick={() => setPagina(pagSegura + 1)}
                className="erp-page-btn"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}