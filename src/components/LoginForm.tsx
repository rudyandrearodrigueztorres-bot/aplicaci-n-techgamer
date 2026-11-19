'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Cpu,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Wrench,
  FileCheck2,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';

export default function LoginForm({
  accessExpired = false,
}: {
  accessExpired?: boolean;
}) {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    accessExpired
      ? 'Tu acceso temporal expiró 2 días después de la entrega del equipo. Contacta con Tech Gamer si necesitas una copia de tu registro.'
      : null
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Error al iniciar sesión.');
        return;
      }
      router.push(json.redirectTo || '/');
      router.refresh();
    } catch {
      setError('Error de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* Left brand & value panel */}
        <div className="lg:col-span-5 bg-gradient-to-br from-[#1E3A8A] via-[#2563EB] to-blue-600 rounded-3xl p-8 text-white shadow-xl shadow-blue-900/10 flex flex-col justify-between">
          <div>
            <div className="inline-flex items-center gap-2.5 bg-white/15 backdrop-blur px-3.5 py-2 rounded-2xl border border-white/20">
              <Cpu className="w-5 h-5 text-white" />
              <span className="font-bold tracking-tight text-sm">
                Tech Gamer
              </span>
            </div>

            <h1 className="mt-6 text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight">
              Taller de Diagnóstico y Reparación de Ordenadores
            </h1>
            <p className="mt-3 text-sm text-blue-100 leading-relaxed">
              Seguimiento en tiempo real, cumplimiento legal de protección de
              datos con firma digital y emisión oficial de certificados
              verificables.
            </p>

            <div className="mt-8 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center shrink-0 mt-0.5">
                  <Wrench className="w-4 h-4 text-emerald-300" />
                </div>
                <div>
                  <div className="text-sm font-semibold">
                    Trazabilidad en 5 fases
                  </div>
                  <div className="text-xs text-blue-100/90 mt-0.5">
                    Bitácora técnica con fecha/hora exacta y evidencias
                    fotográficas del proceso.
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center shrink-0 mt-0.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-300" />
                </div>
                <div>
                  <div className="text-sm font-semibold">
                    Cumplimiento RGPD y Firma Digital
                  </div>
                  <div className="text-xs text-blue-100/90 mt-0.5">
                    Consentimiento presencial en mostrador o aceptación
                    obligatoria en primer acceso.
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center shrink-0 mt-0.5">
                  <FileCheck2 className="w-4 h-4 text-emerald-300" />
                </div>
                <div>
                  <div className="text-sm font-semibold">
                    Certificado Digital Imprimible (PDF)
                  </div>
                  <div className="text-xs text-blue-100/90 mt-0.5">
                    Diagnóstico final, solución aplicada, galería de evidencias
                    y sello de verificación.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-5 border-t border-white/15 flex items-center justify-between text-xs text-blue-100">
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
              Acceso seguro cifrado
            </span>
            <span>Tech Gamer</span>
          </div>
        </div>

        {/* Right login panel */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/90 shadow-lg shadow-slate-200/50 p-6 sm:p-10 flex flex-col justify-center">
          <div className="max-w-md w-full mx-auto">
            <div className="mb-7">
              <h2 className="text-2xl font-bold text-slate-900">
                Iniciar sesión
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Introduce tus credenciales de acceso. Te redirigiremos
                automáticamente al panel correspondiente según tu rol.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="username"
                  className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-1.5"
                >
                  Usuario
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="username"
                    type="text"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Ingresa tu usuario"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 outline-none transition"
                    required
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-1.5"
                >
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Introduce tu contraseña"
                    className="w-full pl-10 pr-11 py-3 rounded-xl border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 outline-none transition"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    aria-label="Mostrar u ocultar contraseña"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-xs sm:text-sm font-medium text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-white bg-[#2563EB] hover:bg-blue-700 disabled:opacity-60 shadow-sm shadow-blue-600/25 transition"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Verificando credenciales...
                  </>
                ) : (
                  <>
                    Entrar al panel
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <p className="mt-6 text-xs text-center text-slate-400 leading-relaxed">
              Si eres cliente y dejaste un equipo en taller, utiliza el usuario
              y la contraseña temporal proporcionados en tu comprobante de
              recepción.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
