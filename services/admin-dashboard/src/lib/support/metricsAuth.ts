import { readFileSync } from "node:fs";

import { NextResponse } from "next/server";

import { timingSafeStringEqual } from "./m2mKeyHttp";

const PROMETHEUS_SCRAPE_USERNAME = "prometheus";
const PROMETHEUS_SCRAPE_REALM = "conxian-metrics";

interface BasicCredentials {
  username: string;
  password: string;
}

function metricsAuthError(
  status: number,
  code: "metrics_scrape_auth_unavailable" | "unauthorized",
  headers?: Record<string, string>,
): NextResponse {
  return NextResponse.json(
    { error: code },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        ...headers,
      },
    },
  );
}

function loadScrapePassword(): string | null {
  const configuredPath = process.env.PROMETHEUS_SCRAPE_PASSWORD_FILE;
  if (!configuredPath) return null;

  try {
    const password = readFileSync(configuredPath, "utf8").replace(/\r?\n$/, "");
    if (!password || /[\r\n]/.test(password)) return null;
    return password;
  } catch {
    return null;
  }
}

function parseBasicCredentials(headerValue: string | null): BasicCredentials | null {
  if (!headerValue || !/^Basic\s+/i.test(headerValue)) return null;

  const encodedCredentials = headerValue.replace(/^Basic\s+/i, "").trim();
  if (!encodedCredentials) return null;

  try {
    const decodedCredentials = Buffer.from(encodedCredentials, "base64").toString("utf8");
    const separatorIndex = decodedCredentials.indexOf(":");
    if (separatorIndex <= 0) return null;

    return {
      username: decodedCredentials.slice(0, separatorIndex),
      password: decodedCredentials.slice(separatorIndex + 1),
    };
  } catch {
    return null;
  }
}

/**
* Authorize Prometheus using the password file shared with the Prometheus
* container. The file path is configuration, not credential material; the
* password itself is never placed in the process environment or response.
*/
export function validatePrometheusScrapeAuth(request: Request): NextResponse | null {
  const expectedPassword = loadScrapePassword();
  if (!expectedPassword) {
    return metricsAuthError(503, "metrics_scrape_auth_unavailable");
  }

  const credentials = parseBasicCredentials(request.headers.get("Authorization"));
  if (
    !credentials ||
    credentials.username !== PROMETHEUS_SCRAPE_USERNAME ||
    !timingSafeStringEqual(credentials.password, expectedPassword)
  ) {
    return metricsAuthError(401, "unauthorized", {
      "WWW-Authenticate": `Basic realm="${PROMETHEUS_SCRAPE_REALM}"`,
    });
  }

  return null;
}
