import { FileText, ArrowLeft } from "lucide-react";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <a href="/" className="inline-flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 mb-8" data-testid="link-back-home">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </a>

        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
            <FileText className="w-6 h-6 text-violet-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold" style={{ fontFamily: "Poppins, sans-serif" }}>Terms of Service</h1>
            <p className="text-sm text-slate-400">Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
          </div>
        </div>

        <div className="prose prose-invert prose-slate max-w-none space-y-8">
          <section>
            <p className="text-slate-300 leading-relaxed text-lg">
              These Terms of Service ("Terms") govern your access to and use of the website aipoweredsites.com (the "Site") and the services provided by AI Powered Sites ("we," "us," or "our"). By accessing or using the Site, you agree to be bound by these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white border-b border-slate-700/50 pb-2">1. Services</h2>
            <p className="text-slate-300 leading-relaxed">
              AI Powered Sites provides web design, web development, and related digital services including but not limited to:
            </p>
            <ul className="list-disc list-inside text-slate-300 space-y-1 ml-2">
              <li>Custom website design and development</li>
              <li>Web application development</li>
              <li>Community forum development</li>
              <li>Backend system and API development</li>
              <li>Docker deployment and DevOps services</li>
              <li>SEO and marketing services</li>
              <li>AI-powered website audits</li>
              <li>Ongoing maintenance and support</li>
              <li>Server provisioning and hosting management</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white border-b border-slate-700/50 pb-2">2. Client Portal</h2>
            <p className="text-slate-300 leading-relaxed">
              If you are a client, you may be provided access to a secure client portal where you can:
            </p>
            <ul className="list-disc list-inside text-slate-300 space-y-1 ml-2">
              <li>View invoices and payment history</li>
              <li>Make payments via Stripe</li>
              <li>Set up and manage payment plans</li>
              <li>Track project progress</li>
              <li>Submit and track support tickets</li>
              <li>Access knowledge base articles</li>
              <li>Provision and manage servers</li>
            </ul>
            <p className="text-slate-300 leading-relaxed mt-2">
              You are responsible for maintaining the confidentiality of your portal access link. Do not share your portal URL with unauthorized individuals. Notify us immediately if you believe your portal access has been compromised.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white border-b border-slate-700/50 pb-2">3. Payments and Billing</h2>
            <p className="text-slate-300 leading-relaxed">Our billing model is based on per-deliverable pricing:</p>
            <ul className="list-disc list-inside text-slate-300 space-y-1 ml-2">
              <li>You are billed per unit of work (pages designed, features built, revisions made, etc.) at rates agreed upon before work begins</li>
              <li>Invoices are generated for completed work and are due by the date specified on the invoice</li>
              <li>Late payments may incur overdue notices and may result in suspension of services</li>
              <li>Payment plans are available for larger projects and can be set up through the client portal</li>
              <li>All payments are processed securely through Stripe. We never see or store your full payment card details</li>
              <li>Refunds are handled on a case-by-case basis and must be requested within 30 days of payment</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white border-b border-slate-700/50 pb-2">4. Quotes and Proposals</h2>
            <p className="text-slate-300 leading-relaxed">
              Quotes provided through our quote builder are estimates and are valid for 30 days from the date of issue unless otherwise stated. A quote becomes a binding agreement only when you formally accept it through the quote approval process. We reserve the right to adjust pricing if the project scope changes materially from the original quote.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white border-b border-slate-700/50 pb-2">5. SMS Messaging Terms</h2>
            <p className="text-slate-300 leading-relaxed">By opting in to receive SMS messages from AI Powered Sites, you acknowledge and agree to the following:</p>
            <ul className="list-disc list-inside text-slate-300 space-y-1 ml-2">
              <li>You consent to receive recurring automated SMS messages from AI Powered Sites at the mobile number you provided</li>
              <li>Message types include: project updates, invoice notifications, payment confirmations, payment plan reminders, support ticket replies, promotional offers, community updates, and quote notifications</li>
              <li>Message frequency varies based on your account activity and the types of communications you have opted into</li>
              <li>Standard message and data rates may apply. Contact your wireless carrier for details about your messaging plan</li>
              <li>You may opt out of SMS messages at any time by replying <strong className="text-white">STOP</strong> to any message. You will receive a one-time confirmation message after opting out</li>
              <li>For help, reply <strong className="text-white">HELP</strong> to any message or email us at hello@aipoweredsites.com</li>
              <li>Consent to receive SMS messages is not required as a condition of purchasing any goods or services from AI Powered Sites</li>
              <li>We will not sell, rent, or share your phone number with third parties for their marketing purposes</li>
              <li>Your opt-in consent is logged in compliance with TCPA (Telephone Consumer Protection Act) regulations, including timestamp, IP address, consent text, and the method of consent</li>
              <li>Supported carriers include but are not limited to: AT&T, T-Mobile, Verizon, Sprint, and all major US carriers. Service may not be available on all carriers</li>
              <li>We are not responsible for delayed or undelivered messages due to carrier network issues</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white border-b border-slate-700/50 pb-2">6. Email Communications</h2>
            <p className="text-slate-300 leading-relaxed">
              By providing your email address, you may receive:
            </p>
            <ul className="list-disc list-inside text-slate-300 space-y-1 ml-2">
              <li>Transactional emails related to your account, invoices, and projects (these are not marketing and cannot be unsubscribed from as they are necessary for service delivery)</li>
              <li>Newsletter emails if you have subscribed to our mailing list</li>
              <li>Support ticket notifications and replies</li>
              <li>Quote proposals and updates</li>
            </ul>
            <p className="text-slate-300 leading-relaxed mt-2">
              You can unsubscribe from marketing emails at any time by clicking the "unsubscribe" link in any email. This will not affect transactional emails related to your account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white border-b border-slate-700/50 pb-2">7. Website Audit Tool</h2>
            <p className="text-slate-300 leading-relaxed">
              Our free AI-powered website audit tool analyzes publicly accessible website data to provide recommendations. By submitting a website URL for audit:
            </p>
            <ul className="list-disc list-inside text-slate-300 space-y-1 ml-2">
              <li>You confirm you have the right to submit that URL for analysis</li>
              <li>The audit results are generated by AI and should be considered recommendations, not guarantees</li>
              <li>Audit reports may be stored for our records and to improve our services</li>
              <li>We are not liable for any actions taken based on audit recommendations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white border-b border-slate-700/50 pb-2">8. Community</h2>
            <p className="text-slate-300 leading-relaxed">
              If you participate in our community features, you agree to:
            </p>
            <ul className="list-disc list-inside text-slate-300 space-y-1 ml-2">
              <li>Not post harmful, offensive, defamatory, or illegal content</li>
              <li>Not spam, harass, or impersonate other users</li>
              <li>Not share confidential or proprietary information belonging to others</li>
              <li>Respect other community members and engage constructively</li>
            </ul>
            <p className="text-slate-300 leading-relaxed mt-2">
              We reserve the right to remove content and suspend or terminate accounts that violate these guidelines without notice.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white border-b border-slate-700/50 pb-2">9. Intellectual Property</h2>
            <p className="text-slate-300 leading-relaxed">
              Unless otherwise agreed upon in writing:
            </p>
            <ul className="list-disc list-inside text-slate-300 space-y-1 ml-2">
              <li>All content on the Site (text, graphics, logos, code, designs) is owned by AI Powered Sites and is protected by copyright and intellectual property laws</li>
              <li>Work product created for clients (websites, applications, designs) becomes the property of the client upon full payment of all outstanding invoices</li>
              <li>We reserve the right to use completed projects in our portfolio unless a non-disclosure agreement is in place</li>
              <li>Open-source components used in client projects remain under their respective licenses</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white border-b border-slate-700/50 pb-2">10. Limitation of Liability</h2>
            <p className="text-slate-300 leading-relaxed">
              To the maximum extent permitted by law, AI Powered Sites shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, use, goodwill, or other intangible losses, resulting from:
            </p>
            <ul className="list-disc list-inside text-slate-300 space-y-1 ml-2">
              <li>Your access to or use of (or inability to access or use) the Site or services</li>
              <li>Any unauthorized access to or use of our servers or any personal information stored therein</li>
              <li>Any interruption or cessation of transmission to or from the Site</li>
              <li>Any bugs, viruses, or other harmful code that may be transmitted through the Site</li>
              <li>Delays in SMS or email message delivery</li>
              <li>Actions taken based on AI-generated audit recommendations</li>
            </ul>
            <p className="text-slate-300 leading-relaxed mt-2">
              Our total liability for any claim arising from or relating to these Terms or our services shall not exceed the total amount paid by you to us in the 12 months preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white border-b border-slate-700/50 pb-2">11. Indemnification</h2>
            <p className="text-slate-300 leading-relaxed">
              You agree to indemnify, defend, and hold harmless AI Powered Sites and its officers, directors, employees, and agents from any claims, damages, losses, liabilities, and expenses (including legal fees) arising from your use of the Site, violation of these Terms, or infringement of any third-party rights.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white border-b border-slate-700/50 pb-2">12. Termination</h2>
            <p className="text-slate-300 leading-relaxed">
              We may terminate or suspend your access to the Site and services at any time, with or without cause, and with or without notice. Upon termination, your right to use the Site ceases immediately. Provisions that by their nature should survive termination shall survive, including ownership, warranty disclaimers, indemnity, and limitations of liability.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white border-b border-slate-700/50 pb-2">13. Governing Law</h2>
            <p className="text-slate-300 leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of the United States, without regard to conflict of law principles. Any disputes arising from these Terms shall be resolved through binding arbitration or in the courts of competent jurisdiction.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white border-b border-slate-700/50 pb-2">14. Changes to These Terms</h2>
            <p className="text-slate-300 leading-relaxed">
              We reserve the right to modify these Terms at any time. We will provide notice of material changes by posting the updated Terms on this page and updating the "Last updated" date. Your continued use of the Site after changes constitutes acceptance of the revised Terms. We encourage you to review these Terms periodically.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white border-b border-slate-700/50 pb-2">15. Contact Us</h2>
            <p className="text-slate-300 leading-relaxed">
              If you have questions about these Terms, please contact us:
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
