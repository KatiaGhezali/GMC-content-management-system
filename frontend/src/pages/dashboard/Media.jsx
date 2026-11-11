import { useEffect, useState } from "react";
import {
  Box,
  Grid,
  Paper,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Alert,
} from "@mui/material";

import { Delete, Edit, UploadFile } from "@mui/icons-material";

import api from "../../api/axios";
import PageHeader from "../../components/common/PageHeader";
import LoadingState from "../../components/common/LoadingState";
import ConfirmDialog from "../../components/common/ConfirmDialog";

export default function Media() {
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [form, setForm] = useState({
    altText: "",
    caption: "",
  });

  const fetchMedia = async () => {
    try {
      const response = await api.get("/media");
      const result = response.data.data ?? response.data;
      setMedia(Array.isArray(result) ? result : []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load media.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedia();
  }, []);

  const uploadMedia = async () => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append("file", selectedFile);

    setUploading(true);

    try {
      await api.post("/media", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setSelectedFile(null);
      fetchMedia();
    } catch (err) {
      setError(err.response?.data?.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const saveMetadata = async () => {
    try {
      const mediaId = editing.media_id ?? editing.id;

      await api.patch(`/media/${mediaId}`, form);

      setEditing(null);
      fetchMedia();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to update media.");
    }
  };
  const deleteMedia = async () => {
    try {
      const mediaId = deleteTarget.media_id ?? deleteTarget.id;

      await api.delete(`/media/${mediaId}`);

      setDeleteTarget(null);
      fetchMedia();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to delete media.");
      setDeleteTarget(null);
    }
  };
  const openEdit = (item) => {
    setEditing(item);
    setForm({
      altText: item.alt_text || item.altText || "",
      caption: item.caption || "",
    });
  };

  const getMediaUrl = (item) => {
    const serverBase = api.defaults.baseURL.replace(/\/api\/v1\/?$/, "");

    if (item.url?.startsWith("http")) return item.url;

    if (item.file_path?.startsWith("http")) {
      return item.file_path;
    }

    if (item.file_path?.startsWith("/")) {
      return `${serverBase}${item.file_path}`;
    }

    if (item.filename) {
      return `${serverBase}/uploads/${item.filename}`;
    }

    return "";
  };

  return (
    <>
      <PageHeader
        title="Media Library"
        subtitle="Upload and manage your media files."
      />

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Paper elevation={0} sx={{ p: 3, mb: 3, border: "1px solid #EAEAF0" }}>
        <Typography fontWeight={700} mb={2}>
          Upload a file
        </Typography>

        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 2,
            alignItems: "center",
          }}
        >
          <Button
            component="label"
            variant="outlined"
            startIcon={<UploadFile />}
          >
            Choose file
            <input
              hidden
              type="file"
              onChange={(event) =>
                setSelectedFile(event.target.files?.[0] || null)
              }
            />
          </Button>

          <Typography color="text.secondary">
            {selectedFile?.name || "No file selected"}
          </Typography>

          <Button
            variant="contained"
            disabled={!selectedFile || uploading}
            onClick={uploadMedia}
          >
            {uploading ? "Uploading..." : "Upload"}
          </Button>
        </Box>
      </Paper>

      {loading ? (
        <LoadingState />
      ) : (
        <Grid container spacing={3}>
          {media.map((item) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={item.id}>
              <Paper
                elevation={0}
                sx={{ overflow: "hidden", border: "1px solid #EAEAF0" }}
              >
                {item.mime_type?.startsWith("image/") ||
                item.mimeType?.startsWith("image/") ? (
                  <Box
                    component="img"
                    src={getMediaUrl(item)}
                    alt={
                      item.alt_text || item.original_name || "Uploaded image"
                    }
                    sx={{
                      width: "100%",
                      height: 170,
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                ) : (
                  <Box
                    sx={{
                      height: 170,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      bgcolor: "#F0EFF7",
                    }}
                  >
                    <UploadFile sx={{ fontSize: 55, color: "primary.main" }} />
                  </Box>
                )}

                <Box sx={{ p: 2 }}>
                  <Typography fontWeight={600} noWrap>
                    {item.original_name || item.filename}
                  </Typography>

                  <Typography variant="caption" color="text.secondary">
                    {item.mime_type || item.mimeType || "File"}
                  </Typography>

                  <Box
                    sx={{ display: "flex", justifyContent: "flex-end", mt: 1 }}
                  >
                    <IconButton onClick={() => openEdit(item)}>
                      <Edit />
                    </IconButton>
                    <IconButton
                      color="error"
                      onClick={() => setDeleteTarget(item)}
                    >
                      <Delete />
                    </IconButton>
                  </Box>
                </Box>
              </Paper>
            </Grid>
          ))}

          {media.length === 0 && (
            <Grid item xs={12}>
              <Paper sx={{ p: 5, textAlign: "center" }} elevation={0}>
                <Typography color="text.secondary">
                  Your media library is empty.
                </Typography>
              </Paper>
            </Grid>
          )}
        </Grid>
      )}

      <Dialog
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        fullWidth
      >
        <DialogTitle>Edit media details</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Alternative text"
            margin="normal"
            value={form.altText}
            onChange={(event) =>
              setForm({ ...form, altText: event.target.value })
            }
          />
          <TextField
            fullWidth
            multiline
            label="Caption"
            margin="normal"
            value={form.caption}
            onChange={(event) =>
              setForm({ ...form, caption: event.target.value })
            }
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setEditing(null)}>Cancel</Button>
          <Button variant="contained" onClick={saveMetadata}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete media?"
        message={`Delete "${deleteTarget?.original_name || deleteTarget?.filename}"?`}
        onClose={() => setDeleteTarget(null)}
        onConfirm={deleteMedia}
      />
    </>
  );
}
