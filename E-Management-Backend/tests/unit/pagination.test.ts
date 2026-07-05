import { buildPaginatedResult } from "../../src/utils/pagination";

describe("buildPaginatedResult", () => {
  it("computes totalPages by ceiling division", () => {
    const result = buildPaginatedResult([1, 2, 3], 25, { page: 1, limit: 10 });
    expect(result).toEqual({ items: [1, 2, 3], total: 25, page: 1, limit: 10, totalPages: 3 });
  });

  it("returns totalPages of 1 when there are zero results", () => {
    const result = buildPaginatedResult([], 0, { page: 1, limit: 10 });
    expect(result.totalPages).toBe(1);
  });

  it("returns exact totalPages when total is a multiple of limit", () => {
    const result = buildPaginatedResult([], 20, { page: 1, limit: 10 });
    expect(result.totalPages).toBe(2);
  });
});
