import PDFDocument from 'pdfkit';
import type { AuditResult, AuditCategory, AuditItem } from './audit';

const BRAND_BLUE = '#3b82f6';
const BRAND_VIOLET = '#8b5cf6';
const DARK_BG = '#0f172a';
const DARK_CARD = '#1e293b';
const CARD_BORDER = '#334155';
const WHITE = '#ffffff';
const GRAY = '#94a3b8';
const LIGHT_GRAY = '#cbd5e1';
const GREEN = '#22c55e';
const LIGHT_GREEN = '#dcfce7';
const YELLOW = '#eab308';
const LIGHT_YELLOW = '#fef9c3';
const RED = '#ef4444';
const LIGHT_RED = '#fee2e2';

function statusColor(status: string): string {
  if (status === 'pass') return GREEN;
  if (status === 'warning') return YELLOW;
  return RED;
}

function statusBg(status: string): string {
  if (status === 'pass') return '#0f291a';
  if (status === 'warning') return '#291f0a';
  return '#2d0f0f';
}

function statusLabel(status: string): string {
  if (status === 'pass') return 'PASS';
  if (status === 'warning') return 'NEEDS ATTENTION';
  return 'CRITICAL';
}

function categoryPercent(cat: AuditCategory): number {
  return Math.round((cat.score / cat.maxScore) * 100);
}

function gradeColor(grade: string): string {
  if (grade.startsWith('A')) return GREEN;
  if (grade.startsWith('B')) return '#3b82f6';
  if (grade.startsWith('C')) return YELLOW;
  return RED;
}

function ensureSpace(doc: PDFKit.PDFDocument, y: number, needed: number): number {
  if (y + needed > doc.page.height - 60) {
    doc.addPage();
    doc.rect(0, 0, doc.page.width, doc.page.height).fill(DARK_BG);
    return 50;
  }
  return y;
}

