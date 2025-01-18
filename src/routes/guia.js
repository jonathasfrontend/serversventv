const express = require('express');
const axios = require('axios');
const router = express.Router();

// Função auxiliar para obter a data formatada no padrão ISO de hoje à meia-noite até o final do dia
const getFormattedDateRange = () => {
  const today = new Date();
  const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
  const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();
  return { startOfDay, endOfDay };
};

router.get('/canais-programacao', async (req, res) => {
  try {
    // URLs das APIs
    const canaisUrl =
      'https://programacao.claro.com.br/gatekeeper/canal/select?q=id_cidade:210&wt=json&rows=600&start=0&sort=cn_canal+asc&fl=id_canal+st_canal+cn_canal+nome+url_imagem+id_cidade&fq=nome:*&fq=id_categoria:*';

    // Buscar os canais
    const canaisResponse = await axios.get(canaisUrl);
    const canais = canaisResponse.data.response.docs;

    // Montar a URL para a programação
    const idsCanais = canais.map((canal) => canal.id_canal).join('+');
    const { startOfDay, endOfDay } = getFormattedDateRange();
    const programacaoUrl = `https://programacao.claro.com.br/gatekeeper/exibicao/select?q=id_canal:(${idsCanais})+AND+id_cidade:210&wt=json&rows=100000&start=0&sort=id_canal+asc,dh_inicio+asc&fl=dh_fim+dh_inicio+st_titulo+titulo+id_programa+id_canal+id_cidade&fq=dh_inicio:%5B${startOfDay}+TO+${endOfDay}%5D`;

    // Buscar a programação
    const programacaoResponse = await axios.get(programacaoUrl);
    const programacao = programacaoResponse.data.response.docs;

    // Hora atual
    const currentTime = new Date().toISOString();

    // Processar canais com programação
    const canaisComProgramacao = canais.map((canal) => {
      // Filtrar a programação do canal
      const programacaoDoCanal = programacao
        .filter((p) => p.id_canal === canal.id_canal)
        .sort((a, b) => Date.parse(a.dh_inicio) - Date.parse(b.dh_inicio)); // Garantir ordenação por horário de início

      // Programação atual e índice
      const atualIndex = programacaoDoCanal.findIndex(
        (p) =>
          Date.parse(p.dh_inicio) <= Date.parse(currentTime) &&
          Date.parse(p.dh_fim) > Date.parse(currentTime)
      );

      // Programação atual
      const atual = atualIndex > 1 ? programacaoDoCanal.slice(atualIndex - 2, atualIndex) : null;

      // Programações próximas
      const proximas = atualIndex > 1 ? programacaoDoCanal.slice(atualIndex - 2, atualIndex) : null;

      return {
        id_canal: canal.id_canal,
        nome: canal.nome,
        url_imagem: canal.url_imagem,
        programacao_atual: atual
          ? {
              titulo: atual[0].titulo,
              inicio: atual[0].dh_inicio,
              fim: atual[0].dh_fim,
            }
          : { mensagem: 'Nenhuma programação no momento' },
        programacao_proximas: proximas
        ? {
            titulo: proximas[1].titulo,
            inicio: proximas[1].dh_inicio,
            fim: proximas[1].dh_fim,
          }
        : { mensagem: 'Nenhuma programação no momento' },
      };
    });

    res.json(canaisComProgramacao);
  } catch (error) {
    console.error('Erro ao buscar os dados:', error.message);
    res.status(500).json({ error: 'Erro ao buscar os dados' });
  }
});

module.exports = router;
