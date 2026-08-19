'use client';

import { CheckCircleRounded } from "@mui/icons-material";
import { Box, Chip, Grid, Typography } from "@mui/material";
import { useParams } from "next/navigation";
import { useSelector } from "react-redux";
// import Cources from "./Cources/Cources";
import { selectAuthUser } from "@/redux/features/authSlice";
import Cources from "./Cources/Cources";
import {
  fetchClasses,
  getClassByIdentifier,
  selectDefaultClass,
} from "@/redux/features/classSlice";
import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import ComingSoon from "@/app/(components)/ComingSoon";

const HomePage = () => {
  const dispatch = useDispatch();
  const user = useSelector(selectAuthUser);
  const defaultClass = useSelector(selectDefaultClass);
  const params = useParams();
  const classSlug = params?.classSlug;
  const matchedClass = useSelector((state) => getClassByIdentifier(state, classSlug || defaultClass));
  const resolvedClassName = matchedClass?.className || defaultClass || classSlug || "1";
  const [loading, setLoading] = useState(false);
  const [classDetails, setClassDetails] = useState(null);
  const [open, setOpen] = useState(false);
  const handleClose = () => {
    setOpen(false);
  }

  const GetClassDetails = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/classes/${classSlug}`);
      const data = await res.json();
      setClassDetails(data.data);
    } catch (error) {
      console.error("Error fetching class details:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    dispatch(fetchClasses());
    GetClassDetails();
  }, [dispatch]);

  const handleClick = () => { 
    setOpen(true);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  return (
    <Box display="flex" width="100%">
      <Box display="flex" paddingX={{ xs: 0, sm: 1, md: 2, lg: 3 }} marginTop={5} flexDirection="column" width="100%">
        <Typography fontWeight="bold" fontSize={24}>Hi {user?.name || "User"}!</Typography>
        {/* <Typography fontSize={15}>Let's get started for {classDetails?.className} with Curiosity</Typography> */}



        <Box display="flex" width="100%" flexDirection="column">
          <Grid container marginTop={{ xs: 0, sm: 1, md: 2, lg: 2 }} marginBottom={{ xs: 1, sm: 2, md: 3, lg: 5 }} display="flex" maxWidth="800px" spacing={2}>
            <Grid item xs={2}><Box display="flex"><Chip label="All Cources" sx={{ display: "flex", width: "120px" }} borderRadius={3} variant="outlined" onClick={handleClick} /></Box></Grid>
            <Grid item xs={2}><Box display="flex"><Chip label="Main Subjects" sx={{ display: "flex", width: "120px" }} borderRadius={3} variant="outlined" onClick={handleClick} /></Box></Grid>
            <Grid item xs={2}><Box display="flex"><Chip label="Grammar" sx={{ display: "flex", width: "120px" }} borderRadius={3} variant="outlined" onClick={handleClick} /></Box></Grid>
            <Grid item xs={2}><Box display="flex"><Chip label="Skill Building" sx={{ display: "flex", width: "120px" }} borderRadius={3} variant="outlined" onClick={handleClick} /></Box></Grid>
            <Grid item xs={2}><Box display="flex"><Chip label="Practices" sx={{ display: "flex", width: "120px" }} borderRadius={3} variant="outlined" onClick={handleClick} /></Box></Grid>
            <Grid item xs={2}><Box display="flex"><Chip label="NCERT" sx={{ display: "flex", width: "120px" }} borderRadius={3} variant="outlined" onClick={handleClick} /></Box></Grid>
          </Grid>

          <Typography fontWeight="bold" fontSize={20} marginBottom={2}>Subjects</Typography>
          <Cources defaultClass={classDetails} />
        </Box>
      </Box>
      <ComingSoon open={open} handleClose={handleClose} />
    </Box>
  );
};

export default HomePage;
