export default function Loading() {
  return (
    <div className="flex space-x-2 animate-pulse">
      <div className="w-2 h-2 bg-[var(--primary)] rounded-full"></div>
      <div className="w-2 h-2 bg-[var(--primary)] rounded-full"></div>
      <div className="w-2 h-2 bg-[var(--primary)] rounded-full"></div>
    </div>
  );
}
