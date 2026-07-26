'use client';

import { useParams } from "next/navigation";

const ClassPage = () => {
  const params = useParams();
  const classSlug = params?.classSlug;

  return <div>{classSlug ? `Class ${classSlug}` : "Class"}</div>;
};

export default ClassPage;
