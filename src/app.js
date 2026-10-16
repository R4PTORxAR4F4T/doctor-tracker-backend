const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const compression = require("compression");
const rateLimit = require("express-rate-limit");

const env = require("./config/env");
const ApiError = require("./utils/ApiError");
const routes = require("./routes");
const { notFound, errorHandler } = require("./middleware/error");

const app = express();

app.set("trust proxy", 1); // Render / Vercel sit behind a proxy; needed for correct client IPs
app.disable("x-powered-by");

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      // No Origin header = server-to-server call (e.g. the Next.js proxy) or curl.
      if (!origin || env.clientUrls.includes(origin))
        return callback(null, true);
      return callback(new ApiError(403, "Origin not allowed by CORS"));
    },
  }),
);
app.use(compression());
app.use(express.json({ limit: "100kb" }));
if (env.nodeEnv !== "test")
  app.use(morgan(env.nodeEnv === "production" ? "combined" : "dev"));

app.use(
  "/api",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 1000,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many requests, please slow down" },
  }),
);

app.get("/", (req, res) =>
  res.json({ name: "Doctor Tracker API", status: "ok", docs: "/api/health" }),
);
app.use("/api", routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
