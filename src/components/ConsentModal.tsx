'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  FileCheck2,
  X,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  UserCheck,
} from 'lucide-react';
import {
  CONSENT_SECTIONS,
  CONSENT_VERSION,
  formatDateTime,
  type ConsentMethod,
} from '@/lib/constants';
import SignatureCanvas from './SignatureCanvas';

interface ConsentViewData {
  orderNumber: string;
  deviceLabel: string;
  clientName: string;
  consentAccepted: boolean;
  consentAcceptedAt: string | null;
  consentMethod: ConsentMethod | null;
  consentSignaturePath: string | null;
  consentSignerName: string | null;
  consentVersion: string;
}

interface ConsentModalProps {
  open: boolean;
  mode: 'sign' | 'view';
  blocking?: boolean;
  orderId: number;
  data: ConsentViewData;
  onClose?: () => void;
  onAccepted?: () => void;
}

export default function ConsentModal({
  open,
  mode,
  blocking = false,
  orderId,
  data,
  onClose,
  onAccepted,
}: ConsentModalProps) {
  const [accepted, setAccepted] = useState(false);
  const [signerName, setSignerName] = useState(data.clientName);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!accepted) {
      setError(
        'Debes marcar la casilla obligatoria de aceptación antes de continuar.'
      );
      return;
    }
    if (!signerName.trim()) {
      setError('Indica tu nombre completo.');
      return;
    }
    if (!signatureDataUrl) {
      setError('Por favor, dibuja tu firma digital en el recuadro inferior.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/consent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accepted: true,
          signerName: signerName.trim(),
          signatureDataUrl,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'No se pudo registrar el consentimiento.');
        return;
      }
      if (onAccepted) onAccepted();
    } catch {
      setError('Error de conexión al guardar la aceptación.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div
          className={`px-6 py-4 flex items-center justify-between border-b ${
            mode === 'view'
              ? 'bg-emerald-50 border-emerald-200'
              : 'bg-blue-50 border-blue-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                mode === 'view'
                  ? 'bg-[#10B981] text-white'
                  : 'bg-[#2563EB] text-white'
              }`}
            >
              {mode === 'view' ? (
                <FileCheck2 className="w-5 h-5" />
              ) : (
                <ShieldCheck className="w-5 h-5" />
              )}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                {mode === 'view'
                  ? 'Constancia de Aceptación de Datos y Servicio'
                  : 'Aceptación Obligatoria de Protección de Datos y Servicio'}
              </h2>
              <p className="text-xs text-slate-600">
                Orden <span className="font-semibold">{data.orderNumber}</span> ·{' '}
                {data.deviceLabel}
              </p>
            </div>
          </div>

          {!blocking && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-white/70 transition"
              aria-label="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {mode === 'sign' && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3.5 text-sm text-amber-900 flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">
                  Revisión y consentimiento requerido para continuar
                </p>
                <p className="text-xs text-amber-800 mt-0.5">
                  Esta orden fue registrada sin firma presencial. Para acceder al
                  seguimiento en tiempo real de tu equipo y recibir tu certificado
                  digital, revisa y acepta las condiciones del servicio técnico y
                  el tratamiento de tus datos personales.
                </p>
              </div>
            </div>
          )}

          {mode === 'view' && data.consentAccepted && (
            <div className="rounded-xl bg-emerald-50/70 border border-emerald-200 p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#10B981] mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs text-slate-500">Estado legal</div>
                  <div className="font-semibold text-emerald-800">
                    Aceptado y verificado
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-[#10B981] mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs text-slate-500">Fecha y hora exacta</div>
                  <div className="font-semibold text-slate-900">
                    {formatDateTime(data.consentAcceptedAt)}
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <UserCheck className="w-4 h-4 text-[#2563EB] mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs text-slate-500">Firmante</div>
                  <div className="font-semibold text-slate-900">
                    {data.consentSignerName || data.clientName}
                  </div>
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Canal / Versión</div>
                <div className="font-semibold text-slate-900">
                  {data.consentMethod === 'PRESENCIAL'
                    ? 'Firma presencial en mostrador'
                    : 'Aceptación digital en Portal del Cliente'}{' '}
                  <span className="text-xs font-normal text-slate-500">
                    ({data.consentVersion || CONSENT_VERSION})
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Legal Clauses */}
          <div className="rounded-xl border border-slate-200 bg-[#F8FAFC] p-4 space-y-3.5 max-h-60 overflow-y-auto">
            {CONSENT_SECTIONS.map((sec) => (
              <div key={sec.title}>
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-800">
                  {sec.title}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed mt-1">
                  {sec.content}
                </p>
              </div>
            ))}
          </div>

          {mode === 'view' ? (
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Firma digital registrada
              </div>
              {data.consentSignaturePath ? (
                <div className="rounded-xl border border-slate-200 bg-white p-4 flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={data.consentSignaturePath}
                    alt="Firma digital del cliente"
                    className="max-h-36 object-contain"
                  />
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-xs text-slate-500">
                  Aceptación electrónica registrada sin trazo gráfico.
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nombre completo del titular / firmante
                </label>
                <input
                  type="text"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 outline-none"
                  required
                />
              </div>

              <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 bg-blue-50/40 cursor-pointer hover:bg-blue-50/70 transition">
                <input
                  type="checkbox"
                  checked={accepted}
                  onChange={(e) => setAccepted(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB]"
                />
                <span className="text-xs sm:text-sm text-slate-800 leading-snug">
                  <strong>Acepto expresamente</strong> la Política de Privacidad,
                  el tratamiento de mis datos personales (RGPD), la autorización
                  de manipulación/diagnóstico del ordenador y la política de
                  responsabilidad sobre copias de seguridad.
                </span>
              </label>

              <SignatureCanvas
                onChange={setSignatureDataUrl}
                disabled={submitting}
                height={150}
                label="Tu firma digital de conformidad"
              />

              {error && (
                <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-xs font-medium text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                {!blocking && onClose && (
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={submitting}
                    className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition"
                  >
                    Cancelar
                  </button>
                )}
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#2563EB] hover:bg-blue-700 disabled:opacity-60 shadow-sm shadow-blue-600/20 transition"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Registrando aceptación...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      Confirmar y Aceptar Condiciones
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {mode === 'view' && onClose && (
          <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 transition"
            >
              Cerrar constancia
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

