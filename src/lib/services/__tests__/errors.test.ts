import { describe, it, expect } from "vitest";
import {
  ServiceError,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  badRequest,
  rateLimited,
  internal,
} from "../errors";

describe("ServiceError", () => {
  it("has correct name and code", () => {
    const err = new ServiceError("MY_CODE", 422);
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("ServiceError");
    expect(err.code).toBe("MY_CODE");
    expect(err.statusHint).toBe(422);
    expect(err.message).toBe("MY_CODE");
  });

  it("defaults statusHint to 400", () => {
    const err = new ServiceError("BAD");
    expect(err.statusHint).toBe(400);
  });

  it("carries extra metadata", () => {
    const err = new ServiceError("X", 400, { field: "email" });
    expect(err.extra).toEqual({ field: "email" });
  });
});

describe("factory helpers", () => {
  it("unauthorized() → 401", () => {
    const e = unauthorized();
    expect(e.statusHint).toBe(401);
    expect(e.code).toBe("UNAUTHORIZED");
  });

  it("unauthorized(custom) keeps custom code", () => {
    expect(unauthorized("CUSTOM").code).toBe("CUSTOM");
  });

  it("forbidden() → 403", () => {
    expect(forbidden().statusHint).toBe(403);
  });

  it("notFound() → 404", () => {
    expect(notFound().statusHint).toBe(404);
  });

  it("conflict(code) → 409", () => {
    const e = conflict("DUPLICATE");
    expect(e.statusHint).toBe(409);
    expect(e.code).toBe("DUPLICATE");
  });

  it("badRequest(code, extra) → 400", () => {
    const e = badRequest("FIELD_MISSING", { field: "name" });
    expect(e.statusHint).toBe(400);
    expect(e.extra).toEqual({ field: "name" });
  });

  it("rateLimited() → 429", () => {
    expect(rateLimited().statusHint).toBe(429);
  });

  it("internal() → 500", () => {
    expect(internal().statusHint).toBe(500);
  });
});
