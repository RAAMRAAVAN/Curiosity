import { Box, Button, Typography } from "@mui/material";
import ChooseClassExam from "./ChooseClassExam";
import HomeBroucher from "./HomeBroucher";
import AllSchoolExams from "./AllSchoolExams";
import Features from "./Features";
import Awards from "./Awards";
import Footer from "../Footer/Footer";
import { ArrowRightAlt } from "@mui/icons-material";

const HomePage = () => {
    return (<>
        <HomeBroucher />
        <Box marginTop='70px' display='flex' justifyContent='center' alignItems='center'>
            <Typography color="gray">Trusted by Millions of Students</Typography>
        </Box>
        <AllSchoolExams />
        {/* <ChooseClassExam /> */}
        <Box display='flex' width='100%' justifyContent='center' marginTop={5}>
            <Button variant="contained" sx={{ backgroundColor: 'black', color: 'white', width: '250px' }}>Start learning for free</Button>
        </Box>
        <Features />
        <Box display='flex' width='100%' justifyContent='center' marginTop={5}>
            <Button variant="contained" sx={{ backgroundColor: 'black', color: 'white', width: '250px' }}>Sign up free</Button>
        </Box>

        <Awards />
        <Footer />
        <Box display='flex' paddingY={2} alignItems='center' paddingX={5} justifyContent='space-between' width='100%' height={60} backgroundColor='#062f53' marginTop={30}>
            <Box marginX={5} display='flex' alignItems='center'><Box backgroundColor='white' display='flex' borderRadius={3} padding='5px' marginRight={1}><Typography>PR</Typography></Box><Typography color="white" fontWeight='bold' fontSize={20}>Start learning for free today</Typography></Box>
            <Box marginX={5}>
                <Button variant="contained" sx={{ color: 'white', backgroundColor: '#FF6A00', paddingX: '20px', paddingY: '10px', borderRadius: 3 }}>Sign up<ArrowRightAlt /></Button>
            </Box>
        </Box>
    </>);
}
export default HomePage;