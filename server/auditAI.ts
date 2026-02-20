import OpenAI from "openai";
import type { AuditResult } from "./audit";

function getOpenAIClient(): OpenAI | null {
  const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({
    apiKey,
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || undefined,
  });
}

export interface AIAuditInsights {
  businessImpact: Record<string, string>;
  businessSummaryItems: Array<{
    title: string;
    detail: string;
  }>;
  quickWins: string;
  topRecommendationsIntro: string;
}

export async function generateAIAuditInsights(audit: AuditResult): Promise<AIAuditInsights> {
  const failingItems = audit.categories.flatMap(c =>
    c.items.filter(i => i.status !== 'pass').map(i => ({
      label: i.label,
      status: i.status,
      detail: i.detail,
      category: c.name,
    }))
  );
  const passingItems = audit.categories.flatMap(c =>
    c.items.filter(i => i.status === 'pass').map(i => ({
      label: i.label,
      category: c.name,
    }))
  );

  const domain = new URL(audit.url).hostname;

  const prompt = `You are a web audit expert writing a personalized PDF report for ${domain} (score: ${audit.overallScore}/100, grade: ${audit.grade}).

FAILING/WARNING items:
${JSON.stringify(failingItems, null, 1)}

PASSING items:
${JSON.stringify(passingItems.map(i => i.label), null, 1)}

Categories with scores:
${audit.categories.map(c => `${c.name}: ${Math.round((c.score / c.maxScore) * 100)}%`).join('\n')}

Generate personalized content for the PDF report. Be specific to ${domain} — reference their actual results. Write in a professional but approachable tone that conveys urgency without being pushy.

Return a JSON object with these exact fields:

1. "businessImpact" — An object mapping each audit item label (both failing AND passing) to a 1-2 sentence "Why This Matters" explanation personalized to ${domain}. For failing items, explain what they're losing. For passing items, give a brief positive acknowledgment. Use these exact item labels as keys: ${[...failingItems, ...passingItems].map(i => i.label).join(', ')}

2. "businessSummaryItems" — An array of exactly 3 objects with "title" and "detail" fields. These appear on the "What This Means for Your Business" page. Each should be specific to ${domain}'s audit results:
   - First: About visitor/customer impact based on their specific failing items
   - Second: About search engine visibility based on their SEO/performance scores
   - Third: About revenue opportunity with concrete improvement estimates

3. "quickWins" — A 2-3 sentence paragraph identifying the top 3 easiest fixes for ${domain} and their expected impact. Be specific about which items to fix first.

4. "topRecommendationsIntro" — A one-sentence personalized intro for the priority action items page, referencing ${domain}'s specific situation.

Return ONLY valid JSON, no markdown fences.`;

  try {
    const openai = getOpenAIClient();
    if (!openai) {
      console.log("No OpenAI API key configured, using static fallback for audit insights");
      return getStaticFallback(audit);
    }
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 3000,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("Empty AI response");

    const parsed = JSON.parse(content) as AIAuditInsights;

    if (!parsed.businessImpact || typeof parsed.businessImpact !== 'object') {
      throw new Error("Missing businessImpact");
    }
    if (!Array.isArray(parsed.businessSummaryItems) || parsed.businessSummaryItems.length < 1) {
      throw new Error("Missing businessSummaryItems");
    }

    return parsed;
  } catch (err) {
    console.error("AI audit insights generation failed, using fallback:", err);
    return getStaticFallback(audit);
  }
}

