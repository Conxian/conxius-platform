import { NextResponse } from "next/server";
import { getCartMandate, toX402PaymentRequired } from "@/lib/sidl/cart";
import { encodeBase64Json, encodePaymentRequiredHeader } from "@/lib/sidl/x402";

function settlementResponse(): string {
  return encodeBase64Json({ ok: true, settledAtIso: new Date().toISOString() });
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const { id } = await params;
  const mandate = getCartMandate(id);

  if (!mandate) {
    return NextResponse.json({ ok: false, error: "not-found" }, { status: 404 });
  }

  const paymentSignature = req.headers.get("payment-signature");
  if (!paymentSignature) {
    const resource = new URL(req.url).pathname;
    const required = toX402PaymentRequired({ mandate, resource });
    const headerValue = encodePaymentRequiredHeader(required);

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

  return NextResponse.json(
    { ok: true, mandateId: mandate.id, note: "Payment signature accepted (reference implementation)." },
    {
      status: 200,
      headers: {
        "PAYMENT-RESPONSE": settlementResponse(),
        "Cache-Control": "no-store",
      },
    }
  );
}
