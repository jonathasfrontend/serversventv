const express = require('express');
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();

const { corsOptions } = require('./config/cors')

const authRoutes = require('./routes/auth');
const channelsRoutes = require('./routes/channels');
const playlistsRoutes = require('./routes/playlists');
const liked = require('./routes/liked');
const favorite = require('./routes/favorites');
const guia = require('./routes/guia');
const users = require('./routes/user');
const metadata = require('./routes/metadata');
const analytics = require('./routes/analytics');

app.use(express.json());
// Outras importações e configurações...
// Aplique o middleware de CORS antes das rotas:
app.use(cors(corsOptions));
// Habilita tratamento de pré-requisições para todos os endpoints
app.options('*', cors(corsOptions));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true})); 
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');
app.use('/public', express.static(path.join(__dirname, 'public')));
app.set('views', path.join(__dirname, '/page'));

app.use('/auth', authRoutes);
app.use('/channels', channelsRoutes);
app.use('/playlists', playlistsRoutes);
app.use('/liked', liked);
app.use('/favorite', favorite);
app.use('/guiatv', guia);
app.use('/users', users);
app.use('/metadata', metadata);
app.use('/analytics', analytics);

app.get('/', (req, res) => {
    res.render('index');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} 🚀`);
});
