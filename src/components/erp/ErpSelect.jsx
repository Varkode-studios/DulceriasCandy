'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';

export default function ErpSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Seleccionar...',
  searchable,
  searchPlaceholder = 'Buscar opción...',
  compact = false,
  disabled = false,
  style = {},
  className = ''
}) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [indiceActivo, setIndiceActivo] = useState(-1);
  const [posicion, setPosicion] = useState({ top: 0, left: 0, width: 220, abreArriba: false });

  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const inputBusquedaRef = useRef(null);

  // Normaliza opciones para aceptar tanto strings simples como { value, label, badge }
  const opcionesNormalizadas = useMemo(
    () =>
      options.map(opt =>
        typeof opt === 'object' && opt !== null
          ? { value: String(opt.value), label: opt.label, badge: opt.badge ?? null }
          : { value: String(opt), label: String(opt), badge: null }
      ),
    [options]
  );

  const valorStr = value === null || value === undefined ? '' : String(value);
  const opcionSeleccionada = opcionesNormalizadas.find(o => o.value === valorStr);
  const mostrarBuscador =
    searchable !== undefined ? searchable : opcionesNormalizadas.length >= 8;

  const opcionesFiltradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return opcionesNormalizadas;
    return opcionesNormalizadas.filter(o => o.label.toLowerCase().includes(q));
  }, [opcionesNormalizadas, busqueda]);

  function calcularPosicion() {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const altoEstimado = Math.min(310, opcionesNormalizadas.length * 40 + (mostrarBuscador ? 54 : 16));
    const espacioAbajo = window.innerHeight - rect.bottom;
    const espacioArriba = rect.top;
    const abreArriba = espacioAbajo < altoEstimado && espacioArriba > espacioAbajo;

    const anchoMenu = Math.max(rect.width, compact ? 110 : 190);
    const maxLeft = Math.max(12, window.innerWidth - anchoMenu - 12);
    const left = Math.min(Math.max(12, rect.left), maxLeft);

    setPosicion({
      top: abreArriba ? rect.top - 6 : rect.bottom + 6,
      left,
      width: Math.min(anchoMenu, window.innerWidth - 24),
      abreArriba
    });
  }

  function alternarMenu() {
    if (disabled) return;
    if (!abierto) {
      calcularPosicion();
      setBusqueda('');
      const idxActual = opcionesNormalizadas.findIndex(o => o.value === valorStr);
      setIndiceActivo(idxActual >= 0 ? idxActual : 0);
      setAbierto(true);
    } else {
      setAbierto(false);
    }
  }

  function seleccionarOpcion(opt) {
    setAbierto(false);
    setBusqueda('');
    if (onChange) onChange(opt.value);
    triggerRef.current?.focus();
  }

  // Cierre al hacer clic fuera y recolocación si hay scroll o resize
  useEffect(() => {
    if (!abierto) return;

    calcularPosicion();
    if (mostrarBuscador) {
      requestAnimationFrame(() => inputBusquedaRef.current?.focus());
    }

    function alHacerClicFuera(e) {
      if (
        triggerRef.current?.contains(e.target) ||
        menuRef.current?.contains(e.target)
      ) {
        return;
      }
      setAbierto(false);
    }

    function alDesplazarORedimensionar(e) {
      if (menuRef.current?.contains(e.target)) return;
      calcularPosicion();
    }

    document.addEventListener('mousedown', alHacerClicFuera);
    window.addEventListener('scroll', alDesplazarORedimensionar, true);
    window.addEventListener('resize', alDesplazarORedimensionar);

    return () => {
      document.removeEventListener('mousedown', alHacerClicFuera);
      window.removeEventListener('scroll', alDesplazarORedimensionar, true);
      window.removeEventListener('resize', alDesplazarORedimensionar);
    };
  }, [abierto, mostrarBuscador, opcionesNormalizadas.length]);

  function manejarTeclado(e) {
    if (disabled) return;

    if (!abierto) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        alternarMenu();
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setAbierto(false);
      triggerRef.current?.focus();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIndiceActivo(prev =>
        opcionesFiltradas.length === 0 ? -1 : (prev + 1) % opcionesFiltradas.length
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIndiceActivo(prev =>
        opcionesFiltradas.length === 0
          ? -1
          : (prev - 1 + opcionesFiltradas.length) % opcionesFiltradas.length
      );
    } else if (e.key === 'Enter' && indiceActivo >= 0 && opcionesFiltradas[indiceActivo]) {
      e.preventDefault();
      seleccionarOpcion(opcionesFiltradas[indiceActivo]);
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={abierto}
        onClick={alternarMenu}
        onKeyDown={manejarTeclado}
        className={`erp-cselect ${compact ? 'erp-cselect--compact' : ''} ${abierto ? 'abierto' : ''} ${className}`}
        style={style}
      >
        <span className={`erp-cselect__label ${!opcionSeleccionada ? 'placeholder' : ''}`}>
          {opcionSeleccionada ? opcionSeleccionada.label : placeholder}
        </span>
        <svg
          className="erp-cselect__chevron"
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.3"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {abierto && typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            role="listbox"
            className={`erp-cselect-menu ${posicion.abreArriba ? 'arriba' : 'abajo'}`}
            style={{
              top: posicion.top,
              left: posicion.left,
              width: posicion.width
            }}
            onKeyDown={manejarTeclado}
          >
            {mostrarBuscador && (
              <div className="erp-cselect-menu__search">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  ref={inputBusquedaRef}
                  type="text"
                  placeholder={searchPlaceholder}
                  value={busqueda}
                  onChange={e => {
                    setBusqueda(e.target.value);
                    setIndiceActivo(0);
                  }}
                />
                {busqueda && (
                  <button
                    type="button"
                    className="erp-cselect-menu__clear"
                    onClick={() => {
                      setBusqueda('');
                      inputBusquedaRef.current?.focus();
                    }}
                    aria-label="Limpiar búsqueda"
                  >
                    ✕
                  </button>
                )}
              </div>
            )}

            <div className="erp-cselect-menu__list">
              {opcionesFiltradas.length === 0 ? (
                <div className="erp-cselect-menu__empty">Sin coincidencias</div>
              ) : (
                opcionesFiltradas.map((opt, idx) => {
                  const seleccionada = opt.value === valorStr;
                  const enfocada = idx === indiceActivo;
                  return (
                    <button
                      key={`${opt.value}-${idx}`}
                      type="button"
                      role="option"
                      aria-selected={seleccionada}
                      className={`erp-cselect-opt ${seleccionada ? 'seleccionada' : ''} ${enfocada ? 'enfocada' : ''}`}
                      onMouseEnter={() => setIndiceActivo(idx)}
                      onClick={() => seleccionarOpcion(opt)}
                    >
                      <span className="erp-cselect-opt__text">{opt.label}</span>
                      <span className="erp-cselect-opt__right">
                        {opt.badge !== null && opt.badge !== undefined && (
                          <span className="erp-cselect-opt__badge">{opt.badge}</span>
                        )}
                        {seleccionada && (
                          <svg
                            className="erp-cselect-opt__check"
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}