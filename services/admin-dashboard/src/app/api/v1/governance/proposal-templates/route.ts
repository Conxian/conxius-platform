import { validateAdminAuth } from "@/lib/support/auth";
import { NextResponse } from "next/server";
import {
  TREASURY_FUNDING_PROPOSAL_TEMPLATES,
  FUNDED_ROLE_DEFINITIONS,
  buildProposalTemplates,
  getProposalTemplate,
  getTemplateRoleDefinition,
  type TreasuryFundingProposalTemplate,
  type FundedRoleDefinition,
  type AllocationCategory,
} from "@/lib/governance/treasury";

interface ProposalTemplatesResponse {
  templates: TreasuryFundingProposalTemplate[];
  roleDefinitions: FundedRoleDefinition[];
  totalTemplates: number;
  categories: AllocationCategory[];
  lastUpdatedIso: string;
  template?: TreasuryFundingProposalTemplate;
  roleDefinition?: FundedRoleDefinition;
  error?: string;
}

export async function GET(req: Request) {
  const authError = await validateAdminAuth(req);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const templateId = searchParams.get("template_id");
    const roleId = searchParams.get("role_id");
    const category = searchParams.get("category") as AllocationCategory | null;

    if (templateId) {
      const template = getProposalTemplate(templateId);
      if (!template) {
        return NextResponse.json(
          {
            templates: [],
            roleDefinitions: FUNDED_ROLE_DEFINITIONS,
            totalTemplates: 0,
            categories: [],
            lastUpdatedIso: new Date().toISOString(),
            error: `Template not found: ${templateId}`,
          },
          { status: 404 },
        );
      }
      const roleDef = getTemplateRoleDefinition(template);
      const allCategories = [
        ...new Set(TREASURY_FUNDING_PROPOSAL_TEMPLATES.map((t) => t.allocationCategory)),
      ];
      return NextResponse.json({
        templates: TREASURY_FUNDING_PROPOSAL_TEMPLATES,
        roleDefinitions: FUNDED_ROLE_DEFINITIONS,
        totalTemplates: TREASURY_FUNDING_PROPOSAL_TEMPLATES.length,
        categories: allCategories,
        lastUpdatedIso: new Date().toISOString(),
        template,
        roleDefinition: roleDef,
      });
    }

    const templates = buildProposalTemplates(
      roleId ?? undefined,
      category ?? undefined,
    );
    const allCategories = [
      ...new Set(TREASURY_FUNDING_PROPOSAL_TEMPLATES.map((t) => t.allocationCategory)),
    ];

    return NextResponse.json({
      templates,
      roleDefinitions: FUNDED_ROLE_DEFINITIONS,
      totalTemplates: templates.length,
      categories: allCategories,
      lastUpdatedIso: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      {
        templates: [],
        roleDefinitions: FUNDED_ROLE_DEFINITIONS,
        totalTemplates: 0,
        categories: [],
        lastUpdatedIso: new Date().toISOString(),
        error: err instanceof Error ? err.message : "Failed to fetch proposal templates",
      },
      { status: 500 },
    );
  }
}
