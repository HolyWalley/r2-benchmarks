import { program } from 'commander';
import { BenchmarkRunner } from './utils/benchmark';
import { ResultStorage } from './utils/result-storage';
import { loadR2Config, validateR2Config, loadWorkerUrl } from './utils/config';
import { R2Client } from './utils/r2-client';
import { WorkerClient } from './utils/worker-client';
import { BenchmarkScenario, BenchmarkResult } from './types';

// Example scenarios - you can define your own scenarios here
function createScenarios(r2Client: R2Client, workerClient?: WorkerClient): BenchmarkScenario[] {
  const scenarios: BenchmarkScenario[] = [
    {
      name: 'put-single-object',
      description: 'Upload a single 1KB object',
      run: async () => {
        const key = r2Client.generateRandomKey('single-put');
        const data = r2Client.generateTestData(1024);
        await r2Client.putObject(key, data);
      },
      cleanup: async () => {
        // Clean up test objects
        const objects = await r2Client.listObjects('single-put');
        for (const key of objects) {
          await r2Client.deleteObject(key);
        }
      },
      config: {
        iterations: 10,
        warmupIterations: 0,
      }
    },
    {
      name: 'get-single-object',
      description: 'Download a single 1KB object',
      setup: async () => {
        // Create test object
        const key = 'get-test-object';
        const data = r2Client.generateTestData(1024);
        await r2Client.putObject(key, data);
      },
      run: async () => {
        await r2Client.getObject('get-test-object');
      },
      cleanup: async () => {
        await r2Client.deleteObject('get-test-object');
      },
      config: {
        iterations: 10,
        warmupIterations: 0,
      }
    },
    {
      name: 'get-10-objects',
      description: 'Download 10 objects of 1KB each concurrently',
      setup: async () => {
        // Create 10 test objects concurrently
        const promises = [];
        for (let i = 0; i < 10; i++) {
          const key = `get-test-object-${i}`;
          const data = r2Client.generateTestData(1024);
          promises.push(r2Client.putObject(key, data));
        }
        await Promise.all(promises);
      },
      run: async () => {
        // Read 10 objects concurrently
        const promises = [];
        for (let i = 0; i < 10; i++) {
          const key = `get-test-object-${i}`;
          promises.push(r2Client.getObject(key));
        }
        await Promise.all(promises);
      },
      cleanup: async () => {
        // Clean up test objects
        const objects = await r2Client.listObjects('get-test-object-');
        for (const key of objects) {
          await r2Client.deleteObject(key);
        }
      },
      config: {
        iterations: 1,
        warmupIterations: 0,
      }
    },
    {
      name: 'put-10-objects',
      description: 'Upload 10 objects of 1KB each concurrently',
      run: async () => {
        // Upload 10 objects concurrently
        const promises = [];
        for (let i = 0; i < 10; i++) {
          const key = `put-test-object-${i}`;
          const data = r2Client.generateTestData(1024);
          promises.push(r2Client.putObject(key, data));
        }
        await Promise.all(promises);
      },
      cleanup: async () => {
        // Clean up test objects
        const objects = await r2Client.listObjects('put-test-object-');
        for (const key of objects) {
          await r2Client.deleteObject(key);
        }
      },
      config: {
        iterations: 1,
        warmupIterations: 0,
      }
    },
    {
      name: 'get-then-put-if-match',
      description: 'GET JSON object with ETag, then PUT new version with If-Match header',
      setup: async () => {
        // Create initial JSON object
        const key = 'conditional-update-test';
        const jsonData = r2Client.generateTestJson(1);
        await r2Client.putObject(key, jsonData);
      },
      run: async () => {
        const key = 'conditional-update-test';

        // GET the object with ETag
        const { body, etag } = await r2Client.getObjectWithETag(key);
        const currentData = JSON.parse(body.toString());

        // Create updated JSON
        const updatedData = {
          ...currentData,
          id: currentData.id + 1,
          timestamp: new Date().toISOString(),
          data: `updated-data-${currentData.id + 1}`,
          metadata: {
            ...currentData.metadata,
            version: currentData.metadata.version + 1,
            updated: Date.now()
          }
        };

        // PUT with If-Match header
        await r2Client.putObjectWithIfMatch(key, JSON.stringify(updatedData), etag);
      },
      cleanup: async () => {
        await r2Client.deleteObject('conditional-update-test');
      },
      config: {
        iterations: 10,
        warmupIterations: 0,
      }
    },
    {
      name: 'get-50-objects',
      description: 'Download 50 objects of 1KB each concurrently',
      setup: async () => {
        // Create 50 test objects concurrently
        const promises = [];
        for (let i = 0; i < 50; i++) {
          const key = `get-50-test-object-${i}`;
          const data = r2Client.generateTestData(1024);
          promises.push(r2Client.putObject(key, data));
        }
        await Promise.all(promises);
      },
      run: async () => {
        // Read 50 objects concurrently
        const promises = [];
        for (let i = 0; i < 50; i++) {
          const key = `get-50-test-object-${i}`;
          promises.push(r2Client.getObject(key));
        }
        await Promise.all(promises);
      },
      cleanup: async () => {
        // Clean up test objects
        const objects = await r2Client.listObjects('get-50-test-object-');
        for (const key of objects) {
          await r2Client.deleteObject(key);
        }
      },
      config: {
        iterations: 1,
        warmupIterations: 0,
      }
    },
    {
      name: 'put-50-objects',
      description: 'Upload 50 objects of 1KB each concurrently',
      run: async () => {
        // Upload 50 objects concurrently
        const promises = [];
        for (let i = 0; i < 50; i++) {
          const key = `put-50-test-object-${i}`;
          const data = r2Client.generateTestData(1024);
          promises.push(r2Client.putObject(key, data));
        }
        await Promise.all(promises);
      },
      cleanup: async () => {
        // Clean up test objects
        const objects = await r2Client.listObjects('put-50-test-object-');
        for (const key of objects) {
          await r2Client.deleteObject(key);
        }
      },
      config: {
        iterations: 1,
        warmupIterations: 0,
      }
    },
    {
      name: 'get-100-objects',
      description: 'Download 100 objects of 1KB each concurrently',
      setup: async () => {
        // Create 100 test objects concurrently
        const promises = [];
        for (let i = 0; i < 100; i++) {
          const key = `get-100-test-object-${i}`;
          const data = r2Client.generateTestData(1024);
          promises.push(r2Client.putObject(key, data));
        }
        await Promise.all(promises);
      },
      run: async () => {
        // Read 100 objects concurrently
        const promises = [];
        for (let i = 0; i < 100; i++) {
          const key = `get-100-test-object-${i}`;
          promises.push(r2Client.getObject(key));
        }
        await Promise.all(promises);
      },
      cleanup: async () => {
        // Clean up test objects
        const objects = await r2Client.listObjects('get-100-test-object-');
        for (const key of objects) {
          await r2Client.deleteObject(key);
        }
      },
      config: {
        iterations: 1,
        warmupIterations: 0,
      }
    },
    {
      name: 'put-100-objects',
      description: 'Upload 100 objects of 1KB each concurrently',
      run: async () => {
        // Upload 100 objects concurrently
        const promises = [];
        for (let i = 0; i < 100; i++) {
          const key = `put-100-test-object-${i}`;
          const data = r2Client.generateTestData(1024);
          promises.push(r2Client.putObject(key, data));
        }
        await Promise.all(promises);
      },
      cleanup: async () => {
        // Clean up test objects
        const objects = await r2Client.listObjects('put-100-test-object-');
        for (const key of objects) {
          await r2Client.deleteObject(key);
        }
      },
      config: {
        iterations: 1,
        warmupIterations: 0,
      }
    }
  ];

  // Add worker scenarios if worker client is available
  if (workerClient) {
    scenarios.push(
      {
        name: 'worker-put-single-object',
        description: 'Upload a single 1KB object via Worker',
        run: async () => {
          const key = workerClient.generateRandomKey('worker-single');
          const data = workerClient.generateTestData(1024);
          await workerClient.putObject(key, data);
        },
        cleanup: async () => {
          const objects = await r2Client.listObjects('worker-single');
          for (const key of objects) {
            await r2Client.deleteObject(key);
          }
        },
        config: {
          iterations: 10,
          warmupIterations: 0,
        }
      },
      {
        name: 'worker-get-single-object',
        description: 'Download a single 1KB object via Worker',
        setup: async () => {
          const key = 'worker-get-test-object';
          const data = workerClient.generateTestData(1024);
          await workerClient.putObject(key, data);
        },
        run: async () => {
          await workerClient.getObject('worker-get-test-object');
        },
        cleanup: async () => {
          await r2Client.deleteObject('worker-get-test-object');
        },
        config: {
          iterations: 10,
          warmupIterations: 0,
        }
      },
      {
        name: 'worker-put-10-objects',
        description: 'Upload 10 objects of 1KB each via Worker',
        run: async () => {
          const objects = [];
          for (let i = 0; i < 10; i++) {
            objects.push({
              key: workerClient.generateRandomKey('worker-batch'),
              data: workerClient.generateTestData(1024)
            });
          }
          await workerClient.putObjects(objects);
        },
        cleanup: async () => {
          const objects = await r2Client.listObjects('worker-batch');
          for (const key of objects) {
            await r2Client.deleteObject(key);
          }
        },
        config: {
          iterations: 1,
          warmupIterations: 0,
        }
      },
      {
        name: 'worker-get-10-objects',
        description: 'Download 10 objects of 1KB each via Worker',
        setup: async () => {
          const objects = [];
          for (let i = 0; i < 10; i++) {
            objects.push({
              key: `worker-get-batch-${i}`,
              data: workerClient.generateTestData(1024)
            });
          }
          await workerClient.putObjects(objects);
        },
        run: async () => {
          const keys = Array.from({length: 10}, (_, i) => `worker-get-batch-${i}`);
          await workerClient.getObjects(keys);
        },
        cleanup: async () => {
          const objects = await r2Client.listObjects('worker-get-batch-');
          for (const key of objects) {
            await r2Client.deleteObject(key);
          }
        },
        config: {
          iterations: 1,
          warmupIterations: 0,
        }
      },
      {
        name: 'worker-get-then-put-if-match',
        description: 'UPSERT JSON object with ETag handling via Worker',
        setup: async () => {
          const key = 'worker-conditional-update-test';
          const jsonData = workerClient.generateTestJson(1);
          await workerClient.putObject(key, jsonData);
        },
        run: async () => {
          const key = 'worker-conditional-update-test';
          
          // Update data to merge with existing object
          const updateData = {
            id: Math.floor(Math.random() * 1000) + 100,
            timestamp: new Date().toISOString(),
            data: `updated-data-${Date.now()}`,
            metadata: {
              version: Math.floor(Math.random() * 10) + 2,
              updated: Date.now()
            }
          };
          
          // UPSERT operation handles get-merge-put with ETag automatically
          const result = await workerClient.upsertObject(key, updateData);
          if (!result.success) {
            throw new Error(`Upsert failed: ${result.error}`);
          }
        },
        cleanup: async () => {
          await r2Client.deleteObject('worker-conditional-update-test');
        },
        config: {
          iterations: 10,
          warmupIterations: 0,
        }
      }
    );
  }

  return scenarios;
}

