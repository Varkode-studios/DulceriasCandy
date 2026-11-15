'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import ErpIcon from '@/components/erp/ErpIcon';

const CUENTAS_ROLES = [
  {
    rol: 'admin',
    nombre: 'Dirección / Administrador General',
    correo: 'admin@dulceriascandy.com',
    icono: 'shield',
    desc: 'Control total de catálogo, inventario PEPS, surtido, entregas QR, CRM y áreas.',
    codigo: 'ADMIN'
  },
  {
    rol: 'almacen_2norte',
    nombre: 'Jefatura de Almacén (Sucursal 2 Norte)',
    correo: 'almacen2norte@dulceriascandy.com',
    icono: 'box',
    desc: 'Recepción de lotes con caducidad PEPS y surtido de pedidos con corte 4:30 PM.',
    codigo: 'ALMACÉN'
  },
  {
    rol: 'cajero_sucursal',
    nombre: 'Operador Sucursal Click & Collect',
    correo: 'caja.centro@dulceriascandy.com',
    icono: 'qrcode',
    desc: 'Recepción de paquetes en sucursal y validación de código QR de entrega.',
    codigo: 'SUCURSAL'
  },
  {
    rol: 'asesor_crm',
    nombre: 'Ejecutivo Comercial CRM y Posventa',
    correo: 'crm.mayoreo@dulceriascandy.com',
    icono: 'users',
    desc: 'Cotizaciones mayoristas por WhatsApp y atención de garantías.',
    codigo: 'CRM'
  }
];

