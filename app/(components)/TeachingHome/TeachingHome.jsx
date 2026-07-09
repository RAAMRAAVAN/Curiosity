import Image from "next/image";
import NavBar from "./NavBar/NavBar";
import { Box, Button, Grid, Grid2, Typography } from "@mui/material";
import { Apple, ArrowRightAlt, Shop, Store } from "@mui/icons-material";
import HomePage from "./HomePage/HomePage";

const TeachingHome = () => {
    return (
        <>
            <NavBar />
            <Box display='flex' width='100%' height='100%' flexDirection='column'>
                <HomePage />
            </Box>
        </>
    );
};

export default TeachingHome;