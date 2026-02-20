import * as cheerio from 'cheerio';

export interface AuditCategory {
  name: string;
  icon: string;
  score: number;
  maxScore: number;
  items: AuditItem[];
}

export interface AuditItem {
  label: string;
  status: 'pass' | 'warning' | 'fail';
  detail: string;
  recommendation?: string;
}

export interface KeywordSuggestion {
  keyword: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
}

export interface BacklinkInsight {
  label: string;
  status: 'pass' | 'warning' | 'fail';
  detail: string;
  recommendation?: string;
}

export interface AuditResult {
  url: string;
  timestamp: string;
  overallScore: number;
  grade: string;
  gradeLabel: string;
  gradeSummary: string;
  categories: AuditCategory[];
  summary: string;
  topRecommendations: string[];
  keywordAnalysis: {
    foundKeywords: string[];
    suggestedKeywords: KeywordSuggestion[];
    density: string;
  };
  backlinkInsights: BacklinkInsight[];
}

function getGrade(score: number): string {
  if (score >= 90) return 'A+';
  if (score >= 85) return 'A';
  if (score >= 80) return 'A-';
  if (score >= 75) return 'B+';
  if (score >= 70) return 'B';
  if (score >= 65) return 'B-';
  if (score >= 60) return 'C+';
  if (score >= 55) return 'C';
  if (score >= 50) return 'C-';
  if (score >= 40) return 'D';
  return 'F';
}

export async function runAudit(url: string): Promise<AuditResult> {
  let normalizedUrl = url.trim();
  if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
    normalizedUrl = 'https://' + normalizedUrl;
  }

  const startTime = Date.now();
  let html: string;
  let responseTime: number;
  let statusCode: number;
  let headers: Record<string, string> = {};
  let finalUrl: string;
  let isHttps: boolean;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(normalizedUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AIPoweredSitesAudit/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    });

    clearTimeout(timeout);
    responseTime = Date.now() - startTime;
    statusCode = response.status;
    finalUrl = response.url;
    isHttps = finalUrl.startsWith('https://');

    response.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });

    html = await response.text();
  } catch (err: any) {
    throw new Error(`Could not reach ${normalizedUrl}. Please check the URL and try again.`);
  }

  const $ = cheerio.load(html);

  const seoCategory = auditSEO($, finalUrl);
  const performanceCategory = auditPerformance($, html, responseTime, headers);
  const mobileCategory = auditMobile($, html);
  const securityCategory = auditSecurity($, finalUrl, isHttps, headers);
  const accessibilityCategory = auditAccessibility($);
  const socialCategory = auditSocial($);
  const contentCategory = auditContent($, html);

  const categories = [seoCategory, performanceCategory, mobileCategory, securityCategory, accessibilityCategory, socialCategory, contentCategory];

  const totalScore = categories.reduce((sum, c) => sum + c.score, 0);
  const totalMax = categories.reduce((sum, c) => sum + c.maxScore, 0);
  const overallScore = Math.round((totalScore / totalMax) * 100);

  const allFails = categories.flatMap(c => c.items.filter(i => i.status === 'fail').map(i => i.recommendation || i.detail));
  const allWarnings = categories.flatMap(c => c.items.filter(i => i.status === 'warning').map(i => i.recommendation || i.detail));
  const topRecommendations = [...allFails, ...allWarnings].slice(0, 8);

  const failCount = categories.reduce((sum, c) => sum + c.items.filter(i => i.status === 'fail').length, 0);
  const passCount = categories.reduce((sum, c) => sum + c.items.filter(i => i.status === 'pass').length, 0);

  let summary: string;
  if (overallScore >= 85) {
    summary = `Great job! Your website scores ${overallScore}/100. There are a few minor improvements that could push it even higher.`;
  } else if (overallScore >= 65) {
    summary = `Your website scores ${overallScore}/100. There are several areas where targeted improvements could significantly boost your online presence.`;
  } else {
    summary = `Your website scores ${overallScore}/100. There are critical issues that are likely hurting your search rankings and user experience. Let's fix them.`;
  }

  const grade = getGrade(overallScore);
  const { gradeLabel, gradeSummary } = getGradeContext(grade, overallScore, passCount, failCount);
  const keywordAnalysis = analyzeKeywords($, finalUrl);
  const backlinkInsights = analyzeBacklinks($, finalUrl, html);

  return {
    url: finalUrl,
    timestamp: new Date().toISOString(),
    overallScore,
    grade,
    gradeLabel,
    gradeSummary,
    categories,
    summary,
    topRecommendations,
    keywordAnalysis,
    backlinkInsights,
  };
}

