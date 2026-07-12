import type { Metadata } from "next";

export const metadata: Metadata = { title: "Service terms" };

export default function TermsPage() {
  const serviceName = process.env.NEXT_PUBLIC_SERVICE_NAME || "Jonas Web Studio";
  return (
    <article className="legal-page stack">
      <p className="eyebrow">SERVICE TERMS</p>
      <h1>General website-project terms</h1>
      <p>Last updated: July 11, 2026</p>
      <p>These are general public terms for {serviceName}. Every paid project should also have a written proposal or contract describing its exact scope, price and schedule. The project-specific agreement takes priority if it conflicts with these general terms.</p>
      <h2>Estimates</h2>
      <p>Calculator results are non-binding planning ranges. A final price is confirmed only after requirements, content, integrations and responsibilities are reviewed.</p>
      <h2>Scope and revisions</h2>
      <p>The proposal defines included pages, functions, content work, revision rounds and delivery items. Work outside the agreed scope requires a separate estimate or written approval.</p>
      <h2>Client responsibilities</h2>
      <p>The client provides accurate business information, lawful content, necessary account access and timely approvals. Delays in content or approvals may move the launch date.</p>
      <h2>Payments</h2>
      <p>Deposits, milestones, invoice dates and late-payment terms are stated in the proposal. Third-party fees such as domains, paid APIs, messaging, booking, email and payment processing are separate unless expressly included.</p>
      <h2>Ownership and accounts</h2>
      <p>Recommended practice is for the client to own the domain and production service accounts, with the developer invited as a manager. Source-code ownership, licences and transfer timing must be stated in the proposal. Open-source and third-party components remain subject to their own licences.</p>
      <h2>Hosting and maintenance</h2>
      <p>Hosting platforms and external services may experience outages or change their pricing and terms. A maintenance plan covers only the work specifically listed in that plan. Handoff projects remain the client’s responsibility after the agreed support period.</p>
      <h2>Results</h2>
      <p>No specific search ranking, traffic, sales or revenue result is guaranteed. The service is responsible for delivering the agreed work professionally, not for factors outside its control.</p>
      <h2>Cancellation</h2>
      <p>Cancellation terms, payment for completed work and delivery of unfinished materials should be defined in the project agreement.</p>
      <p><a className="buttonlike" href="/">return to the website</a></p>
    </article>
  );
}
