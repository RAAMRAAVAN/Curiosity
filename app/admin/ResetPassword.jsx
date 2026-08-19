'use client';

import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { LockReset } from '@mui/icons-material';

const initialForm = {
  currentPassword: '',
  newPassword: '',
  confirmNewPassword: '',
};

const ResetPassword = () => {
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
    setMessage(null);
  };

  const validateForm = () => {
    if (!form.currentPassword || !form.newPassword || !form.confirmNewPassword) {
      return 'All password fields are required.';
    }

    if (form.newPassword.length < 6) {
      return 'New password must be at least 6 characters.';
    }

    if (form.newPassword !== form.confirmNewPassword) {
      return 'New password and confirmation do not match.';
    }

    if (form.currentPassword === form.newPassword) {
      return 'New password must be different from the current password.';
    }

    return null;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validationMessage = validateForm();
    if (validationMessage) {
      setMessage({ severity: 'error', text: validationMessage });
      return;
    }

    try {
      setSaving(true);
      setMessage(null);

      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Unable to reset password.');
      }

      setForm(initialForm);
      setMessage({ severity: 'success', text: data.message || 'Password reset successfully.' });
    } catch (error) {
      setMessage({ severity: 'error', text: error.message || 'Unable to reset password.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 720, mx: 'auto' }}>
      <Paper
        component="form"
        onSubmit={handleSubmit}
        sx={{
          p: { xs: 2, sm: 3, md: 4 },
          borderRadius: 3,
          border: '1px solid rgba(15, 23, 42, 0.08)',
          boxShadow: '0 18px 45px rgba(15, 23, 42, 0.08)',
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
          <LockReset color="primary" />
          <Typography variant="h5" fontWeight={700}>
            Reset Password
          </Typography>
        </Stack>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Confirm your current password before choosing a new one.
        </Typography>

        {message ? <Alert severity={message.severity} sx={{ mb: 2 }}>{message.text}</Alert> : null}

        <Stack spacing={2}>
          <TextField
            label="Previous Password"
            name="currentPassword"
            type="password"
            value={form.currentPassword}
            onChange={handleChange}
            fullWidth
            required
            autoComplete="current-password"
          />
          <TextField
            label="New Password"
            name="newPassword"
            type="password"
            value={form.newPassword}
            onChange={handleChange}
            fullWidth
            required
            helperText="Use at least 6 characters."
            autoComplete="new-password"
          />
          <TextField
            label="Confirm New Password"
            name="confirmNewPassword"
            type="password"
            value={form.confirmNewPassword}
            onChange={handleChange}
            fullWidth
            required
            autoComplete="new-password"
          />
          <Button type="submit" variant="contained" disabled={saving} sx={{ alignSelf: { xs: 'stretch', sm: 'flex-end' }, minWidth: 160 }}>
            {saving ? 'Updating...' : 'Update Password'}
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
};

export default ResetPassword;