function auditSEO($: cheerio.CheerioAPI, url: string): AuditCategory {
  const items: AuditItem[] = [];
  let score = 0;
  const maxScore = 14;

  const title = $('title').text().trim();
  if (title) {
    if (title.length >= 30 && title.length <= 60) {
      items.push({ label: 'Page Title', status: 'pass', detail: `"${title}" (${title.length} chars — ideal length)` });
      score += 2;
    } else if (title.length > 0) {
      items.push({ label: 'Page Title', status: 'warning', detail: `"${title}" (${title.length} chars)`, recommendation: `Title should be 30-60 characters for best results. Currently ${title.length} chars.` });
      score += 1;
    }
  } else {
    items.push({ label: 'Page Title', status: 'fail', detail: 'No title tag found', recommendation: 'Add a unique, descriptive <title> tag to every page. This is the most important on-page SEO element.' });
  }

  const metaDesc = $('meta[name="description"]').attr('content')?.trim();
  if (metaDesc) {
    if (metaDesc.length >= 120 && metaDesc.length <= 160) {
      items.push({ label: 'Meta Description', status: 'pass', detail: `${metaDesc.length} chars — ideal length` });
      score += 2;
    } else {
      items.push({ label: 'Meta Description', status: 'warning', detail: `${metaDesc.length} chars`, recommendation: `Meta description should be 120-160 characters. Currently ${metaDesc.length} chars.` });
      score += 1;
    }
  } else {
    items.push({ label: 'Meta Description', status: 'fail', detail: 'No meta description found', recommendation: 'Add a compelling meta description that summarizes your page content and includes target keywords.' });
  }

  const h1s = $('h1');
  if (h1s.length === 1) {
    items.push({ label: 'H1 Heading', status: 'pass', detail: `"${h1s.first().text().trim().substring(0, 60)}"` });
    score += 2;
  } else if (h1s.length > 1) {
    items.push({ label: 'H1 Heading', status: 'warning', detail: `${h1s.length} H1 tags found`, recommendation: 'Use only one H1 tag per page. Multiple H1s dilute your primary keyword focus.' });
    score += 1;
  } else {
    items.push({ label: 'H1 Heading', status: 'fail', detail: 'No H1 heading found', recommendation: 'Add a single H1 heading that includes your primary keyword. This tells search engines what your page is about.' });
  }

  const canonical = $('link[rel="canonical"]').attr('href');
  if (canonical) {
    items.push({ label: 'Canonical URL', status: 'pass', detail: canonical.substring(0, 60) });
    score += 1;
  } else {
    items.push({ label: 'Canonical URL', status: 'warning', detail: 'No canonical tag found', recommendation: 'Add a canonical URL to prevent duplicate content issues and consolidate link equity.' });
  }

  const structuredData = $('script[type="application/ld+json"]');
  if (structuredData.length > 0) {
    const schemaTypes: string[] = [];
    structuredData.each((_, el) => {
      try {
        const json = JSON.parse($(el).text());
        const extractType = (obj: any): void => {
          if (obj['@type']) schemaTypes.push(obj['@type']);
          if (obj['@graph']) obj['@graph'].forEach(extractType);
        };
        extractType(json);
      } catch {}
    });
    const uniqueTypes = [...new Set(schemaTypes)];
    if (uniqueTypes.length >= 3) {
      items.push({ label: 'Structured Data', status: 'pass', detail: `${structuredData.length} schema(s) with ${uniqueTypes.length} types: ${uniqueTypes.slice(0, 5).join(', ')}` });
      score += 1;
    } else if (uniqueTypes.length > 0) {
      items.push({ label: 'Structured Data', status: 'warning', detail: `${uniqueTypes.length} schema type(s): ${uniqueTypes.join(', ')}`, recommendation: `Consider adding more structured data types (Organization, FAQPage, BreadcrumbList, Review) to enable rich search results.` });
      score += 0.5;
    } else {
      items.push({ label: 'Structured Data', status: 'warning', detail: `${structuredData.length} JSON-LD block(s) found but could not parse types`, recommendation: 'Ensure your JSON-LD structured data is valid. Test it at search.google.com/test/rich-results.' });
      score += 0.5;
    }
  } else {
    items.push({ label: 'Structured Data', status: 'fail', detail: 'No structured data found', recommendation: 'Add JSON-LD structured data (Organization, FAQPage, etc.) to enable rich search results with star ratings, FAQs, and more.' });
  }

  const metaKeywords = $('meta[name="keywords"]').attr('content');
  if (metaKeywords) {
    items.push({ label: 'Meta Keywords', status: 'pass', detail: `${metaKeywords.split(',').length} keywords defined` });
    score += 1;
  } else {
    items.push({ label: 'Meta Keywords', status: 'warning', detail: 'No meta keywords tag', recommendation: 'While Google doesn\'t use meta keywords for ranking, other search engines may. Add relevant keywords for broader coverage.' });
  }

  const robots = $('meta[name="robots"]').attr('content');
  if (robots && robots.includes('index')) {
    items.push({ label: 'Robots Meta', status: 'pass', detail: robots });
    score += 1;
  } else if (!robots) {
    items.push({ label: 'Robots Meta', status: 'pass', detail: 'Default (indexable)' });
    score += 1;
  } else {
    items.push({ label: 'Robots Meta', status: 'warning', detail: robots, recommendation: 'Your robots meta tag may be preventing search engines from indexing this page.' });
  }

  const h2s = $('h2');
  const h3s = $('h3');
  if (h1s.length > 0 && h2s.length >= 2) {
    items.push({ label: 'Heading Hierarchy', status: 'pass', detail: `H1: ${h1s.length}, H2: ${h2s.length}, H3: ${h3s.length} — good structure` });
    score += 1;
  } else if (h2s.length > 0) {
    items.push({ label: 'Heading Hierarchy', status: 'warning', detail: `H1: ${h1s.length}, H2: ${h2s.length}, H3: ${h3s.length}`, recommendation: 'Use a clear heading hierarchy (H1 → H2 → H3) to help search engines understand your content structure.' });
    score += 0.5;
  } else {
    items.push({ label: 'Heading Hierarchy', status: 'fail', detail: 'Missing heading structure', recommendation: 'Add H2 subheadings to organize your content. Search engines use heading hierarchy to understand page topics.' });
  }

  const internalLinks = $('a[href^="/"], a[href^="' + url + '"]');
  const externalLinks = $('a[href^="http"]').not('a[href^="' + url + '"]');
  if (internalLinks.length >= 3) {
    items.push({ label: 'Internal Links', status: 'pass', detail: `${internalLinks.length} internal links found` });
    score += 1;
  } else if (internalLinks.length > 0) {
    items.push({ label: 'Internal Links', status: 'warning', detail: `Only ${internalLinks.length} internal link(s)`, recommendation: 'Add more internal links to help search engines discover your pages and distribute link equity across your site.' });
    score += 0.5;
  } else {
    items.push({ label: 'Internal Links', status: 'warning', detail: 'No internal links detected', recommendation: 'Internal linking is crucial for SEO. Link to your other pages to help search engines crawl and index your site.' });
  }

  const urlIsClean = !url.includes('?') && !url.match(/[A-Z]/) && !url.includes('_');
  if (urlIsClean) {
    items.push({ label: 'URL Structure', status: 'pass', detail: 'Clean, lowercase URL with no special characters' });
    score += 1;
  } else {
    items.push({ label: 'URL Structure', status: 'warning', detail: 'URL could be cleaner', recommendation: 'Use lowercase, hyphen-separated URLs without query parameters for better SEO signals.' });
    score += 0.5;
  }

  const favicon = $('link[rel="icon"], link[rel="shortcut icon"]');
  if (favicon.length > 0) {
    items.push({ label: 'Favicon', status: 'pass', detail: 'Favicon configured' });
    score += 1;
  } else {
    items.push({ label: 'Favicon', status: 'warning', detail: 'No favicon found', recommendation: 'Add a favicon for brand recognition in browser tabs and search results.' });
  }

  return { name: 'SEO', icon: 'search', score: Math.round(score), maxScore, items };
}

