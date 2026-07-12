import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy notice" };

export default function PrivacyPage() {
  const serviceName = process.env.NEXT_PUBLIC_SERVICE_NAME || "Jonas Web Studio";
  const contactEmail = process.env.NEXT_PUBLIC_SERVICE_EMAIL || process.env.PUBLIC_CONTACT_TO_EMAIL || "the contact address shown on this website";
  return (
    <article className="legal-page stack">
      <p className="eyebrow">PRIVACY NOTICE</p>
      <h1>How website inquiries are handled</h1>
      <p>Last updated: July 11, 2026</p>
      <h2>Controller</h2>
      <p>{serviceName}. Privacy questions can be sent to {contactEmail}.</p>
      <h2>Information collected</h2>
      <p>When you use the contact or estimate form, the service may collect your name, company, email address, phone number, current website, project selections, free-text message, submission time and basic technical anti-spam information.</p>
      <h2>Why it is used</h2>
      <p>The information is used to answer your request, prepare an estimate or proposal, manage the potential customer relationship, prevent abuse and keep a record of communications.</p>
      <h2>Legal basis</h2>
      <p>Processing is based on taking steps at your request before entering into a contract and on the legitimate interest of operating and protecting the inquiry service. Where consent is required for a specific optional function, it will be requested separately.</p>
      <h2>Storage and service providers</h2>
      <p>Inquiry information is stored in the private customer-management database. Hosting, database, email and anti-spam providers may process information only as necessary to provide their services. Provider locations and retention should be reviewed when production accounts are configured.</p>
      <h2>Retention</h2>
      <p>Unsuccessful sales inquiries should be removed when they are no longer reasonably needed. Customer and accounting records may need to be retained for longer periods required by law.</p>
      <h2>Your rights</h2>
      <p>You may request access, correction or deletion of your personal information, object to certain processing, or ask for processing to be restricted. You may also contact the relevant data-protection authority.</p>
      <h2>Cookies and analytics</h2>
      <p>The basic website and estimate calculator do not require advertising cookies. If optional analytics or other non-essential tracking is enabled later, an appropriate consent mechanism and updated notice should be added before activation.</p>
      <p><a className="buttonlike" href="/">return to the website</a></p>
    </article>
  );
}
