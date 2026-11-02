import "./index.scss";

import type { ReactNode } from "react";

export function Header({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <header className="Cms-header">
      <h1>{title}</h1>
      <div className="Cms-headerActions">{children}</div>
    </header>
  );
}
