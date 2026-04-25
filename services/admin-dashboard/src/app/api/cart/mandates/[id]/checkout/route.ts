import { NextResponse } from "next/server";
import { getCartMandate, toX402PaymentRequired } from "@/lib/sidl/cart";
import { observeSidlException, observeSidlResponse, startSidlTimer } from "@/lib/sidl/observability";
import { encodeBase64Json, encodePaymentRequiredHeader } from "@/lib/sidl/x402";

const ENDPOINT = "/api/cart/mandates/[id]/checkout";
const PAYMENT_SIGNATURE_PATTERN = /^[A-Za-z0-9+/=_-]{16,}$/;

function settlementResponse(): string {
  return encodeBase64Json({ ok: true, settledAtIso: new Date().toISOString() });
}

function classifyPaymentSignatureHeader(value: string | null): "missing" | "invalid" | "accepted" {
  if (value === null) {
    return "missing";
  }

  const normalized = value.trim();
  if (!normalized || !PAYMENT_SIGNATURE_PATTERN.test(normalized)) {
    return "invalid";
  }

  return "accepted";
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const startedAt = startSidlTimer();

  try {
    const { id } = await params;
    const mandate = getCartMandate(id);

    if (!mandate) {
      const response = NextResponse.json({ ok: false, error: "not-found" }, { status: 404 });
      observeSidlResponse({
        endpoint: ENDPOINT,
        method: "GET",
        startedAt,
        status: response.status,
        errorCategory: "not-found",
      });
      return response;
    }

    const paymentHeaderCategory = classifyPaymentSignatureHeader(req.headers.get("payment-signature"));

    if (paymentHeaderCategory === "missing") {
      const resource = new URL(req.url).pathname;
      const required = toX402PaymentRequired({ mandate, resource });
      const headerValue = encodePaymentRequiredHeader(required);

      const response = NextResponse.json(
        { ok: false, error: "payment-required", paymentRequired: required },
        {
          status: 402,
          headers: {
            "PAYMENT-REQUIRED": headerValue,
            "Cache-Control": "no-store",
          },
        }
      );

      observeSidlResponse({
        endpoint: ENDPOINT,
        method: "GET",
        startedAt,
        status: response.status,
        errorCategory: "payment-required",
        paymentHeaderCategory,
      });

      return response;
    }

    if (paymentHeaderCategory === "invalid") {
      const response = NextResponse.json(
        { ok: false, error: "invalid-payment-signature" },
        {
          status: 400,
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );

      observeSidlResponse({
        endpoint: ENDPOINT,
        method: "GET",
        startedAt,
        status: response.status,
        errorCategory: "invalid-payment-signature",
        paymentHeaderCategory,
      });

      return response;
    }

    const response = NextResponse.json(
      { ok: true, mandateId: mandate.id, note: "Payment signature accepted (reference implementation)." },
      {
        status: 200,
        headers: {
          "PAYMENT-RESPONSE": settlementResponse(),
          "Cache-Control": "no-store",
        },
      }
    );

    observeSidlResponse({
      endpoint: ENDPOINT,
      method: "GET",
      startedAt,
      status: response.status,
      paymentHeaderCategory,
    });

    return response;
  } catch (error) {
    observeSidlException({ endpoint: ENDPOINT, method: "GET", startedAt, error });
    throw error;
  }
}
