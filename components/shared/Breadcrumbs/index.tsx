import "./index.scss";

import Link from "next/link";

export function Breadcrumbs({
  items,
  label,
}: {
  items: { label: string; href?: string }[];
  label: string;
}) {
  return (
    <nav className="Cms-breadcrumbs" aria-label={label}>
      <ol>
        {items.map((item, index) => (
          <li key={`${index}-${item.label}`}>
            {item.href ? (
              <Link href={item.href}>{item.label}</Link>
            ) : (
              <span
                aria-current={index === items.length - 1 ? "page" : undefined}
              >
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
