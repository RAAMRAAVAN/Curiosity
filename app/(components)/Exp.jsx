import { Box, Grid } from "@mui/material";

const Exp = () => {
    return (
        <>
            <Grid container height='350px'>
                <Grid item xs={2} border='1px red solid'>
                    <Box
                        display="flex"
                        width="100%"
                        height="100%"
                        //   border="1px black solid" 
                        sx={{
                            clipPath: "polygon(0% 0%, 20% 0%, 100% 100%, 0% 100%);",
                            backgroundColor: 'lightblue'
                        }}
                    />
                </Grid>

                <Grid item xs={3} border='1px red solid'>
                    <Box
                        display="flex"
                        width="100%"
                        height="100%"
                        //   border="1px black solid" 
                        sx={{
                            clipPath: "polygon(0% 0%, 40% 0%, 100% 100%, 60% 100%);",
                            backgroundColor: 'lightblue',
                            transform: "translateX(-10%)"
                        }}
                    />
                </Grid>
            </Grid>
        </>
    );
};

export default Exp;