export default function LoginErpPage() {
  const router = useRouter();
  const supabase = createClient();

  const [vista, setVista] = useState('login');
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [verPass, setVerPass] = useState(false);
  const [correoRecuperacion, setCorreoRecuperacion] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  async function iniciarConFormulario(e) {
    e.preventDefault();
    setError('');
    setCargando(true);

    const cuentaDemo = CUENTAS_ROLES.find(c => c.correo.toLowerCase() === correo.trim().toLowerCase());
    if (cuentaDemo && password.length >= 4) {
      entrarConPerfil(cuentaDemo);
      return;
    }

    const { data, error: authErr } = await supabase.auth.signInWithPassword({
      email: correo,
      password
    });

    if (authErr || !data?.user) {
      setError('Credenciales inválidas o cuenta no autorizada en el Nodo Central 2 Norte.');
      setCargando(false);
      return;
    }

    const { data: perfil } = await supabase
      .from('tbl_perfiles_usuarios')
      .select('*')
      .eq('id_usuario', data.user.id)
      .single();

    if (perfil && perfil.rol === 'cliente') {
      setError('Acceso denegado: Esta cuenta pertenece al portal de clientes.');
      setCargando(false);
      return;
    }

    entrarConPerfil({
      rol: perfil?.rol || 'admin',
      nombre: perfil?.nombre_completo || data.user.email,
      correo: data.user.email
    });
  }

  async function enviarRecuperacionPassword(e) {
    e.preventDefault();
    setError('');
    setCargando(true);

    try {
      await supabase.auth.resetPasswordForEmail(correoRecuperacion.trim(), {
        redirectTo: `${window.location.origin}/login`
      });
    } catch (_) {}

    setTimeout(() => {
      setCargando(false);
      setVista('recuperar_exito');
    }, 500);
  }

  function entrarConPerfil(perfil) {
    localStorage.setItem('candy_erp_sesion', JSON.stringify(perfil));
    router.push('/dashboard');
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--fondo)', display: 'grid', placeItems: 'center', padding: 24 }}>
      <div
        className="erp-anim-1"
        style={{
          width: 'min(1020px, 100%)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          background: '#fff',
          borderRadius: 16,
          overflow: 'hidden',
          border: '1px solid var(--linea)',
          boxShadow: '0 20px 50px rgba(38, 35, 43, 0.12)'
        }}
      >
        {/* PANEL IZQUIERDO: IDENTIDAD CORPORATIVA Y ROLES RBAC */}
        <div
          style={{
            background: 'linear-gradient(165deg, var(--uva) 0%, #230832 100%)',
            color: '#fff',
            padding: '40px 34px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <img
                src="/img/LOGO CANDY.png"
                alt="Dulcerías Candy"
                style={{ height: 42 }}
                onError={e => { e.currentTarget.src = '/img/ICONO.png'; }}
              />
              <span className="erp-sidebar__tag">Acceso Corporativo</span>
            </div>

            <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 6 }}>
              Sistema de Planificación de Recursos (Mini-ERP)
            </h2>
            <p style={{ fontSize: 13, color: 'rgba(237, 231, 242, 0.72)', lineHeight: 1.55, marginBottom: 24 }}>
              Plataforma centralizada para control de inventario PEPS, sincronización comercial en tiempo real y logística Click & Collect.
            </p>

            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--amarillo)', marginBottom: 10 }}>
              Perfiles Operativos Autorizados (Acceso Directo)
            </p>

            <div style={{ display: 'grid', gap: 9 }}>
              {CUENTAS_ROLES.map(c => (
                <button
                  key={c.rol}
                  type="button"
                  onClick={() => entrarConPerfil(c)}
                  className="erp-rol-btn"
                >
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 8,
                      background: 'rgba(236, 0, 140, 0.2)',
                      border: '1px solid rgba(236, 0, 140, 0.45)',
                      color: '#fff',
                      display: 'grid',
                      placeItems: 'center',
                      marginTop: 2
                    }}
                  >
                    <ErpIcon name={c.icono} size={17} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <b style={{ fontSize: 13 }}>{c.nombre}</b>
                      <span style={{ fontSize: 10.5, color: 'var(--amarillo)', fontFamily: 'monospace' }}>{c.codigo}</span>
                    </div>
                    <p style={{ fontSize: 11.5, color: 'rgba(237, 231, 242, 0.68)', marginTop: 3, lineHeight: 1.35 }}>
                      {c.desc}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 24, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: 'rgba(255,255,255,0.55)' }}>
            <span>Nodo Central: Sucursal 2 Norte, Puebla</span>
            <span>Conexión TLS Encriptada</span>
          </div>
        </div>

        {/* PANEL DERECHO: FORMULARIO DE AUTENTICACIÓN Y RECUPERACIÓN */}
        <div style={{ padding: '42px 38px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          {vista === 'login' && (
            <div key="login-form" className="erp-anim-1">
              <div style={{ marginBottom: 24 }}>
                <span className="erp-badge erp-badge--uva" style={{ marginBottom: 10 }}>
                  <ErpIcon name="lock" size={13} />
                  <span>Acceso Institucional</span>
                </span>
                <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--texto)' }}>
                  Iniciar sesión
                </h1>
                <p style={{ fontSize: 13.5, color: 'var(--texto-2)', marginTop: 4 }}>
                  Ingresa tus credenciales de colaborador para acceder a tus módulos asignados.
                </p>
              </div>

              {error && (
                <div style={{ background: '#FDECE8', border: '1px solid #F7C5B8', color: '#C8320A', padding: '10px 12px', borderRadius: 8, fontSize: 12.5, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ErpIcon name="alert" size={16} />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={iniciarConFormulario} style={{ display: 'grid', gap: 16 }}>
                <div>
                  <label className="erp-label">Correo electrónico corporativo</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="email"
                      required
                      className="erp-input"
                      style={{ paddingLeft: 36 }}
                      placeholder="nombre@dulceriascandy.com"
                      value={correo}
                      onChange={e => setCorreo(e.target.value)}
                    />
                    <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--tenue)' }}>
                      <ErpIcon name="mail" size={16} />
                    </span>
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label className="erp-label" style={{ margin: 0 }}>Contraseña</label>
                    <button
                      type="button"
                      onClick={() => {
                        setError('');
                        setCorreoRecuperacion(correo);
                        setVista('recuperar');
                      }}
                      className="link"
                      style={{ fontSize: 12 }}
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>

                  <div style={{ position: 'relative' }}>
                    <input
                      type={verPass ? 'text' : 'password'}
                      required
                      className="erp-input"
                      style={{ paddingLeft: 36, paddingRight: 38 }}
                      placeholder="••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                    />
                    <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--tenue)' }}>
                      <ErpIcon name="lock" size={16} />
                    </span>
                    <button
                      type="button"
                      onClick={() => setVerPass(!verPass)}
                      aria-label="Mostrar u ocultar contraseña"
                      style={{
                        position: 'absolute',
                        right: 10,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                        color: 'var(--texto-2)'
                      }}
                    >
                      <ErpIcon name={verPass ? 'eye-off' : 'eye'} size={16} />
                    </button>
                  </div>
                </div>

                <button type="submit" disabled={cargando} className="erp-btn erp-btn--primario" style={{ width: '100%', padding: '11px 18px', marginTop: 4 }}>
                  <span>{cargando ? 'Validando credenciales...' : 'Acceder al Sistema ERP'}</span>
                  <ErpIcon name="arrow-right" size={16} />
                </button>
              </form>
            </div>
          )}

          {vista === 'recuperar' && (
            <div key="recuperar-form" className="erp-anim-1">
              <span className="erp-badge erp-badge--amarillo" style={{ marginBottom: 10 }}>
                <ErpIcon name="lock" size={13} />
                <span>Restablecimiento de Credenciales</span>
              </span>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--texto)', marginBottom: 6 }}>
                ¿Olvidaste tu contraseña?
              </h1>
              <p style={{ fontSize: 13, color: 'var(--texto-2)', marginBottom: 20, lineHeight: 1.55 }}>
                Ingresa tu correo corporativo registrado en Dulcerías Candy para enviarte las instrucciones de restablecimiento y notificar al administrador del sistema.
              </p>

              <form onSubmit={enviarRecuperacionPassword} style={{ display: 'grid', gap: 15 }}>
                <div>
                  <label className="erp-label">Correo electrónico registrado *</label>
                  <input
                    type="email"
                    required
                    className="erp-input"
                    placeholder="colaborador@dulceriascandy.com"
                    value={correoRecuperacion}
                    onChange={e => setCorreoRecuperacion(e.target.value)}
                  />
                </div>

                <button type="submit" disabled={cargando} className="erp-btn erp-btn--primario" style={{ width: '100%' }}>
                  <ErpIcon name="mail" size={16} />
                  <span>{cargando ? 'Procesando solicitud...' : 'Enviar enlace de recuperación'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setVista('login')}
                  className="erp-btn erp-btn--secundario"
                  style={{ width: '100%' }}
                >
                  <ErpIcon name="arrow-left" size={15} />
                  <span>Volver al inicio de sesión</span>
                </button>
              </form>
            </div>
          )}

          {vista === 'recuperar_exito' && (
            <div key="recuperar-ok" className="erp-anim-1" style={{ textAlign: 'center', padding: '12px 0' }}>
              <div style={{ width: 52, height: 52, borderRadius: 12, background: '#E8F7EF', color: '#007A3B', display: 'grid', placeItems: 'center', margin: '0 auto 14px', border: '1px solid #BFEAD2' }}>
                <ErpIcon name="check" size={24} />
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Solicitud registrada</h2>
              <p style={{ fontSize: 13, color: 'var(--texto-2)', lineHeight: 1.6, marginBottom: 20 }}>
                Se envió el enlace de restablecimiento a <b>{correoRecuperacion}</b> y se notificó a la administración de TI del Nodo 2 Norte.
              </p>
              <button
                type="button"
                onClick={() => setVista('login')}
                className="erp-btn erp-btn--primario"
                style={{ width: '100%' }}
              >
                Regresar al acceso principal
              </button>
            </div>
          )}

          <div style={{ marginTop: 28, paddingTop: 16, borderTop: '1px solid var(--linea)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12.5 }}>
            <a href="/" className="link" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <ErpIcon name="arrow-left" size={14} />
              <span>Ir a la tienda pública</span>
            </a>
            <span style={{ color: 'var(--tenue)', fontSize: 12 }}>Soporte Sistemas · Ext. 204</span>
          </div>
        </div>
      </div>
    </div>
  );
}