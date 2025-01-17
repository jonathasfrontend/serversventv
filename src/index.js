const express = require('express');
const cors = require('cors');
const { corsConfig } = require('./config/cors')

const authRoutes = require('./routes/auth');
const channelsRoutes = require('./routes/channels');
const playlistsRoutes = require('./routes/playlists');
const liked = require('./routes/liked');
const favorite = require('./routes/favorites');

const app = express();

app.use(express.json());
app.use(cors(corsConfig));

app.use('/auth', authRoutes);
app.use('/channels', channelsRoutes);
app.use('/playlists', playlistsRoutes);
app.use('/liked', liked);
app.use('/favorite', favorite);


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} 🚀`);
});
