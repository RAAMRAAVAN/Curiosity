import { Alert, Box, Stack, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useEffect } from "react";

const ErrorMessage = ({ type, openError, setOpenError, message = "This is a filled error Alert." }) => {

    useEffect(() => {
        if (openError) {
            const timer = setTimeout(() => {
                setOpenError(false);
            }, 5000);

            return () => clearTimeout(timer); // Cleanup on unmount or prop change
        }
    }, [openError, setOpenError]);

    if (!openError) return null;

    return (
        <Box
            display="flex"
            width="100%"
            backgroundColor="transparent"
            justifyContent="flex-end"
            position="fixed"
            top={20}
            right={20}
            zIndex={1300}
        >
            <Stack sx={{ width: {xs: '90%', sm: '90%', md: '50%',lg: '30%'} }} spacing={2}>
                <Alert
                    variant="filled"
                    severity={type}
                    action={
                        <IconButton
                            aria-label="close"
                            color="inherit"
                            size="small"
                            onClick={() => setOpenError(false)}
                        >
                            <CloseIcon fontSize="inherit" />
                        </IconButton>
                    }
                >
                    {message}
                </Alert>
            </Stack>
        </Box>
    );
};

export default ErrorMessage;
