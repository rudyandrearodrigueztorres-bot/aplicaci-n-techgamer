'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  User,
  Laptop,
  Camera,
  ShieldCheck,
  Wand2,
  Clock,
  Upload,
  CheckCircle2,
  Copy,
  Check,
  AlertCircle,
  Loader2,
  ArrowRight,
  KeyRound,
  Trash2,
} from 'lucide-react';
import AppHeader from './AppHeader';
import SignatureCanvas from './SignatureCanvas';
import { CONSENT_SECTIONS, formatDateTime } from '@/lib/constants';

function slugifyName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .join('.');
}

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let out = 'TC-';
  for (let i = 0; i < 6; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

interface CreatedResult {
  orderId: number;
  orderNumber: string;
  username: string;
  password: string;
  clientName: string;
  consentAccepted: boolean;
}

export default function NewOrderForm({
  technicianName,
}: {
  technicianName: string;
}) {
  const [liveTime, setLiveTime] = useState<string>(new Date().toISOString());

  // Client fields
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientUsername, setClientUsername] = useState('');
  const [clientPassword, setClientPassword] = useState(() =>
    generateTempPassword()
  );
  const [usernameManuallyEdited, setUsernameManuallyEdited] = useState(false);

  // Device fields
  const [deviceBrand, setDeviceBrand] = useState('');
  const [deviceModel, setDeviceModel] = useState('');
  const [deviceSerial, setDeviceSerial] = useState('');
  const [reportedIssue, setReportedIssue] = useState('');

  // Initial photo
  const [initialPhoto, setInitialPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Consent
  const [consentMode, setConsentMode] = useState<'PRESENCIAL' | 'PENDIENTE_PORTAL'>('PRESENCIAL');
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);

  // Submit state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedResult | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setLiveTime(new Date().toISOString()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!usernameManuallyEdited && clientName.trim()) {
      const base = slugifyName(clientName);
      if (base) {
        const suffix = String(Math.floor(10 + Math.random() * 89));
        setClientUsername(`${base}.${suffix}`);
      }
    }
  }, [clientName, usernameManuallyEdited]);

  const regenerateCredentials = () => {
    const base = slugifyName(clientName) || 'cliente';
    const suffix = String(Math.floor(100 + Math.random() * 899));
    setClientUsername(`${base}.${suffix}`);
    setUsernameManuallyEdited(false);
    setClientPassword(generateTempPassword());
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setInitialPhoto(file);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    if (file) {
      setPhotoPreview(URL.createObjectURL(file));
    } else {
      setPhotoPreview(null);
    }
  };

  const removePhoto = () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setInitialPhoto(null);
    setPhotoPreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (consentMode === 'PRESENCIAL') {
      if (!consentAccepted) {
        setError(
          'Debes marcar la casilla obligatoria de aceptación de Protección de Datos y Condiciones del Servicio.'
        );
        return;
      }
      if (!signatureDataUrl) {
        setError(
          'El cliente debe plasmar su firma digital en el recuadro de firma antes de finalizar el ingreso presencial.'
        );
        return;
      }
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('clientName', clientName.trim());
      formData.append('clientPhone', clientPhone.trim());
      formData.append('clientEmail', clientEmail.trim());
      formData.append('clientUsername', clientUsername.trim());
      formData.append('clientPassword', clientPassword.trim());
      formData.append('deviceBrand', deviceBrand.trim());
      formData.append('deviceModel', deviceModel.trim());
      formData.append('deviceSerial', deviceSerial.trim());
      formData.append('reportedIssue', reportedIssue.trim());
      formData.append('consentMode', consentMode);
      formData.append('consentAccepted', String(consentAccepted));
      if (signatureDataUrl) {
        formData.append('consentSignature', signatureDataUrl);
      }
      if (initialPhoto) {
        formData.append('initialPhoto', initialPhoto);
      }

      const res = await fetch('/api/orders', {
        method: 'POST',
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'No se pudo crear la orden.');
        return;
      }

      setCreated({
        orderId: json.order.id,
        orderNumber: json.order.order_number,
        username: json.credentials.username,
        password: json.credentials.password,
        clientName: json.order.client_name,
        consentAccepted: Boolean(json.order.consent_accepted),
      });
    } catch {
      setError('Error de conexión al guardar la orden.');
    } finally {
      setSubmitting(false);
    }
  };

  const copyCredentials = async () => {
    if (!created) return;
    const portalUrl =
      typeof window !== 'undefined' ? window.location.origin : '';
    const text = `Tech Gamer - Seguimiento de Reparación\nOrden: ${created.orderNumber}\nUsuario: ${created.username}\nContraseña temporal: ${created.password}\nAcceso: ${portalUrl}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (created) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <AppHeader
          userName={technicianName}
          role="TECHNICIAN"
          homeHref="/tecnico"
        />
        <main className="max-w-2xl mx-auto px-4 py-12">
          <div className="bg-white rounded-3xl border border-emerald-200 shadow-lg p-8 text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-[#10B981] mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div>
              <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
                {created.orderNumber}
              </span>
              <h1 className="mt-3 text-2xl font-bold text-slate-900">
                Equipo ingresado correctamente
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Entrega estas credenciales de acceso a{' '}
                <strong className="text-slate-800">{created.clientName}</strong>{' '}
                para que consulte el avance en tiempo real.
              </p>
            </div>

            <div className="rounded-2xl bg-[#F8FAFC] border border-slate-200 p-5 text-left space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-[#2563EB]" />
                  Credenciales del Portal Cliente
                </span>
                <button
                  type="button"
                  onClick={copyCredentials}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold text-[#2563EB] bg-blue-50 hover:bg-blue-100 transition"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#10B981]" />
                      Copiado
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copiar acceso
                    </>
                  )}
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-white rounded-xl border border-slate-200 p-3">
                  <div className="text-[11px] text-slate-400 font-semibold uppercase">
                    Usuario
                  </div>
                  <div className="font-mono text-base font-bold text-slate-900 mt-0.5">
                    {created.username}
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-3">
                  <div className="text-[11px] text-slate-400 font-semibold uppercase">
                    Contraseña temporal
                  </div>
                  <div className="font-mono text-base font-bold text-[#2563EB] mt-0.5">
                    {created.password}
                  </div>
                </div>
              </div>
              <div className="text-xs text-slate-600 pt-1">
                Estado de consentimiento RGPD:{' '}
                {created.consentAccepted ? (
                  <strong className="text-[#10B981]">
                    Firmado presencialmente en recepción
                  </strong>
                ) : (
                  <strong className="text-amber-600">
                    Pendiente — se solicitará obligatoriamente en el primer
                    inicio de sesión del cliente
                  </strong>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link
                href="/tecnico"
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition"
              >
                Volver al listado
              </Link>
              <Link
                href={`/tecnico/ordenes/${created.orderId}`}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#2563EB] hover:bg-blue-700 shadow-sm transition"
              >
                Abrir ficha de orden
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-16">
      <AppHeader
        userName={technicianName}
        role="TECHNICIAN"
        homeHref="/tecnico"
      />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Top nav & live reception clock */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <Link
              href="/tecnico"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#2563EB] mb-2 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Volver al panel del taller
            </Link>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Formulario de Ingreso (Check-in)
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Registra el equipo, evidencia fotográfica inicial y aceptación de
              protección de datos.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 shadow-sm text-xs">
            <Clock className="w-4 h-4 text-[#2563EB]" />
            <div>
              <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                Registro automático de entrega
              </div>
              <div className="font-mono font-semibold text-slate-800">
                {formatDateTime(liveTime)}
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 1. Client & Credentials */}
          <section className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-5">
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    1. Datos del Cliente y Acceso al Portal
                  </h2>
                  <p className="text-xs text-slate-500">
                    Persona que entrega el equipo y credenciales exclusivas para
                    seguimiento.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={regenerateCredentials}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#2563EB] bg-blue-50 hover:bg-blue-100 transition"
              >
                <Wand2 className="w-3.5 h-3.5" />
                Regenerar acceso
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nombre completo de quien entrega el equipo *
                </label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Ej. Marta Sánchez Delgado"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Teléfono de contacto *
                </label>
                <input
                  type="tel"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="+34 600 000 000"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Correo electrónico *
                </label>
                <input
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="cliente@correo.es"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Usuario del cliente (auto / manual) *
                </label>
                <input
                  type="text"
                  value={clientUsername}
                  onChange={(e) => {
                    setClientUsername(e.target.value);
                    setUsernameManuallyEdited(true);
                  }}
                  placeholder="marta.sanchez.42"
                  className="w-full rounded-xl border border-slate-300 bg-[#F8FAFC] px-3.5 py-2.5 text-sm font-mono text-slate-900 focus:bg-white focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Contraseña temporal (auto / manual) *
                </label>
                <input
                  type="text"
                  value={clientPassword}
                  onChange={(e) => setClientPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-[#F8FAFC] px-3.5 py-2.5 text-sm font-mono text-[#2563EB] font-semibold focus:bg-white focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 outline-none"
                  required
                />
              </div>
            </div>
          </section>

          {/* 2. Computer Details */}
          <section className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-5">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center">
                <Laptop className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  2. Datos del Ordenador y Fallo Reportado
                </h2>
                <p className="text-xs text-slate-500">
                  Identificación exacta de hardware y síntomas declarados en
                  recepción.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Marca *
                </label>
                <input
                  type="text"
                  value={deviceBrand}
                  onChange={(e) => setDeviceBrand(e.target.value)}
                  placeholder="Ej. Apple, Lenovo, HP, Dell..."
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Modelo *
                </label>
                <input
                  type="text"
                  value={deviceModel}
                  onChange={(e) => setDeviceModel(e.target.value)}
                  placeholder="Ej. MacBook Air M3 / ThinkPad T14"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Número de Serie (S/N) *
                </label>
                <input
                  type="text"
                  value={deviceSerial}
                  onChange={(e) => setDeviceSerial(e.target.value)}
                  placeholder="Ej. C02X94KMD6R"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-mono text-slate-900 focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 outline-none"
                  required
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Fallo reportado y observaciones físicas *
                </label>
                <textarea
                  rows={3}
                  value={reportedIssue}
                  onChange={(e) => setReportedIssue(e.target.value)}
                  placeholder="Describe el problema indicado por el cliente, accesorios entregados (cargador, funda) y estado estético inicial..."
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 outline-none"
                  required
                />
              </div>
            </div>
          </section>

          {/* 3. Initial Reception Photo */}
          <section className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center">
                <Camera className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  3. Fotografía de Entrega Inicial
                </h2>
                <p className="text-xs text-slate-500">
                  Evidencia física de cómo entra el ordenador al taller
                  (almacenada localmente en /public/uploads).
                </p>
              </div>
            </div>

            {photoPreview ? (
              <div className="relative rounded-2xl border border-slate-200 overflow-hidden bg-slate-950">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoPreview}
                  alt="Vista previa de recepción"
                  className="w-full max-h-72 object-contain mx-auto"
                />
                <button
                  type="button"
                  onClick={removePhoto}
                  className="absolute top-3 right-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-600 text-white hover:bg-red-700 shadow"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Quitar foto
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-2xl p-8 bg-[#F8FAFC] hover:border-[#2563EB] hover:bg-blue-50/30 cursor-pointer transition">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#2563EB] flex items-center justify-center mb-3">
                  <Upload className="w-6 h-6" />
                </div>
                <span className="text-sm font-semibold text-slate-800">
                  Haz clic para subir la fotografía de recepción
                </span>
                <span className="text-xs text-slate-500 mt-1">
                  Formatos PNG, JPG o WEBP
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
              </label>
            )}
          </section>

          {/* 4. Data Acceptance & Consent */}
          <section className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-5">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#10B981] flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  4. Aceptación de Datos y Consentimiento en Recepción
                </h2>
                <p className="text-xs text-slate-500">
                  Política de Privacidad (RGPD), autorización de manipulación y
                  responsabilidad sobre copias de seguridad.
                </p>
              </div>
            </div>

            {/* Mode selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setConsentMode('PRESENCIAL')}
                className={`p-4 rounded-xl border-2 text-left transition ${
                  consentMode === 'PRESENCIAL'
                    ? 'border-[#2563EB] bg-blue-50/50'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="text-sm font-bold text-slate-900">
                  Firma presencial en mostrador
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  El cliente acepta y firma digitalmente ahora mismo en pantalla.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setConsentMode('PENDIENTE_PORTAL')}
                className={`p-4 rounded-xl border-2 text-left transition ${
                  consentMode === 'PENDIENTE_PORTAL'
                    ? 'border-amber-500 bg-amber-50/50'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="text-sm font-bold text-slate-900">
                  Diferir al primer acceso del cliente
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Entrega por mensajería o tercero: el portal exigirá aceptación
                  obligatoria al iniciar sesión.
                </p>
              </button>
            </div>

            {consentMode === 'PRESENCIAL' ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-slate-200 bg-[#F8FAFC] p-4 space-y-3 max-h-52 overflow-y-auto">
                  {CONSENT_SECTIONS.map((sec) => (
                    <div key={sec.title}>
                      <h3 className="text-xs font-bold text-slate-800">
                        {sec.title}
                      </h3>
                      <p className="text-xs text-slate-600 leading-relaxed mt-0.5">
                        {sec.content}
                      </p>
                    </div>
                  ))}
                </div>

                <label className="flex items-start gap-3 p-4 rounded-xl border border-blue-200 bg-blue-50/40 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consentAccepted}
                    onChange={(e) => setConsentAccepted(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB]"
                  />
                  <span className="text-xs sm:text-sm text-slate-800 leading-snug">
                    <strong>Casilla obligatoria:</strong> El cliente ha leído y
                    acepta la Política de Privacidad, el tratamiento de sus
                    datos personales y las condiciones del servicio técnico
                    (autorización de manipulación/diagnóstico y responsabilidad
                    sobre copias de seguridad).
                  </span>
                </label>

                <SignatureCanvas
                  onChange={setSignatureDataUrl}
                  disabled={submitting}
                  label="Firma digital del cliente en recepción *"
                />
              </div>
            ) : (
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-xs sm:text-sm text-amber-900">
                La orden se creará con el indicador visual{' '}
                <strong>Pendiente firma</strong>. Al iniciar sesión por primera
                vez con sus credenciales, el cliente deberá revisar y firmar
                obligatoriamente el aviso de Protección de Datos y Condiciones
                del Servicio antes de acceder al panel de seguimiento.
              </div>
            )}
          </section>

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm font-medium text-red-700 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-end gap-3">
            <Link
              href="/tecnico"
              className="w-full sm:w-auto text-center px-5 py-3 rounded-xl text-sm font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white bg-[#2563EB] hover:bg-blue-700 disabled:opacity-60 shadow-sm shadow-blue-600/25 transition"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Registrando orden...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Guardar Ingreso y Generar Acceso
                </>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

