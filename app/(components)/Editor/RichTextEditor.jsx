"use client";

import "./Editor.css";

import { useEditor, EditorContent } from "@tiptap/react";

import { Box, Paper } from "@mui/material";

import { editorExtensions } from "./extensions";

import MenuBar from "./MenuBar";

export default function RichTextEditor({

    value,

    onChange,

}) {

    const editor = useEditor({

        extensions: editorExtensions,

        content: value,

        immediatelyRender: false,

        onUpdate({ editor }) {

            onChange(editor.getHTML());

        },

    });

    if (!editor) return null;

    return (

        <Paper
            elevation={2}
            sx={{
                borderRadius:2,
                overflow:"hidden",
            }}
        >

            <MenuBar editor={editor}/>

            <Box>

                <EditorContent editor={editor}/>

            </Box>

        </Paper>

    );

}