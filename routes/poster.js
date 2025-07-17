const express = require('express');
const axios = require('axios');
const router = express.Router();

router.get('/fetch-export-data', async (req, res) => {
  const { token, dateFrom, dateTo } = req.query;

  if (!token || !dateFrom || !dateTo) {
    console.error('Missing parameters in fetch-export-data:', { token, dateFrom, dateTo });
    return res.status(400).json({ error: 'Token, dateFrom, and dateTo are required' });
  }

  try {
    const base = 'https://joinposter.com/api';
    const url = (endpoint) => `${base}/${endpoint}?token=${token}&dateFrom=${dateFrom}&dateTo=${dateTo}`;

    const [suppliesRes, movesRes, wastesRes] = await Promise.all([
      axios.get(url('storage.getSupplies')).catch(err => {
        throw new Error(`Failed to fetch supplies: ${err.message}`);
      }),
      axios.get(url('storage.getMoves')).catch(err => {
        throw new Error(`Failed to fetch moves: ${err.message}`);
      }),
      axios.get(url('storage.getWastes')).catch(err => {
        throw new Error(`Failed to fetch wastes: ${err.message}`);
      }),
    ]);

    res.json({
      suppliesData: suppliesRes.data.response ?? [],
      movesData: movesRes.data.response ?? [],
      wastesData: wastesRes.data.response ?? [],
    });
  } catch (error) {
    console.error('Error in fetch-export-data:', error.message, error.stack);
    res.status(500).json({ error: 'Failed to fetch export data', details: error.message });
  }
});

router.get('/fetch-poster-api', async (req, res) => {
  const { token, endpoint, ...params } = req.query;

  if (!token || !endpoint) {
    console.error('Missing parameters in fetch-poster-api:', { token, endpoint });
    return res.status(400).json({ error: 'Token and endpoint are required' });
  }

  try {
    const base = 'https://joinposter.com/api';
    const url = new URL(`${base}/${endpoint}`);
    url.searchParams.set('token', token);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });

    const response = await axios.get(url.toString()).catch(err => {
      throw new Error(`Failed to fetch ${endpoint}: ${err.message}`);
    });

    if (response.status !== 200) {
      throw new Error(`Error fetching data from Poster API: ${response.statusText}`);
    }

    res.json(response.data);
  } catch (error) {
    console.error('Error in fetch-poster-api:', error.message, error.stack);
    res.status(500).json({ error: 'Failed to fetch Poster API data', details: error.message });
  }
});

module.exports = router;