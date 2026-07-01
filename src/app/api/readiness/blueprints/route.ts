import { NextResponse } from "next/server";
import {
  blueprintSummary,
  listBlueprints,
} from "~/lib/readiness/blueprints";

/**
 * GET /api/readiness/blueprints -> the jurisdictions a readiness check can run
 * against, for the "pick a jurisdiction" selector.
 */
export async function GET() {
  return NextResponse.json({
    blueprints: listBlueprints().map(blueprintSummary),
  });
}
