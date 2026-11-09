import Link from "next/link";
import { memo } from "react";

interface BreadcrumbsProps {
  items: { label: string; href?: string }[];
  label: string;
}

export const Breadcrumbs = memo(function Breadcrumbs({
  items,
  label,
}: BreadcrumbsProps) {
  return (
    <nav className="cms-breadcrumbs" aria-label={label}>
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
}, (previous, next) =>
  // Dữ liệu chỉ có chuỗi nên mảng inline cùng nội dung vẫn có thể bỏ qua render.
  previous.label === next.label &&
  previous.items.length === next.items.length &&
  previous.items.every((item, index) =>
    item.label === next.items[index].label && item.href === next.items[index].href),
);
