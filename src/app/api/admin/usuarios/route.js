// Ruta: src/app/api/admin/usuarios/route.js
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const ADMIN_ROLES = ['admin'];
const ROLES_ERP_VALIDOS = [
  'admin',
  'almacen_2norte',
  'asesor_crm',
  'cajero_sucursal',
];

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  const faltantes = [];
  if (!url) faltantes.push('NEXT_PUBLIC_SUPABASE_URL');
  if (!serviceKey) faltantes.push('SUPABASE_SERVICE_ROLE_KEY');

  if (faltantes.length > 0) {
    throw new Error(
      `Falta configurar en .env.local: ${faltantes.join(', ')}. Agrégala y reinicia el servidor (npm run dev).`
    );
  }

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function getSupabaseAnon() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) {
    throw new Error('Falta configurar NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local.');
  }

  return createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function obtenerOrigen(request) {
  const originHeader = request.headers.get('origin');
  if (originHeader) return originHeader;
  try {
    return new URL(request.url).origin;
  } catch {
    return process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  }
}

function traducirErrorAuth(mensaje = '') {
  const texto = String(mensaje).toLowerCase();
  if (texto.includes('already been registered') || texto.includes('already exists') || texto.includes('email_exists')) {
    return 'Ese correo electrónico ya está registrado en el sistema (puede pertenecer a otro usuario o a un cliente web).';
  }
  if (texto.includes('rate limit') || texto.includes('too many') || texto.includes('security purposes')) {
    return 'Por seguridad debes esperar 60 segundos antes de volver a enviar otro correo a esta dirección.';
  }
  if (texto.includes('invalid email')) {
    return 'El formato del correo electrónico no es válido.';
  }
  if (texto.includes('invalid api key') || texto.includes('jwt')) {
    return 'La SUPABASE_SERVICE_ROLE_KEY en .env.local no es válida.';
  }
  return mensaje || 'No se pudo completar la operación en Supabase Auth.';
}

async function verificarAdmin(request, supabaseAdmin) {
  const authHeader = request.headers.get('authorization');

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '').trim();
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return {
        error: 'Sesión inválida o expirada. Vuelve a iniciar sesión.',
        status: 401,
      };
    }

    const { data: perfil, error: perfilError } = await supabaseAdmin
      .from('tbl_perfiles_usuarios')
      .select('id_usuario, nombre_completo, email, rol, activo')
      .eq('id_usuario', user.id)
      .single();

    if (perfilError || !perfil) {
      return {
        error: 'No se encontró tu perfil en tbl_perfiles_usuarios.',
        status: 403,
      };
    }

    if (perfil.activo === false) {
      return {
        error: 'Tu cuenta se encuentra dada de baja.',
        status: 403,
      };
    }

    if (!ADMIN_ROLES.includes(String(perfil.rol || '').trim())) {
      return {
        error: 'Acceso denegado: se requiere rol de Administrador.',
        status: 403,
      };
    }

    return { user, perfil };
  }

  // Respaldo para Acceso Directo demo en desarrollo local
  const demoEmail = request.headers.get('x-erp-demo-admin');
  const permitirDemo =
    process.env.NODE_ENV !== 'production' ||
    process.env.ALLOW_DEMO_ADMIN === 'true';

  if (permitirDemo && demoEmail === 'admin@dulceriascandy.com') {
    return {
      user: null,
      perfil: {
        id_usuario: null,
        nombre_completo: 'Dirección / Administrador General (Demo)',
        email: demoEmail,
        rol: 'admin',
      },
    };
  }

  return {
    error: 'Sesión no autenticada. Inicia sesión con una cuenta de Administrador.',
    status: 401,
  };
}

async function registrarAuditoria(supabaseAdmin, adminPerfil, datos) {
  try {
    await supabaseAdmin.from('tbl_bitacora_auditoria').insert([
      {
        modulo: 'Usuarios SIGE Candy',
        tipo_accion: datos.tipo_accion,
        id_referencia: datos.id_referencia,
        nombre_referencia: datos.nombre_referencia,
        descripcion_cambio: datos.descripcion_cambio,
        valor_anterior: datos.valor_anterior || null,
        valor_nuevo: datos.valor_nuevo || null,
        usuario_id: adminPerfil.id_usuario || null,
        usuario_nombre: adminPerfil.nombre_completo || 'Administrador',
        usuario_correo: adminPerfil.email || null,
        usuario_rol: adminPerfil.rol || 'admin',
      },
    ]);
  } catch {
    // No interrumpir flujo principal si falla la bitácora
  }
}

