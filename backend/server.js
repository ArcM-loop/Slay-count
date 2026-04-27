require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const authRoutes = require('./routes/authRoutes');

const app = express();

app.use(cors());
app.use(express.json());

// (2) Rate Limiting pada rute /auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 20, // Batasi 20 request per IP untuk endpoint auth
  message: { error: 'Terlalu banyak percobaan login, silakan coba lagi nanti.' }
});

app.use('/auth', authLimiter, authRoutes);

// Endpoint dasar untuk testing
app.get('/', (req, res) => {
  res.send('SlayCount API Running');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
