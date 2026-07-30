'use client';

import { KeyboardArrowRight } from "@mui/icons-material";
import {
  Avatar,
  Box,
  CircularProgress,
  IconButton,
  Typography,
} from "@mui/material";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { fetchClasses } from "@/redux/features/classSlice";

const ExploreCources = () => {
  const dispatch = useDispatch();
  const { classSlug } = useParams();

  const [loading, setLoading] = useState(true);
  const [classDetails, setClassDetails] = useState(null);

  useEffect(() => {
    if (!classSlug) return;

    const loadData = async () => {
      setLoading(true);

      try {
        // Wait for redux data
        await dispatch(fetchClasses());

        // Wait for class details
        const res = await fetch(`/api/classes/${classSlug}`);

        if (!res.ok) {
          throw new Error("Failed to fetch class details");
        }

        const result = await res.json();

        if (!result.success || !result.data) {
          throw new Error("Class not found");
        }

        setClassDetails(result.data);
      } catch (err) {
        console.error(err);
        setClassDetails(null);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [dispatch, classSlug]);

  // Full-page loader
  if (loading) {
    return (
      <Box
        sx={{
          width: "100%",
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          gap: 2,
        }}
      >
        <CircularProgress size={45} />
        <Typography>Loading class details...</Typography>
      </Box>
    );
  }

  // API failed
  if (!classDetails) {
    return (
      <Box
        sx={{
          width: "100%",
          height: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Typography color="error">
          Unable to load class details.
        </Typography>
      </Box>
    );
  }

  return (
    <Box display="flex" mt={4} width="100%">
      <Box px={3} display="flex" width="100%" flexDirection="column">
        <Typography fontWeight="bold" fontSize={24}>
          Explore Courses
        </Typography>

        <Box
          display="flex"
          width="100%"
          mt={4}
          flexDirection="column"
        >
          <Box
            component={Link}
            href={`/courses/${classSlug}/home`}
            display="flex"
            position="relative"
            p={3}
            borderRadius={3}
            height={100}
            alignItems="center"
            width="70%"
            boxShadow={2}
          >
            <Avatar sx={{ mx: 2, width: 50, height: 50 }} />

            <Typography fontWeight="bold">
              Explore Class {classDetails.className} courses
            </Typography>

            <Box
              sx={{
                position: "absolute",
                right: 10,
                top: "50%",
                transform: "translateY(-50%)",
              }}
            >
              <IconButton>
                <KeyboardArrowRight />
              </IconButton>
            </Box>
          </Box>

          <Box
            mt={3}
            component={Link}
            href={`/courses/${classSlug}/ChooseClass`}
            display="flex"
            position="relative"
            p={3}
            borderRadius={3}
            height={100}
            alignItems="center"
            width="70%"
            boxShadow={2}
          >
            <Avatar sx={{ mx: 2, width: 50, height: 50 }} />

            <Typography fontWeight="bold">
              Explore Class 1 to Class 12 courses
            </Typography>

            <Box
              sx={{
                position: "absolute",
                right: 10,
                top: "50%",
                transform: "translateY(-50%)",
              }}
            >
              <IconButton>
                <KeyboardArrowRight />
              </IconButton>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default ExploreCources;