function auditPerformance($: cheerio.CheerioAPI, html: string, responseTime: number, headers: Record<string, string>): AuditCategory {
  const items: AuditItem[] = [];
  let score = 0;
  const maxScore = 8;

  if (responseTime < 1000) {
    items.push({ label: 'Server Response Time', status: 'pass', detail: `${responseTime}ms — fast` });
    score += 2;
  } else if (responseTime < 3000) {
    items.push({ label: 'Server Response Time', status: 'warning', detail: `${responseTime}ms`, recommendation: `Server response time is ${responseTime}ms. Aim for under 1 second for best user experience.` });
    score += 1;
  } else {
    items.push({ label: 'Server Response Time', status: 'fail', detail: `${responseTime}ms — slow`, recommendation: `Server took ${responseTime}ms to respond. This hurts both SEO and user experience. Consider a CDN, better hosting, or server-side caching.` });
  }

  const htmlSize = Math.round(html.length / 1024);
  if (htmlSize < 100) {
    items.push({ label: 'Page Size (HTML)', status: 'pass', detail: `${htmlSize}KB` });
    score += 1;
  } else if (htmlSize < 300) {
    items.push({ label: 'Page Size (HTML)', status: 'warning', detail: `${htmlSize}KB`, recommendation: 'HTML is getting large. Consider code splitting, lazy loading, or reducing inline styles/scripts.' });
    score += 0.5;
  } else {
    items.push({ label: 'Page Size (HTML)', status: 'fail', detail: `${htmlSize}KB — heavy`, recommendation: `HTML document is ${htmlSize}KB. Large pages load slowly on mobile. Minimize inline CSS/JS and use code splitting.` });
  }

  const images = $('img');
  const imagesWithLazy = $('img[loading="lazy"]');
  if (images.length === 0) {
    items.push({ label: 'Image Lazy Loading', status: 'pass', detail: 'No images to optimize' });
    score += 1;
  } else if (imagesWithLazy.length >= images.length * 0.5) {
    items.push({ label: 'Image Lazy Loading', status: 'pass', detail: `${imagesWithLazy.length}/${images.length} images use lazy loading` });
    score += 1;
  } else {
    items.push({ label: 'Image Lazy Loading', status: 'warning', detail: `Only ${imagesWithLazy.length}/${images.length} images use lazy loading`, recommendation: 'Add loading="lazy" to images below the fold to improve initial page load speed.' });
    score += 0.5;
  }

  const scripts = $('script[src]');
  const asyncScripts = $('script[async], script[defer]');
  if (scripts.length === 0) {
    items.push({ label: 'Script Loading', status: 'pass', detail: 'No external scripts' });
    score += 1;
  } else if (asyncScripts.length >= scripts.length * 0.5) {
    items.push({ label: 'Script Loading', status: 'pass', detail: `${asyncScripts.length}/${scripts.length} scripts use async/defer` });
    score += 1;
  } else {
    items.push({ label: 'Script Loading', status: 'warning', detail: `${scripts.length} render-blocking scripts found`, recommendation: 'Add async or defer attributes to non-critical scripts to prevent them from blocking page rendering.' });
  }

  if (headers['content-encoding'] === 'gzip' || headers['content-encoding'] === 'br') {
    items.push({ label: 'Compression', status: 'pass', detail: `${headers['content-encoding']} compression enabled` });
    score += 1;
  } else {
    items.push({ label: 'Compression', status: 'warning', detail: 'No compression detected', recommendation: 'Enable Gzip or Brotli compression on your server to reduce transfer sizes by 60-80%.' });
  }

  const preconnects = $('link[rel="preconnect"]');
  if (preconnects.length > 0) {
    items.push({ label: 'Resource Hints', status: 'pass', detail: `${preconnects.length} preconnect hints found` });
    score += 1;
  } else {
    items.push({ label: 'Resource Hints', status: 'warning', detail: 'No preconnect hints', recommendation: 'Add <link rel="preconnect"> for third-party domains (fonts, CDNs) to speed up resource loading.' });
  }

  const inlineStyles = $('[style]');
  if (inlineStyles.length < 5) {
    items.push({ label: 'Inline Styles', status: 'pass', detail: `${inlineStyles.length} inline styles` });
    score += 1;
  } else {
    items.push({ label: 'Inline Styles', status: 'warning', detail: `${inlineStyles.length} inline styles found`, recommendation: 'Move inline styles to CSS classes for better caching and smaller HTML size.' });
  }

  return { name: 'Performance', icon: 'zap', score: Math.round(score), maxScore, items };
}

