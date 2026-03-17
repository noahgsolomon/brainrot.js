import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Privacy Policy for Brainrot.js — learn how we collect, use, and protect your data when you use our AI brainrot video generator.",
  alternates: {
    canonical: "https://brainrotjs.com/privacy",
  },
  openGraph: {
    title: "Privacy Policy | Brainrot.js",
    description:
      "Privacy Policy for Brainrot.js — learn how we collect, use, and protect your data.",
    url: "https://brainrotjs.com/privacy",
    type: "website",
  },
};

export default function PrivacyPolicy() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="mb-8 text-4xl font-bold">Privacy Policy</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        Last updated: March 12, 2026
      </p>

      <div className="space-y-6 text-muted-foreground">
        <section>
          <h2 className="mb-2 text-xl font-semibold text-foreground">
            1. Information We Collect
          </h2>
          <p>
            When you use brainrot.js, we collect information you provide directly
            to us, such as your name, email address, and account credentials when
            you sign up. We also collect usage data like the videos you generate
            and your interaction with the service.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-foreground">
            2. How We Use Your Information
          </h2>
          <p>We use the information we collect to:</p>
          <ul className="ml-6 mt-2 list-disc space-y-1">
            <li>Provide, maintain, and improve our services</li>
            <li>Process your video generation requests</li>
            <li>Send you technical notices and support messages</li>
            <li>Respond to your comments and questions</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-foreground">
            3. Sharing of Information
          </h2>
          <p>
            We do not sell your personal information. We may share your
            information with third-party service providers that help us operate
            our service (e.g., hosting, payment processing, analytics).
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-foreground">
            4. Data Security
          </h2>
          <p>
            We take reasonable measures to help protect your personal information
            from loss, theft, misuse, and unauthorized access. However, no method
            of transmission over the internet is 100% secure.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-foreground">
            5. Cookies
          </h2>
          <p>
            We use cookies and similar technologies to keep you logged in,
            remember your preferences, and understand how you use our service.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-foreground">
            6. Your Rights
          </h2>
          <p>
            You may request access to, correction of, or deletion of your
            personal data at any time by contacting us. You can also delete your
            account through your account settings.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-foreground">
            7. Changes to This Policy
          </h2>
          <p>
            We may update this privacy policy from time to time. We will notify
            you of any changes by posting the new policy on this page.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-foreground">
            8. Contact Us
          </h2>
          <p>
            If you have any questions about this privacy policy, please reach out
            to us on Twitter{" "}
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
