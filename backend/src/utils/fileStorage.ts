import path from 'path';
import fs from 'fs';

export const uploadDir = path.resolve(__dirname, '../../uploads');

/**
 * Given a URL or string containing an uploaded file path (e.g. "http://localhost:3000/uploads/uuid.webp" or "/uploads/uuid.webp"),
 * safely deletes the file from the local uploads directory if it exists.
 */
export function deleteUploadedFile(fileUrlOrPath?: string | null): boolean {
  if (!fileUrlOrPath || typeof fileUrlOrPath !== 'string') return false;

  const match = fileUrlOrPath.match(/\/uploads\/([a-zA-Z0-9._-]+)/);
  if (!match || !match[1]) return false;

  const filename = path.basename(match[1]);
  const filePath = path.join(uploadDir, filename);

  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
  } catch (err) {
    console.error(`[deleteUploadedFile] Erro ao excluir arquivo ${filename}:`, err);
  }

  return false;
}

/**
 * Searches for all /uploads/<filename> occurrences within a text/markdown string
 * and deletes each matched file from disk.
 */
export function deleteMultipleUploadedFiles(content?: string | null): void {
  if (!content || typeof content !== 'string') return;

  const matches = content.matchAll(/\/uploads\/([a-zA-Z0-9._-]+)/g);
  for (const match of matches) {
    const filename = match[1];
    if (filename) {
      deleteUploadedFile(`/uploads/${filename}`);
    }
  }
}
