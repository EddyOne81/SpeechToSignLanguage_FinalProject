import { BACKEND_BASE_URL, extractErrorMessage } from "../utils/api";

export async function adminFetch(
  path: string,
  options: RequestInit = {}
): Promise<any> {
  const headers = new Headers(options.headers as HeadersInit | undefined);
  if (
    !headers.has("Content-Type") &&
    options.body &&
    !(options.body instanceof FormData)
  ) {
    headers.set("Content-Type", "application/json");
  }
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }
  const res = await fetch(`${BACKEND_BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(extractErrorMessage(body));
  return body;
}

export function unwrapData(body: any): any {
  if (body?.data?.data !== undefined) return body.data.data;
  if (body?.data !== undefined) return body.data;
  return body;
}

export function unwrapPage(body: any): {
  content: any[];
  totalPages: number;
  totalElements: number;
  number: number;
} {
  const data = unwrapData(body);
  if (data?.content && Array.isArray(data.content)) {
    return {
      content: data.content,
      totalPages: Number(data.totalPages ?? 1),
      totalElements: Number(data.totalElements ?? data.content.length),
      number: Number(data.number ?? 0),
    };
  }
  if (Array.isArray(data)) {
    return { content: data, totalPages: 1, totalElements: data.length, number: 0 };
  }
  return { content: [], totalPages: 0, totalElements: 0, number: 0 };
}
