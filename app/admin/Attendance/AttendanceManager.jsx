"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";

function todayValue() {
  return new Date().toISOString().slice(0, 10);
}

function hasPermission(permissions, permission, role) {
  if (String(role || "").toUpperCase() === "ADMIN") return true;
  const values = Array.isArray(permissions) ? permissions.map((item) => String(item || "").toLowerCase()) : [];
  return values.includes("*") || values.includes(permission) || values.some((item) => item.endsWith(".*") && permission.startsWith(`${item.slice(0, -2)}.`));
}

export default function AttendanceManager({ role, permissions = [] }) {
  const [centers, setCenters] = useState([]);
  const [centerId, setCenterId] = useState("");
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState("");
  const [date, setDate] = useState(todayValue());
  const [today, setToday] = useState(todayValue());
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [message, setMessage] = useState(null);
  const canMark = hasPermission(permissions, "attendance.mark", role);
  const canEdit = hasPermission(permissions, "attendance.edit", role);
  const isHistorical = date !== today;
  const canChange = canMark && (!isHistorical || canEdit);

  const loadCenters = async () => {
    const response = await fetch("/api/admin/centers", { credentials: "include" });
    const data = await response.json();
    if (data.success) setCenters(data.data || []);
  };

  const loadAttendance = async (nextCenterId = centerId, nextClassId = classId, nextDate = date) => {
    if (!nextCenterId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ centerId: nextCenterId, date: nextDate });
      if (nextClassId) params.set("classId", nextClassId);
      const response = await fetch(`/api/admin/attendance?${params}`, { credentials: "include" });
      const data = await response.json();
      if (!data.success) throw new Error(data.message || "Unable to load attendance.");
      setClasses(data.data.classes || []);
      setToday(data.data.today || todayValue());
      setStudents(data.data.students || []);
      if (!nextClassId && data.data.classes?.length) setClassId(data.data.classes[0].id);
    } catch (error) {
      setMessage({ severity: "error", text: error.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.all([loadCenters(), fetch("/api/admin/me", { credentials: "include" }).then((response) => response.json())])
      .then(([, me]) => {
        const fixedCenter = me.data?.centerId || me.data?.teacher?.centerId || "";
        const firstCenter = fixedCenter || me.data?.assignedCenterIds?.[0] || "";
        if (firstCenter) {
          setCenterId(firstCenter);
          loadAttendance(firstCenter, "", todayValue());
        }
      })
      .catch((error) => setMessage({ severity: "error", text: error.message || "Unable to load attendance." }));
  }, []);

  useEffect(() => {
    if (centerId && classId) loadAttendance(centerId, classId, date);
  }, [centerId, classId, date]);

  const updateAttendance = async (studentId, status) => {
    if (!canChange) return;
    setSavingId(studentId);
    try {
      const response = await fetch("/api/admin/attendance", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ centerId, classId, date, studentId, status }),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.message || "Unable to save attendance.");
      setStudents((current) => current.map((student) => student.id === studentId ? { ...student, status: data.data.status } : student));
      setMessage({ severity: "success", text: data.message });
    } catch (error) {
      setMessage({ severity: "error", text: error.message });
    } finally {
      setSavingId(null);
    }
  };

  return (
    <Box>
      <Paper sx={{ p: { xs: 2, sm: 3 }, mb: 3, borderRadius: 3, boxShadow: "0 20px 48px rgba(15, 23, 42, 0.08)" }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }} justifyContent="space-between">
          <Box>
            <Typography variant="h5" fontWeight={700}>Attendance</Typography>
            <Typography color="text.secondary">Mark and review daily student attendance.</Typography>
          </Box>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ minWidth: { md: 520 } }}>
            {String(role || "").toUpperCase() === "TEACHER" ? (
              <TextField label="Centre" value={centers.find((center) => center.id === centerId)?.name || centerId} disabled fullWidth />
            ) : (
              <FormControl fullWidth>
                <InputLabel>Centre</InputLabel>
                <Select value={centerId} label="Centre" onChange={(event) => { setCenterId(event.target.value); setClassId(""); }}>
                  {centers.map((center) => <MenuItem key={center.id} value={center.id}>{center.name}</MenuItem>)}
                </Select>
              </FormControl>
            )}
            <FormControl fullWidth disabled={!classes.length}>
              <InputLabel>Class</InputLabel>
              <Select value={classId} label="Class" onChange={(event) => setClassId(event.target.value)}>
                {classes.map((item) => <MenuItem key={item.id} value={item.id}>{item.className}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField type="date" label="Date" value={date} onChange={(event) => setDate(event.target.value)} InputLabelProps={{ shrink: true }} fullWidth />
          </Stack>
        </Stack>
        {isHistorical ? <Alert severity="info" sx={{ mt: 2 }}>You are viewing past attendance. {canEdit ? "You can edit this date." : "This date is read-only."}</Alert> : null}
      </Paper>

      {message ? <Alert severity={message.severity} sx={{ mb: 2 }} onClose={() => setMessage(null)}>{message.text}</Alert> : null}

      <Paper sx={{ borderRadius: 3, overflow: "hidden", boxShadow: "0 20px 48px rgba(15, 23, 42, 0.08)" }}>
        {!classId ? <Typography sx={{ p: 3 }} color="text.secondary">Select a class to view students.</Typography> : loading ? <Box sx={{ p: 4, textAlign: "center" }}><CircularProgress /></Box> : students.length === 0 ? <Typography sx={{ p: 3 }} color="text.secondary">No students found for this class.</Typography> : (
          <Table size="small">
            <TableHead><TableRow><TableCell sx={{ fontWeight: 700 }}>Enrollment ID</TableCell><TableCell sx={{ fontWeight: 700 }}>Student Name</TableCell><TableCell sx={{ fontWeight: 700 }}>Status</TableCell><TableCell align="right" sx={{ fontWeight: 700 }}>Action</TableCell></TableRow></TableHead>
            <TableBody>{students.map((student) => (
              <TableRow key={student.id} hover>
                <TableCell sx={{ fontWeight: 700 }}>{student.id}</TableCell>
                <TableCell>{student.name}</TableCell>
                <TableCell><Chip label={student.status || "Not marked"} color={student.status === "PRESENT" ? "success" : student.status === "ABSENT" ? "error" : "default"} size="small" /></TableCell>
                <TableCell align="right"><Stack direction="row" spacing={1} justifyContent="flex-end"><Button size="small" variant="contained" color="success" disabled={!canChange || savingId === student.id} onClick={() => updateAttendance(student.id, "PRESENT")}>Present</Button><Button size="small" variant="outlined" color="error" disabled={!canChange || savingId === student.id} onClick={() => updateAttendance(student.id, "ABSENT")}>Absent</Button><Button size="small" disabled={!canChange || !student.status || savingId === student.id} onClick={() => updateAttendance(student.id, "REVERT")}>Revert</Button></Stack></TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        )}
      </Paper>
    </Box>
  );
}
