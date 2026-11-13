import { isIP } from "node:net";

const IPV4_MAPPED_PREFIX = "::ffff:";
const IPV4_BYTE_BITS = 8;
const IPV4_BYTE_MASK = 255;
const HEX_RADIX = 16;

// Chuẩn hóa để IPv6 viết tắt/đầy đủ và IPv4-mapped không né được cùng một khóa IP.
export function normalizeIp(input: string): string | null {
  const value = input.trim();
  if (value.includes("%")) return null;
  const family = isIP(value);
  if (!family) return null;
  if (family === 4) return value;
  const normalized = new URL(`http://[${value}]`).hostname.slice(1, -1);
  if (!normalized.startsWith(IPV4_MAPPED_PREFIX)) return normalized;
  const words = normalized.slice(IPV4_MAPPED_PREFIX.length).split(":");
  return words.flatMap(word => {
    const number = Number.parseInt(word, HEX_RADIX);
    return [number >> IPV4_BYTE_BITS, number & IPV4_BYTE_MASK];
  }).join(".");
}

export function submissionClientIp(headers: Headers, production: boolean): string | null {
  const value = headers.get("x-real-ip");
  // Chỉ môi trường local được phép thiếu header; production không gom khách vào một IP giả.
  if (value === null) return production ? null : "127.0.0.1";
  return normalizeIp(value);
}
