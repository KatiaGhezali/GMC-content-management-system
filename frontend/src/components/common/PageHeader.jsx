import { Box, Typography, Button } from "@mui/material";

export default function PageHeader({
  title,
  subtitle,
  action,
  actionLabel,
  onAction,
}) {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: { xs: "flex-start", sm: "center" },
        flexWrap: "wrap",
        gap: 2,
        mb: 4,
      }}
    >
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
          {title}
        </Typography>
        <Typography color="text.secondary">{subtitle}</Typography>
      </Box>

      {action && (
        <Button variant="contained" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </Box>
  );
}
