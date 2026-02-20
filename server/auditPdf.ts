import PDFDocument from 'pdfkit';
import type { AuditResult, AuditCategory, AuditItem, KeywordSuggestion, BacklinkInsight } from './audit';

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

const businessImpact: Record<string, string> = {
  'Page Title': 'A strong title tag is the #1 factor for click-through rates in search results. Businesses with optimized titles see 20-30% more organic traffic.',
  'Meta Description': 'Your meta description is your "ad copy" in Google results. A compelling description can double your click-through rate from search.',
  'H1 Heading': 'Search engines use H1 tags to understand your page topic. A clear H1 helps Google rank you for the right keywords, driving qualified leads.',
  'Canonical URL': 'Without a canonical tag, search engines may split your ranking power across duplicate URLs, weakening your position in results.',
  'Structured Data': 'Structured data enables rich snippets (stars, FAQs, prices) in Google results. Sites with rich snippets get up to 58% more clicks.',
  'Meta Keywords': 'While Google ignores meta keywords, other search engines like Bing still consider them. Every bit of visibility helps.',
  'Heading Hierarchy': 'A clear heading structure helps both users and search engines scan your content. Well-organized pages keep visitors 2-3x longer.',
  'Internal Links': 'Internal linking spreads ranking power across your site and helps Google discover all your pages. Sites with strong internal linking rank significantly better.',
  'Server Response Time': 'Every second of load time costs you 7% in conversions. Amazon found that every 100ms of latency cost them 1% in sales.',
  'HTML Size': 'Lean HTML loads faster on mobile networks. Fast-loading pages rank higher and convert better — speed is a direct Google ranking factor.',
  'Image Optimization': 'Unoptimized images are the #1 cause of slow websites. Properly optimized images can cut page load time by 50% or more.',
  'Compression': 'Gzip/Brotli compression reduces file sizes by 70-90%. This means faster loads, happier users, and better search rankings.',
  'Browser Caching': 'Without caching headers, returning visitors re-download everything. Good caching makes repeat visits nearly instant, boosting engagement.',
  'Viewport Meta Tag': 'Without a viewport tag, your site looks broken on mobile. Google penalizes sites that aren\'t mobile-friendly in mobile search results.',
  'Responsive Design': 'Over 60% of web traffic is mobile. A responsive design ensures you\'re not losing more than half your potential customers.',
  'Touch-Friendly Elements': 'Mobile users need tap targets at least 44px. Small buttons cause frustration and abandonment — every tap matters for conversions.',
  'Font Readability': 'If text is too small on mobile, users bounce immediately. Readable fonts keep visitors engaged and moving toward conversion.',
  'HTTPS': 'Google marks non-HTTPS sites as "Not Secure" in Chrome, which scares away 85% of visitors. HTTPS is essential for trust and rankings.',
  'Security Headers': 'Security headers protect your visitors from attacks. They also signal to Google that your site is trustworthy and well-maintained.',
  'Mixed Content': 'Mixed content (HTTP resources on HTTPS pages) triggers browser warnings that destroy user trust and can block your content from loading.',
  'Alt Text': 'Alt text makes images accessible to screen readers and helps Google understand your images. This opens up Google Image Search traffic.',
  'Language Attribute': 'The lang attribute helps screen readers pronounce content correctly and helps search engines serve your site to the right audience.',
  'ARIA Landmarks': 'ARIA landmarks improve navigation for assistive technology users. Accessible sites also tend to have better SEO structure.',
  'Open Graph Tags': 'When someone shares your site on social media, OG tags control how it looks. Good previews get 2-3x more clicks than generic links.',
  'Twitter Card Tags': 'Twitter Cards make your links stand out in feeds with images and descriptions, driving more traffic from social sharing.',
  'Social Share Links': 'Making it easy to share your content amplifies your reach organically. Every share is free marketing to a new audience.',
  'Content Length': 'Pages with 1,000+ words rank significantly better in Google. Comprehensive content establishes authority and answers more search queries.',
  'Readability': 'Content written at an 8th-grade reading level converts best. Simple, clear writing keeps visitors engaged and drives action.',
  'Link Quality': 'Quality links signal credibility. Every broken link or missing internal link is a missed opportunity to guide visitors and search engines.',
};

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

    const coverY = 140;
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
    const gradeY = coverY + 20;
    const gc = gradeColor(audit.grade);
    doc.circle(gradeX + 40, gradeY + 40, 50).fill(gc);
    doc.circle(gradeX + 40, gradeY + 40, 44).fill(DARK_BG);
    doc.fontSize(36).fillColor(gc).font('Helvetica-Bold')
      .text(audit.grade, gradeX, gradeY + 12, { width: 80, align: 'center' });
    doc.fontSize(10).fillColor(GRAY).font('Helvetica')
      .text(`${audit.overallScore}/100`, gradeX, gradeY + 54, { width: 80, align: 'center' });
    doc.fontSize(8).fillColor(gc).font('Helvetica-Bold')
      .text(audit.gradeLabel.toUpperCase(), gradeX - 10, gradeY + 96, { width: 100, align: 'center' });

    // Grade summary box
    const summaryY = coverY + 170;
    const gradeSummaryH = Math.max(60, (doc as any).heightOfString(audit.gradeSummary, { width: pageWidth - 40, fontSize: 10 }) + 30);
    doc.roundedRect(50, summaryY, pageWidth, gradeSummaryH, 6).fill(DARK_CARD);
    doc.roundedRect(50, summaryY, 4, gradeSummaryH, 2).fill(gc);
    doc.fontSize(10).fillColor(LIGHT_GRAY).font('Helvetica')
      .text(audit.gradeSummary, 66, summaryY + 15, { width: pageWidth - 32 });

    // Quick stats
    const statsY = summaryY + gradeSummaryH + 15;
    const passCount = audit.categories.reduce((sum, c) => sum + c.items.filter(i => i.status === 'pass').length, 0);
    const warnCount = audit.categories.reduce((sum, c) => sum + c.items.filter(i => i.status === 'warning').length, 0);
    const failCount = audit.categories.reduce((sum, c) => sum + c.items.filter(i => i.status === 'fail').length, 0);

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

    // ========== WHAT THIS MEANS FOR YOUR BUSINESS (new page) ==========
    doc.addPage();
    doc.rect(0, 0, pw, doc.page.height).fill(DARK_BG);
    doc.rect(0, 0, pw, 4).fill(BRAND_VIOLET);

    doc.fontSize(20).fillColor(WHITE).font('Helvetica-Bold')
      .text('What This Means for Your Business', 50, 40, { width: pageWidth });
    doc.fontSize(10).fillColor(GRAY).font('Helvetica')
      .text('How your current score impacts real visitors, revenue, and growth', 50, 66);

    let impY = 100;

    const impactItems = [
      {
        icon: failCount > 0 ? '!' : '✓',
        color: failCount > 3 ? RED : failCount > 0 ? YELLOW : GREEN,
        title: failCount > 3 ? 'You\'re Losing Potential Customers' : failCount > 0 ? 'Some Visitors May Be Leaving' : 'Your Site is Retaining Visitors Well',
        detail: failCount > 3
          ? `With ${failCount} critical issues, your website is likely turning away visitors before they convert. Each fix directly improves your bottom line.`
          : failCount > 0
          ? `You have ${failCount} issue(s) that could be costing you leads. Fixing these is often the fastest path to more conversions.`
          : 'Your site has a solid foundation. Small optimizations can still yield meaningful improvements in traffic and engagement.',
      },
      {
        icon: audit.overallScore >= 75 ? '✓' : '!',
        color: audit.overallScore >= 75 ? GREEN : audit.overallScore >= 50 ? YELLOW : RED,
        title: 'Search Engine Visibility',
        detail: audit.overallScore >= 75
          ? `With a score of ${audit.overallScore}/100, search engines can effectively crawl and rank your site. Focus on content and backlinks to climb higher.`
          : `A score of ${audit.overallScore}/100 means search engines are having trouble understanding your site. You're likely invisible for many relevant searches. This is fixable.`,
      },
      {
        icon: '→',
        color: BRAND_BLUE,
        title: 'Revenue Impact',
        detail: 'Studies show that every 1-second improvement in page speed increases conversions by 7%. Proper SEO can increase organic traffic by 50-100% within 6 months. These aren\'t just numbers — they translate directly to more leads and sales for your business.',
      },
    ];

    for (const item of impactItems) {
      impY = ensureSpace(doc, impY, 80);
      const detH = (doc as any).heightOfString(item.detail, { width: pageWidth - 70, fontSize: 9 }) || 12;
      const cardH = Math.max(60, detH + 36);

      doc.roundedRect(50, impY, pageWidth, cardH, 8).fill(DARK_CARD);
      doc.roundedRect(50, impY, 4, cardH, 2).fill(item.color);

      doc.circle(75, impY + 20, 12).fill(item.color === GREEN ? '#0f291a' : item.color === RED ? '#2d0f0f' : item.color === YELLOW ? '#291f0a' : '#1e3a5f');
      doc.fontSize(12).fillColor(item.color).font('Helvetica-Bold')
        .text(item.icon, 67, impY + 13, { width: 16, align: 'center' });

      doc.fontSize(11).fillColor(WHITE).font('Helvetica-Bold')
        .text(item.title, 96, impY + 12, { width: pageWidth - 70 });
      doc.fontSize(9).fillColor(LIGHT_GRAY).font('Helvetica')
        .text(item.detail, 96, impY + 28, { width: pageWidth - 70 });

      impY += cardH + 10;
    }

    // Quick wins box
    impY = ensureSpace(doc, impY, 120);
    doc.roundedRect(50, impY, pageWidth, 90, 8).fill('#1a2744');
    doc.roundedRect(50, impY, pageWidth, 4, 2).fill(BRAND_BLUE);
    doc.fontSize(12).fillColor(BRAND_BLUE).font('Helvetica-Bold')
      .text('Quick Wins — Start Here', 65, impY + 14);
    doc.fontSize(9).fillColor(LIGHT_GRAY).font('Helvetica')
      .text('The items marked "Critical" in this report are your biggest opportunities. Fixing just the top 3 issues typically improves your overall score by 15-25 points and can noticeably increase traffic within weeks.', 65, impY + 32, { width: pageWidth - 30 });
    doc.fontSize(9).fillColor(WHITE).font('Helvetica-Bold')
      .text('We can fix all of these for you — fast, affordable, and guaranteed.', 65, impY + 65, { width: pageWidth - 30 });

    // ========== DETAIL PAGES ==========
    for (const cat of audit.categories) {
      doc.addPage();
      doc.rect(0, 0, pw, doc.page.height).fill(DARK_BG);
      doc.rect(0, 0, pw, 4).fill(BRAND_BLUE);

      const pct = categoryPercent(cat);
      const catColor = pct >= 75 ? GREEN : pct >= 50 ? YELLOW : RED;

      doc.roundedRect(50, 30, pageWidth, 60, 8).fill(DARK_CARD);
      doc.fontSize(18).fillColor(WHITE).font('Helvetica-Bold')
        .text(cat.name, 65, 42, { width: pageWidth - 130 });

      const catPassCount = cat.items.filter(i => i.status === 'pass').length;
      const catTotal = cat.items.length;
      doc.fontSize(10).fillColor(GRAY).font('Helvetica')
        .text(`${catPassCount}/${catTotal} checks passed`, 65, 65, { width: pageWidth - 130 });

      doc.roundedRect(pw - 130, 40, 70, 40, 6).fill(catColor);
      doc.fontSize(18).fillColor(WHITE).font('Helvetica-Bold')
        .text(`${pct}%`, pw - 130, 48, { width: 70, align: 'center' });

      let y = 110;

      for (const item of cat.items) {
        const cardHeight = calculateItemHeight(doc, item, pageWidth);
        y = ensureSpace(doc, y, cardHeight + 10);

        doc.roundedRect(50, y, pageWidth, cardHeight, 6).fill(DARK_CARD);
        doc.roundedRect(50, y, 4, cardHeight, 2).fill(statusColor(item.status));

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

        const badgeText = statusLabel(item.status);
        const badgeW = doc.fontSize(7).widthOfString(badgeText) + 12;
        doc.roundedRect(pw - 50 - badgeW, y + 8, badgeW, 16, 3).fill(statusBg(item.status));
        doc.fontSize(7).fillColor(statusColor(item.status)).font('Helvetica-Bold')
          .text(badgeText, pw - 50 - badgeW + 6, y + 12);

        doc.fontSize(10).fillColor(WHITE).font('Helvetica-Bold')
          .text(item.label, 88, y + 10, { width: pageWidth - 140 });

        doc.fontSize(9).fillColor(GRAY).font('Helvetica')
          .text(item.detail, 88, y + 26, { width: pageWidth - 55 });

        let detailH = (doc as any).heightOfString(item.detail, { width: pageWidth - 55, fontSize: 9 });

        if (item.recommendation && item.status !== 'pass') {
          const recY = y + 28 + detailH + 4;
          doc.fontSize(8).fillColor(statusColor(item.status)).font('Helvetica-Bold')
            .text('HOW TO FIX:', 88, recY);
          doc.fontSize(8).fillColor(LIGHT_GRAY).font('Helvetica')
            .text(item.recommendation, 88, recY + 12, { width: pageWidth - 55 });

          const recH = (doc as any).heightOfString(item.recommendation, { width: pageWidth - 55, fontSize: 8 }) || 10;

          const impact = businessImpact[item.label];
          if (impact) {
            const impactY = recY + 14 + recH + 6;
            doc.roundedRect(88, impactY, pageWidth - 55, 2, 1).fill('#2a3548');
            doc.fontSize(7).fillColor(BRAND_BLUE).font('Helvetica-Bold')
              .text('WHY THIS MATTERS:', 88, impactY + 6);
            doc.fontSize(7).fillColor('#7dd3fc').font('Helvetica')
              .text(impact, 88, impactY + 16, { width: pageWidth - 55 });
          }
        } else if (item.status === 'pass') {
          const impact = businessImpact[item.label];
          if (impact) {
            const passImpactY = y + 28 + detailH + 2;
            doc.fontSize(7).fillColor('#4ade80').font('Helvetica')
              .text(`Great work — ${impact.split('.')[0].toLowerCase()}.`, 88, passImpactY, { width: pageWidth - 55 });
          }
        }

        y += cardHeight + 8;
      }
    }

    // ========== TOP RECOMMENDATIONS PAGE ==========
    if (audit.topRecommendations.length > 0) {
      doc.addPage();
      doc.rect(0, 0, pw, doc.page.height).fill(DARK_BG);
      doc.rect(0, 0, pw, 4).fill(RED);

      doc.fontSize(20).fillColor(WHITE).font('Helvetica-Bold')
        .text('Priority Action Items', 50, 40, { width: pageWidth });
      doc.fontSize(10).fillColor(GRAY).font('Helvetica')
        .text('Fix these first for the biggest impact on your traffic and conversions', 50, 66);

      let y = 95;

      for (let i = 0; i < audit.topRecommendations.length; i++) {
        y = ensureSpace(doc, y, 60);
        const rec = audit.topRecommendations[i];

        const recH = (doc as any).heightOfString(rec, { width: pageWidth - 60, fontSize: 9 });
        const totalH = Math.max(44, recH + 20);

        doc.roundedRect(50, y, pageWidth, totalH, 6).fill(DARK_CARD);
        doc.roundedRect(50, y, 4, totalH, 2).fill(i < 3 ? RED : YELLOW);

        doc.circle(75, y + 20, 12).fill(i < 3 ? '#2d0f0f' : '#291f0a');
        doc.fontSize(10).fillColor(i < 3 ? RED : YELLOW).font('Helvetica-Bold')
          .text(`${i + 1}`, 69, y + 15, { width: 12, align: 'center' });

        doc.fontSize(9).fillColor(LIGHT_GRAY).font('Helvetica')
          .text(rec, 95, y + 10, { width: pageWidth - 60 });

        y += totalH + 8;
      }

      // Help callout
      y = ensureSpace(doc, y, 70);
      doc.roundedRect(50, y, pageWidth, 55, 8).fill('#1a2744');
      doc.roundedRect(50, y, pageWidth, 3, 2).fill(BRAND_BLUE);
      doc.fontSize(10).fillColor(WHITE).font('Helvetica-Bold')
        .text('Need help fixing these?', 65, y + 12);
      doc.fontSize(9).fillColor(LIGHT_GRAY).font('Helvetica')
        .text('Our team has fixed these exact issues for dozens of businesses. Most improvements take just 1-2 days and the results are immediate. Reach out at hello@aipoweredsites.com', 65, y + 28, { width: pageWidth - 30 });
    }

    // ========== KEYWORD ANALYSIS PAGE ==========
    if (audit.keywordAnalysis) {
      doc.addPage();
      doc.rect(0, 0, pw, doc.page.height).fill(DARK_BG);
      doc.rect(0, 0, pw, 4).fill(BRAND_BLUE);

      doc.fontSize(20).fillColor(WHITE).font('Helvetica-Bold')
        .text('Keyword Analysis', 50, 40, { width: pageWidth });
      doc.fontSize(10).fillColor(GRAY).font('Helvetica')
        .text('The right keywords bring the right customers to your site', 50, 66);

      let ky = 100;

      doc.fontSize(12).fillColor(BRAND_BLUE).font('Helvetica-Bold')
        .text('Keywords Found on Your Page', 50, ky);
      ky += 20;

      doc.fontSize(9).fillColor(GRAY).font('Helvetica')
        .text(`Top keyword density: ${audit.keywordAnalysis.density}`, 50, ky);
      ky += 20;

      const kwPerRow = 3;
      const kwBoxW = (pageWidth - (kwPerRow - 1) * 8) / kwPerRow;
      const foundKws = audit.keywordAnalysis.foundKeywords;
      for (let i = 0; i < foundKws.length; i++) {
        const col = i % kwPerRow;
        const row = Math.floor(i / kwPerRow);
        const kx = 50 + col * (kwBoxW + 8);
        const rowY = ky + row * 32;
        doc.roundedRect(kx, rowY, kwBoxW, 26, 4).fill(DARK_CARD);
        doc.fontSize(9).fillColor(LIGHT_GRAY).font('Helvetica')
          .text(foundKws[i], kx + 10, rowY + 7, { width: kwBoxW - 20 });
      }
      ky += Math.ceil(foundKws.length / kwPerRow) * 32 + 20;

      ky = ensureSpace(doc, ky, 40);
      doc.fontSize(12).fillColor(BRAND_BLUE).font('Helvetica-Bold')
        .text('Keywords You Should Be Targeting', 50, ky);
      ky += 8;
      doc.fontSize(8).fillColor(GRAY).font('Helvetica')
        .text('Adding these naturally to your content helps you show up when customers search for your services', 50, ky);
      ky += 20;

      const priorityColors: Record<string, string> = { high: RED, medium: YELLOW, low: GREEN };
      const priorityBgs: Record<string, string> = { high: '#2d0f0f', medium: '#291f0a', low: '#0f291a' };

      for (const kw of audit.keywordAnalysis.suggestedKeywords) {
        ky = ensureSpace(doc, ky, 55);

        const reasonH = (doc as any).heightOfString(kw.reason, { width: pageWidth - 75, fontSize: 8 }) || 10;
        const cardH = Math.max(44, reasonH + 32);

        doc.roundedRect(50, ky, pageWidth, cardH, 6).fill(DARK_CARD);
        doc.roundedRect(50, ky, 4, cardH, 2).fill(priorityColors[kw.priority] || YELLOW);

        const pLabel = kw.priority.toUpperCase();
        const pBadgeW = doc.fontSize(7).widthOfString(pLabel) + 12;
        doc.roundedRect(pw - 50 - pBadgeW, ky + 8, pBadgeW, 14, 3).fill(priorityBgs[kw.priority] || '#291f0a');
        doc.fontSize(7).fillColor(priorityColors[kw.priority] || YELLOW).font('Helvetica-Bold')
          .text(pLabel, pw - 50 - pBadgeW + 6, ky + 11);

        doc.fontSize(10).fillColor(WHITE).font('Helvetica-Bold')
          .text(`"${kw.keyword}"`, 65, ky + 9, { width: pageWidth - 100 });
        doc.fontSize(8).fillColor(GRAY).font('Helvetica')
          .text(kw.reason, 65, ky + 24, { width: pageWidth - 75 });

        ky += cardH + 8;
      }
    }

    // ========== BACKLINK INSIGHTS PAGE ==========
    if (audit.backlinkInsights && audit.backlinkInsights.length > 0) {
      doc.addPage();
      doc.rect(0, 0, pw, doc.page.height).fill(DARK_BG);
      doc.rect(0, 0, pw, 4).fill(BRAND_BLUE);

      doc.fontSize(20).fillColor(WHITE).font('Helvetica-Bold')
        .text('Link Profile Analysis', 50, 40, { width: pageWidth });
      doc.fontSize(10).fillColor(GRAY).font('Helvetica')
        .text('Links are the backbone of how search engines determine your site\'s authority', 50, 66);

      let bly = 100;

      for (const insight of audit.backlinkInsights) {
        bly = ensureSpace(doc, bly, 70);

        const detailH = (doc as any).heightOfString(insight.detail, { width: pageWidth - 55, fontSize: 9 }) || 12;
        let cardH = 30 + detailH;
        if (insight.recommendation) {
          const recH = (doc as any).heightOfString(insight.recommendation, { width: pageWidth - 55, fontSize: 8 }) || 10;
          cardH += recH + 22;
        }
        cardH = Math.max(48, cardH + 8);

        doc.roundedRect(50, bly, pageWidth, cardH, 6).fill(DARK_CARD);
        doc.roundedRect(50, bly, 4, cardH, 2).fill(statusColor(insight.status));

        const iconY = bly + 10;
        if (insight.status === 'pass') {
          doc.circle(72, iconY + 6, 8).fill('#0f291a');
          doc.fontSize(11).fillColor(GREEN).font('Helvetica-Bold')
            .text('✓', 66, iconY, { width: 12, align: 'center' });
        } else if (insight.status === 'warning') {
          doc.circle(72, iconY + 6, 8).fill('#291f0a');
          doc.fontSize(11).fillColor(YELLOW).font('Helvetica-Bold')
            .text('!', 67, iconY, { width: 12, align: 'center' });
        } else {
          doc.circle(72, iconY + 6, 8).fill('#2d0f0f');
          doc.fontSize(11).fillColor(RED).font('Helvetica-Bold')
            .text('✗', 66, iconY, { width: 12, align: 'center' });
        }

        doc.fontSize(10).fillColor(WHITE).font('Helvetica-Bold')
          .text(insight.label, 88, bly + 10, { width: pageWidth - 100 });
        doc.fontSize(9).fillColor(GRAY).font('Helvetica')
          .text(insight.detail, 88, bly + 26, { width: pageWidth - 55 });

        if (insight.recommendation) {
          const recStartY = bly + 28 + detailH + 4;
          doc.fontSize(8).fillColor(statusColor(insight.status)).font('Helvetica-Bold')
            .text('HOW TO FIX:', 88, recStartY);
          doc.fontSize(8).fillColor(LIGHT_GRAY).font('Helvetica')
            .text(insight.recommendation, 88, recStartY + 12, { width: pageWidth - 55 });
        }

        bly += cardH + 8;
      }
    }

    // ========== CTA PAGE ==========
    doc.addPage();
    doc.rect(0, 0, pw, doc.page.height).fill(DARK_BG);

    const ctaY = doc.page.height / 2 - 160;

    doc.roundedRect(pw / 2 - 30, ctaY - 30, 60, 60, 30).fill(BRAND_BLUE);
    doc.fontSize(28).fillColor(WHITE).font('Helvetica-Bold')
      .text('→', pw / 2 - 30, ctaY - 18, { width: 60, align: 'center' });

    doc.fontSize(26).fillColor(WHITE).font('Helvetica-Bold')
      .text('Let Us Fix This', 50, ctaY + 50, { width: pageWidth, align: 'center' });
    doc.fontSize(26).fillColor(BRAND_BLUE).font('Helvetica-Bold')
      .text('For You', 50, ctaY + 82, { width: pageWidth, align: 'center' });

    doc.fontSize(11).fillColor(LIGHT_GRAY).font('Helvetica')
      .text('Every issue in this report is something we fix every day.', 50, ctaY + 125, { width: pageWidth, align: 'center' });
    doc.fontSize(11).fillColor(LIGHT_GRAY).font('Helvetica')
      .text('Most clients see measurable improvements within the first week.', 50, ctaY + 142, { width: pageWidth, align: 'center' });

    // Benefits
    const benefitsY = ctaY + 175;
    const benefits = [
      'Free consultation — no obligation',
      'Fixed pricing, no surprises',
      'Results you can measure',
    ];
    benefits.forEach((b, i) => {
      doc.fontSize(10).fillColor(GREEN).font('Helvetica-Bold')
        .text('✓', pw / 2 - 120, benefitsY + i * 20);
      doc.fontSize(10).fillColor(WHITE).font('Helvetica')
        .text(b, pw / 2 - 100, benefitsY + i * 20);
    });

    doc.roundedRect(pw / 2 - 130, benefitsY + 75, 260, 48, 10).fill(BRAND_BLUE);
    doc.fontSize(15).fillColor(WHITE).font('Helvetica-Bold')
      .text('Get Your Free Consultation', pw / 2 - 130, benefitsY + 89, { width: 260, align: 'center' });

    doc.fontSize(11).fillColor(BRAND_BLUE).font('Helvetica')
      .text('aipoweredsites.com', 50, benefitsY + 145, { width: pageWidth, align: 'center', link: 'https://aipoweredsites.com' });

    doc.fontSize(10).fillColor(GRAY).font('Helvetica')
      .text('hello@aipoweredsites.com', 50, benefitsY + 162, { width: pageWidth, align: 'center' });

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

    const impact = businessImpact[item.label];
    if (impact) {
      const impactH = (doc as any).heightOfString(impact, { width: pageWidth - 55, fontSize: 7 }) || 10;
      height += impactH + 24;
    }
  } else if (item.status === 'pass') {
    const impact = businessImpact[item.label];
    if (impact) {
      height += 14;
    }
  }

  return Math.max(48, height + 8);
}
