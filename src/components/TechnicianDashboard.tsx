'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Plus,
  Search,
  ShieldCheck,
  ShieldAlert,
  Laptop,
  ArrowRight,
  FileBadge2,
  ClipboardList,
  Wrench,
  CheckCircle2,
  Clock,
  RefreshCw,
  Camera,
  MessageSquare,
  Trash2,
  Download,
  Users,
  UserX,
  Database,
  Shield,
} from 'lucide-react';
import AppHeader from './AppHeader';
import StatusBadge from './StatusBadge';
import {
  ORDER_STATUS_STEPS,
  formatDateShort,
  getDaysRemaining,
  isCertificateAvailable,
  type ConsentMethod,
  type OrderStatus,
} from '@/lib/constants';

interface OrderListItem {
  id: number;
  order_number: string;
  client_user_id: number | null;
  client_name: string;
  client_phone: string;
  client_email: string;
  client_username: string | null;
  device_brand: string;
  device_model: string;
  device_serial: string;
  reported_issue: string;
  status: OrderStatus;
  received_at: string;
  expires_at: string;
  consent_accepted: number;
  consent_accepted_at: string | null;
  consent_method: ConsentMethod | null;
  logs_count: number;
  photos_count: number;
}

interface UserListItem {
  id: number;
  username: string;
  role: 'TECHNICIAN' | 'CLIENT';
  full_name: string;
  email: string | null;
  phone: string | null;
  created_at: string;
  isCurrentUser: boolean;
  accessExpired: boolean;
  orders: {
    id: number;
    order_number: string;
    status: OrderStatus;
    device: string;
  }[];
}

