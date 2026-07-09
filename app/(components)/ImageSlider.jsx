"use client";
import { Box, useMediaQuery, useTheme } from "@mui/material";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Autoplay, EffectFade } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "swiper/css/effect-fade";
import { memo } from "react";
import Image from "next/image";

const ImageSlider = ({ id, Images = [] }) => {
  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up("md"));

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        width: '100%',
        overflow: "hidden",
        boxShadow: "0 4px 10px rgba(0, 0, 0, 0.2)",
        position: "relative",
        // border:'1px black solid',
        borderRadius:'10px',
        "& .swiper-button-prev, & .swiper-button-next": {
          color: "#fff",
          zIndex: 10,
          display: isMdUp ? "block" : "none", // Hide nav buttons on small screens
        },
        // border:'1px black solid',
        "& .swiper-pagination": {
          bottom: "10px", // or adjust to '20px', '30px', etc. as needed
        },
        "& .swiper-pagination-bullet": {
          backgroundColor: "#fff", // Change this to your desired color
          opacity: 0.7,            // Optional: tweak for style
          borderRadius:0,
          width:'19px',
          height:'5px'
        },
        "& .swiper-pagination-bullet-active": {
          backgroundColor: "#1976d2", // Active bullet color (e.g., MUI primary)
          opacity: 1,                 // Make it fully visible
        },
      }}
    >
      <Swiper
        modules={[Navigation, Pagination, Autoplay, EffectFade]}
        effect="fade"
        spaceBetween={10}
        slidesPerView={1}
        autoplay={{ delay: 3000, disableOnInteraction: false }}
        speed={1000}
        pagination={{ clickable: true }}
        // navigation={isMdUp}
        style={{ width: "100%", height: "auto"}}
        navigation={{
          nextEl: ".swiper-button-next",
          prevEl: ".swiper-button-prev",
        }}
        // borderRadius={3}
      >
        {Images.length > 0 ? (
          Images.map((image, index) => (
            <SwiperSlide key={index} style={{ width: "100%" }}>
              <Image
                src={`https://accf-api.cancercareinstituteguwahati.org/storage/${image.photo_path}`}
                alt="Image Slide"
                width={530}
                height={280}
                style={{
                  width: "100%",
                  height: "280px",
                  objectFit: "cover",
                  transition: "transform 1.5s ease-in-out",
                  // borderRadius:'5px'
                }}
              />
            </SwiperSlide>
          ))
        ) : (
          // <SwiperSlide style={{ width: "fit-content" }}>
            <Image
              src="/placeholder.jpg"
              alt="No Image Available"
              width={530}
              height={280}
              style={{
                width: "530px",
                height: "280px",
                objectFit: "cover",
                opacity: 0.5,
              }}
            />
          // </SwiperSlide>
        )}
      </Swiper>

      {/* Custom Navigation Buttons */}
      {Images.length > 1 ?<>
      <div className="swiper-button-prev" style={navButtonStyle("left")}></div>
      <div className="swiper-button-next" style={navButtonStyle("right")}></div></>:<></>}
    </Box>
  );
};

// Custom style for navigation buttons
const navButtonStyle = (position) => ({
  position: "absolute",
  top: "60%",
  [position]: "10px",
  transform: "translateY(-50%)",
  backgroundColor: "rgba(0, 0, 0, 0.5)",
  color: "#fff",
  padding: "10px",
  borderRadius: "50%",
  zIndex: 3,
  cursor: "pointer",
  marginRight: "10px",
  fontSize: "20px",
  transition: "background-color 0.3s",
  "&:hover": {
    backgroundColor: "rgba(0, 0, 0, 0.8)",
  },
});

export default memo(ImageSlider);
