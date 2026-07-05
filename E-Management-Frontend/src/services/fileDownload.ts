import { api } from "./axios";

export async function downloadTaskFile(fileId: string, fileName: string): Promise<void> {
  const response = await api.get(`/attachments/${fileId}/download`, { responseType: "blob" });
  const url = URL.createObjectURL(response.data as Blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}
