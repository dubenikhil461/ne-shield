import { AlertTriangle } from 'lucide-react';

interface Props {
  message: string;
  onRetry?: () => void;
}

export default function ErrorMessage({ message, onRetry }: Props) {
  return (
    <div className="error-container">
      <div className="flex items-center gap-2 text-danger">
        <AlertTriangle size={18} />
        <span className="error-message font-medium">{message}</span>
      </div>
      {onRetry && (
        <button onClick={onRetry} className="btn btn-sm btn-outline mt-2">
          Retry
        </button>
      )}
    </div>
  );
}
