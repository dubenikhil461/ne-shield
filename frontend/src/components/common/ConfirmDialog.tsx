import Modal from './Modal';

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
}

export default function ConfirmDialog({
  open, onClose, onConfirm, title, message, confirmLabel = 'Confirm',
}: Props) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p>{message}</p>
      <div className="modal-actions">
        <button onClick={onClose} className="btn btn-outline">Cancel</button>
        <button
          onClick={() => { onConfirm(); onClose(); }}
          className="btn btn-primary"
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