// GET: Listar usuarios de SIGE Candy + estado de verificación en Auth + sucursales
export async function GET(request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const check = await verificarAdmin(request, supabaseAdmin);
    if (check.error) {
      return NextResponse.json({ error: check.error }, { status: check.status });
    }

    const [usuariosRes, sucursalesRes, authUsersRes] = await Promise.all([
      supabaseAdmin
        .from('tbl_perfiles_usuarios')
        .select(
          'id_usuario, nombre_completo, email, telefono, rol, sucursal_asignada, fecha_registro, activo, fecha_baja, motivo_baja'
        )
        .in('rol', ROLES_ERP_VALIDOS)
        .order('fecha_registro', { ascending: false }),
      supabaseAdmin
        .from('tbl_sucursales_pickup')
        .select('id_sucursal, nombre_sucursal, zona, activa')
        .eq('activa', true)
        .order('nombre_sucursal', { ascending: true }),
      supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    ]);

    if (usuariosRes.error) {
      return NextResponse.json({ error: usuariosRes.error.message }, { status: 400 });
    }

    const mapaAuth = new Map();
    for (const au of authUsersRes.data?.users || []) {
      mapaAuth.set(au.id, au);
    }

    const usuariosEnriquecidos = (usuariosRes.data || []).map((u) => {
      const authUser = mapaAuth.get(u.id_usuario);
      const emailConfirmado = Boolean(authUser?.email_confirmed_at);
      const correoPendiente =
        authUser?.new_email && authUser.new_email !== authUser.email
          ? authUser.new_email
          : null;

      return {
        ...u,
        activo: u.activo !== false,
        email: authUser?.email || u.email,
        email_confirmado: emailConfirmado,
        correo_pendiente: correoPendiente,
        ultimo_acceso: authUser?.last_sign_in_at || null,
      };
    });

    return NextResponse.json({
      usuarios: usuariosEnriquecidos,
      sucursales: sucursalesRes.data || [],
      admin_actual_id: check.perfil.id_usuario || null,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err.message || 'Error interno al consultar usuarios.' },
      { status: 500 }
    );
  }
}

// POST: Dar de alta usuario enviando correo real de activación (Invite)
export async function POST(request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const check = await verificarAdmin(request, supabaseAdmin);
    if (check.error) {
      return NextResponse.json({ error: check.error }, { status: check.status });
    }

    const body = await request.json();
    const {
      nombre_completo,
      email,
      telefono,
      rol,
      sucursal_asignada = null,
    } = body;

    if (!nombre_completo?.trim() || !email?.trim() || !telefono?.trim() || !rol) {
      return NextResponse.json(
        { error: 'Nombre completo, correo electrónico, teléfono y rol son obligatorios.' },
        { status: 400 }
      );
    }

    if (!ROLES_ERP_VALIDOS.includes(rol)) {
      return NextResponse.json(
        { error: `Rol inválido. Valores permitidos: ${ROLES_ERP_VALIDOS.join(', ')}` },
        { status: 400 }
      );
    }

    const emailLimpio = email.trim().toLowerCase();
    const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!regexEmail.test(emailLimpio)) {
      return NextResponse.json(
        { error: 'Ingresa un correo electrónico con formato válido.' },
        { status: 400 }
      );
    }

    const origin = obtenerOrigen(request);

    // 1. Invitar en Supabase Auth: crea cuenta SIN confirmar y envía correo de activación por Hostinger SMTP
    const { data: inviteData, error: inviteError } =
      await supabaseAdmin.auth.admin.inviteUserByEmail(emailLimpio, {
        redirectTo: `${origin}/login?modo=activar`,
        data: {
          nombre_completo: nombre_completo.trim(),
          rol,
          tipo_cuenta: 'sige',
        },
      });

    if (inviteError || !inviteData?.user) {
      return NextResponse.json(
        { error: traducirErrorAuth(inviteError?.message) },
        { status: 400 }
      );
    }

    const nuevoId = inviteData.user.id;

    // 2. Guardar perfil en tbl_perfiles_usuarios
    const { data: perfilCreado, error: perfilError } = await supabaseAdmin
      .from('tbl_perfiles_usuarios')
      .upsert(
        {
          id_usuario: nuevoId,
          nombre_completo: nombre_completo.trim(),
          email: emailLimpio,
          telefono: telefono.trim(),
          rol,
          sucursal_asignada: sucursal_asignada?.trim() || null,
          activo: true,
          fecha_baja: null,
          motivo_baja: null,
        },
        { onConflict: 'id_usuario' }
      )
      .select(
        'id_usuario, nombre_completo, email, telefono, rol, sucursal_asignada, fecha_registro, activo'
      )
      .single();

    if (perfilError) {
      await supabaseAdmin.auth.admin.deleteUser(nuevoId);
      return NextResponse.json(
        { error: `Error al guardar perfil en BD: ${perfilError.message}` },
        { status: 400 }
      );
    }

    await registrarAuditoria(supabaseAdmin, check.perfil, {
      tipo_accion: 'ALTA_USUARIO_INVITADO',
      id_referencia: nuevoId,
      nombre_referencia: perfilCreado.nombre_completo,
      descripcion_cambio: `Invitación de activación enviada a ${perfilCreado.email} con rol ${perfilCreado.rol}`,
      valor_nuevo: JSON.stringify({
        email: perfilCreado.email,
        rol: perfilCreado.rol,
        sucursal_asignada: perfilCreado.sucursal_asignada,
      }),
    });

    return NextResponse.json(
      {
        usuario: {
          ...perfilCreado,
          email_confirmado: false,
          correo_pendiente: null,
        },
        mensaje: `Se envió un correo de activación a ${emailLimpio}. El colaborador deberá abrir el enlace para validar su correo y crear su contraseña.`,
      },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: err.message || 'Error interno al registrar usuario.' },
      { status: 500 }
    );
  }
}

