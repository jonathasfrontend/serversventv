const whitelist = [
  /^https:\/\/.*\.vercel\.app$/, // Qualquer subdomínio que termine com .vercel.app
  /^http:\/\/localhost:5173$/,   // localhost exatamente na porta 5173
  /^http:\/\/localhost:5174$/    // localhost exatamente na porta 5173
];

const corsOptions = {
  origin: function (origin, callback) {
    // Se não houver origem (por exemplo, em requisições via Postman ou similares), permite.
    if (!origin) {
      return callback(null, true);
    }

    // Verifica se alguma das regex da whitelist casa com a origem
    const isWhitelisted = whitelist.some((pattern) => pattern.test(origin));

    if (isWhitelisted) {
      callback(null, true);
    } else {
      callback(new Error('Não permitido por CORS'));
    }
  },
  methods: ["GET", "POST", "DELETE", "PUT", "OPTIONS"]
};

module.exports = { corsOptions };
