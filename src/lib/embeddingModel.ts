let pipeline: any = null;
let pipelineInitFailed = false;
let pipelinePromise: Promise<any> | null = null;

async function getPipeline(): Promise<any> {
  if (pipeline) return pipeline;
  if (pipelineInitFailed) return null;
  if (pipelinePromise) return pipelinePromise;

  pipelinePromise = (async () => {
    try {
      const { pipeline: createPipeline } = await import(
        '@xenova/transformers'
      );
      pipeline = await createPipeline(
        'feature-extraction',
        'Xenova/all-MiniLM-L6-v2'
      );
      return pipeline;
    } catch (err) {
      console.warn('Embedding model failed to load, will use keyword-only scoring:', err);
      pipelineInitFailed = true;
      return null;
    }
  })();

  return pipelinePromise;
}

export async function initEmbeddingModel(): Promise<void> {
  await getPipeline();
}

export async function getEmbedding(text: string): Promise<Float32Array | null> {
  const pipe = await getPipeline();
  if (!pipe) return null;
  const output = await pipe(text, { pooling: 'mean', normalize: true });
  return output.data as Float32Array;
}

export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
  }
  return Math.max(0, Math.min(1, dot));
}

export async function computeSimilarity(
  textA: string,
  textB: string
): Promise<number> {
  const [embA, embB] = await Promise.all([
    getEmbedding(textA),
    getEmbedding(textB),
  ]);
  if (!embA || !embB) return 0;
  return cosineSimilarity(embA, embB);
}
