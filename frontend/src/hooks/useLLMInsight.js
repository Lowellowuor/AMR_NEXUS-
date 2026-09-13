import { useMutation } from '@tanstack/react-query';
import { generateInsight } from '../api/endpoints';

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
      if (cache.has(key)) return cache.get(key);
      const res = await generateInsight(context, data);
      cache.set(key, res);
      return res;
    },
  });
  return mutation;
}
