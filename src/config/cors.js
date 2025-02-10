// Definindo os origins permitidos usando regex
const allowedOrigins = [
  /^https:\/\/.*\.vercel\.app$/, // permite qualquer subdomínio que termine em .vercel.app via HTTPS
  /^http:\/\/localhost:5173$/     // permite exatamente http://localhost:5173
];

const corsOptions = {
  origin: function (origin, callback) {
    // Caso não haja origin (ex.: requisições de mesmo domínio ou de ferramentas como Postman)
    if (!origin) {
      return callback(null, true);
    }
    // Verifica se o origin bate com algum dos padrões permitidos
    if (allowedOrigins.some((regex) => regex.test(origin))) {
      return callback(null, true);
    } else {
      return callback(new Error('Não permitido por CORS'));
    }
  },
  methods: ["GET", "POST", "DELETE", "PUT", "OPTIONS"]
};

module.exports = { corsOptions };
