import type { TabType } from "../types";

const PAGE_INFO: Partial<Record<TabType, { title: string; description: string }>> = {
  translate: {
    title: "Translate",
    description: "Convert speech or text into sign language animations in real time.",
  },
  dictionary: {
    title: "Dictionary",
    description: "Search cached signs and gloss phrases, then reuse them in a translation.",
  },
  history: {
    title: "History",
    description: "Review, replay, or remove your past translations.",
  },
  feedback: {
    title: "Feedback",
    description: "Rate translations and share comments to help us improve them.",
  },
  account: {
    title: "Account",
    description: "Manage your login, profile, and security settings.",
  },
};

interface PageHeaderProps {
  activeTab: TabType;
}

export default function PageHeader({ activeTab }: PageHeaderProps) {
  const info = PAGE_INFO[activeTab];
  if (!info) return null;

  return (
    <div className="page-header mb-5 pb-4">
      <h1 className="text-xl font-bold tracking-tight">{info.title}</h1>
      <p className="mt-1 text-sm">{info.description}</p>
    </div>
  );
}
