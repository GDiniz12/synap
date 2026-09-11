'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';

export interface ImageCropperModalProps {
  isOpen: boolean;
  imageSrc: string | null;
  cropShape?: 'round' | 'squircle';
  title?: string;
  outputSize?: number;
  onConfirm: (croppedBlob: Blob, previewUrl: string) => Promise<void> | void;
  onClose: () => void;
}

export default function ImageCropperModal({
  isOpen,
  imageSrc,
  cropShape = 'round',
  title,
  outputSize = 512,
  onConfirm,
  onClose,
}: ImageCropperModalProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [baseSize, setBaseSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  
  // Transform state
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);

  // Drag tracking
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const imageRef = useRef<HTMLImageElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Dimensions
  const CROP_SIZE = 240; // Size of the crop window

  // Default title based on shape
  const modalTitle = title || (cropShape === 'round' ? 'Recortar Foto de Perfil' : 'Recortar Ícone do Workspace');

  // Reset transforms whenever a new image is provided
  useEffect(() => {
    if (!isOpen || !imageSrc) {
      setImageLoaded(false);
      setPan({ x: 0, y: 0 });
      setZoom(1);
      setRotation(0);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageSrc;
    img.onload = () => {
      const nw = img.naturalWidth;
      const nh = img.naturalHeight;

      // Calculate initial base display size so it fills the crop window at zoom = 1
      const initialScale = Math.max(CROP_SIZE / nw, CROP_SIZE / nh);
      setBaseSize({
        width: nw * initialScale,
        height: nh * initialScale,
      });

      setPan({ x: 0, y: 0 });
      setZoom(1);
      setRotation(0);
      setImageLoaded(true);
    };
  }, [isOpen, imageSrc, CROP_SIZE]);

  // Update Live Preview Canvas
  const updatePreview = useCallback(() => {
    const canvas = previewCanvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img || !imageLoaded) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pSize = 80;
    canvas.width = pSize;
    canvas.height = pSize;
    ctx.clearRect(0, 0, pSize, pSize);

    // Apply clip path for preview
    ctx.save();
    ctx.beginPath();
    if (cropShape === 'round') {
      ctx.arc(pSize / 2, pSize / 2, pSize / 2, 0, Math.PI * 2);
    } else {
      // Squircle / rounded rect for workspace
      const r = 16;
      ctx.roundRect(0, 0, pSize, pSize, r);
    }
    ctx.clip();

    // Setup transform
    const scaleFactor = pSize / CROP_SIZE;
    ctx.translate(pSize / 2 + pan.x * scaleFactor, pSize / 2 + pan.y * scaleFactor);
    ctx.scale(zoom, zoom);
    ctx.rotate((rotation * Math.PI) / 180);

    const drawW = baseSize.width * scaleFactor;
    const drawH = baseSize.height * scaleFactor;
    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();
  }, [imageLoaded, cropShape, CROP_SIZE, pan, zoom, rotation, baseSize]);

  useEffect(() => {
    updatePreview();
  }, [updatePreview]);

  // Pointer event handlers for panning
  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    panStartRef.current = { ...pan };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPan({
      x: panStartRef.current.x + dx,
      y: panStartRef.current.y + dy,
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignored if already released
    }
  };

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY * -0.002;
    setZoom((prev) => Math.min(3.5, Math.max(1, +(prev + delta).toFixed(2))));
  };

  // Rotate 90 degrees clockwise
  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // Reset transforms
  const handleReset = () => {
    setPan({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
  };

  // Confirm and Export Cropped Image
  const handleConfirm = async () => {
    const img = imageRef.current;
    if (!img || !imageLoaded || isProcessing) return;

    setIsProcessing(true);
    try {
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = outputSize;
      exportCanvas.height = outputSize;
      const ctx = exportCanvas.getContext('2d');
      if (!ctx) throw new Error('Canvas 2D context unavailable');

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      if (cropShape === 'round') {
        ctx.beginPath();
        ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2);
        ctx.clip();
      } else if (cropShape === 'squircle') {
        ctx.beginPath();
        ctx.roundRect(0, 0, outputSize, outputSize, Math.round(outputSize * 0.2));
        ctx.clip();
      }

      const scaleFactor = outputSize / CROP_SIZE;
      ctx.translate(outputSize / 2 + pan.x * scaleFactor, outputSize / 2 + pan.y * scaleFactor);
      ctx.scale(zoom, zoom);
      ctx.rotate((rotation * Math.PI) / 180);

      const drawW = baseSize.width * scaleFactor;
      const drawH = baseSize.height * scaleFactor;
      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);

      exportCanvas.toBlob(
        async (blob) => {
          if (!blob) {
            setIsProcessing(false);
            return;
          }
          const previewUrl = URL.createObjectURL(blob);
          try {
            await onConfirm(blob, previewUrl);
          } finally {
            setIsProcessing(false);
            onClose();
          }
        },
        'image/webp',
        0.92
      );
    } catch (err) {
      console.error('Falha ao exportar imagem cortada:', err);
      setIsProcessing(false);
    }
  };

  if (!isOpen || !imageSrc) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-smooth-pop select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isProcessing) onClose();
      }}
    >
      <div
        className="w-full max-w-xl bg-[var(--discord-canvas)] border border-[var(--discord-border)] rounded-[8px] shadow-2xl shadow-black/80 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3.5 bg-[var(--discord-sidebar)] border-b border-[var(--discord-border)] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-[var(--brand)]"
            >
              <path d="M6 2v14a2 2 0 0 0 2 2h14" />
              <path d="M18 22V8a2 2 0 0 0-2-2H2" />
            </svg>
            <h2 className="text-sm font-bold text-[var(--foreground)] tracking-tight">
              {modalTitle}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="text-[var(--discord-text-muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer p-1 rounded-[4px] hover:bg-[var(--discord-hover)]"
            aria-label="Fechar"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body: Cropper Area + Controls + Preview */}
        <div className="p-5 flex flex-col md:flex-row gap-6 items-center justify-center">
          {/* Main Interactive Viewport */}
          <div className="flex flex-col items-center gap-3">
            <div
              className="relative w-[320px] h-[320px] bg-black/90 rounded-[8px] overflow-hidden border border-[var(--discord-border)] touch-none cursor-grab active:cursor-grabbing flex items-center justify-center shadow-inner"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onWheel={handleWheel}
            >
              {/* Image Element */}
              {imageSrc && (
                <img
                  ref={imageRef}
                  src={imageSrc}
                  alt="Recorte"
                  draggable={false}
                  className="pointer-events-none transition-none will-change-transform select-none max-w-none"
                  style={{
                    width: `${baseSize.width}px`,
                    height: `${baseSize.height}px`,
                    transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom}) rotate(${rotation}deg)`,
                    transformOrigin: 'center center',
                  }}
                />
              )}

              {/* Mask / Cutout Overlay */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div
                  style={{
                    width: `${CROP_SIZE}px`,
                    height: `${CROP_SIZE}px`,
                    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.65)',
                    borderRadius: cropShape === 'round' ? '50%' : '20px',
                  }}
                  className="relative border-2 border-white/80 shadow-2xl"
                >
                  {/* Subtle Grid Guidelines inside crop area */}
                  <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-20">
                    <div className="border-r border-b border-white" />
                    <div className="border-r border-b border-white" />
                    <div className="border-b border-white" />
                    <div className="border-r border-b border-white" />
                    <div className="border-r border-b border-white" />
                    <div className="border-b border-white" />
                    <div className="border-r border-white" />
                    <div className="border-r border-white" />
                    <div />
                  </div>
                </div>
              </div>

              {/* Instructions hint */}
              <div className="absolute bottom-2 inset-x-0 text-center pointer-events-none">
                <span className="text-[10px] font-mono text-white/60 bg-black/60 px-2 py-0.5 rounded-full">
                  Arraste para posicionar
                </span>
              </div>
            </div>

            {/* Slider & Quick Controls */}
            <div className="w-[320px] flex flex-col gap-2.5">
              {/* Zoom slider */}
              <div className="flex items-center gap-2.5 px-2">
                <button
                  type="button"
                  onClick={() => setZoom((prev) => Math.max(1, +(prev - 0.1).toFixed(2)))}
                  className="text-[var(--discord-text-muted)] hover:text-white p-1 rounded-[4px] hover:bg-[var(--discord-hover)] transition-colors cursor-pointer"
                  title="Diminuir Zoom"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>

                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.01"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="flex-1 accent-[var(--brand)] cursor-pointer h-1.5 bg-[var(--discord-input)] rounded-lg appearance-none"
                  aria-label="Controle de Zoom"
                />

                <button
                  type="button"
                  onClick={() => setZoom((prev) => Math.min(3, +(prev + 0.1).toFixed(2)))}
                  className="text-[var(--discord-text-muted)] hover:text-white p-1 rounded-[4px] hover:bg-[var(--discord-hover)] transition-colors cursor-pointer"
                  title="Aumentar Zoom"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>

                <span className="text-[11px] font-mono text-[var(--discord-text-muted)] w-9 text-right">
                  {zoom.toFixed(1)}x
                </span>
              </div>

              {/* Action Buttons: Rotate & Reset */}
              <div className="flex items-center justify-between px-1">
                <button
                  type="button"
                  onClick={handleRotate}
                  className="flex items-center gap-1.5 text-xs text-[var(--discord-text-muted)] hover:text-[var(--foreground)] px-2.5 py-1 rounded-[4px] bg-[var(--discord-sidebar)] border border-[var(--discord-border)] hover:bg-[var(--discord-hover)] transition-colors cursor-pointer"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                  </svg>
                  <span>Girar 90°</span>
                </button>

                <button
                  type="button"
                  onClick={handleReset}
                  className="text-xs text-[var(--discord-text-muted)] hover:text-[var(--foreground)] px-2.5 py-1 rounded-[4px] bg-[var(--discord-sidebar)] border border-[var(--discord-border)] hover:bg-[var(--discord-hover)] transition-colors cursor-pointer"
                >
                  Redefinir
                </button>
              </div>
            </div>
          </div>

          {/* Right Preview Column */}
          <div className="flex flex-col items-center gap-3 self-center md:self-start md:border-l md:border-[var(--discord-border)] md:pl-6 md:min-w-[160px]">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--discord-text-muted)] font-mono">
              Pré-visualização
            </span>

            <div className="p-3 bg-[var(--discord-sidebar)] rounded-[8px] border border-[var(--discord-border)] flex flex-col items-center gap-2">
              <canvas
                ref={previewCanvasRef}
                className="w-20 h-20 shadow-md"
                style={{
                  borderRadius: cropShape === 'round' ? '50%' : '16px',
                }}
              />
              <span className="text-[10px] font-mono text-[var(--discord-text-muted)]">
                {cropShape === 'round' ? 'Perfil 1:1' : 'Workspace'}
              </span>
            </div>

            <div className="text-[11px] text-[var(--discord-text-muted)] text-center max-w-[150px] leading-relaxed">
              Arraste a imagem ou use o zoom para enquadrar perfeitamente.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-[var(--discord-sidebar)] border-t border-[var(--discord-border)] flex items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 text-xs font-medium rounded-[4px] text-[var(--discord-text-primary)] hover:underline cursor-pointer disabled:opacity-50"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={!imageLoaded || isProcessing}
            className="px-5 py-2 text-xs font-medium rounded-[4px] bg-[var(--brand)] text-white hover:opacity-90 active:opacity-80 transition-opacity cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
          >
            {isProcessing ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span>Processando...</span>
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Aplicar Corte</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
