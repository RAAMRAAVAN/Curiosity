"use client";

import { ArrowRightAlt } from "@mui/icons-material";
import { Box, Button, Grid, Typography } from "@mui/material";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchClasses, setDefaultClass} from "@/redux/features/classSlice";
import { buildClassSlug } from "@/lib/classSlug";

const AllSchoolExams = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const classes = useSelector((state) => state.classes.items || []);

  useEffect(() => {
    dispatch(fetchClasses());
  }, [dispatch]);

  const handleNavigation = (url) => {
    if (url.startsWith("http")) {
      window.open(url, "_blank");
    } else {
      router.push(url);
    }
  };

  // useEffect(() => {

  // }, [classes]);

  return (
    <>
      <Box display='flex' width='100%' alignItems='center' flexDirection='column' marginTop={5}>
        <Typography fontWeight='bold' textAlign='center' fontSize={{ xs: 24, sm: 28, md: 32, lg: 34 }}>
          Choose Your Class or Exam
        </Typography>
        <Typography color="gray" fontSize='20' paddingX={{ xs: 2, sm: 4, md: 6, lg: 8 }} textAlign='center' marginTop={1}>
          From videos to notes to tests, providing all you need to learn and practice in one place
        </Typography>
      </Box>
      <Box
        display="flex"
        width="100%"
        marginTop={5}
        flexDirection="column"
        alignItems="center"
      >
        <Box
          display="flex"
          width="85%"
          boxShadow={2}
          padding={{ xs: 0, sm: 0, md: 2, lg: 2 }}
          borderRadius={3}
          marginTop={3}
          flexDirection="column"
        >
          <Box display="flex" alignItems="center" paddingX={4}>
            <Image
              src="https://cn.edurev.in/cdn_lib/v13/lib/img/landingpage/updated_landingpage/webp_images/school_exam_boy.webp?w=240&dpr=1.5"
              alt="School Exams"
              width={150}
              height={100}
              style={{ objectFit: "cover" }}
              priority
            />

            <Typography
              fontSize={{ xs: 20, sm: 24, md: 28, lg: 32 }}
              marginLeft={2}
              fontWeight="bold"
            >
              All School Exams
            </Typography>
          </Box>

          <Box marginTop={4} paddingX={{ xs: 2, sm: 4, md: 6, lg: 8 }}>
            <Grid container spacing={2}>
              {classes.map((item) => (
                <Grid item lg={2.4} md={2.4} sm={4} xs={6} padding={1} key={item.id}>
                  <Button
                    fullWidth
                    onClick={() => {handleNavigation(`/courses/${buildClassSlug(item.className)}/home`); dispatch(setDefaultClass(item.className))}}
                    sx={{
                      boxShadow: "5px 5px 10px rgba(0,0,0,0.4)",
                      borderRadius: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-start",
                      paddingY: 1,
                      paddingX: 2,
                      color: "black",
                      textTransform: "none",
                    }}
                  >
                    <Image
                      src={item.icon || "/upsc.jpg"}
                      alt={item.className}
                      width={30}
                      height={40}
                      style={{ objectFit: "cover" }}
                      priority
                    />

                    <Typography ml={1}>
                      {item.className}
                    </Typography>
                  </Button>
                </Grid>
              ))}

              <Grid item lg={2.4} md={2.4} sm={4} xs={6} padding={1} marginBottom={2}>
                <Button
                  fullWidth
                  onClick={() => router.push("./courses/NA/ChooseClass/")}
                  sx={{
                    boxShadow: "5px 5px 10px rgba(0,0,0,0.4)",
                    borderRadius: 1,
                    height: 50,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "black",
                    textTransform: "none",
                  }}
                >
                  <Typography display="flex" alignItems="center">
                    Explore All <ArrowRightAlt sx={{ ml: 0.5 }} />
                  </Typography>
                </Button>
              </Grid>
            </Grid>
          </Box>
        </Box>
      </Box>
    </>
  );
};

export default AllSchoolExams;