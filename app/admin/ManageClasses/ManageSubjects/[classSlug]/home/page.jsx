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
import { useEffect } from "react";
import { useDispatch } from "react-redux";

const HomePage = () => {
  const dispatch = useDispatch();
  const user = useSelector(selectAuthUser);
  const defaultClass = useSelector(selectDefaultClass);
  const params = useParams();
  const classSlug = params?.classSlug;
  const matchedClass = useSelector((state) => getClassByIdentifier(state, classSlug || defaultClass));
  const resolvedClassName = matchedClass?.className || defaultClass || classSlug || "1";

  useEffect(() => {
    dispatch(fetchClasses());
  }, [dispatch]);

  const handleClick = () => { };

  return (
    <Box display="flex" width="100%">
      <Box display="flex" paddingX={3} marginTop={5} flexDirection="column" width="100%">
        <Typography fontWeight="bold" fontSize={24}>Hi {user?.name || "User"}!</Typography>
        <Typography fontSize={15}>Let's get started for {resolvedClassName} with Curiosity</Typography>



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
          <Cources defaultClass={resolvedClassName} />
        </Box>
      </Box>
    </Box>
  );
};

export default HomePage;
