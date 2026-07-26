import { useState } from "react";
import { Close } from "@mui/icons-material";
import {
    Box,
    Button,
    CircularProgress,
    Fade,
    IconButton,
    MenuItem,
    Modal,
    TextField,
    Typography,
} from "@mui/material";


const style = {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "95%",
    maxWidth: 900,
    height: "70vh",
    overflow: "auto",
    bgcolor: "background.paper",
    borderRadius: 3,
    boxShadow: 24,
    p: 4,
    outline: "none",
};


const EditVideo = ({
    modalLoading,
    openEditVideo,
    handleCloseEditVideo,
    formData,
    setFormData,
    setModalLoading,
    fetchChapters,
}) => {


    const [videoFile, setVideoFile] = useState(null);



    const handleChange = ({ target }) => {

        let value = target.value;


        setFormData((prev) => ({
            ...prev,
            [target.name]: value,
        }));

    };




    const handleUpdate = async () => {


        try {


            setModalLoading(true);



            // Normalize enum value
            const videoType =
                formData.videoType === "ONSITE"
                    ? "ON_SITE"
                    : formData.videoType;



            let videoPath = formData.videoPath;



            /*
                Upload new video only for ON_SITE
            */
            if (
                videoType === "ON_SITE" &&
                videoFile
            ) {


                const uploadForm = new FormData();


                uploadForm.append(
                    "file",
                    videoFile
                );


                uploadForm.append(
                    "folder",
                    "chapter-videos"
                );



                const uploadResponse = await fetch(
                    "/api/upload",
                    {
                        method: "POST",
                        body: uploadForm,
                    }
                );



                const uploadResult =
                    await uploadResponse.json();



                if (
                    !uploadResponse.ok ||
                    !uploadResult.success
                ) {

                    throw new Error(
                        uploadResult.message
                    );

                }



                videoPath = uploadResult.path;

            }



            /*
                Prepare payload
            */

            const payload = {


                title:
                    formData.title,


                displayOrder:
                    Number(formData.displayOrder),


                videoType,


                videoLink:
                    videoType === "YOUTUBE"
                        ? formData.videoLink
                        : null,



                videoPath:
                    videoType === "ON_SITE"
                        ? videoPath
                        : null,



                thumbnail:
                    formData.thumbnail || null,



                duration:
                    formData.duration || null,



                modifiedBy:
                    "admin",

            };




            const response = await fetch(

                `/api/chapter-content/video/${formData.id}`,

                {

                    method: "PUT",


                    headers: {

                        "Content-Type":
                            "application/json",

                    },


                    body:
                        JSON.stringify(payload),

                }

            );



            const result =
                await response.json();



            if (
                !response.ok ||
                !result.success
            ) {

                throw new Error(
                    result.message
                );

            }



            await fetchChapters();



            setVideoFile(null);



            handleCloseEditVideo();



            alert(
                result.message
            );



        }
        catch(error){


            console.error(
                "Update video error:",
                error
            );


            alert(
                error.message
            );


        }
        finally{


            setModalLoading(false);


        }


    };





    return (


        <Modal

            open={openEditVideo}

            onClose={
                !modalLoading
                    ? handleCloseEditVideo
                    : undefined
            }

            closeAfterTransition

        >


            <Fade in={openEditVideo}>


                <Box

                    sx={{
                        ...style,
                        position:"relative",
                    }}

                >


                    {modalLoading && (

                        <Box

                            sx={{

                                position:"absolute",

                                inset:0,

                                bgcolor:
                                    "rgba(255,255,255,.75)",

                                display:"flex",

                                justifyContent:"center",

                                alignItems:"center",

                                zIndex:9999,

                            }}

                        >

                            <CircularProgress />

                        </Box>

                    )}




                    <IconButton

                        onClick={
                            handleCloseEditVideo
                        }

                        disabled={
                            modalLoading
                        }

                        sx={{

                            position:"absolute",

                            top:12,

                            right:12,

                        }}

                    >

                        <Close />

                    </IconButton>




                    <Box

                        display="flex"

                        justifyContent="space-between"

                        alignItems="center"

                        mb={3}

                    >


                        <Typography

                            variant="h5"

                            fontWeight="bold"

                        >

                            Edit Video

                        </Typography>




                        <TextField

                            type="number"

                            name="displayOrder"

                            label="Display Order"

                            value={
                                formData.displayOrder || 1
                            }

                            onChange={handleChange}

                            inputProps={{
                                min:1
                            }}

                            sx={{
                                width:180
                            }}

                        />


                    </Box>





                    <TextField

                        fullWidth

                        margin="normal"

                        label="Video Title"

                        name="title"

                        value={
                            formData.title || ""
                        }

                        onChange={handleChange}

                    />





                    <TextField

                        select

                        fullWidth

                        margin="normal"

                        label="Video Type"

                        name="videoType"

                        value={
                            formData.videoType === "ONSITE"
                                ? "ON_SITE"
                                : formData.videoType || "YOUTUBE"
                        }

                        onChange={handleChange}

                    >


                        <MenuItem value="YOUTUBE">

                            YouTube

                        </MenuItem>



                        <MenuItem value="ON_SITE">

                            Onsite Upload

                        </MenuItem>


                    </TextField>





                    {
                        formData.videoType === "YOUTUBE" && (

                            <TextField

                                fullWidth

                                margin="normal"

                                label="YouTube URL"

                                name="videoLink"

                                value={
                                    formData.videoLink || ""
                                }

                                onChange={handleChange}

                            />

                        )
                    }







                    {
                        formData.videoType === "ON_SITE" && (

                            <>

                                <Button

                                    variant="outlined"

                                    component="label"

                                    sx={{
                                        mt:2
                                    }}

                                >

                                    Replace Video


                                    <input

                                        hidden

                                        type="file"

                                        accept="video/*"

                                        onChange={(e)=>{

                                            setVideoFile(
                                                e.target.files?.[0] || null
                                            );

                                        }}

                                    />


                                </Button>





                                <Typography

                                    mt={1}

                                    color="text.secondary"

                                >

                                    {

                                    videoFile

                                    ?

                                    videoFile.name

                                    :

                                    formData.videoPath
                                    ?
                                    formData.videoPath.split("/").pop()
                                    :
                                    "No video selected"

                                    }


                                </Typography>


                            </>

                        )
                    }






                    <TextField

                        fullWidth

                        margin="normal"

                        label="Thumbnail URL"

                        name="thumbnail"

                        value={
                            formData.thumbnail || ""
                        }

                        onChange={handleChange}

                    />






                    <TextField

                        fullWidth

                        margin="normal"

                        label="Duration"

                        name="duration"

                        value={
                            formData.duration || ""
                        }

                        onChange={handleChange}

                    />







                    <Box

                        display="flex"

                        justifyContent="flex-end"

                        gap={2}

                        mt={4}

                    >


                        <Button

                            variant="outlined"

                            onClick={
                                handleCloseEditVideo
                            }

                            disabled={
                                modalLoading
                            }

                        >

                            Cancel

                        </Button>





                        <Button

                            variant="contained"

                            onClick={
                                handleUpdate
                            }

                            disabled={
                                modalLoading
                            }

                        >

                            {
                                modalLoading
                                ?
                                "Updating..."
                                :
                                "Update"
                            }


                        </Button>



                    </Box>




                </Box>


            </Fade>


        </Modal>


    );


};


export default EditVideo;