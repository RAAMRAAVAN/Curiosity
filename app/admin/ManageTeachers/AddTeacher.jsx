import { Autocomplete, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from "@mui/material";
import { useMemo } from "react";

const AddTeacher = ({ open, setOpen, form, setForm,  pageLoading, users, setPageLoading, FetchTeachers, teachers}) => {

    const availableUsers = useMemo(() => {
        const teacherUserIds = new Set(
            teachers.map((teacher) => teacher.userId)
        );

        return users.filter(
            (user) =>
                user.role === "TEACHER" &&
                !teacherUserIds.has(user.id)
        );
    }, [users, teachers]);

    const handleSubmit = async () => {
        if (!form.user) {
            alert("Please select a user.");
            return;
        }

        setPageLoading(true);

        try {
            const res = await fetch("/api/admin/teachers", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({
                    userId: form.user.id,
                }),
            });

            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.message);
            }

            alert("Teacher created successfully.");

            setOpen(false);

            setForm({
                user: null,
            });

            await FetchTeachers(false);
        } catch (err) {
            alert(err.message);
        } finally {
            setPageLoading(false);
        }
    };

    return (<>
        <Dialog
            open={open}
            onClose={() => setOpen(false)}
            fullWidth
            maxWidth="sm"
        >
            <DialogTitle>Add Teacher</DialogTitle>

            <DialogContent>

                <Autocomplete
                    sx={{ mt: 1 }}
                    options={availableUsers}
                    getOptionLabel={(option) =>
                        `${option.name} (${option.email})`
                    }
                    value={form.user}
                    onChange={(e, value) =>
                        setForm({
                            ...form,
                            user: value,
                            name: value?.name || "",
                        })
                    }
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label="Select User"
                        />
                    )}
                />

            </DialogContent>

            <DialogActions>
                <Button
                    onClick={() => setOpen(false)}
                >
                    Cancel
                </Button>

                <Button
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={pageLoading}
                >
                    Add as a Teacher
                </Button>
            </DialogActions>
        </Dialog>
    </>);
}
export default AddTeacher;