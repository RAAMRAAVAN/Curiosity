"use client";

import { useEffect, useState } from "react";
import { Box, Button, Typography } from "@mui/material";
import { ArrowRightAlt } from "@mui/icons-material";

import ChooseClassExam from "./ChooseClassExam";
import HomeBroucher from "./HomeBroucher";
import AllSchoolExams from "./AllSchoolExams";
import Features from "./Features";
import Awards from "./Awards";
import Footer from "../Footer/Footer";
import { useDispatch, useSelector } from "react-redux";
import SignupModal from "@/app/(components)/MyProfile/SignupModal";
import {
    setAuthUser,
    clearAuthUser,
} from "@/redux/features/authSlice";
import { useRouter } from "next/navigation";

const HomePage = () => {
    const dispatch = useDispatch();
    const router = useRouter();

    const user = useSelector((state) => state.auth.user);
    const loggedIn = useSelector((state) => state.auth.loggedIn);
    const [openSignup, setOpenSignup] = useState(false);

    useEffect(() => {
        if (typeof window === "undefined") return;

        const auth = sessionStorage.getItem("authDetails");

        if (!auth) {
            dispatch(clearAuthUser());
            return;
        }

        try {
            const parsed = JSON.parse(auth);

            if (parsed.loggedIn && parsed.user) {
                dispatch(setAuthUser(parsed.user));
            } else {
                dispatch(clearAuthUser());
            }
        } catch (error) {
            dispatch(clearAuthUser());
        }
    }, [dispatch]);

    const handleLogout = () => {
        sessionStorage.removeItem("authDetails");
        dispatch(clearAuthUser());
        window.location.reload();
    };

    return (
        <>
            <HomeBroucher />

            <Box marginTop="70px" display="flex" justifyContent="center" alignItems="center">
                <Typography color="gray">
                    Trusted by Millions of Students
                </Typography>
            </Box>

            <AllSchoolExams />

            <Box display="flex" width="100%" justifyContent="center" mt={5}>
                {loggedIn ? (
                    <Button
                        variant="contained"
                        color="error"
                        sx={{ width: 250 }}
                        onClick={handleLogout}
                    >
                        Logout
                    </Button>
                ) : (
                    <Button
                        variant="contained"
                        sx={{
                            backgroundColor: "black",
                            color: "white",
                            width: 250,
                        }}
                        onClick={() => { router.push(`http://localhost:3000/courses/NA/ChooseClass/`) }}
                    >
                        Start learning for free
                    </Button>
                )}
            </Box>

            <Features />

            <Box display="flex" width="100%" justifyContent="center" mt={5}>
                {loggedIn ? (
                    <Button
                        variant="contained"
                        color="error"
                        sx={{ width: 250 }}
                        onClick={handleLogout}
                    >
                        Logout
                    </Button>
                ) : (
                    <Button
                        variant="contained"
                        sx={{
                            backgroundColor: "black",
                            color: "white",
                            width: 250,
                        }}
                        onClick={() => setOpenSignup(true)}
                    >
                        Sign up free
                    </Button>
                )}
            </Box>

            {/* <Awards /> */}
            <Footer openSignup={openSignup} setOpenSignup={setOpenSignup}/>

            <Box
                display="flex"
                py={2}
                px={5}
                justifyContent="space-between"
                alignItems="center"
                width="100%"
                height={60}
                bgcolor="#062f53"
                mt={30}
            >
                <Box mx={5} display="flex" alignItems="center">
                    <Box
                        bgcolor="white"
                        display="flex"
                        borderRadius={3}
                        p="5px"
                        mr={1}
                    >
                        <Typography>PR</Typography>
                    </Box>

                    <Typography color="white" fontWeight="bold" fontSize={20}>
                        Start learning for free today
                    </Typography>
                </Box>

                <Box mx={5}>
                    {loggedIn ? (
                        <Button
                            variant="contained"
                            color="error"
                            sx={{ px: 3, py: 1.2, borderRadius: 3 }}
                            onClick={handleLogout}
                        >
                            Logout
                        </Button>
                    ) : (
                        <Button
                            variant="contained"
                            sx={{
                                color: "white",
                                backgroundColor: "#FF6A00",
                                px: 3,
                                py: 1.2,
                                borderRadius: 3,
                            }}
                            onClick={() => setOpenSignup(true)}
                        >
                            Sign up <ArrowRightAlt />
                        </Button>
                    )}
                </Box>
            </Box>

            <SignupModal
                open={openSignup}
                onClose={() => setOpenSignup(false)}
                onLoginClick={() => {
                    setOpenSignup(false);
                    setOpenLogin(true);
                }}
            />
        </>
    );
};

export default HomePage;