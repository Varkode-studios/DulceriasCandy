'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import { createClient } from '@/lib/supabase/client';
import ErpIcon from '@/components/erp/ErpIcon';
import ErpSelect from '@/components/erp/ErpSelect';
import ErpDatePicker from '@/components/erp/ErpDatePicker';

const ETIQUETA_ROL = {
  admin: 'Administrador',
  almacen_2norte: 'Almacén 2 Norte',
  cajero_sucursal: 'Cajero Sucursal',
  asesor_crm: 'Asesor CRM'
};

function dineroMX(n) {
  return '$' + Number(n || 0).toLocaleString('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
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

function horaMX(isoStr) {
  if (!isoStr) return null;
  try {
    const h = Number(
      new Intl.DateTimeFormat('en-GB', {
        timeZone: 'America/Mexico_City',
        hour: '2-digit',
        hour12: false
      }).format(new Date(isoStr))
    );
    return isNaN(h) ? null : h;
  } catch {
    return null;
  }
}

function restarDiasMX(dias) {
  const d = new Date(Date.now() - dias * 24 * 60 * 60 * 1000);
  return fechaClaveMX(d);
}

function tiempoRelativo(isoStr) {
  if (!isoStr) return 'Sin registro';
  const fecha = new Date(isoStr);
  if (isNaN(fecha.getTime())) return 'Sin registro';
  const diffMin = Math.floor((Date.now() - fecha.getTime()) / 60000);
  if (diffMin < 1) return 'Ahora';
  if (diffMin < 60) return `Hace ${diffMin} min`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `Hace ${diffHrs} h`;
  return fecha.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

function normalizarCorreo(c) {
  return String(c || '').trim().toLowerCase();
}

export default function MetricasPage() {
  const supabase = useMemo(() => createClient(), []);
  const hoyMX = fechaClaveMX(new Date());

  const [usuarioActual, setUsuarioActual] = useState(null);
  const [verificandoAcceso, setVerificandoAcceso] = useState(true);
  const [cargando, setCargando] = useState(true);

  // Pestaña principal: 'web' | 'clientes' | 'erp'
  const [tab, setTab] = useState('web');

  // Rango global de fechas
  const [presetPeriodo, setPresetPeriodo] = useState('30d'); // 'hoy' | '7d' | '30d' | '90d' | 'todo' | 'custom'
  const [fechaDesde, setFechaDesde] = useState(restarDiasMX(29));
  const [fechaHasta, setFechaHasta] = useState(hoyMX);

  // Sub-filtros Pestaña 1 (Web y Productos)
  const [vistaRanking, setVistaRanking] = useState('vistos'); // 'vistos' | 'comprados' | 'oportunidades' | 'agotados'
  const [busquedaProd, setBusquedaProd] = useState('');

  // Sub-filtros Pestaña 2 (Clientes y Compras)
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [minPiezas, setMinPiezas] = useState('');
  const [filtroCompraCliente, setFiltroCompraCliente] = useState('todos'); // 'todos' | 'con_compras' | 'sin_compras' | 'recurrentes'
  const [filtroWaCliente, setFiltroWaCliente] = useState('todos'); // 'todos' | 'si' | 'no'
  const [soloRegEnPeriodo, setSoloRegEnPeriodo] = useState(false);
  const [ordenClientes, setOrdenClientes] = useState('piezas_desc'); // 'piezas_desc' | 'gasto_desc' | 'pedidos_desc' | 'recientes'

  // Datos crudos de Supabase
  const [datos, setDatos] = useState({
    eventosWeb: [],
    pedidos: [],
    detalles: [],
    productos: [],
    clientes: [],
    bitacora: [],
    perfiles: []
  });

  const cargarTodo = useCallback(async () => {
    setCargando(true);
    try {
      const [
        { data: eventosWeb },
        { data: pedidos },
        { data: detalles },
        { data: productos },
        { data: clientes },
        { data: bitacora },
        { data: perfiles }
      ] = await Promise.all([
        supabase.from('tbl_metricas_web').select('*').order('fecha_evento', { ascending: false }).limit(5000),
        supabase.from('tbl_pedidos').select('*').order('fecha_pedido', { ascending: false }).limit(2000),
        supabase.from('tbl_detalle_pedidos').select('*').limit(8000),
        supabase.from('tbl_productos').select('id_producto, codigo_barras, nombre_dulce, precio_unitario, stock_web, activo, publicado_web, imagen_url, tbl_categorias(nombre_categoria)'),
        supabase.from('tbl_clientes').select('*'),
        supabase.from('tbl_bitacora_auditoria').select('*').order('fecha_registro', { ascending: false }).limit(2000),
        supabase.from('tbl_perfiles_usuarios').select('id_usuario, nombre_completo, email, rol, sucursal_asignada, activo')
      ]);

      setDatos({
        eventosWeb: eventosWeb || [],
        pedidos: pedidos || [],
        detalles: detalles || [],
        productos: productos || [],
        clientes: clientes || [],
        bitacora: bitacora || [],
        perfiles: perfiles || []
      });
    } catch (err) {
      console.warn('[SIGE Métricas]:', err);
    } finally {
      setCargando(false);
    }
  }, [supabase]);

  useEffect(() => {
    async function verificar() {
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
        cargarTodo();
      } else {
        setCargando(false);
      }
    }
    verificar();
  }, [supabase, cargarTodo]);

  function aplicarPreset(preset) {
    setPresetPeriodo(preset);
    if (preset === 'hoy') {
      setFechaDesde(hoyMX);
      setFechaHasta(hoyMX);
    } else if (preset === '7d') {
      setFechaDesde(restarDiasMX(6));
      setFechaHasta(hoyMX);
    } else if (preset === '30d') {
      setFechaDesde(restarDiasMX(29));
      setFechaHasta(hoyMX);
    } else if (preset === '90d') {
      setFechaDesde(restarDiasMX(89));
      setFechaHasta(hoyMX);
    } else if (preset === 'todo') {
      setFechaDesde('');
      setFechaHasta('');
    }
  }

  const enRango = useCallback(
    isoStr => {
      if (!fechaDesde && !fechaHasta) return true;
      const f = fechaClaveMX(isoStr);
      if (!f) return false;
      if (fechaDesde && f < fechaDesde) return false;
      if (fechaHasta && f > fechaHasta) return false;
      return true;
    },
    [fechaDesde, fechaHasta]
  );

  /* ─────────── CÁLCULOS PESTAÑA 1: TIENDA WEB Y PRODUCTOS ─────────── */
  const metricasWeb = useMemo(() => {
    const eventos = datos.eventosWeb.filter(e => enRango(e.fecha_evento));
    const pedidosValidos = datos.pedidos.filter(p => {
      const est = String(p.estado_pedido || '').toLowerCase();
      if (est === 'cancelado' || est === 'rechazado') return false;
      return enRango(p.fecha_pedido || p.created_at);
    });

    const idsPedidosValidos = new Set(pedidosValidos.map(p => p.id_pedido));
    const detallesValidos = datos.detalles.filter(d => idsPedidosValidos.has(d.id_pedido));

    // Sesiones y dispositivos
    const sesionesTodas = new Map(); // session_id -> dispositivo
    const sesionesProducto = new Set();
    const sesionesCarrito = new Set();
    const sesionesLoginWall = new Set();
    const sesionesCheckout = new Set();

    let clicsWhatsapp = 0;
    let conversionesPinata = 0;
    let conversionesAguinaldo = 0;

    const mapaBusquedasSinRes = new Map();
    const mapaBanners = new Map();
    const mapaWhatsappProd = new Map();

    // Índice de productos por código e ID
    const catalogoPorCod = new Map();
    const catalogoPorId = new Map();
    datos.productos.forEach(p => {
      if (p.codigo_barras) catalogoPorCod.set(String(p.codigo_barras), p);
      catalogoPorId.set(String(p.id_producto), p);
    });

    // Mapa unificado por producto (vistas, carrito, compras)
    const tablaProductos = new Map();
    const asegurarProd = ({ cod, idProd, nombre, categoria }) => {
      const clave = String(cod || idProd || nombre || 'sin_ref');
      if (!tablaProductos.has(clave)) {
        const db = (cod && catalogoPorCod.get(String(cod))) || (idProd && catalogoPorId.get(String(idProd))) || null;
        tablaProductos.set(clave, {
          clave,
          codigo: db?.codigo_barras || cod || '—',
          nombre: db?.nombre_dulce || nombre || 'Producto',
          categoria: db?.tbl_categorias?.nombre_categoria || categoria || 'Catálogo',
          precio: Number(db?.precio_unitario || 0),
          stock: db ? Number(db.stock_web || 0) : null,
          activo: db ? db.activo !== false && db.publicado_web !== false : true,
          vistas: 0,
          vistasAgotado: 0,
          alCarrito: 0,
          piezasCarrito: 0,
          clicsWa: 0,
          piezasVendidas: 0,
          pedidosConProd: new Set(),
          ingresos: 0
        });
      }
      return tablaProductos.get(clave);
    };

    // Precargar catálogo publicado para visibilidad completa
    datos.productos
      .filter(p => p.activo !== false && p.publicado_web !== false)
      .forEach(p => {
        asegurarProd({
          cod: p.codigo_barras,
          idProd: p.id_producto,
          nombre: p.nombre_dulce,
          categoria: p.tbl_categorias?.nombre_categoria
        });
      });

    eventos.forEach(ev => {
      if (ev.session_id) {
        if (!sesionesTodas.has(ev.session_id)) {
          sesionesTodas.set(ev.session_id, ev.dispositivo || 'escritorio');
        }
      }

      if (ev.tipo_evento === 'vista_producto') {
        if (ev.session_id) sesionesProducto.add(ev.session_id);
        const item = asegurarProd({
          cod: ev.codigo_barras,
          idProd: ev.id_producto,
          nombre: ev.nombre_producto,
          categoria: ev.categoria
        });
        item.vistas += 1;
        if (ev.valor_texto === 'agotado') item.vistasAgotado += 1;
      } else if (ev.tipo_evento === 'agregar_carrito') {
        if (ev.session_id) sesionesCarrito.add(ev.session_id);
        const item = asegurarProd({
          cod: ev.codigo_barras,
          idProd: ev.id_producto,
          nombre: ev.nombre_producto,
          categoria: ev.categoria
        });
        item.alCarrito += 1;
        item.piezasCarrito += Number(ev.cantidad || 1);
      } else if (ev.tipo_evento === 'checkout_requiere_login') {
        if (ev.session_id) {
          sesionesLoginWall.add(ev.session_id);
          sesionesCheckout.add(ev.session_id);
        }
      } else if (ev.tipo_evento === 'inicio_checkout') {
        if (ev.session_id) sesionesCheckout.add(ev.session_id);
      } else if (ev.tipo_evento === 'busqueda_sin_resultados') {
        const termino = String(ev.valor_texto || '').trim().toLowerCase();
        if (termino) {
          const prev = mapaBusquedasSinRes.get(termino) || { termino: ev.valor_texto.trim(), veces: 0, ultima: ev.fecha_evento };
          prev.veces += 1;
          mapaBusquedasSinRes.set(termino, prev);
        }
      } else if (ev.tipo_evento === 'clic_banner') {
        const banner = String(ev.valor_texto || 'Banner').trim();
        mapaBanners.set(banner, (mapaBanners.get(banner) || 0) + 1);
      } else if (ev.tipo_evento === 'clic_whatsapp_cotizar') {
        clicsWhatsapp += 1;
        const nom = ev.nombre_producto || ev.valor_texto || 'Consulta general';
        mapaWhatsappProd.set(nom, (mapaWhatsappProd.get(nom) || 0) + 1);
        if (ev.codigo_barras && ev.codigo_barras !== 'no_encontrado') {
          const item = asegurarProd({
            cod: ev.codigo_barras,
            idProd: ev.id_producto,
            nombre: ev.nombre_producto,
            categoria: ev.categoria
          });
          item.clicsWa += 1;
        }
      } else if (ev.tipo_evento === 'conversion_pinata') {
        if (ev.session_id) sesionesCarrito.add(ev.session_id);
        if (String(ev.valor_texto || '').startsWith('aguinaldos')) {
          conversionesAguinaldo += 1;
        } else {
          conversionesPinata += 1;
        }
      }
    });

    // Cruzar con ventas reales de tbl_detalle_pedidos
    detallesValidos.forEach(det => {
      const item = asegurarProd({
        cod: det.codigo_barras,
        idProd: det.id_producto,
        nombre: det.nombre_producto,
        categoria: null
      });
      item.piezasVendidas += Number(det.cantidad || 0);
      item.ingresos += Number(det.subtotal_linea || Number(det.precio_unitario || 0) * Number(det.cantidad || 0));
      item.pedidosConProd.add(det.id_pedido);
    });

    let sesionesMovil = 0;
    sesionesTodas.forEach(disp => {
      if (disp === 'movil') sesionesMovil += 1;
    });
    const totalVisitas = sesionesTodas.size;
    const pctMovil = totalVisitas > 0 ? Math.round((sesionesMovil / totalVisitas) * 100) : 0;

    const totalPedidos = pedidosValidos.length;
    const ventasTotales = pedidosValidos.reduce((acc, p) => acc + Number(p.total || 0), 0);
    const tasaConversion = totalVisitas > 0 ? Number(((totalPedidos / totalVisitas) * 100).toFixed(1)) : 0;

    const listaProductos = Array.from(tablaProductos.values()).map(p => ({
      ...p,
      pedidosCount: p.pedidosConProd.size,
      convPct: p.vistas > 0 ? Number(((p.pedidosConProd.size / p.vistas) * 100).toFixed(1)) : 0
    }));

    const vistasAgotadosTotal = listaProductos.reduce((acc, p) => acc + p.vistasAgotado, 0);
    const busquedasSinResLista = Array.from(mapaBusquedasSinRes.values()).sort((a, b) => b.veces - a.veces);
    const bannersLista = Array.from(mapaBanners.entries())
      .map(([nombre, clics]) => ({ nombre, clics }))
      .sort((a, b) => b.clics - a.clics);
    const waLista = Array.from(mapaWhatsappProd.entries())
      .map(([nombre, clics]) => ({ nombre, clics }))
      .sort((a, b) => b.clics - a.clics);

    return {
      totalVisitas,
      sesionesMovil,
      pctMovil,
      vieronProducto: sesionesProducto.size,
      agregaronCarrito: sesionesCarrito.size,
      pasaronLoginWall: sesionesLoginWall.size,
      iniciaronCheckout: sesionesCheckout.size,
      totalPedidos,
      ventasTotales,
      tasaConversion,
      clicsWhatsapp,
      conversionesPinata,
      conversionesAguinaldo,
      vistasAgotadosTotal,
      totalBusquedasSinRes: busquedasSinResLista.reduce((acc, b) => acc + b.veces, 0),
      busquedasSinResLista,
      bannersLista,
      waLista,
      listaProductos
    };
  }, [datos.eventosWeb, datos.pedidos, datos.detalles, datos.productos, enRango]);

  const rankingFiltrado = useMemo(() => {
    let base = metricasWeb.listaProductos;

    if (busquedaProd.trim()) {
      const q = busquedaProd.trim().toLowerCase();
      base = base.filter(p => `${p.codigo} ${p.nombre} ${p.categoria}`.toLowerCase().includes(q));
    }

    if (vistaRanking === 'vistos') {
      return [...base]
        .filter(p => p.vistas > 0 || p.alCarrito > 0)
        .sort((a, b) => b.vistas - a.vistas || b.alCarrito - a.alCarrito)
        .slice(0, 30);
    }
    if (vistaRanking === 'comprados') {
      return [...base]
        .filter(p => p.piezasVendidas > 0)
        .sort((a, b) => b.piezasVendidas - a.piezasVendidas || b.ingresos - a.ingresos)
        .slice(0, 30);
    }
    if (vistaRanking === 'oportunidades') {
      return [...base]
        .filter(p => p.vistas > 0 && p.piezasVendidas === 0 && (p.stock === null || p.stock > 0))
        .sort((a, b) => b.vistas - a.vistas)
        .slice(0, 30);
    }
    // agotados con demanda
    return [...base]
      .filter(p => (p.stock !== null && p.stock <= 0) && (p.vistas > 0 || p.vistasAgotado > 0))
      .sort((a, b) => b.vistas - a.vistas)
      .slice(0, 30);
  }, [metricasWeb.listaProductos, vistaRanking, busquedaProd]);

  /* ─────────── CÁLCULOS PESTAÑA 2: CLIENTES Y COMPRAS ─────────── */
  const analiticaClientes = useMemo(() => {
    const pedidosValidos = datos.pedidos.filter(p => {
      const est = String(p.estado_pedido || '').toLowerCase();
      return est !== 'cancelado' && est !== 'rechazado';
    });

    // Piezas por pedido desde tbl_detalle_pedidos
    const piezasPorPedido = new Map();
    datos.detalles.forEach(d => {
      piezasPorPedido.set(d.id_pedido, (piezasPorPedido.get(d.id_pedido) || 0) + Number(d.cantidad || 0));
    });

    // Acumular pedidos por cliente (por id_cliente y por correo)
    const statsPorId = new Map();
    const statsPorCorreo = new Map();

    const sumarStats = (mapa, clave, ped, pzas) => {
      if (!clave) return;
      const cur = mapa.get(clave) || {
        pedidos: 0,
        piezas: 0,
        gasto: 0,
        ultimaCompra: null,
        sucursales: new Map()
      };
      cur.pedidos += 1;
      cur.piezas += pzas;
      cur.gasto += Number(ped.total || 0);
      const fechaPed = ped.fecha_pedido || ped.created_at;
      if (fechaPed && (!cur.ultimaCompra || new Date(fechaPed) > new Date(cur.ultimaCompra))) {
        cur.ultimaCompra = fechaPed;
      }
      if (ped.sucursal_recoleccion) {
        cur.sucursales.set(ped.sucursal_recoleccion, (cur.sucursales.get(ped.sucursal_recoleccion) || 0) + 1);
      }
      mapa.set(clave, cur);
    };

    pedidosValidos.forEach(ped => {
      const pzas = piezasPorPedido.get(ped.id_pedido) || 0;
      if (ped.id_cliente) sumarStats(statsPorId, String(ped.id_cliente), ped, pzas);
      const mail = normalizarCorreo(ped.cliente_correo);
      if (mail) sumarStats(statsPorCorreo, mail, ped, pzas);
    });

    const lista = datos.clientes.map(cli => {
      const mail = normalizarCorreo(cli.correo);
      const st = statsPorId.get(String(cli.id_cliente)) || statsPorCorreo.get(mail) || {
        pedidos: 0,
        piezas: 0,
        gasto: 0,
        ultimaCompra: null,
        sucursales: new Map()
      };

      const fechaRegistro = cli.created_at || cli.fecha_registro || null;
      let sucursalTop = cli.sucursal_preferida || '';
      if (!sucursalTop && st.sucursales.size > 0) {
        sucursalTop = Array.from(st.sucursales.entries()).sort((a, b) => b[1] - a[1])[0][0];
      }

      return {
        id_cliente: cli.id_cliente,
        nombre: cli.nombre_completo || cli.correo || 'Cliente',
        correo: cli.correo || '',
        telefono: cli.telefono || '',
        acepta_promos_wa: Boolean(cli.acepta_promos_wa),
        sucursal: sucursalTop || 'Domicilio / Sin definir',
        fecha_registro: fechaRegistro,
        pedidos: st.pedidos,
        piezas: st.piezas,
        gasto: Number(st.gasto.toFixed(2)),
        ultima_compra: st.ultimaCompra
      };
    });

    const totalRegistrados = lista.length;
    const nuevosEnPeriodo = lista.filter(c => c.fecha_registro && enRango(c.fecha_registro)).length;
    const conCompras = lista.filter(c => c.pedidos > 0);
    const conPromosWa = lista.filter(c => c.acepta_promos_wa).length;
    const gastoTotalClientes = conCompras.reduce((acc, c) => acc + c.gasto, 0);
    const ticketMedioCliente = conCompras.length > 0 ? gastoTotalClientes / conCompras.length : 0;

    return {
      lista,
      totalRegistrados,
      nuevosEnPeriodo,
      totalCompradores: conCompras.length,
      tasaCompradores: totalRegistrados > 0 ? Math.round((conCompras.length / totalRegistrados) * 100) : 0,
      conPromosWa,
      ticketMedioCliente
    };
  }, [datos.clientes, datos.pedidos, datos.detalles, enRango]);

  const clientesFiltrados = useMemo(() => {
    const minP = minPiezas === '' ? 0 : Math.max(0, Number(minPiezas || 0));

    return analiticaClientes.lista
      .filter(c => {
        if (soloRegEnPeriodo && (!c.fecha_registro || !enRango(c.fecha_registro))) return false;
        if (minP > 0 && c.piezas < minP) return false;

        if (filtroCompraCliente === 'con_compras' && c.pedidos === 0) return false;
        if (filtroCompraCliente === 'sin_compras' && c.pedidos > 0) return false;
        if (filtroCompraCliente === 'recurrentes' && c.pedidos < 2) return false;

        if (filtroWaCliente === 'si' && !c.acepta_promos_wa) return false;
        if (filtroWaCliente === 'no' && c.acepta_promos_wa) return false;

        if (busquedaCliente.trim()) {
          const q = busquedaCliente.trim().toLowerCase();
          const heno = `${c.nombre} ${c.correo} ${c.telefono} ${c.sucursal}`.toLowerCase();
          if (!heno.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (ordenClientes === 'gasto_desc') return b.gasto - a.gasto || b.piezas - a.piezas;
        if (ordenClientes === 'pedidos_desc') return b.pedidos - a.pedidos || b.gasto - a.gasto;
        if (ordenClientes === 'recientes') {
          return new Date(b.fecha_registro || 0).getTime() - new Date(a.fecha_registro || 0).getTime();
        }
        return b.piezas - a.piezas || b.gasto - a.gasto;
      });
  }, [
    analiticaClientes.lista,
    soloRegEnPeriodo,
    minPiezas,
    filtroCompraCliente,
    filtroWaCliente,
    busquedaCliente,
    ordenClientes,
    enRango
  ]);

  /* ─────────── CÁLCULOS PESTAÑA 3: OPERACIÓN Y EQUIPO (ERP) ─────────── */
  const analiticaErp = useMemo(() => {
    const logs = datos.bitacora.filter(l => enRango(l.fecha_registro));
    const pedidosPeriodo = datos.pedidos.filter(p => {
      const est = String(p.estado_pedido || '').toLowerCase();
      if (est === 'cancelado' || est === 'rechazado') return false;
      return enRango(p.fecha_pedido || p.created_at);
    });

    const intentosFallidos = logs.filter(l => l.tipo_accion === 'INTENTO_FALLIDO').length;

    // Actividad por módulo
    const mapaModulos = new Map();
    // Actividad por hora (08:00 a 20:00)
    const mapaHoras = new Map();
    for (let h = 8; h <= 20; h++) mapaHoras.set(h, 0);

    // Rendimiento por colaborador
    const mapaEquipo = new Map();
    datos.perfiles.forEach(p => {
      const clave = normalizarCorreo(p.email) || String(p.id_usuario);
      mapaEquipo.set(clave, {
        clave,
        nombre: p.nombre_completo || p.email,
        correo: p.email || '',
        rol: p.rol || 'colaborador',
        activo: p.activo !== false,
        inicios: 0,
        cambiosCatalogo: 0,
        cambiosOperacion: 0,
        totalAcciones: 0,
        diasActivos: new Set(),
        ultimaActividad: null
      });
    });

    logs.forEach(reg => {
      const mod = reg.modulo || 'General';
      mapaModulos.set(mod, (mapaModulos.get(mod) || 0) + 1);

      const h = horaMX(reg.fecha_registro);
      if (h !== null && h >= 8 && h <= 20) {
        mapaHoras.set(h, (mapaHoras.get(h) || 0) + 1);
      }

      if (reg.tipo_accion === 'INTENTO_FALLIDO') return;

      const clave = normalizarCorreo(reg.usuario_correo) || String(reg.usuario_nombre || 'Sistema');
      if (!mapaEquipo.has(clave)) {
        mapaEquipo.set(clave, {
          clave,
          nombre: reg.usuario_nombre || 'Colaborador',
          correo: reg.usuario_correo || '',
          rol: reg.usuario_rol || 'admin',
          activo: true,
          inicios: 0,
          cambiosCatalogo: 0,
          cambiosOperacion: 0,
          totalAcciones: 0,
          diasActivos: new Set(),
          ultimaActividad: null
        });
      }

      const colab = mapaEquipo.get(clave);
      colab.totalAcciones += 1;
      if (reg.tipo_accion === 'INICIO_SESION') colab.inicios += 1;
      else if (mod === 'Catálogo y Precios') colab.cambiosCatalogo += 1;
      else if (mod !== 'Accesos y Seguridad') colab.cambiosOperacion += 1;

      const dKey = fechaClaveMX(reg.fecha_registro);
      if (dKey) colab.diasActivos.add(dKey);
      if (!colab.ultimaActividad || new Date(reg.fecha_registro) > new Date(colab.ultimaActividad)) {
        colab.ultimaActividad = reg.fecha_registro;
      }
    });

    const equipoLista = Array.from(mapaEquipo.values())
      .map(c => ({ ...c, diasActivosCount: c.diasActivos.size }))
      .sort((a, b) => b.totalAcciones - a.totalAcciones);

    const colaboradoresConActividad = equipoLista.filter(c => c.totalAcciones > 0).length;

    const modulosLista = Array.from(mapaModulos.entries())
      .map(([modulo, total]) => ({ modulo, total }))
      .sort((a, b) => b.total - a.total);
    const maxModulo = Math.max(...modulosLista.map(m => m.total), 1);

    const horasLista = Array.from(mapaHoras.entries()).map(([hora, total]) => ({
      hora,
      etiqueta: `${String(hora).padStart(2, '0')}h`,
      total
    }));
    const maxHora = Math.max(...horasLista.map(h => h.total), 1);

    // Cumplimiento operativo de pedidos
    const mismoDia = pedidosPeriodo.filter(p => p.turno_surtido !== 'siguiente_dia').length;
    const siguienteDia = pedidosPeriodo.length - mismoDia;
    const entregados = pedidosPeriodo.filter(p => {
      const e = String(p.estado_pedido || '').toLowerCase();
      return e === 'entregado' || e === 'completado';
    }).length;
    const tasaEntrega = pedidosPeriodo.length > 0 ? Math.round((entregados / pedidosPeriodo.length) * 100) : 0;

    // Avance de catálogo
    const activosCat = datos.productos.filter(p => p.activo !== false);
    const pubCat = activosCat.filter(p => p.publicado_web !== false).length;
    const borrCat = activosCat.length - pubCat;

    return {
      totalMovimientos: logs.length,
      colaboradoresConActividad,
      intentosFallidos,
      equipoLista,
      modulosLista,
      maxModulo,
      horasLista,
      maxHora,
      pedidosPeriodo: pedidosPeriodo.length,
      mismoDia,
      siguienteDia,
      entregados,
      tasaEntrega,
      pubCat,
      borrCat
    };
  }, [datos.bitacora, datos.perfiles, datos.pedidos, datos.productos, enRango]);

  /* ─────────── EXPORTACIÓN A EXCEL SEGÚN PESTAÑA ACTIVA ─────────── */
  function exportarExcelActivo() {
    const libro = XLSX.utils.book_new();
    const sufijo = `${fechaDesde || 'inicio'}_a_${fechaHasta || hoyMX}`;

    if (tab === 'web') {
      const filasProd = metricasWeb.listaProductos
        .filter(p => p.vistas > 0 || p.piezasVendidas > 0 || p.alCarrito > 0)
        .sort((a, b) => b.vistas - a.vistas || b.piezasVendidas - a.piezasVendidas)
        .map(p => ({
          Codigo: p.codigo,
          Producto: p.nombre,
          Categoria: p.categoria,
          Precio: p.precio,
          Stock_Actual: p.stock ?? '',
          Vistas_Web: p.vistas,
          Veces_Al_Carrito: p.alCarrito,
          Piezas_Vendidas: p.piezasVendidas,
          Ingresos_MXN: Number(p.ingresos.toFixed(2)),
          Conversion_Pct: `${p.convPct}%`,
          Clics_WhatsApp: p.clicsWa
        }));

      const hoja1 = XLSX.utils.json_to_sheet(
        filasProd.length > 0 ? filasProd : [{ Nota: 'Sin datos en este rango' }]
      );
      XLSX.utils.book_append_sheet(libro, hoja1, 'Productos_Web');

      if (metricasWeb.busquedasSinResLista.length > 0) {
        const hoja2 = XLSX.utils.json_to_sheet(
          metricasWeb.busquedasSinResLista.map(b => ({
            Termino_Buscado: b.termino,
            Veces_Sin_Resultado: b.veces,
            Ultima_Busqueda: new Date(b.ultima).toLocaleString('es-MX')
          }))
        );
        XLSX.utils.book_append_sheet(libro, hoja2, 'Busquedas_Sin_Resultado');
      }

      XLSX.writeFile(libro, `SIGE_Metricas_Web_${sufijo}.xlsx`);
      return;
    }

    if (tab === 'clientes') {
      const filasCli = clientesFiltrados.map(c => ({
        Nombre: c.nombre,
        Correo: c.correo,
        Telefono: c.telefono,
        Acepta_Promos_WA: c.acepta_promos_wa ? 'Sí' : 'No',
        Sucursal_Preferida: c.sucursal,
        Fecha_Registro: c.fecha_registro ? new Date(c.fecha_registro).toLocaleDateString('es-MX') : '',
        Pedidos_Totales: c.pedidos,
        Piezas_Compradas: c.piezas,
        Gasto_Total_MXN: c.gasto,
        Ultima_Compra: c.ultima_compra ? new Date(c.ultima_compra).toLocaleDateString('es-MX') : 'Sin compras'
      }));
      const hoja = XLSX.utils.json_to_sheet(
        filasCli.length > 0 ? filasCli : [{ Nota: 'Sin clientes bajo el filtro actual' }]
      );
      XLSX.utils.book_append_sheet(libro, hoja, 'Clientes_SIGE');
      XLSX.writeFile(libro, `SIGE_Clientes_${hoyMX}.xlsx`);
      return;
    }

    const filasErp = analiticaErp.equipoLista.map(c => ({
      Colaborador: c.nombre,
      Correo: c.correo,
      Rol: ETIQUETA_ROL[c.rol] || c.rol,
      Estado: c.activo ? 'Activo' : 'Inactivo',
      Inicios_Sesion: c.inicios,
      Dias_Activos: c.diasActivosCount,
      Cambios_Catalogo: c.cambiosCatalogo,
      Movimientos_Operacion: c.cambiosOperacion,
      Total_Acciones: c.totalAcciones,
      Ultima_Actividad: c.ultimaActividad ? new Date(c.ultimaActividad).toLocaleString('es-MX') : 'Sin actividad'
    }));
    const hoja = XLSX.utils.json_to_sheet(
      filasErp.length > 0 ? filasErp : [{ Nota: 'Sin actividad registrada' }]
    );
    XLSX.utils.book_append_sheet(libro, hoja, 'Rendimiento_ERP');
    XLSX.writeFile(libro, `SIGE_Rendimiento_ERP_${sufijo}.xlsx`);
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
        <div style={{ width: 52, height: 52, borderRadius: 14, background: '#FDECE8', color: '#C8320A', display: 'grid', placeItems: 'center', margin: '0 auto 14px' }}>
          <ErpIcon name="lock" size={24} />
        </div>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>Acceso exclusivo para Dirección</h2>
        <p style={{ fontSize: 13.5, color: 'var(--texto-2)', marginBottom: 18 }}>
          El módulo de Métricas de SIGE Candy solo está disponible para el perfil de Administrador.
        </p>
        <Link href="/dashboard" className="erp-btn erp-btn--primario">
          Volver al Panel Ejecutivo
        </Link>
      </div>
    );
  }

  // Etapas del embudo web
  const baseEmbudo = Math.max(metricasWeb.totalVisitas, 1);
  const etapasEmbudo = [
    {
      titulo: '1. Visitas a la tienda',
      valor: metricasWeb.totalVisitas,
      pct: metricasWeb.totalVisitas > 0 ? 100 : 0,
      color: '#3C1053',
      nota: `${metricasWeb.pctMovil}% desde celular`
    },
    {
      titulo: '2. Vieron detalle de producto',
      valor: metricasWeb.vieronProducto,
      pct: Math.min(100, Math.round((metricasWeb.vieronProducto / baseEmbudo) * 100)),
      color: '#8E24AA',
      nota: 'Abrieron ficha de dulce'
    },
    {
      titulo: '3. Agregaron al carrito / piñata',
      valor: metricasWeb.agregaronCarrito,
      pct: Math.min(100, Math.round((metricasWeb.agregaronCarrito / baseEmbudo) * 100)),
      color: '#EC008C',
      nota: 'Intención directa de compra'
    },
    {
      titulo: '4. Llegaron a finalizar compra',
      valor: metricasWeb.iniciaronCheckout,
      pct: Math.min(100, Math.round((metricasWeb.iniciaronCheckout / baseEmbudo) * 100)),
      color: '#F7941D',
      nota: metricasWeb.pasaronLoginWall > 0
        ? `${metricasWeb.pasaronLoginWall} pasaron por aviso de registro`
        : 'Entraron directo con sesión'
    },
    {
      titulo: '5. Pedidos concretados',
      valor: metricasWeb.totalPedidos,
      pct: Math.min(100, Math.round((metricasWeb.totalPedidos / baseEmbudo) * 100)),
      color: '#00A650',
      nota: dineroMX(metricasWeb.ventasTotales)
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <style>{`
        .met-funnel-row {
          display: grid;
          grid-template-columns: 210px 1fr 120px;
          gap: 12px;
          align-items: center;
        }
        @media (max-width: 760px) {
          .met-funnel-row {
            grid-template-columns: 1fr;
            gap: 4px;
          }
        }
        .met-bar-track {
          height: 12px;
          border-radius: 999px;
          background: #F1ECF6;
          overflow: hidden;
        }
        .met-bar-fill {
          height: 100%;
          border-radius: 999px;
          transition: width 0.5s ease;
        }
        .met-hours-grid {
          display: grid;
          grid-template-columns: repeat(13, minmax(0, 1fr));
          align-items: end;
          gap: 6px;
          height: 135px;
          padding-top: 18px;
          border-bottom: 1px dashed #E4DCEB;
        }
        .met-hour-col {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-end;
          height: 100%;
        }
        .met-hour-bar {
          width: 100%;
          max-width: 22px;
          border-radius: 6px 6px 2px 2px;
          background: linear-gradient(180deg, #EC008C 0%, #3C1053 100%);
          min-height: 4px;
          transition: height 0.4s ease;
        }
        .met-hour-bar.vacio {
          background: #EAE4F0;
        }
        .met-split {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
          gap: 18px;
          align-items: start;
        }
      `}</style>

      {/* ENCABEZADO */}
      <div className="erp-page-header erp-anim-1" style={{ marginBottom: 0 }}>
        <div>
          <span className="erp-badge erp-badge--uva">SIGE Candy · Inteligencia Comercial y Operativa</span>
          <h1 className="erp-page-title">Métricas del Negocio</h1>
          <p className="erp-page-subtitle">
            Seguimiento real de productos en la tienda web, segmentación de clientes registrados y rendimiento interno del equipo.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <button type="button" onClick={exportarExcelActivo} className="erp-btn erp-btn--secundario">
            <ErpIcon name="clipboard" size={15} />
            <span>Exportar Excel</span>
          </button>
          <button type="button" onClick={cargarTodo} className="erp-btn erp-btn--primario">
            <ErpIcon name="refresh" size={15} />
            <span>{cargando ? 'Cargando...' : 'Actualizar'}</span>
          </button>
        </div>
      </div>

      {/* BARRA DE PESTAÑAS + RANGO DE FECHAS GLOBAL */}
      <div
        className="erp-card erp-anim-2"
        style={{
          margin: 0,
          padding: '14px 18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 14
        }}
      >
        <div className="erp-segmented" style={{ flexWrap: 'wrap' }}>
          <button type="button" className={tab === 'web' ? 'activo' : ''} onClick={() => setTab('web')}>
            <ErpIcon name="store" size={15} />
            <span>Tienda Web y Productos</span>
          </button>
          <button type="button" className={tab === 'clientes' ? 'activo' : ''} onClick={() => setTab('clientes')}>
            <ErpIcon name="users" size={15} />
            <span>Clientes y Compras ({analiticaClientes.totalRegistrados})</span>
          </button>
          <button type="button" className={tab === 'erp' ? 'activo' : ''} onClick={() => setTab('erp')}>
            <ErpIcon name="shield" size={15} />
            <span>Operación y Equipo (ERP)</span>
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div className="erp-preset-chips">
            {[
              { id: 'hoy', label: 'Hoy' },
              { id: '7d', label: '7 días' },
              { id: '30d', label: '30 días' },
              { id: '90d', label: '90 días' },
              { id: 'todo', label: 'Todo' }
            ].map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => aplicarPreset(p.id)}
                className={`erp-preset-chip ${presetPeriodo === p.id ? 'activo' : ''}`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 138 }}>
              <ErpDatePicker
                value={fechaDesde}
                onChange={val => {
                  setPresetPeriodo('custom');
                  setFechaDesde(val);
                }}
              />
            </div>
            <span style={{ color: 'var(--tenue)', fontSize: 12 }}>→</span>
            <div style={{ width: 138 }}>
              <ErpDatePicker
                value={fechaHasta}
                min={fechaDesde}
                onChange={val => {
                  setPresetPeriodo('custom');
                  setFechaHasta(val);
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ══════════ PESTAÑA 1: TIENDA WEB Y PRODUCTOS ══════════ */}
      {tab === 'web' && (
        <div className="erp-anim-2" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* 4 KPIs Web */}
          <div className="erp-kpi-grid" style={{ marginBottom: 0 }}>
            <div className="erp-kpi" style={{ '--c': '#3C1053' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--texto-2)', fontWeight: 700 }}>Visitas Únicas Web</span>
                <span className="erp-kpi__ico" style={{ '--c': '#3C1053' }}>
                  <ErpIcon name="eye" size={18} />
                </span>
              </div>
              <div className="erp-kpi__valor">{metricasWeb.totalVisitas}</div>
              <span style={{ fontSize: 12, color: 'var(--texto-2)' }}>
                {metricasWeb.pctMovil}% móvil · {100 - metricasWeb.pctMovil}% escritorio
              </span>
            </div>

            <div className="erp-kpi" style={{ '--c': '#00A650' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--texto-2)', fontWeight: 700 }}>Conversión a Pedido</span>
                <span className="erp-kpi__ico" style={{ '--c': '#00A650' }}>
                  <ErpIcon name="check" size={18} />
                </span>
              </div>
              <div className="erp-kpi__valor">{metricasWeb.tasaConversion}%</div>
              <span style={{ fontSize: 12, color: 'var(--texto-2)' }}>
                {metricasWeb.totalPedidos} pedidos · <b>{dineroMX(metricasWeb.ventasTotales)}</b>
              </span>
            </div>

            <div className="erp-kpi" style={{ '--c': '#F04E23' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--texto-2)', fontWeight: 700 }}>Demanda Insatisfecha</span>
                <span className="erp-kpi__ico" style={{ '--c': '#F04E23' }}>
                  <ErpIcon name="alert" size={18} />
                </span>
              </div>
              <div className="erp-kpi__valor">
                {metricasWeb.vistasAgotadosTotal + metricasWeb.totalBusquedasSinRes}
              </div>
              <span style={{ fontSize: 12, color: 'var(--texto-2)' }}>
                {metricasWeb.vistasAgotadosTotal} vistas a agotados · {metricasWeb.totalBusquedasSinRes} búsquedas sin hallar
              </span>
            </div>

            <div className="erp-kpi" style={{ '--c': '#EC008C' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--texto-2)', fontWeight: 700 }}>WhatsApp y Piñatas</span>
                <span className="erp-kpi__ico" style={{ '--c': '#EC008C' }}>
                  <ErpIcon name="tag" size={18} />
                </span>
              </div>
              <div className="erp-kpi__valor">{metricasWeb.clicsWhatsapp}</div>
              <span style={{ fontSize: 12, color: 'var(--texto-2)' }}>
                Cotizaciones WA · {metricasWeb.conversionesPinata} piñatas · {metricasWeb.conversionesAguinaldo} aguinaldos
              </span>
            </div>
          </div>

          {/* Embudo de Conversión */}
          <div className="erp-card" style={{ margin: 0 }}>
            <div className="erp-card__header">
              <div className="erp-card__title">
                <ErpIcon name="store" size={17} style={{ color: 'var(--marca)' }} />
                <span>Embudo de Conversión de la Tienda Web</span>
              </div>
              <span className="erp-badge erp-badge--uva">Seguimiento por sesión</span>
            </div>

            <div style={{ display: 'grid', gap: 14 }}>
              {etapasEmbudo.map(et => (
                <div key={et.titulo} className="met-funnel-row">
                  <div>
                    <b style={{ display: 'block', fontSize: 13, color: 'var(--texto)' }}>{et.titulo}</b>
                    <small style={{ fontSize: 11.5, color: 'var(--tenue)' }}>{et.nota}</small>
                  </div>

                  <div className="met-bar-track">
                    <div
                      className="met-bar-fill"
                      style={{
                        width: `${et.valor > 0 ? Math.max(4, et.pct) : 0}%`,
                        background: et.color
                      }}
                    />
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <b style={{ fontSize: 15, color: 'var(--texto)' }}>{et.valor}</b>
                    <span style={{ fontSize: 11.5, color: 'var(--texto-2)', marginLeft: 6, fontWeight: 700 }}>
                      ({et.pct}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Ranking Comparativo de Productos */}
          <div className="erp-card" style={{ margin: 0, padding: 0, overflow: 'hidden' }}>
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid var(--linea)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 12
              }}
            >
              <div className="erp-segmented" style={{ flexWrap: 'wrap' }}>
                <button type="button" className={vistaRanking === 'vistos' ? 'activo' : ''} onClick={() => setVistaRanking('vistos')}>
                  Más Vistos
                </button>
                <button type="button" className={vistaRanking === 'comprados' ? 'activo' : ''} onClick={() => setVistaRanking('comprados')}>
                  Más Comprados
                </button>
                <button type="button" className={vistaRanking === 'oportunidades' ? 'activo' : ''} onClick={() => setVistaRanking('oportunidades')}>
                  Oportunidades (Fugas)
                </button>
                <button type="button" className={vistaRanking === 'agotados' ? 'activo' : ''} onClick={() => setVistaRanking('agotados')}>
                  Agotados con Demanda
                </button>
              </div>

              <div style={{ position: 'relative', minWidth: 230 }}>
                <input
                  className="erp-input"
                  style={{ paddingLeft: 32 }}
                  placeholder="Filtrar producto o categoría..."
                  value={busquedaProd}
                  onChange={e => setBusquedaProd(e.target.value)}
                />
                <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--tenue)' }}>
                  <ErpIcon name="search" size={14} />
                </span>
              </div>
            </div>

            <div className="erp-tabla-wrap" style={{ border: 'none', borderRadius: 0 }}>
              <table className="erp-tabla">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Producto</th>
                    <th style={{ textAlign: 'right' }}>Vistas Ficha</th>
                    <th style={{ textAlign: 'right' }}>Al Carrito</th>
                    <th style={{ textAlign: 'right' }}>Piezas Vendidas</th>
                    <th style={{ textAlign: 'right' }}>Ingresos</th>
                    <th style={{ textAlign: 'right' }}>Conversión</th>
                    <th style={{ textAlign: 'right' }}>Stock Web</th>
                  </tr>
                </thead>
                <tbody>
                  {rankingFiltrado.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: 38, color: 'var(--tenue)' }}>
                        {vistaRanking === 'oportunidades'
                          ? 'No se detectaron fugas de conversión en este periodo.'
                          : vistaRanking === 'agotados'
                          ? 'Ningún producto agotado recibió clics en este periodo.'
                          : 'Aún no hay actividad registrada en este rango. Conforme los clientes naveguen y compren en la web, el ranking se llenará en vivo.'}
                      </td>
                    </tr>
                  ) : (
                    rankingFiltrado.map((p, idx) => (
                      <tr key={p.clave}>
                        <td style={{ fontWeight: 800, color: idx < 3 ? 'var(--marca)' : 'var(--tenue)' }}>
                          {idx + 1}
                        </td>
                        <td>
                          <b style={{ display: 'block', fontSize: 13 }}>{p.nombre}</b>
                          <small style={{ color: 'var(--texto-2)', fontSize: 11 }}>
                            {p.codigo} · {p.categoria}
                            {p.clicsWa > 0 ? ` · ${p.clicsWa} cotiz. WA` : ''}
                          </small>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>{p.vistas}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--uva)' }}>{p.alCarrito}</td>
                        <td style={{ textAlign: 'right', fontWeight: 800, color: '#007A3B' }}>{p.piezasVendidas}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>{dineroMX(p.ingresos)}</td>
                        <td style={{ textAlign: 'right' }}>
                          <span className={`erp-badge ${p.convPct >= 10 ? 'erp-badge--verde' : p.convPct > 0 ? 'erp-badge--amarillo' : 'erp-badge--uva'}`}>
                            {p.convPct}%
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {p.stock === null ? (
                            <span style={{ color: 'var(--tenue)', fontSize: 12 }}>—</span>
                          ) : (
                            <span className={`erp-badge ${p.stock <= 0 ? 'erp-badge--naranja' : 'erp-badge--verde'}`}>
                              {p.stock <= 0 ? 'Agotado' : `${p.stock} disp.`}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Radar de Búsquedas sin Resultado + Banners y Cotizaciones WA */}
          <div className="met-split">
            <div className="erp-card" style={{ margin: 0 }}>
              <div className="erp-card__header">
                <div className="erp-card__title">
                  <ErpIcon name="search" size={17} style={{ color: '#C8320A' }} />
                  <span>Búsquedas sin Resultado (Demanda Faltante)</span>
                </div>
                <span className="erp-badge erp-badge--naranja">{metricasWeb.busquedasSinResLista.length} términos</span>
              </div>

              {metricasWeb.busquedasSinResLista.length === 0 ? (
                <p style={{ fontSize: 12.5, color: 'var(--tenue)', margin: 0, textAlign: 'center', padding: '18px 0' }}>
                  Sin búsquedas fallidas en este rango.
                </p>
              ) : (
                <div style={{ display: 'grid', gap: 8 }}>
                  {metricasWeb.busquedasSinResLista.slice(0, 10).map(b => (
                    <div
                      key={b.termino}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '9px 12px',
                        borderRadius: 10,
                        background: '#FFF8F6',
                        border: '1px solid #F7C5B8'
                      }}
                    >
                      <div>
                        <b style={{ fontSize: 13, color: 'var(--texto)' }}>“{b.termino}”</b>
                        <small style={{ display: 'block', fontSize: 11, color: 'var(--texto-2)' }}>
                          Última vez: {tiempoRelativo(b.ultima)}
                        </small>
                      </div>
                      <span className="erp-badge erp-badge--naranja">{b.veces}x</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="erp-card" style={{ margin: 0 }}>
              <div className="erp-card__header">
                <div className="erp-card__title">
                  <ErpIcon name="tag" size={17} style={{ color: 'var(--uva)' }} />
                  <span>Desempeño de Banners y Cotizaciones WhatsApp</span>
                </div>
              </div>

              <div style={{ display: 'grid', gap: 16 }}>
                <div>
                  <small style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--texto-2)', textTransform: 'uppercase', marginBottom: 8 }}>
                    Clics en Banners de Portada
                  </small>
                  {metricasWeb.bannersLista.length === 0 ? (
                    <p style={{ fontSize: 12, color: 'var(--tenue)', margin: 0 }}>Sin clics en banners en este periodo.</p>
                  ) : (
                    <div style={{ display: 'grid', gap: 6 }}>
                      {metricasWeb.bannersLista.slice(0, 5).map(b => (
                        <div key={b.nombre} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 10px', background: '#FAF8FC', borderRadius: 8, border: '1px solid var(--linea)', fontSize: 12.5 }}>
                          <span style={{ fontWeight: 600 }}>{b.nombre}</span>
                          <span className="erp-badge erp-badge--uva">{b.clics} clics</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ paddingTop: 12, borderTop: '1px solid var(--linea)' }}>
                  <small style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--texto-2)', textTransform: 'uppercase', marginBottom: 8 }}>
                    Productos más consultados por WhatsApp
                  </small>
                  {metricasWeb.waLista.length === 0 ? (
                    <p style={{ fontSize: 12, color: 'var(--tenue)', margin: 0 }}>Sin clics de cotización WhatsApp en este periodo.</p>
                  ) : (
                    <div style={{ display: 'grid', gap: 6 }}>
                      {metricasWeb.waLista.slice(0, 5).map(w => (
                        <div key={w.nombre} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 10px', background: '#EEFBF4', borderRadius: 8, border: '1px solid #C6EED8', fontSize: 12.5 }}>
                          <span style={{ fontWeight: 600 }}>{w.nombre}</span>
                          <span className="erp-badge erp-badge--verde">{w.clics} clics</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ PESTAÑA 2: CLIENTES Y COMPRAS ══════════ */}
      {tab === 'clientes' && (
        <div className="erp-anim-2" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* 4 KPIs Clientes */}
          <div className="erp-kpi-grid" style={{ marginBottom: 0 }}>
            <div className="erp-kpi" style={{ '--c': '#3C1053' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--texto-2)', fontWeight: 700 }}>Clientes Registrados</span>
                <span className="erp-kpi__ico" style={{ '--c': '#3C1053' }}>
                  <ErpIcon name="users" size={18} />
                </span>
              </div>
              <div className="erp-kpi__valor">{analiticaClientes.totalRegistrados}</div>
              <span style={{ fontSize: 12, color: 'var(--verde)', fontWeight: 600 }}>
                +{analiticaClientes.nuevosEnPeriodo} nuevos en el rango seleccionado
              </span>
            </div>

            <div className="erp-kpi" style={{ '--c': '#00A650' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--texto-2)', fontWeight: 700 }}>Clientes con Compras</span>
                <span className="erp-kpi__ico" style={{ '--c': '#00A650' }}>
                  <ErpIcon name="check" size={18} />
                </span>
              </div>
              <div className="erp-kpi__valor">{analiticaClientes.totalCompradores}</div>
              <span style={{ fontSize: 12, color: 'var(--texto-2)' }}>
                {analiticaClientes.tasaCompradores}% de las cuentas registradas ya compraron
              </span>
            </div>

            <div className="erp-kpi" style={{ '--c': '#EC008C' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--texto-2)', fontWeight: 700 }}>Gasto Promedio / Comprador</span>
                <span className="erp-kpi__ico" style={{ '--c': '#EC008C' }}>
                  <ErpIcon name="store" size={18} />
                </span>
              </div>
              <div className="erp-kpi__valor" style={{ fontSize: 23 }}>
                {dineroMX(analiticaClientes.ticketMedioCliente)}
              </div>
              <span style={{ fontSize: 12, color: 'var(--texto-2)' }}>Valor acumulado por cliente activo</span>
            </div>

            <div className="erp-kpi" style={{ '--c': '#0085CA' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--texto-2)', fontWeight: 700 }}>Audiencia WhatsApp</span>
                <span className="erp-kpi__ico" style={{ '--c': '#0085CA' }}>
                  <ErpIcon name="mail" size={18} />
                </span>
              </div>
              <div className="erp-kpi__valor">{analiticaClientes.conPromosWa}</div>
              <span style={{ fontSize: 12, color: 'var(--texto-2)' }}>Autorizaron recibir promociones</span>
            </div>
          </div>

          {/* Filtros de segmentación de clientes */}
          <div className="erp-card" style={{ margin: 0, padding: '16px 20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12, alignItems: 'end' }}>
              <div>
                <label className="erp-label">Buscar cliente</label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="erp-input"
                    style={{ paddingLeft: 32 }}
                    placeholder="Nombre, correo, celular..."
                    value={busquedaCliente}
                    onChange={e => setBusquedaCliente(e.target.value)}
                  />
                  <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--tenue)' }}>
                    <ErpIcon name="search" size={14} />
                  </span>
                </div>
              </div>

              <div>
                <label className="erp-label">Mínimo de productos comprados</label>
                <input
                  type="number"
                  min="0"
                  className="erp-input"
                  placeholder="Ej. 5, 10, 25..."
                  value={minPiezas}
                  onChange={e => setMinPiezas(e.target.value)}
                />
              </div>

              <div>
                <label className="erp-label">Historial de compras</label>
                <ErpSelect
                  value={filtroCompraCliente}
                  onChange={setFiltroCompraCliente}
                  options={[
                    { value: 'todos', label: 'Todos los registrados' },
                    { value: 'con_compras', label: 'Con al menos 1 compra' },
                    { value: 'recurrentes', label: 'Recurrentes (2+ pedidos)' },
                    { value: 'sin_compras', label: 'Registrados sin compras (0)' }
                  ]}
                />
              </div>

              <div>
                <label className="erp-label">Promociones WhatsApp</label>
                <ErpSelect
                  value={filtroWaCliente}
                  onChange={setFiltroWaCliente}
                  options={[
                    { value: 'todos', label: 'Todos' },
                    { value: 'si', label: 'Sí acepta promos WA' },
                    { value: 'no', label: 'No acepta promos WA' }
                  ]}
                />
              </div>

              <div>
                <label className="erp-label">Ordenar por</label>
                <ErpSelect
                  value={ordenClientes}
                  onChange={setOrdenClientes}
                  options={[
                    { value: 'piezas_desc', label: 'Más productos comprados' },
                    { value: 'gasto_desc', label: 'Mayor monto acumulado ($)' },
                    { value: 'pedidos_desc', label: 'Más pedidos realizados' },
                    { value: 'recientes', label: 'Registro más reciente' }
                  ]}
                />
              </div>
            </div>

            {/* Atajos rápidos de piezas + filtro de registro en rango */}
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--linea)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--texto-2)' }}>Atajo por piezas compradas:</span>
                {['', '1', '5', '10', '25', '50'].map(val => (
                  <button
                    key={val || 'all'}
                    type="button"
                    onClick={() => setMinPiezas(val)}
                    className={`erp-preset-chip ${String(minPiezas) === val ? 'activo' : ''}`}
                  >
                    {val === '' ? 'Todas' : `${val}+ pzas`}
                  </button>
                ))}
              </div>

              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 600, color: 'var(--texto)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={soloRegEnPeriodo}
                  onChange={e => setSoloRegEnPeriodo(e.target.checked)}
                  style={{ width: 15, height: 15, accentColor: 'var(--uva)' }}
                />
                <span>Solo registrados en el rango de fechas superior</span>
              </label>
            </div>
          </div>

          {/* Tabla de clientes segmentados */}
          <div className="erp-tabla-wrap">
            <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--linea)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12.5, color: 'var(--texto-2)' }}>
                Mostrando <b>{clientesFiltrados.length}</b> de <b>{analiticaClientes.totalRegistrados}</b> clientes registrados
              </span>
              <span className="erp-badge erp-badge--uva">Listo para exportar a Excel</span>
            </div>

            <table className="erp-tabla">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Contacto</th>
                  <th>Registro</th>
                  <th style={{ textAlign: 'right' }}>Pedidos</th>
                  <th style={{ textAlign: 'right' }}>Productos Comprados</th>
                  <th style={{ textAlign: 'right' }}>Gasto Total</th>
                  <th>Última Compra</th>
                  <th>Promos WA</th>
                </tr>
              </thead>
              <tbody>
                {clientesFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--tenue)' }}>
                      No hay clientes que coincidan con los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  clientesFiltrados.map(c => (
                    <tr key={c.id_cliente}>
                      <td>
                        <b style={{ display: 'block', fontSize: 13 }}>{c.nombre}</b>
                        <small style={{ color: 'var(--tenue)', fontSize: 11 }}>{c.sucursal}</small>
                      </td>
                      <td>
                        <span style={{ display: 'block', fontSize: 12.5 }}>{c.correo}</span>
                        <small style={{ color: 'var(--texto-2)', fontFamily: 'monospace', fontSize: 11 }}>
                          {c.telefono || 'Sin teléfono'}
                        </small>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--texto-2)' }}>
                        {c.fecha_registro ? new Date(c.fecha_registro).toLocaleDateString('es-MX') : '—'}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>{c.pedidos}</td>
                      <td style={{ textAlign: 'right' }}>
                        <span className={`erp-badge ${c.piezas >= 10 ? 'erp-badge--verde' : c.piezas > 0 ? 'erp-badge--uva' : 'erp-badge--amarillo'}`}>
                          {c.piezas} pzas
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--texto)' }}>
                        {dineroMX(c.gasto)}
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--texto-2)' }}>
                        {c.ultima_compra ? tiempoRelativo(c.ultima_compra) : 'Sin compras'}
                      </td>
                      <td>
                        <span className={`erp-badge ${c.acepta_promos_wa ? 'erp-badge--verde' : 'erp-badge--naranja'}`}>
                          {c.acepta_promos_wa ? 'Autorizado' : 'No'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══════════ PESTAÑA 3: OPERACIÓN Y EQUIPO (ERP) ══════════ */}
      {tab === 'erp' && (
        <div className="erp-anim-2" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* 4 KPIs Internos del ERP */}
          <div className="erp-kpi-grid" style={{ marginBottom: 0 }}>
            <div className="erp-kpi" style={{ '--c': '#3C1053' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--texto-2)', fontWeight: 700 }}>Movimientos en SIGE</span>
                <span className="erp-kpi__ico" style={{ '--c': '#3C1053' }}>
                  <ErpIcon name="shield" size={18} />
                </span>
              </div>
              <div className="erp-kpi__valor">{analiticaErp.totalMovimientos}</div>
              <span style={{ fontSize: 12, color: 'var(--texto-2)' }}>
                {analiticaErp.colaboradoresConActividad} colaborador(es) con actividad
              </span>
            </div>

            <div className="erp-kpi" style={{ '--c': '#00A650' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--texto-2)', fontWeight: 700 }}>Tasa de Entrega</span>
                <span className="erp-kpi__ico" style={{ '--c': '#00A650' }}>
                  <ErpIcon name="check" size={18} />
                </span>
              </div>
              <div className="erp-kpi__valor">{analiticaErp.tasaEntrega}%</div>
              <span style={{ fontSize: 12, color: 'var(--texto-2)' }}>
                {analiticaErp.entregados} de {analiticaErp.pedidosPeriodo} pedidos completados
              </span>
            </div>

            <div className="erp-kpi" style={{ '--c': '#F7941D' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--texto-2)', fontWeight: 700 }}>Corte Operativo 4:30 PM</span>
                <span className="erp-kpi__ico" style={{ '--c': '#F7941D' }}>
                  <ErpIcon name="clock" size={18} />
                </span>
              </div>
              <div className="erp-kpi__valor">{analiticaErp.mismoDia}</div>
              <span style={{ fontSize: 12, color: 'var(--texto-2)' }}>
                Mismo día · {analiticaErp.siguienteDia} turno siguiente
              </span>
            </div>

            <div className="erp-kpi" style={{ '--c': '#F04E23' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--texto-2)', fontWeight: 700 }}>Alertas de Acceso</span>
                <span className="erp-kpi__ico" style={{ '--c': '#F04E23' }}>
                  <ErpIcon name="lock" size={18} />
                </span>
              </div>
              <div className="erp-kpi__valor">{analiticaErp.intentosFallidos}</div>
              <span style={{ fontSize: 12, color: analiticaErp.intentosFallidos > 0 ? '#C8320A' : 'var(--texto-2)', fontWeight: analiticaErp.intentosFallidos > 0 ? 700 : 400 }}>
                {analiticaErp.intentosFallidos > 0 ? 'Intentos fallidos bloqueados' : 'Sin incidentes de seguridad'}
              </span>
            </div>
          </div>

          {/* Productividad por Colaborador */}
          <div className="erp-tabla-wrap">
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--linea)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <b style={{ fontSize: 14.5, color: 'var(--texto)' }}>Rendimiento y Actividad por Colaborador</b>
                <p style={{ fontSize: 12, color: 'var(--texto-2)', margin: '2px 0 0' }}>
                  Resumen de sesiones y acciones registradas en SIGE Candy durante el periodo seleccionado.
                </p>
              </div>
              <Link href="/auditoria" className="link" style={{ fontSize: 12, fontWeight: 700 }}>
                Ver detalle en Bitácora →
              </Link>
            </div>

            <table className="erp-tabla">
              <thead>
                <tr>
                  <th>Colaborador</th>
                  <th>Rol</th>
                  <th style={{ textAlign: 'right' }}>Inicios Sesión</th>
                  <th style={{ textAlign: 'right' }}>Días Activos</th>
                  <th style={{ textAlign: 'right' }}>Gestión Catálogo</th>
                  <th style={{ textAlign: 'right' }}>Operación / Almacén</th>
                  <th style={{ textAlign: 'right' }}>Total Acciones</th>
                  <th>Última Actividad</th>
                </tr>
              </thead>
              <tbody>
                {analiticaErp.equipoLista.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: 36, color: 'var(--tenue)' }}>
                      No hay actividad registrada en este periodo.
                    </td>
                  </tr>
                ) : (
                  analiticaErp.equipoLista.map(c => (
                    <tr key={c.clave}>
                      <td>
                        <b style={{ display: 'block', fontSize: 13 }}>{c.nombre}</b>
                        <small style={{ color: 'var(--tenue)', fontSize: 11 }}>{c.correo || 'Cuenta operativa'}</small>
                      </td>
                      <td>
                        <span className={`erp-badge ${c.activo ? 'erp-badge--uva' : 'erp-badge--naranja'}`}>
                          {ETIQUETA_ROL[c.rol] || c.rol}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>{c.inicios}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{c.diasActivosCount}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--marca)' }}>{c.cambiosCatalogo}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: '#007A3B' }}>{c.cambiosOperacion}</td>
                      <td style={{ textAlign: 'right' }}>
                        <b style={{ fontSize: 14, color: 'var(--texto)' }}>{c.totalAcciones}</b>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--texto-2)' }}>
                        {tiempoRelativo(c.ultimaActividad)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Uso por Módulo + Horarios Pico de Uso de SIGE Candy */}
          <div className="met-split">
            <div className="erp-card" style={{ margin: 0 }}>
              <div className="erp-card__header">
                <div className="erp-card__title">
                  <ErpIcon name="folder" size={17} style={{ color: 'var(--uva)' }} />
                  <span>Carga de Trabajo por Módulo</span>
                </div>
              </div>

              {analiticaErp.modulosLista.length === 0 ? (
                <p style={{ fontSize: 12.5, color: 'var(--tenue)', textAlign: 'center', padding: '18px 0', margin: 0 }}>
                  Sin registros en este rango.
                </p>
              ) : (
                <div style={{ display: 'grid', gap: 11 }}>
                  {analiticaErp.modulosLista.map(m => {
                    const pct = Math.round((m.total / analiticaErp.maxModulo) * 100);
                    return (
                      <div key={m.modulo}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 4 }}>
                          <b style={{ color: 'var(--texto)' }}>{m.modulo}</b>
                          <span style={{ color: 'var(--texto-2)', fontWeight: 700 }}>{m.total} mov.</span>
                        </div>
                        <div className="met-bar-track" style={{ height: 9 }}>
                          <div
                            className="met-bar-fill"
                            style={{
                              width: `${Math.max(5, pct)}%`,
                              background: 'linear-gradient(90deg, #3C1053 0%, #EC008C 100%)'
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--linea)', display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--texto-2)' }}>
                <span>Avance de publicación del catálogo:</span>
                <b>{analiticaErp.pubCat} publicados · {analiticaErp.borrCat} borradores</b>
              </div>
            </div>

            <div className="erp-card" style={{ margin: 0 }}>
              <div className="erp-card__header">
                <div className="erp-card__title">
                  <ErpIcon name="clock" size={17} style={{ color: 'var(--marca)' }} />
                  <span>Horarios Pico de Uso del ERP (08:00 – 20:00)</span>
                </div>
              </div>

              <div className="met-hours-grid">
                {analiticaErp.horasLista.map(h => {
                  const pct = h.total > 0 ? Math.max(12, Math.round((h.total / analiticaErp.maxHora) * 100)) : 5;
                  return (
                    <div
                      key={h.hora}
                      className="met-hour-col"
                      title={`${h.etiqueta}: ${h.total} movimientos`}
                    >
                      <small style={{ fontSize: 10, fontWeight: 700, color: h.total > 0 ? 'var(--uva)' : 'transparent', marginBottom: 3 }}>
                        {h.total}
                      </small>
                      <div
                        className={`met-hour-bar ${h.total === 0 ? 'vacio' : ''}`}
                        style={{ height: `${pct}%` }}
                      />
                    </div>
                  );
                })}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(13, minmax(0, 1fr))', gap: 6, marginTop: 6, textAlign: 'center' }}>
                {analiticaErp.horasLista.map(h => (
                  <span key={h.hora} style={{ fontSize: 10, color: h.hora === 16 ? 'var(--marca)' : 'var(--tenue)', fontWeight: h.hora === 16 ? 800 : 600 }}>
                    {h.etiqueta}
                  </span>
                ))}
              </div>

              <p style={{ fontSize: 11.5, color: 'var(--texto-2)', marginTop: 12, marginBottom: 0 }}>
                La hora <b>16h</b> está resaltada en rosa como referencia del corte operativo de las <b>4:30 PM</b>.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}