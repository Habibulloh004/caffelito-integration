const express = require("express");
const axios = require("axios");
const router = express.Router();

router.options("/", (req, res) => {
  res.set({
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  });
  res.status(200).json({});
});

router.get("/", async (req, res) => {
  const { code, account } = req.query;

  if (!code || !account) {
    return res.status(400).send("No code or account provided");
  }

  const auth = {
    application_id: "4164",
    application_secret: "1dde40dbeaf227f70997e183eafa6685",
    code,
    account,
  };

  const formData = new URLSearchParams();
  formData.append("application_id", auth.application_id);
  formData.append("application_secret", auth.application_secret);
  formData.append("grant_type", "authorization_code");
  formData.append(
    "redirect_uri",
    `${process.env.BASE_URL}/api/auth`
  );
  formData.append("code", auth.code);

  try {
    const response = await axios.post(
      `https://${auth.account}.joinposter.com/api/v2/auth/access_token`,
      formData,
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const data = response.data;
    if (!data.access_token) {
      return res.status(400).send("No access token in response");
    }

    const expiresIn = new Date();
    expiresIn.setDate(expiresIn.getDate() + 10); // Expire in 10 days
    res.cookie("authToken", data.access_token, {
      expires: expiresIn,
      path: "/",
      httpOnly: true, // Secure the cookie
      secure: process.env.NODE_ENV === "production", // Enable secure only in production
    });

    res.redirect(`${process.env.BASE_URL}/?token=${data.access_token}`);
  } catch (error) {
    console.error("Error exchanging code for access token:", error.message);
    res.status(500).send("Internal server error");
  }
});

module.exports = router;
