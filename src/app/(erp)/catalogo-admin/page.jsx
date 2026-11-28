'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import ErpIcon from '@/components/erp/ErpIcon';
import ErpSelect from '@/components/erp/ErpSelect';
import ErpDatePicker from '@/components/erp/ErpDatePicker';
import ErpImageUpload from '@/components/erp/ErpImageUpload';
import ErpImportarExcel from '@/components/erp/ErpImportarExcel';

const FONDOS_ORIGINALES = [
  'linear-gradient(125deg, #EC008C 0%, #C6007E 55%, #7A1E86 100%)',
  'linear-gradient(125deg, #0085CA 0%, #0066A6 55%, #3C1053 100%)',
  'linear-gradient(125deg, #F7941D 0%, #EC008C 60%, #3C1053 100%)'
];

const SIN_MARCA = 'Sin marca / Genérico';

const MARCAS_DISPONIBLES_BASE = [
  'Alteño',
  'Anáhuac',
  'Arcor',
  'Barcel',
  'Betamex',
  "Canel's",
  'Chupa Chups',
  'Cooltoons',
  'Cuétara',
  'De la Rosa',
  'Dulcerías Candy',
  'Ferrero',
  'Gamesa',
  'Gapsa',
  "Hershey's",
  'Kalú',
  'Kipi',
  'La Botanera',
  'La Perla',
  'La Poblana',
  "Mac'ma",
  'Marinela',
  'Mars',
  'Ricolino',
  'Sabritas',
  'Salsa Valentina',
  'Tutsi Pop',
  'Vero'
];

const OPCIONES_ETIQUETA_WEB = [
  { value: 'normal', label: 'Estándar (Sin etiqueta especial)' },
  { value: 'nuevo', label: 'Novedad (Sello "Nuevo" y filtro Novedades)' },
  { value: 'top', label: 'Más vendido (Respaldo en estante principal)' }
];

const MOTIVOS_BAJA = [
  'Fin de temporada',
  'Desabasto temporal con proveedor',
  'Baja rotación de ventas',
  'Cambio de presentación o gramaje',
  'Descontinuado por la marca',
  'Revisión de calidad o empaque'
];

const ETIQUETA_TIPO_ACCION = {
  ALTA_PRODUCTO: { texto: 'Alta de Producto', clase: 'erp-badge--verde' },
  EDICION_PRECIO_DATOS: { texto: 'Modificación / Precio', clase: 'erp-badge--uva' },
  DESCUENTO_MASIVO: { texto: 'Descuento Masivo', clase: 'erp-badge--marca' },
  IMPORTACION_EXCEL: { texto: 'Importación Excel', clase: 'erp-badge--verde' },
  VISIBILIDAD_WEB: { texto: 'Visibilidad Web', clase: 'erp-badge--amarillo' },
  ELIMINACION_BORRADOR: { texto: 'Borrador Eliminado', clase: 'erp-badge--naranja' },
  BAJA_LOGICA: { texto: 'Baja de Catálogo', clase: 'erp-badge--naranja' },
  REACTIVACION: { texto: 'Republicación', clase: 'erp-badge--verde' },
  EDICION_BANNER: { texto: 'Banner Portada', clase: 'erp-badge--amarillo' },
  ELIMINACION_BANNER: { texto: 'Banner Eliminado', clase: 'erp-badge--naranja' }
};

const PORCENTAJES_RAPIDOS = [0, 5, 10, 15, 20, 25, 30, 50];

function normalizarMarca(valor) {
  const m = String(valor || '').trim();
  if (!m || m === SIN_MARCA) {
    return SIN_MARCA;
  }
  return m;
}

function marcaParaDB(valor) {
  const m = normalizarMarca(valor);
  return m === SIN_MARCA ? null : m;
}

function tieneFotoReal(prod) {
  const url = String(prod?.imagen_url || '').trim();
  if (!url) return false;
  const lower = url.toLowerCase();
  if (lower === 'img/icono.png' || lower === '/img/icono.png') return false;
  return true;
}

function descomponerLeyendaBanner(leyenda = '', urlImg = '') {
  const partes = String(leyenda || '').split('|').map(s => s.trim());
  const tag = partes[0] || 'Promoción';
  const desc = partes[1] || '';
  let destino = partes[2] || '';
  if (!destino) {
    destino = urlImg && urlImg.startsWith('#') ? urlImg : '#catalogo';
  }
  return { tag, desc, destino };
}

function componerLeyendaBanner(tag, desc, destino) {
  return `${(tag || '').trim()} | ${(desc || '').trim()} | ${(destino || '#catalogo').trim()}`;
}

