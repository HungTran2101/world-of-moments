import "server-only";
import { Resolver } from "node:dns/promises";
import { domainToASCII } from "node:url";
import { ClientHttpError } from "@/lib/clientErrors";

const EMAIL_DNS_TIMEOUT_MS = 5_000;
const DNS_LOOKUP_TRIES = 1;

function dnsCode(error: unknown) {
  return error && typeof error === "object" && "code" in error ? error.code : null;
}

async function resolveMailDomain(domain: string, resolver: Resolver) {
  try {
    const records = await resolver.resolveMx(domain);
    if (records.length) {
      // Node có thể biểu diễn Null MX bằng chuỗi rỗng; không thử A/AAAA khi miền từ chối nhận thư.
      if (records.some(({ exchange }) => exchange !== "" && exchange !== ".")) return;
      throw new ClientHttpError(422, "emailDomainInvalid");
    }
  } catch (error) {
    if (error instanceof ClientHttpError) throw error;
    if (dnsCode(error) === "ENOTFOUND") throw new ClientHttpError(422, "emailDomainInvalid");
    if (dnsCode(error) !== "ENODATA") throw new ClientHttpError(503, "emailDnsTemporary");
  }

  // SMTP cho phép A/AAAA làm tuyến nhận thư ngầm khi không có bản ghi MX.
  try {
    // Chỉ cần một họ địa chỉ có tuyến nhận thư; không để truy vấn còn lại bị treo làm từ chối sai miền hợp lệ.
    await Promise.any([resolver.resolve4(domain), resolver.resolve6(domain)].map(async (lookup) => {
      const addresses = await lookup;
      if (!addresses.length) throw Object.assign(new Error("No addresses"), { code: "ENODATA" });
      return addresses;
    }));
  } catch (error) {
    const failures: unknown[] = error instanceof AggregateError ? error.errors : [error];
    const inconclusive = failures.some((failure) =>
      !["ENODATA", "ENOTFOUND"].includes(String(dnsCode(failure))));
    throw new ClientHttpError(inconclusive ? 503 : 422,
      inconclusive ? "emailDnsTemporary" : "emailDomainInvalid");
  }
}

export async function checkClientEmailDomain(email: string) {
  const domain = domainToASCII(email.slice(email.lastIndexOf("@") + 1));
  if (!domain) throw new ClientHttpError(422, "emailDomainInvalid");
  const resolver = new Resolver({ timeout: EMAIL_DNS_TIMEOUT_MS, tries: DNS_LOOKUP_TRIES });
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    // Một hạn chót bao phủ cả MX và A/AAAA, tránh cộng dồn thời gian chờ của từng truy vấn.
    await Promise.race([
      resolveMailDomain(domain, resolver),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new ClientHttpError(503, "emailDnsTemporary")),
          EMAIL_DNS_TIMEOUT_MS);
      }),
    ]);
  } finally {
    clearTimeout(timer);
    resolver.cancel();
  }
}
