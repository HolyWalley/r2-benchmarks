# R2 Benchmarks

Generic Cloudflare R2 benchmarking framework for measuring latency and performance.

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure R2 credentials:**
   ```bash
   cp .env.example .env
   # Edit .env with your R2 credentials
   ```

3. **Build the project:**
   ```bash
   npm run build
   ```

## Infrastructure Requirements

### R2 Bucket Setup

You need to create an R2 bucket and API tokens in the Cloudflare dashboard:

1. **Create R2 bucket:**
   - Go to Cloudflare Dashboard → R2 Object Storage
   - Create a new bucket (note the name for R2_BUCKET_NAME)

2. **Create API Token:**
   - Go to Cloudflare Dashboard → My Profile → API Tokens
   - Create custom token with permissions:
     - Zone: Zone Settings:Read
     - Zone: Zone:Read  
     - Account: Cloudflare R2:Edit
   - Note the Account ID and API token

3. **Create R2 API credentials:**
   - Go to R2 → Manage R2 API tokens
   - Create new API token
   - Note the Access Key ID and Secret Access Key

### Environment Variables

Fill in your `.env` file:
```bash
R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=your-access-key-id
R2_SECRET_ACCESS_KEY=your-secret-access-key
R2_BUCKET_NAME=your-bucket-name
R2_REGION=auto
```

## Usage

### Run all scenarios:
```bash
npm run benchmark
```

### Run specific scenarios:
```bash
npm run benchmark -- run --scenarios put-single-object get-single-object
```

### List available scenarios:
```bash
npm run benchmark -- list
```

## Custom Scenarios

Create your own scenarios in `src/index.ts` by adding to the `createExampleScenarios` function:

```typescript
{
  name: 'your-scenario-name',
  description: 'Description of what this tests',
  setup: async () => {
    // Optional: Setup code (create test objects, etc.)
  },
  run: async () => {
    // Required: The actual operation to benchmark
    await r2Client.putObject('test-key', 'test-data');
  },
  cleanup: async () => {
    // Optional: Cleanup code (delete test objects, etc.)
  },
  config: {
    iterations: 50, // Override default iterations
    warmupIterations: 5 // Override default warmup
  }
}
```

## Results

Results are saved in the `results/` directory:
- `scenario-name-timestamp.json` - Individual scenario results
- `benchmark-suite-timestamp.json` - Complete suite results
- `summary-timestamp.txt` - Human-readable summary
- `benchmark-data-timestamp.csv` - CSV data for analysis

## Project Structure

```
src/
├── types/          # TypeScript interfaces
├── utils/          # Core utilities
│   ├── benchmark.ts    # Benchmark runner
│   ├── r2-client.ts    # R2 client wrapper
│   ├── result-storage.ts # Result saving
│   └── config.ts       # Configuration management
├── scenarios/      # Custom scenario definitions
└── index.ts        # Main entry point
```