'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  ClipboardDocumentListIcon,
  DocumentArrowUpIcon,
  HomeIcon,
} from '@heroicons/react/24/outline';


// Fallbacks if env vars aren’t set (use NEXT_PUBLIC_* for client-side access)
const ADMIN_USER = process.env.NEXT_PUBLIC_ADMIN_USER || 'race_admin';
const ADMIN_PASS = process.env.NEXT_PUBLIC_ADMIN_PASS || 'raceadmin@2025';

// Token config
const STORAGE_KEY = 'admin_auth';
const DEFAULT_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

function readToken() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const t = JSON.parse(raw);
    if (!t?.exp || Date.now() > t.exp) return null;
    return t;
  } catch {
    return null;
  }
}

function writeToken(username, ttl = DEFAULT_TTL_MS) {
  const token = { u: username, exp: Date.now() + ttl };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(token));
}

function clearToken() {
  localStorage.removeItem(STORAGE_KEY);
}

export default function AdminLayout({ children }) {
  const pathname = usePathname();

  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);

  // Login form state
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');

  // Validate token on mount
  useEffect(() => {
    const t = readToken();
    setAuthed(!!t);
    setChecking(false);
  }, []);

  const handleLogin = (e) => {
    e?.preventDefault?.();
    setError('');

    const okUser = (user || '').trim() === ADMIN_USER;
    const okPass = (pass || '').trim() === ADMIN_PASS;

    if (!okUser || !okPass) {
      setError('Invalid username or password.');
      return;
    }

    // Longer session if "remember me"
    const ttl = remember ? 30 * 24 * 60 * 60 * 1000 : DEFAULT_TTL_MS; // 30 days vs 8 hours
    writeToken(user.trim(), ttl);
    setAuthed(true);
  };

  const handleLogout = () => {
    clearToken();
    setAuthed(false);
    setUser('');
    setPass('');
  };

  const menuItems = useMemo(
    () => [
      { label: 'Home', href: '/', icon: HomeIcon },
      { label: 'Upload Survey', href: '/admin/survey-upload', icon: DocumentArrowUpIcon },
      { label: 'View Reports', href: '/admin/surveys', icon: ClipboardDocumentListIcon },
      { label: 'Enquiries', href: '/admin/enquiries', icon: ClipboardDocumentListIcon },
    ],
    []
  );

  if (checking) {
    return (
      <div className="min-h-screen grid place-items-center bg-gray-50">
        <div className="text-gray-500 text-sm">Checking access…</div>
      </div>
    );
  }

  // Not authenticated → show login screen only
  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-sm bg-white rounded-xl shadow-lg p-6 space-y-5 border border-gray-100"
        >
          <h1 className="text-xl font-semibold text-gray-800">Admin Sign In</h1>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Username</label>
            <input
              type="text"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="Enter username"
              autoComplete="username"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Password</label>
            <input
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="Enter password"
              autoComplete="current-password"
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="inline-flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="rounded border-gray-300"
              />
              Remember me
            </label>
            {error ? <span className="text-sm text-red-600">{error}</span> : <span />}
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg px-4 py-2.5 transition"
          >
            Sign In
          </button>

          {/* <p className="text-xs text-gray-500">
            Tip: set <code className="font-mono bg-gray-100 px-1 rounded">NEXT_PUBLIC_ADMIN_USER</code> and{' '}
            <code className="font-mono bg-gray-100 px-1 rounded">NEXT_PUBLIC_ADMIN_PASS</code> in your env.
          </p> */}
        </form>
      </div>
    );
  }

  // Authenticated → render admin shell
  return (
    <div className="min-h-screen flex">
      <aside className="w-64 bg-gray-800 text-white hidden md:flex md:flex-col">
        <div className="p-6 font-bold text-xl border-b border-gray-700 flex items-center justify-between">
          Admin Panel
          <button
            onClick={handleLogout}
            className="text-xs bg-gray-700 hover:bg-gray-600 rounded px-2 py-1"
            title="Sign out"
          >
            Logout
          </button>
        </div>

        <nav className="mt-6 space-y-2 flex-1">
          {menuItems.map(({ label, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center px-6 py-3 hover:bg-gray-700 transition ${
                pathname === href ? 'bg-gray-700 font-semibold' : ''
              }`}
            >
              <Icon className="w-5 h-5 mr-3" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="p-4 text-xs text-gray-300 border-t border-gray-700">
          Session ends automatically after {DEFAULT_TTL_MS / (60 * 60 * 1000)}h.
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 bg-gray-50 p-6 overflow-y-auto">{children}</main>
    </div>
  );
}
