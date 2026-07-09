
export const HomePageAccess = true;
export const AboutUsAccess = true;
export const FacilitiesAccess = true;
export const HospitalsAccess = true;
export const NewsAndEventsAccess = true;
export const ContactUsAccess = true;
export const AcademicsAccess = false;
export const SocialInfraAccess = false;
export const UpdatesAccess = true;
export const HospitalID: number = 1;
export const VideosAccess = true;
export const AppointmentAccess = true;

export const StaticHospital = () => {
  switch (HospitalID) {
    case 1: return ({
      id: 1,
      HospitalName: "STATE CANCER INSTITUTE GUWAHATI",
      smallName: "SCI",
      domain: "https://cancercareinstituteguwahati.org/",
    });
    case 2: return ({
      id: 2,
      HospitalName: "DIBRUGARH CANCER CENTRE",
      smallName: "Dibrugarh",
      domain: "https://dibrugarhcancercentre.org/",
    });
    case 3: return ({
      id: 3,
      HospitalName: "SILCHAR CANCER CENTRE",
      smallName: "Silchar",
      domain: "https://silcharcancercentre.org/",
    });
    case 4: return ({
      id: 4,
      HospitalName: "JORHAT CANCER CENTRE",
      smallName: "Jorhat",
      domain: "https://jorhatcancercentre.org/",
    });
    case 5: return ({
      id: 5,
      HospitalName: "DARRANG CANCER CENTRE",
      smallName: "Darrang",
      domain: "https://darrangcancercentre.org/",
    });
    case 6: return ({
      id: 6,
      HospitalName: "TEZPUR CANCER CENTRE",
      smallName: "Tezpur",
      domain: "https://tezpurcancercentre.org/",
    });
    case 7: return ({
      id: 7,
      HospitalName: "LAKHIMPUR CANCER CENTRE",
      smallName: "Lakhimpur",
      domain: "https://lakhimpurcancercentre.org/",
    });
    case 8:
      return ({
        id: 8,
        HospitalName: "KOKRAJHAR CANCER CENTRE",
        smallName: "kokrajhar",
        domain: "https://kokrajharcancercentre.org/",
      })
    case 9: return ({
      id: 9,
      HospitalName: "BARPETA CANCER CENTRE",
      smallName: "Barpeta",
      domain: "https://barpetacancercentre.org/",
    });
    default:
      return {
        id: 0,
        HospitalName: "UNKNOWN HOSPITAL",
        smallName: "Unknown",
        domain: "https://example.com/",
      };
  }
}


export function removeBackslashes(input?: string): string {
  if (typeof input !== 'string') return '';
  return input.replace(/\\/g, '');
}

// https://accf-api.cancercareinstituteguwahati.org/api/get-slides-for-center
export async function ImageSliderData() {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  try {
    const response = await fetch(`https://accf-api.cancercareinstituteguwahati.org/api/get-slides-for-center`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ "hospitalId": HospitalID }),
      next: { revalidate: 10 },
      // cache: "no-store",
    });

    const data = await response.json();
    return data || [];
  } catch (error) {
    console.error("Failed to fetch doctors:", error);
    return [];
  }
}
// ✅ Fetch Doctors
export async function fetchDoctors2() {
  // ⚠️ Bypass SSL check (only for local development)
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  try {
    const response = await fetch(`https://accf-api.cancercareinstituteguwahati.org/api/get-doctor-for-center`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ "hospitalId": HospitalID }),
      next: { revalidate: 900 },
      // cache: "no-store",
    });

    const data = await response.json();
    return data || [];
  } catch (error) {
    console.error("Failed to fetch doctors:", error);
    return [];
  }
}

// ✅ Fetch Accomplishments
export async function fetchAccomplishments2() {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  try {
    const response = await fetch(`https://accf-api.cancercareinstituteguwahati.org/api/get-counts-for-center`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ "hospitalId": HospitalID }),
      next: { revalidate: 10 },
      // cache: "no-store",
    });

    const data = await response.json();
    return data || [];
  } catch (error) {
    console.error("Failed to fetch doctors:", error);
    return [];
  }
}


