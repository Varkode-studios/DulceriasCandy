'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import ErpIcon from '@/components/erp/ErpIcon';

export default function AlmacenPepsPage() {
  const supabase = createClient();

  const [lotes, setLotes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [modoVista, setModoVista] = useState('tarjetas'); // 'tarjetas' | 'tabla'
  const [filtroEstado, setFiltroEstado] = useState('Activo_en_Rotacion_PEPS');
  const [filtroPasillo, setFiltroPasillo] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [mostrarFormLote, setMostrarFormLote] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState(null);

  const [nuevoLote, setNuevoLote] = useState({
    id_producto: '',
    numero_lote: '',
    fecha_caducidad: '',
    cantidad_inicial: '',
    ubicacion_anaquel: 'Pasillo A - Anaquel 1'
  });

  useEffect(() => {
    cargarInventarioPeps();
  }, []);

  async function cargarInventarioPeps() {
    setCargando(true);
    const [{ data: lotesDB }, { data: prodsDB }] = await Promise.all([
      supabase
        .from('tbl_lotes_peps')
        .select('*, tbl_productos(nombre_dulce, presentacion, stock_web, imagen_url)')
        .order('fecha_caducidad', { ascending: true }),
      supabase
        .from('tbl_productos')
        .select('id_producto, codigo_barras, nombre_dulce, presentacion, stock_web, imagen_url')
        .order('nombre_dulce')
    ]);

    if (lotesDB) setLotes(lotesDB);
    if (prodsDB) {
      setProductos(prodsDB);
      if (!nuevoLote.id_producto && prodsDB.length > 0) {
        setNuevoLote(prev => ({ ...prev, id_producto: String(prodsDB[0].id_producto) }));
      }
    }
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

  const resolverImagen = url => {
    if (!url) return '/img/ICONO.png';
    if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('blob:')) return url;
    return `/${url.replace(/^\//, '')}`;
  };

  function evaluarCaducidad(fechaCad) {
    const hoy = new Date();
    const cad = new Date(fechaCad + 'T00:00:00');
    const dias = Math.ceil((cad - hoy) / (1000 * 60 * 60 * 24));
    const pctVida = Math.max(6, Math.min(100, Math.round((dias / 180) * 100)));

    if (dias <= 0) {
      return { dias, pctVida: 100, color: '#F04E23', etiqueta: 'Caducado', clase: 'erp-badge--naranja' };
    }
    if (dias <= 45) {
      return { dias, pctVida, color: '#F7941D', etiqueta: `Prioridad (${dias}d)`, clase: 'erp-badge--amarillo' };
    }
    return { dias, pctVida, color: '#00A650', etiqueta: `Vigente (${dias}d)`, clase: 'erp-badge--verde' };
  }

  // Determina el orden de salida PEPS por producto (qué lote de ese mismo dulce debe salir #1, #2, etc.)
  const mapaOrdenPorProducto = {};
  lotes
    .filter(l => l.estado === 'Activo_en_Rotacion_PEPS' && Number(l.cantidad_disponible) > 0)
    .forEach(l => {
      const pid = l.id_producto;
      mapaOrdenPorProducto[pid] = (mapaOrdenPorProducto[pid] || 0) + 1;
      l._turnoProducto = mapaOrdenPorProducto[pid];
    });

  async function registrarEntradaLote(e) {
    e.preventDefault();
    const prodSeleccionado = productos.find(p => String(p.id_producto) === String(nuevoLote.id_producto));
    if (!prodSeleccionado) return;

    const cant = Number(nuevoLote.cantidad_inicial);
    if (cant <= 0) {
      notificar('La cantidad inicial debe ser mayor a 0', 'error');
      return;
    }

    const { error } = await supabase.from('tbl_lotes_peps').insert([{
      id_producto: prodSeleccionado.id_producto,
      codigo_barras: prodSeleccionado.codigo_barras,
      numero_lote: nuevoLote.numero_lote.trim().toUpperCase(),
      fecha_caducidad: nuevoLote.fecha_caducidad,
      cantidad_inicial: cant,
      cantidad_disponible: cant,
      ubicacion_anaquel: nuevoLote.ubicacion_anaquel,
      estado: 'Activo_en_Rotacion_PEPS'
    }]);

    if (error) {
      notificar('Error al registrar lote: ' + error.message, 'error');
    } else {
      notificar(`Lote ${nuevoLote.numero_lote.toUpperCase()} registrado · Stock de "${prodSeleccionado.nombre_dulce}" actualizado`);
      setMostrarFormLote(false);
      setNuevoLote(prev => ({
        ...prev,
        numero_lote: '',
        fecha_caducidad: '',
        cantidad_inicial: ''
      }));
      cargarInventarioPeps();
    }
  }

  async function actualizarCantidadLote(lote, nuevaCant) {
    const cantNum = Math.max(0, Number(nuevaCant));
    const nuevoEstado = cantNum === 0 ? 'Agotado' : 'Activo_en_Rotacion_PEPS';

    const { error } = await supabase
      .from('tbl_lotes_peps')
      .update({
        cantidad_disponible: cantNum,
        estado: nuevoEstado
      })
      .eq('id_lote', lote.id_lote);

    if (error) {
      notificar('Error al guardar ajuste: ' + error.message, 'error');
    } else {
      notificar(`Cambios guardados · Lote ${lote.numero_lote} (${cantNum} disponibles)`);
      cargarInventarioPeps();
    }
  }

  async function bloquearPorMerma(lote) {
    const { error } = await supabase
      .from('tbl_lotes_peps')
      .update({
        estado: 'Bloqueado_por_Merma_Dano',
        cantidad_disponible: 0
      })
      .eq('id_lote', lote.id_lote);

    if (error) {
      notificar('Error al reportar merma: ' + error.message, 'error');
    } else {
      notificar(`Lote ${lote.numero_lote} dado de baja por merma · Stock web actualizado`);
      cargarInventarioPeps();
    }
  }

  const lotesActivos = lotes.filter(l => l.estado === 'Activo_en_Rotacion_PEPS');
  const totalUnidades = lotesActivos.reduce((acc, l) => acc + Number(l.cantidad_disponible || 0), 0);
  const lotesPorVencer = lotesActivos.filter(l => evaluarCaducidad(l.fecha_caducidad).dias <= 45).length;
  const lotesMerma = lotes.filter(l => l.estado === 'Bloqueado_por_Merma_Dano').length;

  const pasillosUnicos = [...new Set(lotes.map(l => l.ubicacion_anaquel).filter(Boolean))];

  const lotesFiltrados = lotes.filter(l => {
    if (filtroEstado === 'por_vencer') {
      if (l.estado !== 'Activo_en_Rotacion_PEPS' || evaluarCaducidad(l.fecha_caducidad).dias > 45) return false;
    } else if (filtroEstado !== 'todos' && l.estado !== filtroEstado) {
      return false;
    }
    if (filtroPasillo !== 'todos' && l.ubicacion_anaquel !== filtroPasillo) return false;

    const texto = `${l.numero_lote} ${l.codigo_barras} ${l.tbl_productos?.nombre_dulce || ''} ${l.ubicacion_anaquel}`.toLowerCase();
    return texto.includes(busqueda.toLowerCase());
  });

  return (
    <div>
      {/* ENCABEZADO CORPORATIVO */}
      <div className="erp-page-header erp-anim-1">
        <div>
          <span className="erp-badge erp-badge--uva">Control de Inventario · Sucursal 2 Norte</span>
          <h1 className="erp-page-title">Almacén Nodo Central 2 Norte y Rotación PEPS</h1>
          <p className="erp-page-subtitle">
            Cola inteligente de salida por fecha de caducidad: el lote que vence primero se posiciona automáticamente al frente.
          </p>
        </div>

        <div className="erp-segmented">
          <button
            type="button"
            className={modoVista === 'tarjetas' ? 'activo' : ''}
            onClick={() => setModoVista('tarjetas')}
          >
            <ErpIcon name="dashboard" size={14} />
            <span>Tarjetas PEPS</span>
          </button>
          <button
            type="button"
            className={modoVista === 'tabla' ? 'activo' : ''}
            onClick={() => setModoVista('tabla')}
          >
            <ErpIcon name="clipboard" size={14} />
            <span>Tabla General</span>
          </button>
        </div>
      </div>

      {/* INDICADORES KPI DE ALMACÉN */}
      <div className="erp-kpi-grid erp-anim-2">
        <div className="erp-kpi" style={{ '--c': '#00A650' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--texto-2)', fontWeight: 600 }}>Lotes Activos en Rotación</span>
            <span className="erp-kpi__ico" style={{ '--c': '#00A650' }}>
              <ErpIcon name="box" size={18} />
            </span>
          </div>
          <div className="erp-kpi__valor">{lotesActivos.length}</div>
          <span style={{ fontSize: 12, color: 'var(--verde)', fontWeight: 600 }}>Ordenados por caducidad PEPS</span>
        </div>

        <div className="erp-kpi" style={{ '--c': '#3C1053' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--texto-2)', fontWeight: 600 }}>Unidades Físicas (2 Norte)</span>
            <span className="erp-kpi__ico" style={{ '--c': '#3C1053' }}>
              <ErpIcon name="building" size={18} />
            </span>
          </div>
          <div className="erp-kpi__valor">{totalUnidades}</div>
          <span style={{ fontSize: 12, color: 'var(--texto-2)' }}>Sincronizadas en vivo con tienda web</span>
        </div>

        <div className="erp-kpi" style={{ '--c': '#F7941D' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--texto-2)', fontWeight: 600 }}>Salida Prioritaria (≤ 45 días)</span>
            <span className="erp-kpi__ico" style={{ '--c': '#F7941D' }}>
              <ErpIcon name="clock" size={18} />
            </span>
          </div>
          <div className="erp-kpi__valor">{lotesPorVencer}</div>
          <span style={{ fontSize: 12, color: 'var(--texto-2)' }}>Atención preferente en Picking</span>
        </div>

        <div className="erp-kpi" style={{ '--c': '#F04E23' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--texto-2)', fontWeight: 600 }}>Bajas por Merma o Daño</span>
            <span className="erp-kpi__ico" style={{ '--c': '#F04E23' }}>
              <ErpIcon name="alert" size={18} />
            </span>
          </div>
          <div className="erp-kpi__valor">{lotesMerma}</div>
          <span style={{ fontSize: 12, color: 'var(--texto-2)' }}>Descontados automáticamente</span>
        </div>
      </div>

      {/* BARRA DE BÚSQUEDA, FILTROS Y BOTÓN CON ANIMACIÓN DE DESPLIEGUE */}
      <div
        className="erp-card erp-anim-3"
        style={{
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 280, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 230, maxWidth: 340 }}>
            <input
              className="erp-input"
              style={{ paddingLeft: 36 }}
              placeholder="Buscar lote, dulce o código..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
            />
            <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--tenue)' }}>
              <ErpIcon name="search" size={15} />
            </span>
          </div>

          <div style={{ width: 210 }}>
            <select
              className="erp-select"
              value={filtroPasillo}
              onChange={e => setFiltroPasillo(e.target.value)}
            >
              <option value="todos">Todos los pasillos / anaqueles</option>
              {pasillosUnicos.map(pas => (
                <option key={pas} value={pas}>{pas}</option>
              ))}
            </select>
          </div>

          <div className="erp-segmented">
            <button
              type="button"
              className={filtroEstado === 'Activo_en_Rotacion_PEPS' ? 'activo' : ''}
              onClick={() => setFiltroEstado('Activo_en_Rotacion_PEPS')}
            >
              Activos ({lotesActivos.length})
            </button>
            <button
              type="button"
              className={filtroEstado === 'por_vencer' ? 'activo' : ''}
              onClick={() => setFiltroEstado('por_vencer')}
            >
              Por Vencer ({lotesPorVencer})
            </button>
            <button
              type="button"
              className={filtroEstado === 'Bloqueado_por_Merma_Dano' ? 'activo' : ''}
              onClick={() => setFiltroEstado('Bloqueado_por_Merma_Dano')}
            >
              Mermas ({lotesMerma})
            </button>
            <button
              type="button"
              className={filtroEstado === 'todos' ? 'activo' : ''}
              onClick={() => setFiltroEstado('todos')}
            >
              Todos ({lotes.length})
            </button>
          </div>
        </div>

        {/* BOTÓN QUE ACTIVA LA ANIMACIÓN DESPLEGABLE DE REGISTRO DE LOTE */}
        <button
          type="button"
          onClick={() => setMostrarFormLote(!mostrarFormLote)}
          className="erp-btn erp-btn--primario"
        >
          <span className={`erp-icon-rotate ${mostrarFormLote ? 'abierto' : ''}`} style={{ display: 'inline-flex' }}>
            <ErpIcon name="plus" size={16} />
          </span>
          <span>{mostrarFormLote ? 'Cerrar Registro de Lote' : 'Registrar Nuevo Lote'}</span>
        </button>
      </div>

      {/* ACORDEÓN ANIMADO FLUIDO PARA REGISTRAR UN NUEVO LOTE */}
      <div className={`erp-collapse ${mostrarFormLote ? 'abierto' : ''}`}>
        <div className="erp-collapse__inner">
          <form onSubmit={registrarEntradaLote} className="erp-card" style={{ margin: 0, border: '1.5px solid var(--marca)' }}>
            <div className="erp-card__header">
              <div className="erp-card__title">
                <ErpIcon name="box" size={17} style={{ color: 'var(--marca)' }} />
                <span>Recepción de Mercancía y Alta de Nuevo Lote PEPS (Nodo 2 Norte)</span>
              </div>
              <span className="erp-badge erp-badge--verde">Trigger SQL: Suma automática a Stock Web</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 14 }}>
              <div>
                <label className="erp-label">Producto / Dulce Recibido *</label>
                <select
                  required
                  className="erp-select"
                  value={nuevoLote.id_producto}
                  onChange={e => setNuevoLote({ ...nuevoLote, id_producto: e.target.value })}
                >
                  {productos.map(p => (
                    <option key={p.id_producto} value={p.id_producto}>
                      {p.codigo_barras} — {p.nombre_dulce} (Stock actual: {p.stock_web})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="erp-label">Código / Número de Lote *</label>
                <input
                  required
                  className="erp-input"
                  placeholder="Código identificador del lote"
                  value={nuevoLote.numero_lote}
                  onChange={e => setNuevoLote({ ...nuevoLote, numero_lote: e.target.value })}
                />
              </div>

              <div>
                <label className="erp-label">Fecha de Caducidad *</label>
                <input
                  required
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  className="erp-input"
                  value={nuevoLote.fecha_caducidad}
                  onChange={e => setNuevoLote({ ...nuevoLote, fecha_caducidad: e.target.value })}
                />
              </div>

              <div>
                <label className="erp-label">Cantidad de Piezas / Cajas *</label>
                <input
                  required
                  type="number"
                  min="1"
                  className="erp-input"
                  placeholder="Cantidad de unidades"
                  value={nuevoLote.cantidad_inicial}
                  onChange={e => setNuevoLote({ ...nuevoLote, cantidad_inicial: e.target.value })}
                />
              </div>

              <div>
                <label className="erp-label">Ubicación Física en Almacén *</label>
                <select
                  className="erp-select"
                  value={nuevoLote.ubicacion_anaquel}
                  onChange={e => setNuevoLote({ ...nuevoLote, ubicacion_anaquel: e.target.value })}
                >
                  <option value="Pasillo A - Anaquel 1">Pasillo A - Anaquel 1 (Gomitas)</option>
                  <option value="Pasillo A - Anaquel 2">Pasillo A - Anaquel 2 (Chocolates)</option>
                  <option value="Pasillo A - Anaquel 3">Pasillo A - Anaquel 3 (Caramelos)</option>
                  <option value="Pasillo B - Anaquel 1">Pasillo B - Anaquel 1 (Paletas)</option>
                  <option value="Pasillo C - Anaquel 1">Pasillo C - Anaquel 1 (Enchilados)</option>
                  <option value="Zona Bultos - Tarima 1">Zona Bultos - Tarima 1 (Piñatero)</option>
                </select>
              </div>
            </div>

            <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--linea)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" onClick={() => setMostrarFormLote(false)} className="erp-btn erp-btn--secundario">
                Cancelar
              </button>
              <button type="submit" className="erp-btn erp-btn--primario">
                <ErpIcon name="check" size={15} />
                <span>Guardar y Dar Entrada al Lote</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL: TARJETAS INTUITIVAS DE COLA PEPS O TABLA */}
      {cargando ? (
        <div className="erp-card" style={{ textAlign: 'center', padding: 48, color: 'var(--texto-2)' }}>
          Sincronizando lotes PEPS del almacén...
        </div>
      ) : lotesFiltrados.length === 0 ? (
        <div className="erp-card" style={{ textAlign: 'center', padding: 48, color: 'var(--tenue)' }}>
          No se encontraron lotes registrados bajo este criterio.
        </div>
      ) : modoVista === 'tarjetas' ? (
        <div className="erp-peps-grid erp-anim-4">
          {lotesFiltrados.map(l => {
            const semaforo = evaluarCaducidad(l.fecha_caducidad);
            const esActivo = l.estado === 'Activo_en_Rotacion_PEPS';
            const esPrimeroEnSalir = esActivo && l._turnoProducto === 1;
            const pctStock = l.cantidad_inicial > 0
              ? Math.round((Number(l.cantidad_disponible) / Number(l.cantidad_inicial)) * 100)
              : 0;

            return (
              <article
                key={l.id_lote}
                className={`erp-peps-card ${esPrimeroEnSalir ? 'erp-peps-card--primero' : ''}`}
              >
                {/* Fila superior: Turno PEPS y Estado */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  {esActivo ? (
                    esPrimeroEnSalir ? (
                      <span className="erp-badge erp-badge--verde">
                        <span className="erp-badge__dot" />
                        #1 EN SALIR (Prioridad PEPS)
                      </span>
                    ) : (
                      <span className="erp-badge erp-badge--uva">
                        #{l._turnoProducto} En Reserva PEPS
                      </span>
                    )
                  ) : l.estado === 'Agotado' ? (
                    <span className="erp-badge erp-badge--amarillo">Lote Agotado</span>
                  ) : (
                    <span className="erp-badge erp-badge--naranja">Baja por Merma / Daño</span>
                  )}

                  <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 800, color: 'var(--uva)' }}>
                    {l.numero_lote}
                  </span>
                </div>

                {/* Producto asociado con fotografía */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 54, height: 54, borderRadius: 10, background: '#F8F6FA', border: '1px solid var(--linea)', padding: 6, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                    <img
                      src={resolverImagen(l.tbl_productos?.imagen_url)}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      onError={e => { e.currentTarget.src = '/img/ICONO.png'; }}
                    />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--texto)', lineHeight: 1.25 }}>
                      {l.tbl_productos?.nombre_dulce || 'Producto'}
                    </h3>
                    <p style={{ fontSize: 12, color: 'var(--texto-2)', marginTop: 2 }}>
                      {l.tbl_productos?.presentacion || 'Pieza'} · Código: <span style={{ fontFamily: 'monospace' }}>{l.codigo_barras}</span>
                    </p>
                  </div>
                </div>

                {/* Bloque de Ubicación y Caducidad */}
                <div className="erp-peps-card__meta">
                  <div>
                    <small style={{ fontSize: 10.5, color: 'var(--tenue)', display: 'block', marginBottom: 2 }}>
                      Ubicación Anaquel
                    </small>
                    <b style={{ fontSize: 12.5, color: 'var(--texto)' }}>{l.ubicacion_anaquel}</b>
                  </div>
                  <div>
                    <small style={{ fontSize: 10.5, color: 'var(--tenue)', display: 'block', marginBottom: 2 }}>
                      Caducidad ({semaforo.etiqueta})
                    </small>
                    <b style={{ fontSize: 12.5, color: semaforo.color }}>{l.fecha_caducidad}</b>
                  </div>
                </div>

                {/* Barra de progreso de consumo del lote */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
                    <span style={{ color: 'var(--texto-2)', fontWeight: 600 }}>Existencia en el lote</span>
                    <b>{l.cantidad_disponible} de {l.cantidad_inicial} u. ({pctStock}%)</b>
                  </div>
                  <div style={{ height: 7, background: '#ECEAEF', borderRadius: 99, overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${pctStock}%`,
                        height: '100%',
                        background: esPrimeroEnSalir ? '#00A650' : 'var(--uva)',
                        borderRadius: 99,
                        transition: 'width 0.3s ease'
                      }}
                    />
                  </div>
                </div>

                {/* Controles inferiores intuitivos */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px solid var(--linea)', gap: 8 }}>
                  <div className="erp-stepper">
                    <button
                      type="button"
                      disabled={!esActivo}
                      onClick={() => actualizarCantidadLote(l, Number(l.cantidad_disponible) - 1)}
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min="0"
                      disabled={!esActivo}
                      value={l.cantidad_disponible}
                      onChange={e => {
                        const copia = lotes.map(item =>
                          item.id_lote === l.id_lote ? { ...item, cantidad_disponible: e.target.value } : item
                        );
                        setLotes(copia);
                      }}
                    />
                    <button
                      type="button"
                      disabled={!esActivo}
                      onClick={() => actualizarCantidadLote(l, Number(l.cantidad_disponible) + 1)}
                    >
                      +
                    </button>
                  </div>

                  {esActivo ? (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        type="button"
                        onClick={() => bloquearPorMerma(l)}
                        className="erp-btn erp-btn--secundario"
                        style={{ padding: '7px 10px', fontSize: 11.5, color: 'var(--naranja)' }}
                        title="Dar de baja por merma o daño físico"
                      >
                        <ErpIcon name="trash" size={13} />
                        <span>Merma</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => actualizarCantidadLote(l, l.cantidad_disponible)}
                        className="erp-btn erp-btn--primario"
                        style={{ padding: '7px 13px', fontSize: 12 }}
                      >
                        <ErpIcon name="check" size={14} />
                        <span>Guardar</span>
                      </button>
                    </div>
                  ) : (
                    <span style={{ fontSize: 11.5, color: 'var(--tenue)', fontWeight: 600 }}>Lote cerrado</span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        /* VISTA DE TABLA GENERAL COMPACTA */
        <div className="erp-tabla-wrap erp-anim-4">
          <table className="erp-tabla">
            <thead>
              <tr>
                <th>Turno PEPS</th>
                <th>Lote</th>
                <th>Producto</th>
                <th>Ubicación</th>
                <th>Caducidad</th>
                <th>Disponibilidad</th>
                <th>Estatus</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {lotesFiltrados.map(l => {
                const semaforo = evaluarCaducidad(l.fecha_caducidad);
                const esActivo = l.estado === 'Activo_en_Rotacion_PEPS';
                return (
                  <tr key={l.id_lote}>
                    <td>
                      {esActivo ? (
                        <span className={`erp-badge ${l._turnoProducto === 1 ? 'erp-badge--verde' : 'erp-badge--uva'}`}>
                          #{l._turnoProducto} Salida
                        </span>
                      ) : (
                        <span style={{ fontSize: 11.5, color: 'var(--tenue)' }}>—</span>
                      )}
                    </td>
                    <td>
                      <b style={{ fontFamily: 'monospace' }}>{l.numero_lote}</b>
                      <small style={{ display: 'block', color: 'var(--tenue)', fontSize: 11 }}>{l.codigo_barras}</small>
                    </td>
                    <td>
                      <b style={{ display: 'block' }}>{l.tbl_productos?.nombre_dulce}</b>
                      <small style={{ color: 'var(--texto-2)' }}>{l.tbl_productos?.presentacion}</small>
                    </td>
                    <td>{l.ubicacion_anaquel}</td>
                    <td>
                      <b style={{ display: 'block', fontSize: 12.5 }}>{l.fecha_caducidad}</b>
                      <span className={`erp-badge ${semaforo.clase}`}>{semaforo.etiqueta}</span>
                    </td>
                    <td>
                      <div className="erp-stepper">
                        <button type="button" disabled={!esActivo} onClick={() => actualizarCantidadLote(l, Number(l.cantidad_disponible) - 1)}>−</button>
                        <input
                          type="number"
                          min="0"
                          disabled={!esActivo}
                          value={l.cantidad_disponible}
                          onChange={e => {
                            const copia = lotes.map(item =>
                              item.id_lote === l.id_lote ? { ...item, cantidad_disponible: e.target.value } : item
                            );
                            setLotes(copia);
                          }}
                        />
                        <button type="button" disabled={!esActivo} onClick={() => actualizarCantidadLote(l, Number(l.cantidad_disponible) + 1)}>+</button>
                      </div>
                    </td>
                    <td>
                      {esActivo ? (
                        <span className="erp-badge erp-badge--verde">En Rotación</span>
                      ) : l.estado === 'Agotado' ? (
                        <span className="erp-badge erp-badge--amarillo">Agotado</span>
                      ) : (
                        <span className="erp-badge erp-badge--naranja">Merma</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {esActivo && (
                        <div style={{ display: 'inline-flex', gap: 6 }}>
                          <button onClick={() => actualizarCantidadLote(l, l.cantidad_disponible)} className="erp-btn erp-btn--primario" style={{ padding: '6px 10px', fontSize: 11.5 }}>
                            <ErpIcon name="check" size={13} />
                            <span>Guardar</span>
                          </button>
                          <button onClick={() => bloquearPorMerma(l)} className="erp-btn erp-btn--secundario" style={{ padding: '6px 10px', fontSize: 11.5, color: 'var(--naranja)' }}>
                            <ErpIcon name="trash" size={13} />
                            <span>Merma</span>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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