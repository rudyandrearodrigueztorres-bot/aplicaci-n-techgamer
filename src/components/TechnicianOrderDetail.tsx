'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Laptop,
  User,
  Phone,
  Mail,
  Clock,
  ShieldCheck,
  ShieldAlert,
  FileBadge2,
  Camera,
  Send,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ImagePlus,
  X,
  KeyRound,
  ZoomIn,
  Wrench,
  Trash2,
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
  isCertificateAvailable,
  type OrderStatus,
  type PhotoCategory,
} from '@/lib/constants';

const WARRANTY_PRESETS = [
  '3 meses en mano de obra y repuesto',
  '6 meses en repuesto y mano de obra especializada',
  '12 meses en componente sustituido y soporte técnico',
];

export default function TechnicianOrderDetail({
  orderId,
  technicianName,
}: {
  orderId: number;
  technicianName: string;
}) {
  const router = useRouter();
  const [order, setOrder] = useState<OrderWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Status & Certificate state
  const [savingStatus, setSavingStatus] = useState(false);
  const [finalDiagnosis, setFinalDiagnosis] = useState('');
  const [solutionApplied, setSolutionApplied] = useState('');
  const [warrantyGranted, setWarrantyGranted] = useState('');
  const [savingCert, setSavingCert] = useState(false);

  // Bitácora + multi-photo upload
  const [logComment, setLogComment] = useState('');
  const [photoCategory, setPhotoCategory] = useState<PhotoCategory>('DIAGNOSTICO');
  const [photoCaption, setPhotoCaption] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
  const [submittingLog, setSubmittingLog] = useState(false);

  // Modals
  const [consentModalMode, setConsentModalMode] = useState<'view' | 'sign' | null>(null);
  const [lightbox, setLightbox] = useState<{
    src: string;
    title?: string;
    subtitle?: string;
  } | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  };

  const fetchOrder = useCallback(async () => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, { cache: 'no-store' });
      if (!res.ok) {
        setError('No se pudo cargar la orden solicitada.');
        return;
      }
      const json = await res.json();
      const data: OrderWithDetails = json.order;
      setOrder(data);
      setFinalDiagnosis(data.final_diagnosis || '');
      setSolutionApplied(data.solution_applied || '');
      setWarrantyGranted(data.warranty_granted || '');
    } catch {
      setError('Error de red al obtener los detalles de la orden.');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const handleStatusChange = async (newStatus: OrderStatus) => {
    if (!order || newStatus === order.status) return;
    setSavingStatus(true);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const json = await res.json();
        setOrder(json.order);
        showToast('Estado de la orden actualizado correctamente.');
      }
    } finally {
      setSavingStatus(false);
    }
  };

  const handleSaveCertificate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCert(true);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          final_diagnosis: finalDiagnosis,
          solution_applied: solutionApplied,
          warranty_granted: warrantyGranted,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        setOrder(json.order);
        showToast('Datos del Certificado Digital guardados.');
      }
    } finally {
      setSavingCert(false);
    }
  };

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const incoming = Array.from(e.target.files || []);
    if (incoming.length === 0) return;
    const nextFiles = [...selectedFiles, ...incoming];
    const nextPreviews = [
      ...filePreviews,
      ...incoming.map((f) => URL.createObjectURL(f)),
    ];
    setSelectedFiles(nextFiles);
    setFilePreviews(nextPreviews);
    e.target.value = '';
  };

  const removeSelectedFile = (idx: number) => {
    URL.revokeObjectURL(filePreviews[idx]);
    setSelectedFiles((prev) => prev.filter((_, i) => i !== idx));
    setFilePreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleAddLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logComment.trim() && selectedFiles.length === 0) return;

    setSubmittingLog(true);
    try {
      const formData = new FormData();
      formData.append('comment', logComment.trim());
      formData.append('category', photoCategory);
      if (photoCaption.trim()) {
        formData.append('caption', photoCaption.trim());
      }
      for (const file of selectedFiles) {
        formData.append('photos', file);
      }

      const res = await fetch(`/api/orders/${orderId}/logs`, {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const json = await res.json();
        setOrder(json.order);
        setLogComment('');
        setPhotoCaption('');
        filePreviews.forEach((url) => URL.revokeObjectURL(url));
        setSelectedFiles([]);
        setFilePreviews([]);
        showToast('Avance registrado en la bitácora del equipo.');
      }
    } finally {
      setSubmittingLog(false);
    }
  };

  const handleDeleteOrder = async () => {
    if (!order) return;
    const confirmed = window.confirm(
      `¿Seguro que deseas eliminar la orden ${order.order_number} (${order.client_name})? Esta acción no se puede deshacer.`
    );
    if (!confirmed) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        router.push('/tecnico');
        router.refresh();
      }
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <AppHeader
          userName={technicianName}
          role="TECHNICIAN"
          homeHref="/tecnico"
        />
        <div className="max-w-7xl mx-auto p-12 text-center text-sm text-slate-500">
          Cargando ficha técnica de la orden...
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <AppHeader
          userName={technicianName}
          role="TECHNICIAN"
          homeHref="/tecnico"
        />
        <div className="max-w-xl mx-auto p-12 text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
          <p className="text-sm font-semibold text-slate-800">
            {error || 'Orden no encontrada'}
          </p>
          <Link
            href="/tecnico"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2563EB] text-white text-sm font-semibold"
          >
            Volver al listado
          </Link>
        </div>
      </div>
    );
  }

  const certAvailable = isCertificateAvailable(order.status);

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-16">
      <AppHeader
        userName={technicianName}
        role="TECHNICIAN"
        homeHref="/tecnico"
        rightSlot={
          <div className="flex items-center gap-2">
            <Link
              href={`/certificado/${order.id}`}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition ${
                certAvailable
                  ? 'bg-[#10B981] text-white hover:bg-emerald-600 shadow-sm shadow-emerald-600/20'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <FileBadge2 className="w-4 h-4" />
              <span>Ver Certificado</span>
            </Link>
            <button
              type="button"
              onClick={handleDeleteOrder}
              disabled={deleting}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 disabled:opacity-50 transition"
              title="Eliminar orden"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Eliminar</span>
            </button>
          </div>
        }
      />

      {toast && (
        <div className="fixed bottom-5 right-5 z-40 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 text-sm font-medium border border-slate-700">
          <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
          {toast}
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7 space-y-6">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <Link
              href="/tecnico"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#2563EB] mb-2 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Volver a todas las órdenes
            </Link>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-extrabold text-slate-900 font-mono">
                {order.order_number}
              </h1>
              <StatusBadge status={order.status} />
              {order.consent_accepted ? (
                <button
                  type="button"
                  onClick={() => setConsentModalMode('view')}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
                  RGPD Aceptado (ver firma)
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setConsentModalMode('sign')}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                  Consentimiento pendiente (firmar ahora)
                </button>
              )}
            </div>
            <p className="text-sm text-slate-600 mt-1">
              <strong>
                {order.device_brand} {order.device_model}
              </strong>{' '}
              · S/N <span className="font-mono">{order.device_serial}</span> ·
              Cliente: <strong>{order.client_name}</strong>
            </p>
          </div>
        </div>

        {/* Interactive 5-step Status Line */}
        <section className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                Línea de Avance del Taller (clic en cualquier fase para actualizar)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                El cliente ve el progreso en tiempo real. El Certificado Digital
                se habilita para el cliente a partir de{' '}
                <strong className="text-emerald-700">4. Listo para entrega</strong>.
              </p>
            </div>
            {savingStatus && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2563EB]">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Actualizando estado...
              </span>
            )}
          </div>

          <StatusStepper
            currentStatus={order.status}
            interactive
            disabled={savingStatus}
            onSelectStatus={handleStatusChange}
          />
        </section>

        {/* Main 2-column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left column (7 cols): Bitácora Form + Chronological Log & Photos */}
          <div className="lg:col-span-7 space-y-6">
            {/* Add Bitácora Comment + Multiple Photos */}
            <section className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-4">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center">
                  <Wrench className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Bitácora Técnica y Evidencias Fotográficas
                  </h2>
                  <p className="text-xs text-slate-500">
                    Registra comentarios con fecha/hora automática y sube
                    múltiples imágenes del diagnóstico o reparación.
                  </p>
                </div>
              </div>

              <form onSubmit={handleAddLog} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Comentario técnico / actualización de progreso
                  </label>
                  <textarea
                    rows={3}
                    value={logComment}
                    onChange={(e) => setLogComment(e.target.value)}
                    placeholder='Ej. "Se detecta fallo en disco SSD, se procede a reemplazo y pruebas de lectura/escritura."'
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Categoría de fotos adjuntas
                    </label>
                    <select
                      value={photoCategory}
                      onChange={(e) =>
                        setPhotoCategory(e.target.value as PhotoCategory)
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm text-slate-800 focus:border-[#2563EB] outline-none"
                    >
                      <option value="DIAGNOSTICO">Diagnóstico técnico</option>
                      <option value="REPARACION">Proceso de reparación</option>
                      <option value="PRUEBAS">Pruebas de estrés / verificación</option>
                      <option value="PROCESO">Evidencia general</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Pie de foto opcional
                    </label>
                    <input
                      type="text"
                      value={photoCaption}
                      onChange={(e) => setPhotoCaption(e.target.value)}
                      placeholder="Ej. Placa base inspeccionada bajo microscopio"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs sm:text-sm text-slate-900 focus:border-[#2563EB] outline-none"
                    />
                  </div>
                </div>

                {/* Multi-file uploader */}
                <div className="space-y-3">
                  <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed border-slate-300 bg-[#F8FAFC] hover:border-[#2563EB] hover:bg-blue-50/40 text-xs font-semibold text-slate-700 cursor-pointer transition">
                    <ImagePlus className="w-4 h-4 text-[#2563EB]" />
                    Adjuntar una o varias fotos del proceso
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFilesSelected}
                      className="hidden"
                    />
                  </label>

                  {filePreviews.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {filePreviews.map((src, idx) => (
                        <div
                          key={src}
                          className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-900 aspect-video"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={src}
                            alt={`Adjunto ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removeSelectedFile(idx)}
                            className="absolute top-1.5 right-1.5 p-1 rounded-full bg-slate-950/80 text-white hover:bg-red-600 transition"
                            aria-label="Quitar imagen"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={
                      submittingLog ||
                      (!logComment.trim() && selectedFiles.length === 0)
                    }
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#2563EB] hover:bg-blue-700 disabled:opacity-50 shadow-sm transition"
                  >
                    {submittingLog ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Guardando avance...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Publicar en Bitácora
                      </>
                    )}
                  </button>
                </div>
              </form>
            </section>

            {/* Chronological Feed */}
            <section className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-base font-bold text-slate-900">
                  Historial de Bitácora ({order.logs.length})
                </h2>
                <span className="text-xs text-slate-500">
                  Más reciente primero
                </span>
              </div>

              <div className="space-y-4">
                {order.logs.map((log) => (
                  <div
                    key={log.id}
                    className="relative pl-5 border-l-2 border-blue-200 pb-1"
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB] absolute -left-[6px] top-1.5 ring-4 ring-white" />
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="font-bold text-slate-800">
                        {log.author_name}
                      </span>
                      <span className="text-slate-500 font-mono">
                        {formatDateTime(log.created_at)}
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm text-slate-700 leading-relaxed">
                      {log.comment}
                    </p>

                    {log.photos && log.photos.length > 0 && (
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
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
                                subtitle: formatDateTime(photo.created_at),
                              })
                            }
                            className="group relative rounded-xl overflow-hidden border border-slate-200 bg-slate-950 text-left"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={photo.file_path}
                              alt={photo.caption || 'Evidencia'}
                              className="w-full h-36 object-cover group-hover:scale-[1.02] transition"
                            />
                            <div className="px-2.5 py-1.5 bg-white border-t border-slate-100 flex items-center justify-between gap-2">
                              <span className="text-[11px] font-medium text-slate-700 truncate">
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
                ))}
              </div>
            </section>
          </div>

          {/* Right column (5 cols): Certificate Fields + Order Info + Initial Photo + Consent */}
          <div className="lg:col-span-5 space-y-6">
            {/* Digital Certificate Form */}
            <section className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#10B981] flex items-center justify-center">
                    <FileBadge2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Datos del Certificado Digital
                    </h2>
                    <p className="text-xs text-slate-500">
                      Código: <span className="font-mono">{order.certificate_code}</span>
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSaveCertificate} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Diagnóstico técnico final
                  </label>
                  <textarea
                    rows={3}
                    value={finalDiagnosis}
                    onChange={(e) => setFinalDiagnosis(e.target.value)}
                    placeholder="Resume la causa raíz confirmada en laboratorio..."
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Solución aplicada y pruebas realizadas
                  </label>
                  <textarea
                    rows={3}
                    value={solutionApplied}
                    onChange={(e) => setSolutionApplied(e.target.value)}
                    placeholder="Detalle de piezas sustituidas, mantenimiento y tests de estabilidad..."
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Garantía otorgada
                  </label>
                  <input
                    type="text"
                    value={warrantyGranted}
                    onChange={(e) => setWarrantyGranted(e.target.value)}
                    placeholder="Ej. 6 meses en repuesto y mano de obra"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 outline-none"
                  />
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {WARRANTY_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setWarrantyGranted(preset)}
                        className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-[#2563EB] transition"
                      >
                        {preset.split(' ').slice(0, 2).join(' ')}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={savingCert}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#2563EB] hover:bg-blue-700 disabled:opacity-60 transition"
                  >
                    {savingCert ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Guardar Certificado
                  </button>
                  <Link
                    href={`/certificado/${order.id}`}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition"
                  >
                    <FileBadge2 className="w-4 h-4" />
                    Previsualizar PDF
                  </Link>
                </div>
              </form>
            </section>

            {/* Equipment, Reception Photo & Client Credentials */}
            <section className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Laptop className="w-4 h-4 text-[#2563EB]" />
                Ficha de Recepción y Cliente
              </h2>

              {order.initial_photo_path && (
                <button
                  type="button"
                  onClick={() =>
                    setLightbox({
                      src: order.initial_photo_path!,
                      title: 'Fotografía de entrega inicial',
                      subtitle: `Recibido: ${formatDateTime(order.received_at)}`,
                    })
                  }
                  className="w-full rounded-xl overflow-hidden border border-slate-200 bg-slate-950 group text-left"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={order.initial_photo_path}
                    alt="Foto inicial de recepción"
                    className="w-full h-44 object-cover group-hover:scale-[1.02] transition"
                  />
                  <div className="px-3 py-2 bg-[#F8FAFC] border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
                    <span className="inline-flex items-center gap-1.5 font-medium">
                      <Camera className="w-3.5 h-3.5 text-[#2563EB]" />
                      Foto inicial de recepción
                    </span>
                    <ZoomIn className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </button>
              )}

              <div className="space-y-2.5 text-xs sm:text-sm">
                <div className="p-3 rounded-xl bg-[#F8FAFC] border border-slate-200/80">
                  <div className="text-[11px] font-semibold uppercase text-slate-400">
                    Fallo reportado inicialmente
                  </div>
                  <p className="text-slate-800 mt-1 leading-relaxed">
                    {order.reported_issue}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-2 pt-1 text-xs">
                  <div className="flex items-center gap-2 text-slate-700">
                    <User className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="font-semibold">{order.client_name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>{order.client_phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>{order.client_email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>
                      Entrega al técnico:{' '}
                      <strong>{formatDateTime(order.received_at)}</strong>
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-200/70 space-y-1 text-xs">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-[#2563EB]" />
                    Acceso del cliente al portal
                  </div>
                  <div className="font-mono text-slate-700">
                    Usuario: <strong>{order.client_username}</strong>
                    {order.client_temp_password && (
                      <>
                        {' '}
                        · Clave: <strong>{order.client_temp_password}</strong>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>

      <ConsentModal
        open={consentModalMode !== null}
        mode={consentModalMode || 'view'}
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
        onClose={() => setConsentModalMode(null)}
        onAccepted={() => {
          setConsentModalMode(null);
          fetchOrder();
          showToast('Consentimiento RGPD registrado correctamente.');
        }}
      />

      <ImageLightbox
        src={lightbox?.src || null}
        title={lightbox?.title}
        subtitle={lightbox?.subtitle}
        onClose={() => setLightbox(null)}
      />
    </div>
  );
}

