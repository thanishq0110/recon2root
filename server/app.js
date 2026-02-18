require('dotenv').config();
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const cors = require('cors');

const { apiLimiter } = require('./middleware/rateLimiter');

const authRoutes = require('./routes/auth');
const winnersRoutes = require('./routes/winners');
const photosRoutes = require('./routes/photos');
const videosRoutes = require('./routes/videos');
const certificatesRoutes = require('./routes/certificates');
const contentRoutes = require('./routes/content');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);

app.use(cors({ origin: false }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Serve public site
app.use(express.static(path.join(__dirname, '../public')));

// API routes
app.use('/api', apiLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/winners', winnersRoutes);
app.use('/api/photos', photosRoutes);
app.use('/api/videos', videosRoutes);
app.use('/api/certificates', certificatesRoutes);
app.use('/api/content', contentRoutes);

// SPA fallback — serve index.html for all non-API routes
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Global error handler
app.use((err, _req, res, _next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File too large' });
  }
  if (err.message?.includes('Only')) {
    return res.status(400).json({ error: err.message });
  }
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🚀 Recon2Root server running on port ${PORT}`);
});

module.exports = app;
