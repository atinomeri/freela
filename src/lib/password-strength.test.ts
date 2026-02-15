import { describe, it, expect, vi } from "vitest";

// Mock server-only
vi.mock("server-only", () => ({}));

import { validatePasswordStrength, isPasswordStrong } from "./password-strength";

describe("validatePasswordStrength", () => {
  describe("password length validation", () => {
    it("rejects empty password", () => {
      const result = validatePasswordStrength("");
      
      expect(result.score).toBe(0);
      expect(result.isAcceptable).toBe(false);
      expect(result.feedback).toContain("at least 8 characters");
    });

    it("rejects password shorter than 8 characters", () => {
      const result = validatePasswordStrength("short");
      
      expect(result.score).toBe(0);
      expect(result.isAcceptable).toBe(false);
      expect(result.feedback).toContain("at least 8 characters");
    });

    it("rejects password over 128 characters", () => {
      const longPassword = "a".repeat(129);
      const result = validatePasswordStrength(longPassword);
      
      expect(result.score).toBe(0);
      expect(result.isAcceptable).toBe(false);
      expect(result.feedback).toContain("too long");
    });

    it("accepts 128-character password", () => {
      const maxPassword = "Aa1!".repeat(32); // 128 chars
      const result = validatePasswordStrength(maxPassword);
      
      expect(result.feedback).not.toContain("too long");
    });
  });

  describe("weak passwords", () => {
    it("marks common passwords as weak", () => {
      const weakPasswords = [
        "password123",
        "12345678",
        "qwertyui",
        "aaaaaaaa",
      ];

      for (const password of weakPasswords) {
        const result = validatePasswordStrength(password);
        expect(result.score).toBeLessThanOrEqual(1);
        expect(result.isAcceptable).toBe(false);
      }
    });

    it("marks custom dictionary words as weak", () => {
      // "freela" is in custom dictionary
      const result = validatePasswordStrength("freelancer1");
      
      expect(result.score).toBeLessThanOrEqual(2);
    });
  });

  describe("strong passwords", () => {
    it("marks complex password as strong", () => {
      const result = validatePasswordStrength("H7$kP9@mWqZ3!nXv");
      
      expect(result.score).toBeGreaterThanOrEqual(3);
      expect(result.isAcceptable).toBe(true);
    });

    it("accepts passphrase with good entropy", () => {
      const result = validatePasswordStrength("correct horse battery staple");
      
      // Though famous, this still has good entropy
      expect(result.isAcceptable).toBe(true);
    });
  });

  describe("feedback messages", () => {
    it("returns appropriate feedback for weak password", () => {
      const result = validatePasswordStrength("11111111");
      
      expect(result.feedback).toBeDefined();
      expect(result.feedback.length).toBeGreaterThan(0);
    });

    it("returns suggestions array", () => {
      const result = validatePasswordStrength("password12");
      
      expect(Array.isArray(result.suggestions)).toBe(true);
    });

    it("returns strong feedback for excellent password", () => {
      const result = validatePasswordStrength("X#9kL!mP@wQ2$nRv%tYz");
      
      if (result.score === 4) {
        expect(result.feedback).toContain("Very strong");
      }
    });
  });

  describe("score ranges", () => {
    it("returns score between 0 and 4", () => {
      const testPasswords = [
        "aaaaaaaa",
        "Password1",
        "MyP@ssw0rd!",
        "X#9k!mPQ2nRv",
        "K3j$Lm@9pWz!QrTv#",
      ];

      for (const password of testPasswords) {
        const result = validatePasswordStrength(password);
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(4);
      }
    });

    it("isAcceptable is true only for score >= 2", () => {
      // We test this implicitly - strong password should be acceptable
      const strongResult = validatePasswordStrength("MyC0mpl3x!Pass@2024");
      expect(strongResult.score).toBeGreaterThanOrEqual(2);
      expect(strongResult.isAcceptable).toBe(strongResult.score >= 2);
    });
  });
});

describe("isPasswordStrong", () => {
  it("returns false for weak passwords", () => {
    expect(isPasswordStrong("")).toBe(false);
    expect(isPasswordStrong("short")).toBe(false);
    expect(isPasswordStrong("12345678")).toBe(false);
    expect(isPasswordStrong("password")).toBe(false);
  });

  it("returns true for strong passwords", () => {
    expect(isPasswordStrong("H7$kP9@mWqZ3!nXv")).toBe(true);
    expect(isPasswordStrong("MyC0mpl3x!Passw")).toBe(true);
  });

  it("works with validatePasswordStrength consistency", () => {
    const testPasswords = [
      "testpass",
      "Password123!",
      "X#9kL!mP@wQ2$nRv%",
    ];

    for (const password of testPasswords) {
      const detailed = validatePasswordStrength(password);
      const simple = isPasswordStrong(password);
      
      expect(simple).toBe(detailed.isAcceptable);
    }
  });
});
