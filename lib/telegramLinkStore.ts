type LinkData = { code: string; chatId: string; expiresAt: number };

const store = new Map<string, LinkData>();

export function createLinkCode(chatId: string): { code: string; expiresAt: number } {
  const code = `LP-${Math.random().toString(16).slice(2, 6).toUpperCase()}${Math.random().toString(16).slice(2, 4).toUpperCase()}`;
  const expiresAt = Date.now() + 5 * 60 * 1000;
  store.set(code, { code, chatId, expiresAt });
  return { code, expiresAt };
}

export function consumeLinkCode(code: string): { chatId: string } | null {
  const data = store.get(code);
  if (!data) return null;
  if (Date.now() > data.expiresAt) {
    store.delete(code);
    return null;
  }
  store.delete(code);
  return { chatId: data.chatId };
}
