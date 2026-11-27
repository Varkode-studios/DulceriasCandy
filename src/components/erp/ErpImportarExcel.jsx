'use client';

import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import ErpIcon from '@/components/erp/ErpIcon';

const SIN_MARCA_DISPLAY = 'Sin marca / Genérico';

const COLUMNAS_REQUERIDAS = [
  { nombre: 'Codigo', detalle: 'Código único o de barras (si ya existe, se omite sin sobrescribir).' },
  { nombre: 'Nombre', detalle: 'Nombre comercial del producto.' },
  { nombre: 'Categoria', detalle: 'Nombre exacto de la categoría (ej. Gomitas, Chocolates).' },
  { nombre: 'Marca', detalle: 'Ej. Ricolino, Vero, Dulcerías Candy o "Sin marca".' },
  { nombre: 'Presentacion', detalle: 'Ej. Bolsa 1 kg, Caja 30 piezas.' },
  { nombre: 'Precio', detalle: 'Precio unitario base en MXN (mayoreo 5+ es automático).' },
  { nombre: 'Piezas_por_paquete', detalle: 'Entero para Aguinaldos (escribe 0 si no aplica).' },
  { nombre: 'Descripcion', detalle: 'Reseña breve visible en la ficha del producto.' },
  { nombre: 'Modalidad', detalle: '"Web" (compra en línea) o "Cotizar" (WhatsApp).' }
];

