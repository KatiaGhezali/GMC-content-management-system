import { useEffect, useState } from "react";
import {
  Grid,
  Paper,
  Typography,
  Box,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TextField,
  Button,
  Stack,
  Alert,
} from "@mui/material";

import api from "../../api/axios";
import PageHeader from "../../components/common/PageHeader";
import LoadingState from "../../components/common/LoadingState";

export default function Analytics() {
  const [dashboard, setDashboard] = useState(null);
  const [topPosts, setTopPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [dates, setDates] = useState({
    from: "",
    to: "",
  });

  const [views, setViews] = useState([]);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError("");

    try {
      const [dashboardResponse, postsResponse] = await Promise.all([
        api.get("/analytics/dashboard"),
        api.get("/analytics/posts/top", { params: { limit: 5 } }),
      ]);

      const dashboardData =
        dashboardResponse.data.data ?? dashboardResponse.data;

      const postsData = postsResponse.data.data ?? postsResponse.data;

      setDashboard(dashboardData);
      setTopPosts(Array.isArray(postsData) ? postsData : []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load analytics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchViews = async () => {
    try {
      const response = await api.get("/analytics/views", {
        params: {
          ...(dates.from && { from: dates.from }),
          ...(dates.to && { to: dates.to }),
        },
      });

      const result = response.data.data ?? response.data;
      setViews(Array.isArray(result) ? result : []);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load views.");
    }
  };

  if (loading) return <LoadingState message="Loading analytics..." />;

  const cards = [
    {
      label: "Total views",
      value: dashboard?.views?.total_views ?? 0,
    },
    {
      label: "Total posts",
      value: dashboard?.posts?.total ?? 0,
    },
    {
      label: "Published posts",
      value: dashboard?.posts?.published ?? 0,
    },
    {
      label: "Total comments",
      value: dashboard?.comments?.total ?? 0,
    },
  ];

  return (
    <>
      <PageHeader
        title="Analytics"
        subtitle="Monitor your content performance."
      />

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {cards.map((card) => (
          <Grid item xs={12} sm={6} lg={3} key={card.label}>
            <Paper elevation={0} sx={{ p: 3, border: "1px solid #EAEAF0" }}>
              <Typography color="text.secondary" mb={1}>
                {card.label}
              </Typography>
              <Typography variant="h4" fontWeight={700}>
                {card.value}
              </Typography>
            </Paper>
          </Grid>
        ))}

        <Grid item xs={12}>
          <Paper elevation={0} sx={{ p: 3, border: "1px solid #EAEAF0" }}>
            <Typography variant="h6" fontWeight={700} mb={2}>
              Daily views
            </Typography>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} mb={3}>
              <TextField
                type="date"
                label="From"
                InputLabelProps={{ shrink: true }}
                value={dates.from}
                onChange={(event) =>
                  setDates({ ...dates, from: event.target.value })
                }
              />

              <TextField
                type="date"
                label="To"
                InputLabelProps={{ shrink: true }}
                value={dates.to}
                onChange={(event) =>
                  setDates({ ...dates, to: event.target.value })
                }
              />

              <Button variant="contained" onClick={fetchViews}>
                Apply
              </Button>
            </Stack>

            {views.length === 0 ? (
              <Typography color="text.secondary">
                Select a date range to view daily traffic.
              </Typography>
            ) : (
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Views</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {views.map((item, index) => (
                    <TableRow key={item.date || index}>
                      <TableCell>{item.date}</TableCell>
                      <TableCell>
                        {item.views ?? item.total_views ?? 0}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper elevation={0} sx={{ p: 3, border: "1px solid #EAEAF0" }}>
            <Typography variant="h6" fontWeight={700} mb={2}>
              Top performing posts
            </Typography>

            {topPosts.length === 0 ? (
              <Typography color="text.secondary">
                No top posts are available yet.
              </Typography>
            ) : (
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Post</TableCell>
                    <TableCell>Views</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {topPosts.map((post, index) => (
                    <TableRow key={post.id || index}>
                      <TableCell>{post.title}</TableCell>
                      <TableCell>
                        {post.views ?? post.total_views ?? 0}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Paper>
        </Grid>
      </Grid>
    </>
  );
}
