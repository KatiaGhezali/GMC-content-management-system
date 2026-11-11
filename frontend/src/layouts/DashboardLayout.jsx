import { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Avatar,
  Divider,
  Menu,
  MenuItem,
  Tooltip,
} from "@mui/material";

import {
  Dashboard,
  Article,
  Category,
  LocalOffer,
  Comment,
  PermMedia,
  Analytics,
  Menu as MenuIcon,
  Logout,
  ExpandMore,
} from "@mui/icons-material";

const drawerWidth = 260;

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);

  const isManager = ["admin", "editor"].includes(user?.role);

  const navigation = [
    { label: "Overview", path: "/dashboard", icon: <Dashboard /> },
    { label: "Posts", path: "/dashboard/posts", icon: <Article /> },
    { label: "Media Library", path: "/dashboard/media", icon: <PermMedia /> },
    ...(isManager
      ? [
          {
            label: "Categories",
            path: "/dashboard/categories",
            icon: <Category />,
          },
          { label: "Tags", path: "/dashboard/tags", icon: <LocalOffer /> },
          { label: "Comments", path: "/dashboard/comments", icon: <Comment /> },
          {
            label: "Analytics",
            path: "/dashboard/analytics",
            icon: <Analytics />,
          },
        ]
      : []),
  ];
  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const displayName =
    user?.firstName || user?.first_name || user?.username || "User";

  const drawer = (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        bgcolor: "#FFFFFF",
      }}
    >
      <Box sx={{ px: 3, pt: 3.5, pb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              width: 42,
              height: 42,
              borderRadius: "13px",
              bgcolor: "primary.main",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
              fontWeight: 800,
              boxShadow: "0 5px 12px rgba(81,70,184,0.22)",
            }}
          >
            E
          </Box>

          <Box>
            <Typography
              variant="h6"
              sx={{ fontWeight: 800, letterSpacing: "-0.5px", lineHeight: 1.2 }}
            >
              EduCMS
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ letterSpacing: "0.2px" }}
            >
              Content workspace
            </Typography>
          </Box>
        </Box>
      </Box>

      <Divider />

      <Box sx={{ px: 3, pt: 3, pb: 1 }}>
        <Typography
          variant="overline"
          sx={{
            color: "#9A9CB0",
            fontWeight: 700,
            letterSpacing: "1.1px",
          }}
        >
          WORKSPACE
        </Typography>
      </Box>

      <List sx={{ px: 2, pt: 1, flexGrow: 1 }}>
        {navigation.map((item) => {
          const active =
            item.path === "/dashboard"
              ? location.pathname === item.path
              : location.pathname.startsWith(item.path);

          return (
            <ListItemButton
              key={item.path}
              selected={active}
              onClick={() => {
                navigate(item.path);
                setMobileOpen(false);
              }}
              sx={{
                minHeight: 48,
                borderRadius: "11px",
                mb: 0.7,
                px: 1.5,
                color: active ? "primary.dark" : "#73768D",
                bgcolor: active ? "#F0EEFF" : "transparent",
                transition: "all 0.2s ease",
                "&:hover": {
                  bgcolor: active ? "#F0EEFF" : "#F7F7FC",
                },
                "&.Mui-selected": {
                  bgcolor: "#F0EEFF",
                  color: "primary.dark",
                  "&:hover": {
                    bgcolor: "#EAE7FF",
                  },
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 40,
                  color: active ? "primary.main" : "#9295A9",
                  "& .MuiSvgIcon-root": {
                    fontSize: 21,
                  },
                }}
              >
                {item.icon}
              </ListItemIcon>

              <ListItemText
                primary={item.label}
                primaryTypographyProps={{
                  fontSize: 14,
                  fontWeight: active ? 700 : 550,
                }}
              />

              {active && (
                <Box
                  sx={{
                    width: 5,
                    height: 22,
                    borderRadius: 5,
                    bgcolor: "primary.main",
                    position: "absolute",
                    right: 0,
                  }}
                />
              )}
            </ListItemButton>
          );
        })}
      </List>

      <Box sx={{ px: 2, pb: 2 }}>
        <Box
          sx={{
            bgcolor: "#F7F6FD",
            borderRadius: 3,
            p: 1.5,
            display: "flex",
            alignItems: "center",
            gap: 1.2,
            mb: 1.5,
          }}
        >
          <Avatar
            sx={{
              width: 36,
              height: 36,
              bgcolor: "#E4E0FF",
              color: "#5146B8",
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            {displayName[0].toUpperCase()}
          </Avatar>

          <Box sx={{ minWidth: 0 }}>
            <Typography fontSize={13} fontWeight={700} noWrap>
              {displayName}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ textTransform: "capitalize" }}
            >
              {user?.role || "Member"}
            </Typography>
          </Box>
        </Box>

        <ListItemButton
          onClick={handleLogout}
          sx={{
            borderRadius: 2,
            color: "#85879B",
            minHeight: 43,
            "&:hover": {
              bgcolor: "#FCECEF",
              color: "error.main",
            },
          }}
        >
          <ListItemIcon sx={{ minWidth: 38, color: "inherit" }}>
            <Logout fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="Sign out"
            primaryTypographyProps={{ fontSize: 14, fontWeight: 600 }}
          />
        </ListItemButton>
      </Box>
    </Box>
  );

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        bgcolor: "background.default",
      }}
    >
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          bgcolor: "rgba(255,255,255,0.92)",
          color: "text.primary",
          borderBottom: "1px solid #EAEBF3",
          backdropFilter: "blur(12px)",
        }}
      >
        <Toolbar sx={{ minHeight: "70px !important", px: { xs: 2, md: 4 } }}>
          <IconButton
            onClick={() => setMobileOpen(true)}
            sx={{ display: { md: "none" }, mr: 2 }}
          >
            <MenuIcon />
          </IconButton>

          <Box sx={{ flexGrow: 1 }}>
            <Typography fontWeight={700} fontSize={15}>
              Workspace
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Manage your educational content
            </Typography>
          </Box>

          <Tooltip title="Account settings">
            <IconButton
              onClick={(event) => setAnchorEl(event.currentTarget)}
              sx={{
                borderRadius: 3,
                gap: 1,
                px: 1,
                py: 0.5,
                "&:hover": { bgcolor: "#F5F4FC" },
              }}
            >
              <Avatar
                sx={{
                  width: 35,
                  height: 35,
                  bgcolor: "#E4E0FF",
                  color: "#5146B8",
                  fontWeight: 700,
                  fontSize: 14,
                }}
              >
                {displayName[0].toUpperCase()}
              </Avatar>
              <ExpandMore sx={{ color: "text.secondary", fontSize: 19 }} />
            </IconButton>
          </Tooltip>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
            PaperProps={{
              sx: { minWidth: 190, mt: 1, borderRadius: 3 },
            }}
          >
            <MenuItem disabled sx={{ fontSize: 13 }}>
              {user?.email || user?.username}
            </MenuItem>
            <Divider />
            <MenuItem
              onClick={() => {
                setAnchorEl(null);
                handleLogout();
              }}
              sx={{ color: "error.main", gap: 1 }}
            >
              <Logout fontSize="small" /> Sign out
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: "block", md: "none" },
            "& .MuiDrawer-paper": {
              width: drawerWidth,
              boxSizing: "border-box",
            },
          }}
        >
          {drawer}
        </Drawer>

        <Drawer
          variant="permanent"
          open
          sx={{
            display: { xs: "none", md: "block" },
            "& .MuiDrawer-paper": {
              width: drawerWidth,
              boxSizing: "border-box",
              border: "none",
              borderRight: "1px solid #EAEBF3",
            },
          }}
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          p: { xs: 2, sm: 3, md: 4 },
          mt: "70px",
          minWidth: 0,
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}
