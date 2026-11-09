"use client";

import Link from "next/link";
import { Alert, Box, Button, Paper, Typography } from "@mui/material";
import ArrowBack from "@mui/icons-material/ArrowBack";
import Loader from "@/app/(components)/Loader";
import { useAdminAuth } from "../AdminAuthContext";
import StudentAuditHistory from "../ManageStudents/StudentAuditHistory";
import { canViewStudentAudit } from "@/lib/studentAuditAccess";

export default function StudentActivityPage() {
  const { admin, loading } = useAdminAuth();

  if (loading || !admin) {
    return <Loader variant="page" size={64} thickness={4} sx={{ bgcolor: "#eef4fb", p: 3 }} />;
  }
  if (!canViewStudentAudit(admin)) {
    return <Alert severity="error">Only the designated administrator can view student activity logs.</Alert>;
  }

  return (
    <Box sx={{ maxWidth: 1400, mx: "auto", width: "100%", p: { xs: 1, sm: 3 } }}>
      <Paper sx={{ p: { xs: 1, sm: 3 }, borderRadius: { xs: 0, sm: 3 } }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, gap: 2 }}>
          <Typography variant="h5" fontWeight={700}>Student Activity Logs</Typography>
          <Button component={Link} href="/admin/students" startIcon={<ArrowBack />} variant="outlined">
            Manage Students
          </Button>
        </Box>
        <StudentAuditHistory />
      </Paper>
    </Box>
  );
}
