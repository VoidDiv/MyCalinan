import { getAuth } from "firebase/auth";

export async function uploadImage(
  file: File,
  folder: "announcements" | "events"
): Promise<string> {
  const user = getAuth().currentUser;
  if (!user) throw new Error("Please log in first.");

  const idToken = await user.getIdToken();
  const body = new FormData();
  body.append("file", file);
  body.append("folder", folder);

  const res = await fetch("/api/upload", {
    method: "POST",
    headers: { Authorization: `Bearer ${idToken}` },
    body,
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) throw new Error(data.error ?? "Upload failed.");
  return data.url as string;
}