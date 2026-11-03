import "./index.scss";

import type { ReactNode } from "react";

export function CmsPageContent({ children }: { children: ReactNode }) {
  return <div className="Cms-pageContent">{children}</div>;
}
