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

  const handleClick = () => { };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  return (
    <Box display="flex" width="100%">
      <Box display="flex" paddingX={3} marginTop={5} flexDirection="column" width="100%">
        <Typography fontWeight="bold" fontSize={24}>Hi {user?.name || "User"}!</Typography>
        <Typography fontSize={15}>Let's get started for {classDetails?.className} with Curiosity</Typography>



        <Box display="flex" width="100%" flexDirection="column">
          <Grid container marginTop={2} marginBottom={5} display="flex" maxWidth="800px">
            <Grid item xs={2}><Box display="flex"><Chip label="All Cources" sx={{ display: "flex", width: "120px" }} borderRadius={3} variant="outlined" onClick={handleClick} /></Box></Grid>
            <Grid item xs={2}><Box display="flex"><Chip label="Main Subjects" sx={{ display: "flex", width: "120px" }} borderRadius={3} variant="outlined" onClick={handleClick} /></Box></Grid>
            <Grid item xs={2}><Box display="flex"><Chip label="Grammar" sx={{ display: "flex", width: "120px" }} borderRadius={3} variant="outlined" onClick={handleClick} /></Box></Grid>
            <Grid item xs={2}><Box display="flex"><Chip label="Skill Building" sx={{ display: "flex", width: "120px" }} borderRadius={3} variant="outlined" onClick={handleClick} /></Box></Grid>
            <Grid item xs={2}><Box display="flex"><Chip label="Practices" sx={{ display: "flex", width: "120px" }} borderRadius={3} variant="outlined" onClick={handleClick} /></Box></Grid>
            <Grid item xs={2}><Box display="flex"><Chip label="NCERT" sx={{ display: "flex", width: "120px" }} borderRadius={3} variant="outlined" onClick={handleClick} /></Box></Grid>
          </Grid>

          <Typography fontWeight="bold" fontSize={20} marginBottom={2}>Subjects</Typography>
          <Cources defaultClass={classDetails?.id} />
        </Box>
      </Box>
    </Box>
  );
};

export default HomePage;