function auditMobile($: cheerio.CheerioAPI, html: string): AuditCategory {
  const items: AuditItem[] = [];
  let score = 0;
  const maxScore = 6;

  const viewport = $('meta[name="viewport"]').attr('content');
  if (viewport && viewport.includes('width=device-width')) {
    items.push({ label: 'Viewport Meta Tag', status: 'pass', detail: 'Properly configured' });
    score += 2;
  } else if (viewport) {
    items.push({ label: 'Viewport Meta Tag', status: 'warning', detail: viewport, recommendation: 'Set viewport to "width=device-width, initial-scale=1.0" for proper mobile scaling.' });
    score += 1;
  } else {
    items.push({ label: 'Viewport Meta Tag', status: 'fail', detail: 'No viewport meta tag found', recommendation: 'Add <meta name="viewport" content="width=device-width, initial-scale=1.0"> to make your site mobile-friendly. This is critical for mobile SEO.' });
  }

  const hasResponsiveCSS = html.includes('@media') || html.includes('responsive') || html.includes('flex') || html.includes('grid');
  if (hasResponsiveCSS) {
    items.push({ label: 'Responsive Design Indicators', status: 'pass', detail: 'Responsive CSS patterns detected' });
    score += 1;
  } else {
    items.push({ label: 'Responsive Design Indicators', status: 'warning', detail: 'No responsive CSS patterns detected', recommendation: 'Use CSS media queries, flexbox, or grid layouts to ensure your site adapts to all screen sizes.' });
  }

  const smallButtons = $('a, button').filter(function() {
    const fontSize = $(this).css('font-size');
    return fontSize ? parseInt(fontSize) < 12 : false;
  });
  const touchTargets = $('a, button').length;
  if (touchTargets > 0) {
    items.push({ label: 'Touch Targets', status: 'pass', detail: `${touchTargets} interactive elements found` });
    score += 1;
  }

  const textSizeAdjust = html.includes('-webkit-text-size-adjust') || html.includes('text-size-adjust');
  if (textSizeAdjust) {
    items.push({ label: 'Text Size Adjust', status: 'pass', detail: 'Text size adjustment configured' });
    score += 1;
  } else {
    items.push({ label: 'Text Size Adjust', status: 'warning', detail: 'No text-size-adjust found', recommendation: 'Add -webkit-text-size-adjust CSS property to prevent unexpected text scaling on mobile devices.' });
  }

  const appleIcon = $('link[rel="apple-touch-icon"]');
  if (appleIcon.length > 0) {
    items.push({ label: 'Apple Touch Icon', status: 'pass', detail: 'Apple touch icon configured' });
    score += 1;
  } else {
    items.push({ label: 'Apple Touch Icon', status: 'warning', detail: 'No apple-touch-icon', recommendation: 'Add an apple-touch-icon for a polished experience when users save your site to their home screen.' });
  }

  return { name: 'Mobile Friendliness', icon: 'smartphone', score, maxScore, items };
}

function auditSecurity($: cheerio.CheerioAPI, url: string, isHttps: boolean, headers: Record<string, string>): AuditCategory {
  const items: AuditItem[] = [];
  let score = 0;
  const maxScore = 6;

  if (isHttps) {
    items.push({ label: 'HTTPS/SSL', status: 'pass', detail: 'Site is served over HTTPS' });
    score += 2;
  } else {
    items.push({ label: 'HTTPS/SSL', status: 'fail', detail: 'Site is not using HTTPS', recommendation: 'Switch to HTTPS immediately. Google penalizes non-HTTPS sites, and browsers show "Not Secure" warnings that scare away visitors.' });
  }

  if (headers['strict-transport-security']) {
    items.push({ label: 'HSTS Header', status: 'pass', detail: 'HSTS enabled' });
    score += 1;
  } else {
    items.push({ label: 'HSTS Header', status: 'warning', detail: 'No HSTS header', recommendation: 'Add Strict-Transport-Security header to force HTTPS connections and prevent downgrade attacks.' });
  }

  if (headers['x-content-type-options']) {
    items.push({ label: 'X-Content-Type-Options', status: 'pass', detail: headers['x-content-type-options'] });
    score += 1;
  } else {
    items.push({ label: 'X-Content-Type-Options', status: 'warning', detail: 'Not set', recommendation: 'Add X-Content-Type-Options: nosniff header to prevent MIME type sniffing attacks.' });
  }

  if (headers['x-frame-options'] || headers['content-security-policy']?.includes('frame-ancestors')) {
    items.push({ label: 'Clickjacking Protection', status: 'pass', detail: 'Frame protection enabled' });
    score += 1;
  } else {
    items.push({ label: 'Clickjacking Protection', status: 'warning', detail: 'No frame protection', recommendation: 'Add X-Frame-Options or CSP frame-ancestors header to prevent your site from being embedded in malicious iframes.' });
  }

  if (headers['content-security-policy']) {
    items.push({ label: 'Content Security Policy', status: 'pass', detail: 'CSP header present' });
    score += 1;
  } else {
    items.push({ label: 'Content Security Policy', status: 'warning', detail: 'No CSP header', recommendation: 'Add a Content-Security-Policy header to control which resources browsers are allowed to load on your pages.' });
  }

  return { name: 'Security', icon: 'shield', score, maxScore, items };
}

