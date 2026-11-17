import { NextResponse } from "next/server";
import { z } from "zod";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function privateJson(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
export function apiError(error: unknown) {
  if (error instanceof HttpError)
    return privateJson({ error: error.message }, error.status);
  if (error instanceof z.ZodError)
    return privateJson({ error: "요청 형식이 올바르지 않습니다." }, 400);
  // Never log provider responses, authorization headers, cookies or user content.
  console.error(
    JSON.stringify({
      event: "api_failure",
      error: error instanceof Error ? error.name : "UnknownError",
      at: new Date().toISOString(),
    }),
  );
  return privateJson(
    { error: "요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요." },
    500,
  );
}
export async function readJson<T>(
  request: Request,
  schema: z.ZodType<T>,
  sameOrigin = true,
): Promise<T> {
  if (sameOrigin) {
    const origin = request.headers.get("origin");
    const expected = process.env.APP_ORIGIN || new URL(request.url).origin;
    if (!origin || origin !== new URL(expected).origin)
      throw new HttpError(403, "허용되지 않은 요청입니다.");
  }
  if (!request.headers.get("content-type")?.includes("application/json"))
    throw new HttpError(415, "JSON 요청이 필요합니다.");
  if (Number(request.headers.get("content-length") || 0) > 16384)
    throw new HttpError(413, "요청이 너무 큽니다.");
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "요청이 비어 있습니다.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 16384) {
      await reader.cancel();
      throw new HttpError(413, "요청이 너무 큽니다.");
    }
    chunks.push(value);
  }
  const data = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    data.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return schema.parse(JSON.parse(new TextDecoder().decode(data)));
  } catch (error) {
    if (error instanceof z.ZodError) throw error;
    throw new HttpError(400, "JSON 형식이 올바르지 않습니다.");
  }
}
