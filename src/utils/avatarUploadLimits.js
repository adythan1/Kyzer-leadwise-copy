/** Aligned with Supabase Storage `avatars` bucket MIME allowlist (SVG often blocked for XSS). */
export const AVATAR_ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

export const AVATAR_FILE_INPUT_ACCEPT = AVATAR_ALLOWED_IMAGE_TYPES.join(',');

export const AVATAR_UNSUPPORTED_TYPE_MESSAGE =
  'Avatars must be JPEG, PNG, WebP, or GIF. SVG and other formats are not supported.';

const EXTENSION_BY_MIME = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

export function isAllowedAvatarImageType(mimeType) {
  return AVATAR_ALLOWED_IMAGE_TYPES.includes(mimeType);
}

export function getAvatarStorageFileExtension(mimeType) {
  return EXTENSION_BY_MIME[mimeType] || 'jpg';
}

export function userMessageForAvatarStorageError(serverMessage) {
  if (!serverMessage) return 'Upload failed';
  if (/mime type|not supported/i.test(serverMessage)) {
    return AVATAR_UNSUPPORTED_TYPE_MESSAGE;
  }
  return serverMessage;
}

/** Same MIME allowlist as avatars; use for org logos and other raster-only buckets. */
export const RASTER_IMAGE_FILE_ACCEPT = AVATAR_FILE_INPUT_ACCEPT;

export const RASTER_IMAGE_UNSUPPORTED_TYPE_MESSAGE =
  'Use JPEG, PNG, WebP, or GIF. SVG and other formats are not supported.';

export function isAllowedRasterImageType(mimeType) {
  return AVATAR_ALLOWED_IMAGE_TYPES.includes(mimeType);
}

export function getRasterImageFileExtension(mimeType) {
  return getAvatarStorageFileExtension(mimeType);
}

export function userMessageForRasterImageStorageError(serverMessage) {
  if (!serverMessage) return 'Upload failed';
  if (/mime type|not supported/i.test(serverMessage)) {
    return RASTER_IMAGE_UNSUPPORTED_TYPE_MESSAGE;
  }
  if (
    /row-level security|violates|policy|forbidden|not authorized|unauthorized/i.test(
      serverMessage
    )
  ) {
    return (
      'Upload was blocked by storage rules. Apply the migration ' +
      'supabase/migrations/20260330_organization_logos_storage.sql in the Supabase SQL editor, ' +
      'or ask an admin to allow organization members to upload to the organization-logos bucket.'
    );
  }
  return serverMessage;
}