function auditAccessibility($: cheerio.CheerioAPI): AuditCategory {
  const items: AuditItem[] = [];
  let score = 0;
  const maxScore = 6;

  const lang = $('html').attr('lang');
  if (lang) {
    items.push({ label: 'Language Attribute', status: 'pass', detail: `lang="${lang}"` });
    score += 1;
  } else {
    items.push({ label: 'Language Attribute', status: 'fail', detail: 'No lang attribute on <html>', recommendation: 'Add a lang attribute to your <html> tag (e.g., lang="en"). This helps screen readers and search engines understand your content language.' });
  }

  const images = $('img');
  const imagesWithAlt = $('img[alt]');
  const imagesWithEmptyAlt = $('img[alt=""]');
  const meaningful = imagesWithAlt.length - imagesWithEmptyAlt.length;
  if (images.length === 0) {
    items.push({ label: 'Image Alt Text', status: 'pass', detail: 'No images found' });
    score += 2;
  } else if (imagesWithAlt.length >= images.length * 0.9) {
    items.push({ label: 'Image Alt Text', status: 'pass', detail: `${imagesWithAlt.length}/${images.length} images have alt text` });
    score += 2;
  } else {
    items.push({ label: 'Image Alt Text', status: 'fail', detail: `Only ${imagesWithAlt.length}/${images.length} images have alt text`, recommendation: 'Add descriptive alt text to all images. This improves accessibility for screen readers AND helps Google understand your images for Image Search.' });
    score += Math.round((imagesWithAlt.length / images.length) * 2);
  }

  const ariaLabels = $('[aria-label], [aria-labelledby], [role]');
  if (ariaLabels.length >= 3) {
    items.push({ label: 'ARIA Attributes', status: 'pass', detail: `${ariaLabels.length} ARIA attributes found` });
    score += 1;
  } else if (ariaLabels.length > 0) {
    items.push({ label: 'ARIA Attributes', status: 'warning', detail: `Only ${ariaLabels.length} ARIA attribute(s)`, recommendation: 'Add ARIA labels to interactive elements like navigation, buttons, and form inputs for better screen reader support.' });
    score += 0.5;
  } else {
    items.push({ label: 'ARIA Attributes', status: 'warning', detail: 'No ARIA attributes found', recommendation: 'Add ARIA labels and roles to make your site accessible to users with disabilities. This also signals quality to search engines.' });
  }

  const semanticElements = $('header, nav, main, article, section, aside, footer');
  if (semanticElements.length >= 3) {
    items.push({ label: 'Semantic HTML', status: 'pass', detail: `${semanticElements.length} semantic elements found` });
    score += 1;
  } else {
    items.push({ label: 'Semantic HTML', status: 'warning', detail: `Only ${semanticElements.length} semantic element(s)`, recommendation: 'Use semantic HTML5 elements (header, nav, main, article, section, footer) instead of generic divs. This helps both accessibility and SEO.' });
  }

  const formLabels = $('label');
  const formInputs = $('input:not([type="hidden"]):not([type="submit"]):not([type="button"])');
  if (formInputs.length === 0) {
    items.push({ label: 'Form Labels', status: 'pass', detail: 'No form inputs to label' });
    score += 1;
  } else if (formLabels.length >= formInputs.length * 0.8) {
    items.push({ label: 'Form Labels', status: 'pass', detail: `${formLabels.length} labels for ${formInputs.length} inputs` });
    score += 1;
  } else {
    items.push({ label: 'Form Labels', status: 'warning', detail: `${formLabels.length} labels for ${formInputs.length} inputs`, recommendation: 'Associate labels with all form inputs using the for attribute or wrapping inputs in label tags.' });
  }

  return { name: 'Accessibility', icon: 'eye', score: Math.round(score), maxScore, items };
}

