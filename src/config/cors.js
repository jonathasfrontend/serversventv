// Definindo a whitelist com expressões regulares
const whitelist = [
  /^https:\/\/.*\.vercel\.app$/, // Aceita qualquer subdomínio de vercel.app com HTTPS
  /^http:\/\/localhost:5173$/     // Aceita exatamente localhost na porta 5173
];

const corsOptions = {
  origin: (origin, callback) => {
    // Permitir requisições sem origem (ex.: requisições via cURL ou Postman)
    if (!origin) return callback(null, true);
    // Verifica se a origem bate com alguma expressão da whitelist
    if (whitelist.some((regex) => regex.test(origin))) {
      return callback(null, true);
    } else {
      return callback(new Error('Não permitido por CORS'));
    }
  },
  methods: ["GET", "POST", "DELETE", "PUT", "OPTIONS"],
  // Definindo cabeçalhos permitidos, caso a requisição envie outros headers personalizados
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  credentials: true, // Se você precisar enviar cookies ou autenticação
};

module.exports = { corsOptions };
