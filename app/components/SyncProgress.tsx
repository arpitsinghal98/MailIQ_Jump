import { useEffect, useState } from "react";
import { useFetcher } from "@remix-run/react";

type JobStatus = {
  status: 'processing' | 'completed' | 'failed';
  progress: number;
  total: number;
  error?: string;
};

export default function SyncProgress({ jobId }: { jobId: string }) {
  const [show, setShow] = useState(true);
  const fetcher = useFetcher<{ status: JobStatus }>();

  useEffect(() => {
    if (!jobId) return;

    const interval = setInterval(() => {
      fetcher.load(`/api/job-status?jobId=${jobId}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [jobId, fetcher]);

  useEffect(() => {
    if (fetcher.data?.status?.status === 'completed' || fetcher.data?.status?.status === 'failed') {
      const timer = setTimeout(() => setShow(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [fetcher.data?.status?.status]);

  if (!show || !fetcher.data?.status) return null;

  const { status, progress, total, error } = fetcher.data.status;
  const percentage = total ? Math.round((progress / total) * 100) : 0;

  return (
    <div className="fixed bottom-4 right-4 bg-white shadow-lg rounded-lg p-4 w-80">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-medium">
          {status === 'processing' ? 'Processing Emails...' : 
           status === 'completed' ? 'Sync Complete' : 'Sync Failed'}
        </h3>
        <button 
          onClick={() => setShow(false)} 
          className="text-gray-500 hover:text-gray-700"
          aria-label="Close"
        >
          ×
        </button>
      </div>
      {status === 'processing' && (
        <div className="space-y-2">
          <div className="h-2 bg-gray-200 rounded-full">
            <div 
              className="h-2 bg-blue-500 rounded-full transition-all duration-300"
              style={{ width: `${percentage}%` }}
              role="progressbar"
              aria-valuenow={percentage}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Email processing progress"
            />
          </div>
          <p className="text-sm text-gray-600">
            {progress} of {total} emails processed
          </p>
        </div>
      )}
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
} 