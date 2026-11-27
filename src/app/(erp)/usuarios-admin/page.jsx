// Ruta: src/app/(erp)/usuarios-admin/page.jsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import ErpIcon from '@/components/erp/ErpIcon';
import ErpSelect from '@/components/erp/ErpSelect';

const ROLES_SIGE = [
  {
    value: 'admin',
    label: 'Dirección / Administrador',
    codigo: 'ADMIN',
    bg: 'rgba(91, 33, 182, 0.12)',
    color: '#5B21B6',
  },
  {
    value: 'almacen_2norte',
    label: 'Jefe de Almacén 2 Norte',
    codigo: 'ALMACÉN',
    bg: 'rgba(217, 119, 6, 0.14)',
    color: '#B45309',
  },
  {
    value: 'asesor_crm',
    label: 'Ejecutivo Comercial CRM',
    codigo: 'CRM',
    bg: 'rgba(37, 99, 235, 0.12)',
    color: '#1D4ED8',
  },
  {
    value: 'cajero_sucursal',
    label: 'Operador Punto de Venta',
    codigo: 'SUCURSAL',
    bg: 'rgba(5, 150, 105, 0.12)',
    color: '#047857',
  },
];

const SUCURSALES_FALLBACK = [
  'Sucursal 2 Norte',
  'Corporativo 11 Sur',
  'Central de Abasto',
  'Centro Histórico',
];

const FORM_INICIAL = {
  id_usuario: null,
  nombre_completo: '',
  email: '',
  email_original: '',
  telefono: '',
  rol: 'cajero_sucursal',
  sucursal_asignada: '',
};

