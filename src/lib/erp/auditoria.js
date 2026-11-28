export const MODULOS_AUDITORIA = {
  ACCESOS: 'Accesos y Seguridad',
  CATALOGO: 'Catálogo y Precios',
  ALMACEN: 'Almacén 2 Norte',
  SURTIDO: 'Surtido y Corte 4:30',
  ENTREGAS: 'Recepción y Entrega QR',
  CRM: 'CRM y Garantías 24h',
  USUARIOS: 'Usuarios y Roles'
};

export function obtenerResumenDispositivo() {
  if (typeof navigator === 'undefined') return 'Servidor';
  const ua = navigator.userAgent || '';

  let navegador = 'Navegador';
  if (ua.includes('Edg/')) navegador = 'Edge';
  else if (ua.includes('Chrome/')) navegador = 'Chrome';
  else if (ua.includes('Firefox/')) navegador = 'Firefox';
  else if (ua.includes('Safari/')) navegador = 'Safari';

  let sistema = 'Equipo';
  if (ua.includes('Windows')) sistema = 'Windows';
  else if (ua.includes('Mac OS')) sistema = 'macOS';
  else if (ua.includes('Android')) sistema = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) sistema = 'iOS';
  else if (ua.includes('Linux')) sistema = 'Linux';

  return `${navegador} en ${sistema}`;
}

function leerSesionLocal() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('candy_erp_sesion');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function registrarAuditoria(
  supabase,
  {
    modulo = MODULOS_AUDITORIA.ACCESOS,
    tipo_accion,
    id_referencia = '',
    nombre_referencia = '',
    descripcion_cambio = '',
    valor_anterior = null,
    valor_nuevo = null,
    usuario = null
  }
) {
  if (!supabase || !tipo_accion) return { ok: false };

  const sesion = usuario || leerSesionLocal() || {};

  try {
    const { error } = await supabase.from('tbl_bitacora_auditoria').insert([
      {
        modulo,
        tipo_accion,
        id_referencia: String(id_referencia || ''),
        nombre_referencia: nombre_referencia || 'Evento del sistema',
        descripcion_cambio,
        valor_anterior,
        valor_nuevo,
        usuario_id: sesion.id_usuario || null,
        usuario_nombre: sesion.nombre || sesion.nombre_completo || 'Usuario del sistema',
        usuario_correo: sesion.correo || sesion.email || null,
        usuario_rol: sesion.rol || 'sin_rol'
      }
    ]);

    if (error) {
      console.warn('[SIGE Auditoría]:', error.message);
      return { ok: false, error };
    }
    return { ok: true };
  } catch (err) {
    console.warn('[SIGE Auditoría]:', err.message);
    return { ok: false, error: err };
  }
}

export async function registrarInicioSesion(supabase, usuario) {
  const dispositivo = obtenerResumenDispositivo();
  return registrarAuditoria(supabase, {
    modulo: MODULOS_AUDITORIA.ACCESOS,
    tipo_accion: 'INICIO_SESION',
    id_referencia: usuario?.rol || 'sesion',
    nombre_referencia: usuario?.nombre || usuario?.correo || 'Colaborador',
    descripcion_cambio: `Inició sesión en SIGE Candy desde ${dispositivo}`,
    valor_anterior: 'Desconectado',
    valor_nuevo: `Sesión activa (${usuario?.rol || 'admin'})`,
    usuario
  });
}

export async function registrarCierreSesion(supabase, usuario) {
  const dispositivo = obtenerResumenDispositivo();
  return registrarAuditoria(supabase, {
    modulo: MODULOS_AUDITORIA.ACCESOS,
    tipo_accion: 'CIERRE_SESION',
    id_referencia: usuario?.rol || 'sesion',
    nombre_referencia: usuario?.nombre || usuario?.correo || 'Colaborador',
    descripcion_cambio: `Cerró sesión voluntariamente desde ${dispositivo}`,
    valor_anterior: 'Sesión activa',
    valor_nuevo: 'Sesión cerrada',
    usuario
  });
}

export async function registrarIntentoFallido(supabase, { correo, motivo }) {
  const dispositivo = obtenerResumenDispositivo();
  return registrarAuditoria(supabase, {
    modulo: MODULOS_AUDITORIA.ACCESOS,
    tipo_accion: 'INTENTO_FALLIDO',
    id_referencia: correo || 'desconocido',
    nombre_referencia: correo || 'Correo no especificado',
    descripcion_cambio: `Intento de acceso rechazado desde ${dispositivo}: ${motivo || 'Credenciales inválidas'}`,
    valor_anterior: 'Sin acceso',
    valor_nuevo: 'Bloqueado',
    usuario: {
      id_usuario: null,
      nombre: correo || 'Acceso no autorizado',
      correo: correo || null,
      rol: 'externo'
    }
  });
}