# Worker Setup

## Prerequisites
- Have a Cloudflare account
- Have an R2 bucket created
- Have `wrangler` installed globally: `npm install -g wrangler`

## Setup Steps

1. **Install dependencies:**
   ```bash
   cd worker
   npm install
   ```

2. **Login to Cloudflare:**
   ```bash
   wrangler login
   ```

3. **Update wrangler.toml:**
   - Edit `wrangler.toml` 
   - Replace `YOUR_BUCKET_NAME` with your actual R2 bucket name

4. **Deploy the worker:**
   ```bash
   wrangler deploy
   ```

5. **Get the worker URL:**
   - After deployment, note the worker URL (e.g., `https://r2-benchmark-worker.your-subdomain.workers.dev`)
   - Add this URL to your main project's `.env` file as `WORKER_URL`

## Test the worker

```bash
# Health check
curl https://your-worker-url.workers.dev/health

# Test put
curl -X POST https://your-worker-url.workers.dev/put \
  -H "Content-Type: application/json" \
  -d '{"objects": [{"key": "test", "data": "hello world"}]}'

# Test get
curl -X POST https://your-worker-url.workers.dev/get \
  -H "Content-Type: application/json" \
  -d '{"keys": ["test"]}'
```

## Running Worker Scenarios

Once the worker is deployed and the URL is set in your `.env`, you can run worker scenarios:

```bash
# List all scenarios (including worker ones)
npm run benchmark -- list

# Run only worker scenarios
npm run benchmark -- run -s worker-put-single-object worker-get-single-object worker-put-10-objects worker-get-10-objects worker-get-then-put-if-match

# Run both local and worker scenarios
npm run benchmark -- run -s put-single-object worker-put-single-object
```