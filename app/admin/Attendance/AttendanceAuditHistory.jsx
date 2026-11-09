"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import AdminTablePagination from "../AdminTablePagination";

function formatStatus(status) {
  if (!status) return "Not marked";
  return status.replaceAll("_", " ");
}

export default function AttendanceAuditHistory() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams({
      page: String(page + 1),
      pageSize: String(pageSize),
    });

    (async () => {
      try {
        setLoading(true);
        setError("");
        const response = await fetch(`/api/admin/attendance/audit-logs?${query}`, {
          credentials: "include",
          signal: controller.signal,
        });
        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.message || "Unable to load attendance history.");
        }
        setLogs(Array.isArray(result.data) ? result.data : []);
        setTotal(result.pagination?.total || 0);
      } catch (requestError) {
        if (requestError.name === "AbortError") return;
        setError(requestError.message || "Unable to load attendance history.");
        setLogs([]);
        setTotal(0);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [page, pageSize]);

  return (
    <>
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: "65vh" }}>
        <Table stickyHeader size="small" sx={{ minWidth: 850 }}>
          <TableHead>
            <TableRow>
              <TableCell>Attendance date</TableCell>
              <TableCell>Student</TableCell>
              <TableCell>Centre</TableCell>
              <TableCell>Class</TableCell>
              <TableCell>Action</TableCell>
              <TableCell>Change</TableCell>
              <TableCell>Changed by</TableCell>
              <TableCell>Recorded at</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {!loading && logs.length === 0 ? (
              <TableRow><TableCell colSpan={8} align="center">No attendance changes have been recorded.</TableCell></TableRow>
            ) : logs.map((log) => (
              <TableRow key={log.id} hover>
                <TableCell>{new Date(log.attendanceDate).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}</TableCell>
                <TableCell>{log.studentName} ({log.studentId})</TableCell>
                <TableCell>{log.centerName || log.centerId || "-"}</TableCell>
                <TableCell>{log.className || log.classId || "-"}</TableCell>
                <TableCell>{String(log.action || "").toLowerCase()}</TableCell>
                <TableCell>{formatStatus(log.beforeStatus)} to {formatStatus(log.afterStatus)}</TableCell>
                <TableCell>{log.actorName || "Unknown user"}</TableCell>
                <TableCell>{new Date(log.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</TableCell>
              </TableRow>
            ))}
            {loading ? <TableRow><TableCell colSpan={8} align="center">Loading history...</TableCell></TableRow> : null}
          </TableBody>
        </Table>
      </TableContainer>
      <AdminTablePagination
        component="div"
        count={total}
        page={page}
        onPageChange={(_event, nextPage) => setPage(nextPage)}
        rowsPerPage={pageSize}
        onRowsPerPageChange={(event) => {
          setPageSize(Number(event.target.value));
          setPage(0);
        }}
        rowsPerPageOptions={[10, 25, 50]}
      />
    </>
  );
}
