const express = require("express");
const path = require("path");
const authRoutes = require("./routes/auth");
const tokenRoutes = require("./routes/token");
const posterRoutes = require("./routes/poster");
const cookieParser = require("cookie-parser");
const dotenv = require("dotenv");
dotenv.config();

const app = express();

// Middleware
app.use((req, res, next) => {
  res.set({
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  next();
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use((req, res, next) => {
  const originalSend = res.send;
  res.send = function (body) {
    if (typeof body === "string" && body.includes("</body>")) {
      const script = `
        <script>
          window.addEventListener('load', function () {
            top.postMessage({ hideSpinner: true }, '*');
          }, false);
        </script>
      `;
      body = body.replace("</body>", `${script}</body>`);
    }
    originalSend.call(this, body);
  };
  next();
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/token", tokenRoutes);
app.use("/api/poster", posterRoutes);

app.get("/getToken", (req, res) => {
  if (req?.cookies?.authToken) {
    res.send({ token: req?.cookies?.authToken });
  } else {
    res.send({ token: null });
  }
});

// Asosiy sahifa
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});


const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server ${PORT}-portda ishlamoqda`);
});