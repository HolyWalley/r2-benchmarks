import { BenchmarkScenario, BenchmarkResult, BenchmarkConfig } from '../types';

export class BenchmarkRunner {
  private defaultConfig: BenchmarkConfig = {
    name: 'default',
    iterations: 10,
    warmupIterations: 0,
    timeout: 30000
  };

  async runScenario(scenario: BenchmarkScenario): Promise<BenchmarkResult> {
    const config = { ...this.defaultConfig, ...scenario.config };
    const results: BenchmarkResult['results'] = [];
    
    console.log(`\n🚀 Running scenario: ${scenario.name}`);
    if (scenario.description) {
      console.log(`   ${scenario.description}`);
    }

    try {
      // Setup
      if (scenario.setup) {
        console.log('   Setting up...');
        await scenario.setup();
      }

      // Warmup
      if (config.warmupIterations! > 0) {
        console.log(`   Warming up (${config.warmupIterations} iterations)...`);
        for (let i = 0; i < config.warmupIterations!; i++) {
          try {
            await this.runWithTimeout(scenario.run, config.timeout!);
          } catch (error) {
            // Ignore warmup errors
          }
        }
      }

      // Actual benchmark
      console.log(`   Benchmarking (${config.iterations} iterations)...`);
      for (let i = 0; i < config.iterations!; i++) {
        const start = Date.now();
        try {
          await this.runWithTimeout(scenario.run, config.timeout!);
          const duration = Date.now() - start;
          results.push({ duration, success: true });
          process.stdout.write('.');
        } catch (error) {
          const duration = Date.now() - start;
          results.push({ 
            duration, 
            success: false, 
            error: error instanceof Error ? error.message : String(error)
          });
          process.stdout.write('x');
        }
      }
      console.log(); // New line after progress dots

      // Cleanup
      if (scenario.cleanup) {
        console.log('   Cleaning up...');
        await scenario.cleanup();
      }

      return {
        scenarioName: scenario.name,
        timestamp: new Date(),
        iterations: config.iterations!,
        results,
        statistics: this.calculateStatistics(results)
      };

    } catch (error) {
      throw new Error(`Scenario setup/cleanup failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async runWithTimeout<T>(fn: () => Promise<T>, timeout: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Operation timed out'));
      }, timeout);

      fn()
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  private calculateStatistics(results: BenchmarkResult['results']) {
    const successfulResults = results.filter(r => r.success);
    const durations = successfulResults.map(r => r.duration).sort((a, b) => a - b);
    
    if (durations.length === 0) {
      return {
        min: 0,
        max: 0,
        mean: 0,
        median: 0,
        p95: 0,
        p99: 0,
        successRate: 0
      };
    }

    const mean = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    const median = durations[Math.floor(durations.length / 2)];
    const p95 = durations[Math.floor(durations.length * 0.95)];
    const p99 = durations[Math.floor(durations.length * 0.99)];

    return {
      min: durations[0],
      max: durations[durations.length - 1],
      mean: Math.round(mean),
      median,
      p95,
      p99,
      successRate: successfulResults.length / results.length
    };
  }
}
