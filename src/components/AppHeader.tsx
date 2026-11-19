'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Cpu, LogOut, Shield, User } from 'lucide-react';
import type { UserRole } from '@/lib/auth';

interface AppHeaderProps {
  userName: string;
  role: UserRole;
  homeHref: string;
  rightSlot?: React.ReactNode;
}

export default function AppHeader({
  userName,
  role,
  homeHref,
  rightSlot,
}: AppHeaderProps) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/');
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <header className="no-print sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        <Link href={homeHref} className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-[#2563EB] text-white flex items-center justify-center shadow-sm shadow-blue-600/25 group-hover:bg-blue-700 transition">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="text-base font-bold text-slate-900 leading-none tracking-tight">
              TechCare <span className="text-[#2563EB]">Lab</span>
            </div>
            <div className="text-[11px] text-slate-500 font-medium mt-0.5">
              Diagnóstico y Reparación
            </div>
          </div>
        </Link>

        <div className="flex items-center gap-2.5 sm:gap-3">
          {rightSlot}

          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#F8FAFC] border border-slate-200">
            {role === 'TECHNICIAN' ? (
              <Shield className="w-4 h-4 text-[#2563EB]" />
            ) : (
              <User className="w-4 h-4 text-[#10B981]" />
            )}
            <div className="text-xs leading-tight">
              <div className="font-semibold text-slate-800">{userName}</div>
              <div className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
                {role === 'TECHNICIAN' ? 'Técnico Admin' : 'Portal Cliente'}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 border border-slate-200 hover:border-red-200 transition"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      </div>
    </header>
  );
}

