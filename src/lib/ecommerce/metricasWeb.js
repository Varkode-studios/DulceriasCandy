const KEY_SESSION_ID = 'candy_web_sid_v1';
const KEY_VISITA_REG = 'candy_web_visita_ok';
const KEY_VISTAS_PROD = 'candy_web_vistas_prod_v1';

export function obtenerSessionIdWeb() {
  if (typeof window === 'undefined') return 'ssr';
  try {
    let sid = sessionStorage.getItem(KEY_SESSION_ID);
    if (!sid) {
      sid = `sid_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
      sessionStorage.setItem(KEY_SESSION_ID, sid);
    }
    return sid;
  } catch {
    return `sid_${Date.now().toString(36)}`;
  }
}

export function detectarDispositivoWeb() {
  if (typeof window === 'undefined') return 'escritorio';
  const ancho = window.innerWidth || 1200;
  const ua = (navigator.userAgent || '').toLowerCase();
  if (ancho <= 768 || /android|iphone|ipad|ipod|mobile/.test(ua)) {
    return 'movil';
  }
  return 'escritorio';
}

export function registrarMetricaWeb(
  supabase,
  {
    tipo_evento,
    id_producto = null,
    codigo_barras = null,
    nombre_producto = null,
    categoria = null,
    valor_texto = null,
    cantidad = 1,
    monto = 0,
    id_cliente = null
  }
) {
  if (!supabase || !tipo_evento) return;

  const payload = {
    session_id: obtenerSessionIdWeb(),
    tipo_evento,
    id_producto: id_producto ? Number(id_producto) : null,
    codigo_barras: codigo_barras ? String(codigo_barras) : null,
    nombre_producto: nombre_producto ? String(nombre_producto).slice(0, 180) : null,
    categoria: categoria ? String(categoria).slice(0, 80) : null,
    valor_texto: valor_texto ? String(valor_texto).slice(0, 220) : null,
    cantidad: Math.max(0, Number(cantidad || 1)),
    monto: Number(Number(monto || 0).toFixed(2)),
    dispositivo: detectarDispositivoWeb(),
    id_cliente: id_cliente || null
  };

  // Envío silencioso en segundo plano para no frenar la tienda
  Promise.resolve(supabase.from('tbl_metricas_web').insert([payload])).catch(() => {});
}

export function registrarVisitaUnica(supabase, id_cliente = null) {
  if (typeof window === 'undefined') return;
  try {
    if (sessionStorage.getItem(KEY_VISITA_REG)) return;
    sessionStorage.setItem(KEY_VISITA_REG, '1');
  } catch {}

  registrarMetricaWeb(supabase, {
    tipo_evento: 'visita_tienda',
    valor_texto: window.location.pathname || '/',
    id_cliente
  });
}

export function registrarVistaProductoUnica(supabase, datosProducto) {
  if (typeof window === 'undefined' || !datosProducto?.codigo_barras) return;
  const clave = String(datosProducto.codigo_barras);

  try {
    const vistas = JSON.parse(sessionStorage.getItem(KEY_VISTAS_PROD) || '[]');
    if (vistas.includes(clave)) return;
    vistas.push(clave);
    sessionStorage.setItem(KEY_VISTAS_PROD, JSON.stringify(vistas.slice(-150)));
  } catch {}

  registrarMetricaWeb(supabase, {
    tipo_evento: 'vista_producto',
    ...datosProducto
  });
}