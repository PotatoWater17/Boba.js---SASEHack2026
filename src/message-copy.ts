/** Text to put on the clipboard for a chat message. */
export function messageCopyText(msg: {
  text?: string | null;
  fileKey?: string | null;
  fileName?: string | null;
  id?: string;
}) {
  const text = (msg.text || "").trim();
  if (text) return text;
  if (msg.fileKey && msg.id) {
    const label = msg.fileName || "Attachment";
    return `${label}\n/api/files/${msg.id}`;
  }
  return "";
}