function isoAFechaInput(isoStr) {
  if (!isoStr) return '';
  try {
    const d = new Date(isoStr);
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

function fechaInputAIso(fechaStr, esFinDeDia = false) {
  if (!fechaStr) return null;
  return esFinDeDia
    ? `${fechaStr}T23:59:59-06:00`
    : `${fechaStr}T00:00:00-06:00`;
}

function evaluarVigenciaDescuento(prod) {
  const pct = Number(prod?.porcentaje_descuento || 0);
  if (pct <= 0) {
    return { activoEnTienda: false, pctEfectivo: 0, estado: 'sin_descuento', etiqueta: 'Precio regular' };
  }

  const ahora = new Date();
  const inicio = prod.descuento_inicio ? new Date(prod.descuento_inicio) : null;
  const fin = prod.descuento_fin ? new Date(prod.descuento_fin) : null;

  if (inicio && ahora < inicio) {
    return {
      activoEnTienda: false,
      pctEfectivo: 0,
      estado: 'programado',
      etiqueta: `Programado (-${pct}% inicia ${isoAFechaInput(prod.descuento_inicio)})`
    };
  }

  if (fin && ahora > fin) {
    return {
      activoEnTienda: false,
      pctEfectivo: 0,
      estado: 'vencido',
      etiqueta: `Vencido (Regresó a precio normal)`
    };
  }

  return {
    activoEnTienda: true,
    pctEfectivo: pct,
    estado: fin ? 'vigente_temporal' : 'permanente',
    etiqueta: fin ? `-${pct}% (Vence ${isoAFechaInput(prod.descuento_fin)} 23:59)` : `-${pct}% activo`
  };
}

function evaluarVigenciaBanner(ban) {
  if (ban.estado !== 'Activo') {
    return { visibleEnWeb: false, etiqueta: 'Inhabilitado manualmente', clase: 'erp-badge--naranja' };
  }

  const ahora = new Date();
  const inicio = ban.fecha_inicio ? new Date(ban.fecha_inicio) : null;
  const fin = ban.fecha_expiracion ? new Date(ban.fecha_expiracion) : null;

  if (inicio && ahora < inicio) {
    return {
      visibleEnWeb: false,
      etiqueta: `Programado (Inicia ${isoAFechaInput(ban.fecha_inicio)})`,
      clase: 'erp-badge--amarillo'
    };
  }

  if (fin && ahora > fin) {
    return {
      visibleEnWeb: false,
      etiqueta: `Vencido (${isoAFechaInput(ban.fecha_expiracion)} 23:59)`,
      clase: 'erp-badge--naranja'
    };
  }

  return {
    visibleEnWeb: true,
    etiqueta: fin ? `En vivo · Vence ${isoAFechaInput(ban.fecha_expiracion)} 23:59` : 'En vivo en portada',
    clase: 'erp-badge--verde'
  };
}

export default function CatalogoAdminPage() {
  const supabase = createClient();

  const hoyStr = isoAFechaInput(new Date().toISOString());

  const [usuarioActual, setUsuarioActual] = useState({
    id_usuario: null,
    nombre: 'Administrador',
    correo: '',
    rol: 'admin'
  });

  const [tab, setTab] = useState('productos'); // 'productos' | 'borradores' | 'bajas' | 'banners' | 'auditoria'
  const [modoVista, setModoVista] = useState('categorias');
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [banners, setBanners] = useState([]);
  const [bitacora, setBitacora] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState(null);

  // Filtros de productos publicados en Tienda Web
  const [busqueda, setBusqueda] = useState('');
  const [filtroCat, setFiltroCat] = useState('todas');
  const [filtroMarca, setFiltroMarca] = useState('todas');
  const [filtroStock, setFiltroStock] = useState('todos');
  const [filtroOferta, setFiltroOferta] = useState('todos');
  const [ordenPor, setOrdenPor] = useState('categoria');
  const [paginaActual, setPaginaActual] = useState(1);
  const [porPagina, setPorPagina] = useState(24);
  const [categoriasExpandidas, setCategoriasExpandidas] = useState({});

  // Estado y filtros de pestaña Borradores
  const [busquedaBorradores, setBusquedaBorradores] = useState('');
  const [filtroCatBorradores, setFiltroCatBorradores] = useState('todas');
  const [filtroCalidadBorradores, setFiltroCalidadBorradores] = useState('todos'); // 'todos' | 'listos' | 'con_foto' | 'sin_foto' | 'sin_stock'
  const [paginaBorradores, setPaginaBorradores] = useState(1);
  const [porPaginaBorradores, setPorPaginaBorradores] = useState(24);
  const [seleccionBorradores, setSeleccionBorradores] = useState([]);
  const [subiendoFotoId, setSubiendoFotoId] = useState(null);
  const [dragOverBorradorId, setDragOverBorradorId] = useState(null);
  const [publicandoMasivo, setPublicandoMasivo] = useState(false);
  const [confirmandoEliminarBorradores, setConfirmandoEliminarBorradores] = useState(false);
  const [eliminandoBorradores, setEliminandoBorradores] = useState(false);
  const [prodPreviewWeb, setProdPreviewWeb] = useState(null);

  // Filtros de productos dados de baja
  const [busquedaBajas, setBusquedaBajas] = useState('');
  const [filtroMotivoBaja, setFiltroMotivoBaja] = useState('todos');

  // Filtros de Bitácora
  const [busquedaAuditoria, setBusquedaAuditoria] = useState('');
  const [filtroTipoAccion, setFiltroTipoAccion] = useState('todos');
  const [filtroUsuarioAuditoria, setFiltroUsuarioAuditoria] = useState('todos');

  // Paneles desplegables superiores ('descuentos_masivos' | 'alta_producto' | 'importar_excel' | null)
  const [panelAbierto, setPanelAbierto] = useState(null);
  const [mostrarFormBanner, setMostrarFormBanner] = useState(false);
  const [bannerEditandoId, setBannerEditandoId] = useState(null);

  // Motor de Descuentos Masivos con Vigencia Programada
  const [descMasivo, setDescMasivo] = useState({
    alcance: 'categoria',
    id_categoria: '',
    marca: 'Ricolino',
    porcentaje: 10,
    modalidadVigencia: 'programado',
    fecha_inicio: hoyStr,
    fecha_fin: ''
  });
  const [aplicandoDescuento, setAplicandoDescuento] = useState(false);

  // Inspector lateral de producto
  const [prodSeleccionado, setProdSeleccionado] = useState(null);
  const [cerrandoInspector, setCerrandoInspector] = useState(false);
  const [guardandoDetalle, setGuardandoDetalle] = useState(false);
  const [mostrarConfirmarBaja, setMostrarConfirmarBaja] = useState(false);
  const [datosBaja, setDatosBaja] = useState({
    motivo: MOTIVOS_BAJA[0],
    comentario: ''
  });

  const [subiendoBanner, setSubiendoBanner] = useState(false);

  const [nuevoProd, setNuevoProd] = useState({
    codigo_barras: '',
    nombre_dulce: '',
    descripcion: '',
    id_categoria: 1,
    marca: 'Ricolino',
    presentacion: 'Bolsa 1 kg',
    piezas_por_paquete: 0,
    etiqueta_web: 'normal',
    precio_unitario: '',
    porcentaje_descuento: 0,
    descuento_inicio: '',
    descuento_fin: '',
    tope_maximo_compra: 20,
    stock_web: 0,
    es_transaccional: true,
    publicado_web: false,
    imagen_url: ''
  });

  const [nuevoBanner, setNuevoBanner] = useState({
    titulo: '¡Gran Fiesta del Dulce!',
    porcentaje_descuento: 10,
    tag_corto: 'Promoción exclusiva',
    descripcion_banner: 'Aprovecha descuentos especiales en tus dulces favoritos por tiempo limitado.',
    destino: '#oferta',
    fecha_inicio: hoyStr,
    fecha_expiracion: '',
    imagen_banner_url: '',
    estado: 'Activo'
  });
  const [archivoBannerNuevo, setArchivoBannerNuevo] = useState(null);
  const [previewBannerNuevo, setPreviewBannerNuevo] = useState('');
  const [archivosBannersEdit, setArchivosBannersEdit] = useState({});
  const [previewsBannersEdit, setPreviewsBannersEdit] = useState({});
  const [bannerEnSimulador, setBannerEnSimulador] = useState(null);

  useEffect(() => {
    identificarUsuarioSesion();
    cargarDatos();
  }, []);

  useEffect(() => {
    setPaginaActual(1);
  }, [busqueda, filtroCat, filtroMarca, filtroStock, filtroOferta, ordenPor, porPagina]);

  useEffect(() => {
    setPaginaBorradores(1);
  }, [busquedaBorradores, filtroCatBorradores, filtroCalidadBorradores, porPaginaBorradores]);

  useEffect(() => {
    if (prodSeleccionado || prodPreviewWeb) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [prodSeleccionado, prodPreviewWeb]);

  function previsualizarBannerArriba(idBanner) {
    setBannerEnSimulador(idBanner);
    const contenedorSimulador = document.getElementById('simulador-banner-vivo');
    if (contenedorSimulador) {
      contenedorSimulador.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  async function identificarUsuarioSesion() {
    let perfilFinal = {
      id_usuario: null,
      nombre: 'Administrador',
      correo: '',
      rol: 'admin'
    };

    try {
      const guardada = localStorage.getItem('candy_erp_sesion');
      if (guardada) {
        const parsed = JSON.parse(guardada);
        perfilFinal = {
          id_usuario: parsed.id_usuario || null,
          nombre: parsed.nombre || parsed.nombre_completo || 'Colaborador',
          correo: parsed.correo || parsed.email || '',
          rol: parsed.rol || 'admin'
        };
      }
    } catch (_) {}

    try {
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user) {
        const { data: perfilDB } = await supabase
          .from('tbl_perfiles_usuarios')
          .select('*')
          .eq('id_usuario', authData.user.id)
          .single();

        if (perfilDB) {
          perfilFinal = {
            id_usuario: authData.user.id,
            nombre: perfilDB.nombre_completo || authData.user.email,
            correo: authData.user.email,
            rol: perfilDB.rol || perfilFinal.rol
          };
          localStorage.setItem('candy_erp_sesion', JSON.stringify(perfilFinal));
        }
      }
    } catch (_) {}

    setUsuarioActual(perfilFinal);
  }

  async function registrarEnBitacora({
    tipo_accion,
    id_referencia = '',
    nombre_referencia,
    descripcion_cambio,
    valor_anterior = null,
    valor_nuevo = null
  }) {
    await supabase.from('tbl_bitacora_auditoria').insert([{
      modulo: 'Catálogo y Precios',
      tipo_accion,
      id_referencia: String(id_referencia || ''),
      nombre_referencia,
      descripcion_cambio,
      valor_anterior,
      valor_nuevo,
      usuario_id: usuarioActual.id_usuario || null,
      usuario_nombre: usuarioActual.nombre,
      usuario_correo: usuarioActual.correo || null,
      usuario_rol: usuarioActual.rol || 'admin'
    }]);
  }

  function abrirInspectorProducto(prod) {
    setCerrandoInspector(false);
    setMostrarConfirmarBaja(false);
    setDatosBaja({
      motivo: prod.motivo_baja || MOTIVOS_BAJA[0],
      comentario: prod.comentario_baja || ''
    });
    setProdSeleccionado({
      ...prod,
      marca: normalizarMarca(prod.marca),
      piezas_por_paquete: Number(prod.piezas_por_paquete || 0),
      etiqueta_web: prod.etiqueta_web || 'normal',
      publicado_web: prod.publicado_web !== false,
      _fechaInicioInput: isoAFechaInput(prod.descuento_inicio),
      _fechaFinInput: isoAFechaInput(prod.descuento_fin)
    });
  }

  function cerrarInspector() {
    setCerrandoInspector(true);
    setTimeout(() => {
      setProdSeleccionado(null);
      setCerrandoInspector(false);
      setMostrarConfirmarBaja(false);
    }, 250);
  }

  async function cargarDatos() {
    setCargando(true);
    const [{ data: cats }, { data: prods }, { data: bans }, { data: logs }] = await Promise.all([
      supabase.from('tbl_categorias').select('*').order('id_categoria'),
      supabase.from('tbl_productos').select('*, tbl_categorias(nombre_categoria, slug)').order('id_producto'),
      supabase.from('tbl_promociones_banners').select('*').order('id_promocion'),
      supabase.from('tbl_bitacora_auditoria').select('*').order('fecha_registro', { ascending: false }).limit(250)
    ]);

    if (cats) {
      setCategorias(cats);
      if (!descMasivo.id_categoria && cats.length > 0) {
        setDescMasivo(prev => ({ ...prev, id_categoria: String(cats[0].id_categoria) }));
      }
    }
    if (prods) {
      setProductos(prods);
      const idsBorradoresVigentes = new Set(
        prods.filter(p => p.activo !== false && p.publicado_web === false).map(p => p.id_producto)
      );
      setSeleccionBorradores(prev => prev.filter(id => idsBorradoresVigentes.has(id)));
    }
    if (bans) {
      setBanners(bans);
      if (bans.length > 0 && bannerEnSimulador === null) {
        setBannerEnSimulador(bans[0].id_promocion);
      }
    }
    if (logs) setBitacora(logs);
    setCargando(false);
  }

  function notificar(texto, tipo = 'exito') {
    setMensaje({ texto, tipo, saliendo: false });
    setTimeout(() => {
      setMensaje(prev => (prev ? { ...prev, saliendo: true } : null));
    }, 2900);
    setTimeout(() => {
      setMensaje(null);
    }, 3200);
  }

  // Segmentación limpia del catálogo
  const productosPublicados = productos.filter(p => p.activo !== false && p.publicado_web !== false);
  const productosBorradores = productos.filter(p => p.activo !== false && p.publicado_web === false);
  const productosInactivos = productos.filter(p => p.activo === false);

  // Marcas comerciales
  const marcasComerciales = useMemo(() => {
    const limpias = productos
      .map(p => normalizarMarca(p.marca))
      .filter(m => m !== SIN_MARCA);

    return Array.from(new Set([...MARCAS_DISPONIBLES_BASE, ...limpias])).sort((a, b) =>
      a.localeCompare(b, 'es')
    );
  }, [productos]);

  // Destinos de banners dinámicos
  const destinosBanner = useMemo(() => {
    const base = [
      { valor: '#oferta', etiqueta: 'Promoción: Productos con descuento activo (Buen Fin / Ofertas)' },
      { valor: '#catalogo', etiqueta: 'Catálogo completo (Todos los productos)' },
      { valor: '#pinata', etiqueta: 'Sección: Armador de Piñata interactivo' },
      { valor: '#aguinaldos', etiqueta: 'Sección: Armador de Aguinaldos (Bolsitas)' }
    ];

    const deCategorias = categorias.map(c => ({
      valor: `#cat:${c.slug || c.nombre_categoria.toLowerCase()}`,
      etiqueta: `Categoría: ${c.nombre_categoria}`
    }));

    const deMarcas = marcasComerciales.map(m => ({
      valor: `#marca:${m}`,
      etiqueta: `Marca: ${m}`
    }));

    return [...base, ...deCategorias, ...deMarcas];
  }, [categorias, marcasComerciales]);

  const opcionesDestinoBanner = useMemo(
    () => destinosBanner.map(d => ({ value: d.valor, label: d.etiqueta })),
    [destinosBanner]
  );

  const resolverImagenProducto = url => {
    if (!url) return '/img/ICONO.png';
    if (url.startsWith('blob:') || url.startsWith('http') || url.startsWith('data:')) return url;
    return `/${url.replace(/^\//, '')}`;
  };

  const esUrlImagenFondo = url => {
    if (!url) return false;
    return (
      url.startsWith('http') ||
      url.startsWith('blob:') ||
      url.startsWith('data:') ||
      url.startsWith('/img/') ||
      url.startsWith('img/')
    );
  };

  const construirEstiloFondoBanner = (urlImagen, indice = 0) => {
    if (esUrlImagenFondo(urlImagen)) {
      const rutaLimpia = urlImagen.startsWith('img/') ? `/${urlImagen}` : urlImagen;
      return {
        backgroundImage: `linear-gradient(90deg, rgba(20, 8, 32, 0.72) 0%, rgba(20, 8, 32, 0.28) 65%, rgba(20, 8, 32, 0.15) 100%), url("${rutaLimpia}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      };
    }
    return {
      backgroundImage: FONDOS_ORIGINALES[indice % FONDOS_ORIGINALES.length]
    };
  };

  /* ─────────── FILTRADO DE PRODUCTOS EN TIENDA WEB ─────────── */
  const productosFiltrados = productosPublicados
    .filter(p => {
      if (filtroCat !== 'todas' && String(p.id_categoria) !== String(filtroCat)) return false;

      const marcaNorm = normalizarMarca(p.marca);
      if (filtroMarca !== 'todas' && marcaNorm.toLowerCase() !== filtroMarca.toLowerCase()) return false;

      const stock = Number(p.stock_web || 0);
      if (filtroStock === 'disponible' && stock <= 0) return false;
      if (filtroStock === 'bajo' && (stock <= 0 || stock > 10)) return false;
      if (filtroStock === 'agotado' && stock > 0) return false;

      const vig = evaluarVigenciaDescuento(p);
      const piezas = Number(p.piezas_por_paquete || 0);
      const slugCat = p.tbl_categorias?.slug || '';

      if (filtroOferta === 'con_descuento' && !vig.activoEnTienda) return false;
      if (filtroOferta === 'sin_descuento' && vig.activoEnTienda) return false;
      if (filtroOferta === 'vencidos' && vig.estado !== 'vencido') return false;
      if (filtroOferta === 'aguinaldos' && !(piezas > 0 && slugCat !== 'fiesta')) return false;
      if (filtroOferta === 'sin_piezas' && piezas > 0) return false;
      if (filtroOferta === 'top' && p.etiqueta_web !== 'top') return false;
      if (filtroOferta === 'nuevo' && p.etiqueta_web !== 'nuevo') return false;

      if (busqueda.trim()) {
        const texto = `${p.codigo_barras} ${p.nombre_dulce} ${marcaNorm} ${p.presentacion || ''}`.toLowerCase();
        if (!texto.includes(busqueda.trim().toLowerCase())) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (ordenPor === 'nombre') return a.nombre_dulce.localeCompare(b.nombre_dulce, 'es');
      if (ordenPor === 'precio_asc') return Number(a.precio_unitario) - Number(b.precio_unitario);
      if (ordenPor === 'precio_desc') return Number(b.precio_unitario) - Number(a.precio_unitario);
      if (ordenPor === 'stock_asc') return Number(a.stock_web) - Number(b.stock_web);
      if (ordenPor === 'descuento_desc') return Number(b.porcentaje_descuento || 0) - Number(a.porcentaje_descuento || 0);
      return Number(a.id_categoria) - Number(b.id_categoria) || a.id_producto - b.id_producto;
    });

  const totalPaginas = Math.max(1, Math.ceil(productosFiltrados.length / porPagina));
  const pagSegura = Math.min(paginaActual, totalPaginas);
  const indiceInicio = (pagSegura - 1) * porPagina;
  const productosPaginados = productosFiltrados.slice(indiceInicio, indiceInicio + porPagina);

  const hayFiltrosActivos =
    busqueda !== '' ||
    filtroCat !== 'todas' ||
    filtroMarca !== 'todas' ||
    filtroStock !== 'todos' ||
    filtroOferta !== 'todos';

  function limpiarFiltros() {
    setBusqueda('');
    setFiltroCat('todas');
    setFiltroMarca('todas');
    setFiltroStock('todos');
    setFiltroOferta('todos');
    setOrdenPor('categoria');
    setPaginaActual(1);
  }

  /* ─────────── FILTRADO Y MÉTRICAS DE BORRADORES ─────────── */
  const resumenBorradores = useMemo(() => {
    let listos = 0;
    let conFoto = 0;
    let sinFoto = 0;
    let sinStock = 0;

    productosBorradores.forEach(p => {
      const foto = tieneFotoReal(p);
      const stock = Number(p.stock_web || 0) > 0;
      if (foto) conFoto++;
      else sinFoto++;
      if (!stock) sinStock++;
      if (foto && stock) listos++;
    });

    return { listos, conFoto, sinFoto, sinStock };
  }, [productosBorradores]);

  const borradoresFiltrados = productosBorradores
    .filter(p => {
      if (filtroCatBorradores !== 'todas' && String(p.id_categoria) !== String(filtroCatBorradores)) return false;

      const foto = tieneFotoReal(p);
      const stock = Number(p.stock_web || 0) > 0;

      if (filtroCalidadBorradores === 'listos' && !(foto && stock)) return false;
      if (filtroCalidadBorradores === 'con_foto' && !foto) return false;
      if (filtroCalidadBorradores === 'sin_foto' && foto) return false;
      if (filtroCalidadBorradores === 'sin_stock' && stock) return false;

      if (busquedaBorradores.trim()) {
        const marcaNorm = normalizarMarca(p.marca);
        const txt = `${p.codigo_barras} ${p.nombre_dulce} ${marcaNorm} ${p.presentacion || ''}`.toLowerCase();
        if (!txt.includes(busquedaBorradores.trim().toLowerCase())) return false;
      }
      return true;
    })
    .sort((a, b) => b.id_producto - a.id_producto);

  const totalPagBorradores = Math.max(1, Math.ceil(borradoresFiltrados.length / porPaginaBorradores));
  const pagBorrSegura = Math.min(paginaBorradores, totalPagBorradores);
  const inicioBorradores = (pagBorrSegura - 1) * porPaginaBorradores;
  const borradoresPaginados = borradoresFiltrados.slice(inicioBorradores, inicioBorradores + porPaginaBorradores);

  function toggleSeleccionBorrador(idProducto) {
    setConfirmandoEliminarBorradores(false);
    setSeleccionBorradores(prev =>
      prev.includes(idProducto) ? prev.filter(x => x !== idProducto) : [...prev, idProducto]
    );
  }

  function seleccionarGrupoBorradores(tipo) {
    setConfirmandoEliminarBorradores(false);
    if (tipo === 'ninguno') {
      setSeleccionBorradores([]);
      return;
    }
    if (tipo === 'todos_filtrados') {
      setSeleccionBorradores(borradoresFiltrados.map(p => p.id_producto));
      return;
    }
    if (tipo === 'con_foto') {
      const ids = borradoresFiltrados.filter(p => tieneFotoReal(p)).map(p => p.id_producto);
      setSeleccionBorradores(ids);
      if (ids.length === 0) notificar('Ningún borrador filtrado tiene fotografía todavía', 'error');
      return;
    }
    if (tipo === 'listos') {
      const ids = borradoresFiltrados
        .filter(p => tieneFotoReal(p) && Number(p.stock_web || 0) > 0)
        .map(p => p.id_producto);
      setSeleccionBorradores(ids);
      if (ids.length === 0) notificar('Aún no hay borradores con foto y stock PEPS mayor a 0', 'error');
    }
  }

  async function publicarBorradores(listaProductos) {
    if (!listaProductos || listaProductos.length === 0) return;

    setPublicandoMasivo(true);
    const ids = listaProductos.map(p => p.id_producto);
    const ahoraIso = new Date().toISOString();

    const { error } = await supabase
      .from('tbl_productos')
      .update({
        publicado_web: true,
        ultima_modificacion_por: usuarioActual.nombre,
        fecha_ultima_modificacion: ahoraIso
      })
      .in('id_producto', ids);

    setPublicandoMasivo(false);

    if (error) {
      notificar('Error al publicar en Tienda Web: ' + error.message, 'error');
      return;
    }

    const esUno = listaProductos.length === 1;
    await registrarEnBitacora({
      tipo_accion: 'VISIBILIDAD_WEB',
      id_referencia: esUno ? (listaProductos[0].codigo_barras || listaProductos[0].id_producto) : 'lote_borradores',
      nombre_referencia: esUno ? listaProductos[0].nombre_dulce : `${ids.length} productos publicados`,
      descripcion_cambio: esUno
        ? `Publicó "${listaProductos[0].nombre_dulce}" desde Borradores hacia la Tienda Web`
        : `Publicó en la Tienda Web ${ids.length} productos desde la bandeja de Borradores`,
      valor_anterior: 'Borrador (Solo SIGE Candy)',
      valor_nuevo: 'Publicado en Tienda Web'
    });

    setSeleccionBorradores(prev => prev.filter(id => !ids.includes(id)));
    if (prodPreviewWeb && ids.includes(prodPreviewWeb.id_producto)) {
      setProdPreviewWeb(null);
    }

    notificar(
      esUno
        ? `"${listaProductos[0].nombre_dulce}" ya está visible en la tienda en línea`
        : `${ids.length} productos publicados en la tienda en línea`
    );
    cargarDatos();
  }

  async function eliminarBorradoresSeleccionados() {
    if (seleccionBorradores.length === 0) return;

    setEliminandoBorradores(true);
    const ids = [...seleccionBorradores];
    const nombresRef = productosBorradores
      .filter(p => ids.includes(p.id_producto))
      .slice(0, 3)
      .map(p => p.nombre_dulce)
      .join(', ');

    const { error } = await supabase
      .from('tbl_productos')
      .delete()
      .in('id_producto', ids)
      .eq('publicado_web', false);

    setEliminandoBorradores(false);
    setConfirmandoEliminarBorradores(false);

    if (error) {
      notificar(
        'No se pudieron eliminar algunos borradores porque ya tienen historial en almacén o pedidos. Usa "Dar de baja" en su lugar.',
        'error'
      );
      return;
    }

    await registrarEnBitacora({
      tipo_accion: 'ELIMINACION_BORRADOR',
      id_referencia: 'borradores',
      nombre_referencia: `${ids.length} borrador(es) eliminados`,
      descripcion_cambio: `Eliminó ${ids.length} producto(s) sin publicar desde Borradores (${nombresRef}${ids.length > 3 ? '...' : ''})`,
      valor_anterior: 'Borrador (Solo SIGE Candy)',
      valor_nuevo: 'Eliminado'
    });

    setSeleccionBorradores([]);
    notificar(`${ids.length} borrador(es) eliminados correctamente`);
    cargarDatos();
  }

  async function subirFotoRapidaBorrador(archivo, prod) {
    if (!archivo || !prod) return;
    setSubiendoFotoId(prod.id_producto);

    try {
      const urlPublica = await subirArchivoStorageConRespaldo(archivo, 'productos');
      const ahoraIso = new Date().toISOString();

      const { error } = await supabase
        .from('tbl_productos')
        .update({
          imagen_url: urlPublica,
          ultima_modificacion_por: usuarioActual.nombre,
          fecha_ultima_modificacion: ahoraIso
        })
        .eq('id_producto', prod.id_producto);

      if (error) throw new Error(error.message);

      setProductos(prev =>
        prev.map(item =>
          item.id_producto === prod.id_producto
            ? {
                ...item,
                imagen_url: urlPublica,
                ultima_modificacion_por: usuarioActual.nombre,
                fecha_ultima_modificacion: ahoraIso
              }
            : item
        )
      );

      await registrarEnBitacora({
        tipo_accion: 'EDICION_PRECIO_DATOS',
        id_referencia: prod.codigo_barras || prod.id_producto,
        nombre_referencia: prod.nombre_dulce,
        descripcion_cambio: 'Subió fotografía rápida desde la bandeja de Borradores',
        valor_anterior: prod.imagen_url ? 'Fotografía previa' : 'Sin fotografía',
        valor_nuevo: 'Fotografía cargada'
      });

      notificar(`Foto guardada en "${prod.nombre_dulce}"`);
    } catch (err) {
      notificar('Error al subir foto: ' + err.message, 'error');
    } finally {
      setSubiendoFotoId(null);
    }
  }

  /* ─────────── DESCUENTOS MASIVOS ─────────── */
  const obtenerProductosObjetivoDescuento = () => {
    if (descMasivo.alcance === 'todos') return productosPublicados;
    if (descMasivo.alcance === 'filtrados') return productosFiltrados;
    if (descMasivo.alcance === 'categoria') {
      return productosPublicados.filter(p => String(p.id_categoria) === String(descMasivo.id_categoria));
    }
    if (descMasivo.alcance === 'marca') {
      return productosPublicados.filter(p => normalizarMarca(p.marca).toLowerCase() === descMasivo.marca.toLowerCase());
    }
    return [];
  };

  const productosObjetivo = obtenerProductosObjetivoDescuento();

  async function ejecutarDescuentoMasivo(porcentajeExplicito = null) {
    const pct = porcentajeExplicito !== null
      ? Number(porcentajeExplicito)
      : Math.max(0, Math.min(90, Number(descMasivo.porcentaje || 0)));

    if (productosObjetivo.length === 0) {
      notificar('No hay productos publicados dentro del criterio seleccionado', 'error');
      return;
    }

    if (pct > 0 && descMasivo.modalidadVigencia === 'programado' && !descMasivo.fecha_fin) {
      notificar('Selecciona la fecha límite en que finalizará la promoción a las 23:59 hrs', 'error');
      return;
    }

    setAplicandoDescuento(true);
    const idsObjetivo = productosObjetivo.map(p => p.id_producto);
    const ahoraIso = new Date().toISOString();

    const isoInicio = pct > 0 && descMasivo.modalidadVigencia === 'programado' && descMasivo.fecha_inicio
      ? fechaInputAIso(descMasivo.fecha_inicio, false)
      : null;
    const isoFin = pct > 0 && descMasivo.modalidadVigencia === 'programado' && descMasivo.fecha_fin
      ? fechaInputAIso(descMasivo.fecha_fin, true)
      : null;

    const { error } = await supabase
      .from('tbl_productos')
      .update({
        porcentaje_descuento: pct,
        descuento_inicio: isoInicio,
        descuento_fin: isoFin,
        ultima_modificacion_por: usuarioActual.nombre,
        fecha_ultima_modificacion: ahoraIso
      })
      .in('id_producto', idsObjetivo);

    setAplicandoDescuento(false);

    if (error) {
      notificar('Error al aplicar descuento: ' + error.message, 'error');
    } else {
      let etiquetaGrupo = 'Todo el catálogo publicado';
      if (descMasivo.alcance === 'categoria') {
        const c = categorias.find(x => String(x.id_categoria) === String(descMasivo.id_categoria));
        etiquetaGrupo = `Categoría ${c?.nombre_categoria || ''}`;
      } else if (descMasivo.alcance === 'marca') {
        etiquetaGrupo = `Marca ${descMasivo.marca}`;
      } else if (descMasivo.alcance === 'filtrados') {
        etiquetaGrupo = 'Filtro personalizado';
      }

      const detalleVigencia = isoFin
        ? ` (Vigente hasta ${descMasivo.fecha_fin} a las 23:59 hrs)`
        : ' (Vigencia permanente)';

      await registrarEnBitacora({
        tipo_accion: 'DESCUENTO_MASIVO',
        id_referencia: descMasivo.alcance,
        nombre_referencia: `${etiquetaGrupo} (${idsObjetivo.length} productos)`,
        descripcion_cambio: pct === 0
          ? `Restauró precios a regular (0% descuento) en ${idsObjetivo.length} productos`
          : `Aplicó descuento del ${pct}% a ${idsObjetivo.length} productos${detalleVigencia}`,
        valor_anterior: 'Precio regular',
        valor_nuevo: pct === 0 ? '0% descuento' : `-${pct}%${isoFin ? ` hasta ${descMasivo.fecha_fin} 23:59` : ''}`
      });

      const etiquetaAccion = pct === 0
        ? `Se restauró el precio original en ${idsObjetivo.length} productos`
        : `Descuento del ${pct}% guardado en ${idsObjetivo.length} productos${detalleVigencia}`;
      notificar(etiquetaAccion);
      cargarDatos();
    }
  }

  function abrirDescuentoParaCategoria(idCat) {
    setDescMasivo(prev => ({
      ...prev,
      alcance: 'categoria',
      id_categoria: String(idCat),
      porcentaje: prev.porcentaje || 10
    }));
    setPanelAbierto('descuentos_masivos');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ─────────── GUARDAR / BAJA / REACTIVAR / CREAR PRODUCTO ─────────── */
  async function guardarCambiosProducto(prod) {
    setGuardandoDetalle(true);
    const original = productos.find(item => item.id_producto === prod.id_producto) || {};
    const precioMayoreo = Number((Number(prod.precio_unitario) * 0.95).toFixed(2));
    const ahoraIso = new Date().toISOString();

    const pctNum = Number(prod.porcentaje_descuento || 0);
    const piezasNum = Math.max(0, Math.round(Number(prod.piezas_por_paquete || 0)));
    const etiquetaNueva = prod.etiqueta_web || 'normal';
    const marcaNueva = normalizarMarca(prod.marca);
    const marcaOriginal = normalizarMarca(original.marca);
    const publicadoNuevo = prod.publicado_web !== false;
    const publicadoOriginal = original.publicado_web !== false;

    const isoInicio = pctNum > 0 && prod._fechaInicioInput ? fechaInputAIso(prod._fechaInicioInput, false) : null;
    const isoFin = pctNum > 0 && prod._fechaFinInput ? fechaInputAIso(prod._fechaFinInput, true) : null;

    const cambiosDetectados = [];
    const valoresAntes = [];
    const valoresNuevos = [];

    if (Number(original.precio_unitario) !== Number(prod.precio_unitario)) {
      cambiosDetectados.push('Precio unitario');
      valoresAntes.push(`Precio: $${Number(original.precio_unitario).toFixed(2)}`);
      valoresNuevos.push(`Precio: $${Number(prod.precio_unitario).toFixed(2)}`);
    }
    if (Number(original.porcentaje_descuento || 0) !== pctNum) {
      cambiosDetectados.push('% Descuento');
      valoresAntes.push(`Desc: ${original.porcentaje_descuento || 0}%`);
      valoresNuevos.push(`Desc: ${pctNum}%`);
    }
    if (isoAFechaInput(original.descuento_fin) !== (prod._fechaFinInput || '')) {
      cambiosDetectados.push('Vigencia de oferta');
      valoresAntes.push(original.descuento_fin ? `Vencía: ${isoAFechaInput(original.descuento_fin)}` : 'Sin fecha límite');
      valoresNuevos.push(prod._fechaFinInput ? `Vence: ${prod._fechaFinInput} 23:59` : 'Permanente');
    }
    if (Number(original.piezas_por_paquete || 0) !== piezasNum) {
      cambiosDetectados.push('Piezas por paquete (Aguinaldos)');
      valoresAntes.push(`${original.piezas_por_paquete || 0} pzas`);
      valoresNuevos.push(`${piezasNum} pzas`);
    }
    if ((original.etiqueta_web || 'normal') !== etiquetaNueva) {
      cambiosDetectados.push('Destacado en tienda');
      valoresAntes.push(`Etiqueta: ${original.etiqueta_web || 'normal'}`);
      valoresNuevos.push(`Etiqueta: ${etiquetaNueva}`);
    }
    if (publicadoOriginal !== publicadoNuevo) {
      cambiosDetectados.push('Visibilidad en tienda web');
      valoresAntes.push(publicadoOriginal ? 'Publicado en web' : 'Borrador (Solo SIGE)');
      valoresNuevos.push(publicadoNuevo ? 'Publicado en web' : 'Borrador (Solo SIGE)');
    }
    if (Number(original.stock_web || 0) !== Number(prod.stock_web || 0)) {
      cambiosDetectados.push('Existencia web');
      valoresAntes.push(`Stock: ${original.stock_web || 0}`);
      valoresNuevos.push(`Stock: ${prod.stock_web || 0}`);
    }
    if ((original.nombre_dulce || '') !== (prod.nombre_dulce || '')) {
      cambiosDetectados.push('Nombre');
      valoresAntes.push(original.nombre_dulce);
      valoresNuevos.push(prod.nombre_dulce);
    }
    if (marcaOriginal !== marcaNueva) {
      cambiosDetectados.push('Marca');
      valoresAntes.push(`Marca: ${marcaOriginal}`);
      valoresNuevos.push(`Marca: ${marcaNueva}`);
    }
    if ((original.presentacion || '') !== (prod.presentacion || '')) {
      cambiosDetectados.push('Presentación');
      valoresAntes.push(original.presentacion);
      valoresNuevos.push(prod.presentacion);
    }
    if ((original.descripcion || '') !== (prod.descripcion || '')) {
      cambiosDetectados.push('Descripción');
      valoresAntes.push('Descripción previa');
      valoresNuevos.push('Descripción actualizada');
    }
    if (Boolean(original.es_transaccional) !== Boolean(prod.es_transaccional)) {
      cambiosDetectados.push('Modalidad de venta');
      valoresAntes.push(original.es_transaccional ? 'Checkout en línea' : 'Cotización');
      valoresNuevos.push(prod.es_transaccional ? 'Checkout en línea' : 'Cotización');
    }
    if ((original.imagen_url || '') !== (prod.imagen_url || '')) {
      cambiosDetectados.push('Fotografía');
    }

    const { error } = await supabase
      .from('tbl_productos')
      .update({
        codigo_barras: prod.codigo_barras,
        nombre_dulce: prod.nombre_dulce,
        descripcion: prod.descripcion || '',
        id_categoria: Number(prod.id_categoria),
        marca: marcaParaDB(prod.marca),
        presentacion: prod.presentacion,
        piezas_por_paquete: piezasNum,
        etiqueta_web: etiquetaNueva,
        publicado_web: publicadoNuevo,
        precio_unitario: Number(prod.precio_unitario),
        precio_mayoreo_5_mas: precioMayoreo,
        porcentaje_descuento: pctNum,
        descuento_inicio: isoInicio,
        descuento_fin: isoFin,
        tope_maximo_compra: Number(prod.tope_maximo_compra || 20),
        stock_web: Number(prod.stock_web || 0),
        es_transaccional: prod.es_transaccional,
        imagen_url: prod.imagen_url || null,
        ultima_modificacion_por: usuarioActual.nombre,
        fecha_ultima_modificacion: ahoraIso
      })
      .eq('id_producto', prod.id_producto);

    setGuardandoDetalle(false);

    if (error) {
      notificar('Error al guardar cambios: ' + error.message, 'error');
    } else {
      if (cambiosDetectados.length > 0) {
        await registrarEnBitacora({
          tipo_accion: cambiosDetectados.length === 1 && cambiosDetectados[0] === 'Visibilidad en tienda web'
            ? 'VISIBILIDAD_WEB'
            : 'EDICION_PRECIO_DATOS',
          id_referencia: prod.codigo_barras || prod.id_producto,
          nombre_referencia: prod.nombre_dulce,
          descripcion_cambio: `Actualizó ${cambiosDetectados.join(', ')}`,
          valor_anterior: valoresAntes.join(' · ') || 'Valores previos',
          valor_nuevo: valoresNuevos.join(' · ') || 'Valores actualizados'
        });
      }

      notificar(`Cambios guardados en "${prod.nombre_dulce}"`);
      cerrarInspector();
      cargarDatos();
    }
  }

  async function confirmarBajaProducto(prod) {
    if (!datosBaja.motivo) {
      notificar('Selecciona un motivo para dar de baja el producto', 'error');
      return;
    }

    setGuardandoDetalle(true);
    const ahoraIso = new Date().toISOString();

    const { error } = await supabase
      .from('tbl_productos')
      .update({
        activo: false,
        motivo_baja: datosBaja.motivo,
        comentario_baja: datosBaja.comentario.trim() || null,
        fecha_baja: ahoraIso,
        baja_por: usuarioActual.nombre,
        ultima_modificacion_por: usuarioActual.nombre,
        fecha_ultima_modificacion: ahoraIso
      })
      .eq('id_producto', prod.id_producto);

    setGuardandoDetalle(false);

    if (error) {
      notificar('Error al dar de baja: ' + error.message, 'error');
    } else {
      await registrarEnBitacora({
        tipo_accion: 'BAJA_LOGICA',
        id_referencia: prod.codigo_barras || prod.id_producto,
        nombre_referencia: prod.nombre_dulce,
        descripcion_cambio: `Dio de baja del catálogo por: ${datosBaja.motivo}${datosBaja.comentario ? ` (${datosBaja.comentario.trim()})` : ''}`,
        valor_anterior: prod.publicado_web === false ? 'Estado: Borrador' : 'Estado: En Tienda Web',
        valor_nuevo: `Baja (${datosBaja.motivo})`
      });

      notificar(`"${prod.nombre_dulce}" fue dado de baja y movido al apartado de Dados de Baja`);
      cerrarInspector();
      cargarDatos();
    }
  }

  async function reactivarProducto(prod, desdeDrawer = false) {
    const ahoraIso = new Date().toISOString();

    const { error } = await supabase
      .from('tbl_productos')
      .update({
        activo: true,
        motivo_baja: null,
        comentario_baja: null,
        fecha_baja: null,
        baja_por: null,
        ultima_modificacion_por: usuarioActual.nombre,
        fecha_ultima_modificacion: ahoraIso
      })
      .eq('id_producto', prod.id_producto);

    if (error) {
      notificar('Error al republicar producto: ' + error.message, 'error');
    } else {
      await registrarEnBitacora({
        tipo_accion: 'REACTIVACION',
        id_referencia: prod.codigo_barras || prod.id_producto,
        nombre_referencia: prod.nombre_dulce,
        descripcion_cambio: `Reactivó el producto (Precio: $${Number(prod.precio_unitario).toFixed(2)})`,
        valor_anterior: `Inactivo (${prod.motivo_baja || 'Archivado'})`,
        valor_nuevo: prod.publicado_web === false ? 'Activo en Borradores' : 'Activo en Tienda Web'
      });

      notificar(
        prod.publicado_web === false
          ? `"${prod.nombre_dulce}" regresó a Borradores`
          : `"${prod.nombre_dulce}" fue reactivado en Tienda Web`
      );
      if (desdeDrawer) cerrarInspector();
      cargarDatos();
    }
  }

  const archivoADataUrl = file =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  async function subirArchivoStorageConRespaldo(archivo, carpeta = 'productos') {
    const ext = archivo.name.split('.').pop();
    const nombreArchivo = `${carpeta}/media_${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('multimedia-candy')
      .upload(nombreArchivo, archivo, { upsert: true });

    if (!uploadError) {
      const { data } = supabase.storage.from('multimedia-candy').getPublicUrl(nombreArchivo);
      return data.publicUrl;
    }
    return await archivoADataUrl(archivo);
  }

  async function subirFotoProducto(archivo, esInspector = false) {
    if (!archivo) return;

    try {
      const urlPublica = await subirArchivoStorageConRespaldo(archivo, 'productos');
      if (esInspector && prodSeleccionado) {
        setProdSeleccionado(prev => ({ ...prev, imagen_url: urlPublica }));
        notificar('Fotografía cargada · Presiona "Guardar Cambios"');
      } else {
        setNuevoProd(prev => ({ ...prev, imagen_url: urlPublica }));
        notificar('Fotografía lista para el nuevo producto');
      }
    } catch (err) {
      notificar('Error al procesar la imagen: ' + err.message, 'error');
    }
  }

  async function crearProducto(e) {
    e.preventDefault();
    const precioUnit = Number(nuevoProd.precio_unitario);
    const pctNum = Number(nuevoProd.porcentaje_descuento || 0);
    const piezasNum = Math.max(0, Math.round(Number(nuevoProd.piezas_por_paquete || 0)));
    const publicadoWeb = nuevoProd.publicado_web !== false;
    const ahoraIso = new Date().toISOString();

    const { error } = await supabase.from('tbl_productos').insert([{
      codigo_barras: nuevoProd.codigo_barras,
      nombre_dulce: nuevoProd.nombre_dulce,
      descripcion: nuevoProd.descripcion,
      id_categoria: nuevoProd.id_categoria,
      marca: marcaParaDB(nuevoProd.marca),
      presentacion: nuevoProd.presentacion,
      piezas_por_paquete: piezasNum,
      etiqueta_web: nuevoProd.etiqueta_web || 'normal',
      publicado_web: publicadoWeb,
      precio_unitario: precioUnit,
      precio_mayoreo_5_mas: Number((precioUnit * 0.95).toFixed(2)),
      porcentaje_descuento: pctNum,
      descuento_inicio: pctNum > 0 && nuevoProd.descuento_inicio ? fechaInputAIso(nuevoProd.descuento_inicio, false) : null,
      descuento_fin: pctNum > 0 && nuevoProd.descuento_fin ? fechaInputAIso(nuevoProd.descuento_fin, true) : null,
      tope_maximo_compra: Number(nuevoProd.tope_maximo_compra),
      stock_web: Number(nuevoProd.stock_web),
      es_transaccional: nuevoProd.es_transaccional,
      imagen_url: nuevoProd.imagen_url || null,
      activo: true,
      ultima_modificacion_por: usuarioActual.nombre,
      fecha_ultima_modificacion: ahoraIso
    }]);

    if (error) {
      notificar('Error al crear producto: ' + error.message, 'error');
    } else {
      await registrarEnBitacora({
        tipo_accion: 'ALTA_PRODUCTO',
        id_referencia: nuevoProd.codigo_barras,
        nombre_referencia: nuevoProd.nombre_dulce,
        descripcion_cambio: `Registró nuevo producto (${normalizarMarca(nuevoProd.marca)} · ${nuevoProd.presentacion}${piezasNum > 0 ? ` · ${piezasNum} pzas/paq` : ''}${publicadoWeb ? ' · Publicado en web' : ' · Borrador Solo SIGE Candy'})`,
        valor_anterior: 'Nuevo registro',
        valor_nuevo: `Precio: $${precioUnit.toFixed(2)} · Stock: ${nuevoProd.stock_web}`
      });

      notificar(
        publicadoWeb
          ? `Producto "${nuevoProd.nombre_dulce}" publicado en la Tienda Web`
          : `Producto "${nuevoProd.nombre_dulce}" guardado en Borradores`
      );
      setPanelAbierto(null);
      setNuevoProd({
        codigo_barras: '',
        nombre_dulce: '',
        descripcion: '',
        id_categoria: categorias[0]?.id_categoria || 1,
        marca: 'Ricolino',
        presentacion: 'Bolsa 1 kg',
        piezas_por_paquete: 0,
        etiqueta_web: 'normal',
        precio_unitario: '',
        porcentaje_descuento: 0,
        descuento_inicio: '',
        descuento_fin: '',
        tope_maximo_compra: 20,
        stock_web: 0,
        es_transaccional: true,
        publicado_web: false,
        imagen_url: ''
      });
      cargarDatos();
    }
  }

  /* ─────────── BANNERS ─────────── */
  function seleccionarFondoBannerLocal(archivo, idPromocion = null) {
    if (!archivo) return;

    const urlTemporal = URL.createObjectURL(archivo);

    if (idPromocion === null) {
      setArchivoBannerNuevo(archivo);
      setPreviewBannerNuevo(urlTemporal);
      previsualizarBannerArriba('nuevo');
      notificar('Imagen aplicada como fondo en la Vista Previa');
    } else {
      setArchivosBannersEdit(prev => ({ ...prev, [idPromocion]: archivo }));
      setPreviewsBannersEdit(prev => ({ ...prev, [idPromocion]: urlTemporal }));
      previsualizarBannerArriba(idPromocion);
      notificar('Vista previa lista · Presiona "Guardar Cambios" en el banner');
    }
  }

  async function crearBanner(e) {
    e.preventDefault();
    setSubiendoBanner(true);

    try {
      let urlFondo = nuevoBanner.destino || '#catalogo';
      if (archivoBannerNuevo) {
        urlFondo = await subirArchivoStorageConRespaldo(archivoBannerNuevo, 'banners');
      }

      const unAnio = new Date();
      unAnio.setFullYear(unAnio.getFullYear() + 1);

      const isoInicio = nuevoBanner.fecha_inicio
        ? fechaInputAIso(nuevoBanner.fecha_inicio, false)
        : new Date().toISOString();

      const isoExpira = nuevoBanner.fecha_expiracion
        ? fechaInputAIso(nuevoBanner.fecha_expiracion, true)
        : unAnio.toISOString();

      const leyendaCompleta = componerLeyendaBanner(
        nuevoBanner.tag_corto,
        nuevoBanner.descripcion_banner,
        nuevoBanner.destino
      );

      const { data: insertado, error } = await supabase
        .from('tbl_promociones_banners')
        .insert([{
          titulo: nuevoBanner.titulo,
          codigo_cupon: null,
          porcentaje_descuento: Number(nuevoBanner.porcentaje_descuento || 0),
          imagen_banner_url: urlFondo,
          leyenda_exclusividad: leyendaCompleta,
          fecha_inicio: isoInicio,
          fecha_expiracion: isoExpira,
          estado: nuevoBanner.estado
        }])
        .select()
        .single();

      if (error) throw new Error(error.message);

      const nombreDestino = destinosBanner.find(d => d.valor === nuevoBanner.destino)?.etiqueta || nuevoBanner.destino;

      await registrarEnBitacora({
        tipo_accion: 'EDICION_BANNER',
        id_referencia: insertado?.id_promocion || '',
        nombre_referencia: nuevoBanner.titulo,
        descripcion_cambio: `Publicó nuevo banner (Vence: ${nuevoBanner.fecha_expiracion ? `${nuevoBanner.fecha_expiracion} 23:59` : 'Anual'})`,
        valor_anterior: 'Nuevo banner',
        valor_nuevo: `${nuevoBanner.titulo} → ${nombreDestino}`
      });

      notificar('Nuevo Banner publicado en la tienda web');
      setArchivoBannerNuevo(null);
      setPreviewBannerNuevo('');
      setMostrarFormBanner(false);
      if (insertado) previsualizarBannerArriba(insertado.id_promocion);
      cargarDatos();
    } catch (err) {
      notificar('Error al publicar banner: ' + err.message, 'error');
    } finally {
      setSubiendoBanner(false);
    }
  }

  async function actualizarBanner(ban) {
    setSubiendoBanner(true);
    try {
      let urlFondo = ban.imagen_banner_url;
      const archivoPendiente = archivosBannersEdit[ban.id_promocion];

      if (archivoPendiente) {
        urlFondo = await subirArchivoStorageConRespaldo(archivoPendiente, 'banners');
      }

      const { destino } = descomponerLeyendaBanner(ban.leyenda_exclusividad, ban.imagen_banner_url);
      if (!esUrlImagenFondo(urlFondo)) {
        urlFondo = destino || '#catalogo';
      }

      const { error } = await supabase
        .from('tbl_promociones_banners')
        .update({
          titulo: ban.titulo,
          porcentaje_descuento: Number(ban.porcentaje_descuento || 0),
          leyenda_exclusividad: ban.leyenda_exclusividad,
          imagen_banner_url: urlFondo,
          fecha_inicio: ban.fecha_inicio,
          fecha_expiracion: ban.fecha_expiracion,
          estado: ban.estado
        })
        .eq('id_promocion', ban.id_promocion);

      if (error) throw new Error(error.message);

      await registrarEnBitacora({
        tipo_accion: 'EDICION_BANNER',
        id_referencia: ban.id_promocion,
        nombre_referencia: ban.titulo,
        descripcion_cambio: `Actualizó banner y su vigencia (Expira: ${isoAFechaInput(ban.fecha_expiracion)} 23:59)`,
        valor_anterior: 'Configuración previa',
        valor_nuevo: `${ban.titulo} (${ban.estado})`
      });

      notificar(`Cambios guardados en Banner "${ban.titulo}"`);
      setArchivosBannersEdit(prev => {
        const copia = { ...prev };
        delete copia[ban.id_promocion];
        return copia;
      });
      setBannerEditandoId(null);
      cargarDatos();
    } catch (err) {
      notificar('Error al actualizar banner: ' + err.message, 'error');
    } finally {
      setSubiendoBanner(false);
    }
  }

  async function eliminarBanner(ban) {
    const { error } = await supabase
      .from('tbl_promociones_banners')
      .delete()
      .eq('id_promocion', ban.id_promocion);

    if (error) {
      notificar('Error al eliminar banner: ' + error.message, 'error');
    } else {
      await registrarEnBitacora({
        tipo_accion: 'ELIMINACION_BANNER',
        id_referencia: ban.id_promocion,
        nombre_referencia: ban.titulo,
        descripcion_cambio: `Eliminó el banner promocional del sistema`,
        valor_anterior: ban.titulo,
        valor_nuevo: 'Eliminado'
      });

      notificar(`Banner "${ban.titulo}" eliminado correctamente`);
      if (bannerEnSimulador === ban.id_promocion) {
        setBannerEnSimulador('nuevo');
      }
      cargarDatos();
    }
  }

  async function restaurarColorOriginalBanner(ban) {
    setPreviewsBannersEdit(prev => {
      const copia = { ...prev };
      delete copia[ban.id_promocion];
      return copia;
    });
    setArchivosBannersEdit(prev => {
      const copia = { ...prev };
      delete copia[ban.id_promocion];
      return copia;
    });

    const { destino } = descomponerLeyendaBanner(ban.leyenda_exclusividad, ban.imagen_banner_url);

    await supabase
      .from('tbl_promociones_banners')
      .update({ imagen_banner_url: destino || '#catalogo' })
      .eq('id_promocion', ban.id_promocion);

    notificar('Fondo de color original restaurado');
    cargarDatos();
  }

  /* ─────────── OPCIONES PARA ErpSelect ─────────── */
  const opcionesCatConTodas = [
    { value: 'todas', label: `Todas (${categorias.length})`, badge: productosPublicados.length },
    ...categorias.map(c => ({
      value: String(c.id_categoria),
      label: c.nombre_categoria,
      badge: productosPublicados.filter(p => Number(p.id_categoria) === Number(c.id_categoria)).length
    }))
  ];

  const opcionesCatBorradores = [
    { value: 'todas', label: `Todas (${categorias.length})`, badge: productosBorradores.length },
    ...categorias.map(c => ({
      value: String(c.id_categoria),
      label: c.nombre_categoria,
      badge: productosBorradores.filter(p => Number(p.id_categoria) === Number(c.id_categoria)).length
    }))
  ];

  const opcionesCatSimples = categorias.map(c => ({
    value: String(c.id_categoria),
    label: c.nombre_categoria,
    badge: productosPublicados.filter(p => Number(p.id_categoria) === Number(c.id_categoria)).length
  }));

  const opcionesMarcaConTodas = [
    { value: 'todas', label: 'Todas las marcas' },
    ...marcasComerciales.map(m => ({
      value: m,
      label: m,
      badge: productosPublicados.filter(p => normalizarMarca(p.marca).toLowerCase() === m.toLowerCase()).length
    })),
    {
      value: SIN_MARCA,
      label: SIN_MARCA,
      badge: productosPublicados.filter(p => normalizarMarca(p.marca) === SIN_MARCA).length
    }
  ];

  const opcionesMarcaProducto = [
    ...marcasComerciales.map(m => ({
      value: m,
      label: m,
      badge: productosPublicados.filter(p => normalizarMarca(p.marca).toLowerCase() === m.toLowerCase()).length
    })),
    {
      value: SIN_MARCA,
      label: SIN_MARCA,
      badge: productosPublicados.filter(p => normalizarMarca(p.marca) === SIN_MARCA).length
    }
  ];

  /* ─────────── RENDER DE TARJETAS DE PRODUCTOS PUBLICADOS ─────────── */
  function renderTarjetaProductoCompacta(p) {
    const vig = evaluarVigenciaDescuento(p);
    const precioBase = Number(p.precio_unitario || 0);
    const precioFinal = vig.activoEnTienda
      ? (precioBase * (1 - vig.pctEfectivo / 100)).toFixed(2)
      : precioBase.toFixed(2);
    const mayoreo = (precioBase * 0.95).toFixed(2);
    const agotado = Number(p.stock_web) <= 0;
    const marcaTxt = normalizarMarca(p.marca);
    const piezas = Number(p.piezas_por_paquete || 0);

    return (
      <article
        key={p.id_producto}
        className="erp-prod-row-card"
        onClick={() => abrirInspectorProducto(p)}
      >
        <div className="erp-prod-row-card__thumb">
          <img
            src={resolverImagenProducto(p.imagen_url)}
            alt={p.nombre_dulce}
            onError={e => { e.currentTarget.src = '/img/ICONO.png'; }}
          />
        </div>

        <div className="erp-prod-row-card__info">
          <div className="erp-prod-row-card__meta">
            <span className="erp-prod-row-card__code">{p.codigo_barras}</span>
            {marcaTxt !== SIN_MARCA && (
              <>
                <span>·</span>
                <span style={{ fontWeight: 600, color: 'var(--uva)' }}>{marcaTxt}</span>
              </>
            )}
            {p.etiqueta_web === 'top' && (
              <span className="erp-badge erp-badge--amarillo" style={{ fontSize: 9.5, padding: '1px 6px' }}>Top</span>
            )}
            {p.etiqueta_web === 'nuevo' && (
              <span className="erp-badge erp-badge--uva" style={{ fontSize: 9.5, padding: '1px 6px' }}>Nuevo</span>
            )}
          </div>
          <h3 className="erp-prod-row-card__name" title={p.nombre_dulce}>
            {p.nombre_dulce}
          </h3>
          <div className="erp-prod-row-card__pres">
            {p.presentacion || 'Pieza'}
            {piezas > 0 ? ` · ${piezas} pzas` : ''}
            {' · '}
            {vig.estado === 'vencido' ? 'Oferta finalizada' : p.es_transaccional ? 'Checkout' : 'Cotización'}
          </div>
        </div>

        <div className="erp-prod-row-card__right">
          <div className="erp-prod-row-card__price">
            {vig.activoEnTienda && (
              <span className="erp-prod-row-card__disc">-{vig.pctEfectivo}%</span>
            )}
            <span>${precioFinal}</span>
          </div>
          <small style={{ fontSize: 11, color: 'var(--tenue)' }}>
            Mayoreo: ${mayoreo}
          </small>
          <span
            className="erp-prod-row-card__stock"
            style={{ color: agotado ? '#C8320A' : '#007A3B' }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: agotado ? '#C8320A' : '#00A650'
              }}
            />
            {agotado ? 'Agotado' : `${p.stock_web} disp.`}
          </span>
        </div>
      </article>
    );
  }

  function renderTarjetaCuadricula(p) {
    const vig = evaluarVigenciaDescuento(p);
    const precioBase = Number(p.precio_unitario || 0);
    const precioConOferta = vig.activoEnTienda ? (precioBase * (1 - vig.pctEfectivo / 100)).toFixed(2) : null;
    const mayoreo = (precioBase * 0.95).toFixed(2);
    const agotado = Number(p.stock_web) <= 0;
    const marcaTxt = normalizarMarca(p.marca);
    const piezas = Number(p.piezas_por_paquete || 0);

    return (
      <article
        key={p.id_producto}
        className="erp-sku-card"
        onClick={() => abrirInspectorProducto(p)}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--tenue)', fontWeight: 700 }}>
            Código: {p.codigo_barras}
          </span>
          <span className={`erp-badge ${agotado ? 'erp-badge--naranja' : 'erp-badge--verde'}`}>
            <span className="erp-badge__dot" />
            {agotado ? 'Agotado (0)' : `${p.stock_web} en stock`}
          </span>
        </div>

        <div className="erp-sku-card__top">
          <div className="erp-sku-card__img">
            <img
              src={resolverImagenProducto(p.imagen_url)}
              alt={p.nombre_dulce}
              onError={e => { e.currentTarget.src = '/img/ICONO.png'; }}
            />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 4 }}>
              <span className="erp-badge erp-badge--uva" style={{ fontSize: 10, padding: '2px 7px' }}>
                {p.tbl_categorias?.nombre_categoria || 'General'}
              </span>
              {marcaTxt !== SIN_MARCA && (
                <span className="erp-badge erp-badge--amarillo" style={{ fontSize: 10, padding: '2px 7px' }}>
                  {marcaTxt}
                </span>
              )}
              {p.etiqueta_web === 'top' && (
                <span className="erp-badge erp-badge--marca" style={{ fontSize: 10, padding: '2px 7px' }}>Más vendido</span>
              )}
              {p.etiqueta_web === 'nuevo' && (
                <span className="erp-badge erp-badge--verde" style={{ fontSize: 10, padding: '2px 7px' }}>Nuevo</span>
              )}
            </div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--texto)', lineHeight: 1.28, marginBottom: 2 }}>
              {p.nombre_dulce}
            </h3>
            <p style={{ fontSize: 12, color: 'var(--texto-2)' }}>
              {p.presentacion || 'Pieza'}
              {piezas > 0 ? ` · ${piezas} pzas/paq` : ''}
              {` · Tope: ${p.tope_maximo_compra}`}
            </p>
          </div>
        </div>

        <div className="erp-sku-card__metrics">
          <div>
            <small style={{ fontSize: 10.5, color: 'var(--tenue)', display: 'block' }}>Precio Base</small>
            <b style={{ fontSize: 14.5, color: 'var(--texto)' }}>${precioBase.toFixed(2)}</b>
          </div>
          <div>
            <small style={{ fontSize: 10.5, color: 'var(--tenue)', display: 'block' }}>Mayoreo (5+)</small>
            <b style={{ fontSize: 14, color: 'var(--verde)' }}>${mayoreo}</b>
          </div>
          <div>
            <small style={{ fontSize: 10.5, color: 'var(--tenue)', display: 'block' }}>Oferta</small>
            <b style={{ fontSize: 13, color: vig.activoEnTienda ? 'var(--marca)' : 'var(--texto-2)' }}>
              {vig.activoEnTienda
                ? `-${vig.pctEfectivo}% ($${precioConOferta})`
                : vig.estado === 'vencido'
                ? 'Vencida (Normal)'
                : 'Normal'}
            </b>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4, borderTop: '1px solid var(--linea)' }}>
          <span style={{ fontSize: 11.5, color: 'var(--texto-2)', fontWeight: 600 }}>
            {p.descuento_fin && vig.activoEnTienda
              ? `Vence: ${isoAFechaInput(p.descuento_fin)} 23:59`
              : p.es_transaccional
              ? 'Compra en línea'
              : 'Cotización WhatsApp'}
          </span>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--marca)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <span>Editar detalles</span>
            <ErpIcon name="arrow-right" size={13} />
          </span>
        </div>
      </article>
    );
  }

  function renderPaginacionGenerica(totalItems, pagActual, totalPags, itemsPorPag, setPag, setItemsPorPag) {
    if (totalItems <= itemsPorPag) return null;
    const inicio = (pagActual - 1) * itemsPorPag;

    return (
      <div className="erp-pagination">
        <span style={{ fontSize: 12.5, color: 'var(--texto-2)' }}>
          Mostrando <b>{inicio + 1}</b> – <b>{Math.min(inicio + itemsPorPag, totalItems)}</b> de <b>{totalItems}</b> productos
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <span style={{ color: 'var(--texto-2)' }}>Mostrar:</span>
            <div style={{ width: 84 }}>
              <ErpSelect
                compact
                searchable={false}
                value={String(itemsPorPag)}
                onChange={val => setItemsPorPag(Number(val))}
                options={[
                  { value: '24', label: '24' },
                  { value: '48', label: '48' },
                  { value: '96', label: '96' }
                ]}
              />
            </div>
          </div>

          <div className="erp-pagination__btns">
            <button
              type="button"
              disabled={pagActual === 1}
              onClick={() => setPag(pagActual - 1)}
              className="erp-page-btn"
            >
              Anterior
            </button>
            {Array.from({ length: totalPags }, (_, i) => i + 1)
              .filter(n => n === 1 || n === totalPags || Math.abs(n - pagActual) <= 1)
              .map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPag(n)}
                  className={`erp-page-btn ${n === pagActual ? 'activo' : ''}`}
                >
                  {n}
                </button>
              ))}
            <button
              type="button"
              disabled={pagActual === totalPags}
              onClick={() => setPag(pagActual + 1)}
              className="erp-page-btn"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>
    );
  }

  const gruposPorCategoria = categorias
    .map(cat => {
      const items = productosFiltrados.filter(p => Number(p.id_categoria) === Number(cat.id_categoria));
      const conDescuento = items.filter(i => evaluarVigenciaDescuento(i).activoEnTienda).length;
      const agotados = items.filter(i => Number(i.stock_web) <= 0).length;
      return { ...cat, items, conDescuento, agotados };
    })
    .filter(g => g.items.length > 0);

  const bajasFiltradas = productosInactivos.filter(p => {
    if (filtroMotivoBaja !== 'todos' && (p.motivo_baja || 'Sin motivo') !== filtroMotivoBaja) return false;
    if (busquedaBajas.trim()) {
      const txt = `${p.codigo_barras} ${p.nombre_dulce} ${normalizarMarca(p.marca)} ${p.motivo_baja || ''} ${p.comentario_baja || ''}`.toLowerCase();
      if (!txt.includes(busquedaBajas.trim().toLowerCase())) return false;
    }
    return true;
  });

  const usuariosEnBitacora = Array.from(new Set(bitacora.map(b => b.usuario_nombre).filter(Boolean)));
  const bitacoraFiltrada = bitacora.filter(reg => {
    if (filtroTipoAccion !== 'todos' && reg.tipo_accion !== filtroTipoAccion) return false;
    if (filtroUsuarioAuditoria !== 'todos' && reg.usuario_nombre !== filtroUsuarioAuditoria) return false;
    if (busquedaAuditoria.trim()) {
      const txt = `${reg.nombre_referencia} ${reg.descripcion_cambio} ${reg.usuario_nombre} ${reg.id_referencia || ''}`.toLowerCase();
      if (!txt.includes(busquedaAuditoria.trim().toLowerCase())) return false;
    }
    return true;
  });

  const obtenerDatosSimuladorBanner = () => {
    if (bannerEnSimulador === 'nuevo') {
      const etqDest = destinosBanner.find(d => d.valor === nuevoBanner.destino)?.etiqueta || 'Catálogo completo';
      return {
        tag: nuevoBanner.tag_corto || 'PROMOCIÓN EXCLUSIVA',
        titulo: nuevoBanner.titulo || 'Título del Banner',
        descripcion: nuevoBanner.descripcion_banner || 'Descripción de la promoción.',
        destinoEtiqueta: etqDest,
        estiloFondo: construirEstiloFondoBanner(previewBannerNuevo, 0),
        nombreSeleccionado: 'Nuevo Banner (Borrador)'
      };
    }

    const idx = banners.findIndex(item => item.id_promocion === bannerEnSimulador);
    const b = idx >= 0 ? banners[idx] : banners[0];

    if (b) {
      const { tag, desc, destino } = descomponerLeyendaBanner(b.leyenda_exclusividad, b.imagen_banner_url);
      const urlActiva = previewsBannersEdit[b.id_promocion] || b.imagen_banner_url;
      const etqDest = destinosBanner.find(d => d.valor === destino)?.etiqueta || 'Catálogo completo';
      return {
        tag,
        titulo: b.titulo || 'Título del Banner',
        descripcion: desc,
        destinoEtiqueta: etqDest,
        estiloFondo: construirEstiloFondoBanner(urlActiva, idx >= 0 ? idx : 0),
        nombreSeleccionado: `Banner #${(idx >= 0 ? idx : 0) + 1}: ${b.titulo}`
      };
    }

    return {
      tag: 'ENVÍO A DOMICILIO',
      titulo: 'Te lo llevamos a casa',
      descripcion: 'Dentro de la ciudad de Puebla, o recógelo gratis en sucursal.',
      destinoEtiqueta: 'Catálogo completo',
      estiloFondo: construirEstiloFondoBanner('', 0),
      nombreSeleccionado: 'Banner Principal'
    };
  };

  const datosPreview = obtenerDatosSimuladorBanner();

  const esBolsaCelofanSistema =
    prodSeleccionado && String(prodSeleccionado.codigo_barras || '').toLowerCase() === 'fie-06';

  const costoPorPiezaInspector =
    prodSeleccionado &&
    Number(prodSeleccionado.piezas_por_paquete) > 0 &&
    Number(prodSeleccionado.precio_unitario) > 0
      ? (Number(prodSeleccionado.precio_unitario) / Number(prodSeleccionado.piezas_por_paquete)).toFixed(2)
      : null;

  const borradoresSeleccionadosObjs = productosBorradores.filter(p =>
    seleccionBorradores.includes(p.id_producto)
  );

  return (
    <div>
      {/* ENCABEZADO CORPORATIVO */}
      <div className="erp-page-header erp-anim-1">
        <div>
          <span className="erp-badge erp-badge--uva">
            SIGE Candy · Sesión: {usuarioActual.nombre}
          </span>
          <h1 className="erp-page-title">Gestión de Catálogo, Borradores y Auditoría</h1>
          <p className="erp-page-subtitle">
            Control de productos publicados en Tienda Web, bandeja de preparación de borradores, promociones y bitácora.
          </p>
        </div>

        <div className="erp-segmented" style={{ flexWrap: 'wrap' }}>
          <button
            type="button"
            className={tab === 'productos' ? 'activo' : ''}
            onClick={() => setTab('productos')}
          >
            <ErpIcon name="store" size={15} />
            <span>En Tienda Web ({productosPublicados.length})</span>
          </button>

          <button
            type="button"
            className={tab === 'borradores' ? 'activo' : ''}
            onClick={() => {
              setTab('borradores');
              setConfirmandoEliminarBorradores(false);
            }}
          >
            <ErpIcon name="clipboard" size={15} />
            <span>Borradores ({productosBorradores.length})</span>
          </button>

          <button
            type="button"
            className={tab === 'bajas' ? 'activo' : ''}
            onClick={() => setTab('bajas')}
          >
            <ErpIcon name="folder" size={15} />
            <span>Dados de Baja ({productosInactivos.length})</span>
          </button>

          <button
            type="button"
            className={tab === 'banners' ? 'activo' : ''}
            onClick={() => setTab('banners')}
          >
            <ErpIcon name="tag" size={15} />
            <span>Banners ({banners.length})</span>
          </button>

          {usuarioActual.rol === 'admin' && (
            <button
              type="button"
              className={tab === 'auditoria' ? 'activo' : ''}
              onClick={() => setTab('auditoria')}
            >
              <ErpIcon name="shield" size={15} />
              <span>Bitácora ({bitacora.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* PANEL COMPARTIDO DE IMPORTACIÓN DESDE EXCEL (disponible en Tienda Web y Borradores) */}
      {(tab === 'productos' || tab === 'borradores') && (
        <div className={`erp-collapse ${panelAbierto === 'importar_excel' ? 'abierto' : ''}`}>
          <div className="erp-collapse__inner">
            <ErpImportarExcel
              supabase={supabase}
              categorias={categorias}
              productosExistentes={productos}
              usuarioActual={usuarioActual}
              onImportSuccess={() => {
                cargarDatos();
              }}
              onNotificar={notificar}
              onCerrar={() => setPanelAbierto(null)}
            />
          </div>
        </div>
      )}

      {/* ══════════ PESTAÑA 1: PRODUCTOS PUBLICADOS EN TIENDA WEB ══════════ */}
      {tab === 'productos' && (
        <>
          <div
            className="erp-card erp-anim-2"
            style={{
              padding: '14px 20px',
              marginBottom: 14,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--texto-2)' }}>Vista:</span>
              <div className="erp-segmented">
                <button
                  type="button"
                  className={modoVista === 'categorias' ? 'activo' : ''}
                  onClick={() => setModoVista('categorias')}
                >
                  <ErpIcon name="folder" size={14} />
                  <span>Directorio por Categorías</span>
                </button>
                <button
                  type="button"
                  className={modoVista === 'tarjetas' ? 'activo' : ''}
                  onClick={() => setModoVista('tarjetas')}
                >
                  <ErpIcon name="dashboard" size={14} />
                  <span>Cuadrícula</span>
                </button>
                <button
                  type="button"
                  className={modoVista === 'tabla' ? 'activo' : ''}
                  onClick={() => setModoVista('tabla')}
                >
                  <ErpIcon name="clipboard" size={14} />
                  <span>Tabla de Datos</span>
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setPanelAbierto(panelAbierto === 'importar_excel' ? null : 'importar_excel')}
                className={`erp-btn ${panelAbierto === 'importar_excel' ? 'erp-btn--uva' : 'erp-btn--secundario'}`}
              >
                <ErpIcon name="clipboard" size={15} />
                <span>{panelAbierto === 'importar_excel' ? 'Cerrar Importador' : 'Importar Excel'}</span>
              </button>

              <button
                type="button"
                onClick={() => setPanelAbierto(panelAbierto === 'descuentos_masivos' ? null : 'descuentos_masivos')}
                className={`erp-btn ${panelAbierto === 'descuentos_masivos' ? 'erp-btn--uva' : 'erp-btn--secundario'}`}
              >
                <ErpIcon name="tag" size={15} />
                <span>{panelAbierto === 'descuentos_masivos' ? 'Cerrar Descuentos' : 'Descuentos y Vigencia Programada'}</span>
              </button>

              <button
                type="button"
                onClick={() => setPanelAbierto(panelAbierto === 'alta_producto' ? null : 'alta_producto')}
                className="erp-btn erp-btn--primario"
              >
                <span className={`erp-icon-rotate ${panelAbierto === 'alta_producto' ? 'abierto' : ''}`} style={{ display: 'inline-flex' }}>
                  <ErpIcon name="plus" size={15} />
                </span>
                <span>{panelAbierto === 'alta_producto' ? 'Cerrar Registro' : 'Agregar Producto'}</span>
              </button>
            </div>
          </div>

          {/* ACORDEÓN 1: DESCUENTOS MASIVOS */}
          <div className={`erp-collapse ${panelAbierto === 'descuentos_masivos' ? 'abierto' : ''}`}>
            <div className="erp-collapse__inner">
              <div className="erp-card" style={{ margin: 0, border: '1.5px solid var(--uva)', background: '#fff' }}>
                <div className="erp-card__header">
                  <div className="erp-card__title">
                    <ErpIcon name="tag" size={17} style={{ color: 'var(--uva)' }} />
                    <span>Motor de Descuentos Masivos y Vigencia Automática (23:59 hrs)</span>
                  </div>
                  <span className="erp-badge erp-badge--uva">
                    {productosObjetivo.length} productos publicados seleccionados
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, alignItems: 'end' }}>
                  <div>
                    <label className="erp-label">1. Aplicar descuento por:</label>
                    <ErpSelect
                      value={descMasivo.alcance}
                      onChange={val => setDescMasivo({ ...descMasivo, alcance: val })}
                      options={[
                        { value: 'categoria', label: 'Categoría completa' },
                        { value: 'marca', label: 'Marca comercial' },
                        { value: 'todos', label: 'Todos los publicados en Tienda Web', badge: productosPublicados.length },
                        { value: 'filtrados', label: 'Productos filtrados actualmente', badge: productosFiltrados.length }
                      ]}
                    />
                  </div>

                  {descMasivo.alcance === 'categoria' && (
                    <div>
                      <label className="erp-label">2. Categoría objetivo:</label>
                      <ErpSelect
                        value={descMasivo.id_categoria}
                        onChange={val => setDescMasivo({ ...descMasivo, id_categoria: val })}
                        searchPlaceholder="Buscar categoría..."
                        options={opcionesCatSimples}
                      />
                    </div>
                  )}

                  {descMasivo.alcance === 'marca' && (
                    <div>
                      <label className="erp-label">2. Marca objetivo:</label>
                      <ErpSelect
                        value={descMasivo.marca}
                        onChange={val => setDescMasivo({ ...descMasivo, marca: val })}
                        searchPlaceholder="Buscar marca..."
                        options={opcionesMarcaProducto}
                      />
                    </div>
                  )}

                  <div>
                    <label className="erp-label">3. Porcentaje de descuento (%):</label>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <input
                        type="number"
                        min="0"
                        max="90"
                        className="erp-input"
                        style={{ width: 78, fontWeight: 800, fontSize: 15, textAlign: 'center' }}
                        value={descMasivo.porcentaje}
                        onChange={e => setDescMasivo({ ...descMasivo, porcentaje: e.target.value })}
                      />
                      <div className="erp-preset-chips">
                        {PORCENTAJES_RAPIDOS.map(pct => (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => setDescMasivo({ ...descMasivo, porcentaje: pct })}
                            className={`erp-preset-chip ${Number(descMasivo.porcentaje) === pct ? 'activo' : ''}`}
                          >
                            {pct === 0 ? '0%' : `${pct}%`}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 16, padding: 14, background: '#FAF8FC', borderRadius: 10, border: '1px solid var(--linea)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 14, alignItems: 'end' }}>
                  <div>
                    <label className="erp-label">4. Duración de la promoción:</label>
                    <ErpSelect
                      value={descMasivo.modalidadVigencia}
                      onChange={val => setDescMasivo({ ...descMasivo, modalidadVigencia: val })}
                      options={[
                        { value: 'programado', label: 'Programar fechas (Regresa a precio normal 00:00)' },
                        { value: 'permanente', label: 'Permanente (Hasta retirarlo manualmente)' }
                      ]}
                    />
                  </div>

                  {descMasivo.modalidadVigencia === 'programado' && (
                    <>
                      <div>
                        <label className="erp-label">Fecha de inicio (00:00 hrs):</label>
                        <ErpDatePicker
                          value={descMasivo.fecha_inicio}
                          onChange={val => setDescMasivo({ ...descMasivo, fecha_inicio: val })}
                        />
                      </div>
                      <div>
                        <label className="erp-label">Fecha límite (Termina a las 23:59 hrs) *:</label>
                        <ErpDatePicker
                          value={descMasivo.fecha_fin}
                          min={descMasivo.fecha_inicio || hoyStr}
                          onChange={val => setDescMasivo({ ...descMasivo, fecha_fin: val })}
                        />
                      </div>
                    </>
                  )}
                </div>

                <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--linea)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                  <span style={{ fontSize: 12.5, color: 'var(--texto-2)' }}>
                    {descMasivo.modalidadVigencia === 'programado' && descMasivo.fecha_fin
                      ? `Al llegar el ${descMasivo.fecha_fin} a las 23:59 hrs, los ${productosObjetivo.length} productos volverán automáticamente a su precio original.`
                      : `Se actualizarán ${productosObjetivo.length} productos a nombre de ${usuarioActual.nombre}.`}
                  </span>

                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      type="button"
                      disabled={aplicandoDescuento || productosObjetivo.length === 0}
                      onClick={() => ejecutarDescuentoMasivo(0)}
                      className="erp-btn erp-btn--secundario"
                    >
                      Restaurar a precio regular (0%)
                    </button>
                    <button
                      type="button"
                      disabled={aplicandoDescuento || productosObjetivo.length === 0}
                      onClick={() => ejecutarDescuentoMasivo(null)}
                      className="erp-btn erp-btn--primario"
                    >
                      <ErpIcon name="check" size={15} />
                      <span>
                        {aplicandoDescuento
                          ? 'Programando...'
                          : `Aplicar ${descMasivo.porcentaje}% a ${productosObjetivo.length} productos`}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ACORDEÓN 2: ALTA DE NUEVO PRODUCTO */}
          <div className={`erp-collapse ${panelAbierto === 'alta_producto' ? 'abierto' : ''}`}>
            <div className="erp-collapse__inner">
              <form onSubmit={crearProducto} className="erp-card" style={{ margin: 0, border: '1.5px solid var(--marca)' }}>
                <div className="erp-card__header">
                  <div className="erp-card__title">
                    <ErpIcon name="plus" size={17} style={{ color: 'var(--marca)' }} />
                    <span>Registrar Nuevo Producto en el Catálogo</span>
                  </div>
                  <span className="erp-badge erp-badge--uva">Responsable: {usuarioActual.nombre}</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(195px, 1fr))', gap: 14 }}>
                  <div>
                    <label className="erp-label">Código del Producto *</label>
                    <input required className="erp-input" placeholder="Código único o de barras" value={nuevoProd.codigo_barras} onChange={e => setNuevoProd({ ...nuevoProd, codigo_barras: e.target.value })} />
                  </div>
                  <div>
                    <label className="erp-label">Nombre del Dulce *</label>
                    <input required className="erp-input" placeholder="Nombre comercial" value={nuevoProd.nombre_dulce} onChange={e => setNuevoProd({ ...nuevoProd, nombre_dulce: e.target.value })} />
                  </div>
                  <div>
                    <label className="erp-label">Categoría *</label>
                    <ErpSelect
                      value={String(nuevoProd.id_categoria)}
                      onChange={val => setNuevoProd({ ...nuevoProd, id_categoria: Number(val) })}
                      searchPlaceholder="Buscar categoría..."
                      options={opcionesCatSimples}
                    />
                  </div>
                  <div>
                    <label className="erp-label">Marca</label>
                    <ErpSelect
                      value={nuevoProd.marca}
                      onChange={val => setNuevoProd({ ...nuevoProd, marca: val })}
                      searchPlaceholder="Buscar marca..."
                      options={opcionesMarcaProducto}
                    />
                  </div>
                  <div>
                    <label className="erp-label">Presentación *</label>
                    <input required className="erp-input" placeholder="Bolsa 1 kg, caja 30 pzas..." value={nuevoProd.presentacion} onChange={e => setNuevoProd({ ...nuevoProd, presentacion: e.target.value })} />
                  </div>
                  <div>
                    <label className="erp-label">Piezas por paquete (Aguinaldos)</label>
                    <input
                      type="number"
                      min="0"
                      className="erp-input"
                      placeholder="Ej. 50 (0 si no aplica)"
                      value={nuevoProd.piezas_por_paquete}
                      onChange={e => setNuevoProd({ ...nuevoProd, piezas_por_paquete: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="erp-label">Precio Unitario ($ MXN) *</label>
                    <input required type="number" step="0.01" className="erp-input" placeholder="0.00" value={nuevoProd.precio_unitario} onChange={e => setNuevoProd({ ...nuevoProd, precio_unitario: e.target.value })} />
                  </div>
                  <div>
                    <label className="erp-label">% Descuento Inicial</label>
                    <input type="number" min="0" max="90" className="erp-input" value={nuevoProd.porcentaje_descuento} onChange={e => setNuevoProd({ ...nuevoProd, porcentaje_descuento: e.target.value })} />
                  </div>
                  <div>
                    <label className="erp-label">Existencia Inicial</label>
                    <input type="number" className="erp-input" value={nuevoProd.stock_web} onChange={e => setNuevoProd({ ...nuevoProd, stock_web: e.target.value })} />
                  </div>
                  <div>
                    <label className="erp-label">Destacado en Tienda</label>
                    <ErpSelect
                      value={nuevoProd.etiqueta_web}
                      onChange={val => setNuevoProd({ ...nuevoProd, etiqueta_web: val })}
                      options={OPCIONES_ETIQUETA_WEB}
                    />
                  </div>
                  <div>
                    <label className="erp-label">Destino al guardar</label>
                    <ErpSelect
                      value={nuevoProd.publicado_web !== false ? 'web' : 'borrador'}
                      onChange={val => setNuevoProd({ ...nuevoProd, publicado_web: val === 'web' })}
                      options={[
                        { value: 'borrador', label: 'Guardar en Borradores (Solo SIGE)' },
                        { value: 'web', label: 'Publicar directo en Tienda Web' }
                      ]}
                    />
                  </div>

                  <div style={{ gridColumn: '1 / -1' }}>
                    <label className="erp-label">Descripción para la Tienda Web</label>
                    <textarea
                      rows={2}
                      className="erp-input"
                      style={{ resize: 'vertical', fontFamily: 'inherit' }}
                      placeholder="Reseña breve del dulce, sabores o usos recomendados..."
                      value={nuevoProd.descripcion}
                      onChange={e => setNuevoProd({ ...nuevoProd, descripcion: e.target.value })}
                    />
                  </div>

                  <div style={{ gridColumn: '1 / -1' }}>
                    <label className="erp-label">Fotografía del Producto</label>
                    <ErpImageUpload
                      previewUrl={nuevoProd.imagen_url ? resolverImagenProducto(nuevoProd.imagen_url) : ''}
                      title="Fotografía para la tienda en línea"
                      subtitle="Arrastra una imagen aquí o haz clic para seleccionarla · PNG sin fondo o WEBP"
                      buttonLabel="Subir fotografía"
                      onFileSelect={archivo => subirFotoProducto(archivo, false)}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--linea)' }}>
                  <button type="button" onClick={() => setPanelAbierto(null)} className="erp-btn erp-btn--secundario">
                    Cancelar
                  </button>
                  <button type="submit" className="erp-btn erp-btn--primario">
                    <ErpIcon name="check" size={15} />
                    <span>Guardar Producto</span>
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* BARRA DE FILTRADO AVANZADO */}
          <div className="erp-card erp-anim-2" style={{ padding: '16px 20px', marginBottom: 18 }}>
            <div className="erp-adv-filters">
              <div>
                <label className="erp-label">Búsqueda rápida</label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="erp-input"
                    style={{ paddingLeft: 34 }}
                    placeholder="Código, nombre, marca o presentación..."
                    value={busqueda}
                    onChange={e => setBusqueda(e.target.value)}
                  />
                  <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--tenue)' }}>
                    <ErpIcon name="search" size={15} />
                  </span>
                </div>
              </div>

              <div>
                <label className="erp-label">Categoría</label>
                <ErpSelect
                  value={filtroCat}
                  onChange={setFiltroCat}
                  searchPlaceholder="Buscar categoría..."
                  options={opcionesCatConTodas}
                />
              </div>

              <div>
                <label className="erp-label">Marca</label>
                <ErpSelect
                  value={filtroMarca}
                  onChange={setFiltroMarca}
                  searchPlaceholder="Buscar marca..."
                  options={opcionesMarcaConTodas}
                />
              </div>

              <div>
                <label className="erp-label">Disponibilidad</label>
                <ErpSelect
                  value={filtroStock}
                  onChange={setFiltroStock}
                  options={[
                    { value: 'todos', label: 'Todo el inventario' },
                    { value: 'disponible', label: 'Disponibles (> 0)' },
                    { value: 'bajo', label: 'Existencia baja (≤ 10)' },
                    { value: 'agotado', label: 'Agotados (0)' }
                  ]}
                />
              </div>

              <div>
                <label className="erp-label">Promoción / Destacado</label>
                <ErpSelect
                  value={filtroOferta}
                  onChange={setFiltroOferta}
                  options={[
                    { value: 'todos', label: 'Todos los publicados' },
                    { value: 'con_descuento', label: 'Con descuento vigente' },
                    { value: 'sin_descuento', label: 'Precio regular (0%)' },
                    { value: 'vencidos', label: 'Ofertas vencidas' },
                    { value: 'aguinaldos', label: 'Aptos para Aguinaldos (pzas > 0)' },
                    { value: 'sin_piezas', label: 'Sin piezas por paquete (= 0)' },
                    { value: 'top', label: 'Destacados: Más vendidos' },
                    { value: 'nuevo', label: 'Destacados: Novedades' }
                  ]}
                />
              </div>

              <div>
                <label className="erp-label">Ordenar por</label>
                <ErpSelect
                  value={ordenPor}
                  onChange={setOrdenPor}
                  options={[
                    { value: 'categoria', label: 'Categoría' },
                    { value: 'nombre', label: 'Nombre (A - Z)' },
                    { value: 'precio_asc', label: 'Menor precio primero' },
                    { value: 'precio_desc', label: 'Mayor precio primero' },
                    { value: 'stock_asc', label: 'Menor existencia primero' },
                    { value: 'descuento_desc', label: 'Mayor descuento' }
                  ]}
                />
              </div>
            </div>

            {(hayFiltrosActivos || productosBorradores.length > 0) && (
              <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--linea)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <span style={{ fontSize: 12.5, color: 'var(--texto-2)' }}>
                  {hayFiltrosActivos ? (
                    <>Mostrando <b>{productosFiltrados.length}</b> de <b>{productosPublicados.length}</b> productos publicados.</>
                  ) : (
                    <>Tienes <b>{productosBorradores.length}</b> {productosBorradores.length === 1 ? 'producto pendiente' : 'productos pendientes'} en la bandeja de Borradores.</>
                  )}
                </span>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {productosBorradores.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setTab('borradores')}
                      className="erp-btn erp-btn--secundario"
                      style={{ padding: '5px 11px', fontSize: 11.5 }}
                    >
                      <ErpIcon name="clipboard" size={13} />
                      <span>Revisar Borradores ({productosBorradores.length})</span>
                    </button>
                  )}
                  {hayFiltrosActivos && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setDescMasivo(prev => ({ ...prev, alcance: 'filtrados' }));
                          setPanelAbierto('descuentos_masivos');
                        }}
                        className="erp-btn erp-btn--secundario"
                        style={{ padding: '5px 11px', fontSize: 11.5 }}
                      >
                        <ErpIcon name="tag" size={13} />
                        <span>Programar descuento a estos {productosFiltrados.length}</span>
                      </button>
                      <button
                        type="button"
                        onClick={limpiarFiltros}
                        className="erp-btn erp-btn--secundario"
                        style={{ padding: '5px 11px', fontSize: 11.5, color: 'var(--naranja)' }}
                      >
                        Limpiar filtros
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* CONTENIDO DE PRODUCTOS PUBLICADOS */}
          {cargando ? (
            <div className="erp-card" style={{ textAlign: 'center', padding: 48, color: 'var(--texto-2)' }}>
              Cargando catálogo de productos...
            </div>
          ) : productosFiltrados.length === 0 ? (
            <div className="erp-card" style={{ textAlign: 'center', padding: 48, color: 'var(--tenue)' }}>
              No se encontraron productos publicados con los filtros seleccionados.
            </div>
          ) : modoVista === 'categorias' ? (
            <div className="erp-cat-workspace erp-anim-3">
              <aside className="erp-cat-directory">
                <div className="erp-cat-directory__head">
                  Líneas de Producto ({categorias.length})
                </div>

                <button
                  type="button"
                  onClick={() => setFiltroCat('todas')}
                  className={`erp-cat-dir-btn ${filtroCat === 'todas' ? 'activo' : ''}`}
                >
                  <span>Todas las categorías</span>
                  <span className="erp-cat-dir-count">{productosPublicados.length}</span>
                </button>

                {categorias.map(c => {
                  const prodsCat = productosPublicados.filter(p => Number(p.id_categoria) === Number(c.id_categoria));
                  const ofertasCat = prodsCat.filter(p => evaluarVigenciaDescuento(p).activoEnTienda).length;
                  const activa = String(filtroCat) === String(c.id_categoria);

                  return (
                    <button
                      key={c.id_categoria}
                      type="button"
                      onClick={() => setFiltroCat(activa ? 'todas' : String(c.id_categoria))}
                      className={`erp-cat-dir-btn ${activa ? 'activo' : ''}`}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {c.nombre_categoria}
                        </div>
                        {ofertasCat > 0 && (
                          <small style={{ fontSize: 10.5, color: 'var(--marca)', fontWeight: 600, display: 'block' }}>
                            {ofertasCat} en oferta vigente
                          </small>
                        )}
                      </div>
                      <span className="erp-cat-dir-count">{prodsCat.length}</span>
                    </button>
                  );
                })}
              </aside>

              <div>
                {filtroCat !== 'todas' ? (
                  <div className="erp-cat-panel" style={{ marginBottom: 0 }}>
                    <div className="erp-cat-panel__head">
                      <div className="erp-cat-panel__title">
                        <h2>
                          {categorias.find(c => String(c.id_categoria) === String(filtroCat))?.nombre_categoria || 'Categoría'}
                        </h2>
                        <span className="erp-badge erp-badge--uva">{productosFiltrados.length} productos</span>
                      </div>

                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          type="button"
                          onClick={() => abrirDescuentoParaCategoria(filtroCat)}
                          className="erp-btn erp-btn--secundario"
                          style={{ padding: '6px 12px', fontSize: 12 }}
                        >
                          <ErpIcon name="tag" size={13} />
                          <span>Descuento a esta categoría</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setFiltroCat('todas')}
                          className="erp-btn erp-btn--secundario"
                          style={{ padding: '6px 12px', fontSize: 12 }}
                        >
                          Ver todas las categorías
                        </button>
                      </div>
                    </div>

                    <div className="erp-dense-grid">
                      {productosPaginados.map(p => renderTarjetaProductoCompacta(p))}
                    </div>
                  </div>
                ) : (
                  gruposPorCategoria.map(grupo => {
                    const expandida = Boolean(categoriasExpandidas[grupo.id_categoria]);
                    const limiteVista = expandida ? grupo.items.length : 6;
                    const visibles = grupo.items.slice(0, limiteVista);
                    const ocultos = grupo.items.length - visibles.length;

                    return (
                      <section key={grupo.id_categoria} className="erp-cat-panel">
                        <header className="erp-cat-panel__head">
                          <div className="erp-cat-panel__title">
                            <h2>{grupo.nombre_categoria}</h2>
                            <div className="erp-cat-panel__meta">
                              <span><b>{grupo.items.length}</b> productos</span>
                              {grupo.conDescuento > 0 && (
                                <span style={{ color: 'var(--marca)', fontWeight: 600 }}>
                                  · {grupo.conDescuento} con descuento vigente
                                </span>
                              )}
                              {grupo.agotados > 0 && (
                                <span style={{ color: '#C8320A', fontWeight: 600 }}>
                                  · {grupo.agotados} agotados
                                </span>
                              )}
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              type="button"
                              onClick={() => abrirDescuentoParaCategoria(grupo.id_categoria)}
                              className="erp-btn erp-btn--secundario"
                              style={{ padding: '5px 11px', fontSize: 11.5 }}
                            >
                              <ErpIcon name="tag" size={13} />
                              <span>Descuento por línea</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setFiltroCat(String(grupo.id_categoria))}
                              className="erp-btn erp-btn--secundario"
                              style={{ padding: '5px 11px', fontSize: 11.5 }}
                            >
                              <span>Abrir categoría ({grupo.items.length})</span>
                              <ErpIcon name="arrow-right" size={12} />
                            </button>
                          </div>
                        </header>

                        <div className="erp-dense-grid">
                          {visibles.map(p => renderTarjetaProductoCompacta(p))}
                        </div>

                        {grupo.items.length > 6 && (
                          <div style={{ padding: '10px 20px', background: '#FAFAFC', borderTop: '1px solid var(--linea)', textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() =>
                                setCategoriasExpandidas(prev => ({
                                  ...prev,
                                  [grupo.id_categoria]: !prev[grupo.id_categoria]
                                }))
                              }
                              className="link"
                              style={{ fontSize: 12, fontWeight: 700 }}
                            >
                              {expandida
                                ? 'Mostrar menos productos'
                                : `Mostrar ${ocultos} productos adicionales de ${grupo.nombre_categoria}`}
                            </button>
                          </div>
                        )}
                      </section>
                    );
                  })
                )}

                {filtroCat !== 'todas' &&
                  renderPaginacionGenerica(
                    productosFiltrados.length,
                    pagSegura,
                    totalPaginas,
                    porPagina,
                    setPaginaActual,
                    setPorPagina
                  )}
              </div>
            </div>
          ) : modoVista === 'tarjetas' ? (
            <div className="erp-anim-3">
              <div className="erp-catalog-grid">
                {productosPaginados.map(p => renderTarjetaCuadricula(p))}
              </div>
              {renderPaginacionGenerica(
                productosFiltrados.length,
                pagSegura,
                totalPaginas,
                porPagina,
                setPaginaActual,
                setPorPagina
              )}
            </div>
          ) : (
            <div className="erp-anim-3">
              <div className="erp-tabla-wrap">
                <table className="erp-tabla">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Categoría</th>
                      <th>Marca</th>
                      <th>Piezas / Paq.</th>
                      <th>Precio Unitario</th>
                      <th>Disponibilidad</th>
                      <th style={{ textAlign: 'right' }}>Detalle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productosPaginados.map(p => {
                      const vig = evaluarVigenciaDescuento(p);
                      const agotado = Number(p.stock_web) <= 0;
                      const piezas = Number(p.piezas_por_paquete || 0);
                      const marcaTxt = normalizarMarca(p.marca);
                      return (
                        <tr
                          key={p.id_producto}
                          onClick={() => abrirInspectorProducto(p)}
                          style={{ cursor: 'pointer' }}
                        >
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <img
                                src={resolverImagenProducto(p.imagen_url)}
                                alt=""
                                style={{ width: 38, height: 38, objectFit: 'contain', background: '#F8F6FA', borderRadius: 6, padding: 4, border: '1px solid var(--linea)', flexShrink: 0 }}
                                onError={e => { e.currentTarget.src = '/img/ICONO.png'; }}
                              />
                              <div>
                                <b style={{ display: 'block', fontSize: 13 }}>{p.nombre_dulce}</b>
                                <small style={{ fontFamily: 'monospace', color: 'var(--tenue)', fontSize: 11 }}>
                                  {p.codigo_barras} · {p.presentacion}
                                </small>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--texto)' }}>
                              {p.tbl_categorias?.nombre_categoria || 'Catálogo'}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontSize: 12.5, color: marcaTxt === SIN_MARCA ? 'var(--tenue)' : 'var(--texto-2)', fontWeight: 600 }}>
                              {marcaTxt}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontSize: 12, fontWeight: 600, color: piezas > 0 ? 'var(--uva)' : 'var(--tenue)' }}>
                              {piezas > 0 ? `${piezas} pzas` : '—'}
                            </span>
                          </td>
                          <td>
                            <b style={{ fontSize: 13.5 }}>${Number(p.precio_unitario).toFixed(2)}</b>
                            {vig.activoEnTienda && (
                              <span className="erp-prod-row-card__disc" style={{ marginLeft: 6 }}>
                                -{vig.pctEfectivo}%
                              </span>
                            )}
                          </td>
                          <td>
                            <span style={{ fontSize: 12, fontWeight: 600, color: agotado ? '#C8320A' : '#007A3B' }}>
                              {agotado ? 'Agotado (0)' : `${p.stock_web} disp.`}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                abrirInspectorProducto(p);
                              }}
                              className="erp-btn erp-btn--secundario"
                              style={{ padding: '5px 11px', fontSize: 12 }}
                            >
                              <span>Editar</span>
                              <ErpIcon name="arrow-right" size={13} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {renderPaginacionGenerica(
                productosFiltrados.length,
                pagSegura,
                totalPaginas,
                porPagina,
                setPaginaActual,
                setPorPagina
              )}
            </div>
          )}
        </>
      )}

      {/* ══════════ PESTAÑA 2: BORRADORES (MESA DE PREPARACIÓN PRE-WEB) ══════════ */}
      {tab === 'borradores' && (
        <div className="erp-anim-2">
          {/* Tarjetas resumen clicables como filtros de control de calidad */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(185px, 1fr))', gap: 12, marginBottom: 16 }}>
            <button
              type="button"
              onClick={() => setFiltroCalidadBorradores('todos')}
              className="erp-card"
              style={{
                margin: 0,
                padding: '14px 16px',
                textAlign: 'left',
                cursor: 'pointer',
                border: filtroCalidadBorradores === 'todos' ? '1.5px solid var(--uva)' : '1px solid var(--linea)',
                background: filtroCalidadBorradores === 'todos' ? '#F8F4FC' : '#fff'
              }}
            >
              <small style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--uva)' }}>TOTAL BORRADORES</small>
              <b style={{ fontSize: 24, color: 'var(--texto)' }}>{productosBorradores.length}</b>
              <span style={{ display: 'block', fontSize: 11.5, color: 'var(--texto-2)', marginTop: 2 }}>Ocultos en tienda web</span>
            </button>

            <button
              type="button"
              onClick={() => setFiltroCalidadBorradores(filtroCalidadBorradores === 'listos' ? 'todos' : 'listos')}
              className="erp-card"
              style={{
                margin: 0,
                padding: '14px 16px',
                textAlign: 'left',
                cursor: 'pointer',
                border: filtroCalidadBorradores === 'listos' ? '1.5px solid #00A650' : '1px solid var(--linea)',
                background: filtroCalidadBorradores === 'listos' ? '#EEFBF4' : '#fff'
              }}
            >
              <small style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#007A3B' }}>LISTOS PARA PUBLICAR</small>
              <b style={{ fontSize: 24, color: '#007A3B' }}>{resumenBorradores.listos}</b>
              <span style={{ display: 'block', fontSize: 11.5, color: 'var(--texto-2)', marginTop: 2 }}>Con foto y stock PEPS &gt; 0</span>
            </button>

            <button
              type="button"
              onClick={() => setFiltroCalidadBorradores(filtroCalidadBorradores === 'sin_foto' ? 'todos' : 'sin_foto')}
              className="erp-card"
              style={{
                margin: 0,
                padding: '14px 16px',
                textAlign: 'left',
                cursor: 'pointer',
                border: filtroCalidadBorradores === 'sin_foto' ? '1.5px solid #D97706' : '1px solid var(--linea)',
                background: filtroCalidadBorradores === 'sin_foto' ? '#FFFBEB' : '#fff'
              }}
            >
              <small style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#B45309' }}>SIN FOTOGRAFÍA</small>
              <b style={{ fontSize: 24, color: '#B45309' }}>{resumenBorradores.sinFoto}</b>
              <span style={{ display: 'block', fontSize: 11.5, color: 'var(--texto-2)', marginTop: 2 }}>Arrastra la foto en su tarjeta</span>
            </button>

            <button
              type="button"
              onClick={() => setFiltroCalidadBorradores(filtroCalidadBorradores === 'sin_stock' ? 'todos' : 'sin_stock')}
              className="erp-card"
              style={{
                margin: 0,
                padding: '14px 16px',
                textAlign: 'left',
                cursor: 'pointer',
                border: filtroCalidadBorradores === 'sin_stock' ? '1.5px solid #C8320A' : '1px solid var(--linea)',
                background: filtroCalidadBorradores === 'sin_stock' ? '#FFF5F3' : '#fff'
              }}
            >
              <small style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#C8320A' }}>SIN STOCK PEPS (0)</small>
              <b style={{ fontSize: 24, color: '#C8320A' }}>{resumenBorradores.sinStock}</b>
              <span style={{ display: 'block', fontSize: 11.5, color: 'var(--texto-2)', marginTop: 2 }}>Pendientes de lote en Almacén</span>
            </button>
          </div>

          {/* Barra de herramientas y filtros de Borradores */}
          <div className="erp-card" style={{ padding: '16px 20px', marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', gap: 12, flex: 1, minWidth: 280, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 210, maxWidth: 320 }}>
                  <label className="erp-label">Buscar en borradores</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      className="erp-input"
                      style={{ paddingLeft: 34 }}
                      placeholder="Código, nombre o marca..."
                      value={busquedaBorradores}
                      onChange={e => setBusquedaBorradores(e.target.value)}
                    />
                    <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--tenue)' }}>
                      <ErpIcon name="search" size={15} />
                    </span>
                  </div>
                </div>

                <div style={{ width: 220 }}>
                  <label className="erp-label">Categoría</label>
                  <ErpSelect
                    value={filtroCatBorradores}
                    onChange={setFiltroCatBorradores}
                    searchPlaceholder="Buscar categoría..."
                    options={opcionesCatBorradores}
                  />
                </div>

                <div style={{ width: 230 }}>
                  <label className="erp-label">Estado de preparación</label>
                  <ErpSelect
                    value={filtroCalidadBorradores}
                    onChange={setFiltroCalidadBorradores}
                    options={[
                      { value: 'todos', label: 'Todos los borradores', badge: productosBorradores.length },
                      { value: 'listos', label: 'Listos (Con foto y stock > 0)', badge: resumenBorradores.listos },
                      { value: 'con_foto', label: 'Con fotografía cargada', badge: resumenBorradores.conFoto },
                      { value: 'sin_foto', label: 'Sin fotografía', badge: resumenBorradores.sinFoto },
                      { value: 'sin_stock', label: 'Sin stock PEPS (= 0)', badge: resumenBorradores.sinStock }
                    ]}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => setPanelAbierto(panelAbierto === 'importar_excel' ? null : 'importar_excel')}
                className={`erp-btn ${panelAbierto === 'importar_excel' ? 'erp-btn--uva' : 'erp-btn--secundario'}`}
              >
                <ErpIcon name="clipboard" size={15} />
                <span>{panelAbierto === 'importar_excel' ? 'Cerrar Importador' : 'Importar más desde Excel'}</span>
              </button>
            </div>

            {/* Accesos rápidos de selección múltiple */}
            {borradoresFiltrados.length > 0 && (
              <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--linea)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--texto-2)' }}>Selección rápida:</span>
                  <button
                    type="button"
                    onClick={() => seleccionarGrupoBorradores('todos_filtrados')}
                    className="erp-btn erp-btn--secundario"
                    style={{ padding: '5px 10px', fontSize: 11.5 }}
                  >
                    Todos ({borradoresFiltrados.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => seleccionarGrupoBorradores('con_foto')}
                    className="erp-btn erp-btn--secundario"
                    style={{ padding: '5px 10px', fontSize: 11.5 }}
                  >
                    Solo con foto
                  </button>
                  <button
                    type="button"
                    onClick={() => seleccionarGrupoBorradores('listos')}
                    className="erp-btn erp-btn--secundario"
                    style={{ padding: '5px 10px', fontSize: 11.5 }}
                  >
                    Solo listos (Foto + Stock)
                  </button>
                  {seleccionBorradores.length > 0 && (
                    <button
                      type="button"
                      onClick={() => seleccionarGrupoBorradores('ninguno')}
                      className="link"
                      style={{ fontSize: 12 }}
                    >
                      Quitar selección ({seleccionBorradores.length})
                    </button>
                  )}
                </div>

                <span style={{ fontSize: 12, color: 'var(--texto-2)' }}>
                  Tip: arrastra una imagen directo sobre la foto de cualquier borrador para guardarla al instante.
                </span>
              </div>
            )}
          </div>

          {/* Barra contextual de acciones en lote cuando hay borradores seleccionados */}
          {seleccionBorradores.length > 0 && (
            <div
              className="erp-card erp-anim-1"
              style={{
                padding: '12px 18px',
                marginBottom: 16,
                border: '1.5px solid var(--uva)',
                background: '#FBF8FE',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 12
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="erp-badge erp-badge--uva" style={{ fontSize: 12 }}>
                  {seleccionBorradores.length} seleccionado(s)
                </span>
                <span style={{ fontSize: 12.5, color: 'var(--texto-2)' }}>
                  {borradoresSeleccionadosObjs.filter(p => !tieneFotoReal(p)).length > 0
                    ? `Aviso: ${borradoresSeleccionadosObjs.filter(p => !tieneFotoReal(p)).length} aún no tienen fotografía.`
                    : 'Todos los seleccionados tienen fotografía lista.'}
                </span>
              </div>

              {!confirmandoEliminarBorradores ? (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    disabled={publicandoMasivo || eliminandoBorradores}
                    onClick={() => setConfirmandoEliminarBorradores(true)}
                    className="erp-btn erp-btn--secundario"
                    style={{ color: '#C8320A', borderColor: '#F7C5B8', padding: '7px 13px', fontSize: 12 }}
                  >
                    <ErpIcon name="trash" size={14} />
                    <span>Eliminar borradores</span>
                  </button>
                  <button
                    type="button"
                    disabled={publicandoMasivo || eliminandoBorradores}
                    onClick={() => publicarBorradores(borradoresSeleccionadosObjs)}
                    className="erp-btn erp-btn--primario"
                    style={{ background: '#00A650', padding: '7px 16px', fontSize: 12.5 }}
                  >
                    <ErpIcon name="check" size={14} />
                    <span>
                      {publicandoMasivo
                        ? 'Publicando...'
                        : `Publicar ${seleccionBorradores.length} en Tienda Web`}
                    </span>
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#C8320A' }}>
                    ¿Eliminar {seleccionBorradores.length} borrador(es) de forma permanente?
                  </span>
                  <button
                    type="button"
                    onClick={() => setConfirmandoEliminarBorradores(false)}
                    className="erp-btn erp-btn--secundario"
                    style={{ padding: '6px 12px', fontSize: 12 }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={eliminandoBorradores}
                    onClick={eliminarBorradoresSeleccionados}
                    className="erp-btn"
                    style={{ background: '#C8320A', color: '#fff', padding: '6px 14px', fontSize: 12 }}
                  >
                    {eliminandoBorradores ? 'Eliminando...' : 'Sí, eliminar'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Lista de Borradores */}
          {cargando ? (
            <div className="erp-card" style={{ textAlign: 'center', padding: 48, color: 'var(--texto-2)' }}>
              Cargando bandeja de borradores...
            </div>
          ) : productosBorradores.length === 0 ? (
            <div className="erp-card" style={{ textAlign: 'center', padding: 48 }}>
              <b style={{ display: 'block', fontSize: 16, color: 'var(--texto)', marginBottom: 6 }}>
                Tu bandeja de borradores está al día
              </b>
              <p style={{ fontSize: 13, color: 'var(--texto-2)', marginBottom: 16 }}>
                Todos tus productos activos están publicados en la Tienda Web. Cuando importes un Excel o registres un borrador, aparecerá aquí para que lo revises y le subas foto.
              </p>
              <button
                type="button"
                onClick={() => setPanelAbierto('importar_excel')}
                className="erp-btn erp-btn--primario"
              >
                <ErpIcon name="clipboard" size={15} />
                <span>Importar productos desde Excel</span>
              </button>
            </div>
          ) : borradoresFiltrados.length === 0 ? (
            <div className="erp-card" style={{ textAlign: 'center', padding: 44, color: 'var(--tenue)' }}>
              No hay borradores que coincidan con este filtro.
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 14 }}>
                {borradoresPaginados.map(p => {
                  const fotoOk = tieneFotoReal(p);
                  const stockNum = Number(p.stock_web || 0);
                  const stockOk = stockNum > 0;
                  const piezasNum = Number(p.piezas_por_paquete || 0);
                  const listo = fotoOk && stockOk;
                  const seleccionado = seleccionBorradores.includes(p.id_producto);
                  const subiendoEste = subiendoFotoId === p.id_producto;
                  const dragSobreEste = dragOverBorradorId === p.id_producto;
                  const marcaTxt = normalizarMarca(p.marca);
                  const precioBase = Number(p.precio_unitario || 0);
                  const mayoreo = (precioBase * 0.95).toFixed(2);

                  return (
                    <article
                      key={p.id_producto}
                      className="erp-card"
                      style={{
                        margin: 0,
                        padding: 16,
                        border: seleccionado
                          ? '1.5px solid var(--uva)'
                          : listo
                          ? '1px solid #B7E4C7'
                          : '1px solid var(--linea)',
                        background: seleccionado ? '#FBF8FE' : '#fff',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12,
                        transition: 'border-color 0.15s, background 0.15s'
                      }}
                    >
                      {/* Cabecera de tarjeta: checkbox + código + estado general */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', minWidth: 0 }}>
                          <input
                            type="checkbox"
                            checked={seleccionado}
                            onChange={() => toggleSeleccionBorrador(p.id_producto)}
                            style={{ width: 16, height: 16, accentColor: 'var(--uva)', cursor: 'pointer' }}
                          />
                          <span style={{ fontFamily: 'monospace', fontSize: 11.5, fontWeight: 700, color: 'var(--tenue)' }}>
                            {p.codigo_barras}
                          </span>
                        </label>

                        <span className={`erp-badge ${listo ? 'erp-badge--verde' : 'erp-badge--amarillo'}`}>
                          <span className="erp-badge__dot" />
                          {listo ? 'Listo para publicar' : 'En preparación'}
                        </span>
                      </div>

                      {/* Cuerpo: Zona de foto rápida (clic o drag & drop) + datos del producto */}
                      <div style={{ display: 'flex', gap: 13, alignItems: 'stretch' }}>
                        <label
                          onDragOver={e => {
                            e.preventDefault();
                            setDragOverBorradorId(p.id_producto);
                          }}
                          onDragLeave={() => setDragOverBorradorId(null)}
                          onDrop={e => {
                            e.preventDefault();
                            setDragOverBorradorId(null);
                            const f = e.dataTransfer?.files?.[0];
                            if (f && f.type.startsWith('image/')) subirFotoRapidaBorrador(f, p);
                          }}
                          title="Haz clic o arrastra una fotografía aquí"
                          style={{
                            width: 92,
                            minHeight: 92,
                            borderRadius: 10,
                            border: dragSobreEste
                              ? '2px dashed var(--marca)'
                              : fotoOk
                              ? '1px solid var(--linea)'
                              : '1.5px dashed #D97706',
                            background: dragSobreEste ? '#FFF4FA' : fotoOk ? '#F9F8FB' : '#FFFBEB',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 6,
                            cursor: 'pointer',
                            position: 'relative',
                            flexShrink: 0,
                            overflow: 'hidden'
                          }}
                        >
                          <input
                            type="file"
                            accept="image/*"
                            hidden
                            onChange={e => {
                              const f = e.target.files?.[0];
                              if (f) subirFotoRapidaBorrador(f, p);
                              e.target.value = '';
                            }}
                          />

                          {subiendoEste ? (
                            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--uva)', textAlign: 'center' }}>
                              Subiendo...
                            </span>
                          ) : fotoOk ? (
                            <>
                              <img
                                src={resolverImagenProducto(p.imagen_url)}
                                alt={p.nombre_dulce}
                                style={{ width: '100%', height: 68, objectFit: 'contain' }}
                                onError={e => { e.currentTarget.src = '/img/ICONO.png'; }}
                              />
                              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--uva)', marginTop: 2 }}>
                                Cambiar foto
                              </span>
                            </>
                          ) : (
                            <div style={{ textAlign: 'center', color: '#B45309' }}>
                              <ErpIcon name="plus" size={18} />
                              <span style={{ display: 'block', fontSize: 10.5, fontWeight: 700, marginTop: 3, lineHeight: 1.2 }}>
                                Subir foto
                              </span>
                            </div>
                          )}
                        </label>

                        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                          <div>
                            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 4 }}>
                              <span className="erp-badge erp-badge--uva" style={{ fontSize: 10, padding: '1px 7px' }}>
                                {p.tbl_categorias?.nombre_categoria || 'General'}
                              </span>
                              {marcaTxt !== SIN_MARCA && (
                                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--texto-2)' }}>
                                  {marcaTxt}
                                </span>
                              )}
                            </div>

                            <h3
                              style={{
                                fontSize: 14.5,
                                fontWeight: 700,
                                color: 'var(--texto)',
                                margin: '0 0 2px',
                                lineHeight: 1.25
                              }}
                            >
                              {p.nombre_dulce}
                            </h3>

                            <p style={{ fontSize: 12, color: 'var(--texto-2)', margin: 0 }}>
                              {p.presentacion || 'Pieza'} · {p.es_transaccional ? 'Checkout Web' : 'Cotización WA'}
                            </p>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 6 }}>
                            <b style={{ fontSize: 16, color: 'var(--texto)' }}>${precioBase.toFixed(2)}</b>
                            <small style={{ fontSize: 11.5, color: '#007A3B', fontWeight: 600 }}>
                              5+: ${mayoreo}
                            </small>
                          </div>
                        </div>
                      </div>

                      {/* Semáforo de preparación */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: 6,
                            background: fotoOk ? '#E8F7EF' : '#FEF3C7',
                            color: fotoOk ? '#007A3B' : '#B45309'
                          }}
                        >
                          {fotoOk ? '✓ Foto lista' : '• Falta foto'}
                        </span>

                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: 6,
                            background: stockOk ? '#E8F7EF' : '#FDECE8',
                            color: stockOk ? '#007A3B' : '#C8320A'
                          }}
                        >
                          {stockOk ? `✓ Stock: ${stockNum}` : '• Stock PEPS: 0'}
                        </span>

                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            padding: '3px 8px',
                            borderRadius: 6,
                            background: '#F4F1F8',
                            color: piezasNum > 0 ? 'var(--uva)' : 'var(--tenue)'
                          }}
                        >
                          {piezasNum > 0 ? `${piezasNum} pzas/paq` : '0 pzas (no aguinaldo)'}
                        </span>
                      </div>

                      {/* Acciones directas de la tarjeta */}
                      <div style={{ display: 'flex', gap: 8, paddingTop: 10, borderTop: '1px solid var(--linea)' }}>
                        <button
                          type="button"
                          onClick={() => setProdPreviewWeb(p)}
                          className="erp-btn erp-btn--secundario"
                          style={{ padding: '6px 10px', fontSize: 12 }}
                          title="Ver cómo aparecerá en la tienda web"
                        >
                          <ErpIcon name="eye" size={14} />
                          <span>Vista web</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => abrirInspectorProducto(p)}
                          className="erp-btn erp-btn--secundario"
                          style={{ padding: '6px 10px', fontSize: 12 }}
                        >
                          Editar
                        </button>

                        <button
                          type="button"
                          disabled={publicandoMasivo}
                          onClick={() => publicarBorradores([p])}
                          className="erp-btn erp-btn--primario"
                          style={{
                            flex: 1,
                            padding: '6px 12px',
                            fontSize: 12,
                            background: listo ? '#00A650' : 'var(--marca)'
                          }}
                        >
                          <ErpIcon name="check" size={14} />
                          <span>Publicar</span>
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>

              {renderPaginacionGenerica(
                borradoresFiltrados.length,
                pagBorrSegura,
                totalPagBorradores,
                porPaginaBorradores,
                setPaginaBorradores,
                setPorPaginaBorradores
              )}
            </>
          )}
        </div>
      )}

      {/* ══════════ PESTAÑA 3: PRODUCTOS DADOS DE BAJA ══════════ */}
      {tab === 'bajas' && (
        <div className="erp-anim-2">
          <div className="erp-card" style={{ padding: '16px 20px', marginBottom: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 260, flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: 220, maxWidth: 380 }}>
                <input
                  className="erp-input"
                  style={{ paddingLeft: 34 }}
                  placeholder="Buscar en productos dados de baja..."
                  value={busquedaBajas}
                  onChange={e => setBusquedaBajas(e.target.value)}
                />
                <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--tenue)' }}>
                  <ErpIcon name="search" size={15} />
                </span>
              </div>

              <div style={{ width: 260 }}>
                <ErpSelect
                  value={filtroMotivoBaja}
                  onChange={setFiltroMotivoBaja}
                  options={[
                    { value: 'todos', label: 'Todos los motivos de baja' },
                    ...MOTIVOS_BAJA.map(m => ({ value: m, label: m }))
                  ]}
                />
              </div>
            </div>

            <span className="erp-badge erp-badge--naranja">
              {productosInactivos.length} productos retirados de la tienda web (Histórico intacto)
            </span>
          </div>

          {bajasFiltradas.length === 0 ? (
            <div className="erp-card" style={{ textAlign: 'center', padding: 48, color: 'var(--tenue)' }}>
              No hay productos dados de baja bajo este filtro.
            </div>
          ) : (
            <div className="erp-archived-grid">
              {bajasFiltradas.map(p => (
                <article key={p.id_producto} className="erp-archived-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <span className="erp-badge erp-badge--naranja">
                      {p.motivo_baja || 'Baja temporal'}
                    </span>
                    <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--tenue)', fontWeight: 700 }}>
                      Código: {p.codigo_barras}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="erp-prod-row-card__thumb">
                      <img
                        src={resolverImagenProducto(p.imagen_url)}
                        alt={p.nombre_dulce}
                        onError={e => { e.currentTarget.src = '/img/ICONO.png'; }}
                      />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <h3 style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--texto)' }}>{p.nombre_dulce}</h3>
                      <p style={{ fontSize: 12, color: 'var(--texto-2)' }}>
                        {normalizarMarca(p.marca)} · {p.presentacion} · <b>${Number(p.precio_unitario).toFixed(2)}</b>
                      </p>
                    </div>
                  </div>

                  <div className="erp-archived-reason-box">
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--texto-2)', marginBottom: 4 }}>
                      <span>Retirado por: <b>{p.baja_por || 'Administrador'}</b></span>
                      <span>
                        {p.fecha_baja ? new Date(p.fecha_baja).toLocaleDateString('es-MX') : ''}
                      </span>
                    </div>
                    {p.comentario_baja ? (
                      <p style={{ margin: 0, color: 'var(--texto)', fontWeight: 500 }}>
                        “{p.comentario_baja}”
                      </p>
                    ) : (
                      <span style={{ color: 'var(--tenue)' }}>Sin nota adicional registrada.</span>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, paddingTop: 4 }}>
                    <button
                      type="button"
                      onClick={() => abrirInspectorProducto(p)}
                      className="erp-btn erp-btn--secundario"
                      style={{ flex: 1, padding: '7px 12px', fontSize: 12 }}
                    >
                      Revisar / Editar precio
                    </button>
                    <button
                      type="button"
                      onClick={() => reactivarProducto(p, false)}
                      className="erp-btn erp-btn--primario"
                      style={{ flex: 1, padding: '7px 12px', fontSize: 12 }}
                    >
                      <ErpIcon name="check" size={14} />
                      <span>Reactivar</span>
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════ PESTAÑA 4: BANNERS ══════════ */}
      {tab === 'banners' && (
        <div className="erp-anim-2">
          <div id="simulador-banner-vivo" className="erp-card" style={{ padding: 20, marginBottom: 18, scrollMarginTop: 90 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <ErpIcon name="eye" size={17} style={{ color: 'var(--marca)' }} />
                <b style={{ fontSize: 14.5 }}>Vista Previa en Vivo:</b>
                <span className="erp-badge erp-badge--uva">{datosPreview.nombreSeleccionado}</span>
                <span className="erp-badge erp-badge--verde">
                  Destino: {datosPreview.destinoEtiqueta}
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  setMostrarFormBanner(!mostrarFormBanner);
                  setBannerEnSimulador('nuevo');
                }}
                className="erp-btn erp-btn--primario"
                style={{ padding: '7px 14px', fontSize: 12 }}
              >
                <span className={`erp-icon-rotate ${mostrarFormBanner ? 'abierto' : ''}`} style={{ display: 'inline-flex' }}>
                  <ErpIcon name="plus" size={14} />
                </span>
                <span>{mostrarFormBanner ? 'Cerrar Creador' : 'Nuevo Banner'}</span>
              </button>
            </div>

            <div className="erp-banner-stage" style={datosPreview.estiloFondo}>
              <span className="erp-banner-stage__tag">{datosPreview.tag}</span>
              <h2 className="erp-banner-stage__title">{datosPreview.titulo}</h2>
              <p className="erp-banner-stage__desc">{datosPreview.descripcion}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <span className="erp-banner-stage__btn">Ver promoción</span>
              </div>
            </div>
          </div>

          <div className={`erp-collapse ${mostrarFormBanner ? 'abierto' : ''}`}>
            <div className="erp-collapse__inner">
              <form
                onSubmit={crearBanner}
                onFocus={() => setBannerEnSimulador('nuevo')}
                className="erp-card"
                style={{ margin: 0, border: '1.5px solid var(--marca)', padding: 20, background: '#FAF8FC' }}
              >
                <div className="erp-card__header" style={{ marginBottom: 14, paddingBottom: 10 }}>
                  <div className="erp-card__title">
                    <ErpIcon name="plus" size={16} style={{ color: 'var(--marca)' }} />
                    <span>Crear Nuevo Banner Promocional</span>
                  </div>
                  <span className="erp-badge erp-badge--uva">Se inhabilita automáticamente al vencer a las 23:59 hrs</span>
                </div>

                <div className="erp-banner-config-grid">
                  <div className="erp-banner-config-box">
                    <div className="erp-banner-config-box__title">
                      <span>1. Contenido y Fondo Visual</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 10 }}>
                      <div>
                        <label className="erp-label">Título Principal *</label>
                        <input required className="erp-input" placeholder="Título principal del banner" value={nuevoBanner.titulo} onChange={e => setNuevoBanner({ ...nuevoBanner, titulo: e.target.value })} />
                      </div>
                      <div>
                        <label className="erp-label">Etiqueta Superior *</label>
                        <input required className="erp-input" placeholder="Texto corto superior" value={nuevoBanner.tag_corto} onChange={e => setNuevoBanner({ ...nuevoBanner, tag_corto: e.target.value })} />
                      </div>
                    </div>

                    <div>
                      <label className="erp-label">Descripción completa del banner *</label>
                      <input required className="erp-input" placeholder="Mensaje secundario que explica la promoción..." value={nuevoBanner.descripcion_banner} onChange={e => setNuevoBanner({ ...nuevoBanner, descripcion_banner: e.target.value })} />
                    </div>

                    <div>
                      <label className="erp-label">Imagen de Fondo (Opcional)</label>
                      <ErpImageUpload
                        compact
                        previewUrl={previewBannerNuevo}
                        title={archivoBannerNuevo ? 'Fondo personalizado listo' : 'Imagen panorámica de fondo'}
                        subtitle="Arrastra o elige una imagen · Si la dejas vacía usa el degradado corporativo"
                        buttonLabel={archivoBannerNuevo ? 'Cambiar fondo' : 'Subir fondo'}
                        onFileSelect={archivo => seleccionarFondoBannerLocal(archivo, null)}
                        onReset={archivoBannerNuevo ? () => {
                          setArchivoBannerNuevo(null);
                          setPreviewBannerNuevo('');
                        } : null}
                        resetLabel="Quitar"
                      />
                    </div>
                  </div>

                  <div className="erp-banner-config-box">
                    <div className="erp-banner-config-box__title">
                      <span>2. Destino del Clic y Vigencia (23:59 hrs)</span>
                    </div>

                    <div>
                      <label className="erp-label">Al hacer clic en el banner, llevar a: *</label>
                      <ErpSelect
                        value={nuevoBanner.destino}
                        onChange={val => setNuevoBanner({ ...nuevoBanner, destino: val })}
                        searchPlaceholder="Buscar destino, categoría o marca..."
                        options={opcionesDestinoBanner}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div>
                        <label className="erp-label">Inicia (00:00 hrs)</label>
                        <ErpDatePicker
                          value={nuevoBanner.fecha_inicio}
                          onChange={val => setNuevoBanner({ ...nuevoBanner, fecha_inicio: val })}
                        />
                      </div>
                      <div>
                        <label className="erp-label">Vence (23:59 hrs)</label>
                        <ErpDatePicker
                          value={nuevoBanner.fecha_expiracion}
                          min={nuevoBanner.fecha_inicio || hoyStr}
                          onChange={val => setNuevoBanner({ ...nuevoBanner, fecha_expiracion: val })}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
                  <button type="button" onClick={() => setMostrarFormBanner(false)} className="erp-btn erp-btn--secundario">
                    Cancelar
                  </button>
                  <button type="submit" disabled={subiendoBanner} className="erp-btn erp-btn--primario">
                    <ErpIcon name="check" size={14} />
                    <span>{subiendoBanner ? 'Publicando...' : 'Publicar Banner'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div style={{ display: 'grid', gap: 14 }}>
            {banners.map((b, idx) => {
              const { tag: tagActual, desc: descActual, destino: destinoActual } = descomponerLeyendaBanner(
                b.leyenda_exclusividad,
                b.imagen_banner_url
              );

              const urlFondoActiva = previewsBannersEdit[b.id_promocion] || b.imagen_banner_url;
              const estiloMiniatura = construirEstiloFondoBanner(urlFondoActiva, idx);
              const tieneImagenPersonalizada = esUrlImagenFondo(urlFondoActiva);
              const tieneCambioSinGuardar = Boolean(archivosBannersEdit[b.id_promocion]);
              const vigenciaBan = evaluarVigenciaBanner(b);
              const nombreDestino = destinosBanner.find(d => d.valor === destinoActual)?.etiqueta || 'Catálogo completo';
              const estaEditando = bannerEditandoId === b.id_promocion;

              return (
                <article
                  key={b.id_promocion}
                  className={`erp-banner-card ${bannerEnSimulador === b.id_promocion ? 'activo-preview' : ''} ${estaEditando ? 'editando' : ''}`}
                >
                  <div
                    className="erp-banner-card__summary"
                    onClick={() => previsualizarBannerArriba(b.id_promocion)}
                  >
                    <div className="erp-banner-card__thumb" style={estiloMiniatura}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 10, fontWeight: 800, background: 'rgba(0,0,0,0.5)', padding: '3px 8px', borderRadius: 99 }}>
                          BANNER #{idx + 1}
                        </span>
                        {tieneCambioSinGuardar && (
                          <span style={{ fontSize: 10, fontWeight: 800, background: '#FEDD00', color: '#3C1053', padding: '2px 7px', borderRadius: 99 }}>
                            Sin guardar
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: 13, fontWeight: 800, lineHeight: 1.2, textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>
                        {b.titulo}
                      </div>
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                        <span className="erp-badge erp-badge--uva">{tagActual}</span>
                        <span className={`erp-badge ${vigenciaBan.clase}`}>
                          <span className="erp-badge__dot" />
                          {vigenciaBan.etiqueta}
                        </span>
                      </div>

                      <h3 style={{ fontSize: 16.5, fontWeight: 800, color: 'var(--texto)', marginBottom: 4 }}>
                        {b.titulo}
                      </h3>

                      <p style={{ fontSize: 13, color: 'var(--texto-2)', lineHeight: 1.45, margin: 0 }}>
                        {descActual}
                      </p>

                      <div className="erp-banner-card__meta-pills">
                        <span className="erp-banner-pill">
                          <ErpIcon name="arrow-right" size={12} style={{ color: 'var(--marca)' }} />
                          <span>Al dar clic lleva a: <b style={{ color: 'var(--texto)' }}>{nombreDestino}</b></span>
                        </span>

                        <span className="erp-banner-pill">
                          <ErpIcon name="clock" size={12} style={{ color: 'var(--uva)' }} />
                          <span>
                            Vigencia: <b>{isoAFechaInput(b.fecha_inicio) || 'Inmediata'}</b> → <b>{isoAFechaInput(b.fecha_expiracion) || 'Sin límite'} (23:59)</b>
                          </span>
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => previsualizarBannerArriba(b.id_promocion)}
                        className="erp-btn erp-btn--secundario"
                        style={{ padding: '8px 13px', fontSize: 12 }}
                      >
                        <ErpIcon name="eye" size={14} />
                        <span>Previsualizar</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setBannerEnSimulador(b.id_promocion);
                          setBannerEditandoId(estaEditando ? null : b.id_promocion);
                        }}
                        className={`erp-btn ${estaEditando ? 'erp-btn--uva' : 'erp-btn--primario'}`}
                        style={{ padding: '8px 16px', fontSize: 12 }}
                      >
                        <span>{estaEditando ? 'Ocultar ajustes' : 'Configurar'}</span>
                      </button>
                    </div>
                  </div>

                  <div className={`erp-collapse ${estaEditando ? 'abierto' : ''}`} style={{ marginBottom: 0 }}>
                    <div className="erp-collapse__inner">
                      <div className="erp-banner-card__config">
                        <div className="erp-banner-config-grid">
                          <div className="erp-banner-config-box">
                            <div className="erp-banner-config-box__title">
                              <span>1. Textos y Fondo del Banner</span>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 12 }}>
                              <div>
                                <label className="erp-label">Título del Banner</label>
                                <input
                                  className="erp-input"
                                  style={{ fontWeight: 700 }}
                                  value={b.titulo}
                                  onChange={e => {
                                    const valor = e.target.value;
                                    setBanners(prev => prev.map((item, i) => (i === idx ? { ...item, titulo: valor } : item)));
                                  }}
                                />
                              </div>

                              <div>
                                <label className="erp-label">Etiqueta Superior</label>
                                <input
                                  className="erp-input"
                                  value={tagActual}
                                  onChange={e => {
                                    const valor = e.target.value;
                                    setBanners(prev =>
                                      prev.map((item, i) =>
                                        i === idx
                                          ? { ...item, leyenda_exclusividad: componerLeyendaBanner(valor, descActual, destinoActual) }
                                          : item
                                      )
                                    );
                                  }}
                                />
                              </div>
                            </div>

                            <div>
                              <label className="erp-label">Descripción completa del Banner</label>
                              <input
                                className="erp-input"
                                value={descActual}
                                onChange={e => {
                                  const valor = e.target.value;
                                  setBanners(prev =>
                                    prev.map((item, i) =>
                                      i === idx
                                        ? { ...item, leyenda_exclusividad: componerLeyendaBanner(tagActual, valor, destinoActual) }
                                        : item
                                    )
                                  );
                                }}
                              />
                            </div>

                            <div>
                              <label className="erp-label">Fondo Visual del Banner</label>
                              <ErpImageUpload
                                compact
                                previewUrl={tieneImagenPersonalizada ? resolverImagenProducto(urlFondoActiva) : ''}
                                title={tieneCambioSinGuardar ? 'Nueva imagen de fondo lista' : 'Imagen de fondo personalizada'}
                                subtitle={tieneImagenPersonalizada ? 'Haz clic o arrastra para reemplazar la imagen actual' : 'Usando color degradado corporativo · Arrastra una foto si deseas cambiarlo'}
                                buttonLabel="Cambiar fondo"
                                onFileSelect={archivo => seleccionarFondoBannerLocal(archivo, b.id_promocion)}
                                onReset={tieneImagenPersonalizada ? () => restaurarColorOriginalBanner(b) : null}
                                resetLabel="Usar degradado"
                              />
                            </div>
                          </div>

                          <div className="erp-banner-config-box">
                            <div className="erp-banner-config-box__title">
                              <span>2. Destino del Clic y Vigencia Automática</span>
                            </div>

                            <div>
                              <label className="erp-label">Al hacer clic en el banner, dirigir al cliente a:</label>
                              <ErpSelect
                                value={destinoActual}
                                onChange={val => {
                                  setBanners(prev =>
                                    prev.map((item, i) =>
                                      i === idx
                                        ? { ...item, leyenda_exclusividad: componerLeyendaBanner(tagActual, descActual, val) }
                                        : item
                                    )
                                  );
                                }}
                                searchPlaceholder="Buscar destino, categoría o marca..."
                                options={opcionesDestinoBanner}
                              />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                              <div>
                                <label className="erp-label">Inicia (00:00)</label>
                                <ErpDatePicker
                                  value={isoAFechaInput(b.fecha_inicio)}
                                  onChange={val => {
                                    const iso = fechaInputAIso(val, false);
                                    setBanners(prev => prev.map((item, i) => (i === idx ? { ...item, fecha_inicio: iso } : item)));
                                  }}
                                />
                              </div>

                              <div>
                                <label className="erp-label">Vence (23:59)</label>
                                <ErpDatePicker
                                  value={isoAFechaInput(b.fecha_expiracion)}
                                  min={isoAFechaInput(b.fecha_inicio)}
                                  onChange={val => {
                                    const iso = fechaInputAIso(val, true);
                                    setBanners(prev => prev.map((item, i) => (i === idx ? { ...item, fecha_expiracion: iso } : item)));
                                  }}
                                />
                              </div>

                              <div>
                                <label className="erp-label">Estado Manual</label>
                                <ErpSelect
                                  value={b.estado}
                                  onChange={val => {
                                    setBanners(prev => prev.map((item, i) => (i === idx ? { ...item, estado: val } : item)));
                                  }}
                                  options={[
                                    { value: 'Activo', label: 'Habilitado' },
                                    { value: 'Inactivo_Expirado', label: 'Inhabilitado' }
                                  ]}
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--linea)' }}>
                          <button
                            type="button"
                            onClick={() => eliminarBanner(b)}
                            className="erp-btn erp-btn--secundario"
                            style={{ color: '#C8320A', borderColor: '#F7C5B8', padding: '8px 14px', fontSize: 12 }}
                          >
                            <ErpIcon name="trash" size={14} />
                            <span>Eliminar Banner</span>
                          </button>

                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              type="button"
                              onClick={() => previsualizarBannerArriba(b.id_promocion)}
                              className="erp-btn erp-btn--secundario"
                              style={{ padding: '8px 14px', fontSize: 12 }}
                            >
                              <ErpIcon name="eye" size={14} />
                              <span>Ver en Simulador</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setBannerEditandoId(null)}
                              className="erp-btn erp-btn--secundario"
                              style={{ padding: '8px 14px', fontSize: 12 }}
                            >
                              Cerrar
                            </button>
                            <button
                              type="button"
                              disabled={subiendoBanner}
                              onClick={() => actualizarBanner(b)}
                              className="erp-btn erp-btn--primario"
                              style={{ padding: '8px 18px', fontSize: 12.5 }}
                            >
                              <ErpIcon name="check" size={14} />
                              <span>{subiendoBanner ? 'Guardando...' : 'Guardar Cambios'}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}

      {/* ══════════ PESTAÑA 5: BITÁCORA DE AUDITORÍA ══════════ */}
      {tab === 'auditoria' && usuarioActual.rol === 'admin' && (
        <div className="erp-anim-2">
          <div className="erp-card" style={{ padding: '16px 20px', marginBottom: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 280, flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: 220, maxWidth: 340 }}>
                <input
                  className="erp-input"
                  style={{ paddingLeft: 34 }}
                  placeholder="Buscar por producto, usuario o detalle..."
                  value={busquedaAuditoria}
                  onChange={e => setBusquedaAuditoria(e.target.value)}
                />
                <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--tenue)' }}>
                  <ErpIcon name="search" size={15} />
                </span>
              </div>

              <div style={{ width: 230 }}>
                <ErpSelect
                  value={filtroTipoAccion}
                  onChange={setFiltroTipoAccion}
                  options={[
                    { value: 'todos', label: 'Todos los tipos de movimiento' },
                    { value: 'EDICION_PRECIO_DATOS', label: 'Modificaciones y Precios' },
                    { value: 'DESCUENTO_MASIVO', label: 'Descuentos Masivos' },
                    { value: 'IMPORTACION_EXCEL', label: 'Importaciones Excel' },
                    { value: 'VISIBILIDAD_WEB', label: 'Visibilidad Web' },
                    { value: 'ELIMINACION_BORRADOR', label: 'Borradores Eliminados' },
                    { value: 'ALTA_PRODUCTO', label: 'Altas de Producto' },
                    { value: 'BAJA_LOGICA', label: 'Bajas de Catálogo' },
                    { value: 'REACTIVACION', label: 'Republicaciones' },
                    { value: 'EDICION_BANNER', label: 'Cambios en Banners' },
                    { value: 'ELIMINACION_BANNER', label: 'Banners Eliminados' }
                  ]}
                />
              </div>

              <div style={{ width: 220 }}>
                <ErpSelect
                  value={filtroUsuarioAuditoria}
                  onChange={setFiltroUsuarioAuditoria}
                  searchPlaceholder="Buscar colaborador..."
                  options={[
                    { value: 'todos', label: 'Todos los colaboradores' },
                    ...usuariosEnBitacora.map(u => ({ value: u, label: u }))
                  ]}
                />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="erp-badge erp-badge--uva">
                <ErpIcon name="lock" size={12} />
                <span>Registro Inmutable (Solo Lectura)</span>
              </span>
              <button type="button" onClick={cargarDatos} className="erp-btn erp-btn--secundario" style={{ padding: '6px 12px', fontSize: 12 }}>
                <ErpIcon name="refresh" size={14} />
                <span>Actualizar</span>
              </button>
            </div>
          </div>

          <div className="erp-tabla-wrap">
            <table className="erp-tabla">
              <thead>
                <tr>
                  <th>Fecha y Hora</th>
                  <th>Colaborador Responsable</th>
                  <th>Tipo de Movimiento</th>
                  <th>Producto / Elemento</th>
                  <th>Detalle de la Operación</th>
                  <th>Cambio Registrado (Antes → Nuevo)</th>
                </tr>
              </thead>
              <tbody>
                {bitacoraFiltrada.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--tenue)' }}>
                      Aún no hay movimientos registrados con este filtro.
                    </td>
                  </tr>
                ) : (
                  bitacoraFiltrada.map(reg => {
                    const infoTipo = ETIQUETA_TIPO_ACCION[reg.tipo_accion] || {
                      texto: reg.tipo_accion,
                      clase: 'erp-badge--uva'
                    };
                    return (
                      <tr key={reg.id_auditoria}>
                        <td style={{ whiteSpace: 'nowrap', fontSize: 12 }}>
                          <b style={{ display: 'block', color: 'var(--texto)' }}>
                            {new Date(reg.fecha_registro).toLocaleDateString('es-MX')}
                          </b>
                          <small style={{ color: 'var(--tenue)', fontFamily: 'monospace' }}>
                            {new Date(reg.fecha_registro).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </small>
                        </td>
                        <td>
                          <b style={{ display: 'block', fontSize: 13 }}>{reg.usuario_nombre}</b>
                          <small style={{ color: 'var(--texto-2)', fontSize: 11 }}>
                            {reg.usuario_correo || reg.usuario_rol}
                          </small>
                        </td>
                        <td>
                          <span className={`erp-badge ${infoTipo.clase}`}>{infoTipo.texto}</span>
                        </td>
                        <td>
                          <b style={{ display: 'block', fontSize: 13 }}>{reg.nombre_referencia}</b>
                          {reg.id_referencia && (
                            <small style={{ fontFamily: 'monospace', color: 'var(--tenue)', fontSize: 11 }}>
                              Ref: {reg.id_referencia}
                            </small>
                          )}
                        </td>
                        <td style={{ fontSize: 12.5, maxWidth: 280 }}>
                          {reg.descripcion_cambio}
                        </td>
                        <td>
                          <div className="erp-audit-diff">
                            {reg.valor_anterior && (
                              <span className="erp-audit-old">{reg.valor_anterior}</span>
                            )}
                            {reg.valor_anterior && reg.valor_nuevo && (
                              <span style={{ color: 'var(--tenue)' }}>→</span>
                            )}
                            {reg.valor_nuevo && (
                              <span className="erp-audit-new">{reg.valor_nuevo}</span>
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
      )}

      {/* ══════════ MODAL: VISTA PREVIA DE TARJETA EN TIENDA WEB ══════════ */}
      {prodPreviewWeb && (() => {
        const p = prodPreviewWeb;
        const vig = evaluarVigenciaDescuento(p);
        const precioBase = Number(p.precio_unitario || 0);
        const precioFinal = vig.activoEnTienda
          ? Number((precioBase * (1 - vig.pctEfectivo / 100)).toFixed(2))
          : precioBase;
        const precioMayoreo = (precioFinal * 0.95).toFixed(2);
        const fotoOk = tieneFotoReal(p);
        const agotado = Number(p.stock_web || 0) <= 0;
        const marcaTxt = normalizarMarca(p.marca);

        return (
          <div
            className="erp-drawer-backdrop"
            style={{ justifyContent: 'center', alignItems: 'center', padding: 20 }}
            onClick={() => setProdPreviewWeb(null)}
          >
            <div
              className="erp-card erp-anim-1"
              onClick={e => e.stopPropagation()}
              style={{
                margin: 0,
                width: '100%',
                maxWidth: 420,
                padding: 20,
                background: '#fff',
                borderRadius: 16
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div>
                  <span className="erp-badge erp-badge--uva">Simulación en Tienda Web</span>
                  <h3 style={{ fontSize: 15, fontWeight: 800, margin: '4px 0 0' }}>Así lo verá el cliente</h3>
                </div>
                <button type="button" onClick={() => setProdPreviewWeb(null)} className="cerrar">✕</button>
              </div>

              {/* Tarjeta simulada estilo TiendaCandy */}
              <div
                style={{
                  border: '1px solid #ECE6F2',
                  borderRadius: 16,
                  overflow: 'hidden',
                  background: '#fff',
                  boxShadow: '0 8px 24px rgba(60, 16, 83, 0.08)',
                  position: 'relative',
                  marginBottom: 14
                }}
              >
                {agotado ? (
                  <span style={{ position: 'absolute', top: 10, left: 10, background: '#5F5C68', color: '#fff', fontSize: 11, fontWeight: 800, padding: '3px 9px', borderRadius: 99 }}>
                    Agotado
                  </span>
                ) : vig.activoEnTienda ? (
                  <span style={{ position: 'absolute', top: 10, left: 10, background: '#EC008C', color: '#fff', fontSize: 11, fontWeight: 800, padding: '3px 9px', borderRadius: 99 }}>
                    {vig.pctEfectivo}% OFF
                  </span>
                ) : p.etiqueta_web === 'nuevo' ? (
                  <span style={{ position: 'absolute', top: 10, left: 10, background: '#3C1053', color: '#FEDD00', fontSize: 11, fontWeight: 800, padding: '3px 9px', borderRadius: 99 }}>
                    Nuevo
                  </span>
                ) : null}

                <div style={{ height: 190, background: '#FAF7FC', display: 'grid', placeItems: 'center', padding: 16 }}>
                  <img
                    src={resolverImagenProducto(p.imagen_url)}
                    alt={p.nombre_dulce}
                    style={{ maxHeight: 156, maxWidth: '100%', objectFit: 'contain' }}
                    onError={e => { e.currentTarget.src = '/img/ICONO.png'; }}
                  />
                </div>

                <div style={{ padding: 16 }}>
                  <p style={{ fontSize: 11.5, color: '#6E6678', margin: '0 0 4px', fontWeight: 600 }}>
                    {p.tbl_categorias?.nombre_categoria || 'Catálogo'}
                    {marcaTxt !== SIN_MARCA ? ` · ${marcaTxt}` : ''}
                  </p>
                  <h4 style={{ fontSize: 16, fontWeight: 800, color: '#22182C', margin: '0 0 8px', lineHeight: 1.25 }}>
                    {p.nombre_dulce}
                  </h4>

                  {vig.activoEnTienda && (
                    <span style={{ display: 'block', fontSize: 12, color: '#8F8899', textDecoration: 'line-through' }}>
                      ${precioBase.toFixed(2)}
                    </span>
                  )}

                  <p style={{ fontSize: 21, fontWeight: 900, color: '#22182C', margin: '0 0 4px' }}>
                    ${precioFinal.toFixed(2)}
                  </p>
                  <p style={{ fontSize: 12, color: '#6E6678', margin: '0 0 4px' }}>
                    {p.presentacion || 'Pieza'}
                  </p>
                  <p style={{ fontSize: 12, color: '#007A3B', fontWeight: 700, margin: '0 0 12px' }}>
                    Llevando 5+: ${precioMayoreo} c/u
                  </p>

                  {p.descripcion && (
                    <p style={{ fontSize: 12, color: '#5A5363', margin: '0 0 12px', lineHeight: 1.4 }}>
                      {p.descripcion}
                    </p>
                  )}

                  <div
                    style={{
                      textAlign: 'center',
                      padding: '9px 12px',
                      borderRadius: 10,
                      fontWeight: 800,
                      fontSize: 13,
                      background: agotado ? '#ECE9F1' : p.es_transaccional ? '#FCE7F3' : '#E7F8EE',
                      color: agotado ? '#756F7D' : p.es_transaccional ? '#C6007E' : '#007A3B'
                    }}
                  >
                    {agotado ? 'Agotado' : p.es_transaccional ? 'Agregar' : 'Cotizar por WhatsApp'}
                  </div>
                </div>
              </div>

              {(!fotoOk || agotado) && (
                <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: '9px 12px', fontSize: 12, color: '#92400E', marginBottom: 14 }}>
                  <b>Antes de publicar:</b>{' '}
                  {!fotoOk && 'falta subir fotografía real'}
                  {!fotoOk && agotado && ' y '}
                  {agotado && 'tiene stock en 0 (saldrá como Agotado hasta registrar su lote en Almacén)'}.
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => {
                    const copia = p;
                    setProdPreviewWeb(null);
                    abrirInspectorProducto(copia);
                  }}
                  className="erp-btn erp-btn--secundario"
                >
                  Editar datos
                </button>
                <button
                  type="button"
                  disabled={publicandoMasivo}
                  onClick={() => publicarBorradores([p])}
                  className="erp-btn erp-btn--primario"
                  style={{ background: '#00A650' }}
                >
                  <ErpIcon name="check" size={14} />
                  <span>{publicandoMasivo ? 'Publicando...' : 'Publicar en Tienda Web'}</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ══════════ PANEL INSPECTOR LATERAL DE PRODUCTO ══════════ */}
      {prodSeleccionado && (
        <div
          className={`erp-drawer-backdrop ${cerrandoInspector ? 'cerrando' : ''}`}
          onClick={cerrarInspector}
        >
          <aside
            className={`erp-drawer ${cerrandoInspector ? 'cerrando' : ''}`}
            onClick={e => e.stopPropagation()}
          >
            <header className="erp-drawer__head">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="erp-badge erp-badge--uva">Detalle del Producto</span>
                  {prodSeleccionado.publicado_web === false && prodSeleccionado.activo !== false && (
                    <span className="erp-badge erp-badge--amarillo">Borrador (Solo SIGE)</span>
                  )}
                  {prodSeleccionado.activo === false && (
                    <span className="erp-badge erp-badge--naranja">Dado de Baja</span>
                  )}
                </div>
                <h2 style={{ fontSize: 18, fontWeight: 800, marginTop: 4 }}>{prodSeleccionado.nombre_dulce}</h2>
              </div>
              <button type="button" onClick={cerrarInspector} className="cerrar">✕</button>
            </header>

            <div className="erp-drawer__body">
              {esBolsaCelofanSistema && (
                <div style={{ background: '#FFF9DE', border: '1px solid #F2E28A', borderRadius: 10, padding: '10px 12px', fontSize: 12, color: '#5F4B00', lineHeight: 1.45 }}>
                  <b>Artículo vinculado al calculador de Aguinaldos (<code>fie-06</code>):</b> La tienda suma este producto automáticamente para las bolsitas vacías. Mantén sus piezas por paquete mayores a 0 y el producto publicado para no afectar el cálculo.
                </div>
              )}

              {prodSeleccionado.activo === false && (
                <div className="erp-baja-confirm-box" style={{ background: '#FDECE8' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <b style={{ fontSize: 13, color: '#C8320A' }}>
                      Motivo de baja: {prodSeleccionado.motivo_baja || 'Retirado del catálogo'}
                    </b>
                    <span style={{ fontSize: 11, color: '#C8320A', fontWeight: 600 }}>
                      Por: {prodSeleccionado.baja_por || 'Administrador'}
                    </span>
                  </div>
                  {prodSeleccionado.comentario_baja && (
                    <p style={{ fontSize: 12.5, margin: 0, color: 'var(--texto)' }}>
                      Nota: “{prodSeleccionado.comentario_baja}”
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => reactivarProducto(prodSeleccionado, true)}
                    className="erp-btn erp-btn--primario"
                    style={{ width: '100%' }}
                  >
                    <ErpIcon name="check" size={15} />
                    <span>Reactivar Producto en Catálogo</span>
                  </button>
                </div>
              )}

              <ErpImageUpload
                previewUrl={tieneFotoReal(prodSeleccionado) ? resolverImagenProducto(prodSeleccionado.imagen_url) : ''}
                title="Fotografía en Tienda Web"
                subtitle="Arrastra una nueva foto aquí o haz clic · PNG sin fondo o WEBP"
                buttonLabel="Reemplazar foto"
                onFileSelect={archivo => subirFotoProducto(archivo, true)}
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="erp-label">Código del Producto</label>
                  <input
                    className="erp-input"
                    value={prodSeleccionado.codigo_barras || ''}
                    onChange={e => setProdSeleccionado({ ...prodSeleccionado, codigo_barras: e.target.value })}
                  />
                </div>
                <div>
                  <label className="erp-label">Categoría</label>
                  <ErpSelect
                    value={String(prodSeleccionado.id_categoria)}
                    onChange={val => setProdSeleccionado({ ...prodSeleccionado, id_categoria: Number(val) })}
                    searchPlaceholder="Buscar categoría..."
                    options={opcionesCatSimples}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="erp-label">Marca Comercial</label>
                  <ErpSelect
                    value={normalizarMarca(prodSeleccionado.marca)}
                    onChange={val => setProdSeleccionado({ ...prodSeleccionado, marca: val })}
                    searchPlaceholder="Buscar marca..."
                    options={opcionesMarcaProducto}
                  />
                </div>
                <div>
                  <label className="erp-label">Presentación</label>
                  <input
                    className="erp-input"
                    value={prodSeleccionado.presentacion || ''}
                    onChange={e => setProdSeleccionado({ ...prodSeleccionado, presentacion: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="erp-label">Nombre Comercial del Dulce</label>
                <input
                  className="erp-input"
                  style={{ fontWeight: 700 }}
                  value={prodSeleccionado.nombre_dulce}
                  onChange={e => setProdSeleccionado({ ...prodSeleccionado, nombre_dulce: e.target.value })}
                />
              </div>

              <div>
                <label className="erp-label">Descripción del Producto (Visible en la Tienda Web)</label>
                <textarea
                  rows={3}
                  className="erp-input"
                  style={{ resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.45 }}
                  placeholder="Describe el producto para los clientes de la tienda en línea..."
                  value={prodSeleccionado.descripcion || ''}
                  onChange={e => setProdSeleccionado({ ...prodSeleccionado, descripcion: e.target.value })}
                />
              </div>

              {/* CONFIGURACIÓN PARA AGUINALDOS Y DESTACADO WEB */}
              <div style={{ background: '#F7F5FA', border: '1px solid var(--linea)', borderRadius: 12, padding: 14, display: 'grid', gap: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 12 }}>
                  <div>
                    <label className="erp-label">Piezas por paquete (Aguinaldos)</label>
                    <input
                      type="number"
                      min="0"
                      className="erp-input"
                      style={{ fontWeight: 700 }}
                      value={prodSeleccionado.piezas_por_paquete ?? 0}
                      onChange={e => setProdSeleccionado({ ...prodSeleccionado, piezas_por_paquete: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="erp-label">Destacado en Tienda Web</label>
                    <ErpSelect
                      value={prodSeleccionado.etiqueta_web || 'normal'}
                      onChange={val => setProdSeleccionado({ ...prodSeleccionado, etiqueta_web: val })}
                      options={OPCIONES_ETIQUETA_WEB}
                    />
                  </div>
                </div>

                <div style={{ fontSize: 11.5, color: costoPorPiezaInspector ? '#007A3B' : 'var(--texto-2)', fontWeight: 600 }}>
                  {costoPorPiezaInspector
                    ? `✓ Apto para modo Aguinaldos · Costo aprox. por pieza: $${costoPorPiezaInspector} MXN`
                    : 'Con 0 piezas no aparecerá en el armador de Aguinaldos (solo catálogo y Piñata).'}
                </div>
              </div>

              {/* POLÍTICA DE PRECIOS Y VIGENCIA */}
              <div style={{ background: '#FCF9FD', border: '1px solid #DEC8EA', borderRadius: 12, padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--uva)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Política de Precios y Vigencia
                  </span>
                  {Number(prodSeleccionado.porcentaje_descuento) > 0 && (
                    <span className="erp-badge erp-badge--marca" style={{ fontSize: 10.5 }}>
                      Final: ${(Number(prodSeleccionado.precio_unitario || 0) * (1 - Number(prodSeleccionado.porcentaje_descuento) / 100)).toFixed(2)}
                    </span>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  <div>
                    <label className="erp-label">Precio Base ($)</label>
                    <input
                      type="number"
                      step="0.50"
                      className="erp-input"
                      style={{ fontWeight: 700 }}
                      value={prodSeleccionado.precio_unitario}
                      onChange={e => setProdSeleccionado({ ...prodSeleccionado, precio_unitario: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="erp-label">Mayoreo 5+ (−5%)</label>
                    <input
                      disabled
                      className="erp-input"
                      style={{ background: '#E8F7EF', color: '#007A3B', fontWeight: 700 }}
                      value={`$${(Number(prodSeleccionado.precio_unitario || 0) * 0.95).toFixed(2)}`}
                    />
                  </div>
                  <div>
                    <label className="erp-label">% Descuento</label>
                    <input
                      type="number"
                      min="0"
                      max="90"
                      className="erp-input"
                      value={prodSeleccionado.porcentaje_descuento || 0}
                      onChange={e => setProdSeleccionado({ ...prodSeleccionado, porcentaje_descuento: e.target.value })}
                    />
                  </div>
                </div>

                {Number(prodSeleccionado.porcentaje_descuento) > 0 && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px dashed #DEC8EA' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <small style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--uva)' }}>
                        Vigencia del descuento (Se desactiva solo a las 23:59):
                      </small>
                      {(prodSeleccionado._fechaInicioInput || prodSeleccionado._fechaFinInput) && (
                        <button
                          type="button"
                          onClick={() => setProdSeleccionado({ ...prodSeleccionado, _fechaInicioInput: '', _fechaFinInput: '' })}
                          className="link"
                          style={{ fontSize: 11 }}
                        >
                          Dejar permanente
                        </button>
                      )}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div>
                        <label className="erp-label">Inicia (00:00 hrs)</label>
                        <ErpDatePicker
                          value={prodSeleccionado._fechaInicioInput || ''}
                          onChange={val => setProdSeleccionado({ ...prodSeleccionado, _fechaInicioInput: val })}
                        />
                      </div>
                      <div>
                        <label className="erp-label">Termina (23:59 hrs)</label>
                        <ErpDatePicker
                          value={prodSeleccionado._fechaFinInput || ''}
                          min={prodSeleccionado._fechaInicioInput || ''}
                          onChange={val => setProdSeleccionado({ ...prodSeleccionado, _fechaFinInput: val })}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="erp-label">Existencia Disponible Web</label>
                  <input
                    type="number"
                    className="erp-input"
                    style={{ fontWeight: 700 }}
                    value={prodSeleccionado.stock_web}
                    onChange={e => setProdSeleccionado({ ...prodSeleccionado, stock_web: e.target.value })}
                  />
                </div>
                <div>
                  <label className="erp-label">Tope Máximo por Pedido</label>
                  <input
                    type="number"
                    className="erp-input"
                    value={prodSeleccionado.tope_maximo_compra}
                    onChange={e => setProdSeleccionado({ ...prodSeleccionado, tope_maximo_compra: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="erp-label">Visibilidad en Tienda Web</label>
                <ErpSelect
                  value={prodSeleccionado.publicado_web !== false ? 'web' : 'borrador'}
                  onChange={val => setProdSeleccionado({ ...prodSeleccionado, publicado_web: val === 'web' })}
                  options={[
                    { value: 'web', label: 'Publicado — Visible para clientes en la tienda' },
                    { value: 'borrador', label: 'Borrador — Mover a bandeja de Borradores (oculto en web)' }
                  ]}
                />
              </div>

              <div>
                <label className="erp-label">Modalidad de Compra en Tienda Web</label>
                <ErpSelect
                  value={prodSeleccionado.es_transaccional ? 'carrito' : 'cotizar'}
                  onChange={val => setProdSeleccionado({ ...prodSeleccionado, es_transaccional: val === 'carrito' })}
                  options={[
                    { value: 'carrito', label: 'Compra directa en línea (Checkout)' },
                    { value: 'cotizar', label: 'Bulto / Mayoreo — Solo Cotización por WhatsApp' }
                  ]}
                />
              </div>

              {prodSeleccionado.activo !== false && (
                <div style={{ paddingTop: 10, borderTop: '1px solid var(--linea)' }}>
                  {!mostrarConfirmarBaja ? (
                    <button
                      type="button"
                      onClick={() => setMostrarConfirmarBaja(true)}
                      className="erp-btn erp-btn--secundario"
                      style={{ width: '100%', color: '#C8320A', borderColor: '#F7C5B8' }}
                    >
                      <ErpIcon name="trash" size={15} />
                      <span>Dar de baja temporalmente del catálogo</span>
                    </button>
                  ) : (
                    <div className="erp-baja-confirm-box erp-anim-1">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <b style={{ fontSize: 13, color: '#C8320A' }}>Confirmar baja del catálogo activo</b>
                        <button
                          type="button"
                          onClick={() => setMostrarConfirmarBaja(false)}
                          className="link"
                          style={{ fontSize: 11.5 }}
                        >
                          Cancelar
                        </button>
                      </div>

                      {esBolsaCelofanSistema && (
                        <p style={{ margin: 0, fontSize: 12, color: '#C8320A', fontWeight: 600 }}>
                          Atención: dar de baja <code>fie-06</code> quitará las bolsitas automáticas del modo Aguinaldos.
                        </p>
                      )}

                      <div>
                        <label className="erp-label">Motivo de la baja *</label>
                        <ErpSelect
                          value={datosBaja.motivo}
                          onChange={val => setDatosBaja({ ...datosBaja, motivo: val })}
                          options={MOTIVOS_BAJA.map(m => ({ value: m, label: m }))}
                        />
                      </div>

                      <div>
                        <label className="erp-label">Nota o comentario adicional (Opcional)</label>
                        <input
                          className="erp-input"
                          placeholder="Indica detalles sobre cuándo reactivar o nota para el equipo..."
                          value={datosBaja.comentario}
                          onChange={e => setDatosBaja({ ...datosBaja, comentario: e.target.value })}
                        />
                      </div>

                      <small style={{ fontSize: 11.5, color: 'var(--texto-2)' }}>
                        Se guardará como responsable de la baja a <b>{usuarioActual.nombre}</b>. El producto se ocultará de la tienda web pero conservará todo su historial.
                      </small>

                      <button
                        type="button"
                        disabled={guardandoDetalle}
                        onClick={() => confirmarBajaProducto(prodSeleccionado)}
                        className="erp-btn"
                        style={{ background: '#C8320A', color: '#fff', width: '100%' }}
                      >
                        <ErpIcon name="check" size={15} />
                        <span>Confirmar Baja y Mover a Archivados</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div style={{ fontSize: 11.5, color: 'var(--tenue)', background: '#F9F8FB', padding: '8px 12px', borderRadius: 8, display: 'flex', justifyContent: 'space-between' }}>
                <span>Última edición por: <b>{prodSeleccionado.ultima_modificacion_por || usuarioActual.nombre}</b></span>
                {prodSeleccionado.fecha_ultima_modificacion && (
                  <span>{new Date(prodSeleccionado.fecha_ultima_modificacion).toLocaleDateString('es-MX')}</span>
                )}
              </div>
            </div>

            <footer className="erp-drawer__foot">
              <button
                type="button"
                onClick={cerrarInspector}
                className="erp-btn erp-btn--secundario"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={guardandoDetalle}
                onClick={() => guardarCambiosProducto(prodSeleccionado)}
                className="erp-btn erp-btn--primario"
              >
                <ErpIcon name="check" size={15} />
                <span>{guardandoDetalle ? 'Guardando...' : 'Guardar Cambios'}</span>
              </button>
            </footer>
          </aside>
        </div>
      )}

      {/* MENSAJE FLOTANTE INFERIOR */}
      {mensaje && (
        <div className={`erp-toast erp-toast--${mensaje.tipo} ${mensaje.saliendo ? 'saliendo' : ''}`}>
          <span className="erp-toast__icon">
            <ErpIcon name={mensaje.tipo === 'error' ? 'alert' : 'check'} size={14} />
          </span>
          <span>{mensaje.texto}</span>
          <div className="erp-toast__bar" />
        </div>
      )}
    </div>
  );
}