import { useEffect, useState } from "react";
import {
  Paper,
  Typography,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
} from "@mui/material";

import { Edit, Delete } from "@mui/icons-material";

import api from "../../api/axios";
import PageHeader from "../../components/common/PageHeader";
import LoadingState from "../../components/common/LoadingState";
import ConfirmDialog from "../../components/common/ConfirmDialog";

export default function Tags() {
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [name, setName] = useState("");

  const fetchTags = async () => {
    try {
      const response = await api.get("/tags");
      const result = response.data.data ?? response.data;
      setTags(Array.isArray(result) ? result : []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load tags.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTags();
  }, []);

  const openDialog = (tag = null) => {
    setEditing(tag);
    setName(tag?.name || "");
    setOpen(true);
  };

  const saveTag = async () => {
    try {
      if (editing) {
        await api.put(`/tags/${editing.id}`, { name });
      } else {
        await api.post("/tags", { name });
      }

      setOpen(false);
      fetchTags();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to save tag.");
    }
  };

  const deleteTag = async () => {
    try {
      await api.delete(`/tags/${deleteTarget.id}`);
      setDeleteTarget(null);
      fetchTags();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to delete tag.");
      setDeleteTarget(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Tags"
        subtitle="Manage the tags used to organize your posts."
        action
        actionLabel="Add tag"
        onAction={() => openDialog()}
      />

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Paper elevation={0} sx={{ border: "1px solid #EAEAF0" }}>
        {loading ? (
          <LoadingState />
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {tags.map((tag) => (
                <TableRow key={tag.id}>
                  <TableCell>{tag.name}</TableCell>
                  <TableCell align="right">
                    <IconButton onClick={() => openDialog(tag)}>
                      <Edit />
                    </IconButton>
                    <IconButton
                      color="error"
                      onClick={() => setDeleteTarget(tag)}
                    >
                      <Delete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}

              {tags.length === 0 && (
                <TableRow>
                  <TableCell colSpan={2} align="center">
                    No tags found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth>
        <DialogTitle>{editing ? "Edit tag" : "Create tag"}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Tag name"
            margin="normal"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={!name.trim()} onClick={saveTag}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete tag?"
        message={`Delete "${deleteTarget?.name}"?`}
        onClose={() => setDeleteTarget(null)}
        onConfirm={deleteTag}
      />
    </>
  );
}
