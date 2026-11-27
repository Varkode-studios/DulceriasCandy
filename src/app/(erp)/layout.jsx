'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import ErpIcon from '@/components/erp/ErpIcon';

const MODULOS_FIJOS = [
  { href: '/dashboard', nombre: 'Panel Ejecutivo', icono: 'dashboard', roles: ['admin', 'almacen_2norte', 'cajero_sucursal', 'asesor_crm'] },
  { href: '/catalogo-admin', nombre: 'Catálogo y Precios', icono: 'tag', roles: ['admin'] },
  { href: '/almacen-peps', nombre: 'Almacén 2 Norte', icono: 'box', roles: ['admin', 'almacen_2norte'] },
  { href: '/surtido-picking', nombre: 'Surtido y Corte 4:30', icono: 'clipboard', roles: ['admin', 'almacen_2norte'] },
  { href: '/entrega-qr', nombre: 'Recepción y Entrega QR', icono: 'qrcode', roles: ['admin', 'cajero_sucursal'] },
  { href: '/crm-cotizaciones', nombre: 'CRM y Garantías 24h', icono: 'users', roles: ['admin', 'asesor_crm'] },
  { href: '/usuarios-admin', nombre: 'Usuarios y Accesos', icono: 'shield', roles: ['admin'] }
];

const ETIQUETA_ROL = {
  admin: 'Dirección / Administrador',
  almacen_2norte: 'Jefe de Almacén 2 Norte',
  cajero_sucursal: 'Operador Punto de Venta',
  asesor_crm: 'Ejecutivo Comercial CRM'
};

const ICONOS_DISPONIBLES = [
  { id: 'truck', label: 'Logística / Proveedores' },
  { id: 'building', label: 'Sucursales / Corporativo' },
  { id: 'folder', label: 'Archivo / Documentación' },
  { id: 'shield', label: 'Auditoría / Calidad' },
  { id: 'box', label: 'Inventario / Insumos' },
  { id: 'users', label: 'Personal / Recursos Humanos' }
];

