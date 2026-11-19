import fs from 'fs';
import path from 'path';
import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFImage,
  type PDFPage,
} from 'pdf-lib';
import { readFileFromDb, type OrderWithDetails } from '@/db';
import {
  PHOTO_CATEGORY_LABELS,
  formatDateTime,
  getStatusInfo,
  isCertificateAvailable,
} from '@/lib/constants';
import { PUBLIC_UPLOADS_DIR, UPLOADS_DIR } from '@/lib/uploads';

const PAGE_WIDTH = 595.28; // A4 portrait width (pt)
const PAGE_HEIGHT = 841.89; // A4 portrait height (pt)
const MARGIN = 44;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const COLOR_NAVY = rgb(0.118, 0.227, 0.541); // #1E3A8A
const COLOR_COBALT = rgb(0.145, 0.388, 0.922); // #2563EB
const COLOR_EMERALD = rgb(0.063, 0.725, 0.506); // #10B981
const COLOR_DARK = rgb(0.059, 0.09, 0.165); // #0F172A
const COLOR_SLATE = rgb(0.278, 0.333, 0.412); // #475569
const COLOR_MUTED = rgb(0.45, 0.51, 0.58);
const COLOR_BORDER = rgb(0.84, 0.88, 0.93);
const COLOR_SMOKE = rgb(0.973, 0.98, 0.988); // #F8FAFC
const COLOR_BLUE_BG = rgb(0.937, 0.965, 1);
const COLOR_EMERALD_BG = rgb(0.925, 0.992, 0.961);
const COLOR_AMBER_BG = rgb(1, 0.984, 0.922);
const COLOR_AMBER_TEXT = rgb(0.573, 0.251, 0.055);
const COLOR_WHITE = rgb(1, 1, 1);

function sanitizeText(input: string | null | undefined): string {
  if (!input) return '';
  return input
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/→/g, '->')
    .replace(/•/g, '-')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[—–]/g, '-')
    .replace(/…/g, '...')
    // Keep standard printable ASCII + Latin-1 (Spanish accents, ñ, ¿, ¡, º, ª, etc.) + Euro
    .replace(/[^\x0A\x20-\x7E\xA0-\xFF€]/g, '');
}

function wrapText(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number
): string[] {
  const clean = sanitizeText(text);
  if (!clean) return [];
  const paragraphs = clean.split('\n');
  const lines: string[] = [];

  for (const para of paragraphs) {
    const words = para.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push('');
      continue;
    }
    let current = words[0];
    for (let i = 1; i < words.length; i++) {
      const candidate = `${current} ${words[i]}`;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        current = candidate;
      } else {
        lines.push(current);
        current = words[i];
      }
    }
    lines.push(current);
  }
  return lines;
}

async function resolveUploadBytes(
  filePath: string | null | undefined
): Promise<{
  bytes: Uint8Array;
  ext: string;
} | null> {
  if (!filePath || !filePath.startsWith('/uploads/')) return null;
  const safeName = path.basename(filePath);
  const ext = path.extname(safeName).toLowerCase();

  const stored = await readFileFromDb(safeName);
  if (stored) {
    return { bytes: new Uint8Array(stored.buffer), ext };
  }

  for (const dir of [UPLOADS_DIR, PUBLIC_UPLOADS_DIR]) {
    const full = path.join(dir, safeName);
    if (fs.existsSync(full)) {
      return { bytes: fs.readFileSync(full), ext };
    }
  }
  return null;
}

async function tryEmbedImage(
  pdfDoc: PDFDocument,
  filePath: string | null | undefined
): Promise<PDFImage | null> {
  const resolved = await resolveUploadBytes(filePath);
  if (!resolved) return null;
  try {
    if (resolved.ext === '.png') {
      return await pdfDoc.embedPng(resolved.bytes);
    }
    if (resolved.ext === '.jpg' || resolved.ext === '.jpeg') {
      return await pdfDoc.embedJpg(resolved.bytes);
    }
    // Try PNG then JPG as fallback if extension didn't match actual bytes
    try {
      return await pdfDoc.embedPng(resolved.bytes);
    } catch {
      return await pdfDoc.embedJpg(resolved.bytes);
    }
  } catch {
    return null;
  }
}

