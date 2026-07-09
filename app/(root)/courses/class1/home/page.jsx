'use client'
import { CheckCircleRounded } from "@mui/icons-material";
import { Box, Chip, Grid, Typography } from "@mui/material";
import { useEffect } from "react";
import { useSelector } from "react-redux";
import Cources from "./Cources/Cources";
import { selectAuthUser } from "@/redux/features/authSlice";

const HomePage = () => {
    const user = useSelector(selectAuthUser);
    const Class = 1;
    const handleClick = () => {
        
    }

    useEffect(()=>{
        
    },[])
    return (<>
        <Box display='flex' width='100%'>
            <Box display='flex' paddingX={3} marginTop={5} flexDirection='column' width='100%'>
                <Typography fontWeight='bold' fontSize={24}>Hi {user?.name || 'User'}!</Typography>
                <Typography fontSize={15}>Let's get started for Class {Class} with Curiosity</Typography>

                <Box display='flex' width='100%'>
                    <Grid container marginTop={4} marginBottom={5}>
                        <Grid item xs={2}>
                            <Box display='flex' flexDirection='column' sx={{ ":hover": { cursor: 'pointer' } }} border='2px gray solid' borderRadius={3} padding={2} width='100%'>
                                <Box display='flex' alignItems='center'><CheckCircleRounded boxShadow={4} sx={{ color: 'green', marginRight: 1 }} /><Typography fontSize={16} fontWeight='bold'>Explore</Typography></Box>
                                <Typography fontSize={13} noWrap marginTop={1}>Discover Courses</Typography>
                            </Box>
                        </Grid>
                        <Grid
                            item
                            xs={1}
                            display="flex"
                            justifyContent="center"
                            alignItems="center"
                            paddingX={1}
                        >
                            <Box
                                sx={{
                                    width: "100%",
                                    height: "2px",
                                    background: `repeating-linear-gradient(
                                    to right,
                                    gray 0px,
                                    gray 11px,
                                    transparent 11px,
                                    transparent 17px
                                )`,
                                }}
                            />
                        </Grid>

                        <Grid item xs={2}>
                            <Box display='flex' flexDirection='column' sx={{ ":hover": { cursor: 'pointer' } }} border='2px gray solid' borderRadius={3} padding={2} width='100%'>
                                <Box display='flex' alignItems='center'><CheckCircleRounded boxShadow={4} sx={{ color: 'green', marginRight: 1 }} /><Typography fontSize={16} fontWeight='bold'>Video/ Doc</Typography></Box>
                                <Typography
                                    noWrap marginTop={1}
                                    fontSize={13}
                                >
                                    View Documents & Videos
                                </Typography>
                            </Box>
                        </Grid>

                        <Grid
                            item
                            xs={1}
                            display="flex"
                            justifyContent="center"
                            alignItems="center"
                            paddingX={1}
                        >
                            <Box
                                sx={{
                                    width: "100%",
                                    height: "2px",
                                    background: `repeating-linear-gradient(
                                    to right,
                                    gray 0px,
                                    gray 11px,
                                    transparent 11px,
                                    transparent 17px
                                )`,
                                }}
                            />
                        </Grid>

                        <Grid item xs={2}>
                            <Box display='flex' flexDirection='column' sx={{ ":hover": { cursor: 'pointer' } }} border='2px gray solid' borderRadius={3} padding={2} width='100%'>
                                <Box display='flex' alignItems='center'><CheckCircleRounded boxShadow={4} sx={{ color: 'green', marginRight: 1 }} /><Typography fontSize={16} fontWeight='bold'>Class {Class}</Typography></Box>
                                <Typography fontSize={13} noWrap marginTop={1}>What all do you get in</Typography>
                            </Box>
                        </Grid>

                        <Grid
                            item
                            xs={1}
                            display="flex"
                            justifyContent="center"
                            alignItems="center"
                            paddingX={1}
                        >
                            <Box
                                sx={{
                                    width: "100%",
                                    height: "2px",
                                    background: `repeating-linear-gradient(
                                    to right,
                                    gray 0px,
                                    gray 11px,
                                    transparent 11px,
                                    transparent 17px
                                )`,
                                }}
                            />
                        </Grid>

                        <Grid item xs={2}>
                            <Box display='flex' flexDirection='column' sx={{ ":hover": { cursor: 'pointer' } }} border='2px gray solid' borderRadius={3} padding={2} width='100%'>
                                <Box display='flex' alignItems='center'><CheckCircleRounded boxShadow={4} sx={{ color: 'green', marginRight: 1 }} /><Typography fontSize={16} fontWeight='bold'>Offers</Typography></Box>
                                <Typography fontSize={13} noWrap marginTop={1}>Explore offers & Discounts</Typography>
                            </Box>
                        </Grid>
                    </Grid>
                </Box>

                <Typography fontWeight='bold' fontSize={20}>My Cources</Typography>

                <Box display='flex' width='100%' flexDirection='column'>
                    <Grid container marginTop={2} marginBottom={5} display='flex' maxWidth='800px'>
                        <Grid item xs={2}>
                            <Box display='flex'>
                                <Chip label="All Cources" sx={{display:'flex', width:'120px'}} borderRadius={3} variant="outlined" onClick={handleClick} />
                            </Box>
                        </Grid>
                        
                        <Grid item xs={2}>
                            <Box display='flex'>
                                <Chip label="Main Subjects" sx={{display:'flex', width:'120px'}} borderRadius={3} variant="outlined" onClick={handleClick} />
                            </Box>
                        </Grid>

                        <Grid item xs={2}>
                            <Box display='flex'>
                                <Chip label="Grammar" sx={{display:'flex', width:'120px'}} borderRadius={3} variant="outlined" onClick={handleClick} />
                            </Box>
                        </Grid>

                        <Grid item xs={2}>
                            <Box display='flex'>
                                <Chip label="Skill Building" sx={{display:'flex', width:'120px'}} borderRadius={3} variant="outlined" onClick={handleClick} />
                            </Box>
                        </Grid>

                        <Grid item xs={2}>
                            <Box display='flex'>
                                <Chip label="Practices" sx={{display:'flex', width:'120px'}} borderRadius={3} variant="outlined" onClick={handleClick} />
                            </Box>
                        </Grid>

                        <Grid item xs={2}>
                            <Box display='flex'>
                                <Chip label="NCERT" sx={{display:'flex', width:'120px'}} borderRadius={3} variant="outlined" onClick={handleClick} />
                            </Box>
                        </Grid>
                    </Grid>

                    <Cources/>
                </Box>
            </Box>
        </Box>
    </>);
}
export default HomePage