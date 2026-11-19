'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Laptop,
  Clock,
  ShieldCheck,
  FileBadge2,
  Lock,
  Camera,
  RefreshCw,
  ZoomIn,
  CheckCircle2,
  MessageSquare,
  CalendarCheck,
  Wrench,
  Sparkles,
  FileCheck2,
} from 'lucide-react';
import AppHeader from './AppHeader';
import StatusStepper from './StatusStepper';
import StatusBadge from './StatusBadge';
import ConsentModal from './ConsentModal';
import ImageLightbox from './ImageLightbox';
import type { OrderWithDetails } from '@/db';
import {
  PHOTO_CATEGORY_LABELS,
  formatDateTime,
  getStatusInfo,
  isCertificateAvailable,
} from '@/lib/constants';

export default function ClientDashboard({
  clientName,
}: {
  clientName: string;
}) {
  const [order, setOrder] = useState<OrderWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [showViewConsent, setShowViewConsent] = useState(false);
  const [lightbox, setLightbox] = useState<{
    src: string;
    title?: string;
    subtitle?: string;
  } | null>(null);

  const fetchMyOrder = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const res = await fetch('/api/orders', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        const first: OrderWithDetails | undefined = json.orders?.[0];
        setOrder(first || null);
        setLastSyncedAt(new Date().toISOString());
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchMyOrder(false);
    const interval = setInterval(() => {
      fetchMyOrder(true);
    }, 12000);
    return () => clearInterval(interval);
  }, [fetchMyOrder]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <AppHeader userName={clientName} role="CLIENT" homeHref="/cliente" />
        <div className="max-w-5xl mx-auto p-12 text-center text-sm text-slate-500">
          Cargando estado en tiempo real de tu equipo...
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <AppHeader userName={clientName} role="CLIENT" homeHref="/cliente" />
        <div className="max-w-xl mx-auto p-12 text-center space-y-3">
          <Laptop className="w-10 h-10 text-slate-400 mx-auto" />
          <h1 className="text-lg font-bold text-slate-800">
            No encontramos órdenes vinculadas a tu usuario
          </h1>
          <p className="text-sm text-slate-500">
            Contacta con el taller si necesitas asistencia con tus credenciales.
          </p>
        </div>
      </div>
    );
  }

  const needsConsent = !order.consent_accepted;
  const certAvailable = isCertificateAvailable(order.status);
  const statusInfo = getStatusInfo(order.status);

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-16">
      <AppHeader
        userName={clientName}
        role="CLIENT"
        homeHref="/cliente"
        rightSlot={
          order.consent_accepted ? (
            <button
              type="button"
              onClick={() => setShowViewConsent(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition"
            >
              <FileCheck2 className="w-4 h-4 text-[#10B981]" />
              <span className="hidden md:inline">Mi Consentimiento RGPD</span>
              <span className="md:hidden">RGPD</span>
            </button>
          ) : null
        }
      />

      {/* First-access mandatory consent gate */}
      {needsConsent && (
        <ConsentModal
          open
          mode="sign"
          blocking
          orderId={order.id}
          data={{
            orderNumber: order.order_number,
            deviceLabel: `${order.device_brand} ${order.device_model}`,
            clientName: order.client_name,
            consentAccepted: false,
            consentAcceptedAt: null,
            consentMethod: null,
            consentSignaturePath: null,
            consentSignerName: null,
            consentVersion: order.consent_version,
          }}
          onAccepted={() => fetchMyOrder(false)}
        />
      )}

      {/* Consult accepted consent anytime */}
      <ConsentModal
        open={showViewConsent}
        mode="view"
        blocking={false}
        orderId={order.id}
        data={{
          orderNumber: order.order_number,
          deviceLabel: `${order.device_brand} ${order.device_model}`,
          clientName: order.client_name,
          consentAccepted: Boolean(order.consent_accepted),
          consentAcceptedAt: order.consent_accepted_at,
          consentMethod: order.consent_method,
          consentSignaturePath: order.consent_signature_path,
          consentSignerName: order.consent_signer_name,
          consentVersion: order.consent_version,
        }}
        onClose={() => setShowViewConsent(false)}
      />

      <main
        className={`max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 ${
          needsConsent ? 'blur-sm pointer-events-none select-none' : ''
        }`}
      >
        {/* Top welcome & real-time sync banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-3 py-1 rounded-full text-xs font-bold font-mono bg-blue-50 text-[#2563EB] border border-blue-200">
                {order.order_number}
              </span>
              <StatusBadge status={order.status} />
            </div>
            <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {order.device_brand} {order.device_model}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Número de serie:{' '}
              <span className="font-mono font-semibold text-slate-700">
                {order.device_serial}
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-600">
              <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
              <span>Seguimiento en vivo</span>
              {lastSyncedAt && (
                <span className="text-slate-400 hidden sm:inline">
                  · {new Date(lastSyncedAt).toLocaleTimeString('es-ES')}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => fetchMyOrder(false)}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`}
              />
              Actualizar
            </button>
          </div>
        </div>

        {/* Visual 5-Step Progress Card + Certificate Action */}
        <section className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-[#2563EB]">
                Estado actual de tu ordenador
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 mt-0.5">
                Fase {statusInfo.step} de 5: {statusInfo.label}
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                {statusInfo.description}
              </p>
            </div>

            {certAvailable ? (
              <Link
                href={`/certificado/${order.id}`}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold text-white bg-[#10B981] hover:bg-emerald-600 shadow-md shadow-emerald-600/20 transition shrink-0"
              >
                <FileBadge2 className="w-5 h-5" />
                Ver Certificado Digital (PDF)
              </Link>
            ) : (
              <div className="inline-flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-slate-100 border border-slate-200 text-slate-500 text-xs sm:text-sm font-medium shrink-0">
                <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                <div>
                  <div className="font-semibold text-slate-700">
                    Certificado Digital bloqueado
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Se activará al llegar a &quot;Listo para entrega&quot;
                  </div>
                </div>
              </div>
            )}
          </div>

          <StatusStepper currentStatus={order.status} />

          {certAvailable && (order.final_diagnosis || order.solution_applied) && (
            <div className="rounded-2xl bg-emerald-50/70 border border-emerald-200 p-4 sm:p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  Diagnóstico Final
                </div>
                <p className="text-xs sm:text-sm text-slate-800 mt-1 leading-relaxed">
                  {order.final_diagnosis || 'Completado por laboratorio técnico.'}
                </p>
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1">
                  <Wrench className="w-3.5 h-3.5" />
                  Solución Aplicada
                </div>
                <p className="text-xs sm:text-sm text-slate-800 mt-1 leading-relaxed">
                  {order.solution_applied || 'Intervención finalizada con éxito.'}
                </p>
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Garantía Otorgada
                </div>
                <p className="text-xs sm:text-sm font-semibold text-emerald-900 mt-1">
                  {order.warranty_granted || 'Consultar en certificado oficial'}
                </p>
              </div>
            </div>
          )}
        </section>

        {/* Main 2-column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Equipment summary + Reception photo + Consent summary */}
          <div className="lg:col-span-5 space-y-6">
            <section className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Laptop className="w-5 h-5 text-[#2563EB]" />
                Datos del Equipo y Recepción
              </h2>

              <div className="rounded-xl bg-[#F8FAFC] border border-slate-200/80 p-3.5 space-y-2.5 text-sm">
                <div className="flex items-start gap-2.5">
                  <Clock className="w-4 h-4 text-[#2563EB] mt-0.5 shrink-0" />
                  <div>
                    <div className="text-[11px] uppercase font-semibold text-slate-400">
                      Fecha y hora exacta de entrega al técnico
                    </div>
                    <div className="font-mono font-semibold text-slate-900 text-xs sm:text-sm">
                      {formatDateTime(order.received_at)}
                    </div>
                  </div>
                </div>

                {order.completed_at && (
                  <div className="flex items-start gap-2.5 pt-2 border-t border-slate-200/70">
                    <CalendarCheck className="w-4 h-4 text-[#10B981] mt-0.5 shrink-0" />
                    <div>
                      <div className="text-[11px] uppercase font-semibold text-slate-400">
                        Finalización técnica
                      </div>
                      <div className="font-mono font-semibold text-emerald-700 text-xs sm:text-sm">
                        {formatDateTime(order.completed_at)}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl border border-slate-200 bg-white">
                  <div className="text-slate-400 font-semibold uppercase text-[10px]">
                    Marca / Modelo
                  </div>
                  <div className="font-semibold text-slate-900 mt-0.5">
                    {order.device_brand} {order.device_model}
                  </div>
                </div>
                <div className="p-3 rounded-xl border border-slate-200 bg-white">
                  <div className="text-slate-400 font-semibold uppercase text-[10px]">
                    Número de Serie
                  </div>
                  <div className="font-mono font-semibold text-slate-900 mt-0.5 truncate">
                    {order.device_serial}
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-blue-50/40 border border-blue-100 text-xs sm:text-sm">
                <div className="text-[11px] uppercase font-bold text-[#2563EB] mb-1">
                  Fallo reportado en ingreso
                </div>
                <p className="text-slate-700 leading-relaxed">
                  {order.reported_issue}
                </p>
              </div>

              {/* Original Reception Photo */}
              <div className="space-y-2 pt-1">
                <div className="text-xs font-bold uppercase tracking-wide text-slate-500 flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-[#2563EB]" />
                  Fotografía original de recepción
                </div>
                {order.initial_photo_path ? (
                  <button
                    type="button"
                    onClick={() =>
                      setLightbox({
                        src: order.initial_photo_path!,
                        title: `Recepción original · ${order.device_brand} ${order.device_model}`,
                        subtitle: `Entregado el ${formatDateTime(order.received_at)}`,
                      })
                    }
                    className="w-full rounded-2xl overflow-hidden border border-slate-200 bg-slate-950 group text-left"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={order.initial_photo_path}
                      alt="Foto original de recepción del equipo"
                      className="w-full h-48 object-cover group-hover:scale-[1.02] transition"
                    />
                    <div className="px-3 py-2 bg-[#F8FAFC] border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
                      <span>Clic para ampliar evidencia inicial</span>
                      <ZoomIn className="w-4 h-4 text-slate-400" />
                    </div>
                  </button>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">
                    Sin fotografía de recepción adjunta.
                  </div>
                )}
              </div>
            </section>

            {/* Accepted Consent Card */}
            {order.consent_accepted === 1 && (
              <section className="bg-white rounded-2xl border border-emerald-200 shadow-sm p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#10B981] flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Protección de Datos Aceptada
                      </h3>
                      <p className="text-xs text-slate-500">
                        {formatDateTime(order.consent_accepted_at)}
                      </p>
                    </div>
                  </div>
                  <CheckCircle2 className="w-5 h-5 text-[#10B981] shrink-0" />
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Consentimiento registrado vía{' '}
                  <strong>
                    {order.consent_method === 'PRESENCIAL'
                      ? 'firma presencial en recepción'
                      : 'portal web del cliente'}
                  </strong>
                  . Puedes consultar tu documento y firma en cualquier momento.
                </p>
                <button
                  type="button"
                  onClick={() => setShowViewConsent(true)}
                  className="w-full py-2 px-3 rounded-xl text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition"
                >
                  Consultar consentimiento y firma digital
                </button>
              </section>
            )}
          </div>

          {/* Right: Chronological Bitácora Feed */}
          <div className="lg:col-span-7 space-y-6">
            <section className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-[#2563EB]" />
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Bitácora de Avances del Técnico
                    </h2>
                    <p className="text-xs text-slate-500">
                      Comentarios cronológicos y fotografías de la revisión y
                      reparación.
                    </p>
                  </div>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                  {order.logs.length}{' '}
                  {order.logs.length === 1 ? 'registro' : 'registros'}
                </span>
              </div>

              {order.logs.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500">
                  Aún no hay comentarios publicados en la bitácora.
                </div>
              ) : (
                <div className="space-y-5">
                  {order.logs.map((log, idx) => (
                    <div
                      key={log.id}
                      className="relative pl-6 border-l-2 border-blue-200 pb-2"
                    >
                      <span
                        className={`w-3 h-3 rounded-full absolute -left-[7px] top-1 ring-4 ring-white ${
                          idx === 0 ? 'bg-[#10B981]' : 'bg-[#2563EB]'
                        }`}
                      />
                      <div className="rounded-2xl border border-slate-200/80 bg-[#F8FAFC] p-4 space-y-2.5">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                          <span className="font-bold text-slate-900">
                            {log.author_name}
                          </span>
                          <span className="font-mono text-slate-500">
                            {formatDateTime(log.created_at)}
                          </span>
                        </div>

                        <p className="text-sm text-slate-700 leading-relaxed">
                          {log.comment}
                        </p>

                        {log.photos && log.photos.length > 0 && (
                          <div className="pt-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {log.photos.map((photo) => (
                              <button
                                key={photo.id}
                                type="button"
                                onClick={() =>
                                  setLightbox({
                                    src: photo.file_path,
                                    title:
                                      photo.caption ||
                                      PHOTO_CATEGORY_LABELS[photo.category],
                                    subtitle: `${PHOTO_CATEGORY_LABELS[photo.category]} · ${formatDateTime(
                                      photo.created_at
                                    )}`,
                                  })
                                }
                                className="group rounded-xl overflow-hidden border border-slate-200 bg-slate-950 text-left shadow-sm"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={photo.file_path}
                                  alt={photo.caption || 'Foto de avance'}
                                  className="w-full h-40 object-cover group-hover:scale-[1.02] transition"
                                />
                                <div className="px-3 py-2 bg-white border-t border-slate-100 flex items-center justify-between gap-2">
                                  <span className="text-xs font-medium text-slate-700 truncate">
                                    {photo.caption ||
                                      PHOTO_CATEGORY_LABELS[photo.category]}
                                  </span>
                                  <ZoomIn className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </main>

      <ImageLightbox
        src={lightbox?.src || null}
        title={lightbox?.title}
        subtitle={lightbox?.subtitle}
        onClose={() => setLightbox(null)}
      />
    </div>
  );
}

