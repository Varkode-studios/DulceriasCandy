// Ruta: src/app/(erp)/login/page.jsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import ErpIcon from '@/components/erp/ErpIcon';

const ROLES_ERP_PERMITIDOS = [
  'admin',
  'almacen_2norte',
  'cajero_sucursal',
  'asesor_crm'
];

const CUENTAS_ROLES = [
  {
    rol: 'admin',
    nombre: 'Dirección / Administrador General',
    correo: 'admin@dulceriascandy.com',
    icono: 'shield',
    desc: 'Control total de catálogo, inventario PEPS, surtido, entregas QR, CRM y áreas.',
    codigo: 'ADMIN',
    modo: 'demo'
  },
  {
    rol: 'almacen_2norte',
    nombre: 'Jefatura de Almacén (Sucursal 2 Norte)',
    correo: 'almacen2norte@dulceriascandy.com',
    icono: 'box',
    desc: 'Recepción de lotes con caducidad PEPS y surtido de pedidos con corte 4:30 PM.',
    codigo: 'ALMACÉN',
    modo: 'demo'
  },
  {
    rol: 'cajero_sucursal',
    nombre: 'Operador Sucursal Click & Collect',
    correo: 'caja.centro@dulceriascandy.com',
    icono: 'qrcode',
    desc: 'Recepción de paquetes en sucursal y validación de código QR de entrega.',
    codigo: 'SUCURSAL',
    modo: 'demo'
  },
  {
    rol: 'asesor_crm',
    nombre: 'Ejecutivo Comercial CRM y Posventa',
    correo: 'crm.mayoreo@dulceriascandy.com',
    icono: 'users',
    desc: 'Cotizaciones mayoristas por WhatsApp y atención de garantías.',
    codigo: 'CRM',
    modo: 'demo'
  }
];

