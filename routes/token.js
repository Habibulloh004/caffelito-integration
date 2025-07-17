const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const router = express.Router();

router.get('/', async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ error: 'Code is required' });
  }

  const application_id = '4164';
  const application_secret = '1dde40dbeaf227f70997e183eafa6685';
  const verifyString = `${application_id}:${application_secret}:${code}`;
  const verify = crypto.createHash('md5').update(verifyString).digest('hex');

  const formBody = new URLSearchParams({
    application_id,
    application_secret,
    code,
    verify,
  });

  try {
    const response = await axios.post('https://joinposter.com/api/v2/auth/manage', formBody, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const data = response.data;
    if (!data.access_token) {
      return res.status(401).json({ error: 'Could not get token', message: data.message || 'Unknown error' });
    }

    res.json({ token: data.access_token, status: 'ok' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;