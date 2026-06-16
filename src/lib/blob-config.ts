import "server-only";

/** True when Vercel Blob can authenticate (read-write token or OIDC store on Vercel). */
export function isBlobConfigured(): boolean {
  return !!(
    process.env.BLOB_READ_WRITE_TOKEN?.trim() ||
    process.env.BLOB_STORE_ID?.trim()
  );
}