export default function UsuariosAdminPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [usuarios, setUsuarios] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [adminActualId, setAdminActualId] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [errorGeneral, setErrorGeneral] = useState('');
  const [mensajeExito, setMensajeExito] = useState('');

  // Filtros
  const [busqueda, setBusqueda] = useState('');
  const [filtroRol, setFiltroRol] = useState('todos');
  const [filtroEstatus, setFiltroEstatus] = useState('todos');

  // Modal de Alta / Edición
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [form, setForm] = useState(FORM_INICIAL);
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState('');

  // Modal de Baja / Reactivación
  const [usuarioBaja, setUsuarioBaja] = useState(null);
  const [motivoBaja, setMotivoBaja] = useState('');
  const [procesandoEstatus, setProcesandoEstatus] = useState(false);
  const [reenviandoId, setReenviandoId] = useState(null);

  async function obtenerHeadersAuth() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.access_token) {
      return { Authorization: `Bearer ${session.access_token}` };
    }

    try {
      const sesionLocal = JSON.parse(
        localStorage.getItem('candy_erp_sesion') || 'null'
      );
      if (sesionLocal?.rol === 'admin' && sesionLocal?.correo) {
        return { 'x-erp-demo-admin': sesionLocal.correo };
      }
    } catch {}

    return null;
  }

  async function cargarDatos() {
    setCargando(true);
    setErrorGeneral('');

    try {
      const authHeaders = await obtenerHeadersAuth();
      if (!authHeaders) {
        setErrorGeneral(
          'No se detectó una sesión activa de Administrador. Vuelve a iniciar sesión.'
        );
        setCargando(false);
        return;
      }

      const res = await fetch('/api/admin/usuarios', {
        headers: authHeaders,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'No se pudieron cargar los usuarios de SIGE Candy.');
      }

      setUsuarios(data.usuarios || []);
      setSucursales(data.sucursales || []);
      setAdminActualId(data.admin_actual_id || null);
    } catch (err) {
      setErrorGeneral(err.message);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    const sesionGuardada = localStorage.getItem('candy_erp_sesion');
    if (sesionGuardada) {
      try {
        const parsed = JSON.parse(sesionGuardada);
        if (parsed.rol !== 'admin') {
          router.replace('/dashboard');
          return;
        }
      } catch {
        router.replace('/login');
        return;
      }
    }

    cargarDatos();
  }, []);

  // Opciones para ErpSelect
  const opcionesFiltroRol = useMemo(() => {
    return [
      { value: 'todos', label: 'Todos los roles', badge: usuarios.length },
      ...ROLES_SIGE.map(r => ({
        value: r.value,
        label: r.label,
        badge: usuarios.filter(u => u.rol === r.value).length,
      })),
    ];
  }, [usuarios]);

  const opcionesFiltroEstatus = useMemo(() => {
    const activos = usuarios.filter(u => u.activo).length;
    const inactivos = usuarios.filter(u => !u.activo).length;
    const pendientes = usuarios.filter(
      u => u.activo && (!u.email_confirmado || Boolean(u.correo_pendiente))
    ).length;

    return [
      { value: 'todos', label: 'Todos los estatus', badge: usuarios.length },
      { value: 'activos', label: 'Activos', badge: activos },
      { value: 'pendientes', label: 'Pendientes de verificar', badge: pendientes },
      { value: 'inactivos', label: 'Inactivos / Baja', badge: inactivos },
    ];
  }, [usuarios]);

  const opcionesRolModal = useMemo(
    () =>
      ROLES_SIGE.map(r => ({
        value: r.value,
        label: r.label,
        badge: r.codigo,
      })),
    []
  );

  const nombresSucursales = useMemo(() => {
    if (sucursales.length > 0) {
      return sucursales.map(s => s.nombre_sucursal);
    }
    return SUCURSALES_FALLBACK;
  }, [sucursales]);

  const opcionesSucursalesModal = useMemo(() => {
    const base = [{ value: '', label: 'Corporativo / General', badge: 'N/A' }];
    if (sucursales.length > 0) {
      return [
        ...base,
        ...sucursales.map(s => ({
          value: s.nombre_sucursal,
          label: s.nombre_sucursal,
          badge: s.zona || null,
        })),
      ];
    }
    return [
      ...base,
      ...SUCURSALES_FALLBACK.map(nombre => ({
        value: nombre,
        label: nombre,
      })),
    ];
  }, [sucursales]);

  const usuariosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return usuarios.filter(u => {
      const coincideRol = filtroRol === 'todos' || u.rol === filtroRol;

      let coincideEstatus = true;
      if (filtroEstatus === 'activos') coincideEstatus = u.activo;
      if (filtroEstatus === 'inactivos') coincideEstatus = !u.activo;
      if (filtroEstatus === 'pendientes') {
        coincideEstatus = u.activo && (!u.email_confirmado || Boolean(u.correo_pendiente));
      }

      const coincideTexto =
        !q ||
        u.nombre_completo?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.correo_pendiente?.toLowerCase().includes(q) ||
        u.telefono?.toLowerCase().includes(q) ||
        u.sucursal_asignada?.toLowerCase().includes(q);

      return coincideRol && coincideEstatus && coincideTexto;
    });
  }, [usuarios, busqueda, filtroRol, filtroEstatus]);

  const metricas = useMemo(() => {
    const total = usuarios.length;
    const activos = usuarios.filter(u => u.activo).length;
    const pendientes = usuarios.filter(
      u => u.activo && (!u.email_confirmado || Boolean(u.correo_pendiente))
    ).length;
    const inactivos = usuarios.filter(u => !u.activo).length;
    return { total, activos, pendientes, inactivos };
  }, [usuarios]);

  function abrirModalCrear() {
    setModoEdicion(false);
    setForm(FORM_INICIAL);
    setErrorForm('');
    setModalAbierto(true);
  }

  function abrirModalEditar(u) {
    setModoEdicion(true);
    setForm({
      id_usuario: u.id_usuario,
      nombre_completo: u.nombre_completo || '',
      email: u.email || '',
      email_original: u.email || '',
      telefono: u.telefono || '',
      rol: u.rol || 'cajero_sucursal',
      sucursal_asignada: u.sucursal_asignada || '',
    });
    setErrorForm('');
    setModalAbierto(true);
  }

  function manejarCambioRol(nuevoRol) {
    const sucursal2Norte =
      nombresSucursales.find(s => s.toLowerCase().includes('2 norte')) ||
      'Sucursal 2 Norte';

    setForm(prev => ({
      ...prev,
      rol: nuevoRol,
      sucursal_asignada:
        nuevoRol === 'almacen_2norte' && !prev.sucursal_asignada
          ? sucursal2Norte
          : prev.sucursal_asignada,
    }));
  }

  async function manejarSubmit(e) {
    e.preventDefault();
    setErrorForm('');
    setMensajeExito('');

    if (!form.rol) {
      setErrorForm('Debes seleccionar un rol del sistema.');
      return;
    }

    setGuardando(true);

    try {
      const authHeaders = await obtenerHeadersAuth();
      if (!authHeaders) {
        throw new Error('Sesión expirada. Vuelve a iniciar sesión.');
      }

      const method = modoEdicion ? 'PATCH' : 'POST';
      const payload = modoEdicion
        ? {
            accion: 'editar',
            id_usuario: form.id_usuario,
            nombre_completo: form.nombre_completo,
            email: form.email,
            telefono: form.telefono,
            rol: form.rol,
            sucursal_asignada: form.sucursal_asignada,
          }
        : {
            nombre_completo: form.nombre_completo,
            email: form.email,
            telefono: form.telefono,
            rol: form.rol,
            sucursal_asignada: form.sucursal_asignada,
          };

      const res = await fetch('/api/admin/usuarios', {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al guardar el usuario.');
      }

      setModalAbierto(false);
      setMensajeExito(
        data.mensaje ||
          (modoEdicion
            ? 'Usuario actualizado correctamente.'
            : 'Invitación enviada correctamente.')
      );
      await cargarDatos();
    } catch (err) {
      setErrorForm(err.message);
    } finally {
      setGuardando(false);
    }
  }

  async function confirmarCambioEstatus(e) {
    e.preventDefault();
    if (!usuarioBaja) return;

    setProcesandoEstatus(true);
    setErrorGeneral('');
    setMensajeExito('');

    try {
      const authHeaders = await obtenerHeadersAuth();
      if (!authHeaders) throw new Error('Sesión expirada. Vuelve a iniciar sesión.');

      const nuevoActivo = !usuarioBaja.activo;

      const res = await fetch('/api/admin/usuarios', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({
          accion: 'cambiar_estatus',
          id_usuario: usuarioBaja.id_usuario,
          activo: nuevoActivo,
          motivo_baja: nuevoActivo ? null : motivoBaja,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo cambiar el estatus del usuario.');
      }

      setUsuarioBaja(null);
      setMotivoBaja('');
      setMensajeExito(data.mensaje);
      await cargarDatos();
    } catch (err) {
      setErrorGeneral(err.message);
    } finally {
      setProcesandoEstatus(false);
    }
  }

  async function reenviarVerificacion(u) {
    setReenviandoId(u.id_usuario);
    setErrorGeneral('');
    setMensajeExito('');

    try {
      const authHeaders = await obtenerHeadersAuth();
      if (!authHeaders) throw new Error('Sesión expirada. Vuelve a iniciar sesión.');

      const res = await fetch('/api/admin/usuarios', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({
          accion: 'reenviar_verificacion',
          id_usuario: u.id_usuario,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo reenviar el correo.');
      }

      setMensajeExito(data.mensaje);
    } catch (err) {
      setErrorGeneral(err.message);
    } finally {
      setReenviandoId(null);
    }
  }

  function obtenerInfoRol(rol) {
    return (
      ROLES_SIGE.find(r => r.value === rol) || {
        label: rol,
        bg: 'rgba(100,116,139,0.12)',
        color: '#334155',
      }
    );
  }

  function formatearFecha(fechaIso) {
    if (!fechaIso) return '—';
    return new Date(fechaIso).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  const correoCambioEnModal =
    modoEdicion &&
    form.email.trim().toLowerCase() !== form.email_original.trim().toLowerCase();

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      {/* Encabezado */}
      <div
        className="erp-card"
        style={{
          margin: 0,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 14,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 10,
              background: 'var(--uva)',
              color: 'var(--amarillo)',
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
            }}
          >
            <ErpIcon name="shield" size={20} />
          </div>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--texto)', margin: 0 }}>
              Usuarios de SIGE Candy (RBAC)
            </h1>
            <p style={{ fontSize: 12.5, color: 'var(--texto-2)', margin: '2px 0 0' }}>
              Administra accesos del personal, valida correos por activación y gestiona altas o bajas de cuentas.
            </p>
          </div>
        </div>

        <button onClick={abrirModalCrear} className="erp-btn erp-btn--primario">
          <ErpIcon name="plus" size={16} />
          <span>Registrar Usuario</span>
        </button>
      </div>

      {/* Alertas */}
      {mensajeExito && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 10,
            background: '#ECFDF5',
            border: '1px solid #A7F3D0',
            color: '#065F46',
            fontSize: 13,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <span>{mensajeExito}</span>
          <button
            type="button"
            onClick={() => setMensajeExito('')}
            style={{ background: 'none', border: 'none', color: '#065F46', fontWeight: 700, cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>
      )}

      {errorGeneral && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 10,
            background: '#FDECE8',
            border: '1px solid #F7C5B8',
            color: '#C8320A',
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontWeight: 600,
          }}
        >
          <ErpIcon name="alert" size={16} />
          <span>{errorGeneral}</span>
        </div>
      )}

      {/* Tarjetas KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14 }}>
        <div className="erp-card" style={{ margin: 0 }}>
          <small style={{ fontSize: 11.5, color: 'var(--tenue)', fontWeight: 600, textTransform: 'uppercase' }}>
            Total Personal
          </small>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--texto)', marginTop: 4 }}>
            {metricas.total}
          </div>
        </div>

        <div className="erp-card" style={{ margin: 0 }}>
          <small style={{ fontSize: 11.5, color: 'var(--tenue)', fontWeight: 600, textTransform: 'uppercase' }}>
            Cuentas Activas
          </small>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#047857', marginTop: 4 }}>
            {metricas.activos}
          </div>
        </div>

        <div className="erp-card" style={{ margin: 0 }}>
          <small style={{ fontSize: 11.5, color: 'var(--tenue)', fontWeight: 600, textTransform: 'uppercase' }}>
            Pendientes de Verificar
          </small>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#B45309', marginTop: 4 }}>
            {metricas.pendientes}
          </div>
        </div>

        <div className="erp-card" style={{ margin: 0 }}>
          <small style={{ fontSize: 11.5, color: 'var(--tenue)', fontWeight: 600, textTransform: 'uppercase' }}>
            Inactivos / Baja
          </small>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#C8320A', marginTop: 4 }}>
            {metricas.inactivos}
          </div>
        </div>
      </div>

      {/* Directorio y filtros */}
      <div className="erp-card" style={{ margin: 0 }}>
        <div className="erp-card__header" style={{ flexWrap: 'wrap', gap: 12 }}>
          <div className="erp-card__title">
            <ErpIcon name="users" size={18} style={{ color: 'var(--marca)' }} />
            <span>Personal Registrado ({usuariosFiltrados.length})</span>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
            <input
              type="text"
              className="erp-input"
              style={{ width: 220, margin: 0 }}
              placeholder="Buscar nombre, correo..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
            />
            <ErpSelect
              value={filtroRol}
              onChange={setFiltroRol}
              options={opcionesFiltroRol}
              placeholder="Filtrar por rol..."
              searchable={false}
              style={{ width: 215 }}
            />
            <ErpSelect
              value={filtroEstatus}
              onChange={setFiltroEstatus}
              options={opcionesFiltroEstatus}
              placeholder="Estatus..."
              searchable={false}
              style={{ width: 205 }}
            />
            <button
              type="button"
              onClick={cargarDatos}
              className="erp-btn erp-btn--secundario"
            >
              Actualizar
            </button>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--linea)', textAlign: 'left', color: 'var(--tenue)', fontSize: 11.5, textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 10px' }}>Usuario</th>
                <th style={{ padding: '12px 10px' }}>Rol / Sucursal</th>
                <th style={{ padding: '12px 10px' }}>Verificación Correo</th>
                <th style={{ padding: '12px 10px' }}>Estatus</th>
                <th style={{ padding: '12px 10px' }}>Alta</th>
                <th style={{ padding: '12px 10px', textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cargando ? (
                <tr>
                  <td colSpan={6} style={{ padding: 36, textAlign: 'center', color: 'var(--tenue)' }}>
                    Cargando usuarios de SIGE Candy...
                  </td>
                </tr>
              ) : usuariosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: 36, textAlign: 'center', color: 'var(--tenue)' }}>
                    No se encontraron usuarios con los filtros actuales.
                  </td>
                </tr>
              ) : (
                usuariosFiltrados.map(u => {
                  const rolInfo = obtenerInfoRol(u.rol);
                  const esAdminActual = adminActualId && adminActualId === u.id_usuario;
                  const requiereReenvio = u.activo && (!u.email_confirmado || Boolean(u.correo_pendiente));

                  return (
                    <tr
                      key={u.id_usuario}
                      style={{
                        borderBottom: '1px solid var(--linea)',
                        opacity: u.activo ? 1 : 0.65,
                      }}
                    >
                      {/* Usuario */}
                      <td style={{ padding: '12px 10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: 8,
                              background: u.activo ? 'var(--uva)' : '#94A3B8',
                              color: u.activo ? 'var(--amarillo)' : '#fff',
                              display: 'grid',
                              placeItems: 'center',
                              fontWeight: 700,
                              fontSize: 12,
                              flexShrink: 0,
                            }}
                          >
                            {u.nombre_completo?.charAt(0).toUpperCase() || '?'}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--texto)' }}>
                              {u.nombre_completo}
                              {esAdminActual && (
                                <span style={{ marginLeft: 6, fontSize: 10.5, color: 'var(--marca)', fontWeight: 700 }}>
                                  (Tú)
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: 11.5, color: 'var(--tenue)' }}>
                              {u.email} · {u.telefono || 'Sin tel.'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Rol y sucursal */}
                      <td style={{ padding: '12px 10px' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '3px 9px',
                            borderRadius: 999,
                            fontSize: 11.5,
                            fontWeight: 700,
                            background: rolInfo.bg,
                            color: rolInfo.color,
                          }}
                        >
                          {rolInfo.label}
                        </span>
                        <div style={{ fontSize: 11.5, color: 'var(--tenue)', marginTop: 4 }}>
                          {u.sucursal_asignada || 'Corporativo / General'}
                        </div>
                      </td>

                      {/* Verificación de correo */}
                      <td style={{ padding: '12px 10px' }}>
                        {!u.email_confirmado ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                              padding: '3px 9px',
                              borderRadius: 999,
                              fontSize: 11.5,
                              fontWeight: 700,
                              background: '#FEF3C7',
                              color: '#92400E',
                            }}
                          >
                            <ErpIcon name="clock" size={12} />
                            Pendiente de activar
                          </span>
                        ) : u.correo_pendiente ? (
                          <div>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                                padding: '3px 9px',
                                borderRadius: 999,
                                fontSize: 11.5,
                                fontWeight: 700,
                                background: '#DBEAFE',
                                color: '#1E40AF',
                              }}
                            >
                              <ErpIcon name="mail" size={12} />
                              Cambio pendiente
                            </span>
                            <div style={{ fontSize: 11, color: '#1E40AF', marginTop: 3 }}>
                              → {u.correo_pendiente}
                            </div>
                          </div>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                              padding: '3px 9px',
                              borderRadius: 999,
                              fontSize: 11.5,
                              fontWeight: 700,
                              background: '#E8F7EF',
                              color: '#007A3B',
                            }}
                          >
                            <ErpIcon name="check" size={12} />
                            Verificado
                          </span>
                        )}
                      </td>

                      {/* Estatus Activo / Inactivo */}
                      <td style={{ padding: '12px 10px' }}>
                        {u.activo ? (
                          <span className="erp-badge erp-badge--verde">
                            <span className="erp-badge__dot" />
                            Activo
                          </span>
                        ) : (
                          <div>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '3px 9px',
                                borderRadius: 999,
                                fontSize: 11.5,
                                fontWeight: 700,
                                background: '#FDECE8',
                                color: '#C8320A',
                              }}
                            >
                              Inactivo / Baja
                            </span>
                            {u.motivo_baja && (
                              <div style={{ fontSize: 11, color: 'var(--tenue)', marginTop: 3, maxWidth: 160 }}>
                                {u.motivo_baja}
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Fecha */}
                      <td style={{ padding: '12px 10px', color: 'var(--tenue)' }}>
                        {formatearFecha(u.fecha_registro)}
                      </td>

                      {/* Acciones */}
                      <td style={{ padding: '12px 10px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                          {requiereReenvio && (
                            <button
                              type="button"
                              disabled={reenviandoId === u.id_usuario}
                              onClick={() => reenviarVerificacion(u)}
                              className="erp-btn erp-btn--secundario"
                              style={{ padding: '5px 10px', fontSize: 11.5 }}
                              title="Reenviar enlace de verificación por correo"
                            >
                              <ErpIcon name="mail" size={13} />
                              <span>{reenviandoId === u.id_usuario ? 'Enviando...' : 'Reenviar'}</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => abrirModalEditar(u)}
                            className="erp-btn erp-btn--secundario"
                            style={{ padding: '5px 10px', fontSize: 11.5 }}
                          >
                            Editar
                          </button>

                          {!esAdminActual && (
                            <button
                              type="button"
                              onClick={() => {
                                setUsuarioBaja(u);
                                setMotivoBaja('');
                              }}
                              className="erp-btn erp-btn--secundario"
                              style={{
                                padding: '5px 10px',
                                fontSize: 11.5,
                                color: u.activo ? '#C8320A' : '#007A3B',
                                borderColor: u.activo ? '#F7C5B8' : '#A7F3D0',
                              }}
                            >
                              {u.activo ? 'Dar de baja' : 'Reactivar'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Registrar / Editar Usuario */}
      {modalAbierto && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(24, 10, 34, 0.55)',
            backdropFilter: 'blur(4px)',
            zIndex: 100,
            display: 'grid',
            placeItems: 'center',
            padding: 16,
          }}
        >
          <form
            onSubmit={manejarSubmit}
            className="erp-card erp-anim-1"
            style={{ width: 'min(540px, 100%)', margin: 0 }}
          >
            <div className="erp-card__header">
              <div className="erp-card__title">
                <ErpIcon name={modoEdicion ? 'users' : 'plus'} size={18} style={{ color: 'var(--marca)' }} />
                <span>{modoEdicion ? 'Editar Usuario de SIGE Candy' : 'Registrar Nuevo Usuario'}</span>
              </div>
              <button
                type="button"
                onClick={() => setModalAbierto(false)}
                className="cerrar"
              >
                ✕
              </button>
            </div>

            {errorForm && (
              <div
                style={{
                  marginBottom: 14,
                  padding: '10px 12px',
                  borderRadius: 8,
                  background: '#FDECE8',
                  border: '1px solid #F7C5B8',
                  color: '#C8320A',
                  fontSize: 12.5,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <ErpIcon name="alert" size={16} />
                <span>{errorForm}</span>
              </div>
            )}

            <div style={{ display: 'grid', gap: 14 }}>
              <div>
                <label className="erp-label">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  className="erp-input"
                  placeholder="Ej. Israel Fernández Carrera"
                  value={form.nombre_completo}
                  onChange={e => setForm({ ...form, nombre_completo: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="erp-label">Correo Electrónico *</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="email"
                      required
                      className="erp-input"
                      style={{ paddingLeft: 34 }}
                      placeholder="colaborador@dulceriascandy.com"
                      value={form.email}
                      onChange={e => setForm({ ...form, email: e.target.value })}
                    />
                    <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--tenue)' }}>
                      <ErpIcon name="mail" size={15} />
                    </span>
                  </div>
                </div>
                <div>
                  <label className="erp-label">Teléfono *</label>
                  <input
                    type="tel"
                    required
                    className="erp-input"
                    placeholder="222-123-4567"
                    value={form.telefono}
                    onChange={e => setForm({ ...form, telefono: e.target.value })}
                  />
                </div>
              </div>

              {/* Aviso contextual de validación de correo */}
              {!modoEdicion && (
                <div
                  style={{
                    padding: '10px 12px',
                    borderRadius: 8,
                    background: '#F5F0FA',
                    border: '1px solid #E3D4F1',
                    color: 'var(--uva)',
                    fontSize: 12,
                    lineHeight: 1.5,
                    display: 'flex',
                    gap: 8,
                    alignItems: 'flex-start',
                  }}
                >
                  <ErpIcon name="mail" size={15} style={{ marginTop: 2, flexShrink: 0 }} />
                  <span>
                    Al registrar al usuario, <b>SIGE Candy enviará un enlace de activación</b> a ese correo. El colaborador deberá abrirlo para validar que el correo es real y crear su propia contraseña.
                  </span>
                </div>
              )}

              {correoCambioEnModal && (
                <div
                  style={{
                    padding: '10px 12px',
                    borderRadius: 8,
                    background: '#EFF6FF',
                    border: '1px solid #BFDBFE',
                    color: '#1E40AF',
                    fontSize: 12,
                    lineHeight: 1.5,
                    display: 'flex',
                    gap: 8,
                    alignItems: 'flex-start',
                  }}
                >
                  <ErpIcon name="mail" size={15} style={{ marginTop: 2, flexShrink: 0 }} />
                  <span>
                    Detectamos un cambio de correo. Al guardar, se enviará un enlace de confirmación a <b>{form.email}</b> para verificar que exista antes de reemplazar el correo actual.
                  </span>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="erp-label">Rol en SIGE Candy *</label>
                  <ErpSelect
                    value={form.rol}
                    onChange={manejarCambioRol}
                    options={opcionesRolModal}
                    placeholder="Seleccionar rol..."
                    searchable={false}
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label className="erp-label">Sucursal Asignada</label>
                  <ErpSelect
                    value={form.sucursal_asignada}
                    onChange={valor => setForm({ ...form, sucursal_asignada: valor })}
                    options={opcionesSucursalesModal}
                    placeholder="Seleccionar sucursal..."
                    searchPlaceholder="Buscar sucursal..."
                    searchable={opcionesSucursalesModal.length >= 6}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 10,
                marginTop: 22,
                paddingTop: 14,
                borderTop: '1px solid var(--linea)',
              }}
            >
              <button
                type="button"
                onClick={() => setModalAbierto(false)}
                className="erp-btn erp-btn--secundario"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardando}
                className="erp-btn erp-btn--primario"
              >
                <ErpIcon name={modoEdicion ? 'check' : 'mail'} size={16} />
                <span>
                  {guardando
                    ? 'Procesando...'
                    : modoEdicion
                    ? 'Guardar Cambios'
                    : 'Enviar Activación y Registrar'}
                </span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Confirmar Baja o Reactivación */}
      {usuarioBaja && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(24, 10, 34, 0.55)',
            backdropFilter: 'blur(4px)',
            zIndex: 100,
            display: 'grid',
            placeItems: 'center',
            padding: 16,
          }}
        >
          <form
            onSubmit={confirmarCambioEstatus}
            className="erp-card erp-anim-1"
            style={{ width: 'min(460px, 100%)', margin: 0 }}
          >
            <div className="erp-card__header">
              <div className="erp-card__title">
                <ErpIcon
                  name={usuarioBaja.activo ? 'alert' : 'check'}
                  size={18}
                  style={{ color: usuarioBaja.activo ? '#C8320A' : '#007A3B' }}
                />
                <span>
                  {usuarioBaja.activo ? 'Dar de baja usuario' : 'Reactivar usuario'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setUsuarioBaja(null)}
                className="cerrar"
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: 13.5, color: 'var(--texto-2)', lineHeight: 1.55, margin: '0 0 14px' }}>
              {usuarioBaja.activo ? (
                <>
                  Al dar de baja a <b>{usuarioBaja.nombre_completo}</b> ({usuarioBaja.email}), su acceso a <b>SIGE Candy</b> quedará bloqueado de inmediato, conservando su historial en auditoría y registros.
                </>
              ) : (
                <>
                  Al reactivar a <b>{usuarioBaja.nombre_completo}</b> ({usuarioBaja.email}), podrá iniciar sesión nuevamente en <b>SIGE Candy</b> con su rol asignado.
                </>
              )}
            </p>

            {usuarioBaja.activo && (
              <div style={{ marginBottom: 14 }}>
                <label className="erp-label">Motivo de la baja (opcional)</label>
                <input
                  type="text"
                  className="erp-input"
                  placeholder="Ej. Baja laboral, cambio de puesto, suspensión temporal..."
                  value={motivoBaja}
                  onChange={e => setMotivoBaja(e.target.value)}
                />
              </div>
            )}

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 10,
                paddingTop: 14,
                borderTop: '1px solid var(--linea)',
              }}
            >
              <button
                type="button"
                onClick={() => setUsuarioBaja(null)}
                className="erp-btn erp-btn--secundario"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={procesandoEstatus}
                className="erp-btn erp-btn--primario"
                style={
                  usuarioBaja.activo
                    ? { background: '#C8320A', borderColor: '#C8320A' }
                    : { background: '#007A3B', borderColor: '#007A3B' }
                }
              >
                <ErpIcon name="check" size={16} />
                <span>
                  {procesandoEstatus
                    ? 'Aplicando...'
                    : usuarioBaja.activo
                    ? 'Confirmar Baja'
                    : 'Confirmar Reactivación'}
                </span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}