export async function FetchFacilitiesData2() {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  try {
    const response = await fetch(`https://accf-api.cancercareinstituteguwahati.org/api/get-facility-for-center`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ "hospitalId": HospitalID }),
      next: { revalidate: 900 },
      // cache: "no-store",
    });

    const data = await response.json();

    // Filter out the hospital with id = 1
    // const filteredData = (data || []).filter((hospital: { id: number; }) => hospital.id !== HospitalID);
    return (data || []);
  } catch (error) {
    console.error("Failed to fetch doctors:", error);
    return [];
  }
}

export async function FetchHospitalsData2() {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  try {
    const response = await fetch(`https://accf-api.cancercareinstituteguwahati.org/api/get-hospitals`, {
      method: "POST"
    });

    const data = await response.json();

    // Filter out the hospital with id = 1
    const filteredData = (data || []).filter((hospital: { id: number; }) => hospital.id !== HospitalID);
    return filteredData;
  } catch (error) {
    console.error("Failed to fetch doctors:", error);
    return [];
  }
}


export async function FetchAboutUs2() {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  try {
    const response = await fetch(`https://accf-api.cancercareinstituteguwahati.org/api/get-about-sections-for-center`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ "hospitalId": HospitalID }),
      next: { revalidate: 10 },
    });

    const data = await response.json();
    return data || [];
  } catch (error) {
    console.error("Failed to fetch doctors:", error);
    return [];
  }
}

// ✅ Fetch News & Events
export async function fetchNewsAndEvents2() {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  try {
    const response = await fetch(`https://accf-api.cancercareinstituteguwahati.org/api/get-news-events-for-center`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ "hospitalId": HospitalID }),
      next: { revalidate: 900 },
    });

    const data = await response.json();
    return data || [];
  } catch (error) {
    console.error("Failed to fetch doctors:", error);
    return [];
  }
}

export async function FetchHospitalDetails() {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  try {
    const response = await fetch(`https://accf-api.cancercareinstituteguwahati.org/api/get-hospital/${HospitalID}`);
    const data = await response.json();
    // console.log('Trying to fetch HospitalDetails:', data);
    return data || [];
  } catch (error) {
    console.error("Failed to fetch doctors:", error);
    return [];
  }
}


export async function FetchPartners2() {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  try {
    const response = await fetch(`https://accf-api.cancercareinstituteguwahati.org/api/get-partners-for-center`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ "hospitalId": HospitalID }),
      next: { revalidate: 900 },
      // cache: "no-store",
    });

    const data = await response.json();
    // console.log('Trying to fetch news from barpeta server :', data);
    return data || [];
  } catch (error) {
    console.error("Failed to fetch doctors:", error);
    return [];
  }
}

export async function LatestVideos2() {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  try {
    const response = await fetch(`https://accf-api.cancercareinstituteguwahati.org/api/get-videos-for-center`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ "hospitalId": HospitalID }),
      next: { revalidate: 900 },
      // cache: "no-store",
    });

    const data = await response.json();
    // console.log('Trying to fetch news from barpeta server :', data);
    return data || [];
  } catch (error) {
    console.error("Failed to fetch doctors:", error);
    return [];
  }
}

export async function FetchUpdates() {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  try {
    const response = await fetch(`https://accf-api.cancercareinstituteguwahati.org/api/get-updates-for-center`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ "hospitalId": HospitalID }),
      next: { revalidate: 900 },
      // cache: "no-store",
    });

    const data = await response.json();
    // console.log('Trying to fetch news from barpeta server :', data);
    return data || [];
  } catch (error) {
    console.error("Failed to fetch doctors:", error);
    return [];
  }
}

export async function FetchDepertments2() {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  try {
    const response = await fetch(`https://accf-api.cancercareinstituteguwahati.org/api/get-departments-for-center`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ "hospitalId": HospitalID }),
      next: { revalidate: 900 },
      // cache: "no-store",
    });

    const data = await response.json();
    // console.log('Trying to fetch news from barpeta server :', data);
    return data || [];
  } catch (error) {
    console.error("Failed to fetch doctors:", error);
    return [];
  }
}