function getStaticFallback(audit: AuditResult): AIAuditInsights {
  const failCount = audit.categories.reduce((sum, c) => sum + c.items.filter(i => i.status === 'fail').length, 0);

  const staticImpact: Record<string, string> = {
    'Page Title': 'A strong title tag is the #1 factor for click-through rates in search results. Businesses with optimized titles see 20-30% more organic traffic.',
    'Meta Description': 'Your meta description is your "ad copy" in Google results. A compelling description can double your click-through rate from search.',
    'H1 Heading': 'Search engines use H1 tags to understand your page topic. A clear H1 helps Google rank you for the right keywords, driving qualified leads.',
    'Canonical URL': 'Without a canonical tag, search engines may split your ranking power across duplicate URLs, weakening your position in results.',
    'Structured Data': 'Structured data enables rich snippets (stars, FAQs, prices) in Google results. Sites with rich snippets get up to 58% more clicks.',
    'Meta Keywords': 'While Google ignores meta keywords, other search engines like Bing still consider them. Every bit of visibility helps.',
    'Heading Hierarchy': 'A clear heading structure helps both users and search engines scan your content. Well-organized pages keep visitors 2-3x longer.',
    'Internal Links': 'Internal linking spreads ranking power across your site and helps Google discover all your pages.',
    'Server Response Time': 'Every second of load time costs you 7% in conversions. Speed is a direct Google ranking factor.',
    'HTML Size': 'Lean HTML loads faster on mobile networks. Fast-loading pages rank higher and convert better.',
    'Image Optimization': 'Unoptimized images are the #1 cause of slow websites. Properly optimized images can cut page load time by 50%.',
    'Compression': 'Gzip/Brotli compression reduces file sizes by 70-90%. This means faster loads and better search rankings.',
    'Browser Caching': 'Without caching headers, returning visitors re-download everything. Good caching makes repeat visits nearly instant.',
    'Viewport Meta Tag': 'Without a viewport tag, your site looks broken on mobile. Google penalizes sites that aren\'t mobile-friendly.',
    'Responsive Design': 'Over 60% of web traffic is mobile. A responsive design ensures you\'re not losing half your potential customers.',
    'Touch-Friendly Elements': 'Mobile users need tap targets at least 44px. Small buttons cause frustration and abandonment.',
    'Font Readability': 'If text is too small on mobile, users bounce immediately. Readable fonts keep visitors engaged.',
    'HTTPS': 'Google marks non-HTTPS sites as "Not Secure" in Chrome, which scares away 85% of visitors.',
    'Security Headers': 'Security headers protect your visitors from attacks and signal to Google that your site is trustworthy.',
    'Mixed Content': 'Mixed content triggers browser warnings that destroy user trust and can block your content from loading.',
    'Alt Text': 'Alt text makes images accessible to screen readers and helps Google understand your images.',
    'Language Attribute': 'The lang attribute helps screen readers pronounce content correctly and helps search engines serve your site to the right audience.',
    'ARIA Landmarks': 'ARIA landmarks improve navigation for assistive technology users. Accessible sites also tend to have better SEO.',
    'Open Graph Tags': 'When someone shares your site on social media, OG tags control how it looks. Good previews get 2-3x more clicks.',
    'Twitter Card Tags': 'Twitter Cards make your links stand out in feeds with images and descriptions.',
    'Social Share Links': 'Making it easy to share your content amplifies your reach organically. Every share is free marketing.',
    'Content Length': 'Pages with 1,000+ words rank significantly better in Google. Comprehensive content establishes authority.',
    'Readability': 'Content written at an 8th-grade reading level converts best. Simple, clear writing keeps visitors engaged.',
    'Link Quality': 'Quality links signal credibility. Every broken link is a missed opportunity to guide visitors and search engines.',
  };

  return {
    businessImpact: staticImpact,
    businessSummaryItems: [
      {
        title: failCount > 3 ? 'You\'re Losing Potential Customers' : failCount > 0 ? 'Some Visitors May Be Leaving' : 'Your Site is Retaining Visitors Well',
        detail: failCount > 3
          ? `With ${failCount} critical issues, your website is likely turning away visitors before they convert.`
          : failCount > 0
          ? `You have ${failCount} issue(s) that could be costing you leads. Fixing these is often the fastest path to more conversions.`
          : 'Your site has a solid foundation. Small optimizations can still yield meaningful improvements.',
      },
      {
        title: 'Search Engine Visibility',
        detail: audit.overallScore >= 75
          ? `With a score of ${audit.overallScore}/100, search engines can effectively crawl and rank your site.`
          : `A score of ${audit.overallScore}/100 means search engines are having trouble understanding your site. This is fixable.`,
      },
      {
        title: 'Revenue Impact',
        detail: 'Every 1-second improvement in page speed increases conversions by 7%. Proper SEO can increase organic traffic by 50-100% within 6 months.',
      },
    ],
    quickWins: 'The items marked "Critical" in this report are your biggest opportunities. Fixing just the top 3 issues typically improves your overall score by 15-25 points and can noticeably increase traffic within weeks.',
    topRecommendationsIntro: 'Fix these first for the biggest impact on your traffic and conversions',
  };
}
