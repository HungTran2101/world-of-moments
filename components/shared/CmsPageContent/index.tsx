import type { ReactNode } from "react";

export function CmsPageContent({ children }: { children: ReactNode }) {
  return <div className="cms-pageContent">{children}</div>;
}
