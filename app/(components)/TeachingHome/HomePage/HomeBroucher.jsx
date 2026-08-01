import { Apple, ArrowRightAlt, Shop } from "@mui/icons-material";
import { Box, Button, Grid, IconButton, Tooltip, Typography } from "@mui/material";
import Image from "next/image";
import { useRouter } from "next/navigation";
import ComingSoon from "../../ComingSoon";
import { useState } from "react";

const HomeBroucher = () => {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const handleClose = () => {
        setOpen(false);
    }
    return (<>
        <Box borderRadius={4} sx={{ width: "100%", height: "700px", position: "relative", display: 'flex', justifyContent: 'center' }}>
            <Image
                src="https://cn.edurev.in/cdn_lib/v13/lib/img/landingpage/updated_landingpage/hero_background.webp?w=1536&dpr=1.3"
                alt="Hero Image"
                fill
                style={{ objectFit: "cover" }}
                priority
            />

            <Box display='flex' width='100%' height='100%' position='absolute' justifyContent='space-between' paddingX={{
                xs: 0,
                sm: 0,
                md: 5,
            }}>
                <Box display='flex' width={{
                    xs: "100%",
                    sm: "100%",
                    md: "50%",
                    lg: "50%",
                    xl: "50%",
                }} color='white' flexDirection='column' alignItems='end'>
                    <Box display='flex' width='90%' flexDirection='column'>
                        <Box display='flex' width='100%' height='100px'></Box>
                        <Typography
                            fontWeight="bold"
                            sx={{
                                fontSize: {
                                    xs: "2rem",    // 32px
                                    sm: "2.8rem",  // 45px
                                    md: "3.5rem",  // 56px
                                    lg: "4rem",    // 64px
                                },
                                lineHeight: 1.1,
                            }}
                        >
                            Study Smarter
                        </Typography>

                        <Typography
                            fontWeight="bold"
                            sx={{
                                fontSize: {
                                    xs: "2rem",
                                    sm: "2.8rem",
                                    md: "3.5rem",
                                    lg: "4rem",
                                },
                                lineHeight: 1.1,
                            }}
                        >
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
                                onClick={() => { router.push(`./courses/NA/ChooseClass/`) }}
                            >
                                Start Learning for free <ArrowRightAlt />
                            </Button>
                        </Box>


                        <Box display="flex" alignItems="center" mt={2}>
                            <Typography fontWeight="bold" mr={2}>
                                Download App:
                            </Typography>

                            {/* Android */}
                            <Tooltip title="Download for Android">
                                <IconButton
                                    component="a"
                                    onClick={() => { setOpen(true) }}
                                    rel="noopener noreferrer"
                                    sx={{
                                        bgcolor: "white",
                                        color: "#34A853",
                                        boxShadow: 2,
                                        mr: 1.5,
                                        "&:hover": {
                                            bgcolor: "#f5f5f5",
                                            transform: "scale(1.08)",
                                        },
                                        transition: "all 0.2s ease",
                                    }}
                                >
                                    <Shop fontSize="large" />
                                </IconButton>
                            </Tooltip>

                            {/* iOS */}
                            <Tooltip title="Download for iPhone">
                                <IconButton
                                    component="a"
                                    onClick={() => { setOpen(true) }}
                                    rel="noopener noreferrer"
                                    sx={{
                                        bgcolor: "white",
                                        color: "black",
                                        boxShadow: 2,
                                        "&:hover": {
                                            bgcolor: "#f5f5f5",
                                            transform: "scale(1.08)",
                                        },
                                        transition: "all 0.2s ease",
                                    }}
                                >
                                    <Apple fontSize="large" />
                                </IconButton>
                            </Tooltip>
                        </Box>
                    </Box>
                </Box>

                <Box display='flex' width='50%' color='white' flexDirection='column' sx={{
                    position: "absolute",
                    bottom: {
                        xs: 150,
                        sm: 150,
                        md: 140,
                    },
                    right: {
                        xs: 0,
                        sm: 0,
                        md: 0,
                    }
                }}>
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

            <Box display='flex' top='78%' width='93%' border='10px solid #E6EDF3' position='absolute' justifyContent='center' alignItems='center' borderRadius={5} backgroundColor='white'>
                <Box display='flex' backgroundColor='white' width='97%' height='80%' borderRadius={3}>
                    <Grid container>
                        <Grid item lg={3} md={3}  sm={6} xs={6} borderRadius='1px black solid' sx={{ display: 'flex', width: '100%', height:'170px', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', color: 'rgb(0, 57, 103)' }}>
                            <Box display='flex' alignItems='end' ><Typography fontWeight='bold' fontSize={{ xs: 25, sm: 30, md: 35 }}>3.2</Typography><Typography marginLeft={1} marginBottom='5px' fontSize={{ xs: 16, sm: 23, md: 23 }}>Crore +</Typography></Box>
                            <Typography justifyContent='center' display='flex' align="center" fontSize={{xs:16, md: 17}}>Students on Curiosity</Typography>
                        </Grid>
                        <Grid item lg={3} md={3} sm={6} xs={6} borderRadius='1px black solid' sx={{ display: 'flex', width: '100%', height:'170px', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', color: 'rgb(0, 57, 103)' }}>
                            <Box display='flex' alignItems='end' ><Typography fontWeight='bold' fontSize={{ xs: 25, sm: 30, md: 35 }}>4.7</Typography><Typography marginLeft={1} marginBottom='5px' fontSize={{ xs: 16, sm: 23, md: 23 }}>/5</Typography></Box>
                            <Typography justifyContent='center' display='flex' align="center" fontSize={{xs:16, md: 17}}>150k+ ratings By Students</Typography>
                        </Grid>
                        <Grid item lg={3} md={3} sm={6} xs={6} borderRadius='1px black solid' sx={{ display: 'flex', width: '100%', height:'170px', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', color: 'rgb(0, 57, 103)' }}>
                            <Box display='flex' alignItems='end'><Typography fontWeight='bold' fontSize={{ xs: 25, sm: 30, md: 35 }}>55</Typography><Typography marginLeft={1} marginBottom='5px' fontSize={{ xs: 16, sm: 23, md: 23 }}>Crore +</Typography></Box>
                            <Typography justifyContent='center' display='flex' align="center" fontSize={{xs:16, md: 17}}>Docs & Videos viewed</Typography>
                        </Grid>
                        <Grid item lg={3} md={3} sm={6} xs={6} borderRadius='1px black solid' sx={{ display: 'flex', width: '100%', height:'170px', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', color: 'rgb(0, 57, 103)' }}>
                            <Box display='flex' alignItems='end' ><Typography fontWeight='bold' fontSize={{ xs: 25, sm: 30, md: 35 }}>280</Typography><Typography marginLeft={1} marginBottom='5px' fontSize={{ xs: 16, sm: 23, md: 23 }}>Crore +</Typography></Box>
                            <Typography justifyContent='center' display='flex' align="center" fontSize={{xs:16, md: 17}}>Students on Curiosity</Typography>
                        </Grid>
                    </Grid>
                </Box>
            </Box>
        </Box>
        <ComingSoon open={open} handleClose={handleClose} />
    </>);
}
export default HomeBroucher;