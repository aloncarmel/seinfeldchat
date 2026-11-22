import { OpenAI } from 'openai';
import { getCloudflareContext } from '@opennextjs/cloudflare';

// Embeddings are shipped as static assets (see public/data):
//   meta.json        -> { dim, count }
//   embeddings.f32   -> count * dim little-endian float32 values
//   chunks/<i>.txt   -> source text for chunk i
// Loading a Float32Array is nearly free in CPU terms, and only the top-K
// texts are fetched per request, which keeps us well inside Workers CPU limits.

interface SimilarityResult {
  text: string;
  similarity: number;
  index: number;
}

interface EmbeddingIndex {
  dim: number;
  count: number;
  vectors: Float32Array;
  norms: Float32Array;
}

let indexPromise: Promise<EmbeddingIndex> | null = null;

function fetchAsset(path: string): Promise<Response> {
  const { env } = getCloudflareContext();
  if (!env.ASSETS) throw new Error('ASSETS binding is not configured');
  return env.ASSETS.fetch(new URL(path, 'https://assets.local'));
}

async function buildIndex(): Promise<EmbeddingIndex> {
  const [metaRes, binRes] = await Promise.all([
    fetchAsset('/data/meta.json'),
    fetchAsset('/data/embeddings.f32'),
  ]);
  if (!metaRes.ok || !binRes.ok) {
    throw new Error(`Failed to load embeddings: ${metaRes.status} / ${binRes.status}`);
  }
  const { dim, count } = (await metaRes.json()) as { dim: number; count: number };
  const vectors = new Float32Array(await binRes.arrayBuffer());
  if (vectors.length !== dim * count) {
    throw new Error(`Embedding size mismatch: ${vectors.length} != ${dim * count}`);
  }
  const norms = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    let s = 0;
    const off = i * dim;
    for (let j = 0; j < dim; j++) s += vectors[off + j] * vectors[off + j];
    norms[i] = Math.sqrt(s);
  }
  return { dim, count, vectors, norms };
}

function loadIndex(): Promise<EmbeddingIndex> {
  if (!indexPromise) {
    indexPromise = buildIndex().catch((err) => {
      indexPromise = null; // allow retry on the next request
      throw err;
    });
  }
  return indexPromise;
}

export async function findSimilarChunks(query: string, topK: number = 5): Promise<SimilarityResult[]> {
  try {
    if (!query.trim()) {
      return [];
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY!, fetch: globalThis.fetch });
    const [queryEmbeddingResponse, index] = await Promise.all([
      openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: query.trim(),
        encoding_format: 'float',
        dimensions: 1536,
      }),
      loadIndex(),
    ]);

    const q = queryEmbeddingResponse.data[0].embedding;
    const { dim, count, vectors, norms } = index;
    if (q.length !== dim) {
      throw new Error('Query embedding has unexpected dimensions');
    }

    let qNorm = 0;
    for (let j = 0; j < dim; j++) qNorm += q[j] * q[j];
    qNorm = Math.sqrt(qNorm);
    if (qNorm === 0) return [];

    const scored: { index: number; similarity: number }[] = [];
    for (let i = 0; i < count; i++) {
      if (norms[i] === 0) continue;
      const off = i * dim;
      let dot = 0;
      for (let j = 0; j < dim; j++) dot += q[j] * vectors[off + j];
      scored.push({ index: i, similarity: dot / (qNorm * norms[i]) });
    }

    const top = scored
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK)
      .filter((r) => r.similarity > 0.3);

    const texts = await Promise.all(
      top.map(async (r) => {
        const res = await fetchAsset(`/data/chunks/${r.index}.txt`);
        return res.ok ? res.text() : '';
      })
    );

    return top.map((r, i) => ({ ...r, text: texts[i] }));
  } catch (error) {
    console.error('Error finding similar chunks:', error);
    return [];
  }
}
