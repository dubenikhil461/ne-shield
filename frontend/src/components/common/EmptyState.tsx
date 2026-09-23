import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';

interface Props {
  message: string;
  icon?: ReactNode;
}

export default function EmptyState({ message, icon }: Props) {
  return (
    <div className="empty-state">
      <div className="empty-icon text-muted flex items-center justify-center">
        {icon || <Inbox size={32} strokeWidth={1.5} />}
      </div>
      <p className="text-sm text-muted mt-2">{message}</p>
    </div>
  );
}
