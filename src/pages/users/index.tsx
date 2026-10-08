import { useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, MenuItem, Paper, Select, Snackbar, Stack, Table, TableBody,
  TableCell, TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { api, User } from 'services/api';

const Users = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState({ name: '', email: '', role: 'USER' as User['role'] });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = async () => {
    try { setUsers((await api.users()).users); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to load users'); }
  };

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() =>
    users.filter((u) => `${u.name} ${u.email}`.toLowerCase().includes(search.toLowerCase())),
    [users, search]);

  const openEdit = (user: User) => {
    setEditing(user);
    setForm({ name: user.name, email: user.email, role: user.role });
  };

  const save = async () => {
    if (!editing) return;
    try {
      const result = await api.updateUser(editing.id, form);
      setUsers((current) => current.map((u) => u.id === editing.id ? result.user : u));
      setEditing(null);
      setMessage('User updated successfully');
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to update user'); }
  };

  const remove = async (id: number) => {
    if (!window.confirm('Delete this user?')) return;
    try {
      await api.deleteUser(id);
      setUsers((current) => current.filter((u) => u.id !== id));
      setMessage('User deleted');
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to delete user'); }
  };

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={2} mb={3}>
        <Box>
          <Typography variant="h4" fontWeight={700}>Users</Typography>
          <Typography color="text.secondary">Manage customers, administrators and account access.</Typography>
        </Box>
        <TextField size="small" label="Search users" value={search} onChange={(e) => setSearch(e.target.value)} />
      </Stack>

      <Paper sx={{ overflow: 'hidden' }}>
        <Table>
          <TableHead><TableRow>
            <TableCell>Name</TableCell><TableCell>Email</TableCell><TableCell>Role</TableCell>
            <TableCell>Orders</TableCell><TableCell>Joined</TableCell><TableCell align="right">Actions</TableCell>
          </TableRow></TableHead>
          <TableBody>
            {filtered.map((user) => (
              <TableRow key={user.id} hover>
                <TableCell><Typography fontWeight={600}>{user.name}</Typography></TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell><Chip size="small" label={user.role} color={user.role === 'ADMIN' ? 'primary' : 'default'} /></TableCell>
                <TableCell>{user._count?.orders ?? 0}</TableCell>
                <TableCell>{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}</TableCell>
                <TableCell align="right">
                  <IconButton onClick={() => openEdit(user)}><EditOutlinedIcon /></IconButton>
                  <IconButton color="error" onClick={() => void remove(user.id)}><DeleteOutlineIcon /></IconButton>
                </TableCell>
              </TableRow>
            ))}
            {!filtered.length && <TableRow><TableCell colSpan={6} align="center">No users found.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={Boolean(editing)} onClose={() => setEditing(null)} fullWidth maxWidth="sm">
        <DialogTitle>Edit user</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField label="Name" fullWidth value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <TextField label="Email" fullWidth value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Select fullWidth value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as User['role'] })}>
              <MenuItem value="USER">USER</MenuItem><MenuItem value="ADMIN">ADMIN</MenuItem>
            </Select>
          </Stack>
        </DialogContent>
        <DialogActions><Button onClick={() => setEditing(null)}>Cancel</Button><Button variant="contained" onClick={() => void save()}>Save</Button></DialogActions>
      </Dialog>

      <Snackbar open={Boolean(message)} autoHideDuration={2500} onClose={() => setMessage('')}><Alert severity="success">{message}</Alert></Snackbar>
      <Snackbar open={Boolean(error)} autoHideDuration={3500} onClose={() => setError('')}><Alert severity="error">{error}</Alert></Snackbar>
    </Box>
  );
};

export default Users;
