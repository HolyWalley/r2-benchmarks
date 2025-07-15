export interface Env {
  R2_BUCKET: R2Bucket;
  ALLOWED_ORIGIN: string;
}

class Semaphore {
  private permits: number;
  private waitingQueue: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  get currentPermits(): number {
    return this.permits;
  }

  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return;
    }

    return new Promise<void>((resolve) => {
      this.waitingQueue.push(resolve);
    });
  }

  release(): void {
    this.permits++;
    if (this.waitingQueue.length > 0) {
      const resolve = this.waitingQueue.shift()!;
      this.permits--;
      resolve();
    }
  }
}

async function withSemaphore<T>(semaphore: Semaphore, fn: () => Promise<T>): Promise<T> {
  await semaphore.acquire();
  try {
    return await fn();
  } finally {
    semaphore.release();
  }
}

function cors(request: Request, env: Env) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
  
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  return corsHeaders;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const corsHeaders = cors(request, env);
    if (request.method === 'OPTIONS') {
      return corsHeaders as Response;
    }

    const url = new URL(request.url);
    const path = url.pathname;
    
    // Create semaphore to limit concurrent R2 connections (5 to be safe)
    const semaphore = new Semaphore(5);

    try {
      // PUT objects (single or multiple)
      if (path === '/put' && request.method === 'POST') {
        const body = await request.json() as { 
          objects: { key: string; data: string; ifMatch?: string }[] 
        };
        
        const promises = body.objects.map(obj => {
          const options = obj.ifMatch ? {
            httpMetadata: { ifMatch: obj.ifMatch }
          } : undefined;
          
          return withSemaphore(semaphore, () => env.R2_BUCKET.put(obj.key, obj.data, options));
        });
        
        await Promise.all(promises);
        
        return new Response(JSON.stringify({ 
          success: true, 
          count: body.objects.length 
        }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      // GET objects (single or multiple)
      if (path === '/get' && request.method === 'POST') {
        const body = await request.json() as { 
          keys: string[];
          includeEtag?: boolean;
        };

        // Process everything sequentially to avoid connection limits
        const objects = [];
        for (const key of body.keys) {
          const obj = await env.R2_BUCKET.get(key);
          if (!obj) {
            objects.push({ key, found: false });
            continue;
          }

          const data = await obj.text();
          const result: any = {
            key,
            found: true,
            size: data.length,
            data: data
          };
          
          if (body.includeEtag) {
            result.etag = obj.etag;
          }
          
          objects.push(result);
        }
        
        return new Response(JSON.stringify({ 
          success: true,
          count: objects.length,
          objects: objects
        }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      // Health check
      if (path === '/health') {
        return new Response('OK', { headers: corsHeaders });
      }

      return new Response('Not Found', { status: 404, headers: corsHeaders });
      
    } catch (error) {
      console.error('Worker error:', error);
      return new Response(`Error: ${error}`, { status: 500, headers: corsHeaders });
    }
  },
};
