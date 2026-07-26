'use client';

import { useEffect, useState } from "react";
import ManageTeachers from "./ManageTeachers";

export default function Page() {
    const [users, setUsers] = useState([]);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const res = await fetch("/api/admin/users", {
                credentials: "include",
            });

            const data = await res.json();

            if (data.success) {
                setUsers(data.data);
            }
        } catch (err) {
            console.error(err);
        }
    };

    return <ManageTeachers users={users} />;
}