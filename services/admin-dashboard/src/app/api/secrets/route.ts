import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";

const adminGcpSaKeyJsonKey = "ADMIN_GCP_SA_KEY_JSON" as const;

const legacySecretAliases: Record<string, string[]> = {
  ADMIN_PAT_TOKEN: ["PAT_TOKEN"],
  ADMIN_NPM_TOKEN: ["NPM_TOKEN"],
  ADMIN_PYPI_API_TOKEN: ["PYPI_API_TOKEN"],
  [adminGcpSaKeyJsonKey]: ["GCP_SA_KEY_JSON", "GCP_CREDENTIALS"],
  ADMIN_CHANGELLY_API_KEY: ["CHANGELLY_API_KEY"],
  ADMIN_CHANGELLY_API_SECRET: ["CHANGELLY_API_SECRET"],
};

const adminSecretKeys = new Set(Object.keys(legacySecretAliases));
const adminSecretKeyPattern = /^[A-Z][A-Z0-9_]*$/;
const shouldWriteLegacySecretAliases =
  process.env.ADMIN_WRITE_LEGACY_SECRET_ALIASES === "true";

class BadRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BadRequestError";
  }
}

function escapeEnvValue(rawValue: unknown) {
  const value = rawValue == null ? "" : String(rawValue);
  const normalized = value.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const singleLine = normalized.replace(/\n/g, "\\n");

  if (!singleLine.includes("'")) {
    return `'${singleLine}'`;
  }

  if (
    singleLine.length === 0 ||
    singleLine.startsWith("\"") ||
    singleLine.startsWith("'") ||
    /[\s#]/.test(singleLine) ||
    singleLine.includes("$")
  ) {
    throw new BadRequestError(
      "Secret value contains an apostrophe together with whitespace, #, or $, which cannot be safely stored in .env without risking parsing or variable expansion; remove the apostrophe or encode the value"
    );
  }

  return singleLine;
}

export async function POST(req: Request) {
  try {
    let data: unknown;
    try {
      data = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON payload" },
        { status: 400 }
      );
    }

    if (typeof data !== "object" || data == null || Array.isArray(data)) {
      return NextResponse.json(
        { success: false, error: "Invalid payload" },
        { status: 400 }
      );
    }

    const { secrets, bosKeys } = data as { secrets?: unknown; bosKeys?: unknown };
    if (typeof secrets !== "object" || secrets == null || Array.isArray(secrets)) {
      return NextResponse.json(
        { success: false, error: "Invalid payload: secrets must be an object" },
        { status: 400 }
      );
    }

    if (bosKeys != null && !Array.isArray(bosKeys)) {
      return NextResponse.json(
        { success: false, error: "Invalid payload: bosKeys must be an array" },
        { status: 400 }
      );
    }

    const secretRecord = secrets as Record<string, unknown>;
    let legacyAliasContent = "";

    // Build .env content
    let envContent = "# Conxian Institutional Secrets\n# Generated via Admin Dashboard\n\n";

    for (const [key, value] of Object.entries(secretRecord)) {
      if (!adminSecretKeys.has(key) || !adminSecretKeyPattern.test(key)) {
        return NextResponse.json(
          { success: false, error: `Invalid secret key: ${key}` },
          { status: 400 }
        );
      }

      if (typeof value !== "string") {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid payload: secrets.${key} must be a string`,
          },
          { status: 400 }
        );
      }

      const stringValue = value;
      let normalizedValue = stringValue;
      if (key === adminGcpSaKeyJsonKey) {
        const rawJson = stringValue.trim();
        if (rawJson.length === 0) {
          normalizedValue = "";
        } else {
          try {
            normalizedValue = JSON.stringify(JSON.parse(rawJson));
          } catch {
            return NextResponse.json(
              {
                success: false,
                error: "Invalid payload: ADMIN_GCP_SA_KEY_JSON must be valid JSON",
              },
              { status: 400 }
            );
          }
        }
      }

      const escapedValue = escapeEnvValue(normalizedValue);
      envContent += `${key}=${escapedValue}\n`;

      if (!shouldWriteLegacySecretAliases) continue;

      const aliases = legacySecretAliases[key];
      if (!aliases) continue;

      for (const alias of aliases) {
        if (alias in secretRecord) continue;
        legacyAliasContent += `${alias}=${escapedValue}\n`;
      }
    }

    if (legacyAliasContent) {
      envContent += "\n# Legacy aliases (deprecated)\n";
      envContent += legacyAliasContent;
    }

    if (Array.isArray(bosKeys) && bosKeys.length > 0) {
      envContent += "\n# BOS Wallet Mapping\n";
      for (const [i, entry] of bosKeys.entries()) {
        if (typeof entry !== "object" || entry == null || Array.isArray(entry)) {
          return NextResponse.json(
            {
              success: false,
              error: `Invalid payload: bosKeys[${i}] must be an object`,
            },
            { status: 400 }
          );
        }

        const { privateKey, testnetAddress } = entry as Record<string, unknown>;
        if (typeof privateKey !== "string" || typeof testnetAddress !== "string") {
          return NextResponse.json(
            {
              success: false,
              error: `Invalid payload: bosKeys[${i}] must include privateKey and testnetAddress strings`,
            },
            { status: 400 }
          );
        }

        const prefix = i < 2 ? "INTERNAL" : "DEPLOY";
        const index = i < 2 ? i + 1 : i - 1;
        envContent += `BOS_${prefix}_KEY_${index}=${escapeEnvValue(privateKey)}\n`;
        envContent += `BOS_${prefix}_ADDR_${index}=${escapeEnvValue(testnetAddress)}\n`;
      }
    }

    // Save to .env.admin in the workspace root or local service root
    // For now, save to the service root
    const filePath = path.join(process.cwd(), ".env.admin");
    fs.writeFileSync(filePath, envContent, { mode: 0o600 });

    try {
      fs.chmodSync(filePath, 0o600);
    } catch {
      // Best-effort; some environments (e.g. Windows) may not support chmod.
    }

    return NextResponse.json({ success: true, file: ".env.admin" });
  } catch (err: unknown) {
    if (err instanceof BadRequestError) {
      return NextResponse.json({ success: false, error: err.message }, { status: 400 });
    }

    console.error("Failed to write admin secrets", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
