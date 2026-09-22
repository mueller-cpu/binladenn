'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Splash } from '@/components/layout/Splash';
import { useAuth } from '@/components/providers/AuthProvider';

const MIN_SPLASH_MS = 900;

export default function Home() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [minElapsed, setMinElapsed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMinElapsed(true), MIN_SPLASH_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!minElapsed || isLoading) return;
    router.replace(user ? '/overview' : '/login');
  }, [minElapsed, isLoading, user, router]);

  return <Splash />;
}
