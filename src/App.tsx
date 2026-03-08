import { CRM } from "@/components/atomic-crm/root/CRM";

const dealStages = [
  { value: "new-inquiry", label: "New Inquiry" },
  { value: "discovery-call-scheduled", label: "Discovery Call Scheduled" },
  { value: "proposal-sent", label: "Proposal Sent" },
  { value: "negotiation", label: "Negotiation" },
  { value: "closed-won", label: "Closed Won" },
  { value: "closed-lost", label: "Closed Lost" },
];

const dealPipelineStatuses = ["closed-won"];

const dealCategories = [
  { value: "workshop", label: "Saturday Workshop" },
  { value: "academy", label: "AI Empire Academy" },
  { value: "certification", label: "AI Systems Architect Certification" },
  { value: "corporate", label: "Corporate Consulting" },
];

const App = () => (
  <CRM
    title="Doctor AI CRM"
    dealStages={dealStages}
    dealPipelineStatuses={dealPipelineStatuses}
    dealCategories={dealCategories}
  />
);

export default App;