export default function LoginErpPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const enlaceProcesadoRef = useRef(false);

  // Vistas:
  // login | recuperar | recuperar_exito | validando_enlace |
  // nueva_password | password_actualizada | correo_confirmado
  const [vista, setVista] = useState('login');
  const [esActivacionCuenta, setEsActivacionCuenta] = useState(false);

  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [verPass, setVerPass] = useState(false);

  // Recuperación / Activación
  const [correoRecuperacion, setCorreoRecuperacion] = useState('');
  const [nuevaPassword, setNuevaPassword] = useState('');
  const [confirmarPassword, setConfirmarPassword] = useState('');
  const [verNuevaPass, setVerNuevaPass] = useState(false);

  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  // Intercepta enlaces de recuperación, activación de cuenta y cambio de correo
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));

    const code = params.get('code');
    const modoUrl = params.get('modo'); // 'recuperar' | 'activar' | 'correo_confirmado'
    const tipoHash = hashParams.get('type'); // 'recovery' | 'invite' | 'signup' | 'email_change'
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');

    const errorCode = params.get('error_code') || hashParams.get('error_code');
    const errorDesc = params.get('error_description') || hashParams.get('error_description');

    if (errorCode || errorDesc) {
      setError(
        errorCode === 'otp_expired'
          ? 'El enlace expiró o ya fue utilizado. Solicita uno nuevo.'
          : 'El enlace de verificación no es válido. Solicita uno nuevo.'
      );
      setVista('login');
      window.history.replaceState({}, '', '/login');
      return;
    }

    const esCambioCorreo =
      modoUrl === 'correo_confirmado' || tipoHash === 'email_change';
    const esActivacion =
      modoUrl === 'activar' || tipoHash === 'invite' || tipoHash === 'signup';
    const esRecuperacion =
      modoUrl === 'recuperar' || tipoHash === 'recovery';

    const tieneTokenEnUrl = Boolean(code || (accessToken && refreshToken));
    const esFlujoEspecial = Boolean(
      esCambioCorreo || esActivacion || esRecuperacion || tieneTokenEnUrl
    );

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setError('');
        setEsActivacionCuenta(false);
        setVista('nueva_password');
        window.history.replaceState({}, '', '/login');
      } else if (event === 'SIGNED_IN' && session && (esActivacion || esRecuperacion)) {
        setError('');
        setEsActivacionCuenta(esActivacion);
        setVista('nueva_password');
        window.history.replaceState({}, '', '/login');
      }
    });

    async function procesarEnlace() {
      if (!esFlujoEspecial) return;
      if (enlaceProcesadoRef.current) return;
      enlaceProcesadoRef.current = true;

      setVista('validando_enlace');

      // 1. Si llegan tokens en el hash (#access_token=...&refresh_token=...), ej. inviteUserByEmail o email_change
      if (accessToken && refreshToken) {
        const { error: setSessErr } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (setSessErr) {
          setError('El enlace expiró o ya fue utilizado. Solicita uno nuevo.');
          setVista('login');
          window.history.replaceState({}, '', '/login');
          return;
        }

        if (esCambioCorreo) {
          localStorage.removeItem('candy_erp_sesion');
          await supabase.auth.signOut();
          setError('');
          setVista('correo_confirmado');
          window.history.replaceState({}, '', '/login');
          return;
        }

        setError('');
        setEsActivacionCuenta(esActivacion);
        setVista('nueva_password');
        window.history.replaceState({}, '', '/login');
        return;
      }

      // 2. Si viene confirmación de cambio de correo sin tokens (confirmación directa en servidor)
      if (esCambioCorreo && !code) {
        localStorage.removeItem('candy_erp_sesion');
        await supabase.auth.signOut();
        setError('');
        setVista('correo_confirmado');
        window.history.replaceState({}, '', '/login');
        return;
      }

      // 3. Flujo PKCE (?code=...)
      let {
        data: { session }
      } = await supabase.auth.getSession();

      if (!session) {
        await new Promise(resolve => setTimeout(resolve, 400));
        ({
          data: { session }
        } = await supabase.auth.getSession());
      }

      if (!session && code) {
        const { data, error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code);
        if (!exchangeErr && data?.session) {
          session = data.session;
        } else {
          ({
            data: { session }
          } = await supabase.auth.getSession());
        }
      }

      if (esCambioCorreo) {
        localStorage.removeItem('candy_erp_sesion');
        await supabase.auth.signOut();
        setError('');
        setVista('correo_confirmado');
        window.history.replaceState({}, '', '/login');
        return;
      }

      if (session) {
        setError('');
        setEsActivacionCuenta(esActivacion);
        setVista('nueva_password');
        window.history.replaceState({}, '', '/login');
        return;
      }

      setError(
        'El enlace expiró, ya fue utilizado o se abrió en otro navegador. Solicita uno nuevo.'
      );
      setVista('login');
      window.history.replaceState({}, '', '/login');
    }

    procesarEnlace();

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  async function iniciarConFormulario(e) {
    e.preventDefault();
    setError('');
    setCargando(true);

    const correoLimpio = correo.trim().toLowerCase();

    const cuentaDemo = CUENTAS_ROLES.find(c => c.correo.toLowerCase() === correoLimpio);
    if (cuentaDemo && password.length >= 4) {
      entrarConPerfil(cuentaDemo);
      return;
    }

    const { data, error: authErr } = await supabase.auth.signInWithPassword({
      email: correoLimpio,
      password
    });

    if (authErr || !data?.user) {
      const msg = String(authErr?.message || '').toLowerCase();
      if (msg.includes('email not confirmed')) {
        setError('Tu cuenta aún no ha sido activada. Revisa tu correo electrónico y haz clic en el enlace de activación.');
      } else if (msg.includes('banned')) {
        setError('Tu cuenta se encuentra inactiva o dada de baja. Contacta al Administrador de SIGE Candy.');
      } else {
        setError('Credenciales inválidas o cuenta no autorizada en el Nodo Central 2 Norte.');
      }
      setCargando(false);
      return;
    }

    const { data: perfil, error: perfilErr } = await supabase
      .from('tbl_perfiles_usuarios')
      .select('id_usuario, nombre_completo, email, rol, sucursal_asignada, activo')
      .eq('id_usuario', data.user.id)
      .single();

    if (perfilErr || !perfil || !ROLES_ERP_PERMITIDOS.includes(perfil.rol)) {
      await supabase.auth.signOut();
      setError('Acceso denegado: Esta cuenta no tiene permisos de colaborador de SIGE Candy.');
      setCargando(false);
      return;
    }

    if (perfil.activo === false) {
      await supabase.auth.signOut();
      setError('Tu cuenta ha sido dada de baja. Contacta a Dirección / Administración.');
      setCargando(false);
      return;
    }

    entrarConPerfil({
      id_usuario: perfil.id_usuario,
      rol: perfil.rol,
      nombre: perfil.nombre_completo || data.user.email,
      correo: perfil.email || data.user.email,
      sucursal_asignada: perfil.sucursal_asignada || null,
      modo: 'auth'
    });
  }

  async function enviarRecuperacionPassword(e) {
    e.preventDefault();
    setError('');
    setCargando(true);

    const { error: resetErr } = await supabase.auth.resetPasswordForEmail(
      correoRecuperacion.trim().toLowerCase(),
      {
        redirectTo: `${window.location.origin}/login?modo=recuperar`
      }
    );

    setCargando(false);

    if (resetErr) {
      const msg = String(resetErr.message || '').toLowerCase();
      if (msg.includes('rate limit') || resetErr.status === 429) {
        setError('Demasiados intentos seguidos. Espera 60 segundos antes de solicitar otro correo.');
      } else {
        setError(resetErr.message || 'No se pudo enviar el correo de recuperación.');
      }
      return;
    }

    setVista('recuperar_exito');
  }

  async function guardarNuevaPassword(e) {
    e.preventDefault();
    setError('');

    if (nuevaPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (nuevaPassword !== confirmarPassword) {
      setError('Las contraseñas no coinciden. Verifica ambos campos.');
      return;
    }

    setCargando(true);

    const { error: updateErr } = await supabase.auth.updateUser({
      password: nuevaPassword
    });

    if (updateErr) {
      const msg = String(updateErr.message || '').toLowerCase();
      if (msg.includes('different from the old')) {
        setError('La nueva contraseña debe ser distinta a la que tenías anteriormente.');
      } else {
        setError(updateErr.message || 'No se pudo guardar la contraseña.');
      }
      setCargando(false);
      return;
    }

    localStorage.removeItem('candy_erp_sesion');
    await supabase.auth.signOut();

    setNuevaPassword('');
    setConfirmarPassword('');
    setCargando(false);
    setVista('password_actualizada');
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
              <span className="erp-sidebar__tag">SIGE Candy</span>
            </div>

            <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 6 }}>
              Sistema Integral de Gestión Empresarial (SIGE Candy)
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

        {/* PANEL DERECHO: FORMULARIOS */}
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
                  Ingresa tus credenciales de colaborador para acceder a SIGE Candy.
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
                  <span>{cargando ? 'Validando credenciales...' : 'Acceder a SIGE Candy'}</span>
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
                Ingresa tu correo registrado en SIGE Candy para enviarte el enlace seguro de restablecimiento. Abre el enlace en este mismo navegador.
              </p>

              {error && (
                <div style={{ background: '#FDECE8', border: '1px solid #F7C5B8', color: '#C8320A', padding: '10px 12px', borderRadius: 8, fontSize: 12.5, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ErpIcon name="alert" size={16} />
                  <span>{error}</span>
                </div>
              )}

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
                  <span>{cargando ? 'Enviando enlace...' : 'Enviar enlace de recuperación'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setVista('login');
                  }}
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
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Correo enviado</h2>
              <p style={{ fontSize: 13, color: 'var(--texto-2)', lineHeight: 1.6, marginBottom: 20 }}>
                Si <b>{correoRecuperacion}</b> está registrado, recibirás un correo de <b>Dulcerías Candy</b> con el enlace para crear una nueva contraseña.
              </p>
              <button
                type="button"
                onClick={() => setVista('login')}
                className="erp-btn erp-btn--primario"
                style={{ width: '100%' }}
              >
                Regresar al inicio de sesión
              </button>
            </div>
          )}

          {vista === 'validando_enlace' && (
            <div key="validando-link" className="erp-anim-1" style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(59, 13, 84, 0.1)', color: 'var(--uva)', display: 'grid', placeItems: 'center', margin: '0 auto 14px' }}>
                <ErpIcon name="lock" size={22} />
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Validando enlace seguro...</h2>
              <p style={{ fontSize: 13, color: 'var(--texto-2)' }}>
                Verificando tu correo con los servidores de SIGE Candy.
              </p>
            </div>
          )}

          {vista === 'nueva_password' && (
            <div key="nueva-password-form" className="erp-anim-1">
              <span className="erp-badge erp-badge--verde" style={{ marginBottom: 10 }}>
                <ErpIcon name="shield" size={13} />
                <span>{esActivacionCuenta ? 'Correo verificado · Activación' : 'Enlace verificado'}</span>
              </span>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--texto)', marginBottom: 6 }}>
                {esActivacionCuenta ? 'Activa tu cuenta en SIGE Candy' : 'Crear nueva contraseña'}
              </h1>
              <p style={{ fontSize: 13, color: 'var(--texto-2)', marginBottom: 20, lineHeight: 1.55 }}>
                {esActivacionCuenta
                  ? 'Tu correo ya fue confirmado. Define tu contraseña personal para empezar a usar SIGE Candy (mínimo 6 caracteres).'
                  : 'Ingresa y confirma tu nueva contraseña de acceso a SIGE Candy (mínimo 6 caracteres).'}
              </p>

              {error && (
                <div style={{ background: '#FDECE8', border: '1px solid #F7C5B8', color: '#C8320A', padding: '10px 12px', borderRadius: 8, fontSize: 12.5, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ErpIcon name="alert" size={16} />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={guardarNuevaPassword} style={{ display: 'grid', gap: 15 }}>
                <div>
                  <label className="erp-label">Nueva contraseña *</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={verNuevaPass ? 'text' : 'password'}
                      required
                      minLength={6}
                      className="erp-input"
                      style={{ paddingLeft: 36, paddingRight: 38 }}
                      placeholder="Mínimo 6 caracteres"
                      value={nuevaPassword}
                      onChange={e => setNuevaPassword(e.target.value)}
                    />
                    <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--tenue)' }}>
                      <ErpIcon name="lock" size={16} />
                    </span>
                    <button
                      type="button"
                      onClick={() => setVerNuevaPass(!verNuevaPass)}
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
                      <ErpIcon name={verNuevaPass ? 'eye-off' : 'eye'} size={16} />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="erp-label">Confirmar contraseña *</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={verNuevaPass ? 'text' : 'password'}
                      required
                      minLength={6}
                      className="erp-input"
                      style={{ paddingLeft: 36 }}
                      placeholder="Repite tu contraseña"
                      value={confirmarPassword}
                      onChange={e => setConfirmarPassword(e.target.value)}
                    />
                    <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--tenue)' }}>
                      <ErpIcon name="lock" size={16} />
                    </span>
                  </div>
                </div>

                <button type="submit" disabled={cargando} className="erp-btn erp-btn--primario" style={{ width: '100%' }}>
                  <ErpIcon name="check" size={16} />
                  <span>
                    {cargando
                      ? 'Guardando...'
                      : esActivacionCuenta
                      ? 'Activar cuenta y guardar contraseña'
                      : 'Guardar nueva contraseña'}
                  </span>
                </button>
              </form>
            </div>
          )}

          {vista === 'password_actualizada' && (
            <div key="pass-ok" className="erp-anim-1" style={{ textAlign: 'center', padding: '12px 0' }}>
              <div style={{ width: 52, height: 52, borderRadius: 12, background: '#E8F7EF', color: '#007A3B', display: 'grid', placeItems: 'center', margin: '0 auto 14px', border: '1px solid #BFEAD2' }}>
                <ErpIcon name="check" size={24} />
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>
                {esActivacionCuenta ? '¡Cuenta activada!' : '¡Contraseña actualizada!'}
              </h2>
              <p style={{ fontSize: 13, color: 'var(--texto-2)', lineHeight: 1.6, marginBottom: 20 }}>
                {esActivacionCuenta
                  ? 'Tu correo quedó validado y tu contraseña está lista. Ya puedes iniciar sesión en SIGE Candy.'
                  : 'Tu contraseña se guardó correctamente. Ya puedes ingresar a SIGE Candy con tus nuevas credenciales.'}
              </p>
              <button
                type="button"
                onClick={() => {
                  setError('');
                  setEsActivacionCuenta(false);
                  setVista('login');
                }}
                className="erp-btn erp-btn--primario"
                style={{ width: '100%' }}
              >
                Iniciar sesión ahora
              </button>
            </div>
          )}

          {vista === 'correo_confirmado' && (
            <div key="email-ok" className="erp-anim-1" style={{ textAlign: 'center', padding: '12px 0' }}>
              <div style={{ width: 52, height: 52, borderRadius: 12, background: '#E8F7EF', color: '#007A3B', display: 'grid', placeItems: 'center', margin: '0 auto 14px', border: '1px solid #BFEAD2' }}>
                <ErpIcon name="mail" size={24} />
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>¡Nuevo correo confirmado!</h2>
              <p style={{ fontSize: 13, color: 'var(--texto-2)', lineHeight: 1.6, marginBottom: 20 }}>
                Tu dirección de correo electrónico ha sido validada y actualizada en SIGE Candy. Inicia sesión usando tu nuevo correo.
              </p>
              <button
                type="button"
                onClick={() => {
                  setError('');
                  setVista('login');
                }}
                className="erp-btn erp-btn--primario"
                style={{ width: '100%' }}
              >
                Ir a iniciar sesión
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