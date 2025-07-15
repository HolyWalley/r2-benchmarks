import { program } from 'commander';
import { BenchmarkRunner } from './utils/benchmark';
import { ResultStorage } from './utils/result-storage';
import { loadR2Config, validateR2Config } from './utils/config';
import { R2Client } from './utils/r2-client';
import { BenchmarkScenario, BenchmarkResult } from './types';

// Example scenarios - you can define your own scenarios here
function createExampleScenarios(r2Client: R2Client): BenchmarkScenario[] {
  return [
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
      }
    }
  ];
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
    
    // Get scenarios to run
    const allScenarios = createExampleScenarios(r2Client);
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
  .action(() => {
    console.log('Available scenarios:');
    const config = loadR2Config();
    const r2Client = new R2Client(config);
    const scenarios = createExampleScenarios(r2Client);
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