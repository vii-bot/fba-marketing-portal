// Simulated file/video storage for the SOP Builder.
//
// There is no object storage backend yet, so uploaded files are read into a
// data URL and stashed in localStorage under a fake `local-upload://<id>`
// reference — that's the only thing saved into SOP block content (and the
// database). When real storage (S3/Cloudinary/etc.) is wired up, replace the
// bodies of these two functions with calls to the upload API / CDN — nothing
// else in the SOP system needs to change, since blocks just hold a URL string.

const STORAGE_PREFIX = "fba-mock-upload:";
const SCHEME = "local-upload://";

export interface MockUploadResult {
  url: string;
  name: string;
  size: number;
}

export function isMockUploadUrl(url: string | undefined | null): boolean {
  return !!url && url.startsWith(SCHEME);
}

export async function mockUploadFile(file: File): Promise<MockUploadResult> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

  const id = `${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`;
  try {
    localStorage.setItem(STORAGE_PREFIX + id, dataUrl);
  } catch {
    // localStorage quota exceeded (large video) — fall back to an in-memory object URL
    // for this session only; it won't survive a refresh, but keeps the UI usable.
    const blobUrl = URL.createObjectURL(file);
    return { url: blobUrl, name: file.name, size: file.size };
  }

  return { url: `${SCHEME}${id}`, name: file.name, size: file.size };
}

// Resolves a stored reference back into something a <video>/<img>/<a> tag can use.
// Plain http(s) URLs (or already-resolved blob/data URLs) pass through unchanged.
export function resolveUploadUrl(url: string | undefined | null): string | null {
  if (!url) return null;
  if (!isMockUploadUrl(url)) return url;

  const id = url.slice(SCHEME.length);
  try {
    return localStorage.getItem(STORAGE_PREFIX + id);
  } catch {
    return null;
  }
}
