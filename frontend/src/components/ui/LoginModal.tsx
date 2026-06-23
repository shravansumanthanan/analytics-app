import { useState, useEffect, useRef } from 'react';
import { LockKey, SignIn } from '@phosphor-icons/react';

interface LoginModalProps {
  onSuccess: (token: string) => void;
  error?: string | null;
}

export function LoginModal({ onSuccess, error }: LoginModalProps) {
  const [password, setPassword] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.trim()) {
      onSuccess(password.trim());
      setPassword('');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/90 backdrop-blur-sm">
      <div className="w-full max-w-sm mx-4 bg-zinc-900 border border-zinc-800 rounded-xl p-8 shadow-2xl">
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 rounded-full bg-zinc-800 border border-zinc-700 mb-4">
            <LockKey size={28} weight="duotone" className="text-blue-400" />
          </div>
          <h1 className="text-xl font-mono text-zinc-50 tracking-tight">Analytics OS</h1>
          <p className="text-xs text-zinc-500 mt-1 font-mono uppercase tracking-widest">
            Admin Access Required
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="admin-password"
              className="block text-xs font-mono text-zinc-500 uppercase tracking-widest mb-2"
            >
              Password
            </label>
            <input
              id="admin-password"
              ref={inputRef}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
              className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-lg px-4 py-2.5 font-mono text-sm placeholder:text-zinc-600 focus:outline-none focus:border-blue-500 transition-colors"
              autoComplete="current-password"
            />
          </div>

          {error && (
            <p className="text-xs font-mono text-red-400 uppercase tracking-widest">{error}</p>
          )}

          <button
            type="submit"
            disabled={!password.trim()}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white rounded-lg font-mono text-sm transition-colors uppercase tracking-widest"
          >
            <SignIn size={16} />
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}
