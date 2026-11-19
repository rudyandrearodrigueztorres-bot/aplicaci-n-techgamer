# Tech Gamer — Gestión de Taller de Diagnóstico y Reparación de Ordenadores

Aplicación web full-stack construida con **Next.js 15 (App Router)**, **Tailwind CSS**, **Lucide React** y **SQLite (`node:sqlite`)** para la gestión integral de un taller de reparación de ordenadores, con seguimiento en tiempo real, cumplimiento de protección de datos (RGPD) con firma digital y emisión de certificados digitales imprimibles en PDF.

## Funcionalidades principales

- **Autenticación por roles:** Login único con redirección automática a **Panel Técnico (`/tecnico`)** o **Panel Cliente (`/cliente`)** y aislamiento estricto de datos por cliente.
- **Check-in y Consentimiento RGPD:** Registro de cliente, generación automática/manual de credenciales temporales, carga de fotografía de recepción, fecha/hora exacta automática y firma digital en pantalla (Canvas ratón/táctil) o aceptación obligatoria diferida al primer acceso del cliente.
- **Seguimiento en 5 fases:** `En diagnóstico` → `Diagnosticado` → `En reparación` → `Listo para entrega` → `Entregado`, con bitácora cronológica y subida múltiple de evidencias fotográficas.
- **Certificado Digital (PDF):** Vista oficial habilitada al finalizar la reparación con diagnóstico, solución aplicada, galería de evidencias, constancia/firma RGPD, sello de verificación e impresión limpia (`@media print`).

## Ejecución local

```bash
npm install
npm run seed
npm run build
npm run start
```

Abre [http://localhost:3000](http://localhost:3000).
