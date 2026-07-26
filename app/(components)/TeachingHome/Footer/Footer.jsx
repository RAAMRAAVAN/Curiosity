import { Mail } from "@mui/icons-material"
import { Box, Button, Grid, Typography } from "@mui/material"

const Footer = ({openSignup, setOpenSignup}) => {
    return (<>
        <Box position='relative' display='flex'>
            <Box display='flex' width='100%' justifyContent='center' marginTop={5} position='relative'  zIndex={1}>
                <Box display='flex' flexDirection='column' padding={3} width='65%' sx={{ background: 'radial-gradient(120% 100% at 80% 0%, #0a4378, #062f53 45%, #041f38);' }} borderRadius={5}>

                    <Typography fontWeight='bold' color="white" fontSize={34} textAlign='center'>All you need for your next exam,
                        get it in your pocket now</Typography>

                    <Typography color="white" textAlign='center' marginTop={2} fontSize={20}>Trusted by 3.2 Crore+ students</Typography>
                    <Box display='flex' justifyContent='center' marginTop={3}>
                        <Button variant="contained" sx={{ color: 'white', backgroundColor: '#FF6A00', paddingX: '70px', borderRadius: 3 }} onClick={() => setOpenSignup(true)}>Signup for free</Button>
                    </Box>
                </Box>

            </Box>

            <Box display='flex' width='100%' height={300} backgroundColor='#E9F1FC' padding={5} position='absolute' top='80%' zIndex={0}>
                <Grid container paddingX={4} marginTop={5} paddingBottom={4}>
                    <Grid item xs={3} display='flex' flexDirection='column' width='100%' height='100%'>
                        <Typography fontSize={34} fontWeight='bold'>Curiosity</Typography>
                        <Typography marginTop={3}>Curiosity stands for Education Revolution.Made with Love ❤️</Typography>
                    </Grid>

                    <Grid item xs={3} display='flex' flexDirection='column' width='100%' height='100%'>
                        <Typography fontWeight='bold'>Company</Typography>
                        <Typography color="gray" fontSize={14} sx={{ ":hover": { cursor: 'pointer' } }} marginTop={1}>About Us</Typography>
                        <Typography color="gray" fontSize={14} sx={{ ":hover": { cursor: 'pointer' } }} marginTop={1}>View All Courses</Typography>
                        <Typography color="gray" fontSize={14} sx={{ ":hover": { cursor: 'pointer' } }} marginTop={1}>FAQs</Typography>
                        <Typography color="gray" fontSize={14} sx={{ ":hover": { cursor: 'pointer' } }} marginTop={1}>Pricing</Typography>
                        <Typography color="gray" fontSize={14} sx={{ ":hover": { cursor: 'pointer' } }} marginTop={1}>Curiosity Blogs</Typography>
                    </Grid>

                    <Grid item xs={3} display='flex' flexDirection='column' width='100%' height='100%'>
                        <Typography fontWeight='bold'>Quick Links</Typography>
                        <Typography color="gray" fontSize={14} sx={{ ":hover": { cursor: 'pointer' } }} marginTop={1}>Curiosity Infinity</Typography>
                        <Typography color="gray" fontSize={14} sx={{ ":hover": { cursor: 'pointer' } }} marginTop={1}>Careers</Typography>
                        <Typography color="gray" fontSize={14} sx={{ ":hover": { cursor: 'pointer' } }} marginTop={1}>Feedback</Typography>
                        <Typography color="gray" fontSize={14} sx={{ ":hover": { cursor: 'pointer' } }} marginTop={1}>We're Hiring</Typography>
                    </Grid>
                    <Grid item xs={3} display='flex' flexDirection='column' width='100%' height='100%'>

                        <Typography fontWeight='bold'>Contact Us</Typography>
                        <Typography color="gray" fontSize={14} sx={{ ":hover": { cursor: 'pointer' } }} marginTop={1}>Help Center</Typography>
                        <Typography color="gray" fontSize={14} sx={{ ":hover": { cursor: 'pointer' } }} marginTop={1}><Mail sx={{ marginRight: 1 }} />support@Curiosity.in</Typography>

                    </Grid>
                </Grid>
            </Box>
        </Box>
    </>)
}
export default Footer