// PATCH: Editar perfil (con validación de nuevo correo), cambiar estatus (baja/reactivar) o reenviar correo
export async function PATCH(request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const check = await verificarAdmin(request, supabaseAdmin);
    if (check.error) {
      return NextResponse.json({ error: check.error }, { status: check.status });
    }

    const body = await request.json();
    const accion = body.accion || 'editar';
    const { id_usuario } = body;

    if (!id_usuario) {
      return NextResponse.json({ error: 'id_usuario es obligatorio.' }, { status: 400 });
    }

    const origin = obtenerOrigen(request);

    // =========================================================================
    // ACCIÓN 1: DAR DE BAJA O REACTIVAR USUARIO
    // =========================================================================
    if (accion === 'cambiar_estatus') {
      const nuevoActivo = Boolean(body.activo);
      const motivo = body.motivo_baja?.trim() || null;

      if (!nuevoActivo && check.perfil.id_usuario && check.perfil.id_usuario === id_usuario) {
        return NextResponse.json(
          { error: 'No puedes dar de baja tu propia cuenta mientras tienes la sesión abierta.' },
          { status: 400 }
        );
      }

      // Bloquear o desbloquear el acceso en Supabase Auth
      const { error: banErr } = await supabaseAdmin.auth.admin.updateUserById(id_usuario, {
        ban_duration: nuevoActivo ? 'none' : '876000h',
      });

      if (banErr) {
        return NextResponse.json(
          { error: traducirErrorAuth(banErr.message) },
          { status: 400 }
        );
      }

      const { data: actualizado, error: dbErr } = await supabaseAdmin
        .from('tbl_perfiles_usuarios')
        .update({
          activo: nuevoActivo,
          fecha_baja: nuevoActivo ? null : new Date().toISOString(),
          motivo_baja: nuevoActivo ? null : motivo,
        })
        .eq('id_usuario', id_usuario)
        .select(
          'id_usuario, nombre_completo, email, telefono, rol, sucursal_asignada, fecha_registro, activo, fecha_baja, motivo_baja'
        )
        .single();

      if (dbErr) {
        return NextResponse.json({ error: dbErr.message }, { status: 400 });
      }

      await registrarAuditoria(supabaseAdmin, check.perfil, {
        tipo_accion: nuevoActivo ? 'REACTIVACION_USUARIO' : 'BAJA_USUARIO',
        id_referencia: id_usuario,
        nombre_referencia: actualizado.nombre_completo,
        descripcion_cambio: nuevoActivo
          ? `Cuenta reactivada (${actualizado.email})`
          : `Usuario dado de baja (${actualizado.email})${motivo ? ` · Motivo: ${motivo}` : ''}`,
        valor_anterior: nuevoActivo ? 'Inactivo' : 'Activo',
        valor_nuevo: nuevoActivo ? 'Activo' : 'Inactivo',
      });

      return NextResponse.json({
        usuario: actualizado,
        mensaje: nuevoActivo
          ? `Cuenta de "${actualizado.nombre_completo}" reactivada correctamente.`
          : `Usuario "${actualizado.nombre_completo}" dado de baja. Su acceso a SIGE Candy ha sido bloqueado.`,
      });
    }

    // =========================================================================
    // ACCIÓN 2: REENVIAR CORREO DE ACTIVACIÓN O CAMBIO DE CORREO
    // =========================================================================
    if (accion === 'reenviar_verificacion') {
      const { data: authUserRes, error: authGetErr } =
        await supabaseAdmin.auth.admin.getUserById(id_usuario);

      if (authGetErr || !authUserRes?.user) {
        return NextResponse.json(
          { error: 'No se encontró la cuenta en Supabase Auth.' },
          { status: 404 }
        );
      }

      const authUser = authUserRes.user;
      const supabaseAnon = getSupabaseAnon();

      // Caso A: Tiene un cambio de correo pendiente
      if (authUser.new_email && authUser.new_email !== authUser.email) {
        const { error: resendErr } = await supabaseAnon.auth.resend({
          type: 'email_change',
          email: authUser.email,
          options: {
            emailRedirectTo: `${origin}/login?modo=correo_confirmado`,
          },
        });

        if (resendErr) {
          return NextResponse.json(
            { error: traducirErrorAuth(resendErr.message) },
            { status: 400 }
          );
        }

        return NextResponse.json({
          mensaje: `Se reenvió el correo de confirmación a ${authUser.new_email}.`,
        });
      }

      // Caso B: Cuenta nueva aún sin activar
      if (!authUser.email_confirmed_at) {
        // Primero intenta reenviar invitación; si Auth indica existente, usa resend signup
        const { error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(
          authUser.email,
          { redirectTo: `${origin}/login?modo=activar` }
        );

        if (inviteErr) {
          const { error: resendErr } = await supabaseAnon.auth.resend({
            type: 'signup',
            email: authUser.email,
            options: {
              emailRedirectTo: `${origin}/login?modo=activar`,
            },
          });

          if (resendErr) {
            return NextResponse.json(
              { error: traducirErrorAuth(resendErr.message) },
              { status: 400 }
            );
          }
        }

        return NextResponse.json({
          mensaje: `Se reenvió el enlace de activación a ${authUser.email}.`,
        });
      }

      return NextResponse.json({
        mensaje: 'Esta cuenta ya tiene su correo verificado.',
      });
    }

    // =========================================================================
    // ACCIÓN 3: EDITAR PERFIL (Y CONFIRMAR CAMBIO DE CORREO SI CAMBIÓ)
    // =========================================================================
    const {
      nombre_completo,
      email,
      telefono,
      rol,
      sucursal_asignada,
    } = body;

    if (!nombre_completo?.trim() || !telefono?.trim() || !rol) {
      return NextResponse.json(
        { error: 'Nombre completo, teléfono y rol son obligatorios.' },
        { status: 400 }
      );
    }

    if (!ROLES_ERP_VALIDOS.includes(rol)) {
      return NextResponse.json(
        { error: `Rol inválido. Valores permitidos: ${ROLES_ERP_VALIDOS.join(', ')}` },
        { status: 400 }
      );
    }

    const { data: anterior, error: antErr } = await supabaseAdmin
      .from('tbl_perfiles_usuarios')
      .select('nombre_completo, email, telefono, rol, sucursal_asignada')
      .eq('id_usuario', id_usuario)
      .single();

    if (antErr || !anterior) {
      return NextResponse.json({ error: 'Usuario no encontrado.' }, { status: 404 });
    }

    const { data: authUserRes } = await supabaseAdmin.auth.admin.getUserById(id_usuario);
    const authUser = authUserRes?.user;

    const emailActual = (authUser?.email || anterior.email || '').trim().toLowerCase();
    const emailSolicitado = email ? email.trim().toLowerCase() : emailActual;
    const cambioCorreo = emailSolicitado && emailSolicitado !== emailActual;

    let mensajeCorreo = '';
    let actualizarEmailEnTabla = false;

    if (cambioCorreo) {
      const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!regexEmail.test(emailSolicitado)) {
        return NextResponse.json(
          { error: 'El nuevo correo electrónico no tiene un formato válido.' },
          { status: 400 }
        );
      }

      // Verificar si el correo nuevo ya pertenece a otro perfil
      const { data: existente } = await supabaseAdmin
        .from('tbl_perfiles_usuarios')
        .select('id_usuario')
        .eq('email', emailSolicitado)
        .neq('id_usuario', id_usuario)
        .maybeSingle();

      if (existente) {
        return NextResponse.json(
          { error: 'Ese correo ya está asignado a otro usuario de SIGE Candy.' },
          { status: 400 }
        );
      }

      const supabaseAnon = getSupabaseAnon();

      if (authUser && !authUser.email_confirmed_at) {
        // Usuario aún NO activado (corrección de correo): actualizar y reenviar activación al nuevo
        const { error: updEmailErr } = await supabaseAdmin.auth.admin.updateUserById(
          id_usuario,
          { email: emailSolicitado, email_confirm: false }
        );

        if (updEmailErr) {
          return NextResponse.json(
            { error: traducirErrorAuth(updEmailErr.message) },
            { status: 400 }
          );
        }

        actualizarEmailEnTabla = true;

        const { error: resendErr } = await supabaseAnon.auth.resend({
          type: 'signup',
          email: emailSolicitado,
          options: { emailRedirectTo: `${origin}/login?modo=activar` },
        });

        mensajeCorreo = resendErr
          ? ` Correo corregido a ${emailSolicitado}, pero no se pudo enviar el enlace ahora (${traducirErrorAuth(resendErr.message)}). Usa el botón "Reenviar".`
          : ` Se envió un nuevo enlace de activación a ${emailSolicitado}.`;
      } else {
        // Usuario YA verificado: genera cambio pendiente en Auth y dispara correo de confirmación al nuevo correo
        const { error: genErr } = await supabaseAdmin.auth.admin.generateLink({
          type: 'email_change_new',
          email: emailActual,
          newEmail: emailSolicitado,
          options: {
            redirectTo: `${origin}/login?modo=correo_confirmado`,
          },
        });

        if (genErr) {
          return NextResponse.json(
            { error: traducirErrorAuth(genErr.message) },
            { status: 400 }
          );
        }

        const { error: resendErr } = await supabaseAnon.auth.resend({
          type: 'email_change',
          email: emailActual,
          options: {
            emailRedirectTo: `${origin}/login?modo=correo_confirmado`,
          },
        });

        mensajeCorreo = resendErr
          ? ` Cambio de correo a ${emailSolicitado} registrado, pero el envío automático devolvió aviso (${traducirErrorAuth(resendErr.message)}). Usa "Reenviar" en 60 segundos.`
          : ` Se envió un correo de confirmación a ${emailSolicitado}. El cambio se aplicará en cuanto el usuario haga clic en el enlace.`;
      }
    }

    const payloadUpdate = {
      nombre_completo: nombre_completo.trim(),
      telefono: telefono.trim(),
      rol,
      sucursal_asignada: sucursal_asignada?.trim() || null,
    };

    if (actualizarEmailEnTabla) {
      payloadUpdate.email = emailSolicitado;
    }

    const { data: actualizado, error: updateErr } = await supabaseAdmin
      .from('tbl_perfiles_usuarios')
      .update(payloadUpdate)
      .eq('id_usuario', id_usuario)
      .select(
        'id_usuario, nombre_completo, email, telefono, rol, sucursal_asignada, fecha_registro, activo, fecha_baja, motivo_baja'
      )
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 400 });
    }

    await registrarAuditoria(supabaseAdmin, check.perfil, {
      tipo_accion: cambioCorreo ? 'EDICION_USUARIO_Y_CORREO' : 'EDICION_USUARIO',
      id_referencia: id_usuario,
      nombre_referencia: actualizado.nombre_completo,
      descripcion_cambio: cambioCorreo
        ? `Perfil actualizado y cambio de correo solicitado (${emailActual} → ${emailSolicitado})`
        : `Perfil actualizado (${actualizado.email})`,
      valor_anterior: JSON.stringify(anterior),
      valor_nuevo: JSON.stringify({
        ...payloadUpdate,
        correo_solicitado: cambioCorreo ? emailSolicitado : emailActual,
      }),
    });

    return NextResponse.json({
      usuario: actualizado,
      mensaje: `Perfil de "${actualizado.nombre_completo}" actualizado correctamente.${mensajeCorreo}`,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err.message || 'Error interno al actualizar usuario.' },
      { status: 500 }
    );
  }
}