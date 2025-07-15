import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { BenchmarkResult } from '../types';

export class ResultStorage {
  private resultsDir: string;

  constructor(resultsDir: string = 'results') {
    this.resultsDir = resultsDir;
    if (!existsSync(this.resultsDir)) {
      mkdirSync(this.resultsDir, { recursive: true });
    }
  }

  saveResult(result: BenchmarkResult): void {
    const timestamp = result.timestamp.toISOString().replace(/:/g, '-');
    const filename = `${result.scenarioName}-${timestamp}.json`;
    const filepath = join(this.resultsDir, filename);
    
    writeFileSync(filepath, JSON.stringify(result, null, 2));
    console.log(`📊 Results saved to: ${filepath}`);
  }

  saveResults(results: BenchmarkResult[]): void {
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const filename = `benchmark-suite-${timestamp}.json`;
    const filepath = join(this.resultsDir, filename);
    
    const summary = {
      timestamp: new Date(),
      totalScenarios: results.length,
      results: results
    };
    
    writeFileSync(filepath, JSON.stringify(summary, null, 2));
    console.log(`📊 Suite results saved to: ${filepath}`);
  }

  saveSummaryReport(results: BenchmarkResult[]): void {
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const filename = `summary-${timestamp}.txt`;
    const filepath = join(this.resultsDir, filename);
    
    let report = `R2 Benchmark Summary\n`;
    report += `====================\n`;
    report += `Timestamp: ${new Date().toISOString()}\n`;
    report += `Total Scenarios: ${results.length}\n\n`;
    
    results.forEach(result => {
      report += `Scenario: ${result.scenarioName}\n`;
      report += `  Iterations: ${result.iterations}\n`;
      report += `  Success Rate: ${(result.statistics.successRate * 100).toFixed(1)}%\n`;
      report += `  Mean: ${result.statistics.mean}ms\n`;
      report += `  Median: ${result.statistics.median}ms\n`;
      report += `  P95: ${result.statistics.p95}ms\n`;
      report += `  P99: ${result.statistics.p99}ms\n`;
      report += `  Min: ${result.statistics.min}ms\n`;
      report += `  Max: ${result.statistics.max}ms\n`;
      report += `\n`;
    });
    
    writeFileSync(filepath, report);
    console.log(`📋 Summary report saved to: ${filepath}`);
  }

  saveCsvReport(results: BenchmarkResult[]): void {
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const filename = `benchmark-data-${timestamp}.csv`;
    const filepath = join(this.resultsDir, filename);
    
    let csv = 'scenario,timestamp,iterations,success_rate,mean_ms,median_ms,p95_ms,p99_ms,min_ms,max_ms\n';
    
    results.forEach(result => {
      csv += `${result.scenarioName},${result.timestamp.toISOString()},${result.iterations},${result.statistics.successRate},${result.statistics.mean},${result.statistics.median},${result.statistics.p95},${result.statistics.p99},${result.statistics.min},${result.statistics.max}\n`;
    });
    
    writeFileSync(filepath, csv);
    console.log(`📈 CSV data saved to: ${filepath}`);
  }

  printResultSummary(result: BenchmarkResult): void {
    console.log(`\n📊 ${result.scenarioName} Results:`);
    console.log(`   Success Rate: ${(result.statistics.successRate * 100).toFixed(1)}%`);
    console.log(`   Mean: ${result.statistics.mean}ms`);
    console.log(`   Median: ${result.statistics.median}ms`);
    console.log(`   P95: ${result.statistics.p95}ms`);
    console.log(`   P99: ${result.statistics.p99}ms`);
    console.log(`   Range: ${result.statistics.min}ms - ${result.statistics.max}ms`);
  }
}