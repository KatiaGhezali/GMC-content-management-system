import React from "react";
import ReactDOM from "react-dom/client";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import App from "./App";
import "./index.css";
import "./App.css";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#5146B8",
      light: "#EEECFF",
      dark: "#39318C",
      contrastText: "#FFFFFF",
    },
    secondary: {
      main: "#8B7CE8",
      light: "#F1EEFF",
      dark: "#6555C0",
    },
    background: {
      default: "#F6F7FC",
      paper: "#FFFFFF",
    },
    text: {
      primary: "#20223A",
      secondary: "#777B93",
    },
    divider: "#EAEBF3",
    success: {
      main: "#269B76",
      light: "#E6F6EF",
    },
    warning: {
      main: "#D99536",
      light: "#FFF4E3",
    },
    error: {
      main: "#D65B6D",
      light: "#FCECEF",
    },
  },
  shape: {
    borderRadius: 14,
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Arial", sans-serif',
    h4: {
      fontWeight: 750,
      letterSpacing: "-0.7px",
    },
    h5: {
      fontWeight: 750,
      letterSpacing: "-0.4px",
    },
    h6: {
      fontWeight: 700,
      letterSpacing: "-0.2px",
    },
    subtitle1: {
      fontWeight: 600,
    },
    button: {
      fontWeight: 650,
      textTransform: "none",
    },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          border: "1px solid #EAEBF3",
          borderRadius: 16,
          boxShadow: "0 3px 14px rgba(35, 35, 80, 0.035)",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          padding: "9px 17px",
          boxShadow: "none",
        },
        contained: {
          boxShadow: "0 3px 8px rgba(81, 70, 184, 0.18)",
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 10,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          backgroundColor: "#F7F7FC",
          color: "#656982",
          fontWeight: 700,
        },
        root: {
          borderColor: "#EAEBF3",
        },
      },
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </React.StrictMode>,
);
