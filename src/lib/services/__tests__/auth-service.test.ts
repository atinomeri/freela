/**
 * Auth Service — unit tests
 *
 * External dependencies (prisma, rate-limit, password-strength, email, categories, logger)
 * are mocked so tests run in isolation.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ───────────────────────────────────────────────────

const { mockPrisma, mockRateLimit, mockPasswordStrength, mockEmail, mockLogger } = vi.hoisted(
  () => {
    const mockPrisma = {
      user: { findUnique: vi.fn(), create: vi.fn(), delete: vi.fn() },
      emailVerificationToken: { create: vi.fn() },
    };
    const mockRateLimit = {
      checkRateLimit: vi.fn(async () => ({ allowed: true, remaining: 10 })),
    };
    const mockPasswordStrength = {
      validatePasswordStrength: vi.fn(() => ({
        isAcceptable: true,
        score: 3,
        feedback: "",
        suggestions: [],
      })),
    };
    const mockEmail = {
      isEmailConfigured: vi.fn(() => false),
      sendEmail: vi.fn(async () => undefined),
    };
    const mockLogger = {
      reportError: vi.fn(),
      logInfo: vi.fn(),
    };
    return { mockPrisma, mockRateLimit, mockPasswordStrength, mockEmail, mockLogger };
  }
);

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/rate-limit", () => mockRateLimit);
vi.mock("@/lib/password-strength", () => mockPasswordStrength);
vi.mock("@/lib/email", () => mockEmail);
vi.mock("@/lib/email-templates/verify-email", () => ({
  verifyEmailTemplate: vi.fn(() => ({
    subject: "Verify",
    text: "Verify your email",
    html: "<p>Verify</p>",
  })),
}));
vi.mock("@/lib/logger", () => mockLogger);
vi.mock("@/lib/categories", () => ({
  isFreelancerCategory: vi.fn((v: string) =>
    ["construction", "plumbing", "electrical", "cleaning"].includes(v)
  ),
}));

import { parseAndValidate, enforceRateLimits, register } from "../auth-service";
import { ServiceError } from "../errors";

// ── Helpers ─────────────────────────────────────────────────

function validFreelancerRaw(): Record<string, unknown> {
  return {
    role: "freelancer",
    category: "construction",
    name: "Test User",
    personalId: "12345678901",
    birthDate: "1990-05-15",
    phone: "+995599123456",
    email: "test@example.com",
    password: "StrongPass123!",
    confirmPassword: "StrongPass123!",
  };
}

function validIndividualEmployerRaw(): Record<string, unknown> {
  return {
    role: "employer",
    employerType: "individual",
    name: "Employer Name",
    personalId: "12345678901",
    birthDate: "1985-03-20",
    phone: "+995599111222",
    email: "employer@example.com",
    password: "StrongPass123!",
    confirmPassword: "StrongPass123!",
  };
}

function validCompanyEmployerRaw(): Record<string, unknown> {
  return {
    role: "employer",
    employerType: "company",
    companyName: "Some Company LLC",
    companyId: "123456789",
    phone: "+995599333444",
    email: "company@example.com",
    password: "StrongPass123!",
    confirmPassword: "StrongPass123!",
  };
}

const createdUser = { id: "user-1", email: "test@example.com", role: "FREELANCER" };

beforeEach(() => {
  vi.clearAllMocks();
  mockRateLimit.checkRateLimit.mockResolvedValue({ allowed: true, remaining: 10 });
  mockPasswordStrength.validatePasswordStrength.mockReturnValue({
    isAcceptable: true,
    score: 3,
    feedback: "",
    suggestions: [],
  });
  mockEmail.isEmailConfigured.mockReturnValue(false);
  mockPrisma.user.findUnique.mockResolvedValue(null);
  mockPrisma.user.create.mockResolvedValue(createdUser);
  mockPrisma.emailVerificationToken.create.mockResolvedValue({ id: "token-1" });
});

// ─── parseAndValidate() ─────────────────────────────────────

describe("parseAndValidate", () => {
  it("parses a valid freelancer payload", () => {
    const result = parseAndValidate(validFreelancerRaw());
    expect(result.role).toBe("freelancer");
    expect(result.email).toBe("test@example.com");
    expect(result.phone).toBe("+995599123456");
  });

  it("parses a valid individual employer payload", () => {
    const result = parseAndValidate(validIndividualEmployerRaw());
    expect(result.role).toBe("employer");
    expect(result.employerType).toBe("individual");
  });

  it("parses a valid company employer payload", () => {
    const result = parseAndValidate(validCompanyEmployerRaw());
    expect(result.role).toBe("employer");
    expect(result.employerType).toBe("company");
  });

  it("throws ROLE_INVALID for bad role", () => {
    expect(() => parseAndValidate({ ...validFreelancerRaw(), role: "admin" })).toThrow(ServiceError);
    try {
      parseAndValidate({ ...validFreelancerRaw(), role: "admin" });
    } catch (e) {
      expect((e as ServiceError).code).toBe("ROLE_INVALID");
    }
  });

  it("throws EMAIL_INVALID for missing/bad email", () => {
    expect(() => parseAndValidate({ ...validFreelancerRaw(), email: "bademail" })).toThrow(ServiceError);
    try {
      parseAndValidate({ ...validFreelancerRaw(), email: "" });
    } catch (e) {
      expect((e as ServiceError).code).toBe("EMAIL_INVALID");
    }
  });

  it("throws PHONE_REQUIRED for empty phone", () => {
    expect(() => parseAndValidate({ ...validFreelancerRaw(), phone: "" })).toThrow(ServiceError);
    try {
      parseAndValidate({ ...validFreelancerRaw(), phone: "" });
    } catch (e) {
      expect((e as ServiceError).code).toBe("PHONE_REQUIRED");
    }
  });

  it("throws PHONE_INVALID for phone without +", () => {
    expect(() => parseAndValidate({ ...validFreelancerRaw(), phone: "599123456" })).toThrow(
      ServiceError
    );
  });

  it("throws PASSWORD_WEAK for weak password", () => {
    mockPasswordStrength.validatePasswordStrength.mockReturnValue({
      isAcceptable: false,
      score: 1,
      feedback: "Too guessable",
      suggestions: ["Add symbols"],
    });
    expect(() => parseAndValidate(validFreelancerRaw())).toThrow(ServiceError);
    try {
      parseAndValidate(validFreelancerRaw());
    } catch (e) {
      expect((e as ServiceError).code).toBe("PASSWORD_WEAK");
    }
  });

  it("throws CONFIRM_REQUIRED when confirmPassword missing", () => {
    const raw = validFreelancerRaw();
    delete raw.confirmPassword;
    expect(() => parseAndValidate(raw)).toThrow(ServiceError);
  });

  it("throws PASSWORDS_MISMATCH when passwords differ", () => {
    const raw = validFreelancerRaw();
    raw.confirmPassword = "Different123!";
    expect(() => parseAndValidate(raw)).toThrow(ServiceError);
  });

  it("throws CATEGORY_REQUIRED for freelancer without category", () => {
    const raw = validFreelancerRaw();
    raw.category = "";
    expect(() => parseAndValidate(raw)).toThrow(ServiceError);
  });

  it("throws CATEGORY_INVALID for unknown category", () => {
    const raw = validFreelancerRaw();
    raw.category = "unknown_category";
    expect(() => parseAndValidate(raw)).toThrow(ServiceError);
  });

  it("throws NAME_REQUIRED for short name", () => {
    const raw = validFreelancerRaw();
    raw.name = "A";
    expect(() => parseAndValidate(raw)).toThrow(ServiceError);
  });

  it("throws PERSONAL_ID_LENGTH for bad personalId", () => {
    const raw = validFreelancerRaw();
    raw.personalId = "123";
    expect(() => parseAndValidate(raw)).toThrow(ServiceError);
  });

  it("throws BIRTHDATE_INVALID for bad date", () => {
    const raw = validFreelancerRaw();
    raw.birthDate = "not-a-date";
    expect(() => parseAndValidate(raw)).toThrow(ServiceError);
  });

  it("throws BIRTHDATE_INVALID for future date", () => {
    const raw = validFreelancerRaw();
    raw.birthDate = "2099-01-01";
    expect(() => parseAndValidate(raw)).toThrow(ServiceError);
  });

  it("throws EMPLOYER_TYPE_INVALID for bad employer type", () => {
    const raw = validIndividualEmployerRaw();
    raw.employerType = "ngo";
    expect(() => parseAndValidate(raw)).toThrow(ServiceError);
  });

  it("throws COMPANY_NAME_REQUIRED for short company name", () => {
    const raw = validCompanyEmployerRaw();
    raw.companyName = "A";
    expect(() => parseAndValidate(raw)).toThrow(ServiceError);
  });

  it("throws COMPANY_ID_LENGTH for bad companyId", () => {
    const raw = validCompanyEmployerRaw();
    raw.companyId = "12";
    expect(() => parseAndValidate(raw)).toThrow(ServiceError);
  });
});

// ─── enforceRateLimits() ────────────────────────────────────

describe("enforceRateLimits", () => {
  it("passes when both limits are allowed", async () => {
    await expect(enforceRateLimits("127.0.0.1", "a@b.com")).resolves.toBeUndefined();
    expect(mockRateLimit.checkRateLimit).toHaveBeenCalledTimes(2);
  });

  it("throws RATE_LIMITED when IP limit exceeded", async () => {
    mockRateLimit.checkRateLimit.mockResolvedValueOnce({ allowed: false, remaining: 0 });
    await expect(enforceRateLimits("127.0.0.1", "a@b.com")).rejects.toThrow(ServiceError);
    try {
      mockRateLimit.checkRateLimit.mockResolvedValueOnce({ allowed: false, remaining: 0 });
      await enforceRateLimits("127.0.0.1", "a@b.com");
    } catch (e) {
      expect((e as ServiceError).code).toBe("RATE_LIMITED");
    }
  });

  it("throws RATE_LIMITED when email limit exceeded", async () => {
    mockRateLimit.checkRateLimit
      .mockResolvedValueOnce({ allowed: true, remaining: 5 })
      .mockResolvedValueOnce({ allowed: false, remaining: 0 });
    await expect(enforceRateLimits("127.0.0.1", "a@b.com")).rejects.toThrow(ServiceError);
  });
});

// ─── register() ─────────────────────────────────────────────

describe("register", () => {
  it("creates a freelancer user successfully", async () => {
    const result = await register({ raw: validFreelancerRaw(), ip: "127.0.0.1" });
    expect(result.user.id).toBe("user-1");
    expect(result.messageCode).toBe("EMAIL_VERIFICATION_SENT");
    expect(mockPrisma.user.create).toHaveBeenCalledTimes(1);
  });

  it("creates an employer (company) user successfully", async () => {
    mockPrisma.user.create.mockResolvedValue({
      id: "user-2",
      email: "company@example.com",
      role: "EMPLOYER",
    });
    const result = await register({ raw: validCompanyEmployerRaw(), ip: "127.0.0.1" });
    expect(result.user.email).toBe("company@example.com");
    expect(result.messageCode).toBe("EMAIL_VERIFICATION_SENT");
  });

  it("throws USER_EXISTS when email already taken", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: "existing" });
    await expect(register({ raw: validFreelancerRaw(), ip: "127.0.0.1" })).rejects.toThrow(
      ServiceError
    );
    try {
      mockPrisma.user.findUnique.mockResolvedValue({ id: "existing" });
      await register({ raw: validFreelancerRaw(), ip: "127.0.0.1" });
    } catch (e) {
      expect((e as ServiceError).code).toBe("USER_EXISTS");
    }
  });

  it("calls rate limit checks", async () => {
    await register({ raw: validFreelancerRaw(), ip: "10.0.0.1" });
    expect(mockRateLimit.checkRateLimit).toHaveBeenCalledWith(
      expect.objectContaining({ scope: "register:ip", key: "10.0.0.1" })
    );
    expect(mockRateLimit.checkRateLimit).toHaveBeenCalledWith(
      expect.objectContaining({ scope: "register:email", key: "test@example.com" })
    );
  });

  it("returns debugVerifyUrl in dev when email not configured", async () => {
    mockEmail.isEmailConfigured.mockReturnValue(false);
    const result = await register({ raw: validFreelancerRaw(), ip: "127.0.0.1" });
    expect(result.debugVerifyUrl).toBeDefined();
    expect(result.debugVerifyUrl).toContain("/auth/verify-email?token=");
  });

  it("sends email when configured and returns without debugVerifyUrl", async () => {
    mockEmail.isEmailConfigured.mockReturnValue(true);
    mockEmail.sendEmail.mockResolvedValue(undefined);
    const result = await register({ raw: validFreelancerRaw(), ip: "127.0.0.1" });
    expect(mockEmail.sendEmail).toHaveBeenCalledTimes(1);
    expect(result.debugVerifyUrl).toBeUndefined();
    expect(result.messageCode).toBe("EMAIL_VERIFICATION_SENT");
  });

  it("creates email verification token", async () => {
    await register({ raw: validFreelancerRaw(), ip: "127.0.0.1" });
    expect(mockPrisma.emailVerificationToken.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: "user-1" }),
      })
    );
  });

  it("validates input before checking rate limits", async () => {
    const raw = validFreelancerRaw();
    raw.role = "invalid";
    await expect(register({ raw, ip: "127.0.0.1" })).rejects.toThrow(ServiceError);
    expect(mockRateLimit.checkRateLimit).not.toHaveBeenCalled();
  });

  it("handles rate limit rejection during registration", async () => {
    mockRateLimit.checkRateLimit.mockResolvedValueOnce({ allowed: false, remaining: 0 });
    await expect(register({ raw: validFreelancerRaw(), ip: "127.0.0.1" })).rejects.toThrow(
      ServiceError
    );
    expect(mockPrisma.user.create).not.toHaveBeenCalled();
  });
});
