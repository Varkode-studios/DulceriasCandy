'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import ErpIcon from '@/components/erp/ErpIcon';

const FONDOS_ORIGINALES = [
  'linear-gradient(125deg, #EC008C 0%, #C6007E 55%, #7A1E86 100%)',
  'linear-gradient(125deg, #0085CA 0%, #0066A6 55%, #3C1053 100%)',
  'linear-gradient(125deg, #F7941D 0%, #EC008C 60%, #3C1053 100%)'
];

const MARCAS_DISPONIBLES_BASE = [
  'Ricolino',
  'De la Rosa',
  'Vero',
  "Hershey's",
  'Ferrero',
  "Canel's",
  'Chupa Chups',
  'Anáhuac',
  'La Poblana',
  'La Perla',
  'Dulcerías Candy'
];

const DESTINOS_BANNER = [
  { valor: '#oferta', etiqueta: 'Promoción: Productos con descuento activo (Buen Fin / Ofertas)' },
  { valor: '#catalogo', etiqueta: 'Catálogo completo (Todos los productos)' },
  { valor: '#pinata', etiqueta: 'Sección: Armador de Piñata interactivo' },
  { valor: '#cat:gomitas', etiqueta: 'Categoría: Gomitas' },
  { valor: '#cat:chocolates', etiqueta: 'Categoría: Chocolates' },
  { valor: '#cat:caramelos', etiqueta: 'Categoría: Caramelos' },
  { valor: '#cat:paletas', etiqueta: 'Categoría: Paletas' },
  { valor: '#cat:enchilados', etiqueta: 'Categoría: Enchilados' },
  { valor: '#cat:fiesta', etiqueta: 'Categoría: Fiesta y Piñatería' },
  { valor: '#marca:Ricolino', etiqueta: 'Marca: Ricolino' },
  { valor: '#marca:De la Rosa', etiqueta: 'Marca: De la Rosa' },
  { valor: '#marca:Vero', etiqueta: 'Marca: Vero' },
  { valor: "#marca:Hershey's", etiqueta: "Marca: Hershey's" },
  { valor: '#marca:Ferrero', etiqueta: 'Marca: Ferrero' },
  { valor: "#marca:Canel's", etiqueta: "Marca: Canel's" },
  { valor: '#marca:Chupa Chups', etiqueta: 'Marca: Chupa Chups' },
  { valor: '#marca:Anáhuac', etiqueta: 'Marca: Anáhuac' },
  { valor: '#marca:La Poblana', etiqueta: 'Marca: La Poblana' },
  { valor: '#marca:La Perla', etiqueta: 'Marca: La Perla' }
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
  BAJA_LOGICA: { texto: 'Baja de Catálogo', clase: 'erp-badge--naranja' },
  REACTIVACION: { texto: 'Republicación', clase: 'erp-badge--verde' },
  EDICION_BANNER: { texto: 'Banner Portada', clase: 'erp-badge--amarillo' },
  ELIMINACION_BANNER: { texto: 'Banner Eliminado', clase: 'erp-badge--naranja' }
};

