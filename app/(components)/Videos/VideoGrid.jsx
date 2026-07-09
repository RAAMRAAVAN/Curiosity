'use client';

import React, { useEffect, useState } from 'react';
import { Box, Grid, IconButton, Typography, useTheme } from '@mui/material';
import { LatestVideos } from '@/lib/fetchData';
import { PlayCircleOutline } from '@mui/icons-material';
import LatestEvent from './LatestEvent/LatestEvent';
import ReactPlayer from 'react-player';
import { LatestVideos2 } from '../../../lib/fetchData';
import ScrollReveal from '../Animation/ScrollReveal';

const videoUrlMain = "https://www.youtube.com/embed/xziy2MCp95U?si=iqrifFRxc0Tf2d-7";

const VideoCard = ({ LatestVideosData, setOpen, setSelectedVideo, id }) => {
  return (<Box
    // display={LatestVideosData[id] !== undefined?"flex": "none"}
    display='flex'
    width="100%"
    height='100%'
    sx={{
      overflow: 'hidden', // Ensures the image stays within the container
      borderRadius: '20px', // Keeps the image's rounded corners
      position: 'relative',
      // border:'1px black solid'
    }}
    boxShadow={5}
  >
    {/* <Box >     */}
    {LatestVideosData[id] === undefined ? <div style={{ width: '100%', height: '100px', overflow: 'hidden' }}>
    </div> : <img
      src={`https://accf-api.cancercareinstituteguwahati.org/storage/${LatestVideosData[id].photo}`}
      style={{
        borderRadius: '20px',
        display: 'flex',
        width: '100%',
        transition: 'transform 0.3s ease', // Smooth transition
      }}
      onMouseEnter={(e) => {
        // Zoom in effect when the mouse enters
        e.target.style.transform = 'scale(1.1)';
      }}
      onMouseLeave={(e) => {
        // Reset the scale when the mouse leaves
        e.target.style.transform = 'scale(1)';
      }}
    />}

    {/* </Box> */}

    {/* Play button with a click handler */}
    <IconButton
      sx={{
        color: 'white',
        fontSize: '60px',
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        cursor: 'pointer',
        // zIndex:'20001'
      }}
      disabled={LatestVideosData[id] === undefined}
      onClick={() => {
        setSelectedVideo(id);
        setOpen(true);
        // Add your play video logic here, e.g., open a modal, start playing, etc.
      }}
    >
      <PlayCircleOutline sx={{ fontSize: '60px', }} />
    </IconButton>
    {LatestVideosData[id] === undefined ? <></> : <Typography
      sx={{
        color: 'white',
        fontSize: '14px',
        fontWeight: 'bold',
        position: 'absolute',
        bottom: '10px',
        left: '50%',
        transform: 'translateX(-50%)',
        textAlign: 'center',
        overflow: 'hidden',
        display: '-webkit-box',
        WebkitLineClamp: 2, // LIMIT to 2 lines
        WebkitBoxOrient: 'vertical',
        textOverflow: 'ellipsis',
        width: '100%',
        padding: '5px 40px',
        textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)',
        background: '#1565c047'
      }}
    >
      {LatestVideosData[id].name}
    </Typography>}


  </Box>);
}
const VideoGrid = ({ LatestVideosData }) => {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);

  // const LatestVideosData2=6;
  const [size, setSize] = useState(1);
  const [custom_array, setCustomArray] = useState([1]);
  const value = 1;

  useEffect(() => {
    if (LatestVideosData.length > 5)
      setSize(Math.ceil(LatestVideosData.length / 5));
  }, [LatestVideosData.length])

  useEffect(() => {
    setCustomArray(Array.from({ length: size }).map((_, index) => value * (index + 1)));
  }, [size]);


  if (LatestVideosData.length > 0)
    return (
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 2,
          // backgroundColor: '#444',
          margin: '10px 0 20px 0',
          width: '100%',
        }}
      >
        {open ? <Box display="flex" width="100%" justifyContent="center" sx={{
          justifyContent: 'center',
          alignItems: 'center', border: '1px black solid'
        }}>
          <LatestEvent open={open} setOpen={setOpen} selectedVideo={LatestVideosData[selectedVideo]} />
        </Box> : <></>}
        <Grid container spacing={3}>
          {custom_array.map((value, index) => {
            return (
            <>
              <Grid item md={3} xs={12} container spacing={1}>
                <Grid item xs={12}>
                  <ScrollReveal animation="grow" timeout={1000}><VideoCard LatestVideosData={LatestVideosData} setOpen={setOpen} setSelectedVideo={setSelectedVideo} id={0 + index * 5} /></ScrollReveal>
                </Grid>
                <Grid item xs={12}>
                  <ScrollReveal animation="grow" timeout={1000}><VideoCard LatestVideosData={LatestVideosData} setOpen={setOpen} setSelectedVideo={setSelectedVideo} id={2 + index * 5} /></ScrollReveal>
                </Grid>
              </Grid>

              <Grid item md={6} xs={12} display='flex' alignItems='center'>
                <ScrollReveal animation="grow" timeout={1000}><VideoCard LatestVideosData={LatestVideosData} setOpen={setOpen} setSelectedVideo={setSelectedVideo} id={4 + index * 5} /></ScrollReveal>
              </Grid>

              <Grid item md={3} xs={12} container spacing={1}>
                <Grid item xs={12}>
                  <ScrollReveal animation="grow" timeout={1000}><VideoCard LatestVideosData={LatestVideosData} setOpen={setOpen} setSelectedVideo={setSelectedVideo} id={1 + index * 5} /></ScrollReveal>
                </Grid>
                <Grid item xs={12}>
                  <ScrollReveal animation="grow" timeout={1000}><VideoCard LatestVideosData={LatestVideosData} setOpen={setOpen} setSelectedVideo={setSelectedVideo} id={3 + index * 5} /></ScrollReveal>
                </Grid>
              </Grid>
            </>
            )
          })}
        </Grid>
      </Box>
    );
};

export default VideoGrid;
