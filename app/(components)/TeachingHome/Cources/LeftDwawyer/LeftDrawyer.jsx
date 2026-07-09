"use client";

import React from "react";
import Box from "@mui/material/Box";
import List from "@mui/material/List";
import Divider from "@mui/material/Divider";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import InboxIcon from "@mui/icons-material/MoveToInbox";
import MailIcon from "@mui/icons-material/Mail";
import Typography from "@mui/material/Typography";

const LeftSidebar = () => {
  const handleNavigation = (url) => {
    if (url.startsWith("http")) {
      window.open(url, "_blank");
    } else {
      router.push(url);
    }
  };
  return (
    <Box
      sx={{
        width: 260,
        height: "100vh",
        borderRight: "1px solid #e0e0e0",
        bgcolor: "#fff",
        position: "fixed", // Remove this if you don't want it fixed
        left: 0,
        top: 0,
      }}
    >
      <Box px={3} pt={3} pb={2}>
        <Typography fontWeight="bold" fontSize={24}>
          Curiosity
        </Typography>
      </Box>

      <List>
        {["Home", "Explore Courses", "My Unattempted Tests"].map(
          (text, index) => (
            <ListItem key={text} disablePadding>
              <ListItemButton>
                <ListItemIcon>
                  {index % 2 === 0 ? <InboxIcon /> : <MailIcon />}
                </ListItemIcon>
                <ListItemText
                  primary={text}
                  primaryTypographyProps={{ fontSize: 14 }}
                />
              </ListItemButton>
            </ListItem>
          )
        )}
      </List>

      <Divider />

      <List>
        {[
          "Pricing Plans",
          "Curiosity Store",
          "Emoney",
          "Upgrade to Infinity",
        ].map((text, index) => (
          <ListItem key={text} disablePadding>
            <ListItemButton>
              <ListItemIcon>
                {index % 2 === 0 ? <InboxIcon /> : <MailIcon />}
              </ListItemIcon>
              <ListItemText
                primary={text}
                primaryTypographyProps={{ fontSize: 14 }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );
};

export default LeftSidebar;