const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Emergency backend running' });
});

app.get('/api/auth/me', (req, res) => {
  res.json({ success: true, user: null });
});

app.get('/api/theaters', (req, res) => {
  res.json({ success: true, data: [] });
});

app.use('/api/*', (req, res) => {
  res.json({ success: true, message: 'API ready' });
});

app.listen(PORT, () => {
  console.log('Emergency backend running on port', PORT);
});
