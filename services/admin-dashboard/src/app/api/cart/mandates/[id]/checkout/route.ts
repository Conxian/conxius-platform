import { NextResponse } from "next/server";
import { getCartMandate, toX402PaymentRequired } from "@/lib/sidl/cart";
import { recordCheckoutPaymentAttempt, recordCheckoutPaymentRequired } from "@/lib/sidl/stateStore";
import { encodeBase64Json, encodePaymentRequiredHeader } from "@/lib/sidl/x402";

export const runtime = "nodejs";

function settlementResponse(settledAtIso: string): string {
  return encodeBase64Json({ ok: true, settledAtIso });
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const { id } = await params;
  const mandate = getCartMandate(id);

  if (!mandate) {
    return NextResponse.json({ ok: false, error: "not-found" }, { status: 404 });
  }

  const resource = new URL(req.url).pathname;
  const paymentSignature = req.headers.get("payment-signature");
  if (!paymentSignature) {
    const required = toX402PaymentRequired({ mandate, resource });
    const headerValue = encodePaymentRequiredHeader(required);

    recordCheckoutPaymentRequired({
      mandateId: mandate.id,
      resource,
      paymentRequired: required,
    });

    return NextResponse.json(
      { ok: false, error: "payment-required", paymentRequired: required },
      {
        status: 402,
        headers: {
          "PAYMENT-REQUIRED": headerValue,
          "Cache-Control": "no-store",
        },
      }
    );
  }

  const settledAtIso = new Date().toISOString();
  recordCheckoutPaymentAttempt({
    mandateId: mandate.id,
    resource,
    paymentSignature,
    settledAtIso,
  });

  return NextResponse.json(
    { ok: true, mandateId: mandate.id, note: "Payment signature accepted (reference implementation)." },
    {
      status: 200,
      headers: {
        "PAYMENT-RESPONSE": settlementResponse(settledAtIso),
        "Cache-Control": "no-store",
      },
    }
  );
}
