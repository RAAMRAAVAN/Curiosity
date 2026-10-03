"use client";

import { useEffect, useRef, useState } from "react";
import { AccessTime, LocationOn, Login, Logout } from "@mui/icons-material";
import { Alert, Box, Button, Chip, Paper, Stack, Typography } from "@mui/material";
import Loader from '@/app/(components)/Loader';

function formatTime(value) {
  if (!value) return "Not marked";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

function buildLocationName(address = {}, displayName = "") {
  const candidateParts = [
    address.house_number,
    address.road,
    address.neighbourhood,
    address.suburb,
    address.locality,
    address.village,
    address.hamlet,
    address.city_district,
    address.city || address.town || address.municipality,
    address.county,
    address.state,
    address.postcode,
  ].filter(Boolean);

  const uniqueParts = [...new Set(candidateParts.map((part) => String(part).trim()))].filter(Boolean);

  if (uniqueParts.length >= 2) {
    return uniqueParts.slice(0, 6).join(", ");
  }

  if (displayName) {
    return displayName
      .split(",")
      .map((part) => part.trim())
      .filter((part) => part && part.toLowerCase() !== "india")
      .slice(0, 6)
      .join(", ");
  }

  return uniqueParts.join(", ") || "Current location";
}

async function reverseGeocodeLocation(latitude, longitude) {
  if (latitude == null || longitude == null) return "";

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}&zoom=18&addressdetails=1`,
      {
        headers: {
          "Accept-Language": "en",
        },
      }
    );

    if (!response.ok) {
      return "";
    }

    const data = await response.json();
    return buildLocationName(data?.address || {}, data?.display_name || "");
  } catch (error) {
    return "";
  }
}

function formatLocation(latitude, longitude, accuracy, placeName) {
  if (latitude == null || longitude == null) {
    return "Location not recorded. Please allow location access to mark attendance.";
  }

  if (placeName) {
    return `Marked from nearby area: ${placeName}.`;
  }

  const accuracyMeters = Number.isFinite(Number(accuracy)) ? Math.round(Number(accuracy)) : null;

  if (accuracyMeters) {
    return `Marked from your nearby area. GPS accuracy is about ${accuracyMeters} meters.`;
  }

  return "Marked from your nearby area.";
}

function readCurrentLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Location is not supported by this browser."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracyMeters: coords.accuracy,
      }),
      (error) => {
        const messages = {
          1: "Location permission was denied. Allow location access and try again.",
          2: "Your location could not be determined. Check GPS or network access and try again.",
          3: "Location took too long to read. Please try again.",
        };
        reject(new Error(messages[error.code] || "Unable to read your location."));
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }
    );
  });
}

export default function TeacherAttendance({ endpoint = "/api/teacher/attendance/" }) {
  const [attendance, setAttendance] = useState(null);
  const [attendanceDate, setAttendanceDate] = useState("");
  const [locationNames, setLocationNames] = useState({ checkIn: "", checkOut: "" });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const initialLoadStarted = useRef(false);

  useEffect(() => {
    const getLocationName = async (key, latitude, longitude) => {
      if (latitude == null || longitude == null) {
        setLocationNames((current) => ({ ...current, [key]: "" }));
        return;
      }

      const place = await reverseGeocodeLocation(latitude, longitude);
      setLocationNames((current) => ({ ...current, [key]: place }));
    };

    if (attendance?.checkInLatitude != null && attendance?.checkInLongitude != null) {
      getLocationName("checkIn", attendance.checkInLatitude, attendance.checkInLongitude);
    }

    if (attendance?.checkOutLatitude != null && attendance?.checkOutLongitude != null) {
      getLocationName("checkOut", attendance.checkOutLatitude, attendance.checkOutLongitude);
    }
  }, [attendance?.checkInLatitude, attendance?.checkInLongitude, attendance?.checkOutLatitude, attendance?.checkOutLongitude]);

  useEffect(() => {
    if (initialLoadStarted.current) return;
    initialLoadStarted.current = true;

    fetch(endpoint, { credentials: "include", cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.message || "Unable to load today's attendance.");
        }
        setAttendanceDate(data.data.attendanceDate || "");
        setAttendance(data.data.attendance || null);
      })
      .catch((loadError) => setError(loadError.message || "Unable to load today's attendance."))
      .finally(() => setLoading(false));
  }, [endpoint]);

  const handleMark = async (action) => {
    if (actionLoading) return;
    setActionLoading(action);
    setError("");
    setNotice("");

    try {
      const location = await readCurrentLocation();
      const response = await fetch(endpoint, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...location }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to record attendance.");
      }

      setAttendanceDate(data.data.attendanceDate || "");
      setAttendance(data.data.attendance || null);
      setNotice(data.message || "Attendance recorded.");
    } catch (actionError) {
      setError(actionError.message || "Unable to record attendance.");
    } finally {
      setActionLoading("");
    }
  };

  const checkedIn = Boolean(attendance?.checkInAt);
  const checkedOut = Boolean(attendance?.checkOutAt);
  const completed = checkedIn && checkedOut;

  if (loading) {
    return <Loader variant='section' />;
  }

  return (
    <Paper sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2, minWidth: 0, bgcolor: '#ffffff', border: "1px solid rgba(10, 51, 107, 0.14)", boxShadow: "0 12px 32px rgba(15, 23, 42, 0.06)" }}>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} spacing={1.5} sx={{ mb: 3 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography component="h2" variant="h5" fontWeight={700} sx={{ color: '#0a336b', fontSize: { xs: 20, sm: 24 } }}>
            My Attendance
          </Typography>
          <Typography color="text.secondary" variant="body2" sx={{ mt: 0.5 }}>
            {attendanceDate ? `Today · ${attendanceDate}` : "Today's attendance"} · Location is read when you mark In or Out.
          </Typography>
        </Box>
        <Chip
          size="small"
          color={completed ? "success" : checkedIn ? "warning" : "default"}
          label={completed ? "Day complete" : checkedIn ? "Checked in" : "Not checked in"}
        />
      </Stack>

      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      {notice ? <Alert severity="success" sx={{ mb: 2 }}>{notice}</Alert> : null}

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "repeat(2, minmax(0, 1fr))" }, gap: 2 }}>
        <Box sx={{ p: 2, border: "1px solid rgba(10, 51, 107, 0.14)", bgcolor: '#eef4fb', borderRadius: 1.5, minWidth: 0 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <Login fontSize="small" color="primary" />
            <Typography fontWeight={700}>Check-in</Typography>
          </Stack>
          <Typography variant="h6" sx={{ fontVariantNumeric: "tabular-nums" }}>
            {formatTime(attendance?.checkInAt)}
          </Typography>
          <Stack direction="row" spacing={0.5} alignItems="flex-start" sx={{ mt: 1, color: "text.secondary" }}>
            <LocationOn fontSize="small" sx={{ mt: "1px" }} />
            <Typography variant="caption" sx={{ overflowWrap: "anywhere" }}>
              {formatLocation(attendance?.checkInLatitude, attendance?.checkInLongitude, attendance?.checkInAccuracyMeters, locationNames.checkIn)}
            </Typography>
          </Stack>
        </Box>

        <Box sx={{ p: 2, border: "1px solid rgba(10, 51, 107, 0.14)", bgcolor: '#eef4fb', borderRadius: 1.5, minWidth: 0 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <Logout fontSize="small" color="primary" />
            <Typography fontWeight={700}>Check-out</Typography>
          </Stack>
          <Typography variant="h6" sx={{ fontVariantNumeric: "tabular-nums" }}>
            {formatTime(attendance?.checkOutAt)}
          </Typography>
          <Stack direction="row" spacing={0.5} alignItems="flex-start" sx={{ mt: 1, color: "text.secondary" }}>
            <LocationOn fontSize="small" sx={{ mt: "1px" }} />
            <Typography variant="caption" sx={{ overflowWrap: "anywhere" }}>
              {formatLocation(attendance?.checkOutLatitude, attendance?.checkOutLongitude, attendance?.checkOutAccuracyMeters, locationNames.checkOut)}
            </Typography>
          </Stack>
        </Box>
      </Box>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mt: 3 }}>
        <Button
          variant="contained"
          startIcon={actionLoading === "IN" ? <Loader variant='inline' size={18} color='inherit' /> : <Login />}
          onClick={() => handleMark("IN")}
          disabled={Boolean(actionLoading) || checkedIn}
          sx={{ minWidth: { xs: 0, sm: 150 }, width: { xs: '100%', sm: 'auto' }, minHeight: 44 }}
        >
          {actionLoading === "IN" ? "Reading location..." : "Mark In"}
        </Button>
        <Button
          variant="outlined"
          startIcon={actionLoading === "OUT" ? <Loader variant='inline' size={18} /> : <Logout />}
          onClick={() => handleMark("OUT")}
          disabled={Boolean(actionLoading) || !checkedIn || checkedOut}
          sx={{ minWidth: { xs: 0, sm: 150 }, width: { xs: '100%', sm: 'auto' }, minHeight: 44 }}
        >
          {actionLoading === "OUT" ? "Reading location..." : "Mark Out"}
        </Button>
      </Stack>

      <Typography variant="caption" color="text.secondary" sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 2 }}>
        <AccessTime fontSize="inherit" /> Times are displayed in India Standard Time.
      </Typography>
    </Paper>
  );
}