export function generateAuditPDF(audit: AuditResult): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      bufferPages: true,
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageWidth = doc.page.width - 100;
    const pw = doc.page.width;

    // ========== COVER PAGE ==========
    doc.rect(0, 0, pw, doc.page.height).fill(DARK_BG);
    doc.rect(0, 0, pw, 6).fill(BRAND_BLUE);

    doc.fontSize(11).fillColor(BRAND_BLUE).font('Helvetica-Bold')
      .text('AI POWERED SITES', 50, 40, { width: pageWidth });
    doc.fontSize(8).fillColor(GRAY).font('Helvetica')
      .text('aipoweredsites.com', 50, 56);

    const coverY = 160;
    doc.fontSize(32).fillColor(WHITE).font('Helvetica-Bold')
      .text('Website Audit', 50, coverY, { width: pageWidth });
    doc.fontSize(32).fillColor(BRAND_BLUE).font('Helvetica-Bold')
      .text('Report', 50, coverY + 42, { width: pageWidth });

    doc.moveTo(50, coverY + 90).lineTo(130, coverY + 90).lineWidth(3).strokeColor(BRAND_BLUE).stroke();

    doc.fontSize(12).fillColor(LIGHT_GRAY).font('Helvetica')
      .text(audit.url, 50, coverY + 110, { width: pageWidth });

    const date = new Date(audit.timestamp).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
    doc.fontSize(10).fillColor(GRAY)
      .text(`Generated: ${date}`, 50, coverY + 132);

    // Grade circle
    const gradeX = pw - 160;
    const gradeY = coverY + 30;
    const gc = gradeColor(audit.grade);
    doc.circle(gradeX + 40, gradeY + 40, 48).fill(gc);
    doc.circle(gradeX + 40, gradeY + 40, 42).fill(DARK_BG);
    doc.fontSize(36).fillColor(gc).font('Helvetica-Bold')
      .text(audit.grade, gradeX, gradeY + 14, { width: 80, align: 'center' });
    doc.fontSize(11).fillColor(GRAY).font('Helvetica')
      .text(`${audit.overallScore}/100`, gradeX, gradeY + 56, { width: 80, align: 'center' });

    // Summary box
    const summaryY = coverY + 180;
    doc.roundedRect(50, summaryY, pageWidth, 55, 6).fill(DARK_CARD);
    doc.roundedRect(50, summaryY, 4, 55, 2).fill(BRAND_BLUE);
    doc.fontSize(10).fillColor(LIGHT_GRAY).font('Helvetica')
      .text(audit.summary, 66, summaryY + 15, { width: pageWidth - 32 });

    // Quick stats
    const statsY = summaryY + 75;
    const passCount = audit.categories.reduce((sum, c) => sum + c.items.filter(i => i.status === 'pass').length, 0);
    const warnCount = audit.categories.reduce((sum, c) => sum + c.items.filter(i => i.status === 'warning').length, 0);
    const failCount = audit.categories.reduce((sum, c) => sum + c.items.filter(i => i.status === 'fail').length, 0);
    const totalChecks = passCount + warnCount + failCount;

    const statBoxW = (pageWidth - 20) / 3;
    const stats = [
      { label: 'Passing', count: passCount, color: GREEN, bg: '#0f291a' },
      { label: 'Needs Attention', count: warnCount, color: YELLOW, bg: '#291f0a' },
      { label: 'Critical Issues', count: failCount, color: RED, bg: '#2d0f0f' },
    ];
    stats.forEach((s, i) => {
      const sx = 50 + i * (statBoxW + 10);
      doc.roundedRect(sx, statsY, statBoxW, 50, 6).fill(s.bg);
      doc.fontSize(22).fillColor(s.color).font('Helvetica-Bold')
        .text(String(s.count), sx + 12, statsY + 8, { width: statBoxW - 24 });
      doc.fontSize(9).fillColor(GRAY).font('Helvetica')
        .text(s.label, sx + 12, statsY + 34, { width: statBoxW - 24 });
    });

    // Score overview bars
    const barsY = statsY + 70;
    doc.fontSize(13).fillColor(WHITE).font('Helvetica-Bold')
      .text('Category Scores', 50, barsY, { width: pageWidth });

    let by = barsY + 25;
    const barWidth = pageWidth - 140;
    for (const cat of audit.categories) {
      const pct = categoryPercent(cat);
      const color = pct >= 75 ? GREEN : pct >= 50 ? YELLOW : RED;

      doc.fontSize(9).fillColor(LIGHT_GRAY).font('Helvetica')
        .text(cat.name, 50, by + 1, { width: 120 });

      doc.roundedRect(175, by + 2, barWidth, 10, 3).fill('#1e293b');
      const fillWidth = Math.max(4, (pct / 100) * barWidth);
      doc.roundedRect(175, by + 2, fillWidth, 10, 3).fill(color);

      doc.fontSize(9).fillColor(WHITE).font('Helvetica-Bold')
        .text(`${pct}%`, 175 + barWidth + 8, by + 1);

      by += 22;
    }

    // ========== DETAIL PAGES ==========
    for (const cat of audit.categories) {
      doc.addPage();
      doc.rect(0, 0, pw, doc.page.height).fill(DARK_BG);
      doc.rect(0, 0, pw, 4).fill(BRAND_BLUE);

      const pct = categoryPercent(cat);
      const catColor = pct >= 75 ? GREEN : pct >= 50 ? YELLOW : RED;

      // Category header
      doc.roundedRect(50, 30, pageWidth, 60, 8).fill(DARK_CARD);
      doc.fontSize(18).fillColor(WHITE).font('Helvetica-Bold')
        .text(cat.name, 65, 42, { width: pageWidth - 130 });

      const catPassCount = cat.items.filter(i => i.status === 'pass').length;
      const catTotal = cat.items.length;
      doc.fontSize(10).fillColor(GRAY).font('Helvetica')
        .text(`${catPassCount}/${catTotal} checks passed`, 65, 65, { width: pageWidth - 130 });

      // Score badge
      doc.roundedRect(pw - 130, 40, 70, 40, 6).fill(catColor);
      doc.fontSize(18).fillColor(WHITE).font('Helvetica-Bold')
        .text(`${pct}%`, pw - 130, 48, { width: 70, align: 'center' });

      let y = 110;

      for (const item of cat.items) {
        const itemHeight = 50 + (item.recommendation && item.status !== 'pass' ? 20 : 0);
        y = ensureSpace(doc, y, itemHeight);

        // Item card
        const cardHeight = calculateItemHeight(doc, item, pageWidth);
        doc.roundedRect(50, y, pageWidth, cardHeight, 6).fill(DARK_CARD);

        // Status indicator bar on left
        doc.roundedRect(50, y, 4, cardHeight, 2).fill(statusColor(item.status));

        // Status icon
        const iconY = y + 10;
        if (item.status === 'pass') {
          doc.circle(72, iconY + 6, 8).fill('#0f291a');
          doc.fontSize(11).fillColor(GREEN).font('Helvetica-Bold')
            .text('✓', 66, iconY, { width: 12, align: 'center' });
        } else if (item.status === 'warning') {
          doc.circle(72, iconY + 6, 8).fill('#291f0a');
          doc.fontSize(11).fillColor(YELLOW).font('Helvetica-Bold')
            .text('!', 67, iconY, { width: 12, align: 'center' });
        } else {
          doc.circle(72, iconY + 6, 8).fill('#2d0f0f');
          doc.fontSize(11).fillColor(RED).font('Helvetica-Bold')
            .text('✗', 66, iconY, { width: 12, align: 'center' });
        }

        // Status badge
        const badgeText = statusLabel(item.status);
        const badgeW = doc.fontSize(7).widthOfString(badgeText) + 12;
        doc.roundedRect(pw - 50 - badgeW, y + 8, badgeW, 16, 3).fill(statusBg(item.status));
        doc.fontSize(7).fillColor(statusColor(item.status)).font('Helvetica-Bold')
          .text(badgeText, pw - 50 - badgeW + 6, y + 12);

        // Label
        doc.fontSize(10).fillColor(WHITE).font('Helvetica-Bold')
          .text(item.label, 88, y + 10, { width: pageWidth - 140 });

        // Detail
        doc.fontSize(9).fillColor(GRAY).font('Helvetica')
          .text(item.detail, 88, y + 26, { width: pageWidth - 55 });

        let detailH = (doc as any).heightOfString(item.detail, { width: pageWidth - 55, fontSize: 9 });

        // Recommendation
        if (item.recommendation && item.status !== 'pass') {
          const recY = y + 28 + detailH + 4;
          doc.fontSize(8).fillColor(statusColor(item.status)).font('Helvetica-Bold')
            .text('RECOMMENDATION:', 88, recY);
          doc.fontSize(8).fillColor(LIGHT_GRAY).font('Helvetica')
            .text(item.recommendation, 88, recY + 12, { width: pageWidth - 55 });
        }

        y += cardHeight + 8;
      }
    }

    // ========== TOP RECOMMENDATIONS PAGE ==========
    if (audit.topRecommendations.length > 0) {
      doc.addPage();
      doc.rect(0, 0, pw, doc.page.height).fill(DARK_BG);
      doc.rect(0, 0, pw, 4).fill(BRAND_BLUE);

      doc.fontSize(20).fillColor(WHITE).font('Helvetica-Bold')
        .text('Priority Action Items', 50, 40, { width: pageWidth });
      doc.fontSize(10).fillColor(GRAY).font('Helvetica')
        .text('Fix these issues first for the biggest impact on your score', 50, 66);

      let y = 95;

      for (let i = 0; i < audit.topRecommendations.length; i++) {
        y = ensureSpace(doc, y, 50);
        const rec = audit.topRecommendations[i];

        doc.roundedRect(50, y, pageWidth, 40, 6).fill(DARK_CARD);
        doc.roundedRect(50, y, 4, 40, 2).fill(i < 3 ? RED : YELLOW);

        // Number circle
        doc.circle(75, y + 20, 12).fill(i < 3 ? '#2d0f0f' : '#291f0a');
        doc.fontSize(10).fillColor(i < 3 ? RED : YELLOW).font('Helvetica-Bold')
          .text(`${i + 1}`, 69, y + 15, { width: 12, align: 'center' });

        doc.fontSize(9).fillColor(LIGHT_GRAY).font('Helvetica')
          .text(rec, 95, y + 8, { width: pageWidth - 60 });

        const recH = (doc as any).heightOfString(rec, { width: pageWidth - 60, fontSize: 9 });
        const totalH = Math.max(40, recH + 16);
        if (totalH > 40) {
          doc.roundedRect(50, y, pageWidth, totalH, 6).fill(DARK_CARD);
          doc.roundedRect(50, y, 4, totalH, 2).fill(i < 3 ? RED : YELLOW);
          doc.circle(75, y + 20, 12).fill(i < 3 ? '#2d0f0f' : '#291f0a');
          doc.fontSize(10).fillColor(i < 3 ? RED : YELLOW).font('Helvetica-Bold')
            .text(`${i + 1}`, 69, y + 15, { width: 12, align: 'center' });
          doc.fontSize(9).fillColor(LIGHT_GRAY).font('Helvetica')
            .text(rec, 95, y + 8, { width: pageWidth - 60 });
        }

        y += totalH + 8;
      }
    }

    // ========== CTA PAGE ==========
    doc.addPage();
    doc.rect(0, 0, pw, doc.page.height).fill(DARK_BG);

    const ctaY = doc.page.height / 2 - 120;

    doc.roundedRect(pw / 2 - 30, ctaY - 30, 60, 60, 30).fill(BRAND_BLUE);
    doc.fontSize(28).fillColor(WHITE).font('Helvetica-Bold')
      .text('→', pw / 2 - 30, ctaY - 18, { width: 60, align: 'center' });

    doc.fontSize(26).fillColor(WHITE).font('Helvetica-Bold')
      .text('Ready to Improve', 50, ctaY + 50, { width: pageWidth, align: 'center' });
    doc.fontSize(26).fillColor(BRAND_BLUE).font('Helvetica-Bold')
      .text('Your Score?', 50, ctaY + 82, { width: pageWidth, align: 'center' });

    doc.fontSize(12).fillColor(GRAY).font('Helvetica')
      .text('Our team specializes in fixing exactly these kinds of issues.', 50, ctaY + 125, { width: pageWidth, align: 'center' });
    doc.fontSize(12).fillColor(GRAY).font('Helvetica')
      .text('We can turn your website into a high-performing asset.', 50, ctaY + 142, { width: pageWidth, align: 'center' });

    doc.roundedRect(pw / 2 - 110, ctaY + 180, 220, 44, 8).fill(BRAND_BLUE);
    doc.fontSize(14).fillColor(WHITE).font('Helvetica-Bold')
      .text('Get a Free Consultation', pw / 2 - 110, ctaY + 193, { width: 220, align: 'center' });

    doc.fontSize(11).fillColor(BRAND_BLUE).font('Helvetica')
      .text('aipoweredsites.com', 50, ctaY + 245, { width: pageWidth, align: 'center', link: 'https://aipoweredsites.com' });

    doc.fontSize(10).fillColor(GRAY).font('Helvetica')
      .text('hello@aipoweredsites.com', 50, ctaY + 262, { width: pageWidth, align: 'center' });

    // Footer
    doc.fontSize(7).fillColor('#475569').font('Helvetica')
      .text('© AI Powered Sites. This report was generated automatically. Results are based on publicly accessible page data at the time of analysis.',
        50, doc.page.height - 50, { width: pageWidth, align: 'center' });

    doc.end();
  });
}

function calculateItemHeight(doc: PDFKit.PDFDocument, item: AuditItem, pageWidth: number): number {
  const detailH = (doc as any).heightOfString(item.detail, { width: pageWidth - 55, fontSize: 9 }) || 12;
  let height = 30 + detailH;

  if (item.recommendation && item.status !== 'pass') {
    const recH = (doc as any).heightOfString(item.recommendation, { width: pageWidth - 55, fontSize: 8 }) || 10;
    height += recH + 22;
  }

  return Math.max(48, height + 8);
}
