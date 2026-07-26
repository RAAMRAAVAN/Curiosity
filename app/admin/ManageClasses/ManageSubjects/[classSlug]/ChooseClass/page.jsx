"use client";

import { KeyboardArrowRight } from "@mui/icons-material";
import {
  Avatar,
  Box,
  Grid,
  IconButton,
  Typography,
} from "@mui/material";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/navigation";

import {
  fetchClasses,
  setDefaultClass,
} from "@/redux/features/classSlice";

const ChooseClass = () => {
  const dispatch = useDispatch();
  const router = useRouter();

  const classes = useSelector((state) => state.classes.items || []);

  useEffect(() => {
    dispatch(fetchClasses());
  }, [dispatch]);

  const handleClassClick = (item) => {
    // Update Redux state
    dispatch(setDefaultClass(item.className));

    // Navigate
    router.push(`/admin/ManageClasses/ManageSubjects/${item.className.toLowerCase()}/home`);
  };

  return (
    <Box sx={{ display: "flex", mt: 4 }}>
      <Box sx={{ px: 3, display: "flex", width: "100%", flexDirection: "column" }}>
        <Typography fontWeight="bold" fontSize={24}>
          Choose Your Class
        </Typography>

        <Grid
          container
          spacing={2}
          sx={{
            mt: 4,
            justifyContent: "center",
          }}
        >
          {classes.map((item) => (
            <Grid item xs={12} sm={6} key={item.id}>
              <Box
                onClick={() => handleClassClick(item)}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  position: "relative",
                  p: 3,
                  borderRadius: 3,
                  height: 100,
                  boxShadow: 2,
                  cursor: "pointer",
                  transition: "0.2s",

                  "&:hover": {
                    boxShadow: 5,
                  },
                }}
              >
                <Avatar
                  src={item.icon || ""}
                  sx={{
                    mx: 2,
                    width: 50,
                    height: 50,
                  }}
                />

                <Typography fontWeight="bold">
                  {item.className} Courses
                </Typography>

                <IconButton
                  sx={{
                    position: "absolute",
                    right: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                  }}
                >
                  <KeyboardArrowRight />
                </IconButton>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Box>
  );
};

export default ChooseClass;