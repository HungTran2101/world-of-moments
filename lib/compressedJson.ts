import { brotliCompress, constants, gzip } from "node:zlib";
import { promisify } from "node:util";

const compressBrotli = promisify(brotliCompress);
const compressGzip = promisify(gzip);
const MIN_COMPRESSION_BYTES = 1024;

export async function compressedJson(data: unknown, request: Request, additionalHeaders?: HeadersInit): Promise<Response> {
  const body = Buffer.from(JSON.stringify(data));
  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    Vary: "Accept-Encoding",
  });

  new Headers(additionalHeaders).forEach((value, key) => headers.set(key, value));

  // Tôn trọng q=0 và ưu tiên của client; wildcard chỉ áp dụng khi không khai báo riêng encoding.
  const accepted = new Map<string, number>();
  for (const item of (request.headers.get("accept-encoding") ?? "").split(",")) {
    const [name, ...parameters] = item.trim().toLowerCase().split(";");
    const qualityParameter = parameters.find((parameter) => parameter.trim().startsWith("q="));
    const quality = qualityParameter ? Number(qualityParameter.trim().slice(2)) : 1;
    accepted.set(name, Number.isFinite(quality) && quality >= 0 && quality <= 1 ? quality : 0);
  }
  const quality = (encoding: string) => accepted.get(encoding) ?? accepted.get("*") ?? 0;
  const identityQuality = accepted.get("identity") ?? (accepted.get("*") === 0 ? 0 : 1);
  const encoding = quality("br") >= quality("gzip") ? "br" : "gzip";
  const shouldCompress = quality(encoding) > 0
    && quality(encoding) >= (accepted.get("identity") ?? 0)
    && (body.byteLength >= MIN_COMPRESSION_BYTES || identityQuality === 0);

  if (!shouldCompress) {
    if (identityQuality === 0) {
      return new Response(null, { status: 406, headers });
    }
    return new Response(body, { headers });
  }

  // Nén bất đồng bộ để không chặn event loop; payload nhỏ giữ nguyên để tránh tốn CPU vô ích.
  const compressed = encoding === "br"
    ? await compressBrotli(body, { params: { [constants.BROTLI_PARAM_QUALITY]: 4 } })
    : await compressGzip(body);
  if (compressed.byteLength >= body.byteLength && identityQuality > 0) {
    return new Response(body, { headers });
  }

  headers.set("Content-Encoding", encoding);
  return new Response(new Uint8Array(compressed), { headers });
}
