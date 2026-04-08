import { z } from "zod";

export const SignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
  displayName: z.string().min(1).max(60),
  countryCode: z.string().length(2).optional(),
});
export type SignupInput = z.infer<typeof SignupSchema>;

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof LoginSchema>;

export const ParseUrlSchema = z.object({
  url: z.string().url(),
});

export const AddCartItemSchema = z.object({
  sourceUrl: z.string().url(),
  quantity: z.number().int().min(1).max(99),
  optionsNote: z.string().max(500).optional(),
});

export const PlaceOrderSchema = z.object({
  deliveryMode: z.enum(["PICKUP", "FORWARD"]),
  pickupLocation: z.enum(["ICN_T1", "ICN_T2", "SEOUL_STATION"]).optional(),
  forwardAddress: z
    .object({
      name: z.string().min(1),
      line1: z.string().min(1),
      line2: z.string().optional(),
      city: z.string().min(1),
      country: z.string().length(2),
      postalCode: z.string().min(1),
      phone: z.string().min(1),
    })
    .optional(),
  arrivalDate: z.string().datetime().optional(),
});
export type PlaceOrderInput = z.infer<typeof PlaceOrderSchema>;
