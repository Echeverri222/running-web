"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureAppUser } from "@/lib/auth/sync-user";
import { prisma } from "@/lib/db/client";
import { parsePaceToSeconds } from "@/lib/format/pace";
import { runnerProfileSchema } from "@/lib/validations/profile";

function optionalNumber(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.trim() === "") {
    return undefined;
  }

  return value;
}

export async function saveRunnerProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const appUser = await ensureAppUser(user);
  const easyPaceRaw = optionalNumber(formData.get("easyPaceMinPerKm"));
  const easyPaceSecPerKm =
    typeof easyPaceRaw === "string" ? parsePaceToSeconds(easyPaceRaw) : undefined;

  if (Number.isNaN(easyPaceSecPerKm)) {
    redirect("/onboarding?error=invalid_profile");
  }

  const parsed = runnerProfileSchema.safeParse({
    age: optionalNumber(formData.get("age")),
    weightKg: optionalNumber(formData.get("weightKg")),
    heightCm: optionalNumber(formData.get("heightCm")),
    level: formData.get("level"),
    availableDays: formData.get("availableDays"),
    easyPaceSecPerKm,
    maxHeartRate: optionalNumber(formData.get("maxHeartRate")),
  });

  if (!parsed.success) {
    redirect("/onboarding?error=invalid_profile");
  }

  await prisma.runnerProfile.upsert({
    where: { userId: appUser.id },
    update: parsed.data,
    create: {
      userId: appUser.id,
      ...parsed.data,
    },
  });

  redirect("/dashboard");
}
