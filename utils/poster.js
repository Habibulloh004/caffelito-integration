const axios = require('axios');

async function fetchExportData(token, from, to) {
  const base = 'https://joinposter.com/api';
  const url = (endpoint) => `${base}/${endpoint}?token=${token}&dateFrom=${from}&dateTo=${to}`;

  const [suppliesRes, movesRes, wastesRes] = await Promise.all([
    axios.get(url('storage.getSupplies')),
    axios.get(url('storage.getMoves')),
    axios.get(url('storage.getWastes')),
  ]);

  return {
    suppliesData: suppliesRes.data.response ?? [],
    movesData: movesRes.data.response ?? [],
    wastesData: wastesRes.data.response ?? [],
  };
}

async function fetchPosterApi(token, endpoint, params = {}) {
  const base = 'https://joinposter.com/api';
  const url = new URL(`${base}/${endpoint}`);
  url.searchParams.set('token', token);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const response = await axios.get(url.toString());
  if (!response.status === 200) {
    throw new Error(`Error fetching data from Poster API: ${response.statusText}`);
  }

  return response.data;
}

module.exports = { fetchExportData, fetchPosterApi };