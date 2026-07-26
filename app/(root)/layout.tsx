// app/layout.tsx or a similar layout file
import { ReactNode } from "react";
import type { Metadata } from "next";

// ✅ Dynamically generate metadata
export async function generateMetadata(): Promise<Metadata> {
  const hospital = {HospitalName: "Curiosity With PK", domain: "https://evurev.com", smallName:"edu"};

  return {
    metadataBase: new URL(hospital.domain),
    title: hospital.HospitalName,
    description:
      `South Asia's largest cancer care network by Assam Govt and Tata Trusts — delivering affordable, high-quality cancer treatment in ${hospital.HospitalName.split(" ")[0]}.`,
    keywords: [
      "Cancer Hospital",
      `Best Cancer Hospital in ${hospital.smallName}`,
      "Free Cancer Treatment Assam",
      "Cancer Care Northeast India",
      "Best Oncology Hospital",
      "Cancer Hospital in Assam",
      "Free Cancer Treatment in India",
    ],
    icons: {
      icon: "/favicon.gif",
    },
    openGraph: {
      title: `${hospital.smallName} – Best Cancer Hospital in Northeast India`,
      description:
        `Leading cancer hospital in Assam backed by Tata Trusts and Government of Assam. Providing world-class oncology care and free cancer treatment in ${hospital.HospitalName.split(" ")[0]}.`,
      url: hospital.domain,
      siteName: hospital.HospitalName,
      images: [
        {
          url: "/og-image.jpg",
          width: 1200,
          height: 630,
          alt: hospital.HospitalName,
        },
      ],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: hospital.HospitalName,
      description:
        `Get the best cancer treatment in ${hospital.smallName} from South Asia's largest cancer care network, powered by Tata Trusts and Govt. of Assam.`,
      images: ["/og-image.jpg"],
      site: "https://x.com/gmcsci",
    },
  };
}

// ✅ Layout Component
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
    </>
  );
}
