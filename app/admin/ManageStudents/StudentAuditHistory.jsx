"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import AdminTablePagination from "../AdminTablePagination";

function displayValue(value) {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? "Active" : "Inactive";
  return String(value);
}

function formatAction(action) {
  return String(action || "").toLowerCase().replaceAll("_", " ");
}

export default function StudentAuditHistory({ studentId }) {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setPage(0);
  }, [studentId]);

  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams({
      page: String(page + 1),
      pageSize: String(pageSize),
    });
    if (studentId) query.set("studentId", studentId);

    (async () => {
      try {
        setLoading(true);
        setError("");
        const response = await fetch(`/api/admin/students/audit-logs?${query}`, {
          credentials: "include",
          signal: controller.signal,
        });
        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.message || "Unable to load student activity history.");
        }
        setLogs(Array.isArray(result.data) ? result.data : []);
        setTotal(result.pagination?.total || 0);
      } catch (requestError) {
        if (requestError.name === "AbortError") return;
        setError(requestError.message || "Unable to load student activity history.");
        setLogs([]);
        setTotal(0);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [studentId, page, pageSize]);

  return (
    <Box>
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: "65vh" }}>
        <Table stickyHeader size="small" sx={{ minWidth: 760 }}>
          <TableHead>
            <TableRow>
              <TableCell>When</TableCell>
              {!studentId ? <TableCell>Student</TableCell> : null}
              <TableCell>Action</TableCell>
              <TableCell>Changed by</TableCell>
              <TableCell>Changes</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {!loading && logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={studentId ? 4 : 5} align="center">
                  No activity has been recorded yet.
                </TableCell>
              </TableRow>
            ) : logs.map((log) => (
              <TableRow key={log.id} hover>
                <TableCell sx={{ whiteSpace: "nowrap" }}>
                  {new Date(log.createdAt).toLocaleString()}
                </TableCell>
                {!studentId ? <TableCell>{log.studentName} ({log.studentId})</TableCell> : null}
                <TableCell sx={{ textTransform: "capitalize", whiteSpace: "nowrap" }}>
                  {formatAction(log.action)}
                </TableCell>
                <TableCell>{log.actorName || "Unknown user"}</TableCell>
                <TableCell>
                  {Object.entries(log.changes || {}).length
                    ? Object.entries(log.changes).map(([field, change]) => (
                      <Typography key={field} variant="body2">
                        <strong>{field}:</strong> {displayValue(change.before)} to {displayValue(change.after)}
                      </Typography>
                    ))
                    : "No field-level details"}
                </TableCell>
              </TableRow>
            ))}
            {loading ? (
              <TableRow>
                <TableCell colSpan={studentId ? 4 : 5} align="center">Loading activity...</TableCell>
              </TableRow>
            ) : null}
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
    </Box>
  );
}
