export function getJobStatus(jobId: string): {
  status: 'processing' | 'completed' | 'failed';
  progress: number;
  total: number;
  error?: string;
} | undefined;

export function startJob(jobId: string): void;
export function updateJobProgress(jobId: string, progress: number, total: number): void;
export function completeJob(jobId: string): void;
export function failJob(jobId: string, error: string): void;
export function startCategorySyncJob(userId: number, categoryId: number): Promise<string>; 