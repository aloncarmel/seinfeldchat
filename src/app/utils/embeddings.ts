import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

interface EmbeddingChunk {
  text: string;
  embedding: number[];
}

interface SimilarityResult {
  text: string;
  similarity: number;
  index: number;
}

// Cache embeddings in memory
let embeddingsCache: EmbeddingChunk[] | null = null;

// Initialize embeddings on server start
async function initializeEmbeddings() {
  try {
    // Load the JSON file from environment variable or fallback to local path
    const embeddingsUrl = process.env.NEXT_PUBLIC_EMBEDDINGS_URL || '/data/embeddings.json';
    const response = await fetch(embeddingsUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to load embeddings: ${response.statusText}`);
    }

    embeddingsCache = await response.json();
    console.log('Embeddings loaded successfully into memory');
  } catch (error) {
    console.error('Error initializing embeddings:', error);
    embeddingsCache = [];
  }
}

// Initialize embeddings immediately
initializeEmbeddings();

export async function loadEmbeddings(): Promise<EmbeddingChunk[]> {
  if (!embeddingsCache) {
    // If cache is somehow cleared, reload embeddings
    await initializeEmbeddings();
  }
  return embeddingsCache || [];
}

// Cosine similarity function
function cosineSimilarity(a: number[], b: number[]): number {
  try {
    if (a.length !== b.length) {
      throw new Error('Vectors must have same length');
    }

    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    
    if (magnitudeA === 0 || magnitudeB === 0) {
      return 0;
    }
    
    return dotProduct / (magnitudeA * magnitudeB);
  } catch (error) {
    console.error('Error calculating similarity:', error);
    return 0;
  }
}

export async function findSimilarChunks(query: string, topK: number = 5): Promise<SimilarityResult[]> {
  try {
    // Input validation
    if (!query.trim()) {
      return [];
    }

    // Get query embedding using the latest model
    const queryEmbeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: query.trim(),
      encoding_format: "float",
      dimensions: 1536  // Explicitly set dimensions
    });

    const queryEmbedding = queryEmbeddingResponse.data[0].embedding;
    const chunks = await loadEmbeddings();
    
    if (!chunks.length) {
      return [];
    }
    
    // Calculate similarities
    const similarities: SimilarityResult[] = chunks.map((chunk, i) => ({
      text: chunk.text,
      similarity: cosineSimilarity(queryEmbedding, chunk.embedding),
      index: i
    }));

    // Sort by similarity and take top K results
    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK)
      .filter(result => result.similarity > 0.3); // Filter out low-similarity results
  } catch (error) {
    console.error('Error finding similar chunks:', error);
    return [];
  }
} 