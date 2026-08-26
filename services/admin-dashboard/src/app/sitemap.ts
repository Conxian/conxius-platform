import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.conxian-labs.com").replace(/\/$/, "");
  return [{ url: `${baseUrl}/`, lastModified: new Date() }];
}
