'use client';

import { useEffect, useState } from "react";
import Loader from '@/app/(components)/Loader';
import { useParams, useRouter } from "next/navigation";

const ClassPage = () => {
  const params = useParams();
  const router = useRouter();
  const classSlug = params?.classSlug;
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const auth = sessionStorage.getItem("authDetails");
    if (!auth) {
      router.replace("/admin");
      return;
    }

    try {
      const parsed = JSON.parse(auth);
      if (!parsed?.loggedIn) {
        router.replace("/admin");
        return;
      }
    } catch (error) {
      sessionStorage.removeItem("authDetails");
      router.replace("/admin");
      return;
    }

    setLoading(false);
  }, [router]);

  if (loading) {
    return <Loader variant='page' />;
  }

  return <div>{classSlug ? `Class ${classSlug}` : "Class"}</div>;
};

export default ClassPage;
