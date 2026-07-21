import cors from "cors";
import express from "express";

const app = express();
const port = Number(process.env.PORT || 3001);

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "payment-ops-api",
  });
});

app.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
});
