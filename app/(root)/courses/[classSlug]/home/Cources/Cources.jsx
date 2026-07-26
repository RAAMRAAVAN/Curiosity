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
import { useRouter } from "next/navigation";
import CourseCard from "./CourceCard";

const Cources = ({defaultClass}) => {
  const [subjects, setSubjects] = useState([]);
  const dispatch = useDispatch();

  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [newSubjects, setNewSubjects] = useState([
    {
      subjectName: "",
      file: null,
    },
  ]);

  // const defaultClass = useSelector(selectDefaultClass);

  const loadSubjects = async () => {
    try {
      const res = await fetch(
        `/api/subjects?className=${defaultClass}`
      );

      const result = await res.json();

      if (!result.success)
        throw new Error(result.message);

      setSubjects(result.data || []);
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    if (defaultClass) loadSubjects();
  }, [defaultClass]);

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

      formData.append("className", defaultClass);

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

        loadSubjects();
      }
    } catch (err) {
      console.log(err);
      alert("Failed to create subjects");
    } finally {
      setLoading(false);
    }
  };

  const handleSubjectClick = (subject) => {

    dispatch(
      setSelectedSubject(subject)
    );

    // router.push("./Cources/Subject");
    router.push(`./Cources/${subject.id}`);

  };

  return (
    <>
      <Box display="flex">
        <Grid container spacing={2}>
          {subjects.map((item) => (
            <Grid item xs={3} key={item.id}>
              <Box
                onClick={() =>
                  handleSubjectClick(item)
                }
                sx={{
                  cursor: "pointer",
                  width: "100%",
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

          {/* <Grid item xs={3}>
            <Box
              display="flex"
              flexDirection="column"
              boxShadow={2}
              width="100%"
              height="250px"
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
                <AddCircle sx={{ fontSize: 120 }} />
              </IconButton>

              <Typography
                fontWeight="bold"
                color="gray"
              >
                Add Subject
              </Typography>
            </Box>
          </Grid> */}
        </Grid>
      </Box>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          Create Subjects ({defaultClass})
        </DialogTitle>

        <DialogContent>
          {newSubjects.map((subject, index) => (
            <Box
              key={index}
              display="flex"
              gap={2}
              mt={2}
              alignItems="center"
            >
              <TextField
                fullWidth
                label="Subject Name"
                value={subject.subjectName}
                onChange={(e) =>
                  handleChange(
                    index,
                    "subjectName",
                    e.target.value
                  )
                }
              />

              <Box width={220}>
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
                      const file =
                        e.target.files?.[0];

                      if (!file) return;

                      if (
                        file.size >
                        200 * 1024
                      ) {
                        alert(
                          "Image size must be less than 200 KB."
                        );
                        e.target.value = "";
                        return;
                      }

                      handleChange(
                        index,
                        "file",
                        file
                      );
                    }}
                  />
                </Button>

                {subject.file && (
                  <Typography
                    mt={1}
                    fontSize={12}
                    color="text.secondary"
                    noWrap
                  >
                    {subject.file.name}
                  </Typography>
                )}
              </Box>

              <IconButton
                color="error"
                onClick={() =>
                  removeRow(index)
                }
                disabled={
                  newSubjects.length === 1
                }
              >
                <Delete />
              </IconButton>
            </Box>
          ))}

          <Button
            sx={{ mt: 3 }}
            variant="outlined"
            onClick={addRow}
          >
            + Add More Subject
          </Button>
        </DialogContent>

        <DialogActions>
          <Button
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading
              ? "Creating..."
              : "Create Subjects"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default Cources;