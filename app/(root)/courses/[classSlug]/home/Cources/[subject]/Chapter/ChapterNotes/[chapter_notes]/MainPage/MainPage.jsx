import { Box, Typography } from "@mui/material"

const MainPage = ({chapter,
          chapterName,
          chapterContents,
          contentCount}) => {
    return(<>
    <Box padding={2}>
        <Typography fontWeight='bold'>{chapterName || 'Chapter Name...'}</Typography>
    </Box>
    </>)
}
export default MainPage