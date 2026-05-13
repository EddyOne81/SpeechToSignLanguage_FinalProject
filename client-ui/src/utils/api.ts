export const BACKEND_BASE_URL =
  import.meta.env.VITE_BACKEND_URL ?? "http://127.0.0.1:8080";

export const unwrapApiResponse = (body: any) => {
  if (body?.data?.data !== undefined) {
    return body.data.data;
  }
  if (body?.data !== undefined) {
    return body.data;
  }
  return body;
};

export const extractPayloadFromApiResponse = (body: any) => {
  const payload = unwrapApiResponse(body);
  if (payload?.recognized_text_en) {
    return payload;
  }
  return null;
};

export const extractPageContent = (body: any) => {
  const payload = unwrapApiResponse(body);
  if (payload?.content && Array.isArray(payload.content)) {
    return payload;
  }
  if (Array.isArray(payload)) {
    return { content: payload };
  }
  return { content: [] };
};

export const extractErrorMessage = (body: any) => {
  if (!body) {
    return "Server connection failed.";
  }
  return (
    body.message || body.detail || body.error || "Server connection failed."
  );
};