const PORCENTAJES_RAPIDOS = [0, 5, 10, 15, 20, 25, 30, 50];

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

  const [tab, setTab] = useState('productos');
  const [modoVista, setModoVista] = useState('categorias');
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [banners, setBanners] = useState([]);
  const [bitacora, setBitacora] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState(null);

  // Filtros de productos activos
  const [busqueda, setBusqueda] = useState('');
  const [filtroCat, setFiltroCat] = useState('todas');
  const [filtroMarca, setFiltroMarca] = useState('todas');
  const [filtroStock, setFiltroStock] = useState('todos');
  const [filtroOferta, setFiltroOferta] = useState('todos');
  const [ordenPor, setOrdenPor] = useState('categoria');
  const [paginaActual, setPaginaActual] = useState(1);
  const [porPagina, setPorPagina] = useState(24);
  const [categoriasExpandidas, setCategoriasExpandidas] = useState({});

  // Filtros de productos dados de baja
  const [busquedaBajas, setBusquedaBajas] = useState('');
  const [filtroMotivoBaja, setFiltroMotivoBaja] = useState('todos');

  // Filtros de Bitácora
  const [busquedaAuditoria, setBusquedaAuditoria] = useState('');
  const [filtroTipoAccion, setFiltroTipoAccion] = useState('todos');
  const [filtroUsuarioAuditoria, setFiltroUsuarioAuditoria] = useState('todos');

  // Paneles desplegables superiores
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
    precio_unitario: '',
    porcentaje_descuento: 0,
    descuento_inicio: '',
    descuento_fin: '',
    tope_maximo_compra: 20,
    stock_web: 25,
    es_transaccional: true,
    imagen_url: 'img/Gomita.png'
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
    if (prodSeleccionado) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [prodSeleccionado]);

  // Carga el banner en el simulador superior y desliza suavemente la pantalla hasta él
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
      supabase.from('tbl_productos').select('*, tbl_categorias(nombre_categoria)').order('id_producto'),
      supabase.from('tbl_promociones_banners').select('*').order('id_promocion'),
      supabase.from('tbl_bitacora_auditoria').select('*').order('fecha_registro', { ascending: false }).limit(250)
    ]);

    if (cats) {
      setCategorias(cats);
      if (!descMasivo.id_categoria && cats.length > 0) {
        setDescMasivo(prev => ({ ...prev, id_categoria: String(cats[0].id_categoria) }));
      }
    }
    if (prods) setProductos(prods);
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

  const productosActivos = productos.filter(p => p.activo !== false);
  const productosInactivos = productos.filter(p => p.activo === false);

  const marcasDisponibles = Array.from(
    new Set([
      ...MARCAS_DISPONIBLES_BASE,
      ...productos.map(p => p.marca).filter(Boolean)
    ])
  ).sort((a, b) => a.localeCompare(b, 'es'));

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

  const productosFiltrados = productosActivos
    .filter(p => {
      if (filtroCat !== 'todas' && String(p.id_categoria) !== String(filtroCat)) return false;
      if (filtroMarca !== 'todas' && (p.marca || '').toLowerCase() !== filtroMarca.toLowerCase()) return false;

      const stock = Number(p.stock_web || 0);
      if (filtroStock === 'disponible' && stock <= 0) return false;
      if (filtroStock === 'bajo' && (stock <= 0 || stock > 10)) return false;
      if (filtroStock === 'agotado' && stock > 0) return false;

      const vig = evaluarVigenciaDescuento(p);
      if (filtroOferta === 'con_descuento' && !vig.activoEnTienda) return false;
      if (filtroOferta === 'sin_descuento' && vig.activoEnTienda) return false;
      if (filtroOferta === 'vencidos' && vig.estado !== 'vencido') return false;

      if (busqueda.trim()) {
        const texto = `${p.codigo_barras} ${p.nombre_dulce} ${p.marca || ''} ${p.presentacion || ''}`.toLowerCase();
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

  const obtenerProductosObjetivoDescuento = () => {
    if (descMasivo.alcance === 'todos') return productosActivos;
    if (descMasivo.alcance === 'filtrados') return productosFiltrados;
    if (descMasivo.alcance === 'categoria') {
      return productosActivos.filter(p => String(p.id_categoria) === String(descMasivo.id_categoria));
    }
    if (descMasivo.alcance === 'marca') {
      return productosActivos.filter(p => (p.marca || '').toLowerCase() === descMasivo.marca.toLowerCase());
    }
    return [];
  };

  const productosObjetivo = obtenerProductosObjetivoDescuento();

  async function ejecutarDescuentoMasivo(porcentajeExplicito = null) {
    const pct = porcentajeExplicito !== null
      ? Number(porcentajeExplicito)
      : Math.max(0, Math.min(90, Number(descMasivo.porcentaje || 0)));

    if (productosObjetivo.length === 0) {
      notificar('No hay productos activos dentro del criterio seleccionado', 'error');
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
      let etiquetaGrupo = 'Todo el catálogo activo';
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

  async function guardarCambiosProducto(prod) {
    setGuardandoDetalle(true);
    const original = productos.find(item => item.id_producto === prod.id_producto) || {};
    const precioMayoreo = Number((Number(prod.precio_unitario) * 0.95).toFixed(2));
    const ahoraIso = new Date().toISOString();

    const pctNum = Number(prod.porcentaje_descuento || 0);
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
    if ((original.marca || '') !== (prod.marca || '')) {
      cambiosDetectados.push('Marca');
      valoresAntes.push(`Marca: ${original.marca || 'Sin marca'}`);
      valoresNuevos.push(`Marca: ${prod.marca}`);
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
      valoresAntes.push(original.es_transaccional ? 'Carrito' : 'Cotización');
      valoresNuevos.push(prod.es_transaccional ? 'Carrito' : 'Cotización');
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
        marca: prod.marca || 'Dulcerías Candy',
        presentacion: prod.presentacion,
        precio_unitario: Number(prod.precio_unitario),
        precio_mayoreo_5_mas: precioMayoreo,
        porcentaje_descuento: pctNum,
        descuento_inicio: isoInicio,
        descuento_fin: isoFin,
        tope_maximo_compra: Number(prod.tope_maximo_compra || 20),
        stock_web: Number(prod.stock_web || 0),
        es_transaccional: prod.es_transaccional,
        imagen_url: prod.imagen_url,
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
          tipo_accion: 'EDICION_PRECIO_DATOS',
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
        valor_anterior: 'Estado: Activo en tienda',
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
        descripcion_cambio: `Republicó el producto en el catálogo activo (Precio: $${Number(prod.precio_unitario).toFixed(2)})`,
        valor_anterior: `Inactivo (${prod.motivo_baja || 'Archivado'})`,
        valor_nuevo: 'Estado: Activo en tienda'
      });

      notificar(`"${prod.nombre_dulce}" fue republicado en la tienda en línea`);
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

  async function subirFotoProducto(e, esInspector = false) {
    const archivo = e.target.files?.[0];
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
    const ahoraIso = new Date().toISOString();

    const { error } = await supabase.from('tbl_productos').insert([{
      codigo_barras: nuevoProd.codigo_barras,
      nombre_dulce: nuevoProd.nombre_dulce,
      descripcion: nuevoProd.descripcion,
      id_categoria: nuevoProd.id_categoria,
      marca: nuevoProd.marca,
      presentacion: nuevoProd.presentacion,
      precio_unitario: precioUnit,
      precio_mayoreo_5_mas: Number((precioUnit * 0.95).toFixed(2)),
      porcentaje_descuento: pctNum,
      descuento_inicio: pctNum > 0 && nuevoProd.descuento_inicio ? fechaInputAIso(nuevoProd.descuento_inicio, false) : null,
      descuento_fin: pctNum > 0 && nuevoProd.descuento_fin ? fechaInputAIso(nuevoProd.descuento_fin, true) : null,
      tope_maximo_compra: Number(nuevoProd.tope_maximo_compra),
      stock_web: Number(nuevoProd.stock_web),
      es_transaccional: nuevoProd.es_transaccional,
      imagen_url: nuevoProd.imagen_url,
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
        descripcion_cambio: `Registró nuevo producto en el catálogo (${nuevoProd.marca} · ${nuevoProd.presentacion})`,
        valor_anterior: 'Nuevo registro',
        valor_nuevo: `Precio: $${precioUnit.toFixed(2)} · Stock: ${nuevoProd.stock_web}`
      });

      notificar(`Producto "${nuevoProd.nombre_dulce}" agregado al catálogo`);
      setPanelAbierto(null);
      setNuevoProd({
        codigo_barras: '',
        nombre_dulce: '',
        descripcion: '',
        id_categoria: categorias[0]?.id_categoria || 1,
        marca: 'Ricolino',
        presentacion: 'Bolsa 1 kg',
        precio_unitario: '',
        porcentaje_descuento: 0,
        descuento_inicio: '',
        descuento_fin: '',
        tope_maximo_compra: 20,
        stock_web: 25,
        es_transaccional: true,
        imagen_url: 'img/Gomita.png'
      });
      cargarDatos();
    }
  }

  function seleccionarFondoBannerLocal(e, idPromocion = null) {
    const archivo = e.target.files?.[0];
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

      const nombreDestino = DESTINOS_BANNER.find(d => d.valor === nuevoBanner.destino)?.etiqueta || nuevoBanner.destino;

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

  function renderTarjetaProductoCompacta(p) {
    const vig = evaluarVigenciaDescuento(p);
    const precioBase = Number(p.precio_unitario || 0);
    const precioFinal = vig.activoEnTienda
      ? (precioBase * (1 - vig.pctEfectivo / 100)).toFixed(2)
      : precioBase.toFixed(2);
    const mayoreo = (precioBase * 0.95).toFixed(2);
    const agotado = Number(p.stock_web) <= 0;

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
            <span>·</span>
            <span style={{ fontWeight: 600, color: 'var(--uva)' }}>{p.marca || 'Dulcerías Candy'}</span>
          </div>
          <h3 className="erp-prod-row-card__name" title={p.nombre_dulce}>
            {p.nombre_dulce}
          </h3>
          <div className="erp-prod-row-card__pres">
            {p.presentacion || 'Pieza'} · {vig.estado === 'vencido' ? 'Oferta finalizada' : p.es_transaccional ? 'Carrito' : 'Cotización'}
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
              <span className="erp-badge erp-badge--amarillo" style={{ fontSize: 10, padding: '2px 7px' }}>
                {p.marca || 'Dulcerías Candy'}
              </span>
            </div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--texto)', lineHeight: 1.28, marginBottom: 2 }}>
              {p.nombre_dulce}
            </h3>
            <p style={{ fontSize: 12, color: 'var(--texto-2)' }}>
              {p.presentacion || 'Pieza'} · Tope: {p.tope_maximo_compra} pzas
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
              ? 'Venta en Carrito'
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

  function renderPaginacion() {
    if (productosFiltrados.length <= porPagina) return null;

    return (
      <div className="erp-pagination">
        <span style={{ fontSize: 12.5, color: 'var(--texto-2)' }}>
          Mostrando <b>{indiceInicio + 1}</b> – <b>{Math.min(indiceInicio + porPagina, productosFiltrados.length)}</b> de <b>{productosFiltrados.length}</b> productos
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <span style={{ color: 'var(--texto-2)' }}>Mostrar:</span>
            <select
              className="erp-select"
              style={{ width: 92, padding: '5px 28px 5px 10px', fontSize: 12 }}
              value={porPagina}
              onChange={e => setPorPagina(Number(e.target.value))}
            >
              <option value={24}>24</option>
              <option value={48}>48</option>
              <option value={96}>96</option>
            </select>
          </div>

          <div className="erp-pagination__btns">
            <button
              type="button"
              disabled={pagSegura === 1}
              onClick={() => setPaginaActual(pagSegura - 1)}
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
                  onClick={() => setPaginaActual(n)}
                  className={`erp-page-btn ${n === pagSegura ? 'activo' : ''}`}
                >
                  {n}
                </button>
              ))}
            <button
              type="button"
              disabled={pagSegura === totalPaginas}
              onClick={() => setPaginaActual(pagSegura + 1)}
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
      const txt = `${p.codigo_barras} ${p.nombre_dulce} ${p.marca || ''} ${p.motivo_baja || ''} ${p.comentario_baja || ''}`.toLowerCase();
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
      const etqDest = DESTINOS_BANNER.find(d => d.valor === nuevoBanner.destino)?.etiqueta || 'Catálogo completo';
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
      const etqDest = DESTINOS_BANNER.find(d => d.valor === destino)?.etiqueta || 'Catálogo completo';
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
      tag: 'ENVÍO GRATIS',
      titulo: 'Desde $399 te lo llevamos',
      descripcion: 'Dentro de la ciudad de Puebla, sin costo de envío.',
      destinoEtiqueta: 'Catálogo completo',
      estiloFondo: construirEstiloFondoBanner('', 0),
      nombreSeleccionado: 'Banner Principal'
    };
  };

  const datosPreview = obtenerDatosSimuladorBanner();

  return (
    <div>
      {/* ENCABEZADO CORPORATIVO CON LAS 4 SECCIONES */}
      <div className="erp-page-header erp-anim-1">
        <div>
          <span className="erp-badge erp-badge--uva">
            Sesión activa: {usuarioActual.nombre}
          </span>
          <h1 className="erp-page-title">Gestión de Catálogo, Descuentos y Auditoría</h1>
          <p className="erp-page-subtitle">
            Control de productos activos, promociones programadas con cierre automático a las 23:59 hrs, bajas y bitácora.
          </p>
        </div>

        <div className="erp-segmented" style={{ flexWrap: 'wrap' }}>
          <button
            type="button"
            className={tab === 'productos' ? 'activo' : ''}
            onClick={() => setTab('productos')}
          >
            <ErpIcon name="tag" size={15} />
            <span>Activos ({productosActivos.length})</span>
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
            <ErpIcon name="store" size={15} />
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

      {/* ══════════ PESTAÑA 1: PRODUCTOS ACTIVOS ══════════ */}
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
                    {productosObjetivo.length} productos seleccionados
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, alignItems: 'end' }}>
                  <div>
                    <label className="erp-label">1. Aplicar descuento por:</label>
                    <select
                      className="erp-select"
                      value={descMasivo.alcance}
                      onChange={e => setDescMasivo({ ...descMasivo, alcance: e.target.value })}
                    >
                      <option value="categoria">Categoría completa</option>
                      <option value="marca">Marca comercial</option>
                      <option value="todos">Todos los productos activos ({productosActivos.length})</option>
                      <option value="filtrados">Productos filtrados actualmente ({productosFiltrados.length})</option>
                    </select>
                  </div>

                  {descMasivo.alcance === 'categoria' && (
                    <div>
                      <label className="erp-label">2. Categoría objetivo:</label>
                      <select
                        className="erp-select"
                        value={descMasivo.id_categoria}
                        onChange={e => setDescMasivo({ ...descMasivo, id_categoria: e.target.value })}
                      >
                        {categorias.map(c => {
                          const totalCat = productosActivos.filter(p => Number(p.id_categoria) === Number(c.id_categoria)).length;
                          return (
                            <option key={c.id_categoria} value={c.id_categoria}>
                              {c.nombre_categoria} ({totalCat} activos)
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  )}

                  {descMasivo.alcance === 'marca' && (
                    <div>
                      <label className="erp-label">2. Marca objetivo:</label>
                      <select
                        className="erp-select"
                        value={descMasivo.marca}
                        onChange={e => setDescMasivo({ ...descMasivo, marca: e.target.value })}
                      >
                        {marcasDisponibles.map(m => {
                          const totalMarca = productosActivos.filter(p => (p.marca || '').toLowerCase() === m.toLowerCase()).length;
                          return (
                            <option key={m} value={m}>
                              {m} ({totalMarca} activos)
                            </option>
                          );
                        })}
                      </select>
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
                    <select
                      className="erp-select"
                      value={descMasivo.modalidadVigencia}
                      onChange={e => setDescMasivo({ ...descMasivo, modalidadVigencia: e.target.value })}
                    >
                      <option value="programado">Programar fechas (Regresa solo a precio normal a las 00:00)</option>
                      <option value="permanente">Permanente (Hasta retirarlo manualmente)</option>
                    </select>
                  </div>

                  {descMasivo.modalidadVigencia === 'programado' && (
                    <>
                      <div>
                        <label className="erp-label">Fecha de inicio (00:00 hrs):</label>
                        <input
                          type="date"
                          className="erp-input"
                          value={descMasivo.fecha_inicio}
                          onChange={e => setDescMasivo({ ...descMasivo, fecha_inicio: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="erp-label">Fecha límite (Termina a las 23:59 hrs) *:</label>
                        <input
                          type="date"
                          min={descMasivo.fecha_inicio || hoyStr}
                          className="erp-input"
                          value={descMasivo.fecha_fin}
                          onChange={e => setDescMasivo({ ...descMasivo, fecha_fin: e.target.value })}
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
                    <select className="erp-select" value={nuevoProd.id_categoria} onChange={e => setNuevoProd({ ...nuevoProd, id_categoria: Number(e.target.value) })}>
                      {categorias.map(c => <option key={c.id_categoria} value={c.id_categoria}>{c.nombre_categoria}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="erp-label">Marca *</label>
                    <select className="erp-select" value={nuevoProd.marca} onChange={e => setNuevoProd({ ...nuevoProd, marca: e.target.value })}>
                      {marcasDisponibles.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="erp-label">Presentación *</label>
                    <input required className="erp-input" placeholder="Bolsa, caja o paquete" value={nuevoProd.presentacion} onChange={e => setNuevoProd({ ...nuevoProd, presentacion: e.target.value })} />
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
                    <input type="file" accept="image/*" className="erp-input" style={{ padding: 7 }} onChange={e => subirFotoProducto(e, false)} />
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
                <select className="erp-select" value={filtroCat} onChange={e => setFiltroCat(e.target.value)}>
                  <option value="todas">Todas ({categorias.length})</option>
                  {categorias.map(c => (
                    <option key={c.id_categoria} value={c.id_categoria}>{c.nombre_categoria}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="erp-label">Marca</label>
                <select className="erp-select" value={filtroMarca} onChange={e => setFiltroMarca(e.target.value)}>
                  <option value="todas">Todas las marcas</option>
                  {marcasDisponibles.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="erp-label">Disponibilidad</label>
                <select className="erp-select" value={filtroStock} onChange={e => setFiltroStock(e.target.value)}>
                  <option value="todos">Todo el inventario</option>
                  <option value="disponible">Disponibles (&gt; 0)</option>
                  <option value="bajo">Existencia baja (≤ 10)</option>
                  <option value="agotado">Agotados (0)</option>
                </select>
              </div>

              <div>
                <label className="erp-label">Promoción</label>
                <select className="erp-select" value={filtroOferta} onChange={e => setFiltroOferta(e.target.value)}>
                  <option value="todos">Todos los precios</option>
                  <option value="con_descuento">Con descuento vigente</option>
                  <option value="sin_descuento">Precio regular (0%)</option>
                  <option value="vencidos">Ofertas vencidas</option>
                </select>
              </div>

              <div>
                <label className="erp-label">Ordenar por</label>
                <select className="erp-select" value={ordenPor} onChange={e => setOrdenPor(e.target.value)}>
                  <option value="categoria">Categoría</option>
                  <option value="nombre">Nombre (A - Z)</option>
                  <option value="precio_asc">Menor precio primero</option>
                  <option value="precio_desc">Mayor precio primero</option>
                  <option value="stock_asc">Menor existencia primero</option>
                  <option value="descuento_desc">Mayor descuento</option>
                </select>
              </div>
            </div>

            {hayFiltrosActivos && (
              <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--linea)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <span style={{ fontSize: 12.5, color: 'var(--texto-2)' }}>
                  Resultados filtrados: <b>{productosFiltrados.length}</b> de <b>{productosActivos.length}</b> productos activos.
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
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
                    <span>Programar descuento a estos {productosFiltrados.length} productos</span>
                  </button>
                  <button
                    type="button"
                    onClick={limpiarFiltros}
                    className="erp-btn erp-btn--secundario"
                    style={{ padding: '5px 11px', fontSize: 11.5, color: 'var(--naranja)' }}
                  >
                    Limpiar filtros
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* CONTENIDO DE PRODUCTOS ACTIVOS */}
          {cargando ? (
            <div className="erp-card" style={{ textAlign: 'center', padding: 48, color: 'var(--texto-2)' }}>
              Cargando catálogo de productos...
            </div>
          ) : productosFiltrados.length === 0 ? (
            <div className="erp-card" style={{ textAlign: 'center', padding: 48, color: 'var(--tenue)' }}>
              No se encontraron productos activos con los filtros seleccionados.
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
                  <span className="erp-cat-dir-count">{productosActivos.length}</span>
                </button>

                {categorias.map(c => {
                  const prodsCat = productosActivos.filter(p => Number(p.id_categoria) === Number(c.id_categoria));
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

                {filtroCat !== 'todas' && renderPaginacion()}
              </div>
            </div>
          ) : modoVista === 'tarjetas' ? (
            <div className="erp-anim-3">
              <div className="erp-catalog-grid">
                {productosPaginados.map(p => renderTarjetaCuadricula(p))}
              </div>
              {renderPaginacion()}
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
                      <th>Precio Unitario</th>
                      <th>Vigencia Oferta</th>
                      <th>Disponibilidad</th>
                      <th>Última Modificación</th>
                      <th style={{ textAlign: 'right' }}>Detalle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productosPaginados.map(p => {
                      const vig = evaluarVigenciaDescuento(p);
                      const agotado = Number(p.stock_web) <= 0;
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
                            <span style={{ fontSize: 12.5, color: 'var(--texto-2)', fontWeight: 600 }}>
                              {p.marca || 'Dulcerías Candy'}
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
                            <span style={{ fontSize: 11.5, color: vig.activoEnTienda ? 'var(--marca)' : 'var(--texto-2)', fontWeight: 600 }}>
                              {vig.etiqueta}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontSize: 12, fontWeight: 600, color: agotado ? '#C8320A' : '#007A3B' }}>
                              {agotado ? 'Agotado (0)' : `${p.stock_web} disp.`}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontSize: 11.5, color: 'var(--texto-2)' }}>
                              {p.ultima_modificacion_por || 'Sistema'}
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
              {renderPaginacion()}
            </div>
          )}
        </>
      )}

      {/* ══════════ PESTAÑA 2: APARTADO DE PRODUCTOS DADOS DE BAJA (ARCHIVO) ══════════ */}
      {tab === 'bajas' && (
        <div className="erp-anim-2">
          <div className="erp-card" style={{ padding: '16px 20px', marginBottom: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 260 }}>
              <div style={{ position: 'relative', flex: 1, maxWidth: 380 }}>
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

              <div style={{ width: 250 }}>
                <select
                  className="erp-select"
                  value={filtroMotivoBaja}
                  onChange={e => setFiltroMotivoBaja(e.target.value)}
                >
                  <option value="todos">Todos los motivos de baja</option>
                  {MOTIVOS_BAJA.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
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
                        {p.marca || 'Dulcerías Candy'} · {p.presentacion} · <b>${Number(p.precio_unitario).toFixed(2)}</b>
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
                      <span>Volver a Publicar</span>
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════ PESTAÑA 3: BANNERS CON DESPLAZAMIENTO AUTOMÁTICO A LA VISTA PREVIA ══════════ */}
      {tab === 'banners' && (
        <div className="erp-anim-2">
          {/* SIMULADOR EN VIVO ARRIBA (CON ID PARA SCROLL AUTOMÁTICO) */}
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

          {/* ACORDEÓN PARA CREAR NUEVO BANNER */}
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
                      <label className="link" style={{ fontSize: 11.5, cursor: 'pointer', textTransform: 'none' }}>
                        {archivoBannerNuevo ? '✓ Imagen cargada' : '+ Subir imagen de fondo'}
                        <input type="file" accept="image/*" hidden onChange={e => seleccionarFondoBannerLocal(e, null)} />
                      </label>
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
                  </div>

                  <div className="erp-banner-config-box">
                    <div className="erp-banner-config-box__title">
                      <span>2. Destino del Clic y Vigencia (23:59 hrs)</span>
                    </div>

                    <div>
                      <label className="erp-label">Al hacer clic en el banner, llevar a: *</label>
                      <select
                        className="erp-select"
                        value={nuevoBanner.destino}
                        onChange={e => setNuevoBanner({ ...nuevoBanner, destino: e.target.value })}
                      >
                        {DESTINOS_BANNER.map(d => (
                          <option key={d.valor} value={d.valor}>{d.etiqueta}</option>
                        ))}
                      </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div>
                        <label className="erp-label">Inicia (00:00 hrs)</label>
                        <input
                          type="date"
                          className="erp-input"
                          value={nuevoBanner.fecha_inicio}
                          onChange={e => setNuevoBanner({ ...nuevoBanner, fecha_inicio: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="erp-label">Vence (23:59 hrs)</label>
                        <input
                          type="date"
                          min={nuevoBanner.fecha_inicio || hoyStr}
                          className="erp-input"
                          value={nuevoBanner.fecha_expiracion}
                          onChange={e => setNuevoBanner({ ...nuevoBanner, fecha_expiracion: e.target.value })}
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

          {/* LISTA DE BANNERS: VISTA RESUMEN LIMPIA + CONFIGURACIÓN DESPLEGABLE */}
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
              const nombreDestino = DESTINOS_BANNER.find(d => d.valor === destinoActual)?.etiqueta || 'Catálogo completo';
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
                              <div style={{ display: 'flex', gap: 10 }}>
                                <label className="link" style={{ fontSize: 11.5, cursor: 'pointer', textTransform: 'none' }}>
                                  {tieneCambioSinGuardar ? '✓ Nueva foto lista' : 'Cambiar imagen de fondo'}
                                  <input
                                    type="file"
                                    accept="image/*"
                                    hidden
                                    onChange={e => seleccionarFondoBannerLocal(e, b.id_promocion)}
                                  />
                                </label>
                                {tieneImagenPersonalizada && (
                                  <button
                                    type="button"
                                    onClick={() => restaurarColorOriginalBanner(b)}
                                    className="link"
                                    style={{ fontSize: 11.5, color: '#C8320A', textTransform: 'none' }}
                                  >
                                    Restaurar color original
                                  </button>
                                )}
                              </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 12 }}>
                              <div>
                                <label className="erp-label">Título del Banner</label>
                                <input
                                  className="erp-input"
                                  style={{ fontWeight: 700 }}
                                  value={b.titulo}
                                  onChange={e => {
                                    const copia = [...banners];
                                    copia[idx].titulo = e.target.value;
                                    setBanners(copia);
                                  }}
                                />
                              </div>

                              <div>
                                <label className="erp-label">Etiqueta Superior</label>
                                <input
                                  className="erp-input"
                                  value={tagActual}
                                  onChange={e => {
                                    const copia = [...banners];
                                    copia[idx].leyenda_exclusividad = componerLeyendaBanner(e.target.value, descActual, destinoActual);
                                    setBanners(copia);
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
                                  const copia = [...banners];
                                  copia[idx].leyenda_exclusividad = componerLeyendaBanner(tagActual, e.target.value, destinoActual);
                                  setBanners(copia);
                                }}
                              />
                            </div>
                          </div>

                          <div className="erp-banner-config-box">
                            <div className="erp-banner-config-box__title">
                              <span>2. Destino del Clic y Vigencia Automática</span>
                            </div>

                            <div>
                              <label className="erp-label">Al hacer clic en el banner, dirigir al cliente a:</label>
                              <select
                                className="erp-select"
                                value={destinoActual}
                                onChange={e => {
                                  const copia = [...banners];
                                  copia[idx].leyenda_exclusividad = componerLeyendaBanner(tagActual, descActual, e.target.value);
                                  setBanners(copia);
                                }}
                              >
                                {DESTINOS_BANNER.map(d => (
                                  <option key={d.valor} value={d.valor}>{d.etiqueta}</option>
                                ))}
                              </select>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                              <div>
                                <label className="erp-label">Inicia (00:00)</label>
                                <input
                                  type="date"
                                  className="erp-input"
                                  value={isoAFechaInput(b.fecha_inicio)}
                                  onChange={e => {
                                    const copia = [...banners];
                                    copia[idx].fecha_inicio = fechaInputAIso(e.target.value, false);
                                    setBanners(copia);
                                  }}
                                />
                              </div>

                              <div>
                                <label className="erp-label">Vence (23:59)</label>
                                <input
                                  type="date"
                                  className="erp-input"
                                  value={isoAFechaInput(b.fecha_expiracion)}
                                  onChange={e => {
                                    const copia = [...banners];
                                    copia[idx].fecha_expiracion = fechaInputAIso(e.target.value, true);
                                    setBanners(copia);
                                  }}
                                />
                              </div>

                              <div>
                                <label className="erp-label">Estado Manual</label>
                                <select
                                  className="erp-select"
                                  value={b.estado}
                                  onChange={e => {
                                    const copia = [...banners];
                                    copia[idx].estado = e.target.value;
                                    setBanners(copia);
                                  }}
                                >
                                  <option value="Activo">Habilitado</option>
                                  <option value="Inactivo_Expirado">Inhabilitado</option>
                                </select>
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

      {/* ══════════ PESTAÑA 4: BITÁCORA DE AUDITORÍA (EXCLUSIVA ADMINISTRADORES) ══════════ */}
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

              <div style={{ width: 220 }}>
                <select
                  className="erp-select"
                  value={filtroTipoAccion}
                  onChange={e => setFiltroTipoAccion(e.target.value)}
                >
                  <option value="todos">Todos los tipos de movimiento</option>
                  <option value="EDICION_PRECIO_DATOS">Modificaciones y Precios</option>
                  <option value="DESCUENTO_MASIVO">Descuentos Masivos</option>
                  <option value="ALTA_PRODUCTO">Altas de Producto</option>
                  <option value="BAJA_LOGICA">Bajas de Catálogo</option>
                  <option value="REACTIVACION">Republicaciones</option>
                  <option value="EDICION_BANNER">Cambios en Banners</option>
                  <option value="ELIMINACION_BANNER">Banners Eliminados</option>
                </select>
              </div>

              <div style={{ width: 210 }}>
                <select
                  className="erp-select"
                  value={filtroUsuarioAuditoria}
                  onChange={e => setFiltroUsuarioAuditoria(e.target.value)}
                >
                  <option value="todos">Todos los colaboradores</option>
                  {usuariosEnBitacora.map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
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
                  {prodSeleccionado.activo === false && (
                    <span className="erp-badge erp-badge--naranja">Dado de Baja</span>
                  )}
                </div>
                <h2 style={{ fontSize: 18, fontWeight: 800, marginTop: 4 }}>{prodSeleccionado.nombre_dulce}</h2>
              </div>
              <button type="button" onClick={cerrarInspector} className="cerrar">✕</button>
            </header>

            <div className="erp-drawer__body">
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
                    <span>Volver a Publicar en la Tienda Web</span>
                  </button>
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: 18, background: '#F9F8FB', padding: 16, borderRadius: 12, border: '1px solid var(--linea)' }}>
                <div style={{ width: 88, height: 88, borderRadius: 12, background: '#fff', border: '1px solid var(--linea)', padding: 10, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                  <img
                    src={resolverImagenProducto(prodSeleccionado.imagen_url)}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    onError={e => { e.currentTarget.src = '/img/ICONO.png'; }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <b style={{ fontSize: 13.5, display: 'block', marginBottom: 4 }}>Fotografía en Tienda Web</b>
                  <p style={{ fontSize: 12, color: 'var(--texto-2)', marginBottom: 10 }}>
                    Formatos recomendados: PNG sin fondo o WEBP.
                  </p>
                  <label className="erp-btn erp-btn--secundario" style={{ padding: '7px 14px', fontSize: 12, cursor: 'pointer' }}>
                    <ErpIcon name="plus" size={14} />
                    <span>Reemplazar fotografía</span>
                    <input type="file" accept="image/*" hidden onChange={e => subirFotoProducto(e, true)} />
                  </label>
                </div>
              </div>

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
                  <select
                    className="erp-select"
                    value={prodSeleccionado.id_categoria}
                    onChange={e => setProdSeleccionado({ ...prodSeleccionado, id_categoria: Number(e.target.value) })}
                  >
                    {categorias.map(c => (
                      <option key={c.id_categoria} value={c.id_categoria}>{c.nombre_categoria}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="erp-label">Marca Comercial</label>
                  <select
                    className="erp-select"
                    value={prodSeleccionado.marca || 'Dulcerías Candy'}
                    onChange={e => setProdSeleccionado({ ...prodSeleccionado, marca: e.target.value })}
                  >
                    {marcasDisponibles.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
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
                        <input
                          type="date"
                          className="erp-input"
                          value={prodSeleccionado._fechaInicioInput || ''}
                          onChange={e => setProdSeleccionado({ ...prodSeleccionado, _fechaInicioInput: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="erp-label">Termina (23:59 hrs)</label>
                        <input
                          type="date"
                          className="erp-input"
                          value={prodSeleccionado._fechaFinInput || ''}
                          onChange={e => setProdSeleccionado({ ...prodSeleccionado, _fechaFinInput: e.target.value })}
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
                <label className="erp-label">Modalidad de Compra en Tienda Web</label>
                <select
                  className="erp-select"
                  value={prodSeleccionado.es_transaccional ? 'carrito' : 'cotizar'}
                  onChange={e => setProdSeleccionado({ ...prodSeleccionado, es_transaccional: e.target.value === 'carrito' })}
                >
                  <option value="carrito">Venta directa en Carrito de Compras</option>
                  <option value="cotizar">Bulto / Mayoreo — Solo Cotización por WhatsApp</option>
                </select>
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

                      <div>
                        <label className="erp-label">Motivo de la baja *</label>
                        <select
                          className="erp-select"
                          value={datosBaja.motivo}
                          onChange={e => setDatosBaja({ ...datosBaja, motivo: e.target.value })}
                        >
                          {MOTIVOS_BAJA.map(m => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
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

      {/* MENSAJE FLOTANTE INFERIOR DE GUARDADO */}
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