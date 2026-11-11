import { useEffect, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Stack,
} from "@mui/material";

import { Add, Edit, Delete, Search } from "@mui/icons-material";

import api from "../../api/axios";
import PageHeader from "../../components/common/PageHeader";
import LoadingState from "../../components/common/LoadingState";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { useAuth } from "../../context/AuthContext";

const emptyForm = {
  title: "",
  content: "",
  excerpt: "",
  categoryId: "",
  status: "draft",
};

export default function Posts() {
  const { user } = useAuth();

  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);

  const isManager = ["admin", "editor"].includes(user?.role);

  const fetchPosts = async () => {
    setLoading(true);
    setError("");

    try {
      const params = { page, limit: 10 };

      if (search.trim()) params.search = search.trim();
      if (status) params.status = status;

      const response = await api.get("/posts", { params });
      const result = response.data.data ?? response.data;

      setPosts(Array.isArray(result) ? result : []);
      setTotalPages(response.data.pagination?.totalPages ?? 1);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load posts.");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get("/categories");
      const result = response.data.data ?? response.data;
      setCategories(Array.isArray(result) ? result : []);
    } catch {
      setCategories([]);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [page, status]);

  const openCreateDialog = () => {
    setEditingPost(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEditDialog = async (post) => {
    try {
      const postId = post.post_id ?? post.id;

      const response = await api.get(`/posts/${postId}`);
      const result = response.data.data ?? response.data;
      const currentPost = result.post ?? result;

      setEditingPost({
        ...currentPost,
        id: currentPost.post_id ?? currentPost.id,
      });

      setForm({
        title: currentPost.title || "",
        content: currentPost.content || "",
        excerpt: currentPost.excerpt || "",
        categoryId: currentPost.category_id ?? currentPost.categoryId ?? "",
        status: currentPost.status || "draft",
      });

      setDialogOpen(true);
    } catch (err) {
      setError(err.response?.data?.message || "Could not load this post.");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");

    try {
      const payload = {
        ...form,
        categoryId: form.categoryId ? Number(form.categoryId) : null,
      };

      if (editingPost) {
        await api.put(`/posts/${editingPost.id}`, payload);
      } else {
        await api.post("/posts", payload);
      }

      setDialogOpen(false);
      fetchPosts();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to save post.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      const postId = deleteTarget.post_id ?? deleteTarget.id;

      await api.delete(`/posts/${postId}`);

      setDeleteTarget(null);
      fetchPosts();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to delete post.");
      setDeleteTarget(null);
    }
  };
  return (
    <>
      <PageHeader
        title="Posts"
        subtitle="Create and manage your content."
        action
        actionLabel="New post"
        onAction={openCreateDialog}
      />

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Paper elevation={0} sx={{ p: 2, mb: 3, border: "1px solid #EAEAF0" }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search posts..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                setPage(1);
                fetchPosts();
              }
            }}
            slotProps={{
              input: {
                startAdornment: (
                  <Search sx={{ mr: 1, color: "text.secondary" }} />
                ),
              },
            }}
          />

          <TextField
            select
            size="small"
            label="Status"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="">All statuses</MenuItem>
            <MenuItem value="published">Published</MenuItem>
            <MenuItem value="draft">Draft</MenuItem>
            <MenuItem value="archived">Archived</MenuItem>
          </TextField>

          <Button
            variant="outlined"
            onClick={() => {
              setPage(1);
              fetchPosts();
            }}
          >
            Search
          </Button>
        </Stack>
      </Paper>

      <Paper elevation={0} sx={{ border: "1px solid #EAEAF0" }}>
        {loading ? (
          <LoadingState message="Loading posts..." />
        ) : (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Title</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {posts.map((post) => (
                    <TableRow key={post.id} hover>
                      <TableCell>
                        <Typography fontWeight={600}>{post.title}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {post.excerpt}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Chip
                          size="small"
                          label={post.status}
                          color={
                            post.status === "published"
                              ? "success"
                              : post.status === "draft"
                                ? "warning"
                                : "default"
                          }
                        />
                      </TableCell>

                      <TableCell>
                        {post.created_at
                          ? new Date(post.created_at).toLocaleDateString()
                          : "—"}
                      </TableCell>

                      <TableCell align="right">
                        <IconButton
                          color="primary"
                          onClick={() => openEditDialog(post)}
                        >
                          <Edit />
                        </IconButton>

                        <IconButton
                          color="error"
                          onClick={() => setDeleteTarget(post)}
                        >
                          <Delete />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}

                  {posts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ py: 5 }}>
                        <Typography color="text.secondary">
                          No posts found.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <Stack direction="row" justifyContent="flex-end" spacing={2} p={2}>
              <Button
                disabled={page <= 1}
                onClick={() => setPage((current) => current - 1)}
              >
                Previous
              </Button>
              <Typography sx={{ alignSelf: "center" }}>
                Page {page} of {totalPages}
              </Typography>
              <Button
                disabled={page >= totalPages}
                onClick={() => setPage((current) => current + 1)}
              >
                Next
              </Button>
            </Stack>
          </>
        )}
      </Paper>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>{editingPost ? "Edit post" : "Create a post"}</DialogTitle>

        <DialogContent>
          <TextField
            fullWidth
            label="Title"
            margin="normal"
            value={form.title}
            onChange={(event) =>
              setForm({ ...form, title: event.target.value })
            }
          />

          <TextField
            fullWidth
            multiline
            minRows={8}
            label="Content"
            margin="normal"
            value={form.content}
            onChange={(event) =>
              setForm({ ...form, content: event.target.value })
            }
          />

          <TextField
            fullWidth
            multiline
            minRows={2}
            label="Excerpt"
            margin="normal"
            value={form.excerpt}
            onChange={(event) =>
              setForm({ ...form, excerpt: event.target.value })
            }
          />

          <TextField
            select
            fullWidth
            label="Category"
            margin="normal"
            value={form.categoryId}
            onChange={(event) =>
              setForm({ ...form, categoryId: event.target.value })
            }
          >
            <MenuItem value="">No category</MenuItem>
            {categories.map((category) => (
              <MenuItem key={category.id} value={category.id}>
                {category.name}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            fullWidth
            label="Status"
            margin="normal"
            value={form.status}
            onChange={(event) =>
              setForm({ ...form, status: event.target.value })
            }
          >
            <MenuItem value="draft">Draft</MenuItem>
            {isManager && <MenuItem value="published">Published</MenuItem>}
            <MenuItem value="archived">Archived</MenuItem>
          </TextField>
        </DialogContent>

        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving || !form.title.trim() || !form.content.trim()}
          >
            {saving ? "Saving..." : "Save post"}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete post?"
        message={`Are you sure you want to delete "${deleteTarget?.title}"?`}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </>
  );
}
