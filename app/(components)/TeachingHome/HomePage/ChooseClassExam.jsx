import { ArrowRightAlt } from "@mui/icons-material";
import { Box, Button, Grid, Typography } from "@mui/material";
import Image from "next/image";

const exams = [
  { id: 1, courseName: "UPSC", logo: "/upsc.jpg", url: "https://www.upsc.gov.in/" },
  { id: 2, courseName: "UPSC", logo: "/upsc.jpg", url: "https://www.upsc.gov.in/" },
  { id: 3, courseName: "UPSC", logo: "/upsc.jpg", url: "https://www.upsc.gov.in/" },
  { id: 4, courseName: "UPSC", logo: "/upsc.jpg", url: "https://www.upsc.gov.in/" },
  { id: 5, courseName: "UPSC", logo: "/upsc.jpg", url: "https://www.upsc.gov.in/" },
  { id: 6, courseName: "UPSC", logo: "/upsc.jpg", url: "https://www.upsc.gov.in/" },
  { id: 7, courseName: "UPSC", logo: "/upsc.jpg", url: "https://www.upsc.gov.in/" },
  { id: 8, courseName: "UPSC", logo: "/upsc.jpg", url: "https://www.upsc.gov.in/" },
  { id: 9, courseName: "UPSC", logo: "/upsc.jpg", url: "https://www.upsc.gov.in/" },
  { id: 10, courseName: "UPSC", logo: "/upsc.jpg", url: "https://www.upsc.gov.in/" },
  { id: 11, courseName: "UPSC", logo: "/upsc.jpg", url: "https://www.upsc.gov.in/" },
  { id: 12, courseName: "UPSC", logo: "/upsc.jpg", url: "https://www.upsc.gov.in/" },
  { id: 13, courseName: "UPSC", logo: "/upsc.jpg", url: "https://www.upsc.gov.in/" },
  { id: 14, courseName: "UPSC", logo: "/upsc.jpg", url: "https://www.upsc.gov.in/" },
  { id: 15, courseName: "UPSC", logo: "/upsc.jpg", url: "https://www.upsc.gov.in/" },
];

export default function ChooseClassExam() {
  return (
    <Box
      sx={{
        width: "100%",
        mt: 5,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <Box sx={{ textAlign: "center" }}>
        <Typography fontSize={34} fontWeight="bold">
          Choose Your Class or Exam
        </Typography>

        <Typography color="text.secondary" fontSize={20}>
          From videos to notes to tests, providing all you need to learn and
          practice in one place
        </Typography>
      </Box>

      <Box
        sx={{
          width: "85%",
          mt: 3,
          p: 2,
          borderRadius: 3,
          boxShadow: 2,
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            px: 4,
            gap: 2,
          }}
        >
          <Image
            src="https://cn.edurev.in/cdn_lib/v13/lib/img/landingpage/updated_landingpage/entrance_exam_girl.webp?w=300&dpr=1.5"
            alt="Entrance Exams"
            width={150}
            height={100}
            priority
          />

          <Typography fontSize={24} fontWeight="bold">
            50+ Entrance Exams
          </Typography>
        </Box>

        <Box sx={{ mt: 4, px: 4 }}>
          <Grid container spacing={2}>
            {exams.map((item) => (
              <Grid item xs={2} key={item.id}>
                <Button
                  fullWidth
                  sx={{
                    py: 1,
                    px: 2,
                    gap: 1,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    borderRadius: 1,
                    color: "black",
                    bgcolor: "white",
                    textTransform: "none",
                    boxShadow: "0 2px 10px rgba(0,0,0,.15)",

                    "&:hover": {
                      bgcolor: "#fafafa",
                      boxShadow: 4,
                    },
                  }}
                >
                  <Image
                    src={item.logo}
                    alt={item.courseName}
                    width={30}
                    height={40}
                  />

                  <Typography>{item.courseName}</Typography>
                </Button>
              </Grid>
            ))}

            <Grid item xs={2}>
              <Button
                fullWidth
                sx={{
                  height: 56,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 1,
                  textTransform: "none",
                  color: "black",
                  boxShadow: "0 2px 10px rgba(0,0,0,.15)",

                  "&:hover": {
                    boxShadow: 4,
                  },
                }}
              >
                Explore All
                <ArrowRightAlt sx={{ ml: 1 }} />
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Box>
    </Box>
  );
}