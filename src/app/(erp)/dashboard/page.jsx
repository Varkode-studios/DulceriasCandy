'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import ErpIcon from '@/components/erp/ErpIcon';

const MATRIZ_MODULOS = [
  {
    codigo: 'CUS_02',
    nombre: 'Catálogo, Precios y Banners',
    area: 'Comercial y Marketing',
    responsable: 'Dirección / Admin',
    icono: 'tag',
    color: '#EC008C',
    ruta: '/catalogo-admin',
    regla: 'RN_S01 · Tope 20 pzas y Mayoreo −5%',
    roles: ['admin']
  },
  {
    codigo: 'CUS_03',
    nombre: 'Almacén Nodo 2 Norte y Lotes PEPS',
    area: 'Control de Inventario',
    responsable: 'Jefatura Almacén',
    icono: 'box',
    color: '#F7941D',
    ruta: '/almacen-peps',
    regla: 'OB_02 · Rotación por fecha de caducidad',
    roles: ['admin', 'almacen_2norte']
  },
  {
    codigo: 'CUS_05',
    nombre: 'Surtido (Picking) y Corte 4:30 PM',
    area: 'Operaciones y Despacho',
    responsable: 'Almacén 2 Norte',
    icono: 'clipboard',
    color: '#00A650',
    ruta: '/surtido-picking',
    regla: 'RN_S12 · Enrutamiento horario 16:30 hrs',
    roles: ['admin', 'almacen_2norte']
  },
  {
    codigo: 'CUS_06',
    nombre: 'Logística Click & Collect y Validador QR',
    area: 'Sucursales Puebla',
    responsable: 'Cajero Sucursal',
    icono: 'qrcode',
    color: '#0085CA',
    ruta: '/entrega-qr',
    regla: 'OB_01 · Envío $0.00 y Liberación QR',
    roles: ['admin', 'cajero_sucursal']
  },
  {
    codigo: 'CUS_07',
    nombre: 'CRM Mayoristas y Garantías 24h',
    area: 'Atención y Posventa',
    responsable: 'Ejecutivo CRM',
    icono: 'users',
    color: '#3C1053',
    ruta: '/crm-cotizaciones',
    regla: 'RN_S14 · Candado estricto 24 horas',
    roles: ['admin', 'asesor_crm']
  }
];

const CARGO_POR_ROL = {
  admin: 'Dirección General y Administración ERP',
  almacen_2norte: 'Jefatura de Almacén y Control PEPS · Nodo 2 Norte',
  cajero_sucursal: 'Operación de Caja y Entrega Click & Collect',
  asesor_crm: 'Ejecutivo Comercial Mayorista y Garantías'
};

