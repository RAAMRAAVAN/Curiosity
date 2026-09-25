"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  Checkbox,
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
import { ClearAll, SelectAll } from "@mui/icons-material";

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

export default function AttendanceManager({ admin, role, permissions = [] }) {
  const [centers, setCenters] = useState([]);
  const [centerIds, setCenterIds] = useState([]);
  const [selectedCenterName, setSelectedCenterName] = useState("");
  const [classes, setClasses] = useState([]);
  const [classIds, setClassIds] = useState([]);
  const [date, setDate] = useState("");
  const [today, setToday] = useState(todayValue());
  const [students, setStudents] = useState([]);
  const [hasLoadedAttendance, setHasLoadedAttendance] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [holidayDialogOpen, setHolidayDialogOpen] = useState(false);
  const [holidayType, setHolidayType] = useState("HOLIDAY");
  const [markingHoliday, setMarkingHoliday] = useState(false);
  const [message, setMessage] = useState(null);
  const [studentSearch, setStudentSearch] = useState("");
  const skipDateReload = useRef(false);
  const canMark = hasPermission(permissions, "attendance.mark", role);
  const canEdit = hasPermission(permissions, "attendance.edit", role);
  const canMarkHoliday = hasPermission(permissions, "attendance.holiday", role);
  const isHistorical = date !== today;
  const canChange = canMark && (!isHistorical || canEdit);
  const canMarkSelectedHoliday = canMarkHoliday && (!isHistorical || canEdit);
  const centerQuery = centerIds.join(",");
  const classQuery = classIds.join(",");
  const SELECT_ALL = "__select_all__";
  const DESELECT_ALL = "__deselect_all__";

  const filteredStudents = useMemo(() => {
    const search = studentSearch.trim().toLowerCase();
    if (!search) return students;
    return students.filter((student) => String(student.name || "").toLowerCase().includes(search));
  }, [students, studentSearch]);

  const loadCenters = async () => {
    const response = await fetch("/api/admin/centers", { credentials: "include" });
    const data = await response.json();
    if (data.success) setCenters(data.data || []);
  };

  const loadAttendance = async (nextCenterIds = centerIds, nextClassIds = classIds, nextDate = date) => {
    if (!nextCenterIds.length) return;
    const isInitialLoad = !nextDate;
    if (!isInitialLoad) setLoading(true);
    try {
      const params = new URLSearchParams({ centerId: nextCenterIds.join(",") });
      if (nextDate) params.set("date", nextDate);
      if (nextClassIds.length) params.set("classId", nextClassIds.join(","));
      const response = await fetch(`/api/admin/attendance?${params}`, { credentials: "include" });
      const data = await response.json();
      if (!data.success) throw new Error(data.message || "Unable to load attendance.");
      setClasses(data.data.classes || []);
      setToday(data.data.today || todayValue());
      if (isInitialLoad) {
        skipDateReload.current = true;
        setDate(data.data.date || data.data.today || todayValue());
      }
      setStudents(data.data.students || []);
      setHasLoadedAttendance(true);
    } catch (error) {
      setMessage({ severity: "error", text: error.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const me = admin || {};
    const fixedCenter = me.centerId || me.teacher?.centerId || "";
    const firstCenter = fixedCenter || me.assignedCenterIds?.[0] || "";
    setSelectedCenterName(me.centerName || "");
    if (firstCenter) {
      setCenterIds(firstCenter ? [firstCenter] : []);
    }

    loadCenters().catch((error) => setMessage({ severity: "error", text: error.message || "Unable to load attendance." }));
  }, [admin]);

  useEffect(() => {
    if (centerIds.length) {
      if (skipDateReload.current) {
        skipDateReload.current = false;
        return;
      }
      loadAttendance(centerIds, classIds, date);
    }
  }, [centerIds, classIds, date]);

  const updateAttendance = async (studentId, status, studentClassId) => {
    if (!canChange) return;
    const targetStudent = students.find((student) => student.id === studentId);
    if (!targetStudent?.centerId || !studentClassId) return;
    setSavingId(studentId);
    try {
      const response = await fetch("/api/admin/attendance", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ centerId: targetStudent.centerId, classId: studentClassId, date, studentId, status }),
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
    if (!centerIds.length || !classIds.length || exporting) return;
    setExporting(true);
    try {
      const params = new URLSearchParams({ centerId: centerQuery, classId: classQuery, date });
      params.set("exportRequest", String(Date.now()));
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
    if (!canMarkSelectedHoliday || !centerIds.length || !classIds.length || !students.length || markingHoliday) return;
    setMarkingHoliday(true);
    try {
      const response = await fetch("/api/admin/attendance/mark-holiday", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ centerId: centerQuery, classId: classQuery, date, status: holidayType }),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.message || "Unable to mark leave.");
      await loadAttendance(centerIds, classIds, date);
      setHolidayDialogOpen(false);
      setMessage({ severity: "success", text: data.message });
    } catch (error) {
      setMessage({ severity: "error", text: error.message || "Unable to mark leave." });
    } finally {
      setMarkingHoliday(false);
    }
  };

  return (
    <Box sx={{ width: { xs: '100%', sm: '100%' }, ml: { xs: 0, sm: 0 }, p: { xs: 0, sm: 0, md: 0 }}}>
      <Paper sx={{ p: { xs: 2, sm: 3 }, mb: 3, borderRadius: 3, boxShadow: "0 20px 48px rgba(15, 23, 42, 0.08)" }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }} justifyContent="space-between">
          <Box>
            <Typography variant="h5" fontWeight={700}>Attendance</Typography>
            <Typography color="text.secondary">Mark and review daily student attendance.</Typography>
          </Box>

        </Stack>

        <Box display='flex' width='100%' justifyContent='space-between' alignItems='center' flexDirection={{ xs: 'column', sm: 'row' }} gap={2} mt={2}>
          <Box>
            <Button variant="contained" onClick={exportAttendance} disabled={!centerIds.length || !classIds.length || loading || exporting} sx={{ display: { xs: "none", sm: "inline-flex" }, backgroundColor: '#0a336b', color: '#ffffff', '&:hover': { backgroundColor: '#082b57' }, marginRight: 1 }}>
              {exporting ? "Exporting..." : "Export Excel"}
            </Button>
            {canMarkHoliday ? <Button variant="outlined" color="warning" onClick={() => setHolidayDialogOpen(true)} disabled={!centerIds.length || !classIds.length || !students.length || loading || !canMarkSelectedHoliday} sx={{ display: { xs: "none", sm: "inline-flex" } }}>
              Mark holiday
            </Button> : null}
          </Box>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems="stretch" sx={{ width: '100%', flex: { md: 1 }, minWidth: 0 }}>
            {String(role || "").toUpperCase() === "TEACHER" ? (
              <TextField
                label="Centre"
                value={centers.find((center) => center.id === centerIds[0])?.name || selectedCenterName || centerIds[0] || ""}
                disabled
                fullWidth
                size="small"
                sx={{ flex: { md: 1 }, minWidth: 0 }}
              />
            ) : (
              <Autocomplete
                multiple
                disableCloseOnSelect
                limitTags={1}
                options={[{ id: SELECT_ALL, name: "Select All", action: true }, { id: DESELECT_ALL, name: "Deselect All", action: true }, ...centers]}
                value={centers.filter((center) => centerIds.includes(center.id))}
                onChange={(event, selectedOptions) => {
                  const action = selectedOptions.find((option) => option.action);
                  if (action?.id === SELECT_ALL) {
                    setCenterIds(centers.map((center) => center.id));
                  } else if (action?.id === DESELECT_ALL) {
                    setCenterIds([]);
                  } else {
                    setCenterIds(selectedOptions.filter((option) => !option.action).map((option) => option.id));
                  }
                  setClassIds([]);
                }}
                getOptionLabel={(option) => option.action ? option.name : `${option.slug || ""}${option.slug ? ": " : ""}${option.name || ""}`}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                PaperComponent={(props) => (
                  <Paper
                    {...props}
                    sx={{
                      ...props.sx,
                      minWidth: { xs: 'calc(100vw - 32px)', sm: 440 },
                      border: '1px solid rgba(8, 43, 87, 0.18)',
                      borderRadius: 2.5,
                      boxShadow: '0 14px 32px rgba(15, 23, 42, 0.22), 0 3px 8px rgba(8, 43, 87, 0.12)',
                      overflow: 'hidden',
                    }}
                  />
                )}
                renderOption={(props, option, { selected }) => (
                  <li
                    {...props}
                    key={option.id}
                    style={{
                      ...props.style,
                      ...(option.action ? {
                        borderBottom: option.id === SELECT_ALL ? '1px solid rgba(8, 43, 87, 0.12)' : 'none',
                        marginBottom: option.id === SELECT_ALL ? 6 : 8,
                        paddingTop: 10,
                        paddingBottom: 10,
                      } : {}),
                    }}
                  >
                    {option.action ? (
                      <>
                        {option.id === SELECT_ALL ? <SelectAll fontSize="small" color="primary" sx={{ mr: 1 }} /> : <ClearAll fontSize="small" color="error" sx={{ mr: 1 }} />}
                        <Typography component="span" fontWeight={700} color={option.id === SELECT_ALL ? 'primary.main' : 'error.main'}>{option.name}</Typography>
                      </>
                    ) : (
                      <>
                        <Checkbox checked={selected} sx={{ mr: 1 }} />
                        {option.slug ? <Typography component="span" fontWeight={700}>{option.slug}: </Typography> : null}
                        {option.name}
                      </>
                    )}
                  </li>
                )}
                renderInput={(params) => <TextField {...params} label="Centre" placeholder="Search centres" size="small" />}
                ListboxProps={{
                  sx: {
                    maxHeight: '50dvh',
                    overflowY: 'auto',
                    p: 1,
                    '& .MuiAutocomplete-option': {
                      borderRadius: 1.5,
                      mb: 0.25,
                    },
                  },
                }}
                sx={{
                  width: '100%',
                  flex: { md: 1 },
                  minWidth: 0,
                  '& .MuiAutocomplete-inputRoot': {
                    height: 40,
                    flexWrap: 'nowrap',
                    overflow: 'hidden',
                    minWidth: 0,
                  },
                  '& .MuiAutocomplete-tag': {
                    maxWidth: 'calc(100% - 36px)',
                  },
                  '& .MuiAutocomplete-popper': {
                    minWidth: { xs: 'calc(100vw - 32px)', sm: 440 },
                  },
                }}
                fullWidth
              />
            )}
            <FormControl fullWidth size="small" sx={{ flex: { md: 1 }, minWidth: 0 }}>
              <InputLabel id="attendance-class-select-label">Class</InputLabel>
              <Select
                labelId="attendance-class-select-label"
                label="Class"
                multiple
                value={classIds.length ? classIds : []}
                onChange={(event) => {
                  const selectedValues = Array.isArray(event.target.value) ? event.target.value : [event.target.value];
                  if (selectedValues.includes(SELECT_ALL)) {
                    setClassIds(classes.map((item) => item.id));
                    return;
                  }
                  if (selectedValues.includes(DESELECT_ALL)) {
                    setClassIds([]);
                    return;
                  }
                  setClassIds(selectedValues.filter(Boolean));
                }}
                renderValue={(selected) => {
                  if (!selected.length) return "Select class";
                  const selectedNames = classes
                    .filter((item) => selected.includes(item.id))
                    .map((item) => item.className)
                    .filter(Boolean);
                  return selectedNames.length ? selectedNames.join(", ") : "Select class";
                }}
                MenuProps={{
                  PaperProps: {
                    sx: {
                      maxHeight: 'min(320px, calc(100dvh - 140px))',
                      minWidth: { xs: 220, sm: 260 },
                    },
                  },
                }}
                sx={{
                  width: '100%',
                  '& .MuiSelect-select': {
                    minHeight: 40,
                    display: 'flex',
                    alignItems: 'center',
                    boxSizing: 'border-box',
                  },
                }}
              >
                <MenuItem value={SELECT_ALL} sx={{ fontWeight: 700, color: 'primary.main' }}>
                  <SelectAll fontSize="small" sx={{ mr: 1 }} /> Select All
                </MenuItem>
                <MenuItem value={DESELECT_ALL} sx={{ fontWeight: 700, color: 'error.main' }}>
                  <ClearAll fontSize="small" sx={{ mr: 1 }} /> Deselect All
                </MenuItem>
                {classes.map((item) => (
                  <MenuItem key={item.id} value={item.id}>
                    <Checkbox checked={classIds.includes(item.id)} />
                    {item.className}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField type="date" label="Date" value={date} onChange={(event) => setDate(event.target.value)} inputProps={{ max: today }} InputLabelProps={{ shrink: true }} fullWidth size="small" sx={{ flex: { md: 1 }, minWidth: 0 }} />
          </Stack>
        </Box>
        <TextField label="Search by Name" value={studentSearch} onChange={(event) => setStudentSearch(event.target.value)} fullWidth sx={{ mt: 2 }} />
        {isHistorical ? <Alert severity="info" sx={{ mt: 2 }}>You are viewing past attendance. {canEdit ? "You can edit this date." : "This date is read-only."}</Alert> : null}
      </Paper>

      {message ? <Alert severity={message.severity} sx={{ mb: 2 }} onClose={() => setMessage(null)}>{message.text}</Alert> : null}

      <Paper sx={{ border: '1px solid rgba(59, 130, 246, 0.18)', borderRadius: 3, mx: { xs: 1, sm: 2 }, mb: { xs: 5, sm: 0 }, overflowX: "auto", boxShadow: "0 20px 48px rgba(15, 23, 42, 0.08)" }}>
        {!hasLoadedAttendance ? null : !classIds.length ? <Typography sx={{ p: 3 }} color="text.secondary">Select one or more classes to view students.</Typography> : loading ? <Box sx={{ p: 4, textAlign: "center" }}><CircularProgress /></Box> : students.length === 0 ? <Typography sx={{ p: 3 }} color="text.secondary">No students found for this class.</Typography> : filteredStudents.length === 0 ? <Typography sx={{ p: 3 }} color="text.secondary">No students match your search.</Typography> : (
          <Table
            size="small"
            sx={{
              width: "max-content",
              minWidth: { xs: "max-content", sm: 700 },
              '& .MuiTableCell-root': { whiteSpace: "nowrap" },
            }}
          >
            <TableHead sx={{ backgroundColor: '#0a336b', '& .MuiTableCell-root': { color: '#ffffff' } }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, whiteSpace: "nowrap" }}>Enrollment ID</TableCell>
                <TableCell sx={{ fontWeight: 700, whiteSpace: "nowrap", textAlign: "right" }}>Class</TableCell>
                <TableCell sx={{ fontWeight: 700, whiteSpace: "nowrap" }}>Student Name</TableCell>
                <TableCell sx={{ fontWeight: 700, display: { xs: "none", sm: "table-cell" } }}>Centre Name</TableCell>
                <TableCell sx={{ fontWeight: 700, display: { xs: "none", sm: "table-cell" } }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700, display: { xs: "none", sm: "table-cell" } }}>Marked by</TableCell>
                <TableCell sx={{ fontWeight: 700, display: { xs: "none", sm: "table-cell" } }}>Mark time &amp; date</TableCell>
                <TableCell sx={{ fontWeight: 700, textAlign: { xs: "left", sm: "right" }, width: { xs: "auto", sm: "auto" } }}></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>{filteredStudents.map((student) => (
              <TableRow key={student.id} hover>
                <TableCell sx={{ whiteSpace: "nowrap" }}>{student.id}</TableCell>
                <TableCell sx={{ whiteSpace: "nowrap", textAlign: "right" }}>{student.className}</TableCell>
                <TableCell sx={{ whiteSpace: "nowrap" }}>{student.name}</TableCell>
                <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>{student.centerName}</TableCell>
                <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}><Chip label={student.status || "Not marked"} color={student.status === "PRESENT" ? "success" : student.status === "ABSENT" ? "error" : student.status === "HOLIDAY" || student.status === "WEEKLY_OFF" ? "warning" : "default"} size="small" /></TableCell>
                <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>{student.markedByName || "-"}</TableCell>
                <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>{formatMarkedAt(student.markedAt)}</TableCell>
                <TableCell sx={{ textAlign: { xs: "left", sm: "right" } }}><Stack direction="row" spacing={1} justifyContent={{ xs: "flex-start", sm: "flex-end" }}><Button size="small" variant={student.status === "PRESENT" ? "contained" : "outlined"} color="success" disabled={!canChange || savingId === student.id || student.status === "HOLIDAY" || student.status === "WEEKLY_OFF"} onClick={() => updateAttendance(student.id, "PRESENT", student.classId)}>Present</Button><Button size="small" variant={student.status === "ABSENT" ? "contained" : "outlined"} color="error" disabled={!canChange || savingId === student.id || student.status === "HOLIDAY" || student.status === "WEEKLY_OFF"} onClick={() => updateAttendance(student.id, "ABSENT", student.classId)}>Absent</Button><Button size="small" disabled={!canChange || !student.status || savingId === student.id} onClick={() => updateAttendance(student.id, "REVERT", student.classId)}>Revert</Button></Stack></TableCell>
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
