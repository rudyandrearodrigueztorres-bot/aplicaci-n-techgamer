'use client';

import React from 'react';
import { X, Download } from 'lucide-react';

interface ImageLightboxProps {
  src: string | null;
  title?: string;
  subtitle?: string;
  onClose: () => void;
}

export default function ImageLightbox({
  src,
  title,
  subtitle,
  onClose,
}: ImageLightboxProps) {
  if (!src) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl w-full bg-slate-900 rounded-2xl overflow-hidden border border-slate-700 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <div className="min-w-0">
            {title && (
              <div className="text-sm font-semibold text-white truncate">
                {title}
              </div>
            )}
            {subtitle && (
              <div className="text-xs text-slate-400 truncate">{subtitle}</div>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={src}
              download
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 transition"
            >
              <Download className="w-3.5 h-3.5" />
              Descargar
            </a>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
              aria-label="Cerrar imagen"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="bg-slate-950 flex items-center justify-center p-4 max-h-[80vh]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={title || 'Evidencia fotográfica'}
            className="max-h-[74vh] max-w-full object-contain rounded-lg"
          />
        </div>
      </div>
    </div>
  );
}

