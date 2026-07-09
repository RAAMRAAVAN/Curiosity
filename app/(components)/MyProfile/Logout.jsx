"use client";

import * as React from "react";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import MenuIcon from "@mui/icons-material/Menu";
import IconButton from "@mui/material/IconButton";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { clearAuthUser } from "@/redux/features/authSlice";

const Logout = () => {
  const [anchorEl, setAnchorEl] = React.useState(null);
  const dispatch = useDispatch();
  const router = useRouter();

  const open = Boolean(anchorEl);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSubmit = async () => {
    try {
      const res = await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (res.ok) {
        dispatch(clearAuthUser());
        sessionStorage.removeItem("authDetails");
        sessionStorage.clear();
        router.push("/");
      } else {
        console.error("Logout failed:", res.status);
      }
    } catch (error) {
      console.error("Error occurred while submitting form:", error);
    }
  };

  return (
    <>
      <IconButton
        id="demo-positioned-button"
        aria-controls={open ? "demo-positioned-menu" : undefined}
        aria-haspopup="true"
        aria-expanded={open ? "true" : undefined}
        onClick={handleClick}
        color="inherit"
      >
        <MenuIcon />
      </IconButton>

      <Menu
        id="demo-positioned-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "left",
        }}
      >
        <MenuItem onClick={handleClose}>Profile</MenuItem>
        <MenuItem onClick={handleClose}>My Account</MenuItem>
        <MenuItem onClick={() => { handleClose(); handleSubmit(); }}>Logout</MenuItem>
      </Menu>
    </>
  );
};

export default Logout;
