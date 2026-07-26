'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useParams } from "next/navigation";

import {
  Box,
  Collapse,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from "@mui/material";

import {
  Inbox,
  Mail,
  ExpandLess,
  ExpandMore,
  Description,
  PictureAsPdf,
  PlayCircle,
  Slideshow,
  Quiz,
} from "@mui/icons-material";

import LoginModal from "@/app/(components)/MyProfile/LoginModal";
import Logout from "@/app/(components)/MyProfile/Logout";
import MainPage from "./MainPage/MainPage";


export default function Layout() {

  const pathname = usePathname();
  const params = useParams();

  const chapterId = params?.chapter_notes;


  const [openLogin, setOpenLogin] = useState(false);


  const [chapter, setChapter] = useState(null);
  const [chapterName, setChapterName] = useState("");

  const [chapterContents, setChapterContents] = useState([]);

  const [notes, setNotes] = useState([]);
  const [videos, setVideos] = useState([]);
  const [pdfs, setPdfs] = useState([]);
  const [ppts, setPpts] = useState([]);
  const [previousPapers, setPreviousPapers] = useState([]);


  const [openMenus, setOpenMenus] = useState({
    notes: true,
    videos: true,
    pdfs: true,
    ppts: true,
    previousPapers: true,
  });


  const [contentCount, setContentCount] = useState({
    notes: 0,
    videos: 0,
    pdfs: 0,
    ppts: 0,
    previousPapers: 0,
    total: 0,
  });



  // ================= AUTH CHECK =================

  useEffect(() => {

    if (typeof window === "undefined") return;


    const checkAuth = () => {

      try {

        const auth = sessionStorage.getItem("authDetails");


        if (!auth) {
          setOpenLogin(true);
          return;
        }


        const parsed = JSON.parse(auth);


        if (!parsed?.loggedIn) {
          setOpenLogin(true);
        }


      } catch(error){

        console.error("Auth Error:", error);
        setOpenLogin(true);

      }

    };


    checkAuth();


    const interval = setInterval(
      checkAuth,
      30000
    );


    return () => clearInterval(interval);


  }, []);




  // ================= MENU COMPONENT =================

  const MenuSection = ({
    title,
    icon,
    items,
    openKey,
  }) => {


    if (!items || items.length === 0)
      return null;


    return (

      <>

        <ListItem disablePadding>

          <ListItemButton
            onClick={() => toggleMenu(openKey)}
          >

            <ListItemIcon>
              {icon}
            </ListItemIcon>


            <ListItemText
              primary={`${title} (${items.length})`}
            />


            {
              openMenus[openKey]
                ?
                <ExpandLess />
                :
                <ExpandMore />
            }


          </ListItemButton>


        </ListItem>



        <Collapse
          in={openMenus[openKey]}
          timeout="auto"
          unmountOnExit
        >

          <List disablePadding>


            {
              items.map(item => (

                <ListItem
                  key={item.id}
                  disablePadding
                  sx={{
                    pl:4
                  }}
                >

                  <ListItemButton>


                    <ListItemText

                      primary={
                        item.title ||
                        item.fileName ||
                        item.name ||
                        "Untitled"
                      }

                      primaryTypographyProps={{
                        fontSize:13
                      }}

                    />


                  </ListItemButton>


                </ListItem>

              ))
            }


          </List>


        </Collapse>


      </>

    );


  };





  // ================= FETCH CONTENT =================

  const fetchChapterContents = async(id)=>{


    try{


      const response = await fetch(
        `/api/chapter-content/list?chapterId=${id}`,
        {
          cache:"no-store"
        }
      );


      const result = await response.json();



      if(!response.ok || !result.success){

        throw new Error(
          result.message ||
          "Failed to fetch contents"
        );

      }



      const data = result.data;



      setChapter(data.chapter);

      setChapterName(
        data.chapter?.chapterName || ""
      );



      setChapterContents(
        data.contents || []
      );



      setNotes(
        data.notes || []
      );


      setVideos(
        data.videos || []
      );


      setPdfs(
        data.pdfs || []
      );


      setPpts(
        data.ppts || []
      );


      setPreviousPapers(
        data.previousPapers || []
      );



      setContentCount(
        data.content_count ||
        {
          notes:0,
          videos:0,
          pdfs:0,
          ppts:0,
          previousPapers:0,
          total:0
        }
      );



    }
    catch(error){

      console.error(
        "Fetch Chapter Contents Error:",
        error
      );

    }


  };




  useEffect(()=>{


    if(chapterId){

      fetchChapterContents(
        chapterId
      );

    }


  },[chapterId]);





  const toggleMenu=(key)=>{


    setOpenMenus(prev=>({

      ...prev,

      [key]:
        !prev[key]

    }));


  };





  const pages=[

    {
      page:"View Subject",
      link:"../../../"
    },

    {
      page:"Chapters",
      link:"./"
    },


    {
      page:"Explore More Courses",
      link:`/courses/${chapterId}/ExploreCources`
    }

  ];





  return (

    <Box
      display="flex"
      width="100vw"
    >


      <Box
        width="260px"
      >


        <Box

          sx={{

            width:260,

            height:"100vh",

            borderRight:
              "1px solid #e0e0e0",

            bgcolor:"#fff",

            position:"fixed",

            left:0,

            top:0

          }}

        >



          <Box
            px={3}
            pt={3}
            pb={2}
          >


            <Typography

              component={Link}

              href="../../../"

              fontWeight="bold"

              fontSize={24}

              sx={{

                textDecoration:"none",

                color:"inherit"

              }}

            >

              Curiosity Home

            </Typography>



            <Typography
              mt={2}
              fontSize={14}
              color="primary"
              fontWeight="bold"
            >

              {chapterName}

            </Typography>



          </Box>





          <List>


          {
            pages.map((item,index)=>(

              <ListItem
                key={item.page}
                disablePadding
              >


                <ListItemButton

                  component={Link}

                  href={item.link}

                  selected={
                    pathname===item.link
                  }

                >


                  <ListItemIcon>

                    {
                      index%2===0
                      ?
                      <Inbox/>
                      :
                      <Mail/>
                    }

                  </ListItemIcon>


                  <ListItemText
                    primary={item.page}
                  />


                </ListItemButton>


              </ListItem>


            ))
          }


          </List>



          <Divider/>




          <List>


            <MenuSection
              title="Notes"
              icon={<Description/>}
              items={notes}
              openKey="notes"
            />


            <MenuSection
              title="Videos"
              icon={<PlayCircle/>}
              items={videos}
              openKey="videos"
            />



            <MenuSection
              title="PDFs"
              icon={<PictureAsPdf/>}
              items={pdfs}
              openKey="pdfs"
            />



            <MenuSection
              title="PPTs"
              icon={<Slideshow/>}
              items={ppts}
              openKey="ppts"
            />



            <MenuSection
              title="Previous Papers"
              icon={<Quiz/>}
              items={previousPapers}
              openKey="previousPapers"
            />


          </List>



        </Box>


      </Box>





      <Box

        flex={1}

        position="relative"

      >



        <MainPage

          chapter={chapter}

          chapterName={chapterName}

          chapterContents={chapterContents}

          contentCount={contentCount}

        />



        <Box

          position="absolute"

          top={40}

          right={20}

        >

          <Logout/>

        </Box>


      </Box>





      <LoginModal

        open={openLogin}

        onClose={()=>
          setOpenLogin(false)
        }

        onSignupClick={()=>
          setOpenLogin(false)
        }

      />



    </Box>

  );

}