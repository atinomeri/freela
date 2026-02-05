// Vitest setup file
import { vi, afterEach } from "vitest";

// Mock environment variables for tests
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
process.env.NEXTAUTH_SECRET = "test-secret-for-unit-tests";
process.env.NEXTAUTH_URL = "http://localhost:3000";

// Mock console.error to keep test output clean (optional)
vi.spyOn(console, "error").mockImplementation(() => {});

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks();
});
