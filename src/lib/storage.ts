import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from "./firebase";

export interface UploadResult {
  url: string;
  storagePath: string;
  fileType: "pdf" | "image" | "url";
  originalName: string;
}

export function detectFileType(file: File): "pdf" | "image" {
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) return "pdf";
  return "image";
}

export function uploadEventFile(
  file: File,
  folder: string,
  onProgress?: (pct: number) => void
): Promise<UploadResult> {
  const ext = file.name.split(".").pop() || "bin";
  const filename = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  const storagePath = `${folder}/${filename}`;
  const storageRef = ref(storage, storagePath);

  return new Promise((resolve, reject) => {
    const task = uploadBytesResumable(storageRef, file, {
      contentType: file.type || "application/octet-stream",
    });
    task.on(
      "state_changed",
      (snap) => onProgress?.((snap.bytesTransferred / snap.totalBytes) * 100),
      reject,
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        resolve({
          url,
          storagePath,
          fileType: detectFileType(file),
          originalName: file.name,
        });
      }
    );
  });
}

export async function deleteEventFile(storagePath: string): Promise<void> {
  try {
    await deleteObject(ref(storage, storagePath));
  } catch {
    // file may already be deleted
  }
}
