/**
 * Header Component
 * Displays the application header with sidebar toggle
 */
import GoogleLoginButton from './GoogleLoginButton';

interface HeaderProps {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export default function Header({ isSidebarOpen, onToggleSidebar }: HeaderProps) {
  return (
    <div className="border-b border-[var(--input-border)] p-3 flex items-center justify-between">
      <div className="flex items-center">
        <button
          onClick={onToggleSidebar}
          className="p-2 hover:bg-[var(--sidebar-hover)] rounded-md text-[var(--foreground)]"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
        <h1 className="ml-3 text-[var(--foreground)] text-lg font-medium">ChatStack</h1>
      </div>
      <div className="flex items-center">
        <GoogleLoginButton />
      </div>
    </div>
  );
}