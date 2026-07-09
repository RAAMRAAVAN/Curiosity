import { Box, Grid } from "@mui/material"
import CourseCard from "./CourceCard"

const Cources = () => {
    return(<>
    <Box display='flex'>
        <Grid container>
            <Grid item xs={3}>
                <Box display='flex' padding={2}><CourseCard image='/Courses/Science.avif' subject='Science' Class='1'/></Box>
            </Grid>

            <Grid item xs={3}>
                <Box display='flex' padding={2}><CourseCard image='/Courses/Maths.avif' subject='Maths' Class='1'/></Box>
            </Grid>

            <Grid item xs={3}>
                <Box display='flex' padding={2}><CourseCard image='/Courses/Social.avif' subject='Social Studies' Class='1'/></Box>
            </Grid>

            <Grid item xs={3}>
                <Box display='flex' padding={2}><CourseCard image='/Courses/English.avif' subject='English' Class='1'/></Box>
            </Grid>

            <Grid item xs={3}>
                <Box display='flex' padding={2}><CourseCard image='/Courses/Hindi.avif' subject='Hindi' Class='1'/></Box>
            </Grid>
        </Grid>
    </Box>
    </>)
}
export default Cources