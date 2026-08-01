import { Mail } from "@mui/icons-material"
import { Box, Button, Grid, Typography } from "@mui/material"

const Footer = ({openSignup, setOpenSignup}) => {
    return (<>
        <Box position='relative' display='flex' flexDirection='column' width='100%' marginTop={5} zIndex={1}>
            <Box display='flex' width='100%' justifyContent='center' marginTop={5} position='relative' bottom={-50}  zIndex={1}>
                <Box display='flex' flexDirection='column' padding={3}  sx={{ background: 'radial-gradient(120% 100% at 80% 0%, #0a4378, #062f53 45%, #041f38);', width:{ xs: '90%', sm: '80%', md: '65%', lg: '65%' } }} borderRadius={5}>

                    <Typography fontWeight='bold' color="white" fontSize={{ xs: 24, sm: 28, md: 32, lg: 34 }} textAlign='center'>All you need for your next exam,
                        get it in your pocket now</Typography>

                    <Typography color="white" textAlign='center' marginTop={2} fontSize={{ xs: 16, sm: 18, md: 20, lg: 20 }}>Trusted by 3.2 Crore+ students</Typography>
                    <Box display='flex' justifyContent='center' marginTop={3}>
                        <Button variant="contained" sx={{ color: 'white', backgroundColor: '#FF6A00', paddingX: '70px', borderRadius: 3 }} onClick={() => setOpenSignup(true)}>Signup for free</Button>
                    </Box>
                </Box>

            </Box>

            <Box display='flex' width='100%' border='1px black' backgroundColor='#E9F1FC' padding={5}>
                <Grid container paddingX={{lg:4, md:3, sm:2, xs:1}} marginTop={5} paddingBottom={4}>
                    <Grid item lg={3} md={6} sm={12} xs={12} display='flex' flexDirection='column' width='100%' marginBottom={2}>
                        <Typography fontSize={34} fontWeight='bold'>Curiosity</Typography>
                        <Typography marginTop={3}>Curiosity stands for Education Revolution.Made with Love ❤️</Typography>
                    </Grid>

                     <Grid item lg={3} md={6} sm={12} xs={6} display='flex' flexDirection='column' width='100%' marginBottom={2}>
                        <Typography fontWeight='bold'>Company</Typography>
                        <Typography color="gray" fontSize={14} sx={{ ":hover": { cursor: 'pointer' } }} marginTop={1}>About Us</Typography>
                        <Typography color="gray" fontSize={14} sx={{ ":hover": { cursor: 'pointer' } }} marginTop={1}>View All Courses</Typography>
                        <Typography color="gray" fontSize={14} sx={{ ":hover": { cursor: 'pointer' } }} marginTop={1}>FAQs</Typography>
                        <Typography color="gray" fontSize={14} sx={{ ":hover": { cursor: 'pointer' } }} marginTop={1}>Pricing</Typography>
                        <Typography color="gray" fontSize={14} sx={{ ":hover": { cursor: 'pointer' } }} marginTop={1}>Curiosity Blogs</Typography>
                    </Grid>

                    <Grid item lg={3} md={6} sm={12} xs={6} display='flex' flexDirection='column' width='100%' marginBottom={2}>
                        <Typography fontWeight='bold'>Quick Links</Typography>
                        <Typography color="gray" fontSize={14} sx={{ ":hover": { cursor: 'pointer' } }} marginTop={1}>Curiosity Infinity</Typography>
                        <Typography color="gray" fontSize={14} sx={{ ":hover": { cursor: 'pointer' } }} marginTop={1}>Careers</Typography>
                        <Typography color="gray" fontSize={14} sx={{ ":hover": { cursor: 'pointer' } }} marginTop={1}>Feedback</Typography>
                        <Typography color="gray" fontSize={14} sx={{ ":hover": { cursor: 'pointer' } }} marginTop={1}>We're Hiring</Typography>
                    </Grid>

                    
                    <Grid item lg={3} md={6} sm={12} xs={12} display='flex' flexDirection='column' width='100%' marginBottom={2}>

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