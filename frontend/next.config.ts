import type { NextConfig } from "next";

if (process.env.VERCEL === "1" && process.env.NODE_ENV === "production") {
  const api = process.env.NEXT_PUBLIC_API_URL;
  let valid = false;
  try {
    const url = new URL(api || "");
    valid =
      url.protocol === "https:" &&
      !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      url.pathname === "/" &&
      !api?.endsWith("/");
  } catch {
    valid = false;
  }
  if (!valid) {
    throw new Error(
      "Set NEXT_PUBLIC_API_URL to the confirmed HTTPS API origin without a trailing slash before building on Vercel.",
    );
  }
}

const nextConfig: NextConfig = {};

export default nextConfig;
