import { useEffect, useState } from "react";
import { Paper, Typography, Box, Chip, Button, Stack } from "@mui/material";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  Article,
  Visibility,
  Comment,
  EditNote,
  ArrowForward,
} from "@mui/icons-material";

import api from "../../api/axios";
import PageHeader from "../../components/common/PageHeader";
import LoadingState from "../../components/common/LoadingState";

const cardStyles = [
  { color: "#5146B8", background: "#F0EEFF" },
  { color: "#269B76", background: "#E8F7F0" },
  { color: "#D99536", background: "#FFF4E3" },
  { color: "#D65B6D", background: "#FCECEF" },
];

export default function Overview() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchDashboard = async () => {
      try {
        const userId = user.userId ?? user.user_id ?? user.id;

        const endpoint =
          user.role === "author"
            ? `/analytics/authors/${userId}`
            : "/analytics/dashboard";

        const response = await api.get(endpoint);
        setData(response.data.data ?? response.data);
        setError("");
      } catch (err) {
        setError(
          err.response?.data?.message || "Unable to load dashboard analytics.",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [user]);

  if (loading) {
    return <LoadingState message="Loading your dashboard..." />;
  }

  const isAuthor = user?.role === "author";

  const cards = isAuthor
    ? [
        {
          label: "Total Posts",
          value: data?.total_posts ?? 0,
          icon: <Article />,
        },
        {
          label: "Published Posts",
          value: data?.published_posts ?? 0,
          icon: <EditNote />,
        },
        {
          label: "Total Views",
          value: data?.total_views ?? 0,
          icon: <Visibility />,
        },
        {
          label: "Draft Posts",
          value: data?.draft_posts ?? 0,
          icon: <Comment />,
        },
      ]
    : [
        {
          label: "Total Posts",
          value: data?.posts?.total ?? 0,
          icon: <Article />,
        },
        {
          label: "Published Posts",
          value: data?.posts?.published ?? 0,
          icon: <EditNote />,
        },
        {
          label: "Total Views",
          value: data?.views?.total_views ?? 0,
          icon: <Visibility />,
        },
        {
          label: "Comments",
          value: data?.comments?.total ?? 0,
          icon: <Comment />,
        },
      ];

  const recentPosts = data?.recentPosts ?? data?.recent_posts ?? [];

  return (
    <Box>
      <PageHeader
        title="Overview"
        subtitle="Here's what's happening with your content."
        action
        actionLabel="Create post"
        onAction={() => navigate("/dashboard/posts")}
      />

      {error && (
        <Paper
          sx={{
            p: 2,
            mb: 3,
            borderColor: "error.light",
            bgcolor: "error.light",
          }}
        >
          <Typography color="error.main">{error}</Typography>
        </Paper>
      )}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, minmax(0, 1fr))",
            xl: "repeat(4, minmax(0, 1fr))",
          },
          gap: 2.5,
          mb: 3.5,
        }}
      >
        {cards.map((card, index) => {
          const style = cardStyles[index];

          return (
            <Paper
              key={card.label}
              elevation={0}
              sx={{
                p: 2.8,
                minHeight: 155,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                transition: "transform 0.2s ease, box-shadow 0.2s ease",
                "&:hover": {
                  transform: "translateY(-3px)",
                  boxShadow: "0 9px 24px rgba(35,35,80,0.08)",
                },
              }}
            >
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                spacing={2}
              >
                <Typography
                  variant="body2"
                  color="text.secondary"
                  fontWeight={600}
                >
                  {card.label}
                </Typography>

                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: "13px",
                    bgcolor: style.background,
                    color: style.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    "& .MuiSvgIcon-root": {
                      fontSize: 23,
                    },
                  }}
                >
                  {card.icon}
                </Box>
              </Stack>

              <Typography
                variant="h4"
                sx={{
                  mt: 2,
                  color: "text.primary",
                  fontWeight: 800,
                }}
              >
                {card.value}
              </Typography>
            </Paper>
          );
        })}
      </Box>

      <Paper elevation={0} sx={{ p: { xs: 2.5, sm: 3.5 } }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
          spacing={2}
          sx={{ mb: 2.5 }}
        >
          <Box>
            <Typography variant="h6" sx={{ mb: 0.5 }}>
              Recent posts
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Your latest content and publication activity.
            </Typography>
          </Box>

          <Button
            variant="outlined"
            endIcon={<ArrowForward />}
            onClick={() => navigate("/dashboard/posts")}
          >
            View all posts
          </Button>
        </Stack>

        {recentPosts.length === 0 ? (
          <Box
            sx={{
              py: 5,
              textAlign: "center",
              bgcolor: "#F8F8FC",
              borderRadius: 3,
            }}
          >
            <Article sx={{ fontSize: 34, color: "#A4A5B8", mb: 1 }} />
            <Typography fontWeight={600} sx={{ mb: 0.5 }}>
              No recent posts
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Your latest posts will appear here.
            </Typography>
          </Box>
        ) : (
          <Stack spacing={0}>
            {recentPosts.map((post) => (
              <Stack
                key={post.post_id ?? post.id}
                direction={{ xs: "column", sm: "row" }}
                justifyContent="space-between"
                alignItems={{ xs: "flex-start", sm: "center" }}
                spacing={1.5}
                sx={{
                  py: 2.2,
                  borderBottom: "1px solid",
                  borderColor: "divider",
                  "&:last-child": { borderBottom: "none" },
                }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography fontWeight={650} sx={{ mb: 0.5 }}>
                    {post.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {post.created_at
                      ? new Date(post.created_at).toLocaleDateString()
                      : "Date unavailable"}
                  </Typography>
                </Box>

                <Chip
                  size="small"
                  label={post.status || "Unknown"}
                  color={post.status === "published" ? "success" : "default"}
                  sx={{
                    fontWeight: 650,
                    textTransform: "capitalize",
                    borderRadius: 2,
                  }}
                />
              </Stack>
            ))}
          </Stack>
        )}
      </Paper>
    </Box>
  );
}
