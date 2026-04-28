import { z } from "zod";

export const workoutSchema = z.object({
  date: z.string().min(1),
  type: z.enum(["easy", "recovery", "long", "tempo", "fartlek", "intervals", "race"]),
  distanceKm: z.number().positive(),
  durationMin: z.number().positive(),
  avgHeartRate: z.number().int().positive().max(240).optional(),
  maxHeartRate: z.number().int().positive().max(240).optional(),
  rpe: z.number().int().min(1).max(10),
  notes: z.string().max(500).optional(),
});

export type WorkoutInput = z.infer<typeof workoutSchema>;
