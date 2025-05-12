export type JobStatus = {
  status: 'processing' | 'completed' | 'failed';
  progress: number;
  total: number;
  error?: string;
}; 