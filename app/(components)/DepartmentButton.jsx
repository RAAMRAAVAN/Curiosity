'use client';

import { KeyboardArrowDown } from "@mui/icons-material";
import { Box, Button, Grid, List, ListItem } from "@mui/material";
import { color3, color4, MedantaOrange } from "./Global";
// import DisplayDoctors from "./DisplayDoctors";
import { useRouter, useSearchParams } from 'next/navigation';
import { selectDoctors } from "@/redux/features/doctorSlice";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useRef } from "react";

const DepartmentButton = () => {
    const doctors = useSelector(selectDoctors);
    const searchParams = useSearchParams();
    const department = searchParams.get('department');
    const [departments, setDepartments] = useState([]);
    const [open, setOpen] = useState(false);
    const router = useRouter();
    const [value, setValue] = useState(department || '');
    const selectDepartmentRef = useRef(null);

    // Update `value` if URL query param changes
    useEffect(() => {
        if (department) {
            setValue(department);
        }
    }, [department]);

    // Extract unique departments from doctor data
    useEffect(() => {
        if (doctors.length > 0) {
            const uniqueDepartments = [...new Set(
                doctors
                    .map(doc => doc.depertment)  // ✅ fixed typo
                    .filter(Boolean)
            )];
            setDepartments(uniqueDepartments);
        }
    }, [doctors]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (selectDepartmentRef.current && !selectDepartmentRef.current.contains(event.target)) {
                setOpen(false);
            }
        };
    
        if (open) {
            document.addEventListener("mousedown", handleClickOutside);
        }
    
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [open]);

    const handleDepartmentClick = () => {
        setOpen(prev => !prev);
    };

    return (
                    <Box position='relative' ref={selectDepartmentRef} display='flex' width='100%'>
                        <Button
                            sx={{
                                color: 'white',
                                backgroundColor: color4,
                                justifyContent: 'space-between',
                                textTransform: 'none',
                                borderRadius: '30px',
                                fontSize: '18px',
                                paddingX: 4,
                                paddingY: 1,
                                position:'relative',
                                zIndex:10001,
                                overflow:'hidden',
                                whiteSpace: 'nowrap',
                            }}
                            fullWidth
                            endIcon={
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <KeyboardArrowDown sx={{ fontSize: '32px', color: 'white' }} />
                                </Box>
                            }
                            onClick={handleDepartmentClick}
                        >
                            {value || "Select Department"}
                        </Button>

                        {open && (
                            <Box
                                sx={{
                                    padding: 1,
                                    position: 'absolute',
                                    backgroundColor: 'white',
                                    borderRadius: '0px 0px 10px 10px',
                                    marginTop: 1,
                                    top:14,
                                    zIndex:1,
                                    width:'100%'
                                }}
                                boxShadow={3}
                            >
                                <Box
                                    sx={{
                                        maxHeight: 200,
                                        overflowY: 'auto',
                                        marginTop:3
                                        // width: '300px',
                                    }}
                                >
                                    <List>
                                        {departments.map((dept, index) => (
                                            <ListItem
                                                key={index}
                                                sx={{ cursor: 'pointer', color:'black' }}
                                                onMouseDown={(e) => e.preventDefault()}
                                                onClick={() => {
                                                    setOpen(false);
                                                    setValue(dept);
                                                    router.push(`/consultants?department=${encodeURIComponent(dept)}`);
                                                }}
                                            >
                                                {dept}
                                            </ListItem>
                                        ))}
                                    </List>
                                </Box>
                            </Box>
                        )}
                </Box>
    );
};

export default DepartmentButton;
