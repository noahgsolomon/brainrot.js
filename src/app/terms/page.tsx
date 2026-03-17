import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Terms of Service for Brainrot.js — the rules and guidelines for using our AI brainrot video generator and maker.",
  alternates: {
    canonical: "https://brainrotjs.com/terms",
  },
  openGraph: {
    title: "Terms of Service | Brainrot.js",
    description:
      "Terms of Service for Brainrot.js — the rules and guidelines for using our platform.",
    url: "https://brainrotjs.com/terms",
    type: "website",
  },
};

export default function TermsOfService() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="mb-8 text-4xl font-bold">Terms of Service</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        Last updated: March 12, 2026
      </p>

      <div className="space-y-6 text-muted-foreground">
        <section>
          <h2 className="mb-2 text-xl font-semibold text-foreground">
            1. Acceptance of Terms
          </h2>
          <p>
            By accessing or using brainrot.js, you agree to be bound by these
            Terms of Service. If you do not agree to these terms, do not use the
            service.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-foreground">
            2. Description of Service
          </h2>
          <p>
            brainrot.js is an AI-powered platform that generates short-form
            videos from text prompts. We provide tools to create, customize, and
            share video content.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-foreground">
            3. User Accounts
          </h2>
          <p>
            You are responsible for maintaining the confidentiality of your
            account credentials and for all activities that occur under your
            account. You must provide accurate information when creating an
            account.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-foreground">
            4. Acceptable Use
          </h2>
          <p>You agree not to:</p>
          <ul className="ml-6 mt-2 list-disc space-y-1">
            <li>Use the service for any unlawful purpose</li>
            <li>Generate content that is harmful, abusive, or hateful</li>
            <li>Attempt to reverse-engineer or exploit the service</li>
            <li>Interfere with or disrupt the service</li>
            <li>Violate any applicable laws or regulations</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-foreground">
            5. Content Ownership
          </h2>
          <p>
            You retain ownership of the prompts and topics you provide. Videos
            generated through our service may be used, shared, and distributed by
            you. We reserve the right to use anonymized, aggregated data to
            improve our service.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-foreground">
            6. Payment and Credits
          </h2>
          <p>
            Some features require credits or a paid subscription. All purchases
            are final unless otherwise required by law. We reserve the right to
            change pricing at any time with notice.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-foreground">
            7. Limitation of Liability
          </h2>
          <p>
            brainrot.js is provided &quot;as is&quot; without warranties of any
            kind. We are not liable for any indirect, incidental, or
            consequential damages arising from your use of the service.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-foreground">
            8. Termination
          </h2>
          <p>
            We may suspend or terminate your access to the service at any time,
            with or without cause. You may delete your account at any time
            through your account settings.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-foreground">
            9. Changes to Terms
          </h2>
          <p>
            We reserve the right to modify these terms at any time. Continued use
            of the service after changes constitutes acceptance of the updated
            terms.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-foreground">
            10. Contact Us
          </h2>
          <p>
            If you have any questions about these terms, please reach out to us
            on Twitter{" "}
            <a
              href="https://twitter.com/brainrotjs"
              className="text-pink-500 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              @brainrotjs
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
