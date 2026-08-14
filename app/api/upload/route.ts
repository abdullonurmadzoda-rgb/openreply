import { NextRequest, NextResponse } from "next/server";
import { getCurrentWorkspaceContext } from "@/lib/workspace-access";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

export const dynamic = "force-dynamic";

// 50 MB max upload limit
const MAX_FILE_SIZE = 50 * 1024 * 1024;

function getMediaType(mimeType: string): "image" | "video" | "audio" | null {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  return null;
}

function getFileExtension(filename: string, mimeType: string): string {
  const ext = path.extname(filename).toLowerCase();
  if (ext) return ext;

  if (mimeType.includes("jpeg") || mimeType.includes("jpg")) return ".jpg";
  if (mimeType.includes("png")) return ".png";
  if (mimeType.includes("gif")) return ".gif";
  if (mimeType.includes("webp")) return ".webp";
  if (mimeType.includes("mp4")) return ".mp4";
  if (mimeType.includes("quicktime") || mimeType.includes("mov")) return ".mov";
  if (mimeType.includes("webm")) return ".webm";
  if (mimeType.includes("mpeg") || mimeType.includes("mp3")) return ".mp3";
  if (mimeType.includes("wav")) return ".wav";
  if (mimeType.includes("ogg")) return ".ogg";
  if (mimeType.includes("m4a") || mimeType.includes("aac")) return ".m4a";

  return ".bin";
}

async function uploadToCatbox(file: File): Promise<string | null> {
  try {
    const formData = new FormData();
    formData.append("reqtype", "fileupload");
    formData.append("fileToUpload", file, file.name || "upload");

    const response = await fetch("https://catbox.moe/user/api.php", {
      method: "POST",
      body: formData,
    });

    if (response.ok) {
      const text = (await response.text()).trim();
      if (text.startsWith("http://") || text.startsWith("https://")) {
        return text;
      }
    }
  } catch (err) {
    console.warn("[Upload API] Catbox upload failed:", err);
  }
  return null;
}

async function uploadToTmpfiles(file: File): Promise<string | null> {
  try {
    const formData = new FormData();
    formData.append("file", file, file.name || "upload");

    const response = await fetch("https://tmpfiles.org/api/v1/upload", {
      method: "POST",
      body: formData,
    });

    if (response.ok) {
      const data = await response.json();
      if (data?.status === "success" && data?.data?.url) {
        return data.data.url.replace("tmpfiles.org/", "tmpfiles.org/dl/");
      }
    }
  } catch (err) {
    console.warn("[Upload API] Tmpfiles upload failed:", err);
  }
  return null;
}

export async function POST(request: NextRequest) {
  const context = await getCurrentWorkspaceContext();
  if (!context) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: "File size exceeds 50MB limit" },
        { status: 400 }
      );
    }

    const mimeType = file.type || "application/octet-stream";
    const mediaType = getMediaType(mimeType);

    if (!mediaType) {
      return NextResponse.json(
        {
          success: false,
          error: "Unsupported file type. Please upload image, video, or audio.",
        },
        { status: 400 }
      );
    }

    // 1. Try public cloud CDN storage (catbox) which works on serverless Vercel
    let publicUrl = await uploadToCatbox(file);

    // 2. Fallback to tmpfiles CDN if catbox is unavailable
    if (!publicUrl) {
      publicUrl = await uploadToTmpfiles(file);
    }

    // 3. If running on local server where filesystem is writable, save to public/uploads
    if (!publicUrl) {
      try {
        const extension = getFileExtension(file.name, mimeType);
        const uniqueFilename = `${crypto.randomUUID()}${extension}`;
        const uploadsDir = path.join(process.cwd(), "public", "uploads");
        await fs.mkdir(uploadsDir, { recursive: true });

        const filePath = path.join(uploadsDir, uniqueFilename);
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        await fs.writeFile(filePath, buffer);
        publicUrl = `/uploads/${uniqueFilename}`;
      } catch (localErr) {
        console.warn("[Upload API] Local filesystem save failed (read-only):", localErr);
      }
    }

    if (!publicUrl) {
      return NextResponse.json(
        { success: false, error: "Не удалось сохранить файл. Попробуйте еще раз." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      url: publicUrl,
      type: mediaType,
      filename: file.name,
      size: file.size,
    });
  } catch (err) {
    console.error("[Upload API] Error saving file:", err);
    return NextResponse.json(
      { success: false, error: "Failed to process upload" },
      { status: 500 }
    );
  }
}
