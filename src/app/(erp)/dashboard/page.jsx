'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import ErpIcon from '@/components/erp/ErpIcon';

const MATRIZ_MODULOS = [
  {
    codigo: 'CUS_02',
    nombre: 'Catálogo, Precios y Banners',
    area: 'Comercial y Marketing',
    icono: 'tag',
    color: '#EC008C',
    ruta: '/catalogo-admin',
    regla: 'Tope 20 pzas y Mayoreo −5%',
    roles: ['admin']
  },
  {
    codigo: 'CUS_03',
    nombre: 'Almacén 2 Norte y Lotes PEPS',
    area: 'Control de Inventario',
    icono: 'box',
    color: '#F7941D',
    ruta: '/almacen-peps',
    regla: 'Rotación por fecha de caducidad',
    roles: ['admin', 'almacen_2norte']
  },
  {
    codigo: 'CUS_05',
    nombre: 'Surtido (Picking) y Corte 4:30',
    area: 'Operaciones y Despacho',
    icono: 'clipboard',
    color: '#00A650',
    ruta: '/surtido-picking',
    regla: 'Enrutamiento horario 16:30 hrs',
    roles: ['admin', 'almacen_2norte']
  },
  {
    codigo: 'CUS_06',
    nombre: 'Click & Collect y Validador QR',
    area: 'Sucursales Puebla',
    icono: 'qrcode',
    color: '#0085CA',
    ruta: '/entrega-qr',
    regla: 'Envío $0.00 y Liberación QR',
    roles: ['admin', 'cajero_sucursal']
  },
  {
    codigo: 'CUS_07',
    nombre: 'CRM Mayoristas y Garantías 24h',
    area: 'Atención y Posventa',
    icono: 'users',
    color: '#3C1053',
    ruta: '/crm-cotizaciones',
    regla: 'Candado estricto 24 horas',
    roles: ['admin', 'asesor_crm']
  }
];

const CARGO_POR_ROL = {
  admin: 'Dirección General y Administración · SIGE Candy',
  almacen_2norte: 'Jefatura de Almacén y Control PEPS · Nodo 2 Norte',
  cajero_sucursal: 'Operación de Caja y Entrega Click & Collect',
  asesor_crm: 'Ejecutivo Comercial Mayorista y Garantías'
};

const ETIQUETA_ROL_CORTO = {
  admin: 'Administrador',
  almacen_2norte: 'Almacén 2 Norte',
  cajero_sucursal: 'Cajero Sucursal',
  asesor_crm: 'Asesor CRM'
};

const ETIQUETA_ACCION = {
  INICIO_SESION: { texto: 'Inicio Sesión', clase: 'erp-badge--verde', grupo: 'accesos' },
  CIERRE_SESION: { texto: 'Cierre Sesión', clase: 'erp-badge--uva', grupo: 'accesos' },
  INTENTO_FALLIDO: { texto: 'Intento Fallido', clase: 'erp-badge--naranja', grupo: 'accesos' },
  GESTION_USUARIO: { texto: 'Usuario', clase: 'erp-badge--amarillo', grupo: 'accesos' },
  ALTA_PRODUCTO: { texto: 'Alta SKU', clase: 'erp-badge--verde', grupo: 'cambios' },
  EDICION_PRECIO_DATOS: { texto: 'Edición SKU', clase: 'erp-badge--uva', grupo: 'cambios' },
  DESCUENTO_MASIVO: { texto: 'Descuento', clase: 'erp-badge--marca', grupo: 'cambios' },
  IMPORTACION_EXCEL: { texto: 'Excel', clase: 'erp-badge--verde', grupo: 'cambios' },
  VISIBILIDAD_WEB: { texto: 'Web', clase: 'erp-badge--amarillo', grupo: 'cambios' },
  ELIMINACION_BORRADOR: { texto: 'Borrador Elim.', clase: 'erp-badge--naranja', grupo: 'cambios' },
  BAJA_LOGICA: { texto: 'Baja SKU', clase: 'erp-badge--naranja', grupo: 'cambios' },
  REACTIVACION: { texto: 'Reactivación', clase: 'erp-badge--verde', grupo: 'cambios' },
  EDICION_BANNER: { texto: 'Banner', clase: 'erp-badge--amarillo', grupo: 'cambios' },
  ELIMINACION_BANNER: { texto: 'Banner Elim.', clase: 'erp-badge--naranja', grupo: 'cambios' },
  ENTRADA_LOTE: { texto: 'Lote PEPS', clase: 'erp-badge--verde', grupo: 'cambios' }
};

