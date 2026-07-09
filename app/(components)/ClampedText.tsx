"use client";
import { Typography, Button, Box } from "@mui/material";
import { useRef, useState, useEffect } from "react";
import { Font } from "./Global";

const ClampedText = ({ text, lineClamp = 12 }: { text: string; lineClamp?: number }) => {
  const textRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [isClamped, setIsClamped] = useState(false);

  useEffect(() => {
    const el = textRef.current;
    if (el) {
      setIsClamped(el.scrollHeight > el.clientHeight);
    }
  }, [text]);

  return (
    <Box>
      <Typography 
        ref={textRef}
        sx={{
          overflow: "hidden",
          display: "-webkit-box",
          WebkitBoxOrient: "vertical",
          WebkitLineClamp: expanded ? "none" : lineClamp,
          textOverflow: "ellipsis",
          fontSize: { xs: "14px", md: "16px" },
        }}
      >
        {text}
      </Typography>

      {isClamped && (
        <Button
          size="small"
          onClick={() => setExpanded(!expanded)}
          sx={{ marginTop: 1, textTransform: "none" }}
        >
          {expanded ? "Show Less" : "Read More"}
        </Button>
      )}
    </Box>
  );
};

export default ClampedText;
