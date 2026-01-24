export async function apiFetch(
  url: string,
  options: RequestInit = {}
) {
  const res = await fetch(url, {
    ...options,
    credentials: "include", // 🔥 AUTO FIX
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "API Error");
  }

  return res.json();
}
