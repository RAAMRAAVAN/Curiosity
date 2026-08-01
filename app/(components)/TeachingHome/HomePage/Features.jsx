import { ArrowRightAlt } from "@mui/icons-material";
import { Box, Button, Grid, Typography } from "@mui/material";
import Image from "next/image";

const Features = () => {
    const loop = [{ courseName: "UPSC", logo: '/upsc.jpg', Url: "https://www.upsc.gov.in/" }, { courseName: "UPSC", logo: '/upsc.jpg', Url: "https://www.upsc.gov.in/" }, { courseName: "UPSC", logo: '/upsc.jpg', Url: "https://www.upsc.gov.in/" }, { courseName: "UPSC", logo: '/upsc.jpg', Url: "https://www.upsc.gov.in/" }, { courseName: "UPSC", logo: '/upsc.jpg', Url: "https://www.upsc.gov.in/" }, { courseName: "UPSC", logo: '/upsc.jpg', Url: "https://www.upsc.gov.in/" }, { courseName: "UPSC", logo: '/upsc.jpg', Url: "https://www.upsc.gov.in/" }, { courseName: "UPSC", logo: '/upsc.jpg', Url: "https://www.upsc.gov.in/" }, { courseName: "UPSC", logo: '/upsc.jpg', Url: "https://www.upsc.gov.in/" }, { courseName: "UPSC", logo: '/upsc.jpg', Url: "https://www.upsc.gov.in/" }, { courseName: "UPSC", logo: '/upsc.jpg', Url: "https://www.upsc.gov.in/" }, { courseName: "UPSC", logo: '/upsc.jpg', Url: "https://www.upsc.gov.in/" }, { courseName: "UPSC", logo: '/upsc.jpg', Url: "https://www.upsc.gov.in/" }, { courseName: "UPSC", logo: '/upsc.jpg', Url: "https://www.upsc.gov.in/" }, { courseName: "UPSC", logo: '/upsc.jpg', Url: "https://www.upsc.gov.in/" }, { courseName: "UPSC", logo: '/upsc.jpg', Url: "https://www.upsc.gov.in/" }, { courseName: "UPSC", logo: '/upsc.jpg', Url: "https://www.upsc.gov.in/" }, { courseName: "UPSC", logo: '/upsc.jpg', Url: "https://www.upsc.gov.in/" }, { courseName: "UPSC", logo: '/upsc.jpg', Url: "https://www.upsc.gov.in/" }, { courseName: "UPSC", logo: '/upsc.jpg', Url: "https://www.upsc.gov.in/" }, { courseName: "UPSC", logo: '/upsc.jpg', Url: "https://www.upsc.gov.in/" }, { courseName: "UPSC", logo: '/upsc.jpg', Url: "https://www.upsc.gov.in/" }, { courseName: "UPSC", logo: '/upsc.jpg', Url: "https://www.upsc.gov.in/" }, { courseName: "UPSC", logo: '/upsc.jpg', Url: "https://www.upsc.gov.in/" }];
    return (<>
        <Box display='flex' width='100%' marginTop={5} flexDirection='column' alignItems='center'>
            <Box display='flex' width='100%' alignItems='center' flexDirection='column'>
                <Typography fontWeight='bold' textAlign='center' fontSize={{ xs: 24, sm: 28, md: 32, lg: 34 }}>
                    Everything you need for your Exam at one place
                </Typography>
                <Typography color="gray" fontSize='20' paddingX={{ xs: 2, sm: 4, md: 6, lg: 8 }} textAlign='center' marginTop={1}>
                    Designed to help you learn faster, stay confident and be 100% exam ready.
                </Typography>
            </Box>


            <Box display='flex' width='100%' justifyContent='center' padding={2} borderRadius={3} marginTop={3} flexDirection='column'>
                <Grid container width='100%' display='flex' justifyContent='space-between' alignItems='center'>
                    <Grid item container lg={7} md={7} sm={12} xs={12} padding={{ xs: 1, md: 3, lg: 3 }} >
                        <Grid item lg={12} md={12} sm={12} xs={12} display='flex' borderRadius={4} boxShadow={2} justifyContent='space-between' sx={{
                            background: 'linear-gradient(to right, #ff9a1f,#f97316)', flexDirection: {
                                xs: 'column',
                                sm: 'column',
                                md: 'row',
                                lg: 'row',
                            },
                        }}>
                            <Box display='flex' width='100%' padding={3} flexDirection='column' >
                                <Typography fontWeight='bold' fontSize={{ xs: 20, sm: 24, md: 28, lg: 32 }} color="white">Exam-Focused Smart Notes</Typography>
                                <Typography color="white" fontSize={14}>Study concise notes with relevant content to help you prepare for exams in the best way</Typography>
                            </Box>
                            <Box display='flex' width='100%'>
                                <Image src='https://cn.edurev.in/cdn_lib/v13/lib/img/landingpage/updated_landingpage/card-1.webp?w=240&dpr=1.5'
                                    alt="Exam-Focused Smart Notes"
                                    width={300}
                                    height={40}
                                    style={{ objectFit: "cover" }}
                                    priority />

                            </Box>
                        </Grid>

                        <Grid item lg={12} md={12} sm={12} xs={12} container marginTop={2} display='flex' justifyContent='space-between'>
                            <Grid item lg={6.5} md={6.5} sm={12} xs={12} borderRadius={4} boxShadow={2} marginRight={{ xs: 0, sm: 0, md: 2, lg: 3 }} marginBottom={{ xs: 2, sm: 2, md: 0, lg: 0 }} padding={3}>
                                <Typography fontWeight='bold' fontSize={24}>Flashcards</Typography>
                                <Typography fontSize={14} marginTop={1}>Flip. Recall. Repeat. Revise Important concepts in minutes</Typography>
                                <Box display='flex' width='100%' justifyContent='center' marginTop={1}>
                                    <Image src='https://cn.edurev.in/cdn_lib/v13/lib/img/landingpage/updated_landingpage/card-3.webp?dpr=1.0&q=70&w=360'
                                        alt="Flashcards"
                                        width={200}
                                        height={20}
                                        style={{ objectFit: "cover" }}
                                        priority />
                                </Box>
                            </Grid>

                            <Grid item lg={5} md={5} sm={12} xs={12} padding={3} borderRadius={4} boxShadow={2} sx={{ background: 'linear-gradient(to right, #ff9a1f,#f97316)' }}>
                                <Typography fontWeight='bold' fontSize={24} color="white">Structured Courses</Typography>
                                <Typography fontSize={14} marginTop={1} color="white">With 1000+ curated courses follow the right order. Always know what's next.</Typography>
                                <Box display='flex' width='100%' justifyContent='center' marginTop={1}>
                                    <Image src='https://cn.edurev.in/cdn_lib/v13/lib/img/landingpage/updated_landingpage/card-2.webp?dpr=1.0&q=70&w=300'
                                        alt="Structured Courses"
                                        width={200}
                                        height={20}
                                        style={{ objectFit: "cover" }}
                                        priority />
                                </Box>
                            </Grid>
                        </Grid>
                    </Grid>

                    <Grid item lg={5} md={5} sm={12} xs={12} padding={1} >
                        <Grid item lg={12} md={12} sm={12} xs={12} padding={{xs:2, sm:2, md:3, lg:3}} display='flex' borderRadius={4} boxShadow={2} flexDirection='column'>
                            <Box display='flex' width='100%' justifyContent='space-between' marginTop={1} >
                                <Image src='https://cn.edurev.in/cdn_lib/v13/lib/img/landingpage/updated_landingpage/card-4b.webp?dpr=1.0&q=70&w=480'
                                    alt='Video Lectures'
                                    width={175}
                                    height={15}
                                    style={{ objectFit: "cover" }}
                                    priority />
                                <Image src='https://cn.edurev.in/cdn_lib/v13/lib/img/landingpage/updated_landingpage/card-4a.webp?dpr=1.0&q=70&w=480'
                                    alt='Video Lectures'
                                    width={160}
                                    height={20}
                                    style={{ objectFit: "cover" }}
                                    priority />
                            </Box>
                            <Typography fontWeight='bold' fontSize={24} marginTop={3}>Video Lectures</Typography>
                            <Typography fontSize={14} marginTop={1}>Learn with carefully selected 100K+ videos & 250K+ notes to clear all your concepts.</Typography>

                        </Grid>

                        <Grid padding={3} item lg={12} md={12} sm={12} xs={12} container marginTop={5} display='flex' height={250} justifyContent='space-between' borderRadius={4} boxShadow={2}>
                            <Box display='flex' width='100%' justifyContent='end' marginTop={1} >
                                <Image src='https://cn.edurev.in/cdn_lib/v13/lib/img/landingpage/updated_landingpage/card-5b.webp?dpr=1.0&q=70&w=480'
                                    alt='Video Lectures'
                                    width={150}
                                    height={20}
                                    style={{ objectFit: "cover" }}
                                    priority />
                                <Image src='https://cn.edurev.in/cdn_lib/v13/lib/img/landingpage/updated_landingpage/card-5a.webp?dpr=1.0&q=70&w=480'
                                    alt='Video Lectures'
                                    width={100}
                                    height={20}
                                    style={{ objectFit: "cover" }}
                                    priority />
                            </Box>
                            <Typography fontWeight='bold' fontSize={24}>Test Insights</Typography>
                            <Typography fontSize={14} marginTop={1}>See exactly why you lost marks and what to improve in your next session.</Typography>
                        </Grid>
                    </Grid>
                </Grid>
            </Box>
        </Box>
    </>);
}
export default Features;