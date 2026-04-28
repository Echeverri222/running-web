import { z } from "zod";

export const runnerProfileSchema = z.object({
  age: z.coerce.number().int().min(12).max(100).optional(),
  weightKg: z.coerce.number().min(30).max(250).optional(),
  heightCm: z.coerce.number().min(120).max(240).optional(),
  level: z.enum(["beginner", "intermediate", "advanced"]),
  availableDays: z.coerce.number().int().min(2).max(7),
  easyPaceSecPerKm: z.coerce.number().int().min(240).max(900).optional(),
  maxHeartRate: z.coerce.number().int().min(120).max(240).optional(),
});

export type RunnerProfileInput = z.infer<typeof runnerProfileSchema>;