function auditSocial($: cheerio.CheerioAPI): AuditCategory {
  const items: AuditItem[] = [];
  let score = 0;
  const maxScore = 6;

  const ogTitle = $('meta[property="og:title"]').attr('content');
  const ogDesc = $('meta[property="og:description"]').attr('content');
  const ogImage = $('meta[property="og:image"]').attr('content');

  if (ogTitle) {
    items.push({ label: 'Open Graph Title', status: 'pass', detail: ogTitle.substring(0, 50) });
    score += 1;
  } else {
    items.push({ label: 'Open Graph Title', status: 'fail', detail: 'No og:title', recommendation: 'Add an og:title meta tag so your page looks great when shared on Facebook, LinkedIn, and other platforms.' });
  }

  if (ogDesc) {
    items.push({ label: 'Open Graph Description', status: 'pass', detail: `${ogDesc.length} chars` });
    score += 1;
  } else {
    items.push({ label: 'Open Graph Description', status: 'fail', detail: 'No og:description', recommendation: 'Add an og:description meta tag for compelling social media previews.' });
  }

  if (ogImage) {
    items.push({ label: 'Open Graph Image', status: 'pass', detail: 'Social share image set' });
    score += 1;
  } else {
    items.push({ label: 'Open Graph Image', status: 'fail', detail: 'No og:image', recommendation: 'Add an og:image meta tag with a 1200x630px image for eye-catching social media shares. Posts with images get 2-3x more engagement.' });
  }

  const twitterCard = $('meta[name="twitter:card"]').attr('content');
  if (twitterCard) {
    items.push({ label: 'Twitter Card', status: 'pass', detail: `Type: ${twitterCard}` });
    score += 1;
  } else {
    items.push({ label: 'Twitter Card', status: 'warning', detail: 'No Twitter Card', recommendation: 'Add Twitter Card meta tags for better appearance when shared on Twitter/X.' });
  }

  const twitterImage = $('meta[name="twitter:image"]').attr('content');
  if (twitterImage) {
    items.push({ label: 'Twitter Image', status: 'pass', detail: 'Twitter share image set' });
    score += 1;
  } else {
    items.push({ label: 'Twitter Image', status: 'warning', detail: 'No twitter:image', recommendation: 'Add a twitter:image meta tag for better visual appearance in Twitter/X shares.' });
  }

  const ogType = $('meta[property="og:type"]').attr('content');
  if (ogType) {
    items.push({ label: 'OG Type', status: 'pass', detail: ogType });
    score += 1;
  } else {
    items.push({ label: 'OG Type', status: 'warning', detail: 'No og:type', recommendation: 'Add an og:type meta tag (e.g., "website" or "article") for proper social media categorization.' });
  }

  return { name: 'Social Media', icon: 'share2', score, maxScore, items };
}

function auditContent($: cheerio.CheerioAPI, html: string): AuditCategory {
  const items: AuditItem[] = [];
  let score = 0;
  const maxScore = 8;

  const h1s = $('h1');
  const h2s = $('h2');
  const h3s = $('h3');
  const headingCount = h1s.length + h2s.length + h3s.length;
  if (headingCount >= 3) {
    items.push({ label: 'Heading Structure', status: 'pass', detail: `${h1s.length} H1, ${h2s.length} H2, ${h3s.length} H3` });
    score += 2;
  } else if (headingCount > 0) {
    items.push({ label: 'Heading Structure', status: 'warning', detail: `Only ${headingCount} heading(s)`, recommendation: 'Use a clear heading hierarchy (H1 → H2 → H3) to organize your content. This helps both users and search engines understand your page structure.' });
    score += 1;
  } else {
    items.push({ label: 'Heading Structure', status: 'fail', detail: 'No headings found', recommendation: 'Add headings (H1, H2, H3) to structure your content. Headings are one of the strongest on-page SEO signals.' });
  }

  const textContent = $('body').text().replace(/\s+/g, ' ').trim();
  const wordCount = textContent.split(' ').filter(w => w.length > 1).length;
  if (wordCount >= 300) {
    items.push({ label: 'Content Length', status: 'pass', detail: `~${wordCount} words` });
    score += 2;
  } else if (wordCount >= 100) {
    items.push({ label: 'Content Length', status: 'warning', detail: `~${wordCount} words`, recommendation: `Only ~${wordCount} words on the page. Aim for 300+ words of quality content to give search engines more to work with.` });
    score += 1;
  } else {
    items.push({ label: 'Content Length', status: 'fail', detail: `~${wordCount} words — very thin`, recommendation: 'Very little content for search engines to index. Add detailed, keyword-rich content to improve rankings.' });
  }

  const internalLinks = $('a[href^="/"], a[href^="./"], a[href^="#"]');
  const externalLinks = $('a[href^="http"]');
  if (internalLinks.length >= 3) {
    items.push({ label: 'Internal Links', status: 'pass', detail: `${internalLinks.length} internal links` });
    score += 1;
  } else {
    items.push({ label: 'Internal Links', status: 'warning', detail: `Only ${internalLinks.length} internal link(s)`, recommendation: 'Add more internal links to help search engines discover and understand the relationships between your pages.' });
  }

  const favicon = $('link[rel="icon"], link[rel="shortcut icon"]');
  if (favicon.length > 0) {
    items.push({ label: 'Favicon', status: 'pass', detail: 'Favicon configured' });
    score += 1;
  } else {
    items.push({ label: 'Favicon', status: 'warning', detail: 'No favicon', recommendation: 'Add a favicon for brand recognition in browser tabs and bookmarks.' });
  }

  const lists = $('ul, ol');
  if (lists.length > 0) {
    items.push({ label: 'Content Formatting', status: 'pass', detail: `${lists.length} list(s) used for readability` });
    score += 1;
  } else {
    items.push({ label: 'Content Formatting', status: 'warning', detail: 'No lists found', recommendation: 'Use bullet points and numbered lists to improve readability and increase chances of appearing in featured snippets.' });
  }

  const charset = $('meta[charset]');
  if (charset.length > 0) {
    items.push({ label: 'Character Encoding', status: 'pass', detail: `charset="${charset.attr('charset')}"` });
    score += 1;
  } else {
    items.push({ label: 'Character Encoding', status: 'warning', detail: 'No charset declared', recommendation: 'Add <meta charset="UTF-8"> to ensure proper text rendering across all browsers.' });
  }

  return { name: 'Content Quality', icon: 'fileText', score, maxScore, items };
}

