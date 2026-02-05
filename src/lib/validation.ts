/**
 * Zod validation schemas for API routes
 * Centralized validation to ensure type safety across the application
 */

import { z } from "zod";

// ============================================
// Common schemas
// ============================================

export const emailSchema = z
  .string()
  .email("Invalid email address")
  .transform((v) => v.trim().toLowerCase());

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters");

export const phoneSchema = z
  .string()
  .transform((v) => v.replace(/[^\d+]/g, "").trim())
  .refine((v) => {
    const digits = v.replace(/\D/g, "");
    return digits.length >= 9 && digits.length <= 15;
  }, "Invalid phone number");

export const personalIdSchema = z
  .string()
  .transform((v) => v.replace(/\D/g, ""))
  .refine((v) => v.length === 11, "Personal ID must be 11 digits");

export const companyIdSchema = z
  .string()
  .transform((v) => v.replace(/\D/g, ""))
  .refine((v) => v.length === 9, "Company ID must be 9 digits");

export const birthDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
  .transform((v) => new Date(v))
  .refine((d) => !isNaN(d.getTime()), "Invalid date")
  .refine((d) => d <= new Date(), "Birth date cannot be in the future")
  .refine((d) => d.getFullYear() >= 1900, "Invalid birth year");

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ============================================
// Freelancer categories (mirrors lib/categories.ts)
// ============================================

export const freelancerCategorySchema = z.enum([
  "web_development",
  "mobile_development",
  "design",
  "writing",
  "marketing",
  "video",
  "music",
  "translation",
  "consulting",
  "other",
]);

export type FreelancerCategoryType = z.infer<typeof freelancerCategorySchema>;

// ============================================
// Registration schemas
// ============================================

const baseRegistrationSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
  phone: phoneSchema,
});

export const freelancerRegistrationSchema = baseRegistrationSchema.extend({
  role: z.literal("freelancer"),
  category: freelancerCategorySchema,
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  personalId: personalIdSchema,
  birthDate: birthDateSchema,
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const individualEmployerRegistrationSchema = baseRegistrationSchema.extend({
  role: z.literal("employer"),
  employerType: z.literal("individual"),
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  personalId: personalIdSchema,
  birthDate: birthDateSchema,
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const companyEmployerRegistrationSchema = baseRegistrationSchema.extend({
  role: z.literal("employer"),
  employerType: z.literal("company"),
  companyName: z.string().min(2, "Company name must be at least 2 characters").max(200),
  companyId: companyIdSchema,
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

// For registration, use the individual schemas directly
// registrationSchema was causing issues with nested discriminated unions
// Use freelancerRegistrationSchema, individualEmployerRegistrationSchema, 
// or companyEmployerRegistrationSchema based on the role/employerType

// ============================================
// Project schemas
// ============================================

export const projectCategorySchema = z.enum([
  "web_development",
  "mobile_development",
  "design",
  "writing",
  "marketing",
  "video",
  "music",
  "translation",
  "consulting",
  "other",
]);

export const createProjectSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(200),
  description: z.string().min(20, "Description must be at least 20 characters").max(5000),
  category: projectCategorySchema,
  budget: z.coerce.number().positive("Budget must be positive"),
  deadline: z.string().datetime().optional(),
});

export const updateProjectStatusSchema = z.object({
  status: z.enum(["open", "in_progress", "completed", "cancelled"]),
});

// ============================================
// Proposal schemas
// ============================================

export const createProposalSchema = z.object({
  projectId: z.string().cuid(),
  coverLetter: z.string().min(50, "Cover letter must be at least 50 characters").max(2000),
  proposedBudget: z.coerce.number().positive("Budget must be positive"),
  estimatedDays: z.coerce.number().int().min(1).max(365),
});

export const updateProposalStatusSchema = z.object({
  status: z.enum(["pending", "accepted", "rejected", "withdrawn"]),
});

// ============================================
// Message schemas
// ============================================

export const createMessageSchema = z.object({
  content: z.string().min(1, "Message cannot be empty").max(5000),
  attachments: z.array(z.string().url()).max(10).optional(),
});

export const createThreadSchema = z.object({
  recipientId: z.string().cuid(),
  subject: z.string().min(1).max(200).optional(),
  message: z.string().min(1, "Message cannot be empty").max(5000),
});

// ============================================
// Review schemas
// ============================================

export const createReviewSchema = z.object({
  projectId: z.string().cuid(),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().min(10, "Review must be at least 10 characters").max(1000),
});

// ============================================
// Profile schemas
// ============================================

export const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  bio: z.string().max(1000).optional(),
  skills: z.array(z.string().max(50)).max(20).optional(),
  hourlyRate: z.coerce.number().positive().optional(),
  phone: phoneSchema.optional(),
});

// ============================================
// Password reset schemas
// ============================================

export const passwordResetRequestSchema = z.object({
  email: emailSchema,
});

export const passwordResetConfirmSchema = z.object({
  token: z.string().min(1),
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

// ============================================
// Utility function for API validation
// ============================================

export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; errors: z.ZodIssue[] };

export function validate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): ValidationResult<T> {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error.issues };
}

export function formatZodErrors(issues: z.ZodIssue[]): string {
  return issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ");
}
