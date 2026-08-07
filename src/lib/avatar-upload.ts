import { meApi, uploadsApi } from "@/lib/api"

const MAX_EDGE_PX = 256
const MAX_DATA_URL_CHARS = 320_000

/**
 * Shrinks a picked file to a square-ish JPEG data URL that fits the inline
 * avatar payload limit. Used when Cloudflare Images is not configured.
 */
export async function fileToAvatarDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(
    1,
    MAX_EDGE_PX / Math.max(bitmap.width, bitmap.height)
  )
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))

  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext("2d")
  if (!context) {
    bitmap.close()
    throw new Error("Could not process that image")
  }

  context.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  for (const quality of [0.85, 0.7, 0.55, 0.4]) {
    const dataUrl = canvas.toDataURL("image/jpeg", quality)
    if (dataUrl.length <= MAX_DATA_URL_CHARS) {
      return dataUrl
    }
  }

  throw new Error("That image is still too large after compression")
}

/** Uploads via Cloudflare when available, otherwise stores an inline data URL. */
export async function uploadAvatarFile(file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error("Choose an image file")
  }

  const { uploadsConfigured, imagesConfigured } = await uploadsApi.status()

  if (uploadsConfigured || imagesConfigured) {
    const imageId = await uploadsApi.uploadImage(file, "avatar")
    return meApi.setAvatar({ imageId })
  }

  const dataUrl = await fileToAvatarDataUrl(file)
  return meApi.setAvatar({ dataUrl })
}

export async function removeAvatar() {
  return meApi.setAvatar({ imageId: null, dataUrl: null })
}