function getGradeContext(grade: string, score: number, passCount: number, failCount: number): { gradeLabel: string; gradeSummary: string } {
  if (grade === 'A+' || grade === 'A') {
    return {
      gradeLabel: 'Excellent',
      gradeSummary: `Outstanding work! Your site passes ${passCount} checks and is well-optimized. Here are a few refinements to maintain your edge and stay ahead of competitors.`,
    };
  }
  if (grade === 'A-' || grade === 'B+') {
    return {
      gradeLabel: 'Very Good',
      gradeSummary: `Your site is performing well with ${passCount} checks passing. A few targeted improvements could push you into the top tier and give you a real competitive advantage.`,
    };
  }
  if (grade === 'B' || grade === 'B-') {
    return {
      gradeLabel: 'Good — Room to Grow',
      gradeSummary: `Solid foundation with ${passCount} checks passing, but ${failCount} issues are holding you back. Fixing these will noticeably improve your search rankings and user experience.`,
    };
  }
  if (grade === 'C+' || grade === 'C' || grade === 'C-') {
    return {
      gradeLabel: 'Needs Improvement',
      gradeSummary: `Your site has potential but ${failCount} critical issues need attention. These problems are likely costing you visitors and search rankings. The good news: most are straightforward fixes.`,
    };
  }
  if (grade === 'D') {
    return {
      gradeLabel: 'Below Average',
      gradeSummary: `Your site has significant issues with ${failCount} failing checks. These are actively hurting your online presence. Prioritize the critical fixes below to see immediate improvement.`,
    };
  }
  return {
    gradeLabel: 'Critical — Needs Urgent Attention',
    gradeSummary: `Your site has major problems across multiple areas with ${failCount} failing checks. Visitors and search engines are being turned away. Immediate action on the recommendations below is essential.`,
  };
}