export async function generateOrderPdf(
  order: OrderWithDetails
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle(`Registro Digital ${order.order_number} - Tech Gamer`);
  pdfDoc.setAuthor('Tech Gamer');
  pdfDoc.setSubject('Registro Digital de Diagnóstico y Reparación');

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const statusInfo = getStatusInfo(order.status);
  const isOfficialCert = isCertificateAvailable(order.status);
  const techName = order.technician_name || 'Técnico Miguel Gómez';

  let page: PDFPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  const ensureSpace = (neededHeight: number) => {
    if (y - neededHeight < MARGIN + 26) {
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
    }
  };

  const drawSectionHeading = (title: string) => {
    ensureSpace(28);
    page.drawText(sanitizeText(title).toUpperCase(), {
      x: MARGIN,
      y: y - 12,
      size: 9.5,
      font: fontBold,
      color: COLOR_COBALT,
    });
    page.drawLine({
      start: { x: MARGIN, y: y - 17 },
      end: { x: PAGE_WIDTH - MARGIN, y: y - 17 },
      thickness: 0.8,
      color: COLOR_BORDER,
    });
    y -= 26;
  };

  // Top Header Banner
  const headerHeight = 78;
  page.drawRectangle({
    x: 0,
    y: PAGE_HEIGHT - headerHeight,
    width: PAGE_WIDTH,
    height: headerHeight,
    color: COLOR_NAVY,
  });
  page.drawRectangle({
    x: 0,
    y: PAGE_HEIGHT - headerHeight - 4,
    width: PAGE_WIDTH,
    height: 4,
    color: COLOR_EMERALD,
  });

  page.drawText('TECH GAMER', {
    x: MARGIN,
    y: PAGE_HEIGHT - 28,
    size: 10,
    font: fontBold,
    color: rgb(0.65, 0.82, 1),
  });
  page.drawText(
    sanitizeText(
      isOfficialCert
        ? 'Certificado Digital de Diagnóstico y Reparación'
        : 'Registro Digital de Ingreso y Seguimiento Técnico'
    ),
    {
      x: MARGIN,
      y: PAGE_HEIGHT - 48,
      size: 15,
      font: fontBold,
      color: COLOR_WHITE,
    }
  );
  page.drawText(
    sanitizeText(
      `Orden: ${order.order_number}   |   Código verificación: ${order.certificate_code}   |   Estado: ${statusInfo.step}. ${statusInfo.label}`
    ),
    {
      x: MARGIN,
      y: PAGE_HEIGHT - 65,
      size: 8.5,
      font: fontRegular,
      color: rgb(0.86, 0.92, 1),
    }
  );

  y = PAGE_HEIGHT - headerHeight - 24;

  // Two-column summary cards (Equipo & Titular/Fechas)
  const colGap = 14;
  const colW = (CONTENT_WIDTH - colGap) / 2;
  const cardH = 112;
  ensureSpace(cardH + 14);

  const drawCardBox = (x: number, topY: number, w: number, h: number) => {
    page.drawRectangle({
      x,
      y: topY - h,
      width: w,
      height: h,
      color: COLOR_SMOKE,
      borderColor: COLOR_BORDER,
      borderWidth: 0.8,
    });
  };

  // Left card: Device
  drawCardBox(MARGIN, y, colW, cardH);
  let ly = y - 16;
  page.drawText('DATOS DEL EQUIPO', {
    x: MARGIN + 12,
    y: ly,
    size: 8,
    font: fontBold,
    color: COLOR_COBALT,
  });
  ly -= 16;
  page.drawText(
    sanitizeText(`${order.device_brand} ${order.device_model}`).slice(0, 38),
    {
      x: MARGIN + 12,
      y: ly,
      size: 11,
      font: fontBold,
      color: COLOR_DARK,
    }
  );
  ly -= 16;
  page.drawText(sanitizeText(`Número de serie (S/N): ${order.device_serial}`), {
    x: MARGIN + 12,
    y: ly,
    size: 8.5,
    font: fontRegular,
    color: COLOR_SLATE,
  });
  ly -= 14;
  page.drawText(sanitizeText(`Técnico responsable: ${techName}`), {
    x: MARGIN + 12,
    y: ly,
    size: 8.5,
    font: fontRegular,
    color: COLOR_SLATE,
  });
  ly -= 14;
  page.drawText(
    sanitizeText(
      `Usuario portal: ${order.client_username || 'Usuario eliminado'}`
    ),
    {
    x: MARGIN + 12,
    y: ly,
    size: 8.5,
    font: fontRegular,
    color: COLOR_SLATE,
  });
  ly -= 14;
  page.drawText(
    sanitizeText(`Fase actual: ${statusInfo.step}/5 - ${statusInfo.label}`),
    {
      x: MARGIN + 12,
      y: ly,
      size: 8.5,
      font: fontBold,
      color: isOfficialCert ? COLOR_EMERALD : COLOR_COBALT,
    }
  );

  // Right card: Client & Dates
  const rightX = MARGIN + colW + colGap;
  drawCardBox(rightX, y, colW, cardH);
  let ry = y - 16;
  page.drawText('TITULAR Y FECHAS DE SERVICIO', {
    x: rightX + 12,
    y: ry,
    size: 8,
    font: fontBold,
    color: COLOR_COBALT,
  });
  ry -= 16;
  page.drawText(sanitizeText(order.client_name).slice(0, 38), {
    x: rightX + 12,
    y: ry,
    size: 11,
    font: fontBold,
    color: COLOR_DARK,
  });
  ry -= 15;
  page.drawText(
    sanitizeText(`${order.client_phone}  |  ${order.client_email}`).slice(0, 44),
    {
      x: rightX + 12,
      y: ry,
      size: 8.2,
      font: fontRegular,
      color: COLOR_SLATE,
    }
  );
  ry -= 15;
  page.drawText(
    sanitizeText(`Ingreso: ${formatDateTime(order.received_at)}`),
    {
      x: rightX + 12,
      y: ry,
      size: 8.3,
      font: fontRegular,
      color: COLOR_DARK,
    }
  );
  ry -= 14;
  const exitLabel = order.delivered_at
    ? `Entrega: ${formatDateTime(order.delivered_at)}`
    : order.completed_at
    ? `Finalización: ${formatDateTime(order.completed_at)}`
    : 'Finalización: En curso';
  page.drawText(sanitizeText(exitLabel), {
    x: rightX + 12,
    y: ry,
    size: 8.3,
    font: fontRegular,
    color: order.completed_at ? COLOR_EMERALD : COLOR_SLATE,
  });
  ry -= 14;
  if (order.expires_at) {
    page.drawText(
      sanitizeText(`Conservación hasta: ${formatDateTime(order.expires_at)}`),
      {
        x: rightX + 12,
        y: ry,
        size: 8,
        font: fontRegular,
        color: COLOR_MUTED,
      }
    );
  }

  y -= cardH + 20;

  // Section: Technical Report
  drawSectionHeading('Informe Técnico');

  const drawTextBlock = (
    label: string,
    text: string,
    bgColor: ReturnType<typeof rgb>,
    labelColor: ReturnType<typeof rgb>
  ) => {
    const lines = wrapText(text, fontRegular, 9.2, CONTENT_WIDTH - 24);
    const boxH = Math.max(42, 24 + lines.length * 13 + 8);
    ensureSpace(boxH + 10);
    page.drawRectangle({
      x: MARGIN,
      y: y - boxH,
      width: CONTENT_WIDTH,
      height: boxH,
      color: bgColor,
      borderColor: COLOR_BORDER,
      borderWidth: 0.7,
    });
    page.drawText(sanitizeText(label).toUpperCase(), {
      x: MARGIN + 12,
      y: y - 15,
      size: 8,
      font: fontBold,
      color: labelColor,
    });
    let ty = y - 29;
    for (const line of lines) {
      page.drawText(line, {
        x: MARGIN + 12,
        y: ty,
        size: 9.2,
        font: fontRegular,
        color: COLOR_DARK,
      });
      ty -= 13;
    }
    y -= boxH + 10;
  };

  drawTextBlock(
    'Fallo reportado en recepción',
    order.reported_issue,
    COLOR_SMOKE,
    COLOR_SLATE
  );

  if (order.final_diagnosis) {
    drawTextBlock(
      'Diagnóstico técnico final',
      order.final_diagnosis,
      COLOR_BLUE_BG,
      COLOR_COBALT
    );
  }

  if (order.solution_applied) {
    drawTextBlock(
      'Solución aplicada y verificación',
      order.solution_applied,
      COLOR_EMERALD_BG,
      COLOR_EMERALD
    );
  }

  // Section: Bitácora Cronológica
  if (order.logs.length > 0) {
    y -= 4;
    drawSectionHeading(`Bitácora Técnica (${order.logs.length} registros)`);

    for (const log of [...order.logs].reverse()) {
      const commentLines = wrapText(
        log.comment,
        fontRegular,
        8.8,
        CONTENT_WIDTH - 24
      );
      const entryH = 20 + commentLines.length * 12 + 8;
      ensureSpace(entryH + 6);

      page.drawLine({
        start: { x: MARGIN + 4, y: y - 4 },
        end: { x: MARGIN + 4, y: y - entryH + 4 },
        thickness: 2,
        color: COLOR_COBALT,
      });

      page.drawText(sanitizeText(log.author_name), {
        x: MARGIN + 14,
        y: y - 11,
        size: 8.5,
        font: fontBold,
        color: COLOR_DARK,
      });
      const dateStr = sanitizeText(formatDateTime(log.created_at));
      const dateW = fontRegular.widthOfTextAtSize(dateStr, 8);
      page.drawText(dateStr, {
        x: PAGE_WIDTH - MARGIN - dateW,
        y: y - 11,
        size: 8,
        font: fontRegular,
        color: COLOR_MUTED,
      });

      let cy = y - 24;
      for (const line of commentLines) {
        page.drawText(line, {
          x: MARGIN + 14,
          y: cy,
          size: 8.8,
          font: fontRegular,
          color: COLOR_SLATE,
        });
        cy -= 12;
      }
      y -= entryH + 6;
    }
  }

  // Section: Data Protection Consent & Signature
  y -= 4;
  drawSectionHeading('Constancia de Aceptación de Datos (RGPD) y Servicio');

  const sigImage = order.consent_signature_path
    ? await tryEmbedImage(pdfDoc, order.consent_signature_path)
    : null;
  const consentBoxH = sigImage ? 136 : 82;
  ensureSpace(consentBoxH + 14);

  page.drawRectangle({
    x: MARGIN,
    y: y - consentBoxH,
    width: CONTENT_WIDTH,
    height: consentBoxH,
    color: order.consent_accepted ? COLOR_EMERALD_BG : COLOR_AMBER_BG,
    borderColor: COLOR_BORDER,
    borderWidth: 0.8,
  });

  if (order.consent_accepted) {
    const methodLabel =
      order.consent_method === 'PRESENCIAL'
        ? 'Firma digital presencial en recepción'
        : 'Aceptación digital en Portal del Cliente';

    page.drawText('ESTADO: ACEPTADO Y VERIFICADO', {
      x: MARGIN + 12,
      y: y - 16,
      size: 8.5,
      font: fontBold,
      color: COLOR_EMERALD,
    });
    page.drawText(
      sanitizeText(
        `Firmante: ${order.consent_signer_name || order.client_name}`
      ),
      {
        x: MARGIN + 12,
        y: y - 31,
        size: 8.8,
        font: fontBold,
        color: COLOR_DARK,
      }
    );
    page.drawText(
      sanitizeText(
        `Fecha y hora exacta: ${formatDateTime(order.consent_accepted_at)}   |   Modalidad: ${methodLabel} (${order.consent_version})`
      ),
      {
        x: MARGIN + 12,
        y: y - 45,
        size: 8.2,
        font: fontRegular,
        color: COLOR_SLATE,
      }
    );
    page.drawText(
      sanitizeText(
        'Aceptada Política de Privacidad (RGPD), autorización de manipulación/diagnóstico, copias de seguridad y conservación de 2 meses.'
      ),
      {
        x: MARGIN + 12,
        y: y - 59,
        size: 7.8,
        font: fontRegular,
        color: COLOR_SLATE,
      }
    );

    if (sigImage) {
      const maxSigW = 200;
      const maxSigH = 56;
      const scale = Math.min(
        maxSigW / sigImage.width,
        maxSigH / sigImage.height,
        1
      );
      const drawW = sigImage.width * scale;
      const drawH = sigImage.height * scale;

      page.drawRectangle({
        x: MARGIN + 12,
        y: y - consentBoxH + 10,
        width: maxSigW + 16,
        height: maxSigH + 8,
        color: COLOR_WHITE,
        borderColor: COLOR_BORDER,
        borderWidth: 0.6,
      });
      page.drawImage(sigImage, {
        x: MARGIN + 20 + (maxSigW - drawW) / 2,
        y: y - consentBoxH + 14 + (maxSigH - drawH) / 2,
        width: drawW,
        height: drawH,
      });
    }
  } else {
    page.drawText('ESTADO: PENDIENTE DE ACEPTACIÓN POR EL CLIENTE', {
      x: MARGIN + 12,
      y: y - 22,
      size: 8.8,
      font: fontBold,
      color: COLOR_AMBER_TEXT,
    });
    page.drawText(
      sanitizeText(
        'El cliente deberá aceptar y firmar la Política de Protección de Datos y Condiciones del Servicio al acceder al portal.'
      ),
      {
        x: MARGIN + 12,
        y: y - 40,
        size: 8.4,
        font: fontRegular,
        color: COLOR_AMBER_TEXT,
      }
    );
  }

  y -= consentBoxH + 18;

  // Section: Photographic Evidence Gallery (PNG/JPG embedded)
  const evidenceItems: { path: string; caption: string; date: string }[] = [];
  if (order.initial_photo_path) {
    evidenceItems.push({
      path: order.initial_photo_path,
      caption: 'Fotografía inicial de recepción',
      date: formatDateTime(order.received_at),
    });
  }
  for (const photo of [...order.photos].reverse()) {
    evidenceItems.push({
      path: photo.file_path,
      caption: photo.caption || PHOTO_CATEGORY_LABELS[photo.category],
      date: formatDateTime(photo.created_at),
    });
  }

  const embeddedEvidence: {
    image: PDFImage;
    caption: string;
    date: string;
  }[] = [];
  for (const item of evidenceItems) {
    const img = await tryEmbedImage(pdfDoc, item.path);
    if (img) {
      embeddedEvidence.push({
        image: img,
        caption: item.caption,
        date: item.date,
      });
    }
  }

  if (embeddedEvidence.length > 0) {
    drawSectionHeading(
      `Evidencias Fotográficas (${embeddedEvidence.length})`
    );

    const imgColGap = 14;
    const imgCardW = (CONTENT_WIDTH - imgColGap) / 2;
    const imgAreaH = 118;
    const imgCardH = imgAreaH + 34;

    for (let i = 0; i < embeddedEvidence.length; i += 2) {
      ensureSpace(imgCardH + 12);
      const pair = embeddedEvidence.slice(i, i + 2);

      pair.forEach((entry, idx) => {
        const cx = MARGIN + idx * (imgCardW + imgColGap);
        page.drawRectangle({
          x: cx,
          y: y - imgCardH,
          width: imgCardW,
          height: imgCardH,
          color: COLOR_WHITE,
          borderColor: COLOR_BORDER,
          borderWidth: 0.8,
        });

        const scale = Math.min(
          (imgCardW - 12) / entry.image.width,
          (imgAreaH - 10) / entry.image.height
        );
        const w = entry.image.width * scale;
        const h = entry.image.height * scale;

        page.drawImage(entry.image, {
          x: cx + (imgCardW - w) / 2,
          y: y - imgAreaH + (imgAreaH - h) / 2,
          width: w,
          height: h,
        });

        page.drawText(sanitizeText(entry.caption).slice(0, 40), {
          x: cx + 8,
          y: y - imgAreaH - 13,
          size: 8,
          font: fontBold,
          color: COLOR_DARK,
        });
        page.drawText(sanitizeText(entry.date), {
          x: cx + 8,
          y: y - imgAreaH - 25,
          size: 7.4,
          font: fontRegular,
          color: COLOR_MUTED,
        });
      });

      y -= imgCardH + 12;
    }
  }

  // Verification Seal Box
  ensureSpace(64);
  page.drawRectangle({
    x: MARGIN,
    y: y - 56,
    width: CONTENT_WIDTH,
    height: 56,
    color: COLOR_BLUE_BG,
    borderColor: COLOR_COBALT,
    borderWidth: 0.9,
  });
  page.drawText('SELLO DE VERIFICACIÓN DIGITAL - TECH GAMER', {
    x: MARGIN + 14,
    y: y - 18,
    size: 8.5,
    font: fontBold,
    color: COLOR_NAVY,
  });
  page.drawText(
    sanitizeText(
      `Código único: ${order.certificate_code}   |   Responsable: ${techName}`
    ),
    {
      x: MARGIN + 14,
      y: y - 33,
      size: 8.5,
      font: fontRegular,
      color: COLOR_DARK,
    }
  );
  page.drawText(
    sanitizeText(
      `Documento generado el ${formatDateTime(new Date().toISOString())} - Orden ${order.order_number}`
    ),
    {
      x: MARGIN + 14,
      y: y - 46,
      size: 7.8,
      font: fontRegular,
      color: COLOR_SLATE,
    }
  );

  // Page footers with page numbers
  const pages = pdfDoc.getPages();
  pages.forEach((p, idx) => {
    const footerText = sanitizeText(
      `Tech Gamer - Registro Digital ${order.order_number}   |   Página ${idx + 1} de ${pages.length}`
    );
    p.drawText(footerText, {
      x: MARGIN,
      y: 20,
      size: 7.5,
      font: fontRegular,
      color: COLOR_MUTED,
    });
  });

  return pdfDoc.save();
}