export default function TechnicianDashboard({
  technicianName,
}: {
  technicianName: string;
}) {
  const [activeTab, setActiveTab] = useState<'ORDERS' | 'USERS'>('ORDERS');
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [storageInfo, setStorageInfo] = useState<{
    persistentDb: boolean;
    onVercel: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [query, setQuery] = useState('');
  const [userQuery, setUserQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch('/api/users', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        setUsers(json.users || []);
        if (json.storage) setStorageInfo(json.storage);
      }
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleDeleteUser = async (user: UserListItem) => {
    const confirmed = window.confirm(
      `¿Seguro que deseas eliminar al usuario "@${user.username}" (${user.full_name})?\n\nEl usuario ya no podrá iniciar sesión, pero el historial de sus órdenes y certificados se mantendrá intacto.`
    );
    if (!confirmed) return;

    setDeletingUserId(user.id);
    try {
      const res = await fetch(`/api/users/${user.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) {
        window.alert(json.error || 'No se pudo eliminar el usuario.');
        return;
      }
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      setOrders((prev) =>
        prev.map((o) =>
          o.client_user_id === user.id
            ? { ...o, client_user_id: null, client_username: null }
            : o
        )
      );
    } finally {
      setDeletingUserId(null);
    }
  };

  const handleDeleteOrder = async (order: OrderListItem) => {
    const confirmed = window.confirm(
      `¿Seguro que deseas eliminar la orden ${order.order_number} (${order.client_name})? Esta acción eliminará también su bitácora y acceso de cliente.`
    );
    if (!confirmed) return;

    setDeletingId(order.id);
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setOrders((prev) => prev.filter((o) => o.id !== order.id));
        fetchUsers();
      }
    } finally {
      setDeletingId(null);
    }
  };

  const fetchOrders = useCallback(async (q: string, st: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set('q', q.trim());
      if (st && st !== 'ALL') params.set('status', st);
      const res = await fetch(`/api/orders?${params.toString()}`, {
        cache: 'no-store',
      });
      if (res.ok) {
        const json = await res.json();
        setOrders(json.orders || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchOrders(query, statusFilter);
    }, 180);
    return () => clearTimeout(timer);
  }, [query, statusFilter, fetchOrders]);

  const totalCount = orders.length;
  const activeCount = orders.filter(
    (o) =>
      o.status === 'EN_DIAGNOSTICO' ||
      o.status === 'DIAGNOSTICADO' ||
      o.status === 'EN_REPARACION'
  ).length;
  const readyCount = orders.filter(
    (o) => o.status === 'LISTO_PARA_ENTREGA' || o.status === 'ENTREGADO'
  ).length;
  const pendingConsentCount = orders.filter((o) => !o.consent_accepted).length;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <AppHeader
        userName={technicianName}
        role="TECHNICIAN"
        homeHref="/tecnico"
        rightSlot={
          <Link
            href="/tecnico/nueva-orden"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-[#2563EB] hover:bg-blue-700 shadow-sm shadow-blue-600/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Ingreso</span>
          </Link>
        }
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Heading */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Panel de Gestión del Taller
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Control de equipos recibidos, cumplimiento RGPD y retención
              automática de 2 meses por cada ingreso manual.
            </p>
          </div>
          <button
            type="button"
            onClick={() => fetchOrders(query, statusFilter)}
            className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Actualizar listado
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">
                Órdenes listadas
              </span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center">
                <ClipboardList className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-extrabold text-slate-900">
              {totalCount}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">
                En taller (activas)
              </span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Wrench className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-extrabold text-slate-900">
              {activeCount}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">
                Listos / Entregados
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#10B981] flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-extrabold text-[#10B981]">
              {readyCount}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">
                RGPD pendiente
              </span>
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                  pendingConsentCount > 0
                    ? 'bg-amber-50 text-amber-600'
                    : 'bg-emerald-50 text-[#10B981]'
                }`}
              >
                {pendingConsentCount > 0 ? (
                  <ShieldAlert className="w-4 h-4" />
                ) : (
                  <ShieldCheck className="w-4 h-4" />
                )}
              </div>
            </div>
            <div
              className={`mt-2 text-2xl font-extrabold ${
                pendingConsentCount > 0 ? 'text-amber-600' : 'text-[#10B981]'
              }`}
            >
              {pendingConsentCount}
            </div>
          </div>
        </div>

        {/* Persistent DB notice on Vercel if Postgres not connected yet */}
        {storageInfo && storageInfo.onVercel && !storageInfo.persistentDb && (
          <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 flex items-start gap-3 text-xs sm:text-sm text-amber-900">
            <Database className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">
                Base de datos temporal activa en Vercel
              </div>
              <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                Para que todas las órdenes, usuarios, firmas y fotos se
                mantengan intactos tras cada actualización de la página, conecta
                una base de datos gratuita <strong>Neon Postgres</strong> en{' '}
                <strong>Vercel → Storage → Create Database</strong> y pulsa{' '}
                <strong>Redeploy</strong>.
              </p>
            </div>
          </div>
        )}

        {/* Section Tabs: Órdenes vs Usuarios */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab('ORDERS')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition ${
              activeTab === 'ORDERS'
                ? 'bg-[#2563EB] text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            Órdenes del Taller
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                activeTab === 'ORDERS'
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {orders.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('USERS');
              fetchUsers();
            }}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition ${
              activeTab === 'USERS'
                ? 'bg-[#2563EB] text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Users className="w-4 h-4" />
            Usuarios
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                activeTab === 'USERS'
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {users.length}
            </span>
          </button>
        </div>

        {activeTab === 'USERS' ? (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={userQuery}
                  onChange={(e) => setUserQuery(e.target.value)}
                  placeholder="Buscar usuario por nombre, @usuario, correo o número de orden..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-[#F8FAFC] text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 outline-none transition"
                />
              </div>
              <button
                type="button"
                onClick={fetchUsers}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition shrink-0"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${loadingUsers ? 'animate-spin' : ''}`}
                />
                Actualizar usuarios
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F8FAFC] border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="py-3.5 px-4">Usuario</th>
                      <th className="py-3.5 px-4">Rol</th>
                      <th className="py-3.5 px-4">Contacto</th>
                      <th className="py-3.5 px-4">Órdenes vinculadas</th>
                      <th className="py-3.5 px-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {users
                      .filter((u) => {
                        const q = userQuery.trim().toLowerCase();
                        if (!q) return true;
                        return (
                          u.full_name.toLowerCase().includes(q) ||
                          u.username.toLowerCase().includes(q) ||
                          (u.email || '').toLowerCase().includes(q) ||
                          u.orders.some((o) =>
                            o.order_number.toLowerCase().includes(q)
                          )
                        );
                      })
                      .map((u) => (
                        <tr key={u.id} className="hover:bg-blue-50/30 transition">
                          <td className="py-4 px-4 align-top">
                            <div className="font-semibold text-slate-900">
                              {u.full_name}
                            </div>
                            <div className="mt-1 inline-block text-xs font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                              @{u.username}
                            </div>
                          </td>
                          <td className="py-4 px-4 align-top">
                            {u.role === 'TECHNICIAN' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-[#2563EB] border border-blue-200">
                                <Shield className="w-3.5 h-3.5" />
                                Técnico Admin
                              </span>
                            ) : u.accessExpired ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                                Cliente · Expirado
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Cliente · Activo
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-4 align-top text-xs text-slate-600">
                            <div>{u.phone || '—'}</div>
                            <div className="text-slate-400 mt-0.5">
                              {u.email || '—'}
                            </div>
                          </td>
                          <td className="py-4 px-4 align-top">
                            {u.orders.length === 0 ? (
                              <span className="text-xs text-slate-400">
                                {u.role === 'TECHNICIAN'
                                  ? 'Acceso completo'
                                  : 'Sin órdenes vinculadas'}
                              </span>
                            ) : (
                              <div className="flex flex-wrap gap-1.5">
                                {u.orders.map((o) => (
                                  <Link
                                    key={o.id}
                                    href={`/tecnico/ordenes/${o.id}`}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-mono font-semibold bg-blue-50 text-[#2563EB] hover:bg-blue-100 transition"
                                  >
                                    {o.order_number}
                                  </Link>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="py-4 px-4 align-top text-right whitespace-nowrap">
                            {u.isCurrentUser || u.role === 'TECHNICIAN' ? (
                              <span className="text-xs text-slate-400 italic">
                                Cuenta protegida
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleDeleteUser(u)}
                                disabled={deletingUserId === u.id}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 disabled:opacity-50 transition"
                              >
                                <UserX className="w-3.5 h-3.5" />
                                Eliminar usuario
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
        <>
        {/* Search & Status Filter */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm space-y-3">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por número de orden (ORD-...), cliente, marca, modelo o S/N..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-[#F8FAFC] text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 outline-none transition"
              />
            </div>
            <Link
              href="/tecnico/nueva-orden"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#2563EB] hover:bg-blue-700 transition shrink-0"
            >
              <Plus className="w-4 h-4" />
              Registrar Equipo (Check-in)
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                statusFilter === 'ALL'
                  ? 'bg-[#2563EB] text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Todos los estados
            </button>
            {ORDER_STATUS_STEPS.map((st) => (
              <button
                key={st.key}
                type="button"
                onClick={() => setStatusFilter(st.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  statusFilter === st.key
                    ? st.step >= 4
                      ? 'bg-[#10B981] text-white'
                      : 'bg-[#2563EB] text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st.step}. {st.label}
              </button>
            ))}
          </div>
        </div>

        {/* Orders List */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
          {loading && orders.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-500">
              Cargando órdenes del taller...
            </div>
          ) : orders.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                <Laptop className="w-6 h-6" />
              </div>
              <div className="text-sm font-semibold text-slate-800">
                No se encontraron órdenes con los criterios actuales
              </div>
              <p className="text-xs text-slate-500">
                Prueba con otra búsqueda o registra un nuevo ingreso de equipo.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F8FAFC] border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3.5 px-4">Orden / Ingreso</th>
                    <th className="py-3.5 px-4">Cliente</th>
                    <th className="py-3.5 px-4">Ordenador</th>
                    <th className="py-3.5 px-4">Estado</th>
                    <th className="py-3.5 px-4">Consentimiento RGPD</th>
                    <th className="py-3.5 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {orders.map((order) => {
                    const certReady = isCertificateAvailable(order.status);
                    return (
                      <tr
                        key={order.id}
                        className="hover:bg-blue-50/30 transition"
                      >
                        <td className="py-4 px-4 align-top whitespace-nowrap">
                          <div className="font-bold text-[#2563EB] font-mono text-xs sm:text-sm">
                            {order.order_number}
                          </div>
                          <div className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500">
                            <Clock className="w-3 h-3" />
                            {formatDateShort(order.received_at)}
                          </div>
                          {order.expires_at && (
                            <div className="mt-0.5 text-[11px] text-slate-400">
                              Auto-borrado en{' '}
                              <strong className="text-slate-600">
                                {getDaysRemaining(order.expires_at)} días
                              </strong>
                            </div>
                          )}
                          <div className="mt-1 flex items-center gap-2.5 text-[11px] text-slate-400">
                            <span className="inline-flex items-center gap-1">
                              <MessageSquare className="w-3 h-3" />
                              {order.logs_count}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Camera className="w-3 h-3" />
                              {order.photos_count}
                            </span>
                          </div>
                        </td>

                        <td className="py-4 px-4 align-top">
                          <div className="font-semibold text-slate-900">
                            {order.client_name}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {order.client_phone}
                          </div>
                          <div className="mt-1">
                            {order.client_username ? (
                              <span className="inline-block text-[11px] font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                                @{order.client_username}
                              </span>
                            ) : (
                              <span className="inline-block text-[11px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                                Usuario eliminado
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-4 px-4 align-top max-w-xs">
                          <div className="font-semibold text-slate-900">
                            {order.device_brand} {order.device_model}
                          </div>
                          <div className="text-xs font-mono text-slate-500 mt-0.5">
                            S/N: {order.device_serial}
                          </div>
                          <p className="text-xs text-slate-500 line-clamp-1 mt-1">
                            {order.reported_issue}
                          </p>
                        </td>

                        <td className="py-4 px-4 align-top">
                          <StatusBadge status={order.status} />
                        </td>

                        <td className="py-4 px-4 align-top whitespace-nowrap">
                          {order.consent_accepted ? (
                            <div className="inline-flex flex-col">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
                                Aceptado
                              </span>
                              <span className="text-[11px] text-slate-500 mt-1 pl-1">
                                {order.consent_method === 'PRESENCIAL'
                                  ? 'Firma presencial'
                                  : 'Portal cliente'}
                              </span>
                            </div>
                          ) : (
                            <div className="inline-flex flex-col">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                                <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                                Pendiente firma
                              </span>
                              <span className="text-[11px] text-slate-500 mt-1 pl-1">
                                Requerido en 1er acceso
                              </span>
                            </div>
                          )}
                        </td>

                        <td className="py-4 px-4 align-top text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-2">
                            {certReady && (
                              <Link
                                href={`/certificado/${order.id}`}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition"
                              >
                                <FileBadge2 className="w-3.5 h-3.5" />
                                Certificado
                              </Link>
                            )}
                            <a
                              href={`/api/orders/${order.id}/download`}
                              download={`Registro-Digital-${order.order_number}.pdf`}
                              title="Descargar Registro Digital (PDF)"
                              className="inline-flex items-center justify-center p-1.5 rounded-xl text-[#2563EB] bg-blue-50 border border-blue-200 hover:bg-blue-100 transition"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                            <Link
                              href={`/tecnico/ordenes/${order.id}`}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-[#2563EB] hover:bg-blue-700 transition"
                            >
                              Gestionar
                              <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                            <button
                              type="button"
                              onClick={() => handleDeleteOrder(order)}
                              disabled={deletingId === order.id}
                              title="Eliminar orden"
                              className="inline-flex items-center justify-center p-1.5 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 border border-slate-200 hover:border-red-200 disabled:opacity-50 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        </>
        )}
      </main>
    </div>
  );
}

