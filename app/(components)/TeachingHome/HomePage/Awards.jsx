import { Avatar, Box, Grid, Typography } from "@mui/material";

const Awards = () => {
    const AwardsData = [{ id: 1, Htext: "Personally recommended Curiosity to every UPSC aspirant. You will save time & effort.", Avtar1: "/static/images/avatar/1.jpg", Avatar2: "/static/images/avatar/1.jpg", Text1: "IRS Divey Sethi", Text2: "AIR 296 First-attempt", color1: "#1976D2", color2: "#87CEFA" },
    { id: 2, Htext: "Personally recommended Curiosity to every UPSC aspirant. You will save time & effort.", Avtar1: "/static/images/avatar/1.jpg", Avatar2: "/static/images/avatar/1.jpg", Text1: "IRS Divey Sethi", Text2: "AIR 296 First-attempt", color1: "#E91E63", color2: "#F8BBD0" },
    { id: 3, Htext: "Personally recommended Curiosity to every UPSC aspirant. You will save time & effort.", Avtar1: "/static/images/avatar/1.jpg", Avatar2: "/static/images/avatar/1.jpg", Text1: "IRS Divey Sethi", Text2: "AIR 296 First-attempt", color1: "#F57C00", color2: "#FFCC80" }]
    return (<>
        <Box display='flex' width='100%' marginTop={5} flexDirection='column' alignItems='center'>
            <Box display='flex' width='100%' alignItems='center' flexDirection='column'>
                <Typography fontWeight='bold' textAlign='center' fontSize={{ xs: 24, sm: 28, md: 32, lg: 34 }}>Awards & Mentions</Typography>
            </Box>

            <Box display='flex' width='100%' paddingX={5} marginTop={3}>
                <Grid container spacing={4}>
                    {AwardsData.map((item, index) => {
                        return (
                            <Grid item xs={12} sm={6} md={4} key={item.id}>
                                <Box display='flex' position='relative' padding={2} width='100%' justifyContent='space-between' height='200px' borderRadius={5} boxShadow={5} sx={{ background: `linear-gradient(to right, ${item.color1}, ${item.color2})` }}>
                                    <Box display='flex' width='100%' flexDirection='column' justifyContent='space-between'>
                                        <Typography fontWeight='bold' color="white" width='70%' fontSize={{ xs: 14, sm: 15, md: 16, lg: 16 }}>
                                            {item.Htext}
                                        </Typography>
                                        <Box display='flex' width='100%'>
                                            <Avatar
                                                alt="Remy Sharp"
                                                src={item.Avatar2}
                                                sx={{ width: 46, height: 46 }}
                                            />
                                            <Box marginLeft={2}>
                                                <Typography fontWeight='bold' color="white" >{item.Text1}</Typography>
                                                <Typography color="white" fontSize={10}>{item.Text2}</Typography>
                                            </Box>
                                        </Box>
                                    </Box>
                                    <Box display='flex' width='20%' position='absolute' right={10}>
                                        <Avatar
                                            alt="Remy Sharp"
                                            src={item.Avtar1}
                                            sx={{ width: 56, height: 56 }}
                                        />
                                    </Box>
                                </Box>
                            </Grid>
                        )
                    })}

                </Grid>
            </Box>
        </Box>
    </>);
}
export default Awards;