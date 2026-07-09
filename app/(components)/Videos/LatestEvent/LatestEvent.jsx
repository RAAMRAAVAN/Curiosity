'use client';

import { Box, IconButton, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ReactPlayer from "react-player";
import { useState, useEffect, useRef } from "react";
import { LatestVideos } from "@/lib/fetchData";

const LatestEvent = ({ open, setOpen, selectedVideo}) => {
    const [currentVideoIndex, setCurrentVideoIndex] = useState(0);

    const handleClose = () => {
        setOpen(false);
    };

    const handleVideoEnd = () => {
        setOpen(false);
    };

    return (
        <Box
            zIndex={10001}
            sx={{ pointerEvents: "none", display: open ? 'flex' : 'none', display: 'flex', border: '1px red solid' }}
        >
            <Box
                sx={{
                    pointerEvents: "auto",
                    position: "fixed",
                    top: 0,
                    left: 0,
                    width: "100vw",
                    height: "100vh",
                    bgcolor: "background.paper",
                    boxShadow: 24,
                    backgroundColor: 'rgba(255, 255, 255, 0.3)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    display: "flex",
                    justifyContent: 'center',
                    alignItems: 'center'
                }}
            >
                <Box display='flex' width='60%' >
                        {/* Make sure ReactPlayer re-renders by updating key */}
                        <VideoPlayer
                            key={1} // This will force the video to reset on change
                            url={selectedVideo.video || selectedVideo.link}
                            title={selectedVideo.name}
                            handleClose={handleClose}
                            onVideoEnd={handleVideoEnd}
                        />
                </Box>
            </Box>
        </Box>
    );
};

const VideoPlayer = ({ url, handleClose, title, onVideoEnd }) => {
    const [handlePlay, setHandlePlay] = useState(false);
    return (
        <Box sx={{ width: '100%' }}>
            <Box display='flex' width='100%' justifyContent='space-between'>
                <Typography marginLeft={1} fontSize="16px" gutterBottom color="white" fontWeight='bold' sx={{textShadow: '1px 1px 2px rgba(0,0,0,0.6)'}}>{title}</Typography>
                {/* Close Button */}
                <Box
                    sx={{
                        bgcolor: "background.paper",
                    }}
                >
                    <IconButton sx={{ padding: '0' }} onClick={()=>{handleClose();}}>
                        <CloseIcon />
                    </IconButton>
                </Box>
            </Box>
            <Box
                sx={{
                    position: 'relative',
                    paddingTop: '56.25%', // 16:9 aspect ratio
                    overflow: 'hidden',
                    boxShadow: 3,
                }}
            >
                <ReactPlayer
                    url={`https://accf-api.cancercareinstituteguwahati.org/storage/${url}`}
                    controls
                    playing={handlePlay}
                    // muted
                    onEnded={onVideoEnd}
                    width="100%"
                    height="100%"
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                    }}
                />
            </Box>
        </Box>
    );
};

export default LatestEvent;
