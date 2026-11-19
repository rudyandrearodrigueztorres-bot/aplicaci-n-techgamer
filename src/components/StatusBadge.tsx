import React from 'react';
import { getStatusInfo, type OrderStatus } from '@/lib/constants';

export default function StatusBadge({ status }: { status: OrderStatus }) {
  const info = getStatusInfo(status);

  const styles: Record<OrderStatus, string> = {
    EN_DIAGNOSTICO: 'bg-blue-50 text-[#2563EB] border-blue-200',
    DIAGNOSTICADO: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    EN_REPARACION: 'bg-amber-50 text-amber-800 border-amber-200',
    LISTO_PARA_ENTREGA: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    ENTREGADO: 'bg-[#10B981] text-white border-[#10B981]',
  };

  const dotColors: Record<OrderStatus, string> = {
    EN_DIAGNOSTICO: 'bg-[#2563EB]',
    DIAGNOSTICADO: 'bg-indigo-500',
    EN_REPARACION: 'bg-amber-500',
    LISTO_PARA_ENTREGA: 'bg-[#10B981]',
    ENTREGADO: 'bg-white',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border whitespace-nowrap ${styles[status]}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColors[status]}`} />
      {info.step}. {info.label}
    </span>
  );
}