function limpiarTexto(t) {
  return String(t ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function parsearNumeroEstricto(valor) {
  if (valor === null || valor === undefined || String(valor).trim() === '') return NaN;
  const limpio = String(valor).replace(/[$,\s]/g, '');
  const n = Number(limpio);
  return Number.isFinite(n) ? n : NaN;
}

function parsearModalidad(valor) {
  const v = limpiarTexto(valor);
  if (!v) return null;
  if (['web', 'checkout', 'en linea', 'tienda', 'si', 's', 'true', '1'].includes(v)) return true;
  if (['cotizar', 'whatsapp', 'mayoreo', 'bulto', 'no', 'n', 'false', '0'].includes(v)) return false;
  return null;
}

function esSinMarca(texto) {
  const v = limpiarTexto(texto);
  return ['sin marca', 'generico', 'sin marca / generico', 'ninguna', 'n/a'].includes(v);
}

export default function ErpImportarExcel({
  supabase,
  categorias = [],
  productosExistentes = [],
  usuarioActual,
  onImportSuccess,
  onNotificar,
  onCerrar
}) {
  const inputRef = useRef(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [mostrarGuia, setMostrarGuia] = useState(false);
  const [validandoArchivo, setValidandoArchivo] = useState(false);
  const [nombreArchivo, setNombreArchivo] = useState('');
  const [filasAnalizadas, setFilasAnalizadas] = useState([]);
  const [destinoVisibilidad, setDestinoVisibilidad] = useState('borrador'); // 'borrador' | 'web'
  const [importando, setImportando] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [filtroVista, setFiltroVista] = useState('todos');

  function descargarPlantilla() {
    const primeraCat = categorias[0]?.nombre_categoria || 'Gomitas';
    const segundaCat = categorias[1]?.nombre_categoria || primeraCat;

    const encabezados = COLUMNAS_REQUERIDAS.map(c => c.nombre);

    const ejemplos = [
      [
        '750100000001',
        'Paleta de Caramelo Surtida',
        primeraCat,
        'Dulcerías Candy',
        'Bolsa 50 piezas',
        65.0,
        50,
        'Paletas de caramelo macizo sabores frutales ideales para piñata o aguinaldo.',
        'Web'
      ],
      [
        '750100000002',
        'Gomitas de Ositos Frutales',
        segundaCat,
        'Ricolino',
        'Bolsa 1 kg',
        88.0,
        200,
        'Gomitas suaves en cinco sabores clásicos.',
        'Web'
      ],
      [
        '750100000003',
        'Piñata Estrella Mediana',
        categorias.find(c => limpiarTexto(c.nombre_categoria).includes('fiesta'))?.nombre_categoria || primeraCat,
        'Sin marca',
        '1 pieza',
        180.0,
        0,
        'Piñata artesanal resistente lista para rellenar.',
        'Cotizar'
      ]
    ];

    const hojaProductos = XLSX.utils.aoa_to_sheet([encabezados, ...ejemplos]);
    hojaProductos['!cols'] = [
      { wch: 18 }, { wch: 30 }, { wch: 18 }, { wch: 18 }, { wch: 18 },
      { wch: 12 }, { wch: 20 }, { wch: 46 }, { wch: 14 }
    ];

    const hojaGuia = XLSX.utils.aoa_to_sheet([
      ['GUÍA DE LLENADO — SIGE CANDY (9 COLUMNAS OBLIGATORIAS)'],
      [],
      ['Columna', 'Qué escribir'],
      ...COLUMNAS_REQUERIDAS.map(c => [c.nombre, c.detalle]),
      [],
      ['NOTAS IMPORTANTES:'],
      ['• Protección de catálogo', 'Si un código o producto (mismo nombre y presentación) ya está registrado en SIGE Candy, se omite automáticamente y NO se sobrescribe.'],
      ['• Stock', 'Los productos nuevos inician en 0 para cargarse con lote y caducidad en Almacén PEPS.'],
      ['• Tope de compra', 'Se asigna automáticamente en 20 piezas por pedido (editable después en SIGE Candy).'],
      ['• Visibilidad', 'Se elige en pantalla antes de confirmar la importación (Borrador Solo SIGE o Publicado en Tienda).'],
      [],
      ['CATEGORÍAS VÁLIDAS EN TU BASE DE DATOS:'],
      ...categorias.map(c => [c.nombre_categoria, c.slug ? `slug: ${c.slug}` : ''])
    ]);
    hojaGuia['!cols'] = [{ wch: 24 }, { wch: 84 }];

    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hojaProductos, 'Productos');
    XLSX.utils.book_append_sheet(libro, hojaGuia, 'Guia_y_Categorias');
    XLSX.writeFile(libro, 'Plantilla_SIGE_Candy.xlsx');

    if (onNotificar) onNotificar('Plantilla Excel descargada correctamente');
  }

  async function procesarArchivo(archivo) {
    if (!archivo) return;
    setNombreArchivo(archivo.name);
    setFiltroVista('todos');
    setValidandoArchivo(true);

    try {
      const [buffer, resDB] = await Promise.all([
        archivo.arrayBuffer(),
        supabase.from('tbl_productos').select('codigo_barras, nombre_dulce, presentacion, activo')
      ]);

      const workbook = XLSX.read(buffer, { type: 'array' });
      const nombreHoja = workbook.SheetNames[0];
      const hoja = workbook.Sheets[nombreHoja];
      const filasRaw = XLSX.utils.sheet_to_json(hoja, { defval: '' });

      if (!filasRaw.length) {
        setFilasAnalizadas([]);
        if (onNotificar) onNotificar('El archivo Excel no contiene filas de datos', 'error');
        return;
      }

      const listaBase = resDB?.data && resDB.data.length > 0 ? resDB.data : productosExistentes;

      const mapaCats = new Map();
      categorias.forEach(c => {
        mapaCats.set(limpiarTexto(c.nombre_categoria), c);
        if (c.slug) mapaCats.set(limpiarTexto(c.slug), c);
      });

      const mapaCodigosDB = new Map();
      const mapaNombrePresDB = new Map();
      listaBase.forEach(p => {
        if (p.codigo_barras) {
          mapaCodigosDB.set(String(p.codigo_barras).trim().toLowerCase(), p);
        }
        if (p.nombre_dulce) {
          const llaveNP = `${limpiarTexto(p.nombre_dulce)}|${limpiarTexto(p.presentacion)}`;
          mapaNombrePresDB.set(llaveNP, p);
        }
      });

      const codigosVistosEnExcel = new Set();

      const analizadas = filasRaw.map((raw, idx) => {
        const norm = {};
        Object.entries(raw).forEach(([k, v]) => {
          const clave = limpiarTexto(k).replace(/\s+/g, '_');
          norm[clave] = v;
        });

        const codigo = String(norm.codigo ?? norm.codigo_barras ?? norm.sku ?? '').trim();
        const nombre = String(norm.nombre ?? norm.nombre_dulce ?? norm.producto ?? '').trim();
        const catTexto = String(norm.categoria ?? norm.linea ?? '').trim();
        const marcaRaw = String(norm.marca ?? '').trim();
        const presentacion = String(norm.presentacion ?? norm.unidad ?? '').trim();
        const precio = parsearNumeroEstricto(norm.precio ?? norm.precio_unitario);
        const piezasRaw = parsearNumeroEstricto(norm.piezas_por_paquete ?? norm.piezas);
        const descripcion = String(norm.descripcion ?? '').trim();
        const modalidadRaw = norm.modalidad ?? norm.venta_en_linea ?? norm.es_transaccional;
        const esTransaccional = parsearModalidad(modalidadRaw);

        const errores = [];
        if (!codigo) errores.push('Falta Codigo');
        if (!nombre) errores.push('Falta Nombre');

        const catObj = mapaCats.get(limpiarTexto(catTexto));
        if (!catTexto) errores.push('Falta Categoria');
        else if (!catObj) errores.push(`Categoría "${catTexto}" no válida`);

        if (!marcaRaw) errores.push('Falta Marca (usa "Sin marca" si no aplica)');
        if (!presentacion) errores.push('Falta Presentacion');
        if (!Number.isFinite(precio) || precio < 0) errores.push('Precio inválido');
        if (!Number.isFinite(piezasRaw) || piezasRaw < 0 || !Number.isInteger(piezasRaw)) {
          errores.push('Piezas_por_paquete debe ser entero (0 o mayor)');
        }
        if (!descripcion) errores.push('Falta Descripcion');
        if (esTransaccional === null) errores.push('Modalidad inválida (usa "Web" o "Cotizar")');

        const codigoKey = codigo.toLowerCase();
        if (codigo && codigosVistosEnExcel.has(codigoKey)) {
          errores.push('Código repetido en este Excel');
        }
        if (codigo) codigosVistosEnExcel.add(codigoKey);

        // Validar si ya existe en la base de datos (sin sobrescribir)
        const existePorCodigo = codigo ? mapaCodigosDB.get(codigoKey) : null;
        const llaveNP = nombre ? `${limpiarTexto(nombre)}|${limpiarTexto(presentacion)}` : '';
        const existePorNombrePres = !existePorCodigo && llaveNP ? mapaNombrePresDB.get(llaveNP) : null;
        const existente = existePorCodigo || existePorNombrePres;

        let motivoExistente = '';
        if (existePorCodigo) {
          motivoExistente = existePorCodigo.activo === false
            ? 'Código ya existe (en Dados de Baja)'
            : 'Código ya registrado';
        } else if (existePorNombrePres) {
          motivoExistente = `Ya registrado (código ${existePorNombrePres.codigo_barras})`;
        }

        const estado = existente ? 'existente' : errores.length > 0 ? 'error' : 'nuevo';
        const marcaDB = !marcaRaw || esSinMarca(marcaRaw) ? null : marcaRaw;

        return {
          filaExcel: idx + 2,
          estado,
          errores,
          motivoExistente,
          datos: {
            codigo_barras: codigo,
            nombre_dulce: nombre,
            id_categoria: catObj?.id_categoria || null,
            nombre_categoria: catObj?.nombre_categoria || catTexto || '—',
            marca: marcaDB,
            presentacion,
            precio_unitario: Number.isFinite(precio) ? Number(precio.toFixed(2)) : 0,
            precio_mayoreo_5_mas: Number.isFinite(precio) ? Number((precio * 0.95).toFixed(2)) : 0,
            piezas_por_paquete: Number.isFinite(piezasRaw) ? Math.max(0, Math.round(piezasRaw)) : 0,
            descripcion,
            es_transaccional: esTransaccional ?? true
          }
        };
      });

      setFilasAnalizadas(analizadas);
    } catch (err) {
      if (onNotificar) onNotificar('No se pudo leer el archivo Excel: ' + err.message, 'error');
    } finally {
      setValidandoArchivo(false);
    }
  }

  const filasNuevas = filasAnalizadas.filter(f => f.estado === 'nuevo');
  const filasExistentes = filasAnalizadas.filter(f => f.estado === 'existente');
  const filasError = filasAnalizadas.filter(f => f.estado === 'error');

  const filasMostradas = filasAnalizadas.filter(f => {
    if (filtroVista === 'todos') return true;
    return f.estado === filtroVista;
  });

  async function ejecutarImportacion() {
    if (filasNuevas.length === 0) {
      if (onNotificar) onNotificar('No hay productos nuevos para registrar', 'error');
      return;
    }

    setImportando(true);
    setProgreso(5);

    const ahoraIso = new Date().toISOString();
    const publicarEnWeb = destinoVisibilidad === 'web';
    const tamanoLote = 100;
    let procesadas = 0;

    try {
      const payloadNuevos = filasNuevas.map(f => {
        const d = f.datos;
        return {
          codigo_barras: d.codigo_barras,
          nombre_dulce: d.nombre_dulce,
          descripcion: d.descripcion,
          id_categoria: d.id_categoria,
          marca: d.marca,
          presentacion: d.presentacion,
          precio_unitario: d.precio_unitario,
          precio_mayoreo_5_mas: d.precio_mayoreo_5_mas,
          piezas_por_paquete: d.piezas_por_paquete,
          es_transaccional: d.es_transaccional,
          tope_maximo_compra: 20,
          etiqueta_web: 'normal',
          stock_web: 0,
          publicado_web: publicarEnWeb,
          activo: true,
          imagen_url: null,
          ultima_modificacion_por: usuarioActual?.nombre || 'Administrador',
          fecha_ultima_modificacion: ahoraIso
        };
      });

      // ignoreDuplicates: true asegura a nivel SQL que NUNCA se sobrescriba un código existente
      for (let i = 0; i < payloadNuevos.length; i += tamanoLote) {
        const lote = payloadNuevos.slice(i, i + tamanoLote);
        const { error } = await supabase
          .from('tbl_productos')
          .upsert(lote, { onConflict: 'codigo_barras', ignoreDuplicates: true });

        if (error) throw new Error(`Lote ${i + 1}-${i + lote.length}: ${error.message}`);

        procesadas += lote.length;
        setProgreso(Math.round((procesadas / payloadNuevos.length) * 100));
      }

      await supabase.from('tbl_bitacora_auditoria').insert([{
        modulo: 'Catálogo y Precios',
        tipo_accion: 'IMPORTACION_EXCEL',
        id_referencia: nombreArchivo || 'excel',
        nombre_referencia: `Carga masiva (+${filasNuevas.length} nuevos)`,
        descripcion_cambio: `Importó desde "${nombreArchivo}": ${filasNuevas.length} productos nuevos (${publicarEnWeb ? 'Publicados en Tienda Web' : 'Borrador Solo SIGE Candy'}). Se omitieron ${filasExistentes.length} ya registrados sin sobrescribir.`,
        valor_anterior: `${productosExistentes.length} productos previos`,
        valor_nuevo: `+${filasNuevas.length} nuevos (${filasExistentes.length} protegidos)`,
        usuario_id: usuarioActual?.id_usuario || null,
        usuario_nombre: usuarioActual?.nombre || 'Administrador',
        usuario_correo: usuarioActual?.correo || null,
        usuario_rol: usuarioActual?.rol || 'admin'
      }]);

      if (onNotificar) {
        onNotificar(
          filasExistentes.length > 0
            ? `Se agregaron ${filasNuevas.length} productos nuevos (${filasExistentes.length} ya registrados se mantuvieron intactos)`
            : `Se agregaron ${filasNuevas.length} productos nuevos a SIGE Candy`
        );
      }

      setFilasAnalizadas([]);
      setNombreArchivo('');
      if (onImportSuccess) onImportSuccess();
      if (onCerrar) onCerrar();
    } catch (err) {
      if (onNotificar) onNotificar('Error en importación: ' + err.message, 'error');
    } finally {
      setImportando(false);
      setProgreso(0);
    }
  }

  return (
    <div className="erp-card" style={{ margin: 0, border: '1.5px solid var(--uva)', background: '#fff' }}>
      {/* Encabezado limpio */}
      <div className="erp-card__header" style={{ marginBottom: 16 }}>
        <div className="erp-card__title">
          <ErpIcon name="clipboard" size={17} style={{ color: 'var(--uva)' }} />
          <span>Importar Catálogo desde Excel</span>
        </div>
        <button
          type="button"
          onClick={onCerrar}
          className="erp-btn erp-btn--secundario"
          style={{ padding: '6px 12px', fontSize: 12 }}
        >
          Cerrar
        </button>
      </div>

      {/* Flujo guiado en 2 pasos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: 14 }}>
        {/* PASO 1: Plantilla */}
        <div
          style={{
            padding: 16,
            borderRadius: 12,
            border: '1px solid var(--linea)',
            background: '#FAF8FC',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: 12
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  background: 'var(--uva)',
                  color: '#fff',
                  fontSize: 11.5,
                  fontWeight: 800,
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0
                }}
              >
                1
              </span>
              <b style={{ fontSize: 13.5, color: 'var(--texto)' }}>Prepara tu archivo con la plantilla</b>
            </div>
            <p style={{ fontSize: 12, color: 'var(--texto-2)', margin: 0, lineHeight: 1.45 }}>
              Contiene las <b>9 columnas obligatorias</b>, ejemplos listos y la lista oficial de tus categorías.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={descargarPlantilla}
              className="erp-btn erp-btn--secundario"
              style={{ padding: '8px 14px', fontSize: 12.5 }}
            >
              <ErpIcon name="arrow-right" size={14} />
              <span>Descargar plantilla (.xlsx)</span>
            </button>

            <button
              type="button"
              onClick={() => setMostrarGuia(!mostrarGuia)}
              aria-expanded={mostrarGuia}
              className="link"
              style={{
                fontSize: 12,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5
              }}
            >
              <span>{mostrarGuia ? 'Ocultar columnas' : 'Ver las 9 columnas'}</span>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  transform: mostrarGuia ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.3s cubic-bezier(0.22, 1, 0.36, 1)'
                }}
                aria-hidden="true"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          </div>
        </div>

        {/* PASO 2: Subir Excel */}
        <div
          onDragOver={e => {
            e.preventDefault();
            setArrastrando(true);
          }}
          onDragLeave={() => setArrastrando(false)}
          onDrop={e => {
            e.preventDefault();
            setArrastrando(false);
            const f = e.dataTransfer?.files?.[0];
            if (f) procesarArchivo(f);
          }}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          style={{
            padding: 16,
            borderRadius: 12,
            border: arrastrando ? '2px dashed var(--marca)' : '1.5px dashed #CFC5DB',
            background: arrastrando ? '#FFF5FB' : '#fff',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            cursor: 'pointer',
            transition: 'border-color .15s, background .15s'
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            hidden
            onChange={e => {
              const f = e.target.files?.[0];
              if (f) procesarArchivo(f);
              e.target.value = '';
            }}
          />

          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              background: nombreArchivo ? '#E8F7EF' : '#F4EFFA',
              color: nombreArchivo ? '#007A3B' : 'var(--uva)',
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0
            }}
          >
            <ErpIcon name={nombreArchivo ? 'check' : 'folder'} size={22} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
              <span
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  background: 'var(--marca)',
                  color: '#fff',
                  fontSize: 11.5,
                  fontWeight: 800,
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0
                }}
              >
                2
              </span>
              <b style={{ fontSize: 13.5, color: 'var(--texto)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {validandoArchivo ? 'Validando contra el catálogo...' : nombreArchivo || 'Sube tu archivo Excel'}
              </b>
            </div>
            <p style={{ fontSize: 12, color: 'var(--texto-2)', margin: 0 }}>
              {nombreArchivo
                ? 'Haz clic o arrastra otro archivo para reemplazarlo.'
                : 'Arrastra aquí tu .xlsx o .csv para revisar la vista previa.'}
            </p>
          </div>

          <button
            type="button"
            className="erp-btn erp-btn--primario"
            style={{ padding: '8px 14px', fontSize: 12.5, flexShrink: 0 }}
            onClick={e => {
              e.stopPropagation();
              inputRef.current?.click();
            }}
          >
            {nombreArchivo ? 'Cambiar' : 'Seleccionar'}
          </button>
        </div>
      </div>

      {/* Guía desplegable animada de las 9 columnas */}
      <div
        aria-hidden={!mostrarGuia}
        style={{
          display: 'grid',
          gridTemplateRows: mostrarGuia ? '1fr' : '0fr',
          opacity: mostrarGuia ? 1 : 0,
          marginTop: mostrarGuia ? 12 : 0,
          transition:
            'grid-template-rows 0.34s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.24s ease, margin-top 0.34s cubic-bezier(0.22, 1, 0.36, 1)'
        }}
      >
        <div style={{ overflow: 'hidden' }}>
          <div
            style={{
              padding: 16,
              borderRadius: 12,
              background: '#FBF9FD',
              border: '1px solid var(--linea)',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 10,
              transform: mostrarGuia ? 'translateY(0)' : 'translateY(-8px)',
              transition: 'transform 0.34s cubic-bezier(0.22, 1, 0.36, 1)'
            }}
          >
            {COLUMNAS_REQUERIDAS.map((col, idx) => (
              <div
                key={col.nombre}
                style={{
                  fontSize: 12,
                  lineHeight: 1.4,
                  padding: '8px 10px',
                  borderRadius: 8,
                  background: '#fff',
                  border: '1px solid #ECE7F2'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  <span style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--tenue)' }}>{idx + 1}.</span>
                  <code style={{ fontWeight: 700, color: 'var(--uva)', background: '#EFE8F6', padding: '1px 6px', borderRadius: 4 }}>
                    {col.nombre}
                  </code>
                </div>
                <span style={{ display: 'block', color: 'var(--texto-2)' }}>{col.detalle}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Barra única de destino + nota de protección */}
      <div
        style={{
          marginTop: 14,
          padding: '12px 16px',
          borderRadius: 10,
          background: '#FAF8FC',
          border: '1px solid var(--linea)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--texto)' }}>Al importar nuevos:</span>
          <div className="erp-segmented">
            <button
              type="button"
              className={destinoVisibilidad === 'borrador' ? 'activo' : ''}
              onClick={() => setDestinoVisibilidad('borrador')}
            >
              Guardar como Borrador (Solo SIGE)
            </button>
            <button
              type="button"
              className={destinoVisibilidad === 'web' ? 'activo' : ''}
              onClick={() => setDestinoVisibilidad('web')}
            >
              Publicar en Tienda Web
            </button>
          </div>
        </div>

        <span style={{ fontSize: 11.5, color: 'var(--texto-2)' }}>
          Productos ya registrados <b>no se sobrescriben</b> · Nuevos inician en stock <b>0</b> (PEPS).
        </span>
      </div>

      {/* Vista previa antes de cargar */}
      {filasAnalizadas.length > 0 && (
        <div className="erp-anim-1" style={{ marginTop: 16 }}>
          {/* 3 tarjetas resumen clicables como filtro */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 12 }}>
            <button
              type="button"
              onClick={() => setFiltroVista(filtroVista === 'nuevo' ? 'todos' : 'nuevo')}
              style={{
                textAlign: 'left',
                padding: '11px 14px',
                borderRadius: 10,
                cursor: 'pointer',
                background: filtroVista === 'nuevo' ? '#E8F7EF' : '#F8FCF9',
                border: filtroVista === 'nuevo' ? '1.5px solid #00A650' : '1px solid #CDEBD9',
                transition: 'border-color .15s, background .15s'
              }}
            >
              <small style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#007A3B' }}>
                NUEVOS (SE IMPORTAN)
              </small>
              <b style={{ fontSize: 22, color: '#007A3B' }}>{filasNuevas.length}</b>
            </button>

            <button
              type="button"
              onClick={() => setFiltroVista(filtroVista === 'existente' ? 'todos' : 'existente')}
              style={{
                textAlign: 'left',
                padding: '11px 14px',
                borderRadius: 10,
                cursor: 'pointer',
                background: filtroVista === 'existente' ? '#F3ECF9' : '#FAF8FC',
                border: filtroVista === 'existente' ? '1.5px solid var(--uva)' : '1px solid #DFD3EA',
                transition: 'border-color .15s, background .15s'
              }}
            >
              <small style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--uva)' }}>
                YA REGISTRADOS (SE OMITEN)
              </small>
              <b style={{ fontSize: 22, color: 'var(--uva)' }}>{filasExistentes.length}</b>
            </button>

            <button
              type="button"
              onClick={() => setFiltroVista(filtroVista === 'error' ? 'todos' : 'error')}
              style={{
                textAlign: 'left',
                padding: '11px 14px',
                borderRadius: 10,
                cursor: 'pointer',
                background: filtroVista === 'error' ? '#FDECE8' : filasError.length > 0 ? '#FFF7F5' : '#FAFAFB',
                border: filtroVista === 'error' ? '1.5px solid #C8320A' : filasError.length > 0 ? '1px solid #F7C5B8' : '1px solid var(--linea)',
                transition: 'border-color .15s, background .15s'
              }}
            >
              <small style={{ display: 'block', fontSize: 11, fontWeight: 700, color: filasError.length > 0 ? '#C8320A' : 'var(--tenue)' }}>
                CON ERRORES (SE OMITEN)
              </small>
              <b style={{ fontSize: 22, color: filasError.length > 0 ? '#C8320A' : 'var(--tenue)' }}>{filasError.length}</b>
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--texto)' }}>
              Vista previa ({filasMostradas.length} de {filasAnalizadas.length} filas)
            </span>
            {filtroVista !== 'todos' && (
              <button type="button" onClick={() => setFiltroVista('todos')} className="link" style={{ fontSize: 12 }}>
                Mostrar todas las filas
              </button>
            )}
          </div>

          <div className="erp-tabla-wrap" style={{ maxHeight: 310, overflowY: 'auto' }}>
            <table className="erp-tabla">
              <thead>
                <tr>
                  <th>Fila</th>
                  <th>Validación</th>
                  <th>Código</th>
                  <th>Nombre</th>
                  <th>Categoría</th>
                  <th>Marca</th>
                  <th>Precio</th>
                  <th>Pzas/Paq</th>
                  <th>Modalidad</th>
                </tr>
              </thead>
              <tbody>
                {filasMostradas.slice(0, 120).map(f => (
                  <tr
                    key={f.filaExcel}
                    style={
                      f.estado === 'error'
                        ? { background: '#FFF5F4' }
                        : f.estado === 'existente'
                        ? { background: '#FAF7FC', opacity: 0.88 }
                        : undefined
                    }
                  >
                    <td style={{ fontSize: 11.5, color: 'var(--tenue)', fontFamily: 'monospace' }}>#{f.filaExcel}</td>
                    <td>
                      {f.estado === 'nuevo' && <span className="erp-badge erp-badge--verde">Nuevo</span>}
                      {f.estado === 'existente' && (
                        <div>
                          <span className="erp-badge erp-badge--uva">Ya existe · Omitido</span>
                          <small style={{ display: 'block', fontSize: 10.5, color: 'var(--texto-2)', marginTop: 2 }}>
                            {f.motivoExistente}
                          </small>
                        </div>
                      )}
                      {f.estado === 'error' && (
                        <div>
                          <span className="erp-badge erp-badge--naranja" title={f.errores.join(' · ')}>
                            {f.errores[0]}
                          </span>
                          {f.errores.length > 1 && (
                            <small style={{ display: 'block', fontSize: 10.5, color: '#C8320A', marginTop: 2 }}>
                              +{f.errores.length - 1} {f.errores.length - 1 === 1 ? 'campo más' : 'campos más'}
                            </small>
                          )}
                        </div>
                      )}
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{f.datos.codigo_barras || '—'}</td>
                    <td style={{ fontWeight: 600, fontSize: 12.5 }}>
                      {f.datos.nombre_dulce || '—'}
                      <small style={{ display: 'block', fontWeight: 400, color: 'var(--tenue)', fontSize: 11 }}>
                        {f.datos.presentacion || 'Sin presentación'}
                      </small>
                    </td>
                    <td style={{ fontSize: 12 }}>{f.datos.nombre_categoria}</td>
                    <td style={{ fontSize: 12, color: f.datos.marca ? 'var(--texto)' : 'var(--tenue)' }}>
                      {f.datos.marca || SIN_MARCA_DISPLAY}
                    </td>
                    <td style={{ fontWeight: 700, fontSize: 12.5 }}>${f.datos.precio_unitario.toFixed(2)}</td>
                    <td style={{ fontSize: 12 }}>{f.datos.piezas_por_paquete}</td>
                    <td style={{ fontSize: 11.5, fontWeight: 600 }}>
                      {f.datos.es_transaccional ? 'Web' : 'Cotizar'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filasMostradas.length > 120 && (
            <p style={{ fontSize: 11.5, color: 'var(--tenue)', marginTop: 6 }}>
              Mostrando las primeras 120 filas de {filasMostradas.length}. Al confirmar se agregarán los {filasNuevas.length} productos nuevos.
            </p>
          )}

          {importando && (
            <div style={{ marginTop: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                <span>Guardando productos nuevos en SIGE Candy...</span>
                <span>{progreso}%</span>
              </div>
              <div style={{ height: 8, background: '#ECE7F2', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ width: `${progreso}%`, height: '100%', background: '#00A650', transition: 'width 0.2s ease' }} />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--linea)' }}>
            <span style={{ fontSize: 12, color: 'var(--texto-2)' }}>
              {filasNuevas.length === 0 ? (
                <b style={{ color: 'var(--uva)' }}>No hay registros nuevos por agregar (los existentes quedan protegidos).</b>
              ) : (
                <>
                  Se agregarán <b>{filasNuevas.length}</b> nuevos como{' '}
                  <b style={{ color: destinoVisibilidad === 'web' ? '#007A3B' : 'var(--uva)' }}>
                    {destinoVisibilidad === 'web' ? 'Publicados en Tienda Web' : 'Borrador (Solo SIGE Candy)'}
                  </b>
                  {filasExistentes.length > 0 ? ` · ${filasExistentes.length} ya registrados se omitirán.` : '.'}
                </>
              )}
            </span>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                disabled={importando}
                onClick={() => {
                  setFilasAnalizadas([]);
                  setNombreArchivo('');
                }}
                className="erp-btn erp-btn--secundario"
              >
                Cancelar carga
              </button>
              <button
                type="button"
                disabled={importando || filasNuevas.length === 0}
                onClick={ejecutarImportacion}
                className="erp-btn erp-btn--primario"
                style={{ background: '#00A650' }}
              >
                <ErpIcon name="check" size={15} />
                <span>
                  {importando
                    ? `Importando (${progreso}%)...`
                    : filasNuevas.length === 0
                    ? 'Sin productos nuevos'
                    : `Importar ${filasNuevas.length} productos nuevos`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}