import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const CONFIG_ENVIO = {
  costoEnvio: 59,
  envioGratisDesde: 399, // Cambia a null si deciden cobrar $59 fijos sin importar el monto
  piezasParaDescuento: 5,
  descuentoPorProducto: 0.05
};

function detectarMarcaTarjeta(num = '') {
  const n = String(num).replace(/\D/g, '');
  if (/^3[47]/.test(n)) return 'amex';
  if (/^4/.test(n)) return 'visa';
  if (/^(5[1-5]|2[2-7])/.test(n)) return 'mc';
  return '';
}

function calcularTurnoSurtido() {
  const ahoraMx = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'America/Mexico_City' })
  );
  const hora = ahoraMx.getHours();
  const minutos = ahoraMx.getMinutes();
  // Corte administrativo 4:30 PM (16:30)
  return hora > 16 || (hora === 16 && minutos >= 30) ? 'dia_siguiente' : 'mismo_dia';
}

function generarFolio() {
  const hoy = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: '2-digit',
    month: '2-digit',
    day: '2-digit'
  })
    .format(new Date())
    .replace(/-/g, '');
  const sufijo = Math.floor(1000 + Math.random() * 9000);
  return `CND-${hoy}-${sufijo}`;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { cliente, metodo, lineas, tarjeta, id_cliente } = body || {};

    if (!cliente?.nombre || !cliente?.correo || !cliente?.tel) {
      return NextResponse.json(
        { error: 'Faltan datos obligatorios del cliente.' },
        { status: 400 }
      );
    }

    if (!Array.isArray(lineas) || lineas.length === 0) {
      return NextResponse.json(
        { error: 'Tu pedido no contiene productos.' },
        { status: 400 }
      );
    }

    if (metodo === 'efectivo' && cliente.tipo !== 'sucursal') {
      return NextResponse.json(
        { error: 'El pago en efectivo solo está disponible al recoger en sucursal.' },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    // Consultar productos activos en Supabase para calcular con precios reales
    const { data: prodsDB } = await supabase
      .from('tbl_productos')
      .select('*')
      .eq('activo', true);

    const ahora = new Date();
    let subtotal = 0;
    let descuentoMayoreo = 0;
    const detalleInsertar = [];

    for (const item of lineas) {
      const cantidad = Math.max(1, Math.round(Number(item.cant || 0)));
      const prodDB = (prodsDB || []).find(
        p => String(p.codigo_barras) === String(item.id) || String(p.id_producto) === String(item.id)
      );

      let precioUnitario = Number(item.precio || 0);

      if (prodDB) {
        let descPct = Number(prodDB.porcentaje_descuento || 0);
        if (descPct > 0) {
          const inicio = prodDB.descuento_inicio ? new Date(prodDB.descuento_inicio) : null;
          const fin = prodDB.descuento_fin ? new Date(prodDB.descuento_fin) : null;
          if ((inicio && ahora < inicio) || (fin && ahora > fin)) {
            descPct = 0;
          }
        }
        const base = Number(prodDB.precio_unitario || 0);
        precioUnitario = descPct > 0 ? Number((base * (1 - descPct / 100)).toFixed(2)) : base;
      }

      const bruto = Number((precioUnitario * cantidad).toFixed(2));
      const aplica5 = cantidad >= CONFIG_ENVIO.piezasParaDescuento;
      const ahorro = aplica5 ? Number((bruto * CONFIG_ENVIO.descuentoPorProducto).toFixed(2)) : 0;
      const neto = Number((bruto - ahorro).toFixed(2));

      subtotal += bruto;
      descuentoMayoreo += ahorro;

      detalleInsertar.push({
        id_producto: prodDB ? prodDB.id_producto : null,
        codigo_barras: prodDB ? prodDB.codigo_barras : String(item.id),
        nombre_producto: prodDB ? prodDB.nombre_dulce : String(item.nombre || 'Producto'),
        presentacion: prodDB ? prodDB.presentacion : String(item.unidad || 'Pieza'),
        cantidad,
        precio_unitario: precioUnitario,
        aplica_descuento_5: aplica5,
        descuento_linea: ahorro,
        subtotal_linea: neto
      });
    }

    const totalProductos = Number((subtotal - descuentoMayoreo).toFixed(2));
    const aplicaEnvioGratis =
      CONFIG_ENVIO.envioGratisDesde !== null && totalProductos >= CONFIG_ENVIO.envioGratisDesde;
    const costoEnvio =
      cliente.tipo === 'sucursal' || aplicaEnvioGratis ? 0 : CONFIG_ENVIO.costoEnvio;
    const totalFinal = Number((totalProductos + costoEnvio).toFixed(2));

    // Solo conservamos marca y últimos 4 dígitos; jamás almacenamos PAN completo ni CVV
    let marca = null;
    let ultimos = null;
    if (metodo === 'tarjeta' && tarjeta?.num) {
      const soloDig = String(tarjeta.num).replace(/\D/g, '');
      marca = detectarMarcaTarjeta(soloDig) || 'tarjeta';
      ultimos = soloDig.slice(-4);
    }

    const estadoPago =
      metodo === 'tarjeta'
        ? 'pagado'
        : metodo === 'spei'
        ? 'pendiente_spei'
        : 'pago_en_sucursal';

    const folio = generarFolio();
    const codigoQr = `QR-${folio}`;
    const turnoSurtido = calcularTurnoSurtido();

    const { data: pedidoCreado, error: errorPedido } = await supabase
      .from('tbl_pedidos')
      .insert([{
        folio,
        codigo_qr: codigoQr,
        id_cliente: id_cliente || null,
        cliente_nombre: cliente.nombre,
        cliente_correo: cliente.correo,
        cliente_telefono: cliente.tel,
        tipo_entrega: cliente.tipo,
        sucursal_recoleccion: cliente.tipo === 'sucursal' ? cliente.sucursal : null,
        direccion_calle: cliente.tipo === 'domicilio' ? cliente.calle : null,
        direccion_colonia: cliente.tipo === 'domicilio' ? cliente.colonia : null,
        direccion_cp: cliente.tipo === 'domicilio' ? cliente.cp : null,
        direccion_referencias: cliente.tipo === 'domicilio' ? cliente.ref || null : null,
        metodo_pago: metodo,
        estado_pago: estadoPago,
        tarjeta_marca: marca,
        tarjeta_ultimos4: ultimos,
        subtotal: Number(subtotal.toFixed(2)),
        descuento_mayoreo: Number(descuentoMayoreo.toFixed(2)),
        costo_envio: costoEnvio,
        total: totalFinal,
        estado_pedido: 'recibido',
        turno_surtido: turnoSurtido
      }])
      .select()
      .single();

    if (errorPedido) {
      return NextResponse.json(
        { error: 'Error al registrar el pedido: ' + errorPedido.message },
        { status: 500 }
      );
    }

    const partidasConPedido = detalleInsertar.map(d => ({
      ...d,
      id_pedido: pedidoCreado.id_pedido
    }));

    const { error: errorDetalle } = await supabase
      .from('tbl_detalle_pedidos')
      .insert(partidasConPedido);

    if (errorDetalle) {
      return NextResponse.json(
        { error: 'Pedido creado pero falló el detalle: ' + errorDetalle.message },
        { status: 500 }
      );
    }

    // Si hay cliente autenticado, guardamos su última dirección/sucursal para futuras compras
    if (id_cliente) {
      await supabase
        .from('tbl_clientes')
        .update({
          direccion_calle: cliente.calle || null,
          direccion_colonia: cliente.colonia || null,
          direccion_cp: cliente.cp || null,
          direccion_referencias: cliente.ref || null,
          sucursal_preferida: cliente.sucursal || null
        })
        .eq('id_cliente', id_cliente);
    }

    return NextResponse.json({
      folio,
      codigo_qr: codigoQr,
      turno_surtido: turnoSurtido,
      marca,
      ultimos
    });
  } catch (err) {
    return NextResponse.json(
      { error: err?.message || 'Error inesperado al procesar el pedido.' },
      { status: 500 }
    );
  }
}