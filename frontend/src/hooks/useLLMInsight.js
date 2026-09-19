import { useMutation } from '@tanstack/react-query';
import { generateInsight } from '../api/endpoints';

const CACHE_TTL_MS = 10 * 60 * 1000;
const cache = new Map();

function hashData(obj) {
  try {
    return JSON.stringify(obj, Object.keys(obj).sort()).slice(0, 500);
  } catch {
    return String(Date.now());
  }
}

export function useLLMInsight() {
  const mutation = useMutation({
    mutationFn: async ({ context, data, cacheKey }) => {
      const key = cacheKey || `${context}::${hashData(data)}`;
      const now = Date.now();
      const hit = cache.get(key);
      if (hit && now - hit.at < CACHE_TTL_MS) return hit.value;

      const res = await generateInsight(context, data);
      cache.set(key, { value: res, at: now });
      return res;
    },
  });

  return mutation;
}
