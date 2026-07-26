'use client'
import { ArrowRight, KeyboardArrowRight } from "@mui/icons-material";
import { Avatar, Box, IconButton, Typography } from "@mui/material";
import Link from "next/link";
import { useParams } from "next/navigation";

const ExploreCources = () => {
  const params = useParams();
  const classSlug = params?.classSlug;
  const classLabel = classSlug || "1";

  return (
    <Box display="flex" marginTop={4} width='100%'>
      <Box paddingX={3} display="flex" width="100%" flexDirection="column">
        <Typography fontWeight="bold" fontSize={24}>Explore Cources</Typography>
        <Box display="flex" width="100%" marginTop={4} justifyContent="center" alignItems="start" flexDirection="column" >
          <Box component={Link} href={`/admin/ManageClasses/ManageSubjects/${classSlug}/home`} display="flex" position="relative" padding={3} borderRadius={3} height={100} alignItems="center" width="70%" boxShadow={2}>
            <Avatar sx={{ marginX: 2, display: "flex", width: "50px", height: "50px" }} />
            <Typography fontWeight="bold">Explore Class {classLabel} courses</Typography>

            <Box sx={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)" }}>
              <IconButton>
                <KeyboardArrowRight />
              </IconButton>
            </Box>
          </Box>

          <Box marginTop={3} component={Link} href={`/admin/ManageClasses/ManageSubjects/${classSlug}/ChooseClass`} display="flex" position="relative" padding={3} borderRadius={3} height={100} alignItems="center" width="70%" boxShadow={2}>
            <Avatar sx={{ marginX: 2, display: "flex", width: "50px", height: "50px" }} />
            <Typography fontWeight="bold">Explore Class 1 to Class 12 courses</Typography>

            <Box sx={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)" }}>
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
