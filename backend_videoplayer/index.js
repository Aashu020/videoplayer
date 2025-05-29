const express = require('express');
const cors = require('cors');
const connectDB = require('./db/db.js');
const authRoutes = require('./routes/auth.js');
const videoRoutes = require('./routes/video.js');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/video', videoRoutes);

connectDB();
app.listen(process.env.PORT, () => console.log(`Server is running on port ${process.env.PORT}`));
