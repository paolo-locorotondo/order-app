import { NextRequest, NextResponse } from "next/server";
import { validateAuth, UserRole } from "@/lib/auth-helpers";
import { releaseReservation } from "@/lib/reservation";

export async function POST(request: NextRequest) {
  const auth = await validateAuth(request, [UserRole.ADMIN, UserRole.CUSTOMER]);
  if (!auth.ok) {
    return auth.errorResponse;
  }

  const released = await releaseReservation(auth.token.id);
  return NextResponse.json({ data: { released } });
}
