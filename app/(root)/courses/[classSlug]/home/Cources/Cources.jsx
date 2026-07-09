'use client'

import { Box, Grid } from "@mui/material";
import CourseCard from "../../../class1/home/Cources/CourceCard";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import {
  getClassIdByName,
  selectDefaultClass,
} from "@/redux/features/classSlice";


const Cources = () => {

  const [subjects, setSubjects] = useState([]);


  // Get selected class name from Redux
  // Example: "1"
  const defaultClass = useSelector(selectDefaultClass);


  // // Convert class name to database class id
  // const classId = useSelector((state) =>
  //   getClassIdByName(state, defaultClass)
  // );


  // console.log("Default Class:", defaultClass);
  // console.log("Class ID:", classId);


  useEffect(() => {

    if (!defaultClass) return;


    const loadSubjects = async () => {

      try {
        console.log("Change Subject", defaultClass);

        const res = await fetch(
          `/api/subjects?className=${defaultClass}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );


        const result = await res.json();


        if (!res.ok || !result.success) {
          throw new Error(
            result.message || "Failed to fetch subjects"
          );
        }


        setSubjects(result.data || []);


      } catch (error) {

        console.error(
          "Failed to fetch subjects:",
          error.message
        );

      }

    };


    loadSubjects();


  }, [defaultClass]);


  return (

    <Box display="flex">

      <Grid container spacing={2}>

        {subjects.map((item) => (

          <Grid item xs={3} key={item.id}>

            <Box display="flex">

              <CourseCard
                image={item.icon || "/Courses/OIP.webp"}
                subject={item.subjectName}
                Class={defaultClass}
              />

            </Box>

          </Grid>

        ))}

      </Grid>

    </Box>

  );
};


export default Cources;