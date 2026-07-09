import { Box, CircularProgress } from "@mui/material";

const Loader = () => {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="10vh">
        <CircularProgress color="primary" />
      </Box>
    );
  };
export default Loader;