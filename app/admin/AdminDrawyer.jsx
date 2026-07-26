import { Menu } from "@mui/icons-material";
import { Box, Button, Drawer, IconButton, Typography } from "@mui/material";

const AdminDrawyer = ({ drawerOpen, adminView, setAdminView, setDrawerOpen }) => {
    const handleClick = () => { setDrawerOpen(false) }
    return (<>
        <Drawer variant="permanent" open={drawerOpen} sx={{ width: 220 }}>
            <Box display='flex' padding={2} alignItems='center' justifyContent='space-between'>
                <Typography fontWeight='bold'>Admin Panel</Typography>
                <IconButton
                    onClick={handleClick}
                    color="inherit"
                >
                    <Menu />
                </IconButton>
            </Box>

            <Box sx={{ width: 220, p: 2 }}>
                <Button fullWidth variant={adminView === "users" ? "contained" : "text"} onClick={() => setAdminView("users")} sx={{ mb: 1 }}>
                    Manage Users
                </Button>
                <Button fullWidth variant={adminView === "classes" ? "contained" : "text"} onClick={() => setAdminView("classes")}>
                    Manage Classes
                </Button>

                <Button fullWidth variant={adminView === "teachers" ? "contained" : "text"} onClick={() => setAdminView("teachers")}>
                    Manage Teachers
                </Button>
            </Box>
        </Drawer>
    </>);
}
export default AdminDrawyer;