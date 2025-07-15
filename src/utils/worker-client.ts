export class WorkerClient {
  private workerUrl: string;

  constructor(workerUrl: string) {
    this.workerUrl = workerUrl.endsWith('/') ? workerUrl.slice(0, -1) : workerUrl;
  }

  async putObjects(objects: { key: string; data: string; ifMatch?: string }[]): Promise<void> {
    const response = await fetch(`${this.workerUrl}/put`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ objects }),
    });

    if (!response.ok) {
      throw new Error(`Worker PUT failed: ${response.status} ${await response.text()}`);
    }
  }

  async putObject(key: string, data: string, ifMatch?: string): Promise<void> {
    await this.putObjects([{ key, data, ifMatch }]);
  }

  async getObjects(keys: string[], includeEtag: boolean = false): Promise<{
    key: string;
    found: boolean;
    size?: number;
    data?: string;
    etag?: string;
  }[]> {
    const response = await fetch(`${this.workerUrl}/get`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ keys, includeEtag }),
    });

    if (!response.ok) {
      throw new Error(`Worker GET failed: ${response.status} ${await response.text()}`);
    }

    const result = await response.json() as { objects: any[] };
    return result.objects;
  }

  async getObject(key: string, includeEtag: boolean = false): Promise<{
    key: string;
    found: boolean;
    size?: number;
    data?: string;
    etag?: string;
  }> {
    const results = await this.getObjects([key], includeEtag);
    return results[0];
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.workerUrl}/health`);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  generateTestData(size: number): string {
    return 'a'.repeat(size);
  }

  generateRandomKey(prefix: string = 'worker-test'): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  generateTestJson(id: number): string {
    return JSON.stringify({
      id,
      timestamp: new Date().toISOString(),
      data: `test-data-${id}`,
      metadata: {
        version: 1,
        created: Date.now()
      }
    });
  }
}