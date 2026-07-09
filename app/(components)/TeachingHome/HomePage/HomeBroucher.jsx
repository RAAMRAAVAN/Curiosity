import { Apple, ArrowRightAlt, Shop } from "@mui/icons-material";
import { Box, Button, Grid, Typography } from "@mui/material";
import Image from "next/image";

const HomeBroucher = () => {
    return (<>
        <Box borderRadius={4} sx={{ width: "100%", height: "700px", position: "relative", display: 'flex', justifyContent: 'center' }}>
            <Image
                src="https://cn.edurev.in/cdn_lib/v13/lib/img/landingpage/updated_landingpage/hero_background.webp?w=1536&dpr=1.3"
                alt="Hero Image"
                fill
                style={{ objectFit: "cover" }}
                priority
            />

            <Box display='flex' width='100%' height='100%' position='absolute' justifyContent='space-between' marginTop={5} paddingX={5}>
                <Box display='flex' width='50%' color='white' flexDirection='column' alignItems='end'>
                    <Box display='flex' width='80%' flexDirection='column'>
                        <Box display='flex' width='100%' height='100px'></Box>
                        <Typography fontWeight='bold' fontSize={50}>
                            Study Smarter
                        </Typography>
                        <Typography fontWeight='bold' fontSize={50}>
                            Score Higher
                        </Typography>

                        <Box>
                            <Typography fontWeight="bold" marginTop={3}>Curiosity Education Revolution</Typography>

                            <Button
                                variant="contained"
                                sx={{
                                    backgroundColor: "#FF6A00",
                                    fontWeight: 700,
                                    fontSize: 16,
                                    textTransform: "none", // prevents ALL CAPS
                                    paddingY: 1,
                                    width: '80%',
                                    marginTop: 2,
                                    borderRadius: 2
                                }}
                            >
                                Start Learning for free <ArrowRightAlt />
                            </Button>
                        </Box>


                        <Box display='flex' alignItems='center' marginTop={1}>
                            <Typography fontWeight='bold'>Download App:</Typography>
                            <Shop sx={{ backgroundColor: 'white', color: 'black', borderRadius: '50%', margin: 2, padding: 1, fontSize: 50 }} />
                            <Apple sx={{ backgroundColor: 'white', color: 'black', borderRadius: '50%', margin: 1, padding: 1, fontSize: 50 }} />
                        </Box>
                    </Box>
                </Box>

                <Box display='flex' width='50%' color='white' flexDirection='column'>
                    <Image
                        src="https://cn.edurev.in/cdn_lib/v13/lib/img/landingpage/updated_landingpage/webp_images/hero_illustration_v2.webp?w=700&dpr=3.0"
                        alt="A Image"
                        width={850}
                        height={850}
                        style={{ objectFit: "cover" }}
                        priority
                    />
                </Box>

            </Box>

            <Box display='flex' bottom={-50} width='93%' height='180px' position='absolute' justifyContent='center' alignItems='center' borderRadius={5} backgroundColor='#E6EDF3'>
                <Box display='flex' backgroundColor='white' width='97%' height='80%' borderRadius={3}>
                    <Grid container>
                        <Grid item sm={3} borderRadius='1px black solid' sx={{ display: 'flex', width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', color: 'rgb(0, 57, 103)' }}>
                            <Box display='flex' alignItems='end' ><Typography fontWeight='bold' fontSize={35}>3.2</Typography><Typography marginLeft={1} marginBottom='5px' fontSize={23}>Crore +</Typography></Box>
                            <Typography>Students on Curiosity</Typography>
                        </Grid>
                        <Grid item sm={3} borderRadius='1px black solid' sx={{ display: 'flex', width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', color: 'rgb(0, 57, 103)' }}>
                            <Box display='flex' alignItems='end' ><Typography fontWeight='bold' fontSize={35}>4.7</Typography><Typography marginLeft={1} marginBottom='5px' fontSize={23}>/5</Typography></Box>
                            <Typography>150k+ ratings By Students</Typography>
                        </Grid>
                        <Grid item sm={3} borderRadius='1px black solid' sx={{ display: 'flex', width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', color: 'rgb(0, 57, 103)' }}>
                            <Box display='flex' alignItems='end'><Typography fontWeight='bold' fontSize={35}>55</Typography><Typography marginLeft={1} marginBottom='5px' fontSize={23}>Crore +</Typography></Box>
                            <Typography>Docs & Videos viewed</Typography>
                        </Grid>
                        <Grid item sm={3} borderRadius='1px black solid' sx={{ display: 'flex', width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', color: 'rgb(0, 57, 103)' }}>
                            <Box display='flex' alignItems='end' ><Typography fontWeight='bold' fontSize={35}>280</Typography><Typography marginLeft={1} marginBottom='5px' fontSize={23}>Crore +</Typography></Box>
                            <Typography>Students on Curiosity</Typography>
                        </Grid>
                    </Grid>
                </Box>
            </Box>
        </Box>
    </>);
}
export default HomeBroucher;