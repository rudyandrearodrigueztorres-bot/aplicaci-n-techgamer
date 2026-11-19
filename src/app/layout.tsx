import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TechCare Lab | Taller de Diagnóstico y Reparación de Ordenadores',
  description:
    'Plataforma integral para gestión de órdenes de reparación, seguimiento en tiempo real, cumplimiento RGPD y emisión de certificados digitales.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans antialiased">
        {children}
      </body>
    </html>
  );
}

