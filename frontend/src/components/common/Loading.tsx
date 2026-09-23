export default function Loading({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="loading-container">
      <div className="spinner" />
      <span className="loading-text">{text}</span>
    </div>
  );
}
