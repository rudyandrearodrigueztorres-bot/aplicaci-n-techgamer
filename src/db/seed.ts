import fs from 'fs';
import path from 'path';
import { getDb } from './index';
import { hashPassword } from '../lib/auth';
import { ensureUploadsDir, UPLOADS_DIR } from '../lib/uploads';
import { CONSENT_VERSION } from '../lib/constants';

function createEvidenceSvg(opts: {
  filename: string;
  title: string;
  subtitle: string;
  badge: string;
  accent: string;
  bgFrom: string;
  bgTo: string;
  metrics: string[];
  kind: 'laptop' | 'ssd' | 'thermal' | 'stress';
}) {
  const iconSvg =
    opts.kind === 'laptop'
      ? `<rect x="210" y="95" width="380" height="230" rx="14" fill="#1E293B" stroke="#475569" stroke-width="5"/>
         <rect x="228" y="113" width="344" height="194" rx="6" fill="#0F172A"/>
         <rect x="248" y="135" width="150" height="12" rx="4" fill="${opts.accent}" opacity="0.9"/>
         <rect x="248" y="160" width="290" height="8" rx="3" fill="#334155"/>
         <rect x="248" y="178" width="240" height="8" rx="3" fill="#334155"/>
         <rect x="248" y="210" width="110" height="72" rx="6" fill="#1E293B" stroke="${opts.accent}" stroke-width="2"/>
         <rect x="372" y="210" width="170" height="72" rx="6" fill="#1E293B" stroke="#334155" stroke-width="2"/>
         <path d="M170 330 H630 L610 356 H190 Z" fill="#64748B"/>
         <rect x="355" y="334" width="90" height="6" rx="3" fill="#334155"/>`
      : opts.kind === 'ssd'
      ? `<rect x="190" y="130" width="420" height="160" rx="12" fill="#0F172A" stroke="#334155" stroke-width="4"/>
         <rect x="220" y="160" width="76" height="100" rx="6" fill="#1E293B" stroke="${opts.accent}" stroke-width="2.5"/>
         <rect x="315" y="160" width="76" height="100" rx="6" fill="#1E293B" stroke="#475569" stroke-width="2"/>
         <rect x="410" y="160" width="76" height="100" rx="6" fill="#1E293B" stroke="#475569" stroke-width="2"/>
         <rect x="510" y="175" width="60" height="70" rx="6" fill="${opts.accent}" opacity="0.2" stroke="${opts.accent}" stroke-width="2"/>
         <text x="258" y="216" text-anchor="middle" fill="#E2E8F0" font-size="13" font-family="monospace">NAND</text>
         <text x="540" y="216" text-anchor="middle" fill="${opts.accent}" font-size="12" font-family="monospace">NVMe</text>
         <rect x="165" y="175" width="25" height="70" rx="3" fill="#F59E0B"/>`
      : opts.kind === 'thermal'
      ? `<circle cx="310" cy="215" r="78" fill="#0F172A" stroke="${opts.accent}" stroke-width="5"/>
         <circle cx="310" cy="215" r="24" fill="${opts.accent}" opacity="0.85"/>
         <path d="M310 137 V191 M310 239 V293 M232 215 H286 M334 215 H388" stroke="#475569" stroke-width="6" stroke-linecap="round"/>
         <rect x="425" y="155" width="165" height="120" rx="10" fill="#0F172A" stroke="#334155" stroke-width="3"/>
         <rect x="448" y="180" width="120" height="70" rx="6" fill="#1E293B" stroke="${opts.accent}" stroke-width="2.5"/>
         <text x="508" y="220" text-anchor="middle" fill="#E2E8F0" font-size="15" font-weight="bold" font-family="monospace">CPU / GPU</text>`
      : `<rect x="180" y="105" width="440" height="220" rx="12" fill="#0F172A" stroke="#334155" stroke-width="3"/>
         <polyline points="210,275 265,245 315,252 365,205 420,192 480,170 540,165 590,158" fill="none" stroke="${opts.accent}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
         <circle cx="590" cy="158" r="8" fill="${opts.accent}"/>
         <line x1="210" y1="285" x2="590" y2="285" stroke="#334155" stroke-width="2"/>
         <line x1="210" y1="140" x2="210" y2="285" stroke="#334155" stroke-width="2"/>
         <text x="230" y="145" fill="${opts.accent}" font-size="14" font-weight="bold" font-family="monospace">STRESS TEST PASS · 100% ESTABLE</text>`;

  const metricsMarkup = opts.metrics
    .map(
      (m, i) =>
        `<rect x="${44 + i * 242}" y="410" width="224" height="44" rx="8" fill="rgba(15,23,42,0.75)" stroke="rgba(148,163,184,0.28)"/>
         <text x="${156 + i * 242}" y="437" text-anchor="middle" fill="#E2E8F0" font-size="13" font-family="system-ui, sans-serif">${m}</text>`
    )
    .join('\n');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${opts.bgFrom}"/>
      <stop offset="100%" stop-color="${opts.bgTo}"/>
    </linearGradient>
  </defs>
  <rect width="800" height="500" fill="url(#bg)"/>
  <g opacity="0.08" stroke="#FFFFFF" stroke-width="1">
    <line x1="0" y1="100" x2="800" y2="100"/>
    <line x1="0" y1="200" x2="800" y2="200"/>
    <line x1="0" y1="300" x2="800" y2="300"/>
    <line x1="0" y1="400" x2="800" y2="400"/>
    <line x1="200" y1="0" x2="200" y2="500"/>
    <line x1="400" y1="0" x2="400" y2="500"/>
    <line x1="600" y1="0" x2="600" y2="500"/>
  </g>
  <rect x="36" y="28" width="210" height="32" rx="16" fill="${opts.accent}"/>
  <text x="141" y="49" text-anchor="middle" fill="#FFFFFF" font-size="13" font-weight="700" font-family="system-ui, sans-serif">${opts.badge}</text>
  <text x="764" y="48" text-anchor="end" fill="#94A3B8" font-size="13" font-family="monospace">TechCare Lab · Evidencia</text>
  ${iconSvg}
  <text x="44" y="380" fill="#FFFFFF" font-size="22" font-weight="700" font-family="system-ui, sans-serif">${opts.title}</text>
  <text x="44" y="400" fill="#CBD5E1" font-size="14" font-family="system-ui, sans-serif">${opts.subtitle}</text>
  ${metricsMarkup}
</svg>`;

  ensureUploadsDir();
  fs.writeFileSync(path.join(UPLOADS_DIR, opts.filename), svg, 'utf8');
  return `/uploads/${opts.filename}`;
}

function createSignatureSvg(filename: string, signerLabel: string, pathData: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="460" height="140" viewBox="0 0 460 140">
  <rect width="460" height="140" fill="#FFFFFF"/>
  <path d="${pathData}" fill="none" stroke="#1E3A8A" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
  <line x1="28" y1="114" x2="432" y2="114" stroke="#CBD5E1" stroke-width="1.2" stroke-dasharray="4 4"/>
  <text x="230" y="131" text-anchor="middle" fill="#64748B" font-size="11" font-family="system-ui, sans-serif">Firma digital verificada · ${signerLabel}</text>
</svg>`;
  ensureUploadsDir();
  fs.writeFileSync(path.join(UPLOADS_DIR, filename), svg, 'utf8');
  return `/uploads/${filename}`;
}

