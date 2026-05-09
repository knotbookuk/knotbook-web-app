import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { createLogger } from "@/lib/logger";

const log = createLogger("api/upload/from-url");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Reject anything that isn't a public http(s) URL.
 * Blocks localhost, loopback IPs, link-local, and obvious private ranges
 * to mitigate SSRF surface (Cloudinary fetches from its own infra so the
 * blast radius is theirs not ours, but a tight check is cheap).
 */
function isSafePublicUrl(raw: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return false;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
  const host = parsed.hostname.toLowerCase();
  if (host === "localhost" || host === "0.0.0.0" || host.endsWith(".local")) return false;
  if (host === "127.0.0.1" || host.startsWith("10.") || host.startsWith("169.254.")) return false;
  if (/^192\.168\./.test(host)) return false;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return false;
  return true;
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { url } = await req.json();
    if (typeof url !== "string" || !url.trim()) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    const trimmed = url.trim();
    if (!isSafePublicUrl(trimmed)) {
      return NextResponse.json(
        { error: "Please paste a valid public http(s) image URL." },
        { status: 400 }
      );
    }

    // Cloudinary's uploader.upload() accepts a remote URL and fetches it
    // server-side, so we don't proxy the bytes through our server. It also
    // rejects non-image responses with a clear error.
    const result = await cloudinary.uploader.upload(trimmed, {
      folder: `knotbook/${session.user.weddingId || session.user.id}`,
      resource_type: "image",
      transformation: [
        { width: 1920, height: 1920, crop: "limit" },
        { quality: "auto:good" },
        { fetch_format: "auto" },
      ],
    });

    log.info("Image fetched from URL and stored", {
      userId: session.user.id,
      sourceUrl: trimmed,
      publicId: result.public_id,
    });

    return NextResponse.json({
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
    });
  } catch (err) {
    const message = (err as Error).message ?? "Unknown error";
    log.warn("URL-to-Cloudinary fetch failed", { error: message });

    // Surface the most actionable line to the client.
    const friendly =
      /not a valid image/i.test(message) ||
      /not an image/i.test(message) ||
      /unsupported/i.test(message)
        ? "That URL doesn't point to a valid image."
        : /timeout|timed out|network|enotfound|not found|404/i.test(message)
          ? "Couldn't reach that URL. Check it loads in a browser and try again."
          : /size|too large|file size/i.test(message)
            ? "That image is too large (max 10MB)."
            : "Couldn't import that image. Try a different URL or upload the file directly.";

    return NextResponse.json({ error: friendly }, { status: 400 });
  }
}
