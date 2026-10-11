import { z } from "zod";

export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
export const MAX_IMAGE_DATA_LENGTH = Math.ceil(MAX_IMAGE_BYTES / 3) * 4 + 32;

export const inputSchema = z
  .object({
    theme: z
      .string()
      .trim()
      .min(1, "Enter the round's theme.")
      .max(160, "Keep the theme under 160 characters."),
    style: z.enum(["feminine", "masculine", "either"]),
    body: z.enum(["female", "male"]),
    imageDataUrl: z
      .string()
      .max(MAX_IMAGE_DATA_LENGTH, "Choose an image under 4 MB.")
      .regex(
        /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/,
        "Choose a JPEG, PNG, or WebP image.",
      )
      .optional(),
  })
  .strict();

export const shortlistSchema = z.object({
  itemIds: z.array(z.string()).max(30),
});
export const pieceSchema = z.object({
  itemId: z.string(),
  toggleId: z.string().nullable(),
  colors: z.array(z.object({ slotId: z.string(), hex: z.string() })),
  note: z.string(),
  essential: z.boolean(),
});
export const recipeSchema = z.object({
  title: z.string(),
  referenceId: z.string(),
  body: z.enum(["female", "male"]),
  why: z.string(),
  compromises: z.array(z.string()),
  pieces: z.array(pieceSchema),
});
export const modelResultSchema = z.object({
  looks: z.array(recipeSchema),
  warnings: z.array(z.string()),
});
