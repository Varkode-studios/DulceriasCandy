'use client';

import { useState, useRef } from 'react';

export default function ErpImageUpload({
  previewUrl = '',
  onFileSelect,
  title = 'Subir fotografía del producto',
  subtitle = 'Arrastra una imagen aquí o haz clic para explorar · PNG sin fondo o WEBP',
  buttonLabel = 'Elegir imagen',
  onReset,
  resetLabel = 'Restaurar',
  compact = false
}) {
  const [arrastrando, setArrastrando] = useState(false);
  const [nombreArchivo, setNombreArchivo] = useState('');
  const inputRef = useRef(null);

  function procesarArchivo(archivo) {
    if (!archivo || !archivo.type.startsWith('image/')) return;
    setNombreArchivo(archivo.name);
    if (onFileSelect) {
      onFileSelect(archivo);
    }
  }

  function alCambiarInput(e) {
    const archivo = e.target.files?.[0];
    if (archivo) procesarArchivo(archivo);
    e.target.value = '';
  }

  function alSoltar(e) {
    e.preventDefault();
    e.stopPropagation();
    setArrastrando(false);
    const archivo = e.dataTransfer?.files?.[0];
    if (archivo) procesarArchivo(archivo);
  }

  return (
    <div
      className={`erp-upload ${compact ? 'erp-upload--compact' : ''} ${arrastrando ? 'arrastrando' : ''}`}
      onDragOver={e => {
        e.preventDefault();
        setArrastrando(true);
      }}
      onDragLeave={() => setArrastrando(false)}
      onDrop={alSoltar}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={alCambiarInput}
      />

      {/* Miniatura o ícono de carga */}
      <div className="erp-upload__thumb">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="Vista previa"
            onError={e => {
              e.currentTarget.src = '/img/ICONO.png';
            }}
          />
        ) : (
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="3" y="3" width="18" height="18" rx="3" ry="3" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        )}
      </div>

      {/* Texto informativo */}
      <div className="erp-upload__body">
        <div className="erp-upload__title">
          {arrastrando ? 'Suelta la imagen para cargarla' : title}
        </div>
        <div className="erp-upload__sub">
          {nombreArchivo ? (
            <span className="erp-upload__file">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {nombreArchivo}
            </span>
          ) : (
            subtitle
          )}
        </div>
      </div>

      {/* Acciones */}
      <div className="erp-upload__actions" onClick={e => e.stopPropagation()}>
        {onReset && (
          <button
            type="button"
            className="erp-upload__reset"
            onClick={() => {
              setNombreArchivo('');
              onReset();
            }}
          >
            {resetLabel}
          </button>
        )}
        <button
          type="button"
          className="erp-upload__btn"
          onClick={() => inputRef.current?.click()}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.3"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <span>{buttonLabel}</span>
        </button>
      </div>
    </div>
  );
}