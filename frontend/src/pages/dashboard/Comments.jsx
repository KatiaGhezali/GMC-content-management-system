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
  Chip,
  MenuItem,
  Select,
  IconButton,
  Alert,
} from "@mui/material";

import { Delete } from "@mui/icons-material";

import api from "../../api/axios";
import PageHeader from "../../components/common/PageHeader";
import LoadingState from "../../components/common/LoadingState";
import ConfirmDialog from "../../components/common/ConfirmDialog";

export default function Comments() {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchComments = async () => {
    try {
      const response = await api.get("/comments/moderation");
      const result = response.data.data ?? response.data;
      setComments(Array.isArray(result) ? result : []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load comments.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, []);

  const updateStatus = async (id, status) => {
    try {
      await api.patch(`/comments/${id}/status`, { status });
      fetchComments();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to update comment.");
    }
  };

  const deleteComment = async () => {
    try {
      await api.delete(`/comments/${deleteTarget.id}`);
      setDeleteTarget(null);
      fetchComments();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to delete comment.");
      setDeleteTarget(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Comments"
        subtitle="Review and moderate submitted comments."
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
                <TableCell>Comment</TableCell>
                <TableCell>Post</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Moderation</TableCell>
                <TableCell align="right">Delete</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {comments.map((comment) => (
                <TableRow key={comment.id}>
                  <TableCell sx={{ maxWidth: 350 }}>
                    <Typography>{comment.content}</Typography>
                  </TableCell>

                  <TableCell>
                    {comment.post_title ||
                      comment.postTitle ||
                      comment.post_id ||
                      "—"}
                  </TableCell>

                  <TableCell>
                    <Chip size="small" label={comment.status} />
                  </TableCell>

                  <TableCell>
                    <Select
                      size="small"
                      value={comment.status}
                      onChange={(event) =>
                        updateStatus(comment.id, event.target.value)
                      }
                    >
                      <MenuItem value="pending">Pending</MenuItem>
                      <MenuItem value="approved">Approved</MenuItem>
                      <MenuItem value="spam">Spam</MenuItem>
                      <MenuItem value="trash">Trash</MenuItem>
                    </Select>
                  </TableCell>

                  <TableCell align="right">
                    <IconButton
                      color="error"
                      onClick={() => setDeleteTarget(comment)}
                    >
                      <Delete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}

              {comments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    No comments awaiting moderation.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </Paper>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete comment?"
        message="This action cannot be undone."
        onClose={() => setDeleteTarget(null)}
        onConfirm={deleteComment}
      />
    </>
  );
}
