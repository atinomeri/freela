import { describe, it, expect } from "vitest";
import {
  FREELANCER_CATEGORY_VALUES,
  FREELANCER_CATEGORIES,
  isFreelancerCategory,
  getFreelancerCategoryLabel,
  type FreelancerCategory,
} from "./categories";

describe("FREELANCER_CATEGORY_VALUES", () => {
  it("contains all expected categories", () => {
    const expectedCategories = [
      "IT_DEVELOPMENT",
      "DESIGN_CREATIVE",
      "MARKETING_CONTENT",
      "FINANCE",
      "LOGISTICS",
      "BUSINESS_ADMIN",
      "CONSTRUCTION",
      "TRANSPORT",
      "OTHER",
    ];

    expect(FREELANCER_CATEGORY_VALUES).toEqual(expectedCategories);
  });

  it("has 9 categories", () => {
    expect(FREELANCER_CATEGORY_VALUES).toHaveLength(9);
  });

  it("is readonly array", () => {
    // TypeScript ensures this at compile time
    expect(Array.isArray(FREELANCER_CATEGORY_VALUES)).toBe(true);
  });
});

describe("FREELANCER_CATEGORIES", () => {
  it("has correct structure", () => {
    expect(FREELANCER_CATEGORIES).toHaveLength(9);
    
    FREELANCER_CATEGORIES.forEach((category) => {
      expect(category).toHaveProperty("value");
      expect(typeof category.value).toBe("string");
    });
  });

  it("maps values correctly", () => {
    const values = FREELANCER_CATEGORIES.map((c) => c.value);
    expect(values).toEqual(FREELANCER_CATEGORY_VALUES);
  });
});

describe("isFreelancerCategory", () => {
  describe("valid categories", () => {
    it.each(FREELANCER_CATEGORY_VALUES)("returns true for %s", (category) => {
      expect(isFreelancerCategory(category)).toBe(true);
    });
  });

  describe("invalid inputs", () => {
    it("returns false for random string", () => {
      expect(isFreelancerCategory("INVALID_CATEGORY")).toBe(false);
      expect(isFreelancerCategory("random")).toBe(false);
    });

    it("returns false for empty string", () => {
      expect(isFreelancerCategory("")).toBe(false);
    });

    it("returns false for null", () => {
      expect(isFreelancerCategory(null)).toBe(false);
    });

    it("returns false for undefined", () => {
      expect(isFreelancerCategory(undefined)).toBe(false);
    });

    it("returns false for number", () => {
      expect(isFreelancerCategory(123)).toBe(false);
    });

    it("returns false for object", () => {
      expect(isFreelancerCategory({ value: "IT_DEVELOPMENT" })).toBe(false);
    });

    it("returns false for array", () => {
      expect(isFreelancerCategory(["IT_DEVELOPMENT"])).toBe(false);
    });

    it("returns false for lowercase version", () => {
      expect(isFreelancerCategory("it_development")).toBe(false);
    });
  });
});

describe("getFreelancerCategoryLabel", () => {
  describe("with default labels (no translator)", () => {
    it("returns correct label for IT_DEVELOPMENT", () => {
      expect(getFreelancerCategoryLabel("IT_DEVELOPMENT")).toBe("IT / Development");
    });

    it("returns correct label for DESIGN_CREATIVE", () => {
      expect(getFreelancerCategoryLabel("DESIGN_CREATIVE")).toBe("Design / Creative");
    });

    it("returns correct label for MARKETING_CONTENT", () => {
      expect(getFreelancerCategoryLabel("MARKETING_CONTENT")).toBe("Marketing / Content");
    });

    it("returns correct label for all categories", () => {
      const expectedLabels: Record<FreelancerCategory, string> = {
        IT_DEVELOPMENT: "IT / Development",
        DESIGN_CREATIVE: "Design / Creative",
        MARKETING_CONTENT: "Marketing / Content",
        FINANCE: "Finance",
        LOGISTICS: "Logistics",
        BUSINESS_ADMIN: "Business / Administrative",
        CONSTRUCTION: "Construction",
        TRANSPORT: "Transport",
        OTHER: "Other",
      };

      Object.entries(expectedLabels).forEach(([category, label]) => {
        expect(getFreelancerCategoryLabel(category as FreelancerCategory)).toBe(label);
      });
    });
  });

  describe("with null/undefined value", () => {
    it("returns empty string for null", () => {
      expect(getFreelancerCategoryLabel(null)).toBe("");
    });

    it("returns empty string for undefined", () => {
      expect(getFreelancerCategoryLabel(undefined)).toBe("");
    });
  });

  describe("with translator function", () => {
    it("uses translator when provided", () => {
      const mockTranslator = (key: FreelancerCategory) => {
        const translations: Record<FreelancerCategory, string> = {
          IT_DEVELOPMENT: "IT / განვითარება",
          DESIGN_CREATIVE: "დიზაინი / კრეატივი",
          MARKETING_CONTENT: "მარკეტინგი / კონტენტი",
          FINANCE: "ფინანსები",
          LOGISTICS: "ლოჯისტიკა",
          BUSINESS_ADMIN: "ბიზნესი / ადმინისტრაცია",
          CONSTRUCTION: "მშენებლობა",
          TRANSPORT: "ტრანსპორტი",
          OTHER: "სხვა",
        };
        return translations[key];
      };

      expect(getFreelancerCategoryLabel("IT_DEVELOPMENT", mockTranslator)).toBe("IT / განვითარება");
      expect(getFreelancerCategoryLabel("FINANCE", mockTranslator)).toBe("ფინანსები");
    });

    it("still returns empty for null even with translator", () => {
      const mockTranslator = () => "translated";
      expect(getFreelancerCategoryLabel(null, mockTranslator)).toBe("");
    });
  });
});
