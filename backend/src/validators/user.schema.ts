import { z } from "zod";

export const updateProfileSchema = z.object({
  name: z.string().optional(),
  address: z.string().optional(),
  mobile: z.string().optional(),
  email: z.string().email(),
  gst_number: z.string().optional().nullable(),
  pan_number: z.string().optional().nullable(),
  bank: z.string().optional(),
  account_no: z.string().optional().nullable(),
  ifsc: z.string().optional(),
  upi_id: z.string().optional(),
});
