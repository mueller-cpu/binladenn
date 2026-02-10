'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { StartScreen } from '@/components/onboarding/StartScreen';
import { FeatureSlider } from '@/components/onboarding/FeatureSlider';
import { useAuth } from '@/components/providers/AuthProvider';

export default function Home() {
  const { isLoading: authLoading } = useAuth();
  const router = useRouter();

  // Onboarding State
  const [view, setView] = useState<'loading' | 'start' | 'onboarding'>('loading');

  useEffect(() => {
    // Always show start screen on root load
    setView('start');
  }, []);

  const handleStart = () => {
    setView('onboarding');
  };

  const handleOnboardingComplete = () => {
    // Redirect to overview
    router.push('/overview');
  };

  if (view === 'start') {
    return <StartScreen onStart={handleStart} />;
  }

  if (view === 'onboarding') {
    return <FeatureSlider onComplete={handleOnboardingComplete} />;
  }

  if (authLoading || view === 'loading') return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

  return null;
}