export default function ErpLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const [usuario, setUsuario] = useState(null);
  const [modulosDinamicos, setModulosDinamicos] = useState([]);
  const [horaPuebla, setHoraPuebla] = useState('');
  const [antesDeCorte, setAntesDeCorte] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);

  const [nuevoModulo, setNuevoModulo] = useState({
    nombre_modulo: '',
    area_departamento: 'Operaciones',
    icono: 'truck',
    descripcion: '',
    campos_texto: 'Empresa, Responsable, Teléfono, Estatus'
  });

  useEffect(() => {
    const actualizarReloj = () => {
      const ahora = new Date();
      const formato = new Intl.DateTimeFormat('es-MX', {
        timeZone: 'America/Mexico_City',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).format(ahora);
      setHoraPuebla(formato);
      setAntesDeCorte(formato <= '16:30:00');
    };
    actualizarReloj();
    const timer = setInterval(actualizarReloj, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (pathname === '/login') return;

    const sesionGuardada = localStorage.getItem('candy_erp_sesion');
    if (!sesionGuardada) {
      router.push('/login');
      return;
    }
    try {
      setUsuario(JSON.parse(sesionGuardada));
    } catch {
      router.push('/login');
    }

    cargarModulosDinamicos();

    const canal = supabase
      .channel('menu-modulos-erp')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tbl_modulos_erp' }, () => {
        cargarModulosDinamicos();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [pathname]);

  async function cargarModulosDinamicos() {
    const { data } = await supabase
      .from('tbl_modulos_erp')
      .select('*')
      .eq('activo', true)
      .order('id_modulo');
    if (data) setModulosDinamicos(data);
  }

  async function crearModuloDinamico(e) {
    e.preventDefault();
    const slug = nuevoModulo.nombre_modulo
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const listaCampos = nuevoModulo.campos_texto
      .split(',')
      .map(c => c.trim())
      .filter(Boolean);

    const { error } = await supabase.from('tbl_modulos_erp').insert([{
      nombre_modulo: nuevoModulo.nombre_modulo,
      slug,
      area_departamento: nuevoModulo.area_departamento,
      icono: nuevoModulo.icono || 'folder',
      descripcion: nuevoModulo.descripcion,
      roles_permitidos: ['admin', 'almacen_2norte', 'cajero_sucursal', 'asesor_crm'],
      campos_json: listaCampos.length > 0 ? listaCampos : ['Concepto', 'Detalle']
    }]);

    if (!error) {
      setModalAbierto(false);
      setNuevoModulo({
        nombre_modulo: '',
        area_departamento: 'Operaciones',
        icono: 'truck',
        descripcion: '',
        campos_texto: 'Empresa, Responsable, Teléfono, Estatus'
      });
      await cargarModulosDinamicos();
      router.push(`/modulo/${slug}`);
    } else {
      alert('Error al crear el módulo: ' + error.message);
    }
  }

  function cerrarSesion() {
    localStorage.removeItem('candy_erp_sesion');
    supabase.auth.signOut();
    router.push('/login');
  }

  if (pathname === '/login') {
    return <>{children}</>;
  }

  if (!usuario) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--fondo)', fontSize: 13.5, color: 'var(--texto-2)' }}>
        Cargando entorno corporativo Mini-ERP...
      </div>
    );
  }

  const modulosPermitidos = MODULOS_FIJOS.filter(m => m.roles.includes(usuario.rol));
  const moduloActual = MODULOS_FIJOS.find(m => m.href === pathname);

  return (
    <div className="erp-shell">
      <aside className="erp-sidebar">
        <div className="erp-sidebar__brand">
          <img src="/img/LOGO CANDY.png" alt="Dulcerías Candy" onError={e => { e.currentTarget.src = '/img/ICONO.png'; }} />
          <div>
            <span className="erp-sidebar__tag">ERP Corporativo</span>
            <p style={{ fontSize: 11.5, marginTop: 3, color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>
              Sucursal 2 Norte
            </p>
          </div>
        </div>

        <p className="erp-nav__grupo">Operación Principal</p>
        <nav>
          {modulosPermitidos.map(m => {
            const activo = pathname === m.href;
            return (
              <Link
                key={m.href}
                href={m.href}
                className={`erp-nav__link ${activo ? 'erp-nav__link--activo' : ''}`}
              >
                <ErpIcon name={m.icono} size={17} />
                <span style={{ flex: 1 }}>{m.nombre}</span>
              </Link>
            );
          })}
        </nav>

        <p className="erp-nav__grupo">Áreas Personalizadas</p>
        <nav style={{ flex: 1 }}>
          {modulosDinamicos.map(mod => {
            const ruta = `/modulo/${mod.slug}`;
            const activo = pathname === ruta;
            const nombreIcono = ['truck', 'building', 'folder', 'shield', 'box', 'users'].includes(mod.icono)
              ? mod.icono
              : 'folder';
            return (
              <Link
                key={mod.id_modulo}
                href={ruta}
                className={`erp-nav__link ${activo ? 'erp-nav__link--activo' : ''}`}
              >
                <ErpIcon name={nombreIcono} size={17} />
                <div style={{ flex: 1, lineHeight: 1.25 }}>
                  <div style={{ fontSize: 13 }}>{mod.nombre_modulo}</div>
                  <small style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.5)' }}>{mod.area_departamento}</small>
                </div>
              </Link>
            );
          })}

          {usuario.rol === 'admin' && (
            <button
              onClick={() => setModalAbierto(true)}
              className="erp-nav__link"
              style={{
                marginTop: 10,
                border: '1px dashed rgba(254, 221, 0, 0.35)',
                color: 'var(--amarillo)',
                fontWeight: 600
              }}
            >
              <ErpIcon name="plus" size={16} />
              <span>Nueva Área / Módulo</span>
            </button>
          )}
        </nav>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 12, marginTop: 12 }}>
          <a href="/" target="_blank" className="erp-nav__link" style={{ color: 'rgba(255,255,255,0.8)' }}>
            <ErpIcon name="store" size={16} />
            <span style={{ flex: 1 }}>Tienda en Línea</span>
            <ErpIcon name="external" size={13} style={{ opacity: 0.6 }} />
          </a>
          <button onClick={cerrarSesion} className="erp-nav__link" style={{ color: '#FF9494' }}>
            <ErpIcon name="logout" size={16} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <header className="erp-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <span style={{ color: 'var(--tenue)', fontWeight: 500 }}>Sistema ERP</span>
            <span style={{ color: 'var(--linea-2)' }}>/</span>
            <span style={{ fontWeight: 700, color: 'var(--texto)' }}>
              {moduloActual ? moduloActual.nombre : 'Módulo Operativo'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span className={`erp-badge ${antesDeCorte ? 'erp-badge--verde' : 'erp-badge--amarillo'}`}>
              <span className="erp-badge__dot" />
              <ErpIcon name="clock" size={13} />
              <span>
                Puebla {horaPuebla} · {antesDeCorte ? 'Surtido Inmediato (< 16:30)' : 'Turno Siguiente (> 16:30)'}
              </span>
            </span>

            <div style={{ height: 24, width: 1, background: 'var(--linea)' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ textAlign: 'right', lineHeight: 1.2 }}>
                <b style={{ fontSize: 13, display: 'block', color: 'var(--texto)' }}>{usuario.nombre}</b>
                <small style={{ fontSize: 11, color: 'var(--texto-2)', fontWeight: 600 }}>
                  {ETIQUETA_ROL[usuario.rol] || usuario.rol}
                </small>
              </div>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 8,
                  background: 'var(--uva)',
                  color: 'var(--amarillo)',
                  display: 'grid',
                  placeItems: 'center',
                  fontWeight: 700,
                  fontSize: 13
                }}
              >
                {usuario.nombre?.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        <main key={pathname} className="erp-main erp-page-transition">{children}</main>
      </div>

      {modalAbierto && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(24, 10, 34, 0.55)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'grid', placeItems: 'center', padding: 16 }}>
          <form onSubmit={crearModuloDinamico} className="erp-card erp-anim-1" style={{ width: 'min(520px, 100%)', margin: 0 }}>
            <div className="erp-card__header">
              <div className="erp-card__title">
                <ErpIcon name="plus" size={18} style={{ color: 'var(--marca)' }} />
                <span>Registrar Nueva Área o Módulo en el ERP</span>
              </div>
              <button type="button" onClick={() => setModalAbierto(false)} className="cerrar">✕</button>
            </div>

            <div style={{ display: 'grid', gap: 14 }}>
              <div>
                <label className="erp-label">Nombre del Módulo *</label>
                <input
                  required
                  className="erp-input"
                  placeholder="Nombre del departamento o módulo"
                  value={nuevoModulo.nombre_modulo}
                  onChange={e => setNuevoModulo({ ...nuevoModulo, nombre_modulo: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="erp-label">Departamento / Área *</label>
                  <input
                    required
                    className="erp-input"
                    placeholder="Área operativa responsable"
                    value={nuevoModulo.area_departamento}
                    onChange={e => setNuevoModulo({ ...nuevoModulo, area_departamento: e.target.value })}
                  />
                </div>
                <div>
                  <label className="erp-label">Ícono Corporativo</label>
                  <select
                    className="erp-select"
                    value={nuevoModulo.icono}
                    onChange={e => setNuevoModulo({ ...nuevoModulo, icono: e.target.value })}
                  >
                    {ICONOS_DISPONIBLES.map(ic => (
                      <option key={ic.id} value={ic.id}>{ic.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="erp-label">Objetivo operativo del módulo</label>
                <input
                  className="erp-input"
                  placeholder="Descripción breve de las funciones del área"
                  value={nuevoModulo.descripcion}
                  onChange={e => setNuevoModulo({ ...nuevoModulo, descripcion: e.target.value })}
                />
              </div>

              <div>
                <label className="erp-label">Campos de captura (separados por coma) *</label>
                <input
                  required
                  className="erp-input"
                  value={nuevoModulo.campos_texto}
                  onChange={e => setNuevoModulo({ ...nuevoModulo, campos_texto: e.target.value })}
                />
                <small style={{ fontSize: 11.5, color: 'var(--tenue)', display: 'block', marginTop: 4 }}>
                  Se generará la estructura de tabla y formulario automáticamente en la base de datos.
                </small>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22, paddingTop: 14, borderTop: '1px solid var(--linea)' }}>
              <button type="button" onClick={() => setModalAbierto(false)} className="erp-btn erp-btn--secundario">
                Cancelar
              </button>
              <button type="submit" className="erp-btn erp-btn--primario">
                <ErpIcon name="check" size={16} />
                <span>Crear Módulo</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}