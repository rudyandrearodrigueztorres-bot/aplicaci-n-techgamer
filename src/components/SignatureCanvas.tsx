'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Eraser, PenTool, CheckCircle2 } from 'lucide-react';

interface SignatureCanvasProps {
  onChange: (dataUrl: string | null) => void;
  disabled?: boolean;
  height?: number;
  label?: string;
}

export default function SignatureCanvas({
  onChange,
  disabled = false,
  height = 170,
  label = 'Firma digital en pantalla (ratón o dedo)',
}: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const [hasStroke, setHasStroke] = useState(false);

  const setupCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.max(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(rect.width * dpr, 600);
    canvas.height = height * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, rect.width || 600, height);
    ctx.strokeStyle = '#1E3A8A';
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  useEffect(() => {
    setupCanvas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const point = getPoint(e);
    isDrawingRef.current = true;
    lastPointRef.current = point;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 1.3, 0, Math.PI * 2);
      ctx.fillStyle = '#1E3A8A';
      ctx.fill();
    }
    setHasStroke(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled || !isDrawingRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !lastPointRef.current) return;

    const point = getPoint(e);
    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(point.x, point.y);
    ctx.strokeStyle = '#1E3A8A';
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    lastPointRef.current = point;
  };

  const finishStroke = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    lastPointRef.current = null;
    const canvas = canvasRef.current;
    if (canvas) {
      onChange(canvas.toDataURL('image/png'));
    }
  };

  const handleClear = () => {
    setupCanvas();
    setHasStroke(false);
    onChange(null);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700">
          <PenTool className="w-4 h-4 text-[#2563EB]" />
          {label}
        </span>
        <div className="flex items-center gap-3">
          {hasStroke && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-[#10B981]">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Firma capturada
            </span>
          )}
          <button
            type="button"
            onClick={handleClear}
            disabled={disabled || !hasStroke}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 transition"
          >
            <Eraser className="w-3.5 h-3.5" />
            Limpiar firma
          </button>
        </div>
      </div>

      <div className="relative rounded-xl border-2 border-dashed border-slate-300 bg-white overflow-hidden hover:border-[#2563EB]/60 transition">
        <canvas
          ref={canvasRef}
          style={{ height: `${height}px`, touchAction: 'none' }}
          className="w-full block cursor-crosshair select-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishStroke}
          onPointerCancel={finishStroke}
        />
        {!hasStroke && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-slate-400">
            <span className="text-sm font-medium">Dibuja tu firma aquí</span>
            <span className="text-xs mt-0.5">
              Compatible con ratón, trackpad y pantalla táctil
            </span>
          </div>
        )}
        <div className="pointer-events-none absolute bottom-3 left-6 right-6 border-b border-slate-200" />
      </div>
    </div>
  );
}

