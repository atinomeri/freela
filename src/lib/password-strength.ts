import "server-only";
import { zxcvbn, zxcvbnOptions } from "@zxcvbn-ts/core";

// Custom dictionary for Georgian/common terms
const customDictionary = {
  passwords: [
    "freela",
    "freelancer",
    "employer",
    "georgia",
    "password",
    "123456",
    "qwerty",
    "12345678",
    "111111",
    "123123",
    "1q2w3e",
    "password123",
  ],
};

zxcvbnOptions.setOptions({ dictionary: customDictionary });

export type PasswordStrengthResult = {
  score: 0 | 1 | 2 | 3 | 4; // 0 = very weak, 4 = very strong
  feedback: string;
  suggestions: string[];
  isAcceptable: boolean; // true if score >= 2
};

/**
 * Validate password strength using zxcvbn
 * Returns detailed feedback and whether password is acceptable for use
 */
export function validatePasswordStrength(password: string): PasswordStrengthResult {
  if (!password || password.length < 8) {
    return {
      score: 0,
      feedback: "Password must be at least 8 characters long",
      suggestions: ["Add more characters to your password"],
      isAcceptable: false,
    };
  }

  if (password.length > 128) {
    return {
      score: 0,
      feedback: "Password is too long",
      suggestions: ["Use a shorter password"],
      isAcceptable: false,
    };
  }

  const result = zxcvbn(password);

  const feedbackMessages: Record<number, string> = {
    0: "Very weak password",
    1: "Weak password - consider adding more variety",
    2: "Fair password - acceptable for most purposes",
    3: "Strong password - good security",
    4: "Very strong password - excellent security",
  };

  return {
    score: result.score as 0 | 1 | 2 | 3 | 4,
    feedback: feedbackMessages[result.score],
    suggestions: result.feedback?.suggestions ?? [],
    isAcceptable: result.score >= 2, // Require score of 2 or higher
  };
}

/**
 * Check if password meets minimum security requirements
 * Returns boolean for simple allow/deny scenarios
 */
export function isPasswordStrong(password: string): boolean {
  const result = validatePasswordStrength(password);
  return result.isAcceptable;
}

/**
 * Get human-readable password strength level
 */
export function getPasswordStrengthLevel(password: string): "very-weak" | "weak" | "fair" | "strong" | "very-strong" {
  const result = zxcvbn(password);
  const levels = ["very-weak", "weak", "fair", "strong", "very-strong"] as const;
  return levels[result.score] ?? "very-weak";
}
