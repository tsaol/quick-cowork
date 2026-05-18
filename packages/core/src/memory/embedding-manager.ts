export interface EmbeddingManagerOptions {
  provider?: 'ollama' | 'openai';
  model?: string;
  ollamaHost?: string;
  openaiKey?: string;
}

export class EmbeddingManager {
  private provider: 'ollama' | 'openai';
  private model: string;
  private ollamaHost: string;
  private openaiKey?: string;

  constructor(options: EmbeddingManagerOptions = {}) {
    this.provider = options.provider || 'ollama';
    this.model =
      options.model ||
      (this.provider === 'ollama' ? 'nomic-embed-text' : 'text-embedding-3-small');
    this.ollamaHost = options.ollamaHost || 'http://localhost:11434';
    this.openaiKey = options.openaiKey;
  }

  async embed(text: string): Promise<Float32Array> {
    if (this.provider === 'ollama') return this.embedOllama(text);
    return this.embedOpenAI(text);
  }

  private async embedOllama(text: string): Promise<Float32Array> {
    const res = await fetch(`${this.ollamaHost}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: this.model, prompt: text }),
    });
    if (!res.ok) {
      throw new Error(`Ollama embed failed: ${res.status} ${res.statusText}`);
    }
    const data = (await res.json()) as { embedding: number[] };
    return new Float32Array(data.embedding);
  }

  private async embedOpenAI(text: string): Promise<Float32Array> {
    if (!this.openaiKey) {
      throw new Error('OpenAI API key required for embeddings');
    }
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.openaiKey}`,
      },
      body: JSON.stringify({ model: this.model, input: text }),
    });
    if (!res.ok) {
      throw new Error(`OpenAI embed failed: ${res.status} ${res.statusText}`);
    }
    const data = (await res.json()) as { data: { embedding: number[] }[] };
    return new Float32Array(data.data[0].embedding);
  }

  getDimensions(): number {
    return this.provider === 'ollama' ? 768 : 1536;
  }

  getProvider(): 'ollama' | 'openai' {
    return this.provider;
  }

  getModel(): string {
    return this.model;
  }
}
