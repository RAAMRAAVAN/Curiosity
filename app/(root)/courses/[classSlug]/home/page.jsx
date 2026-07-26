'use client';

import { CheckCircleRounded } from "@mui/icons-material";
import { Box, Chip, Grid, Typography } from "@mui/material";
import { useParams } from "next/navigation";
import { useSelector } from "react-redux";
// import Cources from "./Cources/Cources";
import { selectAuthUser } from "@/redux/features/authSlice";
import Cources from "./Cources/Cources";
import {
  getClassIdByName,
  selectDefaultClass,
} from "@/redux/features/classSlice";
import { useEffect, useState } from "react";

const HomePage = () => {
  const user = useSelector(selectAuthUser);
  const defaultClass = useSelector(selectDefaultClass);
  const [classID, setClassID] = useState();

  // Convert class name to database class id
  const classId = useSelector((state) =>
    getClassIdByName(state, defaultClass)
  );
  const params = useParams();
  const classSlug = params?.classSlug;
  const classLabel = classSlug || "1";

  console.log("Class Label=", classLabel);
  const handleClick = () => { };

  // useEffect(()=>{
  //   let temp = useSelector((state) =>
  //   getClassIdByName(state, defaultClass)
  // );
  // setClassID(temp);
  // },[defaultClass])

  return (
    <Box display="flex" width="100%">
      <Box display="flex" paddingX={3} marginTop={5} flexDirection="column" width="100%">
        <Typography fontWeight="bold" fontSize={24}>Hi {user?.name || "User"}!</Typography>
        <Typography fontSize={15}>Let's get started for Class {classLabel} with Curiosity</Typography>



        <Box display="flex" width="100%" flexDirection="column">
          {/* <Grid container marginTop={2} marginBottom={5} display="flex" maxWidth="800px">
            <Grid item xs={2}><Box display="flex"><Chip label="All Cources" sx={{ display: "flex", width: "120px" }} borderRadius={3} variant="outlined" onClick={handleClick} /></Box></Grid>
            <Grid item xs={2}><Box display="flex"><Chip label="Main Subjects" sx={{ display: "flex", width: "120px" }} borderRadius={3} variant="outlined" onClick={handleClick} /></Box></Grid>
            <Grid item xs={2}><Box display="flex"><Chip label="Grammar" sx={{ display: "flex", width: "120px" }} borderRadius={3} variant="outlined" onClick={handleClick} /></Box></Grid>
            <Grid item xs={2}><Box display="flex"><Chip label="Skill Building" sx={{ display: "flex", width: "120px" }} borderRadius={3} variant="outlined" onClick={handleClick} /></Box></Grid>
            <Grid item xs={2}><Box display="flex"><Chip label="Practices" sx={{ display: "flex", width: "120px" }} borderRadius={3} variant="outlined" onClick={handleClick} /></Box></Grid>
            <Grid item xs={2}><Box display="flex"><Chip label="NCERT" sx={{ display: "flex", width: "120px" }} borderRadius={3} variant="outlined" onClick={handleClick} /></Box></Grid>
          </Grid> */}

          <Typography fontWeight="bold" fontSize={20} marginBottom={2}>Subjects</Typography>
          <Cources defaultClass={classLabel} />
        </Box>
      </Box>
    </Box>
  );
};

export default HomePage;
