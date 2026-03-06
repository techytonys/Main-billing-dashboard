import { Shield, ArrowLeft } from "lucide-react";
import { usePageMeta } from "@/hooks/use-page-title";

export default function PrivacyPolicy() {
  usePageMeta("Privacy Policy", "Read our privacy policy. Learn how AI Powered Sites collects, uses, and protects your personal data.", "https://aipoweredsites.com/privacy");
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <a href="/" className="inline-flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 mb-8" data-testid="link-back-home">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </a>

        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
            <Shield className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold" style={{ fontFamily: "Poppins, sans-serif" }}>Privacy Policy</h1>
            <p className="text-sm text-slate-400">Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
          </div>
        </div>

        <div className="prose prose-invert prose-slate max-w-none space-y-8">
          <section>
            <p className="text-slate-300 leading-relaxed text-lg">
              AI Powered Sites ("we," "us," or "our") operates the website aipoweredsites.com (the "Site"). This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our Site, use our services, or subscribe to our communications.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white border-b border-slate-700/50 pb-2">1. Information We Collect</h2>
            <h3 className="text-lg font-medium text-slate-200 mt-4">Personal Information</h3>
            <p className="text-slate-300 leading-relaxed">We may collect the following personal information when you voluntarily provide it to us:</p>
            <ul className="list-disc list-inside text-slate-300 space-y-1 ml-2">
              <li>Full name (first and last name)</li>
              <li>Email address</li>
              <li>Phone/mobile number</li>
              <li>Company or business name</li>
              <li>Website URL</li>
              <li>City and state of residence</li>
              <li>Service interests and preferences</li>
              <li>Referral source (how you found us)</li>
              <li>Payment and billing information (processed securely via Stripe)</li>
            </ul>

            <h3 className="text-lg font-medium text-slate-200 mt-4">Automatically Collected Information</h3>
            <p className="text-slate-300 leading-relaxed">When you visit our Site, we automatically collect certain information, including:</p>
            <ul className="list-disc list-inside text-slate-300 space-y-1 ml-2">
              <li>IP address</li>
              <li>Browser type and version</li>
              <li>Operating system and device type</li>
              <li>Pages visited, time spent on pages, and navigation paths</li>
              <li>Referring website or source (including UTM parameters)</li>
              <li>Click events, form submissions, and interaction data</li>
              <li>Session duration and frequency of visits</li>
            </ul>

            <h3 className="text-lg font-medium text-slate-200 mt-4">SMS Consent Data</h3>
            <p className="text-slate-300 leading-relaxed">When you opt in to receive SMS messages, we record and securely store:</p>
            <ul className="list-disc list-inside text-slate-300 space-y-1 ml-2">
              <li>Your express written consent and the exact consent text you agreed to</li>
              <li>Timestamp of when consent was given</li>
              <li>IP address at the time of consent</li>
              <li>Browser/user agent information</li>
              <li>The method through which consent was obtained (e.g., web form)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white border-b border-slate-700/50 pb-2">2. How We Use Your Information</h2>
            <p className="text-slate-300 leading-relaxed">We use the information we collect for the following purposes:</p>
            <ul className="list-disc list-inside text-slate-300 space-y-1 ml-2">
              <li>To provide, maintain, and improve our web design and development services</li>
              <li>To process payments and manage invoices via Stripe</li>
              <li>To send transactional emails (invoices, project updates, support replies) via Resend</li>
              <li>To send SMS messages you have consented to receive via Twilio</li>
              <li>To send email newsletters you have subscribed to</li>
              <li>To respond to your inquiries, support tickets, and quote requests</li>
              <li>To analyze website traffic and improve user experience through our analytics system</li>
              <li>To generate AI-powered website audit reports when requested</li>
              <li>To detect and prevent fraud, abuse, or security issues</li>
              <li>To comply with legal obligations, including TCPA and CAN-SPAM requirements</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white border-b border-slate-700/50 pb-2">3. Cookies and Tracking Technologies</h2>
            <p className="text-slate-300 leading-relaxed">We use the following cookies and tracking technologies:</p>

            <h3 className="text-lg font-medium text-slate-200 mt-4">Essential Cookies</h3>
            <ul className="list-disc list-inside text-slate-300 space-y-1 ml-2">
              <li><strong className="text-white">Session Cookie (connect.sid)</strong> — Required for authentication and maintaining your login session. This cookie is strictly necessary for the Site to function and cannot be disabled. It expires when you close your browser or after a period of inactivity.</li>
            </ul>

            <h3 className="text-lg font-medium text-slate-200 mt-4">Analytics Tracking</h3>
            <ul className="list-disc list-inside text-slate-300 space-y-1 ml-2">
              <li><strong className="text-white">First-Party Analytics</strong> — We use our own built-in analytics system (not Google Analytics or any third-party analytics service) to track page views, clicks, form submissions, session duration, and traffic sources. This data is stored in our own database and is never shared with or sold to third parties.</li>
              <li><strong className="text-white">Session Tracking</strong> — We generate a random session ID stored in your browser's localStorage to group your page views into a single visit. This is not a cookie and contains no personal information.</li>
            </ul>

            <h3 className="text-lg font-medium text-slate-200 mt-4">Link Tracking</h3>
            <p className="text-slate-300 leading-relaxed">
              We may use tracked links (short URLs) in our social media and marketing content. When you click a tracked link, we record the click along with basic device information (browser, OS) before redirecting you to the destination. No personal information is collected through link tracking unless you are already identified (e.g., logged in).
            </p>

            <h3 className="text-lg font-medium text-slate-200 mt-4">Managing Cookies</h3>
            <p className="text-slate-300 leading-relaxed">
              You can control cookies through your browser settings. Disabling the session cookie will prevent you from logging into admin or client portal areas but will not affect your ability to browse the public pages of our Site.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white border-b border-slate-700/50 pb-2">4. SMS Messaging Policy</h2>
            <p className="text-slate-300 leading-relaxed">By opting in to our SMS messaging program, you agree to the following:</p>
            <ul className="list-disc list-inside text-slate-300 space-y-1 ml-2">
              <li>You will receive recurring SMS messages from AI Powered Sites at the phone number you provided</li>
              <li>Message frequency varies based on your account activity and the communications you have opted into</li>
              <li>Message and data rates may apply depending on your carrier and plan</li>
              <li>You can opt out at any time by replying <strong className="text-white">STOP</strong> to any message</li>
              <li>You can get help by replying <strong className="text-white">HELP</strong> to any message or by emailing hello@aipoweredsites.com</li>
              <li>Consent to receive SMS messages is not a condition of purchasing any goods or services</li>
              <li>We will never sell, rent, or share your phone number with third parties for marketing purposes</li>
              <li>Your consent records are maintained in compliance with TCPA (Telephone Consumer Protection Act) requirements and may be provided to carriers or regulators upon request</li>
            </ul>
            <p className="text-slate-300 leading-relaxed mt-2">
              Types of SMS messages you may receive include: project updates, invoice notifications, payment confirmations, support ticket replies, promotional offers, and community updates.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white border-b border-slate-700/50 pb-2">5. Third-Party Services</h2>
            <p className="text-slate-300 leading-relaxed">We use the following third-party services that may process your data:</p>
            <ul className="list-disc list-inside text-slate-300 space-y-2 ml-2">
              <li><strong className="text-white">Stripe</strong> — Payment processing. Stripe collects and processes your payment card information directly. We never see or store your full card number. See <a href="https://stripe.com/privacy" className="text-indigo-400 hover:text-indigo-300 underline" target="_blank" rel="noopener noreferrer">Stripe's Privacy Policy</a>.</li>
              <li><strong className="text-white">Resend</strong> — Email delivery service for transactional emails and newsletters. See <a href="https://resend.com/legal/privacy-policy" className="text-indigo-400 hover:text-indigo-300 underline" target="_blank" rel="noopener noreferrer">Resend's Privacy Policy</a>.</li>
              <li><strong className="text-white">Twilio</strong> — SMS messaging delivery. See <a href="https://www.twilio.com/en-us/legal/privacy" className="text-indigo-400 hover:text-indigo-300 underline" target="_blank" rel="noopener noreferrer">Twilio's Privacy Policy</a>.</li>
              <li><strong className="text-white">OpenAI</strong> — AI-powered website audit report generation. Website data submitted for audits may be processed by OpenAI. See <a href="https://openai.com/privacy" className="text-indigo-400 hover:text-indigo-300 underline" target="_blank" rel="noopener noreferrer">OpenAI's Privacy Policy</a>.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white border-b border-slate-700/50 pb-2">6. Data Retention</h2>
            <p className="text-slate-300 leading-relaxed">
              We retain your personal information for as long as necessary to provide our services, comply with legal obligations, resolve disputes, and enforce our agreements. Specifically:
            </p>
            <ul className="list-disc list-inside text-slate-300 space-y-1 ml-2">
              <li>Account and project data: Retained for the duration of our business relationship plus 3 years</li>
              <li>Invoice and payment records: Retained for 7 years for tax and legal compliance</li>
              <li>SMS consent records: Retained for a minimum of 5 years per TCPA requirements</li>
              <li>Analytics data: Retained for 2 years, then aggregated or deleted</li>
              <li>Support ticket data: Retained for 3 years after ticket resolution</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white border-b border-slate-700/50 pb-2">7. Data Security</h2>
            <p className="text-slate-300 leading-relaxed">
              We implement appropriate technical and organizational measures to protect your personal information, including:
            </p>
            <ul className="list-disc list-inside text-slate-300 space-y-1 ml-2">
              <li>HTTPS/TLS encryption for all data in transit</li>
              <li>Secure password hashing for account credentials</li>
              <li>Session-based authentication with secure, httpOnly cookies</li>
              <li>Firewall protection and automated security updates on our servers</li>
              <li>Fail2Ban intrusion prevention for SSH access</li>
              <li>Regular database backups</li>
            </ul>
            <p className="text-slate-300 leading-relaxed mt-2">
              While we strive to protect your personal information, no method of transmission over the Internet or electronic storage is 100% secure. We cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white border-b border-slate-700/50 pb-2">8. Your Rights</h2>
            <p className="text-slate-300 leading-relaxed">You have the right to:</p>
            <ul className="list-disc list-inside text-slate-300 space-y-1 ml-2">
              <li>Access the personal information we hold about you</li>
              <li>Request correction of inaccurate personal information</li>
              <li>Request deletion of your personal information (subject to legal retention requirements)</li>
              <li>Opt out of marketing emails by clicking "unsubscribe" in any email</li>
              <li>Opt out of SMS messages by replying STOP to any message</li>
              <li>Withdraw consent for data processing at any time</li>
            </ul>
            <p className="text-slate-300 leading-relaxed mt-2">
              To exercise any of these rights, please contact us at <a href="mailto:hello@aipoweredsites.com" className="text-indigo-400 hover:text-indigo-300 underline">hello@aipoweredsites.com</a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white border-b border-slate-700/50 pb-2">9. Children's Privacy</h2>
            <p className="text-slate-300 leading-relaxed">
              Our services are not directed to individuals under the age of 18. We do not knowingly collect personal information from children. If you believe we have collected information from a child, please contact us immediately.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white border-b border-slate-700/50 pb-2">10. Changes to This Policy</h2>
            <p className="text-slate-300 leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new Privacy Policy on this page and updating the "Last updated" date. Your continued use of the Site after changes constitutes acceptance of the revised policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white border-b border-slate-700/50 pb-2">11. Contact Us</h2>
            <p className="text-slate-300 leading-relaxed">
              If you have any questions about this Privacy Policy, please contact us:
            </p>
            <ul className="list-none text-slate-300 space-y-1 ml-2 mt-2">
              <li><strong className="text-white">Email:</strong> <a href="mailto:hello@aipoweredsites.com" className="text-indigo-400 hover:text-indigo-300 underline">hello@aipoweredsites.com</a></li>
              <li><strong className="text-white">Website:</strong> <a href="https://aipoweredsites.com" className="text-indigo-400 hover:text-indigo-300 underline">aipoweredsites.com</a></li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
