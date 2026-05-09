import Link from "next/link";
import Icon from "@/components/Icon";
import Image from "next/image";

export const metadata = {
  title: "Terms & Conditions | KnotBook",
  description:
    "KnotBook Terms and Conditions governing access to and use of the platform.",
};

export default function TermsPage() {
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
            Terms &amp; Conditions
          </h1>
          <p className="text-sm font-label text-on-surface-variant">
            Last updated: 24 April 2026
          </p>
        </div>

        {/* Body */}
        <article className="bg-surface-container-lowest rounded-3xl ghost-border ambient-shadow p-8 sm:p-12 space-y-8 text-sm sm:text-base text-on-surface-variant leading-relaxed">
          <p>
            These Terms and Conditions (&ldquo;Terms&rdquo;) govern your access
            to and use of <strong>KnotBook</strong> (&ldquo;we&rdquo;, &ldquo;us
            &rdquo;, or &ldquo;our&rdquo;), including our website, web
            application, and related services (the &ldquo;Platform&rdquo;).
          </p>
          <p>
            By accessing or using KnotBook, you agree to be bound by these
            Terms. If you do not agree, you must not use the Platform.
          </p>

          <Section title="1. About KnotBook">
            <p>
              KnotBook is an online wedding planning platform providing digital
              tools to assist:
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Individuals planning their own wedding or event; and</li>
              <li>
                Professional wedding planners managing weddings for clients.
              </li>
            </ul>
            <p className="mt-3">
              KnotBook provides planning, tracking, and organisational tools
              only. We do <strong>not</strong> provide wedding services, act as
              an agent, or guarantee vendors, venues, or outcomes.
            </p>
          </Section>

          <Section title="2. Eligibility">
            <p>
              You must be at least <strong>18 years old</strong> to use the
              Platform and legally capable of entering into a binding agreement.
            </p>
          </Section>

          <Section title="3. Accounts and Access">
            <h3 className="font-headline text-lg text-on-surface mt-2">
              3.1 One Account Per User
            </h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Each account is for single user access only.</li>
              <li>You may not share your login details with any other person.</li>
              <li>You may not allow third parties to access your account.</li>
              <li>You may not sell, rent, lease, or otherwise transfer your account.</li>
            </ul>
            <h3 className="font-headline text-lg text-on-surface mt-4">
              3.2 Account Security
            </h3>
            <p>You are responsible for:</p>
            <ul className="list-disc pl-6 space-y-1 mt-1">
              <li>Keeping your login details confidential</li>
              <li>All activity that occurs under your account</li>
            </ul>
            <p className="mt-3">
              If we reasonably believe your account is being shared or misused,
              we reserve the right to{" "}
              <strong>
                suspend or permanently terminate access without refund
              </strong>
              .
            </p>
          </Section>

          <Section title="4. Planning Time Limit (3-Year Access Rule)">
            <p>
              Access to KnotBook for wedding planning purposes is limited to a{" "}
              <strong>maximum of three (3) years</strong> per account from the
              date of activation or first paid subscription.
            </p>
            <p className="mt-3">This limit exists to:</p>
            <ul className="list-disc pl-6 space-y-1 mt-1">
              <li>Prevent account sharing or misuse</li>
              <li>Ensure fair use of the Platform</li>
              <li>Maintain platform integrity</li>
            </ul>
            <p className="mt-3">After the 3-year period:</p>
            <ul className="list-disc pl-6 space-y-1 mt-1">
              <li>Access may be restricted, archived, or closed</li>
              <li>
                Continued access may require a new subscription (if offered at
                that time)
              </li>
            </ul>
            <p className="mt-3">
              Unused time is <strong>not transferable</strong> to other users or
              accounts.
            </p>
          </Section>

          <Section title="5. User Types">
            <h3 className="font-headline text-lg text-on-surface mt-2">
              5.1 Individual Users
            </h3>
            <p>
              Individual users may use the Platform for{" "}
              <strong>personal planning purposes only</strong>.
            </p>
            <h3 className="font-headline text-lg text-on-surface mt-4">
              5.2 Wedding Planner Users
            </h3>
            <p>
              Wedding planners may use the Platform for{" "}
              <strong>commercial purposes</strong> in connection with their
              clients.
            </p>
            <p className="mt-3">
              KnotBook is <strong>not a party</strong> to any agreements between
              wedding planners and their clients and accepts no liability for
              those relationships.
            </p>
          </Section>

          <Section title="6. Free Trial">
            <ul className="list-disc pl-6 space-y-1">
              <li>
                We offer a <strong>3-day free trial</strong> for new users.
              </li>
              <li>
                You will <strong>not be charged</strong> if you cancel within
                the first 3 days.
              </li>
              <li>
                If you continue using the Platform{" "}
                <strong>beyond the 3-day trial period</strong>, you will
                automatically be charged according to the selected plan.
              </li>
              <li>
                Partial usage (even one additional day) after the trial ends
                will result in full charge.
              </li>
              <li>
                It is your responsibility to cancel before the trial ends.
              </li>
            </ul>
          </Section>

          <Section title="7. Payments, Cancellations & Refunds">
            <h3 className="font-headline text-lg text-on-surface mt-2">
              7.1 Payments
            </h3>
            <p>
              All fees are payable in advance and displayed at the point of
              purchase.
            </p>
            <h3 className="font-headline text-lg text-on-surface mt-4">
              7.2 Cancellation Policy
            </h3>
            <p>
              You may cancel your subscription at any time via your account
              settings.
            </p>
            <p className="mt-3">Upon cancellation:</p>
            <ul className="list-disc pl-6 space-y-1 mt-1">
              <li>You will retain access until the end of your current billing period</li>
              <li>No further charges will be taken</li>
            </ul>
            <h3 className="font-headline text-lg text-on-surface mt-4">
              7.3 Refund Policy
            </h3>
            <p>Except where required by law:</p>
            <ul className="list-disc pl-6 space-y-1 mt-1">
              <li>Subscription fees are non-refundable</li>
              <li>No refunds are provided for:
                <ul className="list-disc pl-6 mt-1 space-y-0.5">
                  <li>Partial use</li>
                  <li>Unused time</li>
                  <li>Failure to cancel before renewal</li>
                  <li>Account suspension or termination due to misuse</li>
                </ul>
              </li>
            </ul>
            <p className="mt-3">
              Refunds are not issued for violations of these Terms, including
              account sharing.
            </p>
          </Section>

          <Section title="8. Cultural Planning Tools Disclaimer">
            <p>
              KnotBook may offer cultural planning templates or suggestions
              (including British, South Asian, and Arab wedding styles).
            </p>
            <p className="mt-3">These tools:</p>
            <ul className="list-disc pl-6 space-y-1 mt-1">
              <li>Are for general planning guidance only</li>
              <li>Do not constitute cultural, religious, or legal advice</li>
              <li>May not reflect all traditions or expectations</li>
            </ul>
            <p className="mt-3">
              Users are responsible for ensuring accuracy and appropriateness
              for their events.
            </p>
          </Section>

          <Section title="9. User Content">
            <p>You retain ownership of content you upload.</p>
            <p className="mt-3">
              By using the Platform, you grant KnotBook a limited licence to
              store, process, and display your content for service operation.
            </p>
            <p className="mt-3">You must not upload content that:</p>
            <ul className="list-disc pl-6 space-y-1 mt-1">
              <li>Infringes intellectual property</li>
              <li>Is unlawful, offensive, or misleading</li>
              <li>Contains personal data without consent</li>
            </ul>
          </Section>

          <Section title="10. Platform Availability">
            <p>
              We do not guarantee uninterrupted service and may carry out
              maintenance or updates at any time.
            </p>
          </Section>

          <Section title="11. Suspension and Termination">
            <p>
              We may suspend or terminate your account immediately if you:
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-1">
              <li>Share login details</li>
              <li>Attempt to give platform access to others</li>
              <li>Breach these Terms</li>
              <li>Engage in misuse or fraudulent behaviour</li>
            </ul>
            <p className="mt-3">
              Termination for breach may occur <strong>without refund</strong>.
            </p>
          </Section>

          <Section title="12. Limitation of Liability">
            <p>
              To the maximum extent permitted by law, KnotBook shall not be
              liable for indirect or consequential losses, including
              event-related costs or vendor issues.
            </p>
            <p className="mt-3">
              Our total liability shall not exceed the amount paid by you in
              the preceding 12 months.
            </p>
          </Section>

          <Section title="13. Governing Law">
            <p>
              These Terms are governed by the laws of{" "}
              <strong>England and Wales</strong>, and the courts of England and
              Wales shall have exclusive jurisdiction.
            </p>
          </Section>

          <Section title="14. Contact">
            <p>
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
          By using KnotBook you confirm that you have read and accept these
          Terms.
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