function dineroMX(n) {
  return '$' + Number(n || 0).toLocaleString('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function dineroCompacto(n) {
  const num = Number(n || 0);
  if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `$${(num / 1000).toFixed(1)}k`;
  return `$${Math.round(num)}`;
}

function fechaClaveMX(input) {
  if (!input) return '';
  try {
    const d = input instanceof Date ? input : new Date(input);
    if (isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Mexico_City',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(d);
  } catch {
    return '';
  }
}

function etiquetaDiaCorto(fechaStr) {
  try {
    const d = new Date(`${fechaStr}T12:00:00-06:00`);
    const dia = new Intl.DateTimeFormat('es-MX', {
      timeZone: 'America/Mexico_City',
      weekday: 'short'
    }).format(d);
    const num = fechaStr.slice(8, 10);
    return `${dia.replace('.', '').slice(0, 3)} ${num}`;
  } catch {
    return fechaStr.slice(5);
  }
}

function tiempoRelativoCorto(isoStr) {
  if (!isoStr) return 'Sin registro';
  const fecha = new Date(isoStr);
  if (isNaN(fecha.getTime())) return 'Sin registro';

  const diffMin = Math.floor((Date.now() - fecha.getTime()) / 60000);
  if (diffMin < 1) return 'Ahora';
  if (diffMin < 60) return `Hace ${diffMin}m`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `Hace ${diffHrs}h`;

  return fecha.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function tieneFotoReal(prod) {
  const url = String(prod?.imagen_url || '').trim().toLowerCase();
  if (!url || url === 'img/icono.png' || url === '/img/icono.png') return false;
  return true;
}

export default function DashboardErpPage() {
  const supabase = useMemo(() => createClient(), []);

  const [usuario, setUsuario] = useState({
    id_usuario: null,
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
    detalleCorte: '',
    progresoCorte: 0
  });

  const [sincronizando, setSincronizando] = useState(false);
  const [ultimaSync, setUltimaSync] = useState('');

  // Estados interactivos del dashboard
  const [rangoGrafica, setRangoGrafica] = useState(7); // 7 | 14 días
  const [diaHover, setDiaHover] = useState(null);
  const [filtroPedidos, setFiltroPedidos] = useState('todos'); // todos | pendientes | pagados | sucursal
  const [pedidoExpandidoId, setPedidoExpandidoId] = useState(null);
  const [tabMonitor, setTabMonitor] = useState('actividad'); // actividad | personal
  const [filtroActividad, setFiltroActividad] = useState('todos'); // todos | accesos | cambios

  const [datos, setDatos] = useState({
    publicados: 0,
    borradores: 0,
    borradoresSinFoto: 0,
    publicadosAgotados: 0,
    lotesActivos: 0,
    lotesPorCaducar: 0,
    bannersActivos: 0,
    pedidosPendientes: 0,
    pedidosMismoDia: 0,
    pedidosHoy: 0,
    ventasHoy: 0,
    ventasAyer: 0,
    ventasMes: 0,
    ticketPromedioMes: 0,
    pedidosPagadosMes: 0,
    pedidosPendPagoMes: 0,
    entregasDomicilioMes: 0,
    entregasSucursalMes: 0,
    pedidosCrudos: [],
    serie14Dias: [],
    actividadReciente: [],
    intentosFallidos24h: 0,
    personalResumen: [],
    totalUsuariosActivos: 0,
    totalUsuariosInactivos: 0,
    modulosExtra: []
  });

  const cargarMetricas = useCallback(async (rolActual) => {
    setSincronizando(true);
    const esAdmin = rolActual === 'admin';
    const ahora = new Date();
    const hoyKey = fechaClaveMX(ahora);
    const ayerKey = fechaClaveMX(new Date(ahora.getTime() - 24 * 60 * 60 * 1000));
    const mesKey = hoyKey.slice(0, 7);

    try {
      const consultasBase = [
        supabase.from('tbl_productos').select('id_producto, activo, publicado_web, stock_web, imagen_url'),
        supabase.from('tbl_lotes_peps').select('*'),
        supabase.from('tbl_pedidos').select('*'),
        supabase.from('tbl_promociones_banners').select('id_promocion, estado').eq('estado', 'Activo'),
        supabase.from('tbl_modulos_erp').select('*').eq('activo', true)
      ];

      if (esAdmin) {
        consultasBase.push(
          supabase
            .from('tbl_bitacora_auditoria')
            .select('*')
            .order('fecha_registro', { ascending: false })
            .limit(120),
          supabase
            .from('tbl_perfiles_usuarios')
            .select('id_usuario, nombre_completo, email, rol, sucursal_asignada, activo')
            .order('nombre_completo')
        );
      }

      const resultados = await Promise.all(consultasBase);

      const prods = resultados[0]?.data || [];
      const lotes = resultados[1]?.data || [];
      const pedidos = resultados[2]?.data || [];
      const banners = resultados[3]?.data || [];
      const modulos = resultados[4]?.data || [];
      const bitacora = esAdmin ? resultados[5]?.data || [] : [];
      const perfiles = esAdmin ? resultados[6]?.data || [] : [];

      // 1. Catálogo segmentado
      const activos = prods.filter(p => p.activo !== false);
      const publicadosList = activos.filter(p => p.publicado_web !== false);
      const borradoresList = activos.filter(p => p.publicado_web === false);
      const borradoresSinFoto = borradoresList.filter(p => !tieneFotoReal(p)).length;
      const publicadosAgotados = publicadosList.filter(p => Number(p.stock_web || 0) <= 0).length;

      // 2. Lotes PEPS
      const lotesEnRotacion = lotes.filter(
        l =>
          l.estado === 'Activo_en_Rotacion_PEPS' ||
          l.estado === 'Activo' ||
          (l.estado == null && Number(l.cantidad_disponible ?? l.cantidad_actual ?? 1) > 0)
      );
      const en30Dias = Date.now() + 30 * 24 * 60 * 60 * 1000;
      const lotesPorCaducar = lotesEnRotacion.filter(l => {
        if (!l.fecha_caducidad) return false;
        const ts = new Date(l.fecha_caducidad).getTime();
        return !isNaN(ts) && ts <= en30Dias;
      }).length;

      // 3. Pedidos reales y serie diaria de 14 días
      const pedidosOrdenados = [...pedidos].sort((a, b) => {
        const fa = new Date(a.fecha_pedido || a.created_at || 0).getTime();
        const fb = new Date(b.fecha_pedido || b.created_at || 0).getTime();
        return fb - fa;
      });

      const pedidosValidos = pedidosOrdenados.filter(p => {
        const est = String(p.estado_pedido || '').toLowerCase();
        return est !== 'cancelado' && est !== 'rechazado';
      });

      const pedidosPendientesList = pedidosValidos.filter(p => {
        const est = String(p.estado_pedido || '').toLowerCase();
        return est !== 'entregado' && est !== 'completado';
      });

      const pedidosMismoDia = pedidosPendientesList.filter(p => p.turno_surtido === 'mismo_dia').length;
      const pedidosDeHoy = pedidosValidos.filter(p => fechaClaveMX(p.fecha_pedido || p.created_at) === hoyKey);
      const pedidosDeAyer = pedidosValidos.filter(p => fechaClaveMX(p.fecha_pedido || p.created_at) === ayerKey);
      const pedidosDelMes = pedidosValidos.filter(p => fechaClaveMX(p.fecha_pedido || p.created_at).startsWith(mesKey));

      const ventasHoy = pedidosDeHoy.reduce((acc, p) => acc + Number(p.total || 0), 0);
      const ventasAyer = pedidosDeAyer.reduce((acc, p) => acc + Number(p.total || 0), 0);
      const ventasMes = pedidosDelMes.reduce((acc, p) => acc + Number(p.total || 0), 0);
      const ticketPromedioMes = pedidosDelMes.length > 0 ? ventasMes / pedidosDelMes.length : 0;

      const pedidosPagadosMes = pedidosDelMes.filter(
        p => String(p.estado_pago || '').toLowerCase() === 'pagado'
      ).length;
      const pedidosPendPagoMes = pedidosDelMes.length - pedidosPagadosMes;
      const entregasDomicilioMes = pedidosDelMes.filter(
        p => String(p.tipo_entrega || '').toLowerCase() === 'domicilio'
      ).length;
      const entregasSucursalMes = pedidosDelMes.filter(
        p => String(p.tipo_entrega || '').toLowerCase() === 'sucursal'
      ).length;

      // Construir serie de los últimos 14 días
      const mapaPorDia = new Map();
      pedidosValidos.forEach(p => {
        const k = fechaClaveMX(p.fecha_pedido || p.created_at);
        if (!k) return;
        const actual = mapaPorDia.get(k) || { monto: 0, pedidos: 0 };
        actual.monto += Number(p.total || 0);
        actual.pedidos += 1;
        mapaPorDia.set(k, actual);
      });

      const serie14Dias = [];
      for (let i = 13; i >= 0; i--) {
        const d = new Date(ahora.getTime() - i * 24 * 60 * 60 * 1000);
        const key = fechaClaveMX(d);
        const info = mapaPorDia.get(key) || { monto: 0, pedidos: 0 };
        serie14Dias.push({
          fecha: key,
          etiqueta: etiquetaDiaCorto(key),
          esHoy: key === hoyKey,
          monto: Number(info.monto.toFixed(2)),
          pedidos: info.pedidos
        });
      }

      // 4. Bitácora y personal
      const hace24h = Date.now() - 24 * 60 * 60 * 1000;
      const intentosFallidos24h = bitacora.filter(
        r => r.tipo_accion === 'INTENTO_FALLIDO' && new Date(r.fecha_registro).getTime() >= hace24h
      ).length;

      const ultimoAccesoPorUsuario = new Map();
      bitacora.forEach(r => {
        if (r.tipo_accion !== 'INICIO_SESION') return;
        const idKey = r.usuario_id ? `id:${r.usuario_id}` : null;
        const mailKey = r.usuario_correo ? `mail:${String(r.usuario_correo).toLowerCase()}` : null;
        const nomKey = r.usuario_nombre ? `nom:${String(r.usuario_nombre).toLowerCase()}` : null;
        if (idKey && !ultimoAccesoPorUsuario.has(idKey)) ultimoAccesoPorUsuario.set(idKey, r.fecha_registro);
        if (mailKey && !ultimoAccesoPorUsuario.has(mailKey)) ultimoAccesoPorUsuario.set(mailKey, r.fecha_registro);
        if (nomKey && !ultimoAccesoPorUsuario.has(nomKey)) ultimoAccesoPorUsuario.set(nomKey, r.fecha_registro);
      });

      const personalResumen = perfiles
        .map(u => {
          const ultimo =
            ultimoAccesoPorUsuario.get(`id:${u.id_usuario}`) ||
            ultimoAccesoPorUsuario.get(`mail:${String(u.email || '').toLowerCase()}`) ||
            ultimoAccesoPorUsuario.get(`nom:${String(u.nombre_completo || '').toLowerCase()}`) ||
            null;
          return { ...u, ultimo_acceso: ultimo };
        })
        .sort((a, b) => {
          const ta = a.ultimo_acceso ? new Date(a.ultimo_acceso).getTime() : 0;
          const tb = b.ultimo_acceso ? new Date(b.ultimo_acceso).getTime() : 0;
          return tb - ta;
        });

      setDatos({
        publicados: publicadosList.length,
        borradores: borradoresList.length,
        borradoresSinFoto,
        publicadosAgotados,
        lotesActivos: lotesEnRotacion.length,
        lotesPorCaducar,
        bannersActivos: banners.length,
        pedidosPendientes: pedidosPendientesList.length,
        pedidosMismoDia,
        pedidosHoy: pedidosDeHoy.length,
        ventasHoy,
        ventasAyer,
        ventasMes,
        ticketPromedioMes,
        pedidosPagadosMes,
        pedidosPendPagoMes,
        entregasDomicilioMes,
        entregasSucursalMes,
        pedidosCrudos: pedidosOrdenados.slice(0, 20),
        serie14Dias,
        actividadReciente: bitacora.slice(0, 20),
        intentosFallidos24h,
        personalResumen: personalResumen.slice(0, 8),
        totalUsuariosActivos: perfiles.filter(u => u.activo !== false).length,
        totalUsuariosInactivos: perfiles.filter(u => u.activo === false).length,
        modulosExtra: modulos
      });

      setUltimaSync(
        new Intl.DateTimeFormat('es-MX', {
          timeZone: 'America/Mexico_City',
          hour: '2-digit',
          minute: '2-digit'
        }).format(new Date())
      );
    } catch (err) {
      console.warn('[Dashboard SIGE Candy]:', err);
    } finally {
      setSincronizando(false);
    }
  }, [supabase]);

  useEffect(() => {
    let rolDetectado = 'admin';
    try {
      const guardada = localStorage.getItem('candy_erp_sesion');
      if (guardada) {
        const parsed = JSON.parse(guardada);
        setUsuario(parsed);
        rolDetectado = parsed.rol || 'admin';
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
      const minutosInicioJornada = 9 * 60; // 09:00 AM
      const minutosCorte = 16 * 60 + 30;   // 04:30 PM
      const antesDeCorte = minutosActuales <= minutosCorte;

      const progresoCorte = Math.max(
        0,
        Math.min(100, Math.round(((minutosActuales - minutosInicioJornada) / (minutosCorte - minutosInicioJornada)) * 100))
      );

      let detalleCorte = '';
      if (antesDeCorte) {
        const diff = minutosCorte - minutosActuales;
        const hrsRest = Math.floor(diff / 60);
        const minRest = diff % 60;
        detalleCorte = `Faltan ${hrsRest}h ${minRest}m para corte 4:30 PM`;
      } else {
        detalleCorte = 'Corte 4:30 PM cerrado · Turno siguiente';
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
        detalleCorte,
        progresoCorte
      });
    };

    actualizarReloj();
    const timer = setInterval(actualizarReloj, 1000);
    cargarMetricas(rolDetectado);

    // Suscripción en tiempo real para mantener vivo el tablero
    const canal = supabase
      .channel('dashboard-sige-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tbl_pedidos' }, () => cargarMetricas(rolDetectado))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tbl_productos' }, () => cargarMetricas(rolDetectado))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tbl_bitacora_auditoria' }, () => cargarMetricas(rolDetectado))
      .subscribe();

    return () => {
      clearInterval(timer);
      supabase.removeChannel(canal);
    };
  }, [cargarMetricas, supabase]);

  const esAdmin = usuario.rol === 'admin';
  const modulosDelPerfil = MATRIZ_MODULOS.filter(m => m.roles.includes(usuario.rol));

  // Derivados para la gráfica
  const serieVisible = useMemo(
    () => (rangoGrafica === 7 ? datos.serie14Dias.slice(-7) : datos.serie14Dias),
    [datos.serie14Dias, rangoGrafica]
  );

  const maxMontoGrafica = useMemo(() => {
    const max = Math.max(...serieVisible.map(d => d.monto), 0);
    return max > 0 ? max : 1;
  }, [serieVisible]);

  const totalPeriodoGrafica = useMemo(
    () => serieVisible.reduce((acc, d) => acc + d.monto, 0),
    [serieVisible]
  );

  const pedidosPeriodoGrafica = useMemo(
    () => serieVisible.reduce((acc, d) => acc + d.pedidos, 0),
    [serieVisible]
  );

  // Variación hoy vs ayer
  const variacionHoy = useMemo(() => {
    if (datos.ventasAyer <= 0 && datos.ventasHoy <= 0) return { texto: 'Sin movimiento ayer', tipo: 'neutro' };
    if (datos.ventasAyer <= 0 && datos.ventasHoy > 0) return { texto: '+100% vs ayer', tipo: 'sube' };
    const pct = Math.round(((datos.ventasHoy - datos.ventasAyer) / datos.ventasAyer) * 100);
    return {
      texto: `${pct >= 0 ? '+' : ''}${pct}% vs ayer`,
      tipo: pct >= 0 ? 'sube' : 'baja'
    };
  }, [datos.ventasHoy, datos.ventasAyer]);

  // Salud catálogo
  const totalCatalogoActivo = datos.publicados + datos.borradores;
  const pctPublicado = totalCatalogoActivo > 0 ? Math.round((datos.publicados / totalCatalogoActivo) * 100) : 100;

  // Proporción modalidades entrega del mes
  const totalEntregasMes = datos.entregasDomicilioMes + datos.entregasSucursalMes;
  const pctDomicilio = totalEntregasMes > 0 ? Math.round((datos.entregasDomicilioMes / totalEntregasMes) * 100) : 50;

  // Pedidos filtrados en el widget
  const pedidosFiltradosWidget = useMemo(() => {
    return datos.pedidosCrudos
      .filter(p => {
        const est = String(p.estado_pedido || '').toLowerCase();
        const pago = String(p.estado_pago || '').toLowerCase();
        const ent = String(p.tipo_entrega || '').toLowerCase();
        if (filtroPedidos === 'pendientes') return est !== 'entregado' && est !== 'completado' && est !== 'cancelado';
        if (filtroPedidos === 'pagados') return pago === 'pagado';
        if (filtroPedidos === 'sucursal') return ent === 'sucursal';
        return true;
      })
      .slice(0, 6);
  }, [datos.pedidosCrudos, filtroPedidos]);

  // Actividad filtrada en el monitor
  const actividadFiltrada = useMemo(() => {
    return datos.actividadReciente
      .filter(r => {
        if (filtroActividad === 'todos') return true;
        const grupo = ETIQUETA_ACCION[r.tipo_accion]?.grupo || 'cambios';
        return grupo === filtroActividad;
      })
      .slice(0, 7);
  }, [datos.actividadReciente, filtroActividad]);

  // Alertas operativas accionables
  const alertasOperativas = [
    esAdmin && datos.intentosFallidos24h > 0 && {
      id: 'fallidos',
      nivel: 'critico',
      icono: 'lock',
      titulo: `${datos.intentosFallidos24h} intento(s) fallido(s) de acceso (24 h)`,
      detalle: 'Revisa los correos y equipos rechazados en la bitácora.',
      ruta: '/auditoria',
      accion: 'Auditar'
    },
    (esAdmin || usuario.rol === 'almacen_2norte') && datos.pedidosMismoDia > 0 && {
      id: 'corte',
      nivel: 'advertencia',
      icono: 'clock',
      titulo: `${datos.pedidosMismoDia} pedido(s) para surtido de hoy`,
      detalle: reloj.antesDeCorte ? 'En cola antes del corte de las 4:30 PM.' : 'Pendientes tras el corte operativo.',
      ruta: '/surtido-picking',
      accion: 'Surtir'
    },
    (esAdmin || usuario.rol === 'almacen_2norte') && datos.lotesPorCaducar > 0 && {
      id: 'caducidad',
      nivel: 'critico',
      icono: 'box',
      titulo: `${datos.lotesPorCaducar} lote(s) PEPS por caducar (≤ 30 días)`,
      detalle: 'Priorizar rotación de salida en Sucursal 2 Norte.',
      ruta: '/almacen-peps',
      accion: 'Lotes'
    },
    esAdmin && datos.publicadosAgotados > 0 && {
      id: 'agotados',
      nivel: 'advertencia',
      icono: 'alert',
      titulo: `${datos.publicadosAgotados} producto(s) publicado(s) con stock 0`,
      detalle: 'Salen como "Agotado" para clientes en la tienda web.',
      ruta: '/catalogo-admin',
      accion: 'Catálogo'
    },
    esAdmin && datos.borradores > 0 && {
      id: 'borradores',
      nivel: 'info',
      icono: 'clipboard',
      titulo: `${datos.borradores} producto(s) en bandeja de Borradores`,
      detalle:
        datos.borradoresSinFoto > 0
          ? `${datos.borradoresSinFoto} pendientes de fotografía antes de publicar.`
          : 'Todos cuentan con fotografía lista para publicación.',
      ruta: '/catalogo-admin',
      accion: 'Revisar'
    }
  ].filter(Boolean);

  return (
    <div className="dash-root">
      <style>{`
        .dash-root {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }
        .dash-live-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 999px;
          background: rgba(110, 231, 183, 0.14);
          border: 1px solid rgba(110, 231, 183, 0.35);
          color: #A7F3D0;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.02em;
        }
        .dash-live-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #34D399;
          box-shadow: 0 0 0 0 rgba(52, 211, 153, 0.7);
          animation: dashPulse 2s infinite;
        }
        @keyframes dashPulse {
          0% { box-shadow: 0 0 0 0 rgba(52, 211, 153, 0.65); }
          70% { box-shadow: 0 0 0 7px rgba(52, 211, 153, 0); }
          100% { box-shadow: 0 0 0 0 rgba(52, 211, 153, 0); }
        }
        .dash-cutoff-track {
          width: 100%;
          height: 6px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.14);
          overflow: hidden;
          margin-top: 10px;
        }
        .dash-cutoff-fill {
          height: 100%;
          border-radius: 999px;
          transition: width 0.6s ease;
        }
        .dash-quick-bar {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
          gap: 10px;
        }
        .dash-quick-tile {
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 11px 14px;
          background: #fff;
          border: 1px solid var(--linea);
          border-radius: 12px;
          text-decoration: none;
          color: var(--texto);
          transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
        }
        .dash-quick-tile:hover {
          transform: translateY(-2px);
          border-color: color-mix(in srgb, var(--c, var(--marca)) 45%, #fff);
          box-shadow: 0 10px 22px rgba(60, 16, 83, 0.08);
        }
        .dash-quick-tile__ico {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          display: grid;
          place-items: center;
          flex-shrink: 0;
          color: var(--c, var(--uva));
          background: color-mix(in srgb, var(--c, var(--uva)) 11%, #fff);
          border: 1px solid color-mix(in srgb, var(--c, var(--uva)) 20%, #fff);
        }
        .dash-quick-tile__count {
          margin-left: auto;
          font-size: 11px;
          font-weight: 800;
          padding: 2px 8px;
          border-radius: 999px;
          background: color-mix(in srgb, var(--c, var(--uva)) 12%, #fff);
          color: var(--c, var(--uva));
        }
        .dash-kpi-card {
          position: relative;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 8px;
          text-decoration: none;
          color: inherit;
          overflow: hidden;
          transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
        }
        .dash-kpi-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: var(--c, var(--marca));
          opacity: 0.9;
        }
        .dash-kpi-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 14px 28px rgba(60, 16, 83, 0.09);
          border-color: color-mix(in srgb, var(--c, var(--marca)) 35%, var(--linea));
        }
        .dash-mini-bar {
          width: 100%;
          height: 6px;
          border-radius: 999px;
          background: #EFEBF4;
          overflow: hidden;
        }
        .dash-mini-bar > i {
          display: block;
          height: 100%;
          border-radius: 999px;
          transition: width 0.5s ease;
        }
        .dash-bento {
          display: grid;
          grid-template-columns: minmax(0, 1.38fr) minmax(0, 1fr);
          gap: 18px;
          align-items: start;
        }
        @media (max-width: 1060px) {
          .dash-bento {
            grid-template-columns: 1fr;
          }
        }
        .dash-pills {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 3px;
          border-radius: 10px;
          background: #F4F0F8;
          border: 1px solid var(--linea);
        }
        .dash-pill {
          border: none;
          background: transparent;
          color: var(--texto-2);
          font-size: 11.5px;
          font-weight: 700;
          padding: 5px 10px;
          border-radius: 7px;
          cursor: pointer;
          transition: background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;
        }
        .dash-pill.activo {
          background: #fff;
          color: var(--uva);
          box-shadow: 0 2px 6px rgba(60, 16, 83, 0.1);
        }
        .dash-chart-box {
          position: relative;
          padding: 16px 12px 10px;
          border-radius: 12px;
          background: linear-gradient(180deg, #FCF9FE 0%, #FFFFFF 100%);
          border: 1px solid #EFE9F5;
        }
        .dash-chart-bars {
          display: grid;
          align-items: end;
          gap: 8px;
          height: 158px;
          padding-top: 24px;
          border-bottom: 1px dashed #E4DCEB;
        }
        .dash-bar-col {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-end;
          height: 100%;
          cursor: pointer;
          position: relative;
        }
        .dash-bar-fill {
          width: 100%;
          max-width: 34px;
          border-radius: 8px 8px 3px 3px;
          background: linear-gradient(180deg, #EC008C 0%, #6D1B7B 100%);
          transition: height 0.4s cubic-bezier(0.22, 1, 0.36, 1), transform 0.15s ease, filter 0.15s ease;
          min-height: 6px;
        }
        .dash-bar-fill.vacio {
          background: #E8E2EF;
        }
        .dash-bar-fill.hoy {
          background: linear-gradient(180deg, #FEDD00 0%, #F7941D 100%);
          box-shadow: 0 4px 12px rgba(247, 148, 29, 0.3);
        }
        .dash-bar-col:hover .dash-bar-fill {
          transform: scaleY(1.04);
          transform-origin: bottom;
          filter: brightness(1.06);
        }
        .dash-bar-val {
          font-size: 10px;
          font-weight: 800;
          color: var(--uva);
          margin-bottom: 4px;
          opacity: 0;
          transform: translateY(3px);
          transition: opacity 0.15s ease, transform 0.15s ease;
          white-space: nowrap;
        }
        .dash-bar-col:hover .dash-bar-val,
        .dash-bar-col.seleccionado .dash-bar-val {
          opacity: 1;
          transform: translateY(0);
        }
        .dash-bar-labels {
          display: grid;
          gap: 8px;
          margin-top: 8px;
          text-align: center;
        }
        .dash-bar-lbl {
          font-size: 10.5px;
          font-weight: 600;
          color: var(--tenue);
          text-transform: capitalize;
        }
        .dash-bar-lbl.hoy {
          color: var(--marca);
          font-weight: 800;
        }
        .dash-order-row {
          border-radius: 12px;
          border: 1px solid var(--linea);
          background: #fff;
          overflow: hidden;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .dash-order-row:hover {
          border-color: #D8CBE6;
          box-shadow: 0 6px 14px rgba(60, 16, 83, 0.05);
        }
        .dash-order-row__btn {
          width: 100%;
          border: none;
          background: transparent;
          padding: 11px 13px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          text-align: left;
        }
        .dash-order-row__detail {
          padding: 10px 13px 12px;
          background: #FAF8FC;
          border-top: 1px dashed #E5DCEB;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 10px;
          font-size: 12px;
        }
        .dash-alert-item {
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 11px 13px;
          border-radius: 12px;
          text-decoration: none;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .dash-alert-item:hover {
          transform: translateX(3px);
          box-shadow: 0 6px 14px rgba(38, 35, 43, 0.06);
        }
        .dash-timeline {
          position: relative;
          display: grid;
          gap: 10px;
        }
        .dash-timeline-item {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 10px;
          padding: 10px 12px;
          border-radius: 11px;
          border: 1px solid var(--linea);
          background: #FAFAFC;
          transition: background 0.15s ease, border-color 0.15s ease;
        }
        .dash-timeline-item:hover {
          background: #fff;
          border-color: #DCD1E8;
        }
        .dash-mod-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 14px;
        }
        .dash-mod-card {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 18px;
          border-radius: 14px;
          background: #fff;
          border: 1px solid var(--linea);
          text-decoration: none;
          color: var(--texto);
          position: relative;
          overflow: hidden;
          transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
        }
        .dash-mod-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: var(--c, var(--uva));
        }
        .dash-mod-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 24px rgba(60, 16, 83, 0.09);
          border-color: color-mix(in srgb, var(--c, var(--uva)) 40%, #fff);
        }
      `}</style>

      {/* ══════════ 1. HERO CORPORATIVO SIGE CANDY ══════════ */}
      <section className="erp-welcome-hero erp-anim-1" style={{ marginBottom: 0 }}>
        <div className="erp-welcome-logo-box">
          <img
            src="/img/LOGO CANDY.png"
            alt="Dulcerías Candy"
            style={{ height: '100px', width: 'auto', maxWidth: '188px', objectFit: 'contain' }}
            onError={e => { e.currentTarget.src = '/img/ICONO.png'; }}
          />
        </div>

        <div className="erp-welcome-info">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
            <div className="erp-welcome-saludo" style={{ margin: 0 }}>
              <ErpIcon name="shield" size={14} />
              <span>{CARGO_POR_ROL[usuario.rol] || 'Colaborador Autorizado · SIGE Candy'}</span>
            </div>
            <span className="dash-live-pill">
              <span className="dash-live-dot" />
              <span>En vivo{ultimaSync ? ` · ${ultimaSync}` : ''}</span>
            </span>
          </div>

          <h1 className="erp-welcome-nombre">
            ¡{reloj.saludo}, <span>{usuario.nombre}</span>!
          </h1>

          <p style={{ fontSize: 13.5, color: 'rgba(237, 231, 242, 0.86)', maxWidth: '60ch', lineHeight: 1.55, margin: 0 }}>
            {esAdmin
              ? `Panel de control SIGE Candy: ${datos.publicados} productos activos en tienda, ${datos.pedidosPendientes} pedidos en curso y ${datos.totalUsuariosActivos} colaboradores activos.`
              : `Entorno operativo SIGE Candy con ${modulosDelPerfil.length} módulos habilitados para tu turno en Dulcerías Candy.`}
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 16 }}>
            {esAdmin ? (
              <>
                <Link href="/catalogo-admin" className="erp-btn erp-btn--primario">
                  <ErpIcon name="tag" size={15} />
                  <span>Administrar Catálogo</span>
                </Link>
                <Link
                  href="/auditoria"
                  className="erp-btn"
                  style={{ background: 'rgba(254, 221, 0, 0.16)', color: 'var(--amarillo)', border: '1px solid rgba(254, 221, 0, 0.35)' }}
                >
                  <ErpIcon name="lock" size={15} />
                  <span>Bitácora Global</span>
                </Link>
              </>
            ) : (
              modulosDelPerfil[0] && (
                <Link href={modulosDelPerfil[0].ruta} className="erp-btn erp-btn--primario">
                  <span>Entrar a {modulosDelPerfil[0].nombre}</span>
                  <ErpIcon name="arrow-right" size={15} />
                </Link>
              )
            )}

            <button
              type="button"
              disabled={sincronizando}
              onClick={() => cargarMetricas(usuario.rol)}
              className="erp-btn"
              style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}
            >
              <ErpIcon name="refresh" size={15} />
              <span>{sincronizando ? 'Actualizando...' : 'Actualizar'}</span>
            </button>
          </div>
        </div>

        {/* Reloj con medidor de jornada hacia el corte de las 4:30 PM */}
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

          <div className="dash-cutoff-track" title="Avance de jornada hacia corte 4:30 PM (09:00 - 16:30)">
            <div
              className="dash-cutoff-fill"
              style={{
                width: `${reloj.progresoCorte}%`,
                background: reloj.antesDeCorte
                  ? 'linear-gradient(90deg, #34D399 0%, #FEDD00 100%)'
                  : '#FDE047'
              }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'rgba(255,255,255,0.55)', marginTop: 4 }}>
            <span>09:00</span>
            <span>Corte 16:30 ({reloj.progresoCorte}%)</span>
          </div>
        </div>
      </section>

      {/* ══════════ 2. BARRA DE ACCESOS RÁPIDOS (ADMIN) ══════════ */}
      {esAdmin && (
        <div className="dash-quick-bar erp-anim-2">
          <Link href="/catalogo-admin" className="dash-quick-tile" style={{ '--c': '#EC008C' }}>
            <span className="dash-quick-tile__ico"><ErpIcon name="clipboard" size={16} /></span>
            <div style={{ minWidth: 0 }}>
              <b style={{ display: 'block', fontSize: 12.5 }}>Borradores Web</b>
              <small style={{ fontSize: 11, color: 'var(--texto-2)' }}>Pendientes de publicar</small>
            </div>
            <span className="dash-quick-tile__count">{datos.borradores}</span>
          </Link>

          <Link href="/almacen-peps" className="dash-quick-tile" style={{ '--c': '#F7941D' }}>
            <span className="dash-quick-tile__ico"><ErpIcon name="box" size={16} /></span>
            <div style={{ minWidth: 0 }}>
              <b style={{ display: 'block', fontSize: 12.5 }}>Almacén 2 Norte</b>
              <small style={{ fontSize: 11, color: 'var(--texto-2)' }}>Control de lotes PEPS</small>
            </div>
            <span className="dash-quick-tile__count">{datos.lotesActivos}</span>
          </Link>

          <Link href="/surtido-picking" className="dash-quick-tile" style={{ '--c': '#00A650' }}>
            <span className="dash-quick-tile__ico"><ErpIcon name="truck" size={16} /></span>
            <div style={{ minWidth: 0 }}>
              <b style={{ display: 'block', fontSize: 12.5 }}>Cola de Surtido</b>
              <small style={{ fontSize: 11, color: 'var(--texto-2)' }}>Corte 4:30 PM</small>
            </div>
            <span className="dash-quick-tile__count">{datos.pedidosPendientes}</span>
          </Link>

          <Link href="/usuarios-admin" className="dash-quick-tile" style={{ '--c': '#3C1053' }}>
            <span className="dash-quick-tile__ico"><ErpIcon name="users" size={16} /></span>
            <div style={{ minWidth: 0 }}>
              <b style={{ display: 'block', fontSize: 12.5 }}>Usuarios y Roles</b>
              <small style={{ fontSize: 11, color: 'var(--texto-2)' }}>Equipo activo</small>
            </div>
            <span className="dash-quick-tile__count">{datos.totalUsuariosActivos}</span>
          </Link>

          <a href="/" target="_blank" rel="noopener noreferrer" className="dash-quick-tile" style={{ '--c': '#0085CA' }}>
            <span className="dash-quick-tile__ico"><ErpIcon name="store" size={16} /></span>
            <div style={{ minWidth: 0 }}>
              <b style={{ display: 'block', fontSize: 12.5 }}>Tienda en Línea</b>
              <small style={{ fontSize: 11, color: 'var(--texto-2)' }}>Abrir vista cliente</small>
            </div>
            <ErpIcon name="external" size={14} style={{ marginLeft: 'auto', color: 'var(--tenue)' }} />
          </a>
        </div>
      )}

      {/* ══════════ 3. TARJETAS KPI INTERACTIVAS ══════════ */}
      <div className="erp-kpi-grid erp-anim-2" style={{ marginBottom: 0 }}>
        {esAdmin ? (
          <Link href="/surtido-picking" className="erp-kpi dash-kpi-card" style={{ '--c': '#00A650' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--texto-2)', fontWeight: 700 }}>Ventas Web Hoy</span>
              <span className="erp-kpi__ico" style={{ '--c': '#00A650' }}>
                <ErpIcon name="store" size={18} />
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
              <div className="erp-kpi__valor" style={{ fontSize: 24 }}>{dineroMX(datos.ventasHoy)}</div>
              <span
                className={`erp-badge ${
                  variacionHoy.tipo === 'sube'
                    ? 'erp-badge--verde'
                    : variacionHoy.tipo === 'baja'
                    ? 'erp-badge--naranja'
                    : 'erp-badge--uva'
                }`}
                style={{ fontSize: 10, padding: '2px 7px' }}
              >
                {variacionHoy.texto}
              </span>
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--texto-2)', display: 'flex', justifyContent: 'space-between' }}>
              <span>{datos.pedidosHoy} {datos.pedidosHoy === 1 ? 'pedido hoy' : 'pedidos hoy'}</span>
              <span>Mes: <b style={{ color: 'var(--texto)' }}>{dineroMX(datos.ventasMes)}</b></span>
            </div>
          </Link>
        ) : (
          <Link href="/almacen-peps" className="erp-kpi dash-kpi-card" style={{ '--c': '#F04E23' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--texto-2)', fontWeight: 700 }}>Publicados Stock 0</span>
              <span className="erp-kpi__ico" style={{ '--c': '#F04E23' }}>
                <ErpIcon name="alert" size={18} />
              </span>
            </div>
            <div className="erp-kpi__valor">{datos.publicadosAgotados}</div>
            <span style={{ fontSize: 11.5, color: 'var(--texto-2)' }}>Bloqueados automáticamente en web</span>
          </Link>
        )}

        <Link href="/surtido-picking" className="erp-kpi dash-kpi-card" style={{ '--c': '#3C1053' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--texto-2)', fontWeight: 700 }}>Pedidos en Proceso</span>
            <span className="erp-kpi__ico" style={{ '--c': '#3C1053' }}>
              <ErpIcon name="clipboard" size={18} />
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <div className="erp-kpi__valor">{datos.pedidosPendientes}</div>
            {datos.ticketPromedioMes > 0 && esAdmin && (
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--uva)' }}>
                Ticket prom. {dineroMX(datos.ticketPromedioMes)}
              </span>
            )}
          </div>
          <span style={{ fontSize: 11.5, color: datos.pedidosMismoDia > 0 ? '#B45309' : 'var(--texto-2)', fontWeight: datos.pedidosMismoDia > 0 ? 700 : 500 }}>
            {datos.pedidosMismoDia > 0
              ? `${datos.pedidosMismoDia} en cola para surtido hoy`
              : 'Sin pendientes para corte 16:30 hrs'}
          </span>
        </Link>

        <Link href="/catalogo-admin" className="erp-kpi dash-kpi-card" style={{ '--c': '#EC008C' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--texto-2)', fontWeight: 700 }}>Salud del Catálogo</span>
            <span className="erp-kpi__ico" style={{ '--c': '#EC008C' }}>
              <ErpIcon name="tag" size={18} />
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <div className="erp-kpi__valor">{datos.publicados}</div>
            <span style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--marca)' }}>{pctPublicado}% publicado</span>
          </div>
          <div>
            <div className="dash-mini-bar" style={{ marginBottom: 5 }}>
              <i style={{ width: `${pctPublicado}%`, background: 'linear-gradient(90deg, #EC008C 0%, #3C1053 100%)' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--texto-2)' }}>
              <span>{datos.borradores} borradores</span>
              <span>{datos.bannersActivos} banners activos</span>
            </div>
          </div>
        </Link>

        <Link href="/almacen-peps" className="erp-kpi dash-kpi-card" style={{ '--c': '#F7941D' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--texto-2)', fontWeight: 700 }}>Lotes PEPS Activos</span>
            <span className="erp-kpi__ico" style={{ '--c': '#F7941D' }}>
              <ErpIcon name="box" size={18} />
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <div className="erp-kpi__valor">{datos.lotesActivos}</div>
            <span className={`erp-badge ${datos.lotesPorCaducar > 0 ? 'erp-badge--naranja' : 'erp-badge--verde'}`} style={{ fontSize: 10, padding: '2px 7px' }}>
              {datos.lotesPorCaducar > 0 ? `${datos.lotesPorCaducar} por caducar` : 'PEPS estable'}
            </span>
          </div>
          <span style={{ fontSize: 11.5, color: 'var(--texto-2)' }}>
            {datos.publicadosAgotados > 0
              ? `${datos.publicadosAgotados} publicados sin stock en web`
              : 'Rotación activa en Sucursal 2 Norte'}
          </span>
        </Link>
      </div>

      {/* ══════════ 4. BENTO GRID PRINCIPAL (ADMIN) ══════════ */}
      {esAdmin ? (
        <div className="dash-bento erp-anim-3">
          {/* COLUMNA IZQUIERDA (Principal): GRÁFICA DE VENTAS + PEDIDOS INTERACTIVOS */}
          <div style={{ display: 'grid', gap: 18 }}>
            {/* TARJETA 1: TENDENCIA DE VENTAS INTERACTIVA */}
            <div className="erp-card" style={{ margin: 0 }}>
              <div className="erp-card__header" style={{ flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <div className="erp-card__title">
                    <ErpIcon name="store" size={17} style={{ color: 'var(--marca)' }} />
                    <span>Tendencia de Ventas en Línea</span>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--texto-2)', margin: '3px 0 0' }}>
                    {diaHover
                      ? `${diaHover.etiqueta}: ${dineroMX(diaHover.monto)} en ${diaHover.pedidos} ${diaHover.pedidos === 1 ? 'pedido' : 'pedidos'}`
                      : `Total últimos ${rangoGrafica} días: ${dineroMX(totalPeriodoGrafica)} (${pedidosPeriodoGrafica} pedidos)`}
                  </p>
                </div>

                <div className="dash-pills">
                  <button
                    type="button"
                    className={`dash-pill ${rangoGrafica === 7 ? 'activo' : ''}`}
                    onClick={() => {
                      setRangoGrafica(7);
                      setDiaHover(null);
                    }}
                  >
                    7 días
                  </button>
                  <button
                    type="button"
                    className={`dash-pill ${rangoGrafica === 14 ? 'activo' : ''}`}
                    onClick={() => {
                      setRangoGrafica(14);
                      setDiaHover(null);
                    }}
                  >
                    14 días
                  </button>
                </div>
              </div>

              <div className="dash-chart-box" onMouseLeave={() => setDiaHover(null)}>
                <div
                  className="dash-chart-bars"
                  style={{ gridTemplateColumns: `repeat(${serieVisible.length}, minmax(0, 1fr))` }}
                >
                  {serieVisible.map(d => {
                    const alturaPct = d.monto > 0 ? Math.max(12, Math.round((d.monto / maxMontoGrafica) * 100)) : 5;
                    const seleccionado = diaHover?.fecha === d.fecha;

                    return (
                      <div
                        key={d.fecha}
                        className={`dash-bar-col ${seleccionado ? 'seleccionado' : ''}`}
                        onMouseEnter={() => setDiaHover(d)}
                        onClick={() => setDiaHover(seleccionado ? null : d)}
                        title={`${d.etiqueta}: ${dineroMX(d.monto)} (${d.pedidos} pedidos)`}
                      >
                        <span className="dash-bar-val">
                          {d.monto > 0 ? dineroCompacto(d.monto) : '$0'}
                        </span>
                        <div
                          className={`dash-bar-fill ${d.monto === 0 ? 'vacio' : d.esHoy ? 'hoy' : ''}`}
                          style={{ height: `${alturaPct}%` }}
                        />
                      </div>
                    );
                  })}
                </div>

                <div
                  className="dash-bar-labels"
                  style={{ gridTemplateColumns: `repeat(${serieVisible.length}, minmax(0, 1fr))` }}
                >
                  {serieVisible.map((d, i) => (
                    <span key={d.fecha} className={`dash-bar-lbl ${d.esHoy ? 'hoy' : ''}`}>
                      {rangoGrafica === 14 && i % 2 === 1 && !d.esHoy ? d.fecha.slice(8, 10) : d.etiqueta}
                    </span>
                  ))}
                </div>
              </div>

              {/* Barra inferior comparativa del mes: Pagos y Modalidad de Entrega */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginTop: 14 }}>
                <div style={{ padding: '10px 12px', borderRadius: 10, background: '#FAF8FC', border: '1px solid var(--linea)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, marginBottom: 6 }}>
                    <span style={{ fontWeight: 700, color: 'var(--texto-2)' }}>Modalidad del mes</span>
                    <span style={{ fontWeight: 700, color: 'var(--uva)' }}>
                      {datos.entregasDomicilioMes} Dom. · {datos.entregasSucursalMes} Suc.
                    </span>
                  </div>
                  <div className="dash-mini-bar" style={{ display: 'flex', background: '#D9EEFA' }}>
                    <i style={{ width: `${pctDomicilio}%`, background: '#3C1053', borderRadius: '999px 0 0 999px' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: 'var(--tenue)', marginTop: 4 }}>
                    <span>Envío Puebla ({pctDomicilio}%)</span>
                    <span>Click & Collect ({100 - pctDomicilio}%)</span>
                  </div>
                </div>

                <div style={{ padding: '10px 12px', borderRadius: 10, background: '#FAF8FC', border: '1px solid var(--linea)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--texto-2)' }}>Cobranza del mes</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
                    <span className="erp-badge erp-badge--verde" style={{ fontSize: 11 }}>
                      {datos.pedidosPagadosMes} Pagados
                    </span>
                    <span className="erp-badge erp-badge--amarillo" style={{ fontSize: 11 }}>
                      {datos.pedidosPendPagoMes} Pendientes (SPEI/Efec.)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* TARJETA 2: PEDIDOS RECIENTES INTERACTIVOS (EXPANDIBLES) */}
            <div className="erp-card" style={{ margin: 0 }}>
              <div className="erp-card__header" style={{ flexWrap: 'wrap', gap: 10 }}>
                <div className="erp-card__title">
                  <ErpIcon name="clipboard" size={17} style={{ color: 'var(--uva)' }} />
                  <span>Pedidos Recientes de la Tienda Web</span>
                </div>

                <div className="dash-pills">
                  {[
                    { id: 'todos', label: 'Todos' },
                    { id: 'pendientes', label: 'Pendientes' },
                    { id: 'pagados', label: 'Pagados' },
                    { id: 'sucursal', label: 'Sucursal' }
                  ].map(f => (
                    <button
                      key={f.id}
                      type="button"
                      className={`dash-pill ${filtroPedidos === f.id ? 'activo' : ''}`}
                      onClick={() => {
                        setFiltroPedidos(f.id);
                        setPedidoExpandidoId(null);
                      }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {pedidosFiltradosWidget.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '26px 12px', color: 'var(--tenue)', fontSize: 12.5 }}>
                  No hay pedidos bajo el filtro seleccionado.
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 8 }}>
                  {pedidosFiltradosWidget.map(ped => {
                    const pagado = String(ped.estado_pago || '').toLowerCase() === 'pagado';
                    const esSucursal = String(ped.tipo_entrega || '').toLowerCase() === 'sucursal';
                    const abierto = pedidoExpandidoId === ped.id_pedido;

                    return (
                      <div key={ped.id_pedido} className="dash-order-row">
                        <button
                          type="button"
                          className="dash-order-row__btn"
                          onClick={() => setPedidoExpandidoId(abierto ? null : ped.id_pedido)}
                        >
                          <div style={{ minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                              <b style={{ fontSize: 12.5, fontFamily: 'monospace', color: 'var(--texto)' }}>
                                {ped.folio || `#${ped.id_pedido}`}
                              </b>
                              <span className={`erp-badge ${pagado ? 'erp-badge--verde' : 'erp-badge--amarillo'}`} style={{ fontSize: 10, padding: '1px 7px' }}>
                                {pagado ? 'Pagado' : 'Pendiente'}
                              </span>
                              <span className="erp-badge erp-badge--uva" style={{ fontSize: 10, padding: '1px 7px' }}>
                                {esSucursal ? 'Sucursal' : 'Domicilio'}
                              </span>
                            </div>
                            <small style={{ display: 'block', fontSize: 11.5, color: 'var(--texto-2)', marginTop: 3 }}>
                              {ped.cliente_nombre || 'Cliente'} · {tiempoRelativoCorto(ped.fecha_pedido || ped.created_at)}
                            </small>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                            <div style={{ textAlign: 'right' }}>
                              <b style={{ display: 'block', fontSize: 14, color: 'var(--texto)' }}>{dineroMX(ped.total)}</b>
                              <small style={{ fontSize: 10.5, color: 'var(--tenue)', textTransform: 'capitalize' }}>
                                {String(ped.estado_pedido || 'recibido').replace(/_/g, ' ')}
                              </small>
                            </div>
                            <span
                              style={{
                                fontSize: 12,
                                color: 'var(--tenue)',
                                transform: abierto ? 'rotate(90deg)' : 'rotate(0deg)',
                                transition: 'transform 0.15s ease',
                                display: 'inline-flex'
                              }}
                            >
                              <ErpIcon name="arrow-right" size={14} />
                            </span>
                          </div>
                        </button>

                        {abierto && (
                          <div className="dash-order-row__detail">
                            <div>
                              <small style={{ display: 'block', color: 'var(--tenue)', fontSize: 10.5, fontWeight: 700 }}>ENTREGA</small>
                              <b style={{ color: 'var(--texto)' }}>
                                {esSucursal
                                  ? `Sucursal ${ped.sucursal_recoleccion || 'Asignada'}`
                                  : `${ped.direccion_calle || ''}, ${ped.direccion_colonia || 'Puebla'}`}
                              </b>
                            </div>
                            <div>
                              <small style={{ display: 'block', color: 'var(--tenue)', fontSize: 10.5, fontWeight: 700 }}>MÉTODO Y TURNO</small>
                              <span style={{ color: 'var(--texto)', textTransform: 'uppercase', fontWeight: 600 }}>
                                {ped.metodo_pago || 'N/D'}
                              </span>
                              <span style={{ color: 'var(--texto-2)' }}>
                                {' · '}
                                {ped.turno_surtido === 'siguiente_dia' ? 'Siguiente día' : 'Mismo día'}
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                              <Link
                                href={esSucursal ? '/entrega-qr' : '/surtido-picking'}
                                className="erp-btn erp-btn--secundario"
                                style={{ padding: '5px 11px', fontSize: 11.5 }}
                              >
                                <span>{esSucursal ? 'Ir a Entrega QR' : 'Ir a Surtido'}</span>
                                <ErpIcon name="arrow-right" size={12} />
                              </Link>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* COLUMNA DERECHA (Control): ALERTAS + MONITOR CON PESTAÑAS + ÁREAS */}
          <div style={{ display: 'grid', gap: 18 }}>
            {/* TARJETA 3: CENTRO DE ALERTAS OPERATIVAS */}
            <div className="erp-card" style={{ margin: 0 }}>
              <div className="erp-card__header">
                <div className="erp-card__title">
                  <ErpIcon name="alert" size={17} style={{ color: alertasOperativas.length > 0 ? '#C8320A' : 'var(--verde)' }} />
                  <span>Centro de Alertas</span>
                </div>
                <span className={`erp-badge ${alertasOperativas.length > 0 ? 'erp-badge--naranja' : 'erp-badge--verde'}`}>
                  {alertasOperativas.length > 0 ? `${alertasOperativas.length} por atender` : 'Sin pendientes'}
                </span>
              </div>

              {alertasOperativas.length === 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: '#EEFBF4', borderRadius: 11, color: '#007A3B', fontSize: 12.5, fontWeight: 600 }}>
                  <ErpIcon name="check" size={17} />
                  <span>Operación saludable: catálogo, almacén y accesos sin incidencias.</span>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 9 }}>
                  {alertasOperativas.map(al => {
                    const colores =
                      al.nivel === 'critico'
                        ? { bg: '#FFF5F3', border: '#F7C5B8', text: '#C8320A', icoBg: '#FDE6E0' }
                        : al.nivel === 'advertencia'
                        ? { bg: '#FFFBEB', border: '#FDE68A', text: '#B45309', icoBg: '#FEF3C7' }
                        : { bg: '#F8F4FC', border: '#E4D4F4', text: 'var(--uva)', icoBg: '#EFE5FA' };

                    return (
                      <Link
                        key={al.id}
                        href={al.ruta}
                        className="dash-alert-item"
                        style={{ background: colores.bg, border: `1px solid ${colores.border}` }}
                      >
                        <div
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 9,
                            background: colores.icoBg,
                            color: colores.text,
                            display: 'grid',
                            placeItems: 'center',
                            flexShrink: 0
                          }}
                        >
                          <ErpIcon name={al.icono} size={16} />
                        </div>

                        <div style={{ minWidth: 0, flex: 1 }}>
                          <b style={{ display: 'block', fontSize: 12.5, color: colores.text, lineHeight: 1.3 }}>
                            {al.titulo}
                          </b>
                          <small style={{ display: 'block', fontSize: 11.5, color: 'var(--texto-2)', marginTop: 2 }}>
                            {al.detalle}
                          </small>
                        </div>

                        <span style={{ fontSize: 11.5, fontWeight: 800, color: colores.text, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                          <span>{al.accion}</span>
                          <ErpIcon name="arrow-right" size={12} />
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* TARJETA 4: MONITOR UNIFICADO (ACTIVIDAD RECIENTE / PERSONAL Y ACCESOS) */}
            <div className="erp-card" style={{ margin: 0 }}>
              <div className="erp-card__header" style={{ flexWrap: 'wrap', gap: 10 }}>
                <div className="dash-pills">
                  <button
                    type="button"
                    className={`dash-pill ${tabMonitor === 'actividad' ? 'activo' : ''}`}
                    onClick={() => setTabMonitor('actividad')}
                  >
                    Actividad ({datos.actividadReciente.length})
                  </button>
                  <button
                    type="button"
                    className={`dash-pill ${tabMonitor === 'personal' ? 'activo' : ''}`}
                    onClick={() => setTabMonitor('personal')}
                  >
                    Personal ({datos.totalUsuariosActivos})
                  </button>
                </div>

                <Link
                  href={tabMonitor === 'actividad' ? '/auditoria' : '/usuarios-admin'}
                  className="link"
                  style={{ fontSize: 12, fontWeight: 700 }}
                >
                  {tabMonitor === 'actividad' ? 'Bitácora completa →' : 'Gestionar equipo →'}
                </Link>
              </div>

              {tabMonitor === 'actividad' ? (
                <>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                    {[
                      { id: 'todos', label: 'Todo' },
                      { id: 'accesos', label: 'Solo Accesos' },
                      { id: 'cambios', label: 'Solo Cambios' }
                    ].map(f => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setFiltroActividad(f.id)}
                        className={`erp-preset-chip ${filtroActividad === f.id ? 'activo' : ''}`}
                        style={{ fontSize: 11, padding: '3px 9px' }}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  {actividadFiltrada.length === 0 ? (
                    <p style={{ fontSize: 12.5, color: 'var(--tenue)', textAlign: 'center', padding: '18px 0', margin: 0 }}>
                      Sin movimientos registrados bajo este filtro.
                    </p>
                  ) : (
                    <div className="dash-timeline">
                      {actividadFiltrada.map(reg => {
                        const badge = ETIQUETA_ACCION[reg.tipo_accion] || {
                          texto: reg.tipo_accion,
                          clase: 'erp-badge--uva'
                        };
                        const esAlerta = reg.tipo_accion === 'INTENTO_FALLIDO';

                        return (
                          <div
                            key={reg.id_auditoria}
                            className="dash-timeline-item"
                            style={esAlerta ? { background: '#FFF6F4', borderColor: '#F7C5B8' } : undefined}
                          >
                            <div style={{ minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 3 }}>
                                <span className={`erp-badge ${badge.clase}`} style={{ fontSize: 10, padding: '1px 7px' }}>
                                  {badge.texto}
                                </span>
                                <b style={{ fontSize: 12.5, color: 'var(--texto)' }}>{reg.usuario_nombre}</b>
                              </div>
                              <p style={{ fontSize: 12, color: 'var(--texto-2)', margin: 0, lineHeight: 1.35 }}>
                                {reg.descripcion_cambio}
                              </p>
                            </div>
                            <small style={{ fontSize: 10.5, color: 'var(--tenue)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                              {tiempoRelativoCorto(reg.fecha_registro)}
                            </small>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              ) : (
                <>
                  {datos.personalResumen.length === 0 ? (
                    <p style={{ fontSize: 12.5, color: 'var(--tenue)', textAlign: 'center', padding: '18px 0', margin: 0 }}>
                      No hay colaboradores registrados todavía.
                    </p>
                  ) : (
                    <div style={{ display: 'grid', gap: 8 }}>
                      {datos.personalResumen.map(u => {
                        const activo = u.activo !== false;
                        return (
                          <div
                            key={u.id_usuario}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              gap: 10,
                              padding: '9px 11px',
                              borderRadius: 11,
                              border: '1px solid var(--linea)',
                              background: activo ? '#fff' : '#F9F8FB',
                              opacity: activo ? 1 : 0.7
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                              <div
                                style={{
                                  width: 34,
                                  height: 34,
                                  borderRadius: 10,
                                  background: activo ? 'linear-gradient(135deg, var(--uva) 0%, #5B1980 100%)' : '#DDD7E5',
                                  color: activo ? 'var(--amarillo)' : '#5F5869',
                                  display: 'grid',
                                  placeItems: 'center',
                                  fontWeight: 800,
                                  fontSize: 12.5,
                                  flexShrink: 0
                                }}
                              >
                                {(u.nombre_completo || u.email || 'U').charAt(0).toUpperCase()}
                              </div>
                              <div style={{ minWidth: 0 }}>
                                <b style={{ display: 'block', fontSize: 12.5, color: 'var(--texto)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {u.nombre_completo || u.email}
                                </b>
                                <small style={{ display: 'block', fontSize: 11, color: 'var(--texto-2)' }}>
                                  {ETIQUETA_ROL_CORTO[u.rol] || u.rol}
                                  {u.sucursal_asignada ? ` · ${u.sucursal_asignada}` : ''}
                                </small>
                              </div>
                            </div>

                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                              <span className={`erp-badge ${activo ? 'erp-badge--verde' : 'erp-badge--naranja'}`} style={{ fontSize: 10, padding: '1px 7px' }}>
                                {activo ? 'Activo' : 'Inactivo'}
                              </span>
                              <small style={{ display: 'block', fontSize: 10.5, color: 'var(--tenue)', marginTop: 2 }}>
                                {u.ultimo_acceso ? tiempoRelativoCorto(u.ultimo_acceso) : 'Sin acceso'}
                              </small>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {datos.totalUsuariosInactivos > 0 && (
                    <p style={{ fontSize: 11.5, color: 'var(--tenue)', marginTop: 10, marginBottom: 0 }}>
                      + {datos.totalUsuariosInactivos} cuenta(s) inactiva(s) en archivo.
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Áreas Personalizadas (si existen) */}
            {datos.modulosExtra.length > 0 && (
              <div className="erp-card" style={{ margin: 0 }}>
                <div className="erp-card__header">
                  <div className="erp-card__title">
                    <ErpIcon name="folder" size={17} style={{ color: 'var(--uva)' }} />
                    <span>Áreas Personalizadas ({datos.modulosExtra.length})</span>
                  </div>
                  <span className="erp-badge erp-badge--marca">SIGE Candy</span>
                </div>

                <div style={{ display: 'grid', gap: 10 }}>
                  {datos.modulosExtra.map(m => (
                    <Link
                      key={m.id_modulo}
                      href={`/modulo/${m.slug}`}
                      className="erp-card erp-card--interactiva"
                      style={{ margin: 0, padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}
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
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ══════════ VISTA MODERNA PARA ROLES OPERATIVOS (NO-ADMIN) ══════════ */
        <div className="dash-bento erp-anim-3">
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h2 style={{ fontSize: 15.5, fontWeight: 800, color: 'var(--texto)', margin: 0 }}>
                Tus Módulos Operativos
              </h2>
              <span className="erp-badge erp-badge--verde">{modulosDelPerfil.length} habilitados</span>
            </div>

            <div className="dash-mod-grid">
              {modulosDelPerfil.map(m => (
                <Link key={m.codigo} href={m.ruta} className="dash-mod-card" style={{ '--c': m.color }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 11,
                        background: `color-mix(in srgb, ${m.color} 12%, #fff)`,
                        color: m.color,
                        display: 'grid',
                        placeItems: 'center',
                        border: `1px solid color-mix(in srgb, ${m.color} 22%, #fff)`
                      }}
                    >
                      <ErpIcon name={m.icono} size={19} />
                    </div>
                    <span style={{ fontSize: 10.5, fontFamily: 'monospace', fontWeight: 700, color: 'var(--tenue)' }}>
                      {m.codigo}
                    </span>
                  </div>

                  <div>
                    <b style={{ display: 'block', fontSize: 14.5, marginBottom: 3 }}>{m.nombre}</b>
                    <small style={{ display: 'block', fontSize: 12, color: 'var(--texto-2)' }}>{m.area}</small>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px solid var(--linea)', marginTop: 'auto' }}>
                    <span style={{ fontSize: 11, color: 'var(--tenue)', fontWeight: 600 }}>{m.regla}</span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: m.color, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <span>Abrir</span>
                      <ErpIcon name="arrow-right" size={13} />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="erp-card" style={{ margin: 0 }}>
            <div className="erp-card__header">
              <div className="erp-card__title">
                <ErpIcon name="alert" size={17} style={{ color: alertasOperativas.length > 0 ? '#C8320A' : 'var(--verde)' }} />
                <span>Pendientes de tu Turno</span>
              </div>
            </div>

            {alertasOperativas.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: '#EEFBF4', borderRadius: 11, color: '#007A3B', fontSize: 12.5, fontWeight: 600 }}>
                <ErpIcon name="check" size={16} />
                <span>Sin alertas pendientes en tu área por el momento.</span>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {alertasOperativas.map(al => (
                  <Link
                    key={al.id}
                    href={al.ruta}
                    className="dash-alert-item"
                    style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}
                  >
                    <div style={{ flex: 1 }}>
                      <b style={{ display: 'block', fontSize: 13, color: '#B45309' }}>{al.titulo}</b>
                      <small style={{ display: 'block', fontSize: 11.5, color: 'var(--texto-2)', marginTop: 2 }}>
                        {al.detalle}
                      </small>
                    </div>
                    <ErpIcon name="arrow-right" size={14} style={{ color: '#B45309' }} />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}