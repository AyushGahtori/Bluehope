import type { NextRequest } from "next/server";
import {
  FirestoreUnavailableError,
  getProviderProfileByOwner,
  upsertProviderProfile,
} from "@/server/firestore/repositories";
import { protectedPendingResponse, resolveAuthContext } from "@/server/middleware/auth";
import { getAdminStorage } from "@/server/firebase/admin";

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/avif"];

/**
 * Verifies the actual bytes are a real image, not just the declared
 * Content-Type. A crafted request can label any payload "image/png"; without
 * this check arbitrary files could be published to public gallery URLs.
 */
function hasImageMagicBytes(buffer: Buffer): boolean {
  if (buffer.length < 12) return false;
  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return true;
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return true;
  }
  // WebP: "RIFF" .... "WEBP"
  if (
    buffer.subarray(0, 4).toString("latin1") === "RIFF" &&
    buffer.subarray(8, 12).toString("latin1") === "WEBP"
  ) {
    return true;
  }
  // AVIF/HEIF: ISO BMFF box with "ftyp" at offset 4 and an AVIF brand.
  if (
    buffer.subarray(4, 8).toString("latin1") === "ftyp" &&
    ["avif", "avis", "avi1"].some((brand) =>
      buffer.subarray(8, 12).toString("latin1").startsWith(brand),
    )
  ) {
    return true;
  }
  return false;
}

/**
 * Uploads a profile image for the authenticated provider/institute.
 *
 * Storage ownership: the object path is derived from the caller's OWN profile
 * document (looked up by verified Firebase UID), so an account can only ever
 * write inside institutions/{itsInstitutionId}/gallery/... or
 * providers/{itsProviderId}/gallery/... — never into another account's path.
 */
export async function POST(request: NextRequest) {
  const auth = await resolveAuthContext(request);
  if (!auth.authenticated) return protectedPendingResponse(auth);

  const kind = auth.role === "institution" ? "institution" : auth.role === "soleProvider" ? "soleProvider" : null;
  if (!kind) {
    return Response.json(
      { status: "forbidden", message: "This account role cannot upload profile media." },
      { status: 403 },
    );
  }

  const storage = getAdminStorage();
  if (!storage) return protectedPendingResponse(auth);

  let file: File | null = null;
  try {
    const formData = await request.formData();
    const candidate = formData.get("file");
    if (candidate instanceof File) file = candidate;
  } catch {
    return Response.json({ status: "invalid_body" }, { status: 400 });
  }

  if (!file || !ALLOWED_TYPES.includes(file.type) || file.size > MAX_BYTES) {
    return Response.json(
      { status: "invalid_file", message: "Upload a JPG, PNG, WebP, or AVIF image up to 8MB." },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!hasImageMagicBytes(buffer)) {
    return Response.json(
      { status: "invalid_file", message: "That file is not a valid image. Upload a JPG, PNG, WebP, or AVIF image." },
      { status: 400 },
    );
  }

  try {
    // Ensure (or create) the caller's own profile doc; the doc id scopes the path.
    const profile =
      (await getProviderProfileByOwner(auth.firebaseUid!, kind)) ??
      (await upsertProviderProfile(auth.firebaseUid!, kind, {}));

    const extension = file.name.includes(".") ? file.name.split(".").pop()!.toLowerCase() : "jpg";
    const safeExtension = extension.replace(/[^a-z0-9]/g, "") || "jpg";
    const objectPath = `${kind === "institution" ? "institutions" : "providers"}/${profile.id}/gallery/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${safeExtension}`;

    const bucket = storage.bucket();
    await bucket.file(objectPath).save(buffer, {
      contentType: file.type,
      resumable: false,
      metadata: { metadata: { ownerUid: auth.firebaseUid! } },
    });

    // Public-read URL strategy for published profile media; the object itself
    // stays owner-scoped by path and storage rules.
    await bucket.file(objectPath).makePublic().catch(() => undefined);
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${encodeURIComponent(objectPath)}`;

    const images = Array.from(new Set([...profile.images, publicUrl])).slice(0, 12);
    const updated = await upsertProviderProfile(auth.firebaseUid!, kind, { images });

    return Response.json({ status: "created", url: publicUrl, path: objectPath, profile: updated }, { status: 201 });
  } catch (error) {
    if (error instanceof FirestoreUnavailableError) return protectedPendingResponse(auth);
    throw error;
  }
}