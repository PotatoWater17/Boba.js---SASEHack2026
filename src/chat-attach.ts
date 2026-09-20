/** Allowed chat attachment extensions (matches server `ATTACH_TYPES`). */
const CHAT_ATTACH_EXTS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".pdf",
  ".txt",
  ".csv",
  ".md",
  ".doc",
  ".docx",
  ".ppt",
  ".pptx",
  ".xls",
  ".xlsx",
  ".zip",
]);

export const CHAT_ATTACH_ACCEPT =
  ".jpg,.jpeg,.png,.gif,.webp,.pdf,.txt,.csv,.md,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,image/*";

export function chatAttachExt(name: string) {
  const i = name.lastIndexOf(".");
  if (i < 0) return "";
  return name.slice(i).toLowerCase();
}

export function validChatAttachFile(file: File) {
  const ext = chatAttachExt(file.name || "");
  if (ext && CHAT_ATTACH_EXTS.has(ext)) return true;
  return file.type.startsWith("image/");
}

/** First allowed file from a drag-and-drop or paste payload. */
export function firstChatAttachFile(dataTransfer: DataTransfer) {
  const list = dataTransfer.files;
  if (!list?.length) return null;
  for (let i = 0; i < list.length; i++) {
    const file = list[i];
    if (validChatAttachFile(file)) return file;
  }
  return null;
}
