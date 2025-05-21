'use client';

import { useRouter } from 'next/navigation';

export default function LoginButton() {
  const router = useRouter();

  const handleLogin = () => {
    router.push('/login');
  };

  return (
    <button
      onClick={handleLogin}
      className="px-4 py-2 text-sm font-medium text-white bg-[var(--primary)] rounded-md hover:bg-[var(--primary-hover)] transition-colors"
    >
      Log in
    </button>
  );
} 