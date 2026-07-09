'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function NotFound() {
  const router = useRouter();

  useEffect(() => {
    router.replace(''); // Redirect to home page
  }, [router]); // ✅ Added 'router' as a dependency

  return null; // Optionally, show a loading indicator here
}
