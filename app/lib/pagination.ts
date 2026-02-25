import { NextRequest } from "next/server";

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export function parsePagination(req: NextRequest): PaginationParams {
  const params = req.nextUrl.searchParams;
  const page = Math.max(1, parseInt(params.get("page") || "1", 10) || 1);
  const rawLimit = parseInt(params.get("limit") || String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT;
  const limit = Math.min(Math.max(1, rawLimit), MAX_LIMIT);
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

export function paginatedResult<T>(
  data: T[],
  total: number,
  params: PaginationParams
): PaginatedResponse<T> {
  const totalPages = Math.ceil(total / params.limit);
  return {
    data,
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages,
      hasMore: params.page < totalPages,
    },
  };
}