export function seedDatabase(force = false) {
  const db = getDb();

  const existingUsers = db
    .prepare(`SELECT COUNT(*) as c FROM users`)
    .get() as { c: number };

  if (existingUsers.c > 0 && !force) {
    console.log('La base de datos ya contiene datos. Omitiendo seed.');
    return;
  }

  if (force) {
    db.exec(`
      DELETE FROM order_photos;
      DELETE FROM order_logs;
      DELETE FROM orders;
      DELETE FROM users;
    `);
  }

  console.log('Generando evidencias fotográficas y firmas de prueba en /public/uploads...');

  const imgMacReception = createEvidenceSvg({
    filename: 'seed-macbook-recepcion.svg',
    title: 'Recepción · MacBook Pro 14" M2 Pro',
    subtitle: 'Chasis aluminio sin golpes graves · Pantalla íntegra · No arranca SO',
    badge: 'RECEPCIÓN INICIAL',
    accent: '#2563EB',
    bgFrom: '#0F172A',
    bgTo: '#1E293B',
    metrics: ['Batería: 84% ciclos', 'S/N: C02ZL4X9MD6T', 'Cargador MagSafe: Sí'],
    kind: 'laptop',
  });

  const imgMacSsd = createEvidenceSvg({
    filename: 'seed-macbook-ssd-diagnostico.svg',
    title: 'Diagnóstico · Fallo crítico en controlador NAND/SSD',
    subtitle: 'Errores de lectura SMART (148 bloques reasignados) detectados en banco',
    badge: 'DIAGNÓSTICO TÉCNICO',
    accent: '#F59E0B',
    bgFrom: '#1E1B4B',
    bgTo: '#0F172A',
    metrics: ['SMART Status: FAIL', 'Temp VRM: 48°C', 'Placa base: OK'],
    kind: 'ssd',
  });

  const imgMacStress = createEvidenceSvg({
    filename: 'seed-macbook-pruebas-ok.svg',
    title: 'Verificación · Prueba de estrés 4h superada',
    subtitle: 'Nuevo módulo NVMe calibrado, mantenimiento térmico y macOS verificado',
    badge: 'PRUEBAS SUPERADAS',
    accent: '#10B981',
    bgFrom: '#064E3B',
    bgTo: '#0F172A',
    metrics: ['Lectura: 5.420 MB/s', 'Temp máx: 69°C', 'Test RAM: 0 errores'],
    kind: 'stress',
  });

  const imgThinkpadReception = createEvidenceSvg({
    filename: 'seed-thinkpad-recepcion.svg',
    title: 'Recepción · Lenovo ThinkPad X1 Carbon Gen 11',
    subtitle: 'Equipo empresarial con sobrecalentamiento y apagados repentinos bajo carga',
    badge: 'RECEPCIÓN INICIAL',
    accent: '#2563EB',
    bgFrom: '#0F172A',
    bgTo: '#1E3A8A',
    metrics: ['Estado físico: Excelente', 'S/N: PF4K92LM', 'Funda incluida: No'],
    kind: 'laptop',
  });

  const imgThinkpadThermal = createEvidenceSvg({
    filename: 'seed-thinkpad-termico.svg',
    title: 'Intervención · Limpieza de disipador y pasta térmica PTM7950',
    subtitle: 'Obstrucción severa en turbina y pasta seca reemplazada por compuesto profesional',
    badge: 'EN REPARACIÓN',
    accent: '#2563EB',
    bgFrom: '#1E293B',
    bgTo: '#0F172A',
    metrics: ['Temp previa: 99°C', 'Temp actual: 71°C', 'Ventilador: Lubricado'],
    kind: 'thermal',
  });

  const imgRogReception = createEvidenceSvg({
    filename: 'seed-rog-recepcion.svg',
    title: 'Recepción · ASUS ROG Zephyrus G14',
    subtitle: 'Pantalla con parpadeo intermitente y puerto USB-C sin salida de vídeo',
    badge: 'RECEPCIÓN INICIAL',
    accent: '#2563EB',
    bgFrom: '#0F172A',
    bgTo: '#312E81',
    metrics: ['Estado chasis: Bueno', 'S/N: R8NRCX048219', 'Cargador 240W: Sí'],
    kind: 'laptop',
  });

  const imgDellReception = createEvidenceSvg({
    filename: 'seed-dell-recepcion.svg',
    title: 'Recepción · Dell XPS 15 9530',
    subtitle: 'Batería degradada al 32% y bisagra izquierda con holgura mecánica',
    badge: 'RECEPCIÓN INICIAL',
    accent: '#2563EB',
    bgFrom: '#0F172A',
    bgTo: '#1E293B',
    metrics: ['Salud batería: 32%', 'S/N: 7H9K2X3', 'Cargador USB-C: Sí'],
    kind: 'laptop',
  });

  const imgDellFinal = createEvidenceSvg({
    filename: 'seed-dell-final.svg',
    title: 'Control Final · Batería OEM 86Wh y bisagra calibrada',
    subtitle: 'Calibración de carga completa y test de diagnóstico ePSA sin incidentes',
    badge: 'EQUIPO VERIFICADO',
    accent: '#10B981',
    bgFrom: '#065F46',
    bgTo: '#0F172A',
    metrics: ['Batería: 100% nueva', 'Ciclos: 1', 'ePSA: PASS'],
    kind: 'stress',
  });

  const sigCarlos = createSignatureSvg(
    'seed-sig-carlos.svg',
    'Carlos Méndez García',
    'M 65 88 C 82 36, 118 28, 116 74 C 114 96, 145 55, 168 68 C 185 78, 198 48, 224 62 C 244 73, 260 92, 286 58 C 308 32, 336 86, 366 64 C 382 52, 396 74, 412 68'
  );

  const sigDavid = createSignatureSvg(
    'seed-sig-david.svg',
    'David Ruiz Navarro',
    'M 78 92 L 96 36 C 128 38, 142 78, 102 90 C 138 82, 174 52, 198 72 C 218 88, 250 48, 276 66 C 302 82, 338 56, 386 64'
  );

  const sigSofia = createSignatureSvg(
    'seed-sig-sofia.svg',
    'Sofía Vargas Castillo',
    'M 70 84 C 95 26, 140 94, 164 56 C 186 24, 206 90, 238 64 C 266 42, 294 86, 330 58 C 352 44, 376 74, 404 60'
  );

  const now = Date.now();
  const hoursAgo = (h: number) => new Date(now - h * 3600 * 1000).toISOString();

  // 1. Insert Users
  const insertUser = db.prepare(`
    INSERT INTO users (username, password_hash, role, full_name, email, phone, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insertUser.run(
    'tecnico',
    hashPassword('admin123'),
    'TECHNICIAN',
    'Ing. Alejandro Morales',
    'alejandro.morales@techcarelab.es',
    '+34 600 112 233',
    hoursAgo(240)
  );

  const clientCarlosId = Number(
    insertUser.run(
      'carlos.mendez',
      hashPassword('cliente123'),
      'CLIENT',
      'Carlos Méndez García',
      'carlos.mendez@ejemplo.es',
      '+34 612 345 678',
      hoursAgo(52)
    ).lastInsertRowid
  );

  const clientLauraId = Number(
    insertUser.run(
      'laura.gomez',
      hashPassword('cliente123'),
      'CLIENT',
      'Laura Gómez Herrera',
      'laura.gomez@ejemplo.es',
      '+34 622 987 654',
      hoursAgo(28)
    ).lastInsertRowid
  );

  const clientDavidId = Number(
    insertUser.run(
      'david.ruiz',
      hashPassword('cliente123'),
      'CLIENT',
      'David Ruiz Navarro',
      'david.ruiz@ejemplo.es',
      '+34 633 456 789',
      hoursAgo(6)
    ).lastInsertRowid
  );

  const clientSofiaId = Number(
    insertUser.run(
      'sofia.vargas',
      hashPassword('cliente123'),
      'CLIENT',
      'Sofía Vargas Castillo',
      'sofia.vargas@ejemplo.es',
      '+34 644 765 432',
      hoursAgo(120)
    ).lastInsertRowid
  );

  const insertOrder = db.prepare(`
    INSERT INTO orders (
      order_number, client_user_id, client_name, client_phone, client_email, client_temp_password,
      device_brand, device_model, device_serial, reported_issue, status,
      received_at, completed_at, delivered_at, initial_photo_path,
      consent_accepted, consent_accepted_at, consent_method, consent_signature_path, consent_signer_name, consent_version,
      final_diagnosis, solution_applied, warranty_granted, technician_name, certificate_code, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertLog = db.prepare(`
    INSERT INTO order_logs (order_id, author_name, comment, status_at_time, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  const insertPhoto = db.prepare(`
    INSERT INTO order_photos (order_id, log_id, file_path, caption, category, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  // Order 1: Carlos Méndez - LISTO PARA ENTREGA (Certificado listo + Consentimiento presencial)
  const order1Id = Number(
    insertOrder.run(
      'ORD-2026-0001',
      clientCarlosId,
      'Carlos Méndez García',
      '+34 612 345 678',
      'carlos.mendez@ejemplo.es',
      'cliente123',
      'Apple',
      'MacBook Pro 14" M2 Pro',
      'C02ZL4X9MD6T',
      'El equipo se queda congelado en el arranque con icono de carpeta interrogante y hace reinicios espontáneos tras actualización.',
      'LISTO_PARA_ENTREGA',
      hoursAgo(52),
      hoursAgo(3),
      null,
      imgMacReception,
      1,
      hoursAgo(52),
      'PRESENCIAL',
      sigCarlos,
      'Carlos Méndez García',
      CONSENT_VERSION,
      'Fallo crítico en módulo de almacenamiento SSD NVMe principal con 148 sectores reasignados y corrupción de tabla APFS. Placa lógica, memorias unificadas y sistema de alimentación dentro de parámetros nominales.',
      'Sustitución de unidad SSD de 1TB certificada, limpieza interna ultrasónica de disipadores, renovación de compuesto térmico, reinstalación limpia de macOS Sonoma y validación de estabilidad con 4 horas de prueba de estrés continuo.',
      '6 meses en repuesto SSD y mano de obra especializada',
      'Ing. Alejandro Morales',
      'CERT-TC26-8F4A-0001',
      hoursAgo(3)
    ).lastInsertRowid
  );

  const o1Log1 = Number(
    insertLog.run(
      order1Id,
      'Ing. Alejandro Morales',
      'Equipo recibido en mostrador con cargador MagSafe original. Se registra fotografía inicial y se inician pruebas de arranque y diagnóstico de placa.',
      'EN_DIAGNOSTICO',
      hoursAgo(51)
    ).lastInsertRowid
  );

  const o1Log2 = Number(
    insertLog.run(
      order1Id,
      'Ing. Alejandro Morales',
      'Se detecta fallo en disco SSD (múltiples sectores defectuosos SMART y errores de I/O). Resto de placa base y RAM en estado óptimo. Se procede a reemplazo autorizado.',
      'DIAGNOSTICADO',
      hoursAgo(38)
    ).lastInsertRowid
  );
  insertPhoto.run(
    order1Id,
    o1Log2,
    imgMacSsd,
    'Resultado del escaneo SMART y diagnóstico del controlador NVMe',
    'DIAGNOSTICO',
    hoursAgo(38)
  );

  insertLog.run(
    order1Id,
    'Ing. Alejandro Morales',
    'Instalación de nueva unidad SSD NVMe de 1TB, limpieza de sistema de ventilación y restauración completa del sistema operativo.',
    'EN_REPARACION',
    hoursAgo(18)
  );

  const o1Log4 = Number(
    insertLog.run(
      order1Id,
      'Ing. Alejandro Morales',
      'Pruebas de estrés de 4 horas superadas al 100% (lectura 5.420 MB/s, temperatura máxima 69°C). Certificado digital emitido; equipo listo para recogida.',
      'LISTO_PARA_ENTREGA',
      hoursAgo(3)
    ).lastInsertRowid
  );
  insertPhoto.run(
    order1Id,
    o1Log4,
    imgMacStress,
    'Gráfica de validación térmica y rendimiento tras 4h de estrés continuo',
    'PRUEBAS',
    hoursAgo(3)
  );

  // Order 2: Laura Gómez - EN REPARACIÓN + CONSENTIMIENTO PENDIENTE (para probar Modal Primer Acceso)
  const order2Id = Number(
    insertOrder.run(
      'ORD-2026-0002',
      clientLauraId,
      'Laura Gómez Herrera',
      '+34 622 987 654',
      'laura.gomez@ejemplo.es',
      'cliente123',
      'Lenovo',
      'ThinkPad X1 Carbon Gen 11',
      'PF4K92LM',
      'El portátil alcanza temperaturas muy altas a los 10 minutos de uso, el ventilador hace ruido constante y se apaga de golpe en videollamadas.',
      'EN_REPARACION',
      hoursAgo(28),
      null,
      null,
      imgThinkpadReception,
      0,
      null,
      null,
      null,
      null,
      CONSENT_VERSION,
      'Thermal throttling severo (99°C en carga media) ocasionado por acumulación de polvo en rejilla de disipación y degradación de pasta térmica de fábrica.',
      null,
      null,
      'Ing. Alejandro Morales',
      'CERT-TC26-3B9C-0002',
      hoursAgo(5)
    ).lastInsertRowid
  );

  insertLog.run(
    order2Id,
    'Ing. Alejandro Morales',
    'Equipo recibido vía mensajería corporativa (pendiente firma digital de protección de datos por parte de la cliente en su primer acceso al portal). Se inicia inspección térmica.',
    'EN_DIAGNOSTICO',
    hoursAgo(27)
  );

  const o2Log2 = Number(
    insertLog.run(
      order2Id,
      'Ing. Alejandro Morales',
      'Desmontaje de módulo de refrigeración completado. Se realiza limpieza profunda de turbina y aplicación de pad térmico de cambio de fase PTM7950. Ahora en pruebas de estabilidad.',
      'EN_REPARACION',
      hoursAgo(5)
    ).lastInsertRowid
  );
  insertPhoto.run(
    order2Id,
    o2Log2,
    imgThinkpadThermal,
    'Mantenimiento del sistema térmico y cambio de compuesto disipador',
    'REPARACION',
    hoursAgo(5)
  );

  // Order 3: David Ruiz - EN DIAGNÓSTICO
  const order3Id = Number(
    insertOrder.run(
      'ORD-2026-0003',
      clientDavidId,
      'David Ruiz Navarro',
      '+34 633 456 789',
      'david.ruiz@ejemplo.es',
      'cliente123',
      'ASUS',
      'ROG Zephyrus G14 (GA402)',
      'R8NRCX048219',
      'Parpadeo intermitente en pantalla a 165Hz y el puerto USB-C derecho no detecta monitor externo.',
      'EN_DIAGNOSTICO',
      hoursAgo(6),
      null,
      null,
      imgRogReception,
      1,
      hoursAgo(6),
      'PRESENCIAL',
      sigDavid,
      'David Ruiz Navarro',
      CONSENT_VERSION,
      null,
      null,
      null,
      'Ing. Alejandro Morales',
      'CERT-TC26-7E2D-0003',
      hoursAgo(4)
    ).lastInsertRowid
  );

  insertLog.run(
    order3Id,
    'Ing. Alejandro Morales',
    'Recepción en taller con consentimiento presencial firmado. Iniciando inspección con microscopio del controlador USB-C PD y comprobación de cable flex eDP.',
    'EN_DIAGNOSTICO',
    hoursAgo(4)
  );

  // Order 4: Sofía Vargas - ENTREGADO (Certificado histórico completo)
  const order4Id = Number(
    insertOrder.run(
      'ORD-2026-0004',
      clientSofiaId,
      'Sofía Vargas Castillo',
      '+34 644 765 432',
      'sofia.vargas@ejemplo.es',
      'cliente123',
      'Dell',
      'XPS 15 9530',
      '7H9K2X3',
      'Autonomía reducida a menos de 45 minutos y crujido al abrir la tapa del portátil en la bisagra izquierda.',
      'ENTREGADO',
      hoursAgo(120),
      hoursAgo(76),
      hoursAgo(68),
      imgDellReception,
      1,
      hoursAgo(118),
      'PORTAL_CLIENTE',
      sigSofia,
      'Sofía Vargas Castillo',
      CONSENT_VERSION,
      'Batería de 6 celdas hinchada parcialmente con capacidad útil degradada al 32% y anclaje de bisagra izquierda con tornillería suelta.',
      'Retirada segura y reciclaje de batería degradada, instalación de batería OEM 86Wh nueva, refuerzo estructural y recalibrado de par en ambas bisagras, y verificación completa Dell ePSA.',
      '12 meses en batería nueva y ajuste mecánico',
      'Ing. Alejandro Morales',
      'CERT-TC26-9A1F-0004',
      hoursAgo(68)
    ).lastInsertRowid
  );

  insertLog.run(
    order4Id,
    'Ing. Alejandro Morales',
    'Diagnóstico confirmado: batería al 32% con ligero abombamiento. Se sustituye por batería OEM 86Wh y se reajusta anclaje de bisagra.',
    'EN_REPARACION',
    hoursAgo(95)
  );

  const o4Log2 = Number(
    insertLog.run(
      order4Id,
      'Ing. Alejandro Morales',
      'Calibración de batería finalizada (100% salud) y test ePSA aprobado sin errores. Equipo entregado a la propietaria con certificado digital.',
      'ENTREGADO',
      hoursAgo(68)
    ).lastInsertRowid
  );
  insertPhoto.run(
    order4Id,
    o4Log2,
    imgDellFinal,
    'Verificación final de batería OEM 86Wh y diagnóstico ePSA',
    'PRUEBAS',
    hoursAgo(68)
  );

  console.log('Seed completado con éxito: 1 Técnico Admin y 4 Órdenes de prueba creadas.');
}

// Run when invoked directly via `npm run seed`
const isDirectExecution =
  typeof process !== 'undefined' &&
  process.argv[1] &&
  process.argv[1].endsWith('seed.ts');

if (isDirectExecution) {
  const forceFlag = process.argv.includes('--force');
  seedDatabase(forceFlag);
}

