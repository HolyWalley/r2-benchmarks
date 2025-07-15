export interface BenchmarkConfig {
  name: string;
  description?: string;
  iterations?: number;
  warmupIterations?: number;
  timeout?: number;
}

export interface BenchmarkScenario {
  name: string;
  description?: string;
  setup?: () => Promise<void>;
  run: () => Promise<void>;
  cleanup?: () => Promise<void>;
  config?: Partial<BenchmarkConfig>;
}

export interface BenchmarkResult {
  scenarioName: string;
  timestamp: Date;
  iterations: number;
  results: {
    duration: number;
    success: boolean;
    error?: string;
  }[];
  statistics: {
    min: number;
    max: number;
    mean: number;
    median: number;
    p95: number;
    p99: number;
    successRate: number;
  };
}

export interface R2Config {
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  region: string;
}

export interface BenchmarkSuite {
  name: string;
  description?: string;
  scenarios: BenchmarkScenario[];
  config?: Partial<BenchmarkConfig>;
}