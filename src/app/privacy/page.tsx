import Link from "next/link";
import Icon from "@/components/Icon";
import Image from "next/image";

export const metadata = {
  title: "Privacy Policy | KnotBook",
  description:
    "How KnotBook collects, uses, stores, and protects your personal data, and the rights you have under UK GDPR.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen linen-texture">
      {/* Header */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-background/80 border-b border-outline-variant/20">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/images/knotbook-logo-nav.png"
              alt="KnotBook"
              className="h-9 w-auto" width={400} height={400} />
          </Link>
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm font-label text-on-surface-variant hover:text-primary transition-colors"
          >
            <Icon name="arrow_back" className="text-base" />
            Home
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        {/* Title */}
        <div className="text-center mb-12">
          <p className="text-xs uppercase tracking-[0.25em] text-primary font-label font-medium mb-3">
            Legal
          </p>
          <h1 className="font-headline italic text-4xl sm:text-5xl text-on-surface mb-3">
            Privacy Policy
          </h1>
          <p className="text-sm font-label text-on-surface-variant">
            Last updated: 9 May 2026
          </p>
        </div>

        {/* Body */}
        <article className="bg-surface-container-lowest rounded-3xl ghost-border ambient-shadow p-8 sm:p-12 space-y-8 text-sm sm:text-base text-on-surface-variant leading-relaxed">
          <p>
            This Privacy Policy explains how <strong>KnotBook</strong>{" "}
            (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) collects,
            uses, stores, and protects your personal information when you use
            our website, web application, and related services (the
            &ldquo;Platform&rdquo;).
          </p>
          <p>
            We are committed to protecting your personal data in accordance with
            the <strong>UK General Data Protection Regulation (UK GDPR)</strong>{" "}
            and the <strong>Data Protection Act 2018</strong>. By using
            KnotBook, you agree to the practices described in this Policy.
          </p>

          <Section title="1. Who We Are">
            <p>
              KnotBook is the data controller responsible for your personal
              data. For any privacy-related queries, you can contact us at{" "}
              <a
                href="mailto:admin@knotbook.co.uk"
                className="text-primary hover:underline"
              >
                admin@knotbook.co.uk
              </a>
              .
            </p>
          </Section>

          <Section title="2. Information We Collect">
            <h3 className="font-headline text-lg text-on-surface mt-2">
              2.1 Information You Provide
            </h3>
            <ul className="list-disc pl-6 space-y-1 mt-1">
              <li>
                <strong>Account details</strong> &mdash; name, email address,
                password (stored hashed), and account type (individual or
                planner).
              </li>
              <li>
                <strong>Wedding planning content</strong> &mdash; wedding date,
                venue, budget figures, guest lists, allergies/diets, vendor
                information, outfits, mood boards, seating plans, tasks,
                timelines, checklists, and any other content you upload or
                enter.
              </li>
              <li>
                <strong>Planner client data</strong> &mdash; if you are a
                wedding planner, information you input about your clients.
              </li>
              <li>
                <strong>Communications</strong> &mdash; messages, feedback, and
                support requests you send to us.
              </li>
            </ul>

            <h3 className="font-headline text-lg text-on-surface mt-4">
              2.2 Payment Information
            </h3>
            <p>
              Payments are processed by <strong>Stripe</strong>. We do not
              store full card details on our servers. Stripe provides us with
              limited information such as last four digits, card brand,
              subscription status, and billing events.
            </p>

            <h3 className="font-headline text-lg text-on-surface mt-4">
              2.3 Information Collected Automatically
            </h3>
            <ul className="list-disc pl-6 space-y-1 mt-1">
              <li>Device and browser type</li>
              <li>IP address and approximate location</li>
              <li>Pages visited and actions taken on the Platform</li>
              <li>Timestamps of activity (login, edits, uploads)</li>
              <li>Cookies and similar technologies (see Section 7)</li>
            </ul>

            <h3 className="font-headline text-lg text-on-surface mt-4">
              2.4 Guest and Third-Party Data
            </h3>
            <p>
              When you upload information about wedding guests, vendors, or
              clients, you confirm you have the right to do so. You are
              responsible for ensuring those individuals are aware of how their
              data will be used in connection with your wedding planning.
            </p>
          </Section>

          <Section title="3. How We Use Your Information">
            <p>We use your personal data to:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Provide and operate the Platform and its features</li>
              <li>Authenticate users and secure accounts</li>
              <li>Process subscriptions, payments, and refunds</li>
              <li>Send transactional emails (account, billing, reminders)</li>
              <li>
                Send optional marketing emails (only with your consent &mdash;
                you can opt out at any time)
              </li>
              <li>Respond to support requests and feedback</li>
              <li>Improve the Platform and develop new features</li>
              <li>
                Detect, prevent, and investigate fraud, abuse, or violations of
                our Terms
              </li>
              <li>Comply with legal obligations</li>
            </ul>
          </Section>

          <Section title="4. Lawful Bases for Processing">
            <p>
              Under UK GDPR, we process your personal data on the following
              lawful bases:
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>
                <strong>Contract</strong> &mdash; to provide the services you
                signed up for.
              </li>
              <li>
                <strong>Legitimate interests</strong> &mdash; to operate,
                secure, and improve our Platform, provided your rights do not
                override these interests.
              </li>
              <li>
                <strong>Consent</strong> &mdash; for marketing communications
                and optional cookies. You may withdraw consent at any time.
              </li>
              <li>
                <strong>Legal obligation</strong> &mdash; where we are required
                to retain or disclose data by law.
              </li>
            </ul>
          </Section>

          <Section title="5. How We Share Your Information">
            <p>
              We do <strong>not</strong> sell your personal data. We share data
              only with trusted service providers who help us operate the
              Platform:
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>
                <strong>Stripe</strong> &mdash; payment processing
              </li>
              <li>
                <strong>Resend</strong> &mdash; transactional and notification
                emails
              </li>
              <li>
                <strong>Cloudinary</strong> &mdash; image storage and
                delivery
              </li>
              <li>
                <strong>Hosting and infrastructure providers</strong> &mdash;
                to host the Platform and store data
              </li>
            </ul>
            <p className="mt-3">
              These providers are bound by their own privacy and security
              obligations and may only process data on our instructions.
            </p>
            <p className="mt-3">
              We may also disclose information where required by law, court
              order, or to protect our legal rights.
            </p>
          </Section>

          <Section title="6. International Transfers">
            <p>
              Some of our service providers may process data outside the United
              Kingdom or European Economic Area. Where this happens, we ensure
              appropriate safeguards are in place, such as the UK International
              Data Transfer Agreement or Standard Contractual Clauses.
            </p>
          </Section>

          <Section title="7. Cookies">
            <p>
              We use cookies and similar technologies to keep you signed in,
              remember preferences, and understand how the Platform is used.
            </p>
            <p className="mt-3">Categories of cookies:</p>
            <ul className="list-disc pl-6 space-y-1 mt-1">
              <li>
                <strong>Strictly necessary</strong> &mdash; required for login,
                security, and core functionality.
              </li>
              <li>
                <strong>Functional</strong> &mdash; remember your preferences.
              </li>
              <li>
                <strong>Analytics</strong> &mdash; help us understand usage
                patterns (used only with your consent where required).
              </li>
            </ul>
            <p className="mt-3">
              You can control cookies through your browser settings. Disabling
              strictly necessary cookies may prevent the Platform from working
              correctly.
            </p>
          </Section>

          <Section title="8. Data Retention">
            <p>We retain your personal data only for as long as necessary:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>
                <strong>Active accounts</strong> &mdash; for the duration of
                your subscription, subject to the 3-year planning access limit
                described in our Terms.
              </li>
              <li>
                <strong>Inactive or closed accounts</strong> &mdash; data may
                be retained for up to 12 months after closure, then deleted or
                anonymised.
              </li>
              <li>
                <strong>Billing and tax records</strong> &mdash; retained for
                up to 7 years to comply with UK financial laws.
              </li>
              <li>
                <strong>Backups</strong> &mdash; may be retained for a limited
                period before automatic overwrite.
              </li>
            </ul>
          </Section>

          <Section title="9. Your Rights">
            <p>Under UK GDPR, you have the right to:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Access the personal data we hold about you</li>
              <li>Request correction of inaccurate or incomplete data</li>
              <li>
                Request deletion of your data (right to be forgotten), subject
                to legal exceptions
              </li>
              <li>Restrict or object to certain processing</li>
              <li>Request portability of your data in a machine-readable format</li>
              <li>Withdraw consent at any time where processing is based on consent</li>
              <li>
                Lodge a complaint with the{" "}
                <strong>Information Commissioner&rsquo;s Office (ICO)</strong>{" "}
                at{" "}
                <a
                  href="https://ico.org.uk"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  ico.org.uk
                </a>
              </li>
            </ul>
            <p className="mt-3">
              To exercise any of these rights, email{" "}
              <a
                href="mailto:admin@knotbook.co.uk"
                className="text-primary hover:underline"
              >
                admin@knotbook.co.uk
              </a>
              . We will respond within one calendar month.
            </p>
          </Section>

          <Section title="10. Security">
            <p>We protect your data through measures including:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>HTTPS/TLS encryption for all traffic</li>
              <li>Hashed and salted password storage</li>
              <li>Access controls and authenticated sessions</li>
              <li>Reputable infrastructure and payment providers</li>
              <li>Periodic review of security practices</li>
            </ul>
            <p className="mt-3">
              No system is 100% secure. While we take reasonable steps to
              protect your information, we cannot guarantee absolute security.
            </p>
          </Section>

          <Section title="11. Children">
            <p>
              KnotBook is not intended for anyone under{" "}
              <strong>18 years old</strong>. We do not knowingly collect
              personal data from children. If you believe a child has provided
              us with personal data, contact us and we will remove it.
            </p>
          </Section>

          <Section title="12. Marketing">
            <p>
              We will only send marketing emails with your consent. Every
              marketing email contains an unsubscribe link, and you may opt out
              at any time without affecting transactional emails (such as
              billing or security notifications).
            </p>
          </Section>

          <Section title="13. Third-Party Links">
            <p>
              The Platform may contain links to third-party websites (e.g.,
              vendor sites). We are not responsible for the privacy practices
              of those sites, and we encourage you to review their privacy
              policies separately.
            </p>
          </Section>

          <Section title="14. Changes to This Policy">
            <p>
              We may update this Policy from time to time. The &ldquo;Last
              updated&rdquo; date at the top reflects the latest version.
              Significant changes will be notified by email or through the
              Platform.
            </p>
          </Section>

          <Section title="15. Contact">
            <p>
              For any questions about this Privacy Policy or how we handle your
              data:
            </p>
            <p className="mt-2">
              Email:{" "}
              <a
                href="mailto:admin@knotbook.co.uk"
                className="text-primary hover:underline"
              >
                admin@knotbook.co.uk
              </a>
            </p>
          </Section>
        </article>

        <p className="text-center text-xs font-label text-on-surface-variant/60 mt-8">
          By using KnotBook you confirm that you have read and understood this
          Privacy Policy.
        </p>
      </main>

      <footer className="text-center py-8 px-6 text-xs text-on-surface-variant/40 font-label">
        KnotBook &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="font-headline text-2xl text-on-surface mb-3">{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}
