import { z } from 'zod';

export const cursorPageSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export const productFilterSchema = z.object({
  q: z.string().optional(),
  categoryId: z.string().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  sort: z.enum(['newest', 'price_asc', 'price_desc', 'popularity']).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().min(1),
  phone: z.string().optional(),
});

export const utrSubmitSchema = z.object({
  orderId: z.string().uuid(),
  utr: z.string().min(6).max(64),
  senderAccount: z.string().optional(),
  screenshotUrl: z.string().url().optional(),
});

export const analyticsTrackSchema = z.object({
  type: z.string(),
  sessionId: z.string().optional(),
  customerId: z.string().optional(),
  payload: z.record(z.unknown()).optional(),
});

export const checkoutSchema = z.object({
  cartId: z.string(),
  fulfillmentMode: z.enum(['HOME_DELIVERY', 'STORE_PICKUP', 'DINE_IN']),
  shippingAddressId: z.string().optional(),
  guest: z
    .object({
      fullName: z.string().min(1),
      phone: z.string().min(6),
      email: z.string().email(),
      addressLine1: z.string().min(1),
      city: z.string().min(1),
      state: z.string().optional(),
      postalCode: z.string().optional(),
      country: z.string().default('IN'),
      lat: z.number().optional(),
      lng: z.number().optional(),
    })
    .optional(),
  couponCode: z.string().optional(),
  giftCardCode: z.string().optional(),
  tableNumber: z.string().optional(),
  notes: z.string().optional(),
});
