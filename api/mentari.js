import http2 from "node:http2";

const MENTARI_BASE_URL = "https://mentari.unpam.ac.id/api";

function requestMentariHttp2(targetUrl, authHeader) {
  return new Promise((resolve, reject) => {
    const url = new URL(targetUrl);
    const client = http2.connect(url.origin);

    const req = client.request({
      ":method": "GET",
      ":path": url.pathname + url.search,
      ":authority": url.host,
      ":scheme": "https",
      authorization: authHeader.startsWith("Bearer ")
        ? authHeader
        : `Bearer ${authHeader}`,
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      accept: "application/json, text/plain, */*",
      "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
      "sec-ch-ua":
        '"Chromium";v="131", "Google Chrome";v="131", "Not_A Brand";v="24"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"Windows"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      referer: "https://mentari.unpam.ac.id/",
      "cache-control": "no-cache",
    });

    let rawData = "";
    req.setEncoding("utf8");

    req.on("response", (resHeaders) => {
      req.on("data", (chunk) => {
        rawData += chunk;
      });
      req.on("end", () => {
        try {
          client.close();
        } catch {
          // ignore
        }
        resolve({
          status: Number(resHeaders[":status"] || 200),
          text: rawData,
        });
      });
    });

    req.on("error", (err) => {
      try {
        client.close();
      } catch {
        // ignore
      }
      reject(err);
    });
  });
}

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed. Only GET is supported.",
    });
  }

  const authHeader = req.headers?.authorization;
  if (!authHeader) {
    return res.status(401).json({
      success: false,
      message: "Header Authorization Bearer token Mentari wajib disertakan.",
    });
  }

  // Extract path to proxy (e.g. ?path=user-course)
  const { path, ...otherParams } = req.query || {};

  if (!path) {
    return res.status(400).json({
      success: false,
      message: "Query parameter 'path' wajib diisi (contoh: ?path=user-course).",
    });
  }

  // Prevent path traversal or unexpected protocols
  const cleanPath = String(path).replace(/^\/+/, "");
  const targetUrl = new URL(`${MENTARI_BASE_URL}/${cleanPath}`);

  // Forward other query parameters (e.g. page, limit)
  for (const [key, value] of Object.entries(otherParams)) {
    if (value !== undefined && value !== null) {
      targetUrl.searchParams.set(key, String(value));
    }
  }

  try {
    const mentariRes = await requestMentariHttp2(targetUrl.toString(), authHeader);

    try {
      const data = JSON.parse(mentariRes.text);
      return res.status(mentariRes.status).json(data);
    } catch {
      const isCloudflare =
        mentariRes.text.includes("<title>Just a moment...</title>") ||
        mentariRes.text.includes("cf-mitigated") ||
        mentariRes.text.includes("challenge-error") ||
        mentariRes.text.includes("_cf_chl_opt");

      return res.status(mentariRes.status || 502).json({
        success: false,
        isCloudflare,
        message: isCloudflare
          ? "Cloudflare WAF memblokir server Vercel (Managed Challenge). Silakan gunakan Mode Script Browser di tab Mentari untuk memindai data secara langsung tanpa blokir."
          : (mentariRes.text.length > 300
              ? mentariRes.text.slice(0, 300) + "..."
              : mentariRes.text) || "Respons tidak terduga dari Mentari UNPAM",
      });
    }
  } catch (error) {
    return res.status(502).json({
      success: false,
      message:
        "Gagal menghubungi server Mentari UNPAM: " +
        (error.message || "Unknown error"),
    });
  }
}
