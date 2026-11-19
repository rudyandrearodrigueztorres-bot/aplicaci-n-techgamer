'use client';

import React from 'react';
import {
  Check,
  Search,
  ClipboardCheck,
  Wrench,
  PackageCheck,
  ShieldCheck,
} from 'lucide-react';
import {
  ORDER_STATUS_STEPS,
  getStatusIndex,
  type OrderStatus,
} from '@/lib/constants';

interface StatusStepperProps {
  currentStatus: OrderStatus;
  interactive?: boolean;
  disabled?: boolean;
  onSelectStatus?: (status: OrderStatus) => void;
}

const STEP_ICONS: Record<OrderStatus, React.ElementType> = {
  EN_DIAGNOSTICO: Search,
  DIAGNOSTICADO: ClipboardCheck,
  EN_REPARACION: Wrench,
  LISTO_PARA_ENTREGA: PackageCheck,
  ENTREGADO: ShieldCheck,
};

export default function StatusStepper({
  currentStatus,
  interactive = false,
  disabled = false,
  onSelectStatus,
}: StatusStepperProps) {
  const activeIdx = getStatusIndex(currentStatus);

  return (
    <div className="w-full">
      {/* Desktop horizontal stepper */}
      <div className="hidden md:block">
        <div className="relative flex items-start justify-between">
          {/* Background track */}
          <div className="absolute top-5 left-8 right-8 h-1 bg-slate-200 rounded-full" />
          {/* Active progress track */}
          <div
            className="absolute top-5 left-8 h-1 rounded-full transition-all duration-500"
            style={{
              width: `calc(${(activeIdx / (ORDER_STATUS_STEPS.length - 1)) * 100}% - ${
                activeIdx === 0 ? '0px' : '0px'
              })`,
              maxWidth: 'calc(100% - 4rem)',
              backgroundColor:
                activeIdx >= 3 ? '#10B981' : '#2563EB',
            }}
          />

          {ORDER_STATUS_STEPS.map((item, idx) => {
            const Icon = STEP_ICONS[item.key];
            const isCompleted =
              idx < activeIdx ||
              (idx === activeIdx &&
                (currentStatus === 'LISTO_PARA_ENTREGA' ||
                  currentStatus === 'ENTREGADO'));
            const isCurrent = idx === activeIdx;

            const circleClass = isCompleted
              ? 'bg-[#10B981] text-white border-[#10B981] shadow-sm shadow-emerald-500/25'
              : isCurrent
              ? 'bg-[#2563EB] text-white border-[#2563EB] ring-4 ring-blue-100 shadow-sm shadow-blue-500/30'
              : 'bg-white text-slate-400 border-slate-200';

            const labelClass = isCompleted
              ? 'text-emerald-700 font-semibold'
              : isCurrent
              ? 'text-[#2563EB] font-bold'
              : 'text-slate-500 font-medium';

            const content = (
              <>
                <div
                  className={`relative z-10 w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${circleClass} ${
                    interactive && !disabled ? 'group-hover:scale-105' : ''
                  }`}
                >
                  {idx < activeIdx || currentStatus === 'ENTREGADO' ? (
                    <Check className="w-5 h-5 stroke-[2.5]" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                </div>
                <div className="mt-2.5 text-center px-1">
                  <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                    Paso {item.step}
                  </div>
                  <div className={`text-xs mt-0.5 leading-snug ${labelClass}`}>
                    {item.label}
                  </div>
                </div>
              </>
            );

            if (interactive && onSelectStatus) {
              return (
                <button
                  key={item.key}
                  type="button"
                  disabled={disabled}
                  onClick={() => onSelectStatus(item.key)}
                  className="group flex flex-col items-center flex-1 focus:outline-none disabled:opacity-60"
                >
                  {content}
                </button>
              );
            }

            return (
              <div
                key={item.key}
                className="flex flex-col items-center flex-1"
              >
                {content}
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile vertical stepper */}
      <div className="md:hidden space-y-2.5">
        {ORDER_STATUS_STEPS.map((item, idx) => {
          const Icon = STEP_ICONS[item.key];
          const isCompleted =
            idx < activeIdx ||
            (idx === activeIdx &&
              (currentStatus === 'LISTO_PARA_ENTREGA' ||
                currentStatus === 'ENTREGADO'));
          const isCurrent = idx === activeIdx;

          const row = (
            <div
              className={`w-full flex items-center gap-3 p-3 rounded-xl border transition ${
                isCurrent
                  ? isCompleted
                    ? 'bg-emerald-50 border-emerald-300'
                    : 'bg-blue-50/70 border-[#2563EB]'
                  : isCompleted
                  ? 'bg-emerald-50/40 border-emerald-200'
                  : 'bg-white border-slate-200'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  isCompleted
                    ? 'bg-[#10B981] text-white'
                    : isCurrent
                    ? 'bg-[#2563EB] text-white'
                    : 'bg-slate-100 text-slate-400'
                }`}
              >
                {idx < activeIdx || currentStatus === 'ENTREGADO' ? (
                  <Check className="w-4 h-4 stroke-[2.5]" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
              </div>
              <div className="text-left min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-400">
                    {item.step}.
                  </span>
                  <span
                    className={`text-sm font-semibold ${
                      isCompleted
                        ? 'text-emerald-800'
                        : isCurrent
                        ? 'text-[#2563EB]'
                        : 'text-slate-600'
                    }`}
                  >
                    {item.label}
                  </span>
                </div>
                {isCurrent && (
                  <p className="text-xs text-slate-600 mt-0.5">
                    {item.description}
                  </p>
                )}
              </div>
            </div>
          );

          if (interactive && onSelectStatus) {
            return (
              <button
                key={item.key}
                type="button"
                disabled={disabled}
                onClick={() => onSelectStatus(item.key)}
                className="w-full block text-left"
              >
                {row}
              </button>
            );
          }

          return <div key={item.key}>{row}</div>;
        })}
      </div>
    </div>
  );
}

