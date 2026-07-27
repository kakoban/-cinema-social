import { NextRequest, NextResponse } from "next/server";
import { getSystemSettings, updateSystemSettings } from "@/lib/settings";
import { getUserFromAuthHeader, getCurrentUser } from "@/lib/auth";

async function getAdminUser(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const user = (await getUserFromAuthHeader(authHeader)) || (await getCurrentUser());
  return user;
}

export async function GET(req: NextRequest) {
  const user = await getAdminUser(req);
  if (!user || (user.role !== "ADMIN" && user.email !== "nafa.1395@gmail.com")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const settings = getSystemSettings();
  // Mask API key for security (show only last 6 chars)
  const maskedKey = settings.openRouterApiKey
    ? `${settings.openRouterApiKey.slice(0, 10)}...${settings.openRouterApiKey.slice(-6)}`
    : "";

  return NextResponse.json({
    openRouterModel: settings.openRouterModel,
    openRouterApiKeyMasked: maskedKey,
    aiServerFinderEnabled: settings.aiServerFinderEnabled,
  });
}

export async function PUT(req: NextRequest) {
  const user = await getAdminUser(req);
  if (!user || (user.role !== "ADMIN" && user.email !== "nafa.1395@gmail.com")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const updateData: any = {};

    if (body.openRouterModel && typeof body.openRouterModel === "string") {
      updateData.openRouterModel = body.openRouterModel.trim();
    }

    if (body.openRouterApiKey && typeof body.openRouterApiKey === "string" && !body.openRouterApiKey.includes("...")) {
      updateData.openRouterApiKey = body.openRouterApiKey.trim();
    }

    if (typeof body.aiServerFinderEnabled === "boolean") {
      updateData.aiServerFinderEnabled = body.aiServerFinderEnabled;
    }

    const updated = updateSystemSettings(updateData);

    const maskedKey = updated.openRouterApiKey
      ? `${updated.openRouterApiKey.slice(0, 10)}...${updated.openRouterApiKey.slice(-6)}`
      : "";

    return NextResponse.json({
      success: true,
      openRouterModel: updated.openRouterModel,
      openRouterApiKeyMasked: maskedKey,
      aiServerFinderEnabled: updated.aiServerFinderEnabled,
    });
  } catch (err) {
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
