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

import { Add, Edit, Delete } from "@mui/icons-material";

import api from "../../api/axios";
import PageHeader from "../../components/common/PageHeader";
import LoadingState from "../../components/common/LoadingState";
import ConfirmDialog from "../../components/common/ConfirmDialog";

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState({ name: "", description: "" });

  const fetchCategories = async () => {
    try {
      const response = await api.get("/categories");
      const result = response.data.data ?? response.data;
      setCategories(Array.isArray(result) ? result : []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load categories.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const openDialog = (category = null) => {
    setEditing(category);
    setForm({
      name: category?.name || "",
      description: category?.description || "",
    });
    setOpen(true);
  };

  const saveCategory = async () => {
    try {
      if (editing) {
        await api.put(`/categories/${editing.id}`, form);
      } else {
        await api.post("/categories", form);
      }

      setOpen(false);
      fetchCategories();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to save category.");
    }
  };

  const deleteCategory = async () => {
    try {
      await api.delete(`/categories/${deleteTarget.id}`);
      setDeleteTarget(null);
      fetchCategories();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to delete category.");
      setDeleteTarget(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Categories"
        subtitle="Organize your posts into categories."
        action
        actionLabel="Add category"
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
                <TableCell>Description</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {categories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell>
                    <Typography fontWeight={600}>{category.name}</Typography>
                  </TableCell>
                  <TableCell>{category.description || "—"}</TableCell>
                  <TableCell align="right">
                    <IconButton onClick={() => openDialog(category)}>
                      <Edit />
                    </IconButton>
                    <IconButton
                      color="error"
                      onClick={() => setDeleteTarget(category)}
                    >
                      <Delete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}

              {categories.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} align="center">
                    No categories found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth>
        <DialogTitle>
          {editing ? "Edit category" : "Create category"}
        </DialogTitle>

        <DialogContent>
          <TextField
            fullWidth
            label="Name"
            margin="normal"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
          />

          <TextField
            fullWidth
            multiline
            minRows={3}
            label="Description"
            margin="normal"
            value={form.description}
            onChange={(event) =>
              setForm({ ...form, description: event.target.value })
            }
          />
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!form.name.trim()}
            onClick={saveCategory}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete category?"
        message={`Delete "${deleteTarget?.name}"?`}
        onClose={() => setDeleteTarget(null)}
        onConfirm={deleteCategory}
      />
    </>
  );
}
