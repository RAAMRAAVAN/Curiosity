'use client';

import {
  AddCircle,
  Delete,
} from "@mui/icons-material";
import Link from "next/link";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  TextField,
  Typography,
} from "@mui/material";
// import CourseCard from "../../../class1/home/Cources/CourceCard";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setSelectedSubject } from "@/redux/features/subjectSlice";
import { selectDefaultClass } from "@/redux/features/classSlice";
import { useRouter, useParams } from "next/navigation";
import CourseCard from "./CourceCard";

const Cources = ({ defaultClass }) => {
  const [subjects, setSubjects] = useState([]);
  const [className, setClassName] = useState("");
  const [classId, setClassId] = useState(defaultClass);
  const [canCreateSubject, setCanCreateSubject] = useState(false);

  const dispatch = useDispatch();
  const router = useRouter();
  const params = useParams();
  const classSlug = params?.classSlug;

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [newSubjects, setNewSubjects] = useState([
    {
      subjectName: "",
      file: null,
    },
  ]);

  // const defaultClass = useSelector(selectDefaultClass);

  const hasPermission = (permissions, permission, role) => {
    if (String(role || '').toUpperCase() === 'ADMIN') return true;
    if (!permission) return true;

    const normalizedPermissions = Array.isArray(permissions)
      ? permissions.map((item) => String(item || '').toLowerCase())
      : [];

    const normalizedPermission = String(permission || '').toLowerCase();

    return normalizedPermissions.includes('*')
      || normalizedPermissions.includes(normalizedPermission)
      || normalizedPermissions.some(
        (item) => item.endsWith('.*') && normalizedPermission.startsWith(`${item.slice(0, -2)}.`)
      );
  };

  const loadCreatePermissions = async () => {
    try {
      const res = await fetch('/api/admin/me', { credentials: 'include' });
      const result = await res.json();

      if (!result?.success) {
        setCanCreateSubject(false);
        return;
      }

      const role = result?.data?.role;
      const permissions = result?.data?.permissions || [];
      setCanCreateSubject(hasPermission(permissions, 'subjects.create', role));
    } catch (error) {
      console.error('Failed to load create permissions', error);
      setCanCreateSubject(false);
    }
  };

  const loadSubjects = async (classIdToLoad) => {
    if (!classIdToLoad) return;

    try {
      const res = await fetch(
        `/api/subjects?classID=${classIdToLoad}`
      );

      const result = await res.json();

      if (!result.success) throw new Error(result.message);

      setSubjects(result.data || []);
    } catch (err) {
      console.log(err);
    }
  };

  const loadClassDetails = async (slug) => {
    if (!slug) return;

    try {
      const res = await fetch(`/api/classes/${slug}`);
      const data = await res.json();

      if (data?.success && data?.data) {
        setClassName(data.data.className || "");
        setClassId(data.data.id || defaultClass);
      }
    } catch (err) {
      console.error("Failed to load class details", err);
      setClassId(defaultClass);
    }
  };

  useEffect(() => {
    loadCreatePermissions();
  }, []);

  useEffect(() => {
    if (classSlug) {
      loadClassDetails(classSlug);
    } else if (defaultClass) {
      setClassId(defaultClass);
    }
  }, [defaultClass, classSlug]);

  useEffect(() => {
    if (classId) {
      loadSubjects(classId);
    }
  }, [classId]);

  const handleChange = (index, field, value) => {
    const updated = [...newSubjects];
    updated[index][field] = value;
    setNewSubjects(updated);
  };

  const addRow = () => {
    setNewSubjects([
      ...newSubjects,
      {
        subjectName: "",
        file: null,
      },
    ]);
  };

  const removeRow = (index) => {
    setNewSubjects(
      newSubjects.filter((_, i) => i !== index)
    );
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);

      const formData = new FormData();

      formData.append("classId", classId);

      const payload = newSubjects
        .filter((s) => s.subjectName.trim())
        .map((s) => ({
          subjectName: s.subjectName,
        }));

      formData.append(
        "subjects",
        JSON.stringify(payload)
      );

      newSubjects.forEach((subject, index) => {
        if (subject.file) {
          formData.append(
            `icon${index}`,
            subject.file
          );
        }
      });

      const res = await fetch("/api/subjects", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();

      alert(result.message);

      if (result.success) {
        setOpen(false);

        setNewSubjects([
          {
            subjectName: "",
            file: null,
          },
        ]);

        loadSubjects(classId);
      }
    } catch (err) {
      console.log(err);
      alert("Failed to create subjects");
    } finally {
      setLoading(false);
    }
  };

  const handleSubjectClick = async (subject) => {
    dispatch(setSelectedSubject(subject));

    try {
      const res = await fetch("/api/admin/navigation-preference", { credentials: "include" });
      const data = await res.json();
      const preference = data?.data?.preference || "contents";

      if (preference === "assessments") {
        router.push(`./Cources/${subject.id}/Assessments/${classSlug || classId}`);
        return;
      }
    } catch (error) {
      console.error(error);
    }

    router.push(`./Cources/${subject.id}`);
  };

  return (
    <>
      <Box display="flex">
        <Grid container spacing={2}>
          {subjects.map((item) => (
            <Grid item lg={3} md={4} sm={6} xs={6} key={item.id} marginBottom={2}>
              <Box
                onClick={() =>
                  handleSubjectClick(item)
                }
                sx={{
                  cursor: "pointer",
                  width: "100%",
                  height: '100%',
                  // border: "1px solid #e0e0e0",
                }}
              >

                <CourseCard
                  image={
                    item.icon || "/Courses/OIP.webp"
                  }
                  subject={item.subjectName}
                  Class={defaultClass}
                />

              </Box>
            </Grid>
          ))}

          {canCreateSubject && (
            <Grid item lg={3} md={4} sm={6} xs={6} marginBottom={2}>
              <Box
                display="flex"
                flexDirection="column"
                boxShadow={2}
                width="100%"
                height="100%"
                minHeight={300}
                borderRadius={3}
                justifyContent="center"
                alignItems="center"
              >
                <IconButton
                  onClick={() => setOpen(true)}
                  sx={{
                    width: 150,
                    height: 150,
                  }}
                >
                  <AddCircle sx={{ fontSize: { xs: 100, sm: 120 } }} />
                </IconButton>

                <Typography
                  fontWeight="bold"
                  color="gray"
                >
                  Add Subject
                </Typography>
              </Box>
            </Grid>
          )}
        </Grid>
      </Box>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        fullWidth
        maxWidth="md"
        PaperProps={{
          sx: {
            borderRadius: 3,
            mx: { xs: 2, sm: 3 },
            width: { xs: "calc(100% - 32px)", sm: "100%" },
          },
        }}
      >
        <DialogTitle
          sx={{
            fontSize: { xs: "1.1rem", sm: "1.25rem" },
            fontWeight: 600,
            pb: 1,
          }}
        >
          Create Subjects for {className || defaultClass}
        </DialogTitle>

        <DialogContent
          sx={{
            pt: 2,
          }}
        >
          {newSubjects.map((subject, index) => (
            <Box
              key={index}
              sx={{
                display: "flex",
                flexDirection: {
                  xs: "column",
                  sm: "column",
                  md: "row",
                },
                gap: 2,
                mt: 2,
                alignItems: {
                  xs: "stretch",
                  sm: "stretch",
                  md: "center",
                },
                p: 2,
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
              }}
            >
              {/* Subject Name */}
              <TextField
                fullWidth
                label="Subject Name"
                value={subject.subjectName}
                onChange={(e) =>
                  handleChange(index, "subjectName", e.target.value)
                }
              />

              {/* Upload */}
              <Box
                sx={{
                  width: {
                    xs: "100%",
                    sm: "100%",
                    md: 220,
                  },
                  flexShrink: 0,
                }}
              >
                <Button
                  fullWidth
                  variant="outlined"
                  component="label"
                >
                  Upload Icon

                  <input
                    hidden
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];

                      if (!file) return;

                      if (file.size > 200 * 1024) {
                        alert("Image size must be less than 200 KB.");
                        e.target.value = "";
                        return;
                      }

                      handleChange(index, "file", file);
                    }}
                  />
                </Button>

                {subject.file && (
                  <Typography
                    mt={1}
                    fontSize={12}
                    color="text.secondary"
                    sx={{
                      wordBreak: "break-word",
                    }}
                  >
                    {subject.file.name}
                  </Typography>
                )}
              </Box>

              {/* Delete Button */}
              <Box
                sx={{
                  display: "flex",
                  justifyContent: {
                    xs: "flex-end",
                    sm: "flex-end",
                    md: "center",
                  },
                  width: {
                    xs: "100%",
                    sm: "100%",
                    md: "auto",
                  },
                }}
              >
                <IconButton
                  color="error"
                  onClick={() => removeRow(index)}
                  disabled={newSubjects.length === 1}
                >
                  <Delete />
                </IconButton>
              </Box>
            </Box>
          ))}

          <Button
            sx={{
              mt: 3,
              width: {
                xs: "100%",
                sm: "100%",
                md: "auto",
              },
            }}
            variant="outlined"
            onClick={addRow}
          >
            + Add More Subject
          </Button>
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,
            pb: 3,
            flexDirection: {
              xs: "column-reverse",
              sm: "row",
            },
            gap: 1.5,
          }}
        >
          <Button
            fullWidth={{ xs: true }}
            onClick={() => setOpen(false)}
            sx={{
              width: {
                xs: "100%",
                sm: "auto",
              },
            }}
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={loading}
            sx={{
              width: {
                xs: "100%",
                sm: "auto",
              },
            }}
          >
            {loading ? "Creating..." : "Create Subjects"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default Cources;