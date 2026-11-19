'use client';

import React from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Printer,
  Cpu,
  ShieldCheck,
  CheckCircle2,
  Award,
  Camera,
  FileCheck2,
  AlertTriangle,
} from 'lucide-react';
import type { OrderWithDetails } from '@/db';
import {
  PHOTO_CATEGORY_LABELS,
  formatDateTime,
  getStatusInfo,
  isCertificateAvailable,
} from '@/lib/constants';

interface CertificateViewProps {
  order: OrderWithDetails;
  backHref: string;
  isTechnician: boolean;
}

export default function CertificateView({
  order,
  backHref,
  isTechnician,
}: CertificateViewProps) {
  const statusInfo = getStatusInfo(order.status);
  const officiallyIssued = isCertificateAvailable(order.status);

  const allEvidence: { src: string; caption: string; date: string }[] = [];
  if (order.initial_photo_path) {
    allEvidence.push({
      src: order.initial_photo_path,
      caption: 'Fotografía inicial de recepción',
      date: formatDateTime(order.received_at),
    });
  }
  for (const photo of [...order.photos].reverse()) {
    allEvidence.push({
      src: photo.file_path,
      caption: photo.caption || PHOTO_CATEGORY_LABELS[photo.category],
      date: formatDateTime(photo.created_at),
    });
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-6 px-4 sm:px-6 lg:px-8">
      {/* Screen-only action bar */}
      <div className="no-print max-w-4xl mx-auto mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-sm transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver
        </Link>

        <div className="flex items-center gap-2.5">
          {isTechnician && !officiallyIssued && (
            <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Vista previa de borrador (aún en {statusInfo.label})
            </span>
          )}
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-[#2563EB] hover:bg-blue-700 shadow-sm shadow-blue-600/25 transition"
          >
            <Printer className="w-4 h-4" />
            Imprimir / Guardar como PDF
          </button>
        </div>
      </div>

      {/* Printable Certificate Sheet */}
      <article className="print-certificate-sheet max-w-4xl mx-auto bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
        {/* Top Accent Band */}
        <div className="h-2.5 bg-gradient-to-r from-[#1E3A8A] via-[#2563EB] to-[#10B981]" />

        <div className="p-6 sm:p-10 space-y-7">
          {/* Official Header */}
          <header className="flex flex-col sm:flex-row sm:items-start justify-between gap-5 border-b border-slate-200 pb-6">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-[#2563EB] text-white flex items-center justify-center shrink-0">
                <Cpu className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-[#2563EB]">
                  TechCare Lab · Servicio Técnico Certificado
                </div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
                  Certificado Digital de Diagnóstico y Reparación
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Documento oficial de trazabilidad técnica, evidencias y
                  garantía de intervención
                </p>
              </div>
            </div>

            <div className="sm:text-right shrink-0 space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
                {statusInfo.label}
              </div>
              <div className="text-sm font-mono font-extrabold text-slate-900">
                {order.order_number}
              </div>
              <div className="text-[11px] font-mono text-slate-500">
                Verificación: <strong>{order.certificate_code}</strong>
              </div>
            </div>
          </header>

          {/* Client, Device & Dates Grid */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4 print-break-inside-avoid">
            <div className="rounded-2xl border border-slate-200 bg-[#F8FAFC] p-4 space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Datos del Equipo
              </div>
              <div className="text-base font-bold text-slate-900">
                {order.device_brand} {order.device_model}
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                <div>
                  <span className="text-slate-500 block">Número de Serie (S/N)</span>
                  <span className="font-mono font-bold text-slate-900">
                    {order.device_serial}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Técnico Responsable</span>
                  <span className="font-semibold text-slate-900">
                    {order.technician_name || 'Técnico Miguel Gómez'}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-[#F8FAFC] p-4 space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Titular y Fechas de Servicio
              </div>
              <div className="text-base font-bold text-slate-900">
                {order.client_name}
              </div>
              <div className="text-xs text-slate-600">
                {order.client_email} · {order.client_phone}
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-200/80">
                <div>
                  <span className="text-slate-500 block">Fecha de ingreso</span>
                  <span className="font-mono font-semibold text-slate-900">
                    {formatDateTime(order.received_at)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">
                    {order.delivered_at ? 'Fecha de entrega' : 'Fecha de finalización'}
                  </span>
                  <span className="font-mono font-semibold text-emerald-700">
                    {formatDateTime(order.delivered_at || order.completed_at)}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Technical Report */}
          <section className="space-y-4 print-break-inside-avoid">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-2">
              Informe Técnico Oficial
            </h2>

            <div className="space-y-3">
              <div className="rounded-xl border border-slate-200 p-4">
                <div className="text-xs font-bold text-slate-500 uppercase">
                  Motivo de Ingreso / Fallo Reportado
                </div>
                <p className="text-sm text-slate-800 mt-1 leading-relaxed">
                  {order.reported_issue}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4">
                  <div className="text-xs font-bold text-[#2563EB] uppercase">
                    Diagnóstico Técnico Final
                  </div>
                  <p className="text-sm text-slate-800 mt-1.5 leading-relaxed">
                    {order.final_diagnosis ||
                      'Pendiente de completar por el técnico responsable.'}
                  </p>
                </div>

                <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
                  <div className="text-xs font-bold text-emerald-700 uppercase">
                    Solución Aplicada y Verificación
                  </div>
                  <p className="text-sm text-slate-800 mt-1.5 leading-relaxed">
                    {order.solution_applied ||
                      'Pendiente de completar por el técnico responsable.'}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 p-4 flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#10B981] text-white flex items-center justify-center shrink-0">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                    Garantía Otorgada por el Taller
                  </div>
                  <div className="text-sm sm:text-base font-bold text-slate-900 mt-0.5">
                    {order.warranty_granted ||
                      'Garantía estándar de 3 meses en mano de obra'}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Evidence Photo Gallery */}
          {allEvidence.length > 0 && (
            <section className="space-y-3 print-break-inside-avoid">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-2 flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-[#2563EB]" />
                Galería de Evidencias Fotográficas ({allEvidence.length})
              </h2>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {allEvidence.map((item, idx) => (
                  <figure
                    key={`${item.src}-${idx}`}
                    className="rounded-xl border border-slate-200 overflow-hidden bg-white print-break-inside-avoid"
                  >
                    <div className="bg-slate-950 h-32 flex items-center justify-center overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.src}
                        alt={item.caption}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <figcaption className="p-2">
                      <div className="text-[11px] font-semibold text-slate-800 line-clamp-2">
                        {item.caption}
                      </div>
                      <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                        {item.date}
                      </div>
                    </figcaption>
                  </figure>
                ))}
              </div>
            </section>
          )}

          {/* Consent Constancy & Digital Verification Seal */}
          <section className="grid grid-cols-1 md:grid-cols-12 gap-5 pt-2 border-t border-slate-200 print-break-inside-avoid">
            {/* Data acceptance constancy */}
            <div className="md:col-span-7 rounded-2xl border border-slate-200 bg-[#F8FAFC] p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <FileCheck2 className="w-4 h-4 text-[#10B981]" />
                  Constancia de Aceptación de Datos (RGPD)
                </div>
                {order.consent_accepted ? (
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    Verificada
                  </span>
                ) : (
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                    Pendiente
                  </span>
                )}
              </div>

              {order.consent_accepted ? (
                <>
                  <div className="text-xs text-slate-600 space-y-1">
                    <div>
                      Firmante:{' '}
                      <strong className="text-slate-900">
                        {order.consent_signer_name || order.client_name}
                      </strong>
                    </div>
                    <div>
                      Fecha y hora exacta:{' '}
                      <strong className="font-mono text-slate-900">
                        {formatDateTime(order.consent_accepted_at)}
                      </strong>
                    </div>
                    <div>
                      Modalidad:{' '}
                      <strong className="text-slate-900">
                        {order.consent_method === 'PRESENCIAL'
                          ? 'Firma digital presencial en recepción'
                          : 'Aceptación digital en Portal del Cliente'}
                      </strong>{' '}
                      ({order.consent_version})
                    </div>
                  </div>
                  {order.consent_signature_path && (
                    <div className="bg-white rounded-xl border border-slate-200 p-2 flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={order.consent_signature_path}
                        alt="Firma digital de aceptación"
                        className="max-h-24 object-contain"
                      />
                    </div>
                  )}
                </>
              ) : (
                <p className="text-xs text-amber-800">
                  Pendiente de aceptación digital por parte del cliente.
                </p>
              )}
            </div>

            {/* Verification Seal */}
            <div className="md:col-span-5 rounded-2xl border-2 border-[#2563EB]/25 bg-gradient-to-br from-blue-50/70 to-emerald-50/50 p-4 flex flex-col items-center justify-center text-center space-y-2.5">
              <div className="w-16 h-16 rounded-full bg-white border-2 border-[#10B981] shadow-sm flex items-center justify-center relative">
                <ShieldCheck className="w-8 h-8 text-[#10B981]" />
              </div>
              <div>
                <div className="text-xs font-extrabold uppercase tracking-widest text-[#1E3A8A]">
                  Sello de Verificación Digital
                </div>
                <div className="font-mono text-xs font-bold text-[#2563EB] mt-1 bg-white px-2.5 py-1 rounded-lg border border-blue-200 inline-block">
                  {order.certificate_code}
                </div>
              </div>
              <div className="text-[11px] text-slate-600 leading-snug">
                Emitido por <strong>TechCare Lab</strong>
                <br />
                Responsable: {order.technician_name || 'Técnico Miguel Gómez'}
              </div>
            </div>
          </section>

          <footer className="pt-4 border-t border-slate-100 text-center text-[11px] text-slate-400">
            Este certificado digital acredita el estado de recepción, las
            intervenciones técnicas ejecutadas y el consentimiento de protección
            de datos (RGPD) asociados a la orden {order.order_number}.
          </footer>
        </div>
      </article>
    </div>
  );
}

