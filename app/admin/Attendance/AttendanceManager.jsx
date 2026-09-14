"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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

function formatMarkedAt(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
}

function hasPermission(permissions, permission, role) {
  if (String(role || "").toUpperCase() === "ADMIN") return true;
  const values = Array.isArray(permissions) ? permissions.map((item) => String(item || "").toLowerCase()) : [];
  return values.includes("*") || values.includes(permission) || values.some((item) => item.endsWith(".*") && permission.startsWith(`${item.slice(0, -2)}.`));
}

export default function AttendanceManager({ role, permissions = [] }) {
  const [centers, setCenters] = useState([]);
  const [centerId, setCenterId] = useState("");
  const [selectedCenterName, setSelectedCenterName] = useState("");
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState("");
  const [date, setDate] = useState(todayValue());
  const [today, setToday] = useState(todayValue());
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [holidayDialogOpen, setHolidayDialogOpen] = useState(false);
  const [holidayType, setHolidayType] = useState("HOLIDAY");
  const [markingHoliday, setMarkingHoliday] = useState(false);
  const [message, setMessage] = useState(null);
  const canMark = hasPermission(permissions, "attendance.mark", role);
  const canEdit = hasPermission(permissions, "attendance.edit", role);
  const canMarkHoliday = hasPermission(permissions, "attendance.holiday", role);
  const isHistorical = date !== today;
  const canChange = canMark && (!isHistorical || canEdit);
  const canMarkSelectedHoliday = canMarkHoliday && (!isHistorical || canEdit);

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
        setSelectedCenterName(me.data?.centerName || "");
        if (firstCenter) {
          setCenterId(firstCenter);
        }
      })
      .catch((error) => setMessage({ severity: "error", text: error.message || "Unable to load attendance." }));
  }, []);

  useEffect(() => {
    if (centerId) loadAttendance(centerId, classId, date);
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
      setStudents((current) => current.map((student) => student.id === studentId ? {
        ...student,
        status: data.data.status,
        markedByName: data.data.markedByName,
        markedAt: data.data.markedAt,
      } : student));
      setMessage({ severity: "success", text: data.message });
    } catch (error) {
      setMessage({ severity: "error", text: error.message });
    } finally {
      setSavingId(null);
    }
  };

  const exportAttendance = async () => {
    if (!centerId || !classId || exporting) return;
    setExporting(true);
    try {
      const params = new URLSearchParams({ centerId, classId, date });
      const response = await fetch(`/api/admin/attendance/export?${params}`, { credentials: "include" });
      if (!response.ok) {
        throw new Error((await response.text()) || "Unable to export attendance.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `attendance-${date}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setMessage({ severity: "success", text: "Attendance exported successfully." });
    } catch (error) {
      setMessage({ severity: "error", text: error.message || "Unable to export attendance." });
    } finally {
      setExporting(false);
    }
  };

  const markHoliday = async () => {
    if (!canMarkSelectedHoliday || !centerId || !classId || !students.length || markingHoliday) return;
    setMarkingHoliday(true);
    try {
      const response = await fetch("/api/admin/attendance/mark-holiday", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ centerId, classId, date, status: holidayType }),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.message || "Unable to mark leave.");
      await loadAttendance(centerId, classId, date);
      setHolidayDialogOpen(false);
      setMessage({ severity: "success", text: data.message });
    } catch (error) {
      setMessage({ severity: "error", text: error.message || "Unable to mark leave." });
    } finally {
      setMarkingHoliday(false);
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
          <Button variant="outlined" onClick={exportAttendance} disabled={!centerId || !classId || loading || exporting}>
            {exporting ? "Exporting..." : "Export Excel"}
          </Button>
          {canMarkHoliday ? <Button variant="outlined" color="warning" onClick={() => setHolidayDialogOpen(true)} disabled={!centerId || !classId || !students.length || loading || !canMarkSelectedHoliday}>
            Mark holiday
          </Button> : null}
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ minWidth: { md: 520 } }}>
            {String(role || "").toUpperCase() === "TEACHER" ? (
              <TextField label="Centre" value={centers.find((center) => center.id === centerId)?.name || selectedCenterName || centerId} disabled fullWidth />
            ) : (
              <FormControl fullWidth>
                <InputLabel>Centre</InputLabel>
                <Select value={centerId} label="Centre" onChange={(event) => { setCenterId(event.target.value); setClassId(""); }}>
                  <MenuItem value="all">All</MenuItem>
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
            <TextField type="date" label="Date" value={date} onChange={(event) => setDate(event.target.value)} inputProps={{ max: today }} InputLabelProps={{ shrink: true }} fullWidth />
          </Stack>
        </Stack>
        {isHistorical ? <Alert severity="info" sx={{ mt: 2 }}>You are viewing past attendance. {canEdit ? "You can edit this date." : "This date is read-only."}</Alert> : null}
      </Paper>

      {message ? <Alert severity={message.severity} sx={{ mb: 2 }} onClose={() => setMessage(null)}>{message.text}</Alert> : null}

      <Paper sx={{ borderRadius: 3, overflow: "hidden", boxShadow: "0 20px 48px rgba(15, 23, 42, 0.08)" }}>
        {!classId ? <Typography sx={{ p: 3 }} color="text.secondary">Select a class to view students.</Typography> : loading ? <Box sx={{ p: 4, textAlign: "center" }}><CircularProgress /></Box> : students.length === 0 ? <Typography sx={{ p: 3 }} color="text.secondary">No students found for this class.</Typography> : (
          <Table size="small">
            <TableHead><TableRow><TableCell sx={{ fontWeight: 700 }}>Enrollment ID</TableCell><TableCell sx={{ fontWeight: 700 }}>Student Name</TableCell><TableCell sx={{ fontWeight: 700 }}>Centre Name</TableCell><TableCell sx={{ fontWeight: 700 }}>Class</TableCell><TableCell sx={{ fontWeight: 700 }}>Status</TableCell><TableCell sx={{ fontWeight: 700 }}>Marked by</TableCell><TableCell sx={{ fontWeight: 700 }}>Mark time &amp; date</TableCell><TableCell align="right" sx={{ fontWeight: 700 }}>Action</TableCell></TableRow></TableHead>
            <TableBody>{students.map((student) => (
              <TableRow key={student.id} hover>
                <TableCell sx={{ fontWeight: 700 }}>{student.id}</TableCell>
                <TableCell>{student.name}</TableCell>
                <TableCell>{student.centerName}</TableCell>
                <TableCell>{student.className}</TableCell>
                <TableCell><Chip label={student.status || "Not marked"} color={student.status === "PRESENT" ? "success" : student.status === "ABSENT" ? "error" : student.status === "HOLIDAY" || student.status === "WEEKLY_OFF" ? "warning" : "default"} size="small" /></TableCell>
                <TableCell>{student.markedByName || "-"}</TableCell>
                <TableCell>{formatMarkedAt(student.markedAt)}</TableCell>
                <TableCell align="right"><Stack direction="row" spacing={1} justifyContent="flex-end"><Button size="small" variant="contained" color="success" disabled={!canChange || savingId === student.id} onClick={() => updateAttendance(student.id, "PRESENT")}>Present</Button><Button size="small" variant="outlined" color="error" disabled={!canChange || savingId === student.id} onClick={() => updateAttendance(student.id, "ABSENT")}>Absent</Button><Button size="small" disabled={!canChange || !student.status || savingId === student.id} onClick={() => updateAttendance(student.id, "REVERT")}>Revert</Button></Stack></TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        )}
      </Paper>
      <Dialog open={holidayDialogOpen} onClose={() => !markingHoliday && setHolidayDialogOpen(false)}>
        <DialogTitle>Mark holiday</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>This will mark all visible students for the selected centre, class, and date.</Typography>
          <FormControl fullWidth>
            <InputLabel>Leave type</InputLabel>
            <Select value={holidayType} label="Leave type" onChange={(event) => setHolidayType(event.target.value)}>
              <MenuItem value="HOLIDAY">Holiday</MenuItem>
              <MenuItem value="WEEKLY_OFF">Weekly off</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHolidayDialogOpen(false)} disabled={markingHoliday}>Cancel</Button>
          <Button onClick={markHoliday} variant="contained" color="warning" disabled={markingHoliday}>{markingHoliday ? "Saving..." : "Mark leave"}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