export default function DashboardErpPage() {
  const supabase = createClient();

  const [usuario, setUsuario] = useState({
    nombre: 'Administrador General',
    rol: 'admin',
    correo: ''
  });

  const [reloj, setReloj] = useState({
    horasMinutos: '--:--',
    segundos: '--',
    fechaTexto: 'Cargando fecha...',
    saludo: 'Bienvenido',
    antesDeCorte: true,
    detalleCorte: ''
  });

  const [kpis, setKpis] = useState({
    totalProductos: 0,
    agotados: 0,
    lotesActivos: 0,
    ordenesPendientes: 0,
    bannersActivos: 0,
    modulosExtra: []
  });

  useEffect(() => {
    try {
      const guardada = localStorage.getItem('candy_erp_sesion');
      if (guardada) {
        setUsuario(JSON.parse(guardada));
      }
    } catch (_) {}

    const actualizarReloj = () => {
      const ahora = new Date();

      const partesHora = new Intl.DateTimeFormat('es-MX', {
        timeZone: 'America/Mexico_City',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).format(ahora).split(':');

      const h = Number(partesHora[0]);
      const m = Number(partesHora[1]);
      const s = partesHora[2] || '00';

      let saludo = 'Buenas noches';
      if (h >= 5 && h < 12) saludo = 'Buenos días';
      else if (h >= 12 && h < 19) saludo = 'Buenas tardes';

      const minutosActuales = h * 60 + m;
      const minutosCorte = 16 * 60 + 30;
      const antesDeCorte = minutosActuales <= minutosCorte;

      let detalleCorte = '';
      if (antesDeCorte) {
        const diff = minutosCorte - minutosActuales;
        const hrsRest = Math.floor(diff / 60);
        const minRest = diff % 60;
        detalleCorte = `Faltan ${hrsRest}h ${minRest}m para el corte de las 4:30 PM`;
      } else {
        detalleCorte = 'Corte 4:30 PM finalizado · Turno Siguiente';
      }

      const fechaTexto = new Intl.DateTimeFormat('es-MX', {
        timeZone: 'America/Mexico_City',
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }).format(ahora);

      setReloj({
        horasMinutos: `${partesHora[0]}:${partesHora[1]}`,
        segundos: s,
        fechaTexto,
        saludo,
        antesDeCorte,
        detalleCorte
      });
    };

    actualizarReloj();
    const timer = setInterval(actualizarReloj, 1000);
    cargarMetricas();

    return () => clearInterval(timer);
  }, []);

  async function cargarMetricas() {
    const [
      { data: prods },
      { data: lotes },
      { data: ordenes },
      { data: banners },
      { data: modulos }
    ] = await Promise.all([
      supabase.from('tbl_productos').select('id_producto, stock_web'),
      supabase.from('tbl_lotes_peps').select('id_lote').eq('estado', 'Activo_en_Rotacion_PEPS'),
      supabase.from('tbl_ordenes_compra').select('id_orden, estado'),
      supabase.from('tbl_promociones_banners').select('id_promocion').eq('estado', 'Activo'),
      supabase.from('tbl_modulos_erp').select('*').eq('activo', true)
    ]);

    setKpis({
      totalProductos: prods?.length || 0,
      agotados: prods?.filter(p => Number(p.stock_web) <= 0).length || 0,
      lotesActivos: lotes?.length || 0,
      ordenesPendientes: ordenes?.filter(o => o.estado !== 'Entregado' && o.estado !== 'Cancelado').length || 0,
      bannersActivos: banners?.length || 0,
      modulosExtra: modulos || []
    });
  }

  const modulosDelPerfil = MATRIZ_MODULOS.filter(m => m.roles.includes(usuario.rol));

  return (
    <div>
      {/* ══════════ BANNER DE BIENVENIDA EN 3 COLUMNAS (SIN RECUADRO EN EL LOGO) ══════════ */}
      <section className="erp-welcome-hero erp-anim-1">
        {/* Columna 1: Logo proporcional libre sin recuadro */}
        <div className="erp-welcome-logo-box">
          <img
            src="/img/LOGO CANDY.png"
            alt="Dulcerías Candy"
            style={{ height: '105px', width: 'auto', maxWidth: '195px', objectFit: 'contain' }}
            onError={e => { e.currentTarget.src = '/img/ICONO.png'; }}
          />
        </div>

        {/* Columna 2: Saludo dinámico personalizado */}
        <div className="erp-welcome-info">
          <div className="erp-welcome-saludo">
            <ErpIcon name="shield" size={14} />
            <span>{CARGO_POR_ROL[usuario.rol] || 'Colaborador Autorizado'}</span>
          </div>

          <h1 className="erp-welcome-nombre">
            ¡{reloj.saludo}, <span>{usuario.nombre}</span>!
          </h1>

          <p style={{ fontSize: 14, color: 'rgba(237, 231, 242, 0.84)', maxWidth: '58ch', lineHeight: 1.55 }}>
            Bienvenido al Sistema de Planificación de Recursos (Mini-ERP) de <b>Dulcerías Candy</b>.
            Tienes <b>{modulosDelPerfil.length} módulos operativos</b> habilitados en tu sesión actual.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 18 }}>
            {modulosDelPerfil[0] && (
              <Link href={modulosDelPerfil[0].ruta} className="erp-btn erp-btn--primario">
                <span>Ir a {modulosDelPerfil[0].nombre}</span>
                <ErpIcon name="arrow-right" size={15} />
              </Link>
            )}
            <button
              onClick={cargarMetricas}
              className="erp-btn"
              style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}
            >
              <ErpIcon name="refresh" size={15} />
              <span>Sincronizar panel</span>
            </button>
          </div>
        </div>

        {/* Columna 3: Reloj Digital Corporativo en Tiempo Real */}
        <div className="erp-welcome-clock">
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--amarillo)', marginBottom: 6 }}>
            Hora Oficial · Puebla, Méx.
          </div>

          <div className="erp-welcome-clock__hora">
            <span>{reloj.horasMinutos}</span>
            <span className="erp-welcome-clock__seg">:{reloj.segundos}</span>
          </div>

          <div className="erp-welcome-clock__fecha">
            {reloj.fechaTexto}
          </div>

          <div
            className="erp-welcome-clock__corte"
            style={{ color: reloj.antesDeCorte ? '#6EE7B7' : '#FDE047' }}
          >
            <span className="erp-badge__dot" />
            <ErpIcon name="clock" size={13} />
            <span>{reloj.detalleCorte}</span>
          </div>
        </div>
      </section>

      {/* ══════════ FILA DE 4 INDICADORES KPI GLOBALES ══════════ */}
      <div className="erp-kpi-grid erp-anim-2">
        <div className="erp-kpi" style={{ '--c': '#EC008C' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--texto-2)', fontWeight: 600 }}>SKUs Activos en Catálogo</span>
            <span className="erp-kpi__ico" style={{ '--c': '#EC008C' }}>
              <ErpIcon name="tag" size={18} />
            </span>
          </div>
          <div className="erp-kpi__valor">{kpis.totalProductos}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--verde)', fontWeight: 600 }}>
            <ErpIcon name="check" size={14} />
            <span>Sincronizados con tienda en línea</span>
          </div>
        </div>

        <div className="erp-kpi" style={{ '--c': '#F04E23' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--texto-2)', fontWeight: 600 }}>SKUs con Stock Cero</span>
            <span className="erp-kpi__ico" style={{ '--c': '#F04E23' }}>
              <ErpIcon name="alert" size={18} />
            </span>
          </div>
          <div className="erp-kpi__valor">{kpis.agotados}</div>
          <span style={{ fontSize: 12, color: 'var(--texto-2)' }}>Candado automático RN_S03 activo</span>
        </div>

        <div className="erp-kpi" style={{ '--c': '#00A650' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--texto-2)', fontWeight: 600 }}>Lotes PEPS en Rotación</span>
            <span className="erp-kpi__ico" style={{ '--c': '#00A650' }}>
              <ErpIcon name="box" size={18} />
            </span>
          </div>
          <div className="erp-kpi__valor">{kpis.lotesActivos}</div>
          <span style={{ fontSize: 12, color: 'var(--texto-2)' }}>Trazabilidad por caducidad en 2 Norte</span>
        </div>

        <div className="erp-kpi" style={{ '--c': '#3C1053' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--texto-2)', fontWeight: 600 }}>Órdenes en Proceso</span>
            <span className="erp-kpi__ico" style={{ '--c': '#3C1053' }}>
              <ErpIcon name="clipboard" size={18} />
            </span>
          </div>
          <div className="erp-kpi__valor">{kpis.ordenesPendientes}</div>
          <span style={{ fontSize: 12, color: 'var(--texto-2)' }}>Sujetas a corte operativo 16:30 hrs</span>
        </div>
      </div>

      {/* ══════════ COLUMNAS OPERATIVAS ══════════ */}
      <div
        className="erp-anim-3"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
          gap: 20,
          alignItems: 'start'
        }}
      >
        <div className="erp-tabla-wrap">
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--linea)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--texto)' }}>
                Mis Módulos Habilitados ({usuario.nombre})
              </h2>
              <p style={{ fontSize: 12, color: 'var(--texto-2)' }}>
                Accesos autorizados para tu perfil de {CARGO_POR_ROL[usuario.rol] || usuario.rol}
              </p>
            </div>
            <span className="erp-badge erp-badge--verde">{modulosDelPerfil.length} Habilitados</span>
          </div>

          <table className="erp-tabla">
            <thead>
              <tr>
                <th>Módulo</th>
                <th>Área y Regla Operativa</th>
                <th style={{ textAlign: 'right' }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {modulosDelPerfil.map(m => (
                <tr key={m.codigo}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 8,
                          background: `color-mix(in srgb, ${m.color} 10%, #fff)`,
                          color: m.color,
                          display: 'grid',
                          placeItems: 'center',
                          border: `1px solid color-mix(in srgb, ${m.color} 22%, #fff)`
                        }}
                      >
                        <ErpIcon name={m.icono} size={17} />
                      </div>
                      <div>
                        <b style={{ display: 'block', fontSize: 13 }}>{m.nombre}</b>
                        <span style={{ fontSize: 11, color: 'var(--tenue)', fontFamily: 'monospace' }}>{m.codigo}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span style={{ display: 'block', fontWeight: 600, fontSize: 12.5 }}>{m.area}</span>
                    <small style={{ fontSize: 11.5, color: 'var(--texto-2)' }}>{m.regla}</small>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <Link href={m.ruta} className="erp-btn erp-btn--secundario" style={{ padding: '6px 12px', fontSize: 12 }}>
                      <span>Entrar</span>
                      <ErpIcon name="arrow-right" size={13} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'grid', gap: 20 }}>
          <div className="erp-card" style={{ margin: 0 }}>
            <div className="erp-card__header">
              <div className="erp-card__title">
                <ErpIcon name="folder" size={17} style={{ color: 'var(--uva)' }} />
                <span>Áreas y Módulos Dinámicos ({kpis.modulosExtra.length})</span>
              </div>
              <span className="erp-badge erp-badge--marca">Escalabilidad ERP</span>
            </div>

            {kpis.modulosExtra.length === 0 ? (
              <p style={{ fontSize: 12.5, color: 'var(--texto-2)' }}>
                Usa el botón <b>"+ Nueva Área / Módulo"</b> del menú lateral para crear departamentos personalizados.
              </p>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {kpis.modulosExtra.map(m => (
                  <Link
                    key={m.id_modulo}
                    href={`/modulo/${m.slug}`}
                    className="erp-card erp-card--interactiva"
                    style={{ margin: 0, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div className="erp-kpi__ico" style={{ '--c': '#3C1053' }}>
                        <ErpIcon name="truck" size={17} />
                      </div>
                      <div>
                        <b style={{ fontSize: 13.5, display: 'block' }}>{m.nombre_modulo}</b>
                        <small style={{ fontSize: 11.5, color: 'var(--texto-2)' }}>
                          {m.area_departamento} · {m.descripcion}
                        </small>
                      </div>
                    </div>
                    <ErpIcon name="arrow-right" size={16} style={{ color: 'var(--tenue)' }} />
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="erp-card" style={{ margin: 0 }}>
            <div className="erp-card__header">
              <div className="erp-card__title">
                <ErpIcon name="shield" size={17} style={{ color: 'var(--verde)' }} />
                <span>Estado de Sincronización con Supabase</span>
              </div>
            </div>

            <div style={{ display: 'grid', gap: 10, fontSize: 12.5 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid var(--linea)' }}>
                <span style={{ color: 'var(--texto-2)' }}>Trigger Rotación PEPS → Stock Web</span>
                <span className="erp-badge erp-badge--verde">En línea</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid var(--linea)' }}>
                <span style={{ color: 'var(--texto-2)' }}>Trigger Corte 4:30 PM (RN_S12)</span>
                <span className="erp-badge erp-badge--verde">En línea</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--texto-2)' }}>Banners Promocionales Activos</span>
                <b>{kpis.bannersActivos} publicados</b>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}