async function runBenchmark(scenarioNames?: string[]) {
  try {
    console.log('🚀 Starting R2 Benchmark Suite\n');

    // Load and validate configuration
    const config = loadR2Config();
    validateR2Config(config);

    // Initialize components
    const r2Client = new R2Client(config);
    const runner = new BenchmarkRunner();
    const storage = new ResultStorage();

    // Initialize worker client if URL is provided
    const workerUrl = loadWorkerUrl();
    let workerClient: WorkerClient | undefined;
    if (workerUrl) {
      workerClient = new WorkerClient(workerUrl);
      // Test worker connectivity
      const isHealthy = await workerClient.healthCheck();
      if (!isHealthy) {
        console.warn('⚠️  Worker health check failed, worker scenarios will be skipped');
        workerClient = undefined;
      } else {
        console.log('✅ Worker client connected successfully');
      }
    }

    // Get scenarios to run
    const allScenarios = createScenarios(r2Client, workerClient);
    const scenariosToRun = scenarioNames && scenarioNames.length > 0
      ? allScenarios.filter(s => scenarioNames.includes(s.name))
      : allScenarios;

    if (scenariosToRun.length === 0) {
      console.error('❌ No scenarios found to run');
      process.exit(1);
    }

    console.log(`📋 Running ${scenariosToRun.length} scenario(s):`);
    scenariosToRun.forEach(s => console.log(`   - ${s.name}: ${s.description || 'No description'}`));

    // Run benchmarks
    const results: BenchmarkResult[] = [];

    for (const scenario of scenariosToRun) {
      try {
        const result = await runner.runScenario(scenario);
        results.push(result);
        storage.printResultSummary(result);
        storage.saveResult(result);
      } catch (error) {
        console.error(`❌ Failed to run scenario ${scenario.name}:`, error);
      }
    }

    // Save summary results
    if (results.length > 0) {
      storage.saveResults(results);
      storage.saveSummaryReport(results);
      storage.saveCsvReport(results);

      console.log(`\n✅ Benchmark complete! ${results.length} scenarios completed.`);
    } else {
      console.log('❌ No scenarios completed successfully.');
    }

  } catch (error) {
    console.error('❌ Benchmark failed:', error);
    process.exit(1);
  }
}

// CLI setup
program
  .name('r2-benchmark')
  .description('Generic Cloudflare R2 benchmarking framework')
  .version('1.0.0');

program
  .command('run')
  .description('Run benchmark scenarios')
  .option('-s, --scenarios <names...>', 'Specific scenarios to run')
  .action(async (options) => {
    await runBenchmark(options.scenarios);
  });

program
  .command('list')
  .description('List available scenarios')
  .action(async () => {
    console.log('Available scenarios:');
    const config = loadR2Config();
    const r2Client = new R2Client(config);
    
    const workerUrl = loadWorkerUrl();
    let workerClient: WorkerClient | undefined;
    if (workerUrl) {
      workerClient = new WorkerClient(workerUrl);
      const isHealthy = await workerClient.healthCheck();
      if (!isHealthy) {
        workerClient = undefined;
      }
    }
    
    const scenarios = createScenarios(r2Client, workerClient);
    scenarios.forEach(s => {
      console.log(`  ${s.name}: ${s.description || 'No description'}`);
    });
  });

// Default to run command if no command specified
if (process.argv.length === 2) {
  runBenchmark();
} else {
  program.parse();
}
