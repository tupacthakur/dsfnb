import { z } from 'zod';

// Shared helpers
export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

// Auth
export const loginSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(8).max(128),
  })
  .strict();

export const registerSchema = loginSchema
  .extend({
    name: z.string().min(1).max(100),
  })
  .strict();

// Chat
export const chatMessageSchema = z
  .object({
    content: z.string().min(1).max(4000),
    modelType: z.enum(['chat', 'analytics', 'summary']).optional(),
    stream: z.boolean().optional().default(false),
  })
  .strict();

export const chatContextSchema = z
  .object({
    type: z.enum(['csv', 'api', 'memory']),
    refId: z.string(),
    label: z.string().max(100),
  })
  .strict();

// CSV ingestion
export const csvUploadOptionsSchema = z
  .object({
    autoAnalyze: z.boolean().optional().default(true),
    fieldMappings: z.record(z.string()).optional(),
  })
  .strict();

// TIG
export const tigConstraintSchema = z
  .object({
    nodeType: z.enum([
      'BRAND_POSITIONING',
      'INGREDIENT_GRADE',
      'DISCOUNT_CAP',
      'MARGIN_DEFINITION',
      'WASTE_TOLERANCE',
      'SHRINKAGE_METRIC',
      'VENDOR_CLASS',
      'SERVICE_CEILING',
      'QUALITY_STANDARD',
      'RECIPE_BOM',
      'REVENUE_AGGREGATE',
      'DISCOUNT_POLICY',
      'OUTLET_PRIORITY',
      'REGIME_DETECTION',
    ] as const),
    label: z.string().min(1).max(200),
    scope: z
      .enum(['UNIVERSAL', 'OUTLET', 'CHANNEL', 'CATEGORY', 'SKU', 'VENDOR', 'REGION'] as const)
      .optional(),
    locationId: z.string().optional(),
    productId: z.string().optional(),
    channel: z
      .enum(
        [
          'DIRECT',
          'ECOMMERCE',
          'GENERAL_TRADE',
          'MODERN_TRADE',
          'MARKETPLACE',
          'SUBSCRIPTION',
          'WHOLESALE',
        ] as const,
      )
      .optional(),
    category: z
      .enum(
        [
          'BAKERY',
          'BEVERAGES',
          'DAIRY',
          'GRAINS',
          'OILS_FATS',
          'SPECIALTY',
          'PERISHABLE',
          'DRY_GOODS',
          'OTHER',
        ] as const,
      )
      .optional(),
    thresholdValue: z.number().optional(),
    thresholdPct: z.number().min(0).max(1).optional(),
    comparisonOp: z.enum(['gt', 'lt', 'eq', 'gte', 'lte']).optional(),
    stringValue: z.string().optional(),
    jsonValue: z.any().optional(),
    weightNormal: z
      .enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INACTIVE'] as const)
      .optional(),
    isHardConstraint: z.boolean().optional(),
    isRegimeImmune: z.boolean().optional(),
  })
  .strict();

export const tigExceptionSchema = z
  .object({
    constraintId: z.string(),
    description: z.string().min(1),
    reasonCode: z.string(),
    approvedBy: z.string(),
    expiresAt: z.string().datetime(),
    scope: z
      .object({
        locations: z.array(z.string()).optional(),
        channels: z.array(z.string()).optional(),
        skus: z.array(z.string()).optional(),
      })
      .optional(),
  })
  .strict();

export const onboardingAnswerSchema = z
  .object({
    questionId: z.string().regex(/^Q[0-9]{1,2}$/),
    answer: z.any(),
    rawText: z.string().optional(),
    biasStatuses: z
      .record(
        z.enum(['D1', 'D2', 'D3', 'D4', 'D5']),
        z.enum(['VERIFIED', 'PROVISIONAL', 'RISK']),
      )
      .optional(),
  })
  .strict();

export const regimeConfirmSchema = z
  .object({
    regimeEventId: z.string(),
    confirmed: z.boolean(),
    reviewDueAt: z.string().datetime().optional(),
  })
  .strict();

// Settings
export const modelEndpointSchema = z
  .object({
    componentType: z.string(),
    label: z.string().min(1).max(100),
    url: z.string().url(),
    apiKey: z.string().optional(),
    modelName: z.string().optional(),
  })
  .strict();

export const apiKeySchema = z
  .object({
    label: z.string().min(1).max(100),
    platform: z.string(),
    apiKey: z.string().min(1),
    webhookUrl: z.string().url().optional(),
    scopes: z.array(z.string()).optional(),
  })
  .strict();

export const alertRouteSchema = z
  .object({
    alertType: z.string(),
    channel: z.enum(['whatsapp', 'email', 'dashboard', 'slack']),
    recipientRef: z.string(),
    delayMinutes: z.number().min(0).max(1440).optional(),
  })
  .strict();

export const recommendationUpdateSchema = z
  .object({
    status: z.enum(['IN_PROGRESS', 'APPLIED', 'DISMISSED']),
  })
  .strict();

// Convenience types
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
export type ChatContextInput = z.infer<typeof chatContextSchema>;
export type CsvUploadOptionsInput = z.infer<typeof csvUploadOptionsSchema>;
export type TigConstraintInput = z.infer<typeof tigConstraintSchema>;
export type TigExceptionInput = z.infer<typeof tigExceptionSchema>;
export type OnboardingAnswerInput = z.infer<typeof onboardingAnswerSchema>;
export type RegimeConfirmInput = z.infer<typeof regimeConfirmSchema>;
export type ModelEndpointInput = z.infer<typeof modelEndpointSchema>;
export type ApiKeyInput = z.infer<typeof apiKeySchema>;
export type AlertRouteInput = z.infer<typeof alertRouteSchema>;
export type RecommendationUpdateInput = z.infer<
  typeof recommendationUpdateSchema
>;

