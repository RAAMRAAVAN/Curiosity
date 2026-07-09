import { Box, Typography } from "@mui/material";
import NewsLink from "./NewsLink"
import { Font } from "./Global";
const WhatsHappening = () => {
    return (<>
        <Box marginY={4} display='flex' width='100%' justifyContent='center'>
            <Box display='flex' width='90%' flexDirection='column'>
                <Typography  variant="h5" fontWeight="bold" marginY={2}>
                    Featured Stories
                </Typography>
                <NewsLink />
            </Box>
        </Box>
    </>)
}
export default WhatsHappening;