const whitelist = ['https://*.vercel.app','http://localhost:5173/'];

const corsOptions = {
  origin: function (origin, callback) {
    if (whitelist.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Não permitido por CORS'));
    }
  },
  methods: ['GET', 'PUT', 'POST', 'DELETE']
};

module.exports = { corsOptions };