import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const legacySecretAliases: Record<string, string[]> = {
  ADMIN_PAT_TOKEN: ["PAT_TOKEN"],
  ADMIN_NPM_TOKEN: ["NPM_TOKEN"],
  ADMIN_PYPI_API_TOKEN: ["PYPI_API_TOKEN"],
  ADMIN_GCP_SA_KEY_JSON: ["GCP_SA_KEY_JSON", "GCP_CREDENTIALS"],
  ADMIN_CHANGELLY_API_KEY: ["CHANGELLY_API_KEY"],
  ADMIN_CHANGELLY_API_SECRET: ["CHANGELLY_API_SECRET"],
};

const adminSecretKeys = new Set(Object.keys(legacySecretAliases));
const adminSecretKeyPattern = /^[A-Z][A-Z0-9_]*$/;

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

  if (!normalized.includes("'")) {
    return `'${singleLine}'`;
  }
  if (/[\s#]/.test(singleLine)) {
    throw new BadRequestError(
      "Secret value contains characters that require quoting, but cannot be safely single-quoted"
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
    const shouldWriteLegacyAliases =
      process.env.ADMIN_WRITE_LEGACY_SECRET_ALIASES === "true";
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

      envContent += `${key}=${escapeEnvValue(value)}\n`;

      if (shouldWriteLegacyAliases) {
        const aliases = legacySecretAliases[key];
        if (!aliases) continue;

        for (const alias of aliases) {
          if (alias in secretRecord) continue;
          legacyAliasContent += `${alias}=${escapeEnvValue(value)}\n`;
        }
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
              error: "Invalid payload: each bosKeys entry must be an object",
            },
            { status: 400 }
          );
        }

        const entryRecord = entry as Record<string, unknown>;
        if (
          !("privateKey" in entryRecord) ||
          !("testnetAddress" in entryRecord)
        ) {
          return NextResponse.json(
            {
              success: false,
              error:
                "Invalid payload: each bosKeys entry must include privateKey and testnetAddress",
            },
            { status: 400 }
          );
        }

        const prefix = i < 2 ? "INTERNAL" : "DEPLOY";
        const index = i < 2 ? i + 1 : i - 1;
        envContent += `BOS_${prefix}_KEY_${index}=${escapeEnvValue(entryRecord.privateKey)}\n`;
        envContent += `BOS_${prefix}_ADDR_${index}=${escapeEnvValue(entryRecord.testnetAddress)}\n`;
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

    return NextResponse.json({ success: true, path: filePath });
  } catch (err: unknown) {
    if (err instanceof BadRequestError) {
      return NextResponse.json({ success: false, error: err.message }, { status: 400 });
    }

    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
