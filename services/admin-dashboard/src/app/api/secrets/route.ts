import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const { secrets, bosKeys } = data;

    // Build .env content
    let envContent = "# Conxian Institutional Secrets\n# Generated via Admin Dashboard\n\n";
    
    for (const [key, value] of Object.entries(secrets)) {
      envContent += `${key}=${value}\n`;
    }

    if (bosKeys && bosKeys.length > 0) {
      envContent += "\n# BOS Wallet Mapping\n";
      bosKeys.forEach((key: any, i: number) => {
        const prefix = i < 2 ? "INTERNAL" : "DEPLOY";
        const index = i < 2 ? i + 1 : i - 1;
        envContent += `BOS_${prefix}_KEY_${index}=${key.privateKey}\n`;
        envContent += `BOS_${prefix}_ADDR_${index}=${key.testnetAddress}\n`;
      });
    }

    // Save to .env.admin in the workspace root or local service root
    // For now, save to the service root
    const filePath = path.join(process.cwd(), ".env.admin");
    fs.writeFileSync(filePath, envContent);

    return NextResponse.json({ success: true, path: filePath });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
