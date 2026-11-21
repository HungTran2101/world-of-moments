import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    return [{
      source: "/email-verify",
      headers: [{ key: "Referrer-Policy", value: "no-referrer" }],
    }];
  },
  experimental: {
    agentUpgrade: "security",
  },
};

export default withNextIntl(nextConfig);
