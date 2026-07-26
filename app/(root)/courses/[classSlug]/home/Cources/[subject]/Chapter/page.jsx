'use client';

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ChapterClient from "./ChapterClient";

export default function Page() {
    const params = useParams();

    const [chapters, setChapters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [subject, setSubject] = useState(null);

    const fetchChapters = async () => {
        // your existing API call
    };

    useEffect(() => {
        fetchChapters();
    }, []);

    return (
        <ChapterClient
            chapters={chapters}
            setChapters={setChapters}
            loading={loading}
            subject={subject}
            fetchChapters={fetchChapters}
        />
    );
}