/**
 * G-12: BIP-353 DNS Payment Instructions
 *
 * Resolves human-readable Bitcoin addresses (e.g., ₿user@domain.com)
 * using DNS-over-HTTPS TXT record lookups with DNSSEC validation.
 *
 * BIP-353 spec: TXT record at _bitcoin-payment.{user}._at.{domain}
 * contains the BIP-21 payment URI.
 */

const DOH_ENDPOINT =
  process.env.DNS_DOH_ENDPOINT || "https://cloudflare-dns.com/dns-query";

export interface DnsPaymentResolution {
  address: string;
  uri: string;
  dnssec: boolean;
  error?: string;
}

interface DohTxtAnswer {
  name: string;
  type: number;
  TTL: number;
  data: string;
}

interface DohResponse {
  Status: number;
  AD: boolean;
  Answer?: DohTxtAnswer[];
}

export class DnsPaymentResolver {
  static async resolve(handle: string): Promise<DnsPaymentResolution> {
    const cleanHandle = handle.replace("₿", "");
    const [user, domain] = cleanHandle.split("@");

    if (!user || !domain) {
      return {
        address: handle,
        uri: "",
        dnssec: false,
        error: "Invalid BIP-353 handle format",
      };
    }

    const queryName = `_bitcoin-payment.${user}._at.${domain}`;

    try {
      const dohUrl = `${DOH_ENDPOINT}?name=${encodeURIComponent(queryName)}&type=TXT`;
      const response = await fetch(dohUrl, {
        headers: { Accept: "application/dns-json" },
      });

      if (!response.ok) {
        return {
          address: handle,
          uri: "",
          dnssec: false,
          error: `DNS query failed: HTTP ${response.status}`,
        };
      }

      const data: DohResponse = await response.json();

      if (data.Status !== 0) {
        return {
          address: handle,
          uri: "",
          dnssec: data.AD,
          error: `DNS lookup failed with status ${data.Status} (NXDOMAIN or other error)`,
        };
      }

      const txtAnswer = data.Answer?.find((a) => a.type === 16);
      if (!txtAnswer) {
        return {
          address: handle,
          uri: "",
          dnssec: data.AD,
          error: `No TXT record found for ${queryName}`,
        };
      }

      const uri = txtAnswer.data.replace(/^"|"$/g, "");

      if (!uri.startsWith("bitcoin:") && !uri.startsWith("lightning:")) {
        return {
          address: handle,
          uri,
          dnssec: data.AD,
          error: `TXT record does not contain a valid BIP-21 URI: ${uri}`,
        };
      }

      return { address: handle, uri, dnssec: data.AD };
    } catch (err) {
      return {
        address: handle,
        uri: "",
        dnssec: false,
        error: `DNS resolution failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }
}