function analyzeKeywords($: cheerio.CheerioAPI, url: string): { foundKeywords: string[]; suggestedKeywords: KeywordSuggestion[]; density: string } {
  const title = $('title').text().toLowerCase();
  const metaDesc = ($('meta[name="description"]').attr('content') || '').toLowerCase();
  const h1Text = $('h1').map((_, el) => $(el).text().toLowerCase()).get().join(' ');
  const h2Text = $('h2').map((_, el) => $(el).text().toLowerCase()).get().join(' ');
  const bodyText = $('body').text().toLowerCase().replace(/\s+/g, ' ');

  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'has', 'have', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'its', 'our', 'their', 'what', 'which', 'who', 'whom', 'when', 'where', 'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'about', 'above', 'after', 'again', 'also', 'am', 'as', 'because', 'before', 'between', 'from', 'get', 'got', 'here', 'if', 'into', 'new', 'now', 'off', 'out', 'over', 'then', 'up', 'use', 'way']);

  const words = bodyText.split(/[\s,.;:!?()[\]{}"']+/).filter(w => w.length > 3 && !stopWords.has(w) && !/^\d+$/.test(w));
  const freq: Record<string, number> = {};
  words.forEach(w => { freq[w] = (freq[w] || 0) + 1; });

  const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
  const topWords = sorted.slice(0, 15).map(([w]) => w);

  const twoGrams: Record<string, number> = {};
  for (let i = 0; i < words.length - 1; i++) {
    if (!stopWords.has(words[i]) && !stopWords.has(words[i + 1])) {
      const gram = `${words[i]} ${words[i + 1]}`;
      twoGrams[gram] = (twoGrams[gram] || 0) + 1;
    }
  }
  const topPhrases = Object.entries(twoGrams).filter(([_, c]) => c >= 2).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([p]) => p);

  const foundKeywords = [...topPhrases.slice(0, 5), ...topWords.slice(0, 5)].slice(0, 8);

  const totalWords = words.length;
  const topKeywordCount = sorted[0]?.[1] || 0;
  const density = totalWords > 0 ? `${((topKeywordCount / totalWords) * 100).toFixed(1)}% for "${sorted[0]?.[0] || 'n/a'}"` : 'Unable to calculate';

  const domain = new URL(url).hostname.replace('www.', '');

  const industryKeywords: Record<string, KeywordSuggestion[]> = {
    default: [
      { keyword: `${domain.split('.')[0]} services`, reason: 'Brand + service keyword for branded search visibility', priority: 'high' },
      { keyword: 'near me', reason: 'Location-based searches drive 76% of local visits within 24 hours', priority: 'high' },
      { keyword: 'best practices', reason: 'Educational intent keywords build authority and attract backlinks', priority: 'medium' },
      { keyword: 'how to', reason: 'Question-based keywords capture informational search intent', priority: 'medium' },
      { keyword: 'affordable', reason: 'Price-intent modifier that captures high-converting commercial searches', priority: 'medium' },
      { keyword: 'reviews', reason: 'Social proof keywords attract users in the decision-making stage', priority: 'low' },
      { keyword: `${new Date().getFullYear()} guide`, reason: 'Year-specific content signals freshness to search engines', priority: 'low' },
    ],
  };

  const suggestedKeywords: KeywordSuggestion[] = [];
  const allText = `${title} ${metaDesc} ${h1Text} ${h2Text}`;

  const suggestions = industryKeywords.default;
  for (const suggestion of suggestions) {
    if (!allText.includes(suggestion.keyword.toLowerCase()) && !bodyText.includes(suggestion.keyword.toLowerCase())) {
      suggestedKeywords.push(suggestion);
    }
  }

  if (!allText.includes('free') && !bodyText.slice(0, 2000).includes('free')) {
    suggestedKeywords.push({ keyword: 'free consultation', reason: 'High-converting CTA keyword — "free" triggers 2x more clicks in search results', priority: 'high' });
  }
  if (!allText.includes('professional')) {
    suggestedKeywords.push({ keyword: 'professional', reason: 'Trust-building modifier that improves click-through rates from search results', priority: 'medium' });
  }
  if (!allText.includes('custom') && !allText.includes('tailored')) {
    suggestedKeywords.push({ keyword: 'custom solutions', reason: 'Differentiation keyword that sets you apart from template-based competitors', priority: 'medium' });
  }

  return {
    foundKeywords,
    suggestedKeywords: suggestedKeywords.slice(0, 8),
    density,
  };
}

function analyzeBacklinks($: cheerio.CheerioAPI, url: string, html: string): BacklinkInsight[] {
  const insights: BacklinkInsight[] = [];
  const domain = new URL(url).hostname.replace('www.', '');

  const externalLinks = $('a[href^="http"]').filter((_, el) => {
    const href = $(el).attr('href') || '';
    try { return new URL(href).hostname.replace('www.', '') !== domain; } catch { return false; }
  });
  const nofollowLinks = $('a[rel*="nofollow"]');
  const internalLinks = $('a').not(externalLinks).filter((_, el) => {
    const href = $(el).attr('href') || '';
    return href.startsWith('/') || href.startsWith('#') || href.includes(domain);
  });

  if (externalLinks.length >= 3) {
    insights.push({
      label: 'Outbound Links',
      status: 'pass',
      detail: `${externalLinks.length} external links found — linking to quality sources builds trust with search engines`,
    });
  } else if (externalLinks.length > 0) {
    insights.push({
      label: 'Outbound Links',
      status: 'warning',
      detail: `Only ${externalLinks.length} outbound link(s) found`,
      recommendation: 'Link to 3-5 authoritative, relevant sources. This signals to Google that you\'re part of a trusted content neighborhood.',
    });
  } else {
    insights.push({
      label: 'Outbound Links',
      status: 'fail',
      detail: 'No outbound links to external sites',
      recommendation: 'Add links to authoritative sources in your industry. Pages that link out to quality content rank higher because Google sees them as more informative.',
    });
  }

  if (internalLinks.length >= 10) {
    insights.push({
      label: 'Internal Link Structure',
      status: 'pass',
      detail: `${internalLinks.length} internal links — strong site structure for search engine crawling`,
    });
  } else if (internalLinks.length >= 3) {
    insights.push({
      label: 'Internal Link Structure',
      status: 'warning',
      detail: `${internalLinks.length} internal links — could be stronger`,
      recommendation: 'Aim for 10+ internal links per page. Every page should link to related content, creating a web that search engines can easily crawl and understand.',
    });
  } else {
    insights.push({
      label: 'Internal Link Structure',
      status: 'fail',
      detail: `Only ${internalLinks.length} internal link(s)`,
      recommendation: 'Your internal linking is too thin. Add contextual links between related pages — this is one of the easiest ways to boost rankings for free.',
    });
  }

  const linksWithAnchors = $('a').filter((_, el) => {
    const text = $(el).text().trim();
    return text.length > 0 && text !== 'click here' && text !== 'read more' && text !== 'learn more' && text.length < 60;
  });
  const totalAnchors = $('a').filter((_, el) => $(el).text().trim().length > 0);
  if (totalAnchors.length > 0 && linksWithAnchors.length >= totalAnchors.length * 0.7) {
    insights.push({
      label: 'Anchor Text Quality',
      status: 'pass',
      detail: 'Most links use descriptive anchor text — helps search engines understand link context',
    });
  } else {
    insights.push({
      label: 'Anchor Text Quality',
      status: 'warning',
      detail: 'Some links use generic text like "click here" or "read more"',
      recommendation: 'Replace generic anchor text with descriptive keywords. Instead of "click here," use "view our web design portfolio." This gives search engines context about the linked page.',
    });
  }

  if (nofollowLinks.length > 0) {
    insights.push({
      label: 'Nofollow Usage',
      status: 'pass',
      detail: `${nofollowLinks.length} nofollow link(s) — properly managing link equity flow`,
    });
  }

  const hasShareButtons = html.includes('share') || html.includes('social') || $('[class*="share"], [class*="social"], [data-share]').length > 0;
  if (hasShareButtons) {
    insights.push({
      label: 'Social Sharing',
      status: 'pass',
      detail: 'Social sharing elements detected — encourages organic backlink growth',
    });
  } else {
    insights.push({
      label: 'Social Sharing',
      status: 'warning',
      detail: 'No social sharing buttons found',
      recommendation: 'Add social share buttons to your content. Shared content gets more visibility, which leads to natural backlinks from other websites.',
    });
  }

  const hasBlog = $('a[href*="blog"], a[href*="article"], a[href*="news"], a[href*="post"]').length > 0;
  if (hasBlog) {
    insights.push({
      label: 'Content Hub',
      status: 'pass',
      detail: 'Blog or content section detected — great for attracting organic backlinks',
    });
  } else {
    insights.push({
      label: 'Content Hub',
      status: 'warning',
      detail: 'No blog or content section found',
      recommendation: 'Start a blog or resource section. Regular, valuable content is the #1 way to attract natural backlinks. Even 2 posts per month can significantly impact rankings over time.',
    });
  }

  return insights;
}
