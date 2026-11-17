type Store = {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
};
type Manifest = { generation: string; count: number };
export function secureSessionStorage(store: Store, unique: () => string) {
  const read = async (key: string): Promise<Manifest | null> => {
    const value = await store.getItemAsync(`${key}.manifest`);
    if (!value) return null;
    const result = JSON.parse(value) as Manifest;
    if (
      !/^[a-z0-9-]+$/i.test(result.generation) ||
      !Number.isInteger(result.count) ||
      result.count < 1 ||
      result.count > 64
    )
      throw new Error("저장된 세션을 확인해주세요.");
    return result;
  };
  const clear = async (key: string, manifest: Manifest | null) => {
    if (manifest)
      await Promise.all(
        Array.from({ length: manifest.count }, (_, i) =>
          store.deleteItemAsync(`${key}.${manifest.generation}.${i}`),
        ),
      );
  };
  return {
    getItem: async (key: string) => {
      const manifest = await read(key);
      if (!manifest) return null;
      const parts = await Promise.all(
        Array.from({ length: manifest.count }, (_, i) =>
          store.getItemAsync(`${key}.${manifest.generation}.${i}`),
        ),
      );
      if (parts.some((value) => value === null)) return null;
      return parts.join("");
    },
    setItem: async (key: string, value: string) => {
      const previous = await read(key);
      const parts: string[] = [];
      let part = "",
        bytes = 0;
      for (const char of value) {
        const code = char.codePointAt(0)!;
        const size =
          code <= 0x7f ? 1 : code <= 0x7ff ? 2 : code <= 0xffff ? 3 : 4;
        if (bytes + size > 1500) {
          parts.push(part);
          part = "";
          bytes = 0;
        }
        part += char;
        bytes += size;
      }
      parts.push(part);
      const manifest = {
        generation: unique(),
        count: parts.length,
      };
      if (manifest.count > 64)
        throw new Error("세션 저장 용량을 초과했습니다.");
      try {
        for (let i = 0; i < manifest.count; i++)
          await store.setItemAsync(
            `${key}.${manifest.generation}.${i}`,
            parts[i],
          );
        await store.setItemAsync(`${key}.manifest`, JSON.stringify(manifest));
      } catch (error) {
        await clear(key, manifest).catch(() => {});
        throw error;
      }
      await clear(key, previous).catch(() => {});
    },
    removeItem: async (key: string) => {
      const previous = await read(key);
      await store.deleteItemAsync(`${key}.manifest`);
      await clear(key, previous);
    },
  };
}
