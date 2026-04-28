import type { User as SupabaseUser } from "@supabase/supabase-js";
import { prisma } from "@/lib/db/client";

export async function ensureAppUser(authUser: SupabaseUser) {
  const email = authUser.email;

  if (!email) {
    throw new Error("Authenticated user is missing email");
  }

  const name = authUser.user_metadata.full_name ?? authUser.user_metadata.name ?? authUser.user_metadata.user_name ?? null;
  const existingUser = await prisma.user.findUnique({
    where: { email },
    include: {
      profile: true,
    },
  });

  if (!existingUser) {
    return prisma.user.create({
      data: {
        email,
        name,
      },
      include: {
        profile: true,
      },
    });
  }

  if (existingUser.name !== name) {
    return prisma.user.update({
      where: { id: existingUser.id },
      data: { name },
      include: {
        profile: true,
      },
    });
  }

  return existingUser;
}
