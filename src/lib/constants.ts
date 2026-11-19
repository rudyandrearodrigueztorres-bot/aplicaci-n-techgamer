export type OrderStatus =
  | 'EN_DIAGNOSTICO'
  | 'DIAGNOSTICADO'
  | 'EN_REPARACION'
  | 'LISTO_PARA_ENTREGA'
  | 'ENTREGADO';

export type PhotoCategory =
  | 'RECEPCION'
  | 'DIAGNOSTICO'
  | 'REPARACION'
  | 'PRUEBAS'
  | 'PROCESO';

export type ConsentMethod = 'PRESENCIAL' | 'PORTAL_CLIENTE';

export interface StatusStep {
  key: OrderStatus;
  step: number;
  label: string;
  shortLabel: string;
  description: string;
}

export const ORDER_STATUS_STEPS: StatusStep[] = [
  {
    key: 'EN_DIAGNOSTICO',
    step: 1,
    label: 'En diagnóstico',
    shortLabel: 'Diagnóstico',
    description: 'El equipo está siendo inspeccionado y sometido a pruebas técnicas iniciales.',
  },
  {
    key: 'DIAGNOSTICADO',
    step: 2,
    label: 'Diagnosticado',
    shortLabel: 'Diagnosticado',
    description: 'Se ha identificado la causa raíz del fallo y definido el plan de reparación.',
  },
  {
    key: 'EN_REPARACION',
    step: 3,
    label: 'En reparación',
    shortLabel: 'Reparación',
    description: 'El equipo se encuentra en intervención técnica, sustitución de componentes o pruebas de estrés.',
  },
  {
    key: 'LISTO_PARA_ENTREGA',
    step: 4,
    label: 'Listo para entrega',
    shortLabel: 'Listo',
    description: 'Reparación finalizada con éxito. Certificado digital disponible para descarga.',
  },
  {
    key: 'ENTREGADO',
    step: 5,
    label: 'Entregado',
    shortLabel: 'Entregado',
    description: 'Equipo entregado al cliente con certificado digital emitido.',
  },
];

export function getStatusIndex(status: OrderStatus): number {
  const idx = ORDER_STATUS_STEPS.findIndex((s) => s.key === status);
  return idx === -1 ? 0 : idx;
}

export function getStatusInfo(status: OrderStatus): StatusStep {
  return ORDER_STATUS_STEPS[getStatusIndex(status)];
}

export function isCertificateAvailable(status: OrderStatus): boolean {
  return status === 'LISTO_PARA_ENTREGA' || status === 'ENTREGADO';
}

export const PHOTO_CATEGORY_LABELS: Record<PhotoCategory, string> = {
  RECEPCION: 'Recepción inicial',
  DIAGNOSTICO: 'Diagnóstico técnico',
  REPARACION: 'Proceso de reparación',
  PRUEBAS: 'Pruebas y verificación',
  PROCESO: 'Evidencia general',
};

export const CONSENT_VERSION = 'v2.1-RGPD-2026';
export const RETENTION_MONTHS = 2;
export const CLIENT_ACCESS_DAYS_AFTER_DELIVERY = 2;

export function calculateExpiresAt(fromIso: string): string {
  const date = new Date(fromIso);
  date.setMonth(date.getMonth() + RETENTION_MONTHS);
  return date.toISOString();
}

export function calculateClientAccessExpiresAt(
  deliveredAtIso: string | null | undefined
): string | null {
  if (!deliveredAtIso) return null;
  const deliveredMs = new Date(deliveredAtIso).getTime();
  if (Number.isNaN(deliveredMs)) return null;
  return new Date(
    deliveredMs + CLIENT_ACCESS_DAYS_AFTER_DELIVERY * 24 * 60 * 60 * 1000
  ).toISOString();
}

export function isClientAccessExpired(order: {
  status: OrderStatus;
  delivered_at: string | null | undefined;
}): boolean {
  if (order.status !== 'ENTREGADO' || !order.delivered_at) {
    return false;
  }
  const expiresAtIso = calculateClientAccessExpiresAt(order.delivered_at);
  if (!expiresAtIso) return false;
  return Date.now() > new Date(expiresAtIso).getTime();
}

export function getDaysRemaining(expiresAtIso: string | null | undefined): number | null {
  if (!expiresAtIso) return null;
  const expiresMs = new Date(expiresAtIso).getTime();
  if (Number.isNaN(expiresMs)) return null;
  const diffMs = expiresMs - Date.now();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

export const CONSENT_SECTIONS = [
  {
    title: '1. Política de Privacidad, Protección de Datos (RGPD) y Plazo de Conservación',
    content:
      'Tech Gamer tratará los datos personales proporcionados (nombre, teléfono, correo electrónico e identificadores del equipo) exclusivamente para la gestión de la orden de reparación, comunicaciones sobre el estado del servicio y emisión del Certificado Digital de Diagnóstico y Reparación. Los registros, fotografías y firma digital se conservarán durante un plazo máximo de dos (2) meses desde la fecha de ingreso manual del equipo, tras el cual serán eliminados automáticamente del sistema. El titular podrá ejercer sus derechos de acceso, rectificación, supresión y limitación mediante solicitud escrita al taller.',
  },
  {
    title: '2. Autorización de Manipulación y Diagnóstico Técnico',
    content:
      'El cliente autoriza expresamente al personal técnico cualificado a abrir, desmontar, inspeccionar, ejecutar pruebas de hardware/software y realizar las intervenciones necesarias sobre el ordenador descrito en esta orden con el fin de diagnosticar y subsanar el fallo reportado.',
  },
  {
    title: '3. Responsabilidad sobre Copias de Seguridad y Datos Almacenados',
    content:
      'El cliente declara haber realizado una copia de seguridad previa de toda la información, archivos personales y licencias de software contenidos en las unidades de almacenamiento del equipo. El taller adoptará las medidas de diligencia estándar para preservar la integridad lógica, pero no se hace responsable de la pérdida parcial o total de datos derivada de fallos de hardware preexistentes, sectores dañados o reinstalaciones necesarias para el diagnóstico.',
  },
  {
    title: '4. Registro Fotográfico de Evidencias',
    content:
      'Se autoriza la captura de fotografías técnicas del estado físico exterior e interior del equipo como respaldo documental de recepción, intervención y verificación final, las cuales formarán parte del historial de la orden y del Certificado Digital emitido al concluir el servicio.',
  },
];

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);
}

export function formatDateShort(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

