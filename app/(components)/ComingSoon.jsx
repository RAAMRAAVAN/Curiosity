import { Construction, Close } from "@mui/icons-material";
import {
  Box,
  Button,
  Fade,
  IconButton,
  Modal,
  Typography,
} from "@mui/material";

const style = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: {
    xs: "92%",
    sm: 500,
  },
  bgcolor: "rgba(255,255,255,0.95)",
  backdropFilter: "blur(20px)",
  borderRadius: 5,
  boxShadow: "0 25px 60px rgba(0,0,0,0.25)",
  overflow: "hidden",
};

const ComingSoon = ({ open, handleClose }) => {
  return (
    <Modal open={open} onClose={handleClose} closeAfterTransition>
      <Fade in={open}>
        <Box sx={style}>
          {/* Header */}
          <Box
            sx={{
              background:
                "linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #EC4899 100%)",
              color: "#fff",
              p: 3,
              position: "relative",
              textAlign: "center",
            }}
          >
            <IconButton
              onClick={handleClose}
              sx={{
                position: "absolute",
                top: 10,
                right: 10,
                color: "#fff",
              }}
            >
              <Close />
            </IconButton>

            <Box
              sx={{
                width: 90,
                height: 90,
                mx: "auto",
                borderRadius: "50%",
                bgcolor: "rgba(255,255,255,0.18)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                mb: 2,
              }}
            >
              <Construction sx={{ fontSize: 50 }} />
            </Box>

            <Typography variant="h4" fontWeight={700}>
              Coming Soon
            </Typography>
          </Box>

          {/* Content */}
          <Box p={4} textAlign="center">
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{
                lineHeight: 1.8,
                fontSize: 16,
              }}
            >
              🚧 This feature is currently under development.
              <br />
              We're working hard to make it available as soon as possible.
            </Typography>

            <Button
              variant="contained"
              fullWidth
              onClick={handleClose}
              sx={{
                mt: 4,
                py: 1.5,
                borderRadius: 3,
                textTransform: "none",
                fontWeight: 700,
                fontSize: 16,
                background:
                  "linear-gradient(90deg,#6366F1,#8B5CF6,#EC4899)",
                "&:hover": {
                  opacity: 0.9,
                },
              }}
            >
              Continue
            </Button>

            <Typography
              variant="caption"
              display="block"
              mt={2}
              color="text.secondary"
            >
              Thank you for your patience ❤️
            </Typography>
          </Box>
        </Box>
      </Fade>
    </Modal>
  );
}
export default ComingSoon