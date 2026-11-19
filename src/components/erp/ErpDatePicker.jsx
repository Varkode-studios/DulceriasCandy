'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';

const MESES_LARGOS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const MESES_CORTOS = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic'
];

const DIAS_SEMANA = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'];

function obtenerHoyStr() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}

function parsearFecha(str) {
  if (!str || !/^\d{4}-\d{2}-\d{2}$/.test(str)) return null;
  const [anio, mes, dia] = str.split('-').map(Number);
  return { anio, mes: mes - 1, dia };
}

function construirFechaStr(anio, mesIdx, dia) {
  const m = String(mesIdx + 1).padStart(2, '0');
  const d = String(dia).padStart(2, '0');
  return `${anio}-${m}-${d}`;
}

function formatearVisible(str) {
  const p = parsearFecha(str);
  if (!p) return '';
  return `${String(p.dia).padStart(2, '0')} ${MESES_CORTOS[p.mes]} ${p.anio}`;
}

export default function ErpDatePicker({
  value = '',
  onChange,
  min = '',
  placeholder = 'dd/mm/aaaa',
  disabled = false,
  compact = false,
  style = {},
  className = ''
}) {
  const hoyStr = useMemo(() => obtenerHoyStr(), []);
  const parsedHoy = useMemo(() => parsearFecha(hoyStr), [hoyStr]);

  const [abierto, setAbierto] = useState(false);
  const [vistaMes, setVistaMes] = useState({
    anio: parsedHoy.anio,
    mes: parsedHoy.mes
  });
  const [posicion, setPosicion] = useState({ top: 0, left: 0, abreArriba: false });

  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  function calcularPosicion() {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const anchoCalendario = 296;
    const altoEstimado = 345;

    const espacioAbajo = window.innerHeight - rect.bottom;
    const espacioArriba = rect.top;
    const abreArriba = espacioAbajo < altoEstimado && espacioArriba > espacioAbajo;

    const maxLeft = Math.max(12, window.innerWidth - anchoCalendario - 12);
    const left = Math.min(Math.max(12, rect.left), maxLeft);

    setPosicion({
      top: abreArriba ? rect.top - 6 : rect.bottom + 6,
      left,
      abreArriba
    });
  }

  function alternarCalendario() {
    if (disabled) return;
    if (!abierto) {
      const refFecha = parsearFecha(value) || parsearFecha(min) || parsedHoy;
      setVistaMes({ anio: refFecha.anio, mes: refFecha.mes });
      calcularPosicion();
      setAbierto(true);
    } else {
      setAbierto(false);
    }
  }

  function cambiarMes(delta) {
    setVistaMes(prev => {
      let nuevoMes = prev.mes + delta;
      let nuevoAnio = prev.anio;
      if (nuevoMes < 0) {
        nuevoMes = 11;
        nuevoAnio -= 1;
      } else if (nuevoMes > 11) {
        nuevoMes = 0;
        nuevoAnio += 1;
      }
      return { anio: nuevoAnio, mes: nuevoMes };
    });
  }

  function seleccionarFecha(fechaStr) {
    if (min && fechaStr < min) return;
    setAbierto(false);
    if (onChange) onChange(fechaStr);
    triggerRef.current?.focus();
  }

  useEffect(() => {
    if (!abierto) return;

    calcularPosicion();

    function alHacerClicFuera(e) {
      if (
        triggerRef.current?.contains(e.target) ||
        menuRef.current?.contains(e.target)
      ) {
        return;
      }
      setAbierto(false);
    }

    function alPresionarTecla(e) {
      if (e.key === 'Escape') {
        setAbierto(false);
        triggerRef.current?.focus();
      }
    }

    function alDesplazar(e) {
      if (menuRef.current?.contains(e.target)) return;
      calcularPosicion();
    }

    document.addEventListener('mousedown', alHacerClicFuera);
    document.addEventListener('keydown', alPresionarTecla);
    window.addEventListener('scroll', alDesplazar, true);
    window.addEventListener('resize', alDesplazar);

    return () => {
      document.removeEventListener('mousedown', alHacerClicFuera);
      document.removeEventListener('keydown', alPresionarTecla);
      window.removeEventListener('scroll', alDesplazar, true);
      window.removeEventListener('resize', alDesplazar);
    };
  }, [abierto]);

  // Genera las 42 celdas (6 semanas) del mes visible
  const celdasCalendario = useMemo(() => {
    const primerDiaSemana = new Date(vistaMes.anio, vistaMes.mes, 1).getDay();
    const diasEnMes = new Date(vistaMes.anio, vistaMes.mes + 1, 0).getDate();
    const diasMesAnterior = new Date(vistaMes.anio, vistaMes.mes, 0).getDate();

    const celdas = [];

    // Días del mes anterior
    for (let i = primerDiaSemana - 1; i >= 0; i--) {
      const d = diasMesAnterior - i;
      const mPrev = vistaMes.mes === 0 ? 11 : vistaMes.mes - 1;
      const aPrev = vistaMes.mes === 0 ? vistaMes.anio - 1 : vistaMes.anio;
      celdas.push({
        dia: d,
        fechaStr: construirFechaStr(aPrev, mPrev, d),
        fueraDeMes: true
      });
    }

    // Días del mes actual
    for (let d = 1; d <= diasEnMes; d++) {
      celdas.push({
        dia: d,
        fechaStr: construirFechaStr(vistaMes.anio, vistaMes.mes, d),
        fueraDeMes: false
      });
    }

    // Completar hasta 42 celdas con el mes siguiente
    const restantes = 42 - celdas.length;
    for (let d = 1; d <= restantes; d++) {
      const mSig = vistaMes.mes === 11 ? 0 : vistaMes.mes + 1;
      const aSig = vistaMes.mes === 11 ? vistaMes.anio + 1 : vistaMes.anio;
      celdas.push({
        dia: d,
        fechaStr: construirFechaStr(aSig, mSig, d),
        fueraDeMes: true
      });
    }

    return celdas;
  }, [vistaMes]);

  const textoMostrado = formatearVisible(value);
  const hoyDeshabilitado = Boolean(min && hoyStr < min);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={abierto}
        onClick={alternarCalendario}
        className={`erp-cselect erp-datepicker-trigger ${compact ? 'erp-cselect--compact' : ''} ${abierto ? 'abierto' : ''} ${className}`}
        style={style}
      >
        <span className={`erp-cselect__label ${!textoMostrado ? 'placeholder' : ''}`}>
          {textoMostrado || placeholder}
        </span>

        <svg
          className="erp-datepicker-trigger__icon"
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.1"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="3" y="4" width="18" height="18" rx="2.5" ry="2.5" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      </button>

      {abierto && typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            role="dialog"
            aria-label="Seleccionar fecha"
            className={`erp-datepicker-menu ${posicion.abreArriba ? 'arriba' : 'abajo'}`}
            style={{
              top: posicion.top,
              left: posicion.left
            }}
          >
            {/* Cabecera del mes */}
            <div className="erp-datepicker__head">
              <button
                type="button"
                className="erp-datepicker__nav"
                onClick={() => cambiarMes(-1)}
                aria-label="Mes anterior"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>

              <span className="erp-datepicker__month">
                {MESES_LARGOS[vistaMes.mes]} {vistaMes.anio}
              </span>

              <button
                type="button"
                className="erp-datepicker__nav"
                onClick={() => cambiarMes(1)}
                aria-label="Mes siguiente"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>

            {/* Encabezados de días */}
            <div className="erp-datepicker__weekdays">
              {DIAS_SEMANA.map(d => (
                <span key={d}>{d}</span>
              ))}
            </div>

            {/* Cuadrícula de días */}
            <div className="erp-datepicker__grid">
              {celdasCalendario.map(celda => {
                const esSeleccionada = value === celda.fechaStr;
                const esHoy = hoyStr === celda.fechaStr;
                const bloqueada = Boolean(min && celda.fechaStr < min);

                return (
                  <button
                    key={celda.fechaStr}
                    type="button"
                    disabled={bloqueada}
                    onClick={() => seleccionarFecha(celda.fechaStr)}
                    className={`erp-datepicker__day ${celda.fueraDeMes ? 'fuera' : ''} ${esHoy ? 'hoy' : ''} ${esSeleccionada ? 'seleccionada' : ''}`}
                  >
                    {celda.dia}
                  </button>
                );
              })}
            </div>

            {/* Pie con accesos rápidos */}
            <div className="erp-datepicker__foot">
              <button
                type="button"
                className="erp-datepicker__foot-btn borrar"
                onClick={() => {
                  setAbierto(false);
                  if (onChange) onChange('');
                }}
              >
                Limpiar
              </button>
              <button
                type="button"
                disabled={hoyDeshabilitado}
                className="erp-datepicker__foot-btn hoy"
                onClick={() => seleccionarFecha(hoyStr)}
              >
                Hoy
              </button>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}