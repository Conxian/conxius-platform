import { validateAdminAuth } from "@/lib/support/auth";
import { NextResponse } from "next/server";
import {
  OPERATOR_APPROVAL_TEMPLATES,
  OPERATOR_DEFINITIONS,
  buildOperatorApprovalTemplates,
  getOperatorApprovalTemplate,
  getOperatorDefinition,
  type OperatorApprovalProposalTemplate,
  type OperatorDefinition,
  type OperatorType,
} from "@/lib/governance/operators";

interface OperatorApprovalTemplatesResponse {
  templates: OperatorApprovalProposalTemplate[];
  operatorDefinitions: OperatorDefinition[];
  totalTemplates: number;
  operatorTypes: OperatorType[];
  lastUpdatedIso: string;
  template?: OperatorApprovalProposalTemplate;
  operatorDefinition?: OperatorDefinition;
  error?: string;
}

export async function GET(req: Request) {
  const authError = await validateAdminAuth(req);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const templateId = searchParams.get("template_id");
    const operatorType = searchParams.get("operator_type") as OperatorType | null;

    if (templateId) {
      const template = getOperatorApprovalTemplate(templateId);
      if (!template) {
        return NextResponse.json(
          {
            templates: [],
            operatorDefinitions: OPERATOR_DEFINITIONS,
            totalTemplates: 0,
            operatorTypes: [],
            lastUpdatedIso: new Date().toISOString(),
            error: `Template not found: ${templateId}`,
          } satisfies OperatorApprovalTemplatesResponse,
          { status: 404 },
        );
      }
      const opDef = getOperatorDefinition(template);
      const allTypes = [
        ...new Set(OPERATOR_APPROVAL_TEMPLATES.map((t) => t.operatorType)),
      ];
      return NextResponse.json({
        templates: OPERATOR_APPROVAL_TEMPLATES,
        operatorDefinitions: OPERATOR_DEFINITIONS,
        totalTemplates: OPERATOR_APPROVAL_TEMPLATES.length,
        operatorTypes: allTypes,
        lastUpdatedIso: new Date().toISOString(),
        template,
        operatorDefinition: opDef,
      } satisfies OperatorApprovalTemplatesResponse);
    }

    const templates = buildOperatorApprovalTemplates(
      operatorType ?? undefined,
    );
    const allTypes = [
      ...new Set(OPERATOR_APPROVAL_TEMPLATES.map((t) => t.operatorType)),
    ];

    return NextResponse.json({
      templates,
      operatorDefinitions: OPERATOR_DEFINITIONS,
      totalTemplates: templates.length,
      operatorTypes: allTypes,
      lastUpdatedIso: new Date().toISOString(),
    } satisfies OperatorApprovalTemplatesResponse);
  } catch (err) {
    return NextResponse.json(
      {
        templates: [],
        operatorDefinitions: OPERATOR_DEFINITIONS,
        totalTemplates: 0,
        operatorTypes: [],
        lastUpdatedIso: new Date().toISOString(),
        error:
          err instanceof Error
            ? err.message
            : "Failed to fetch operator approval templates",
      } satisfies OperatorApprovalTemplatesResponse,
      { status: 500 },
    );
  }
}
