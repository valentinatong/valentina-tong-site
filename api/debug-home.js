// diagnóstico temporário — remover depois de descobrir o problema de acesso à base Home
const BASE = "appxMeAg3XIYX3nbB";
const API = "https://api.airtable.com/v0";

module.exports = async (req, res) => {
  const token = process.env.AIRTABLE_TOKEN;
  if (!token) { res.status(500).json({ error: "sem token" }); return; }
  const H = { Authorization: `Bearer ${token}` };

  const teste1 = await fetch(`${API}/${BASE}/Capa`, { headers: H });
  const corpo1 = await teste1.text();

  const teste2 = await fetch(`${API}/${BASE}/tabela_que_nao_existe_123`, { headers: H });
  const corpo2 = await teste2.text();

  res.status(200).json({
    tabela_Capa: { status: teste1.status, body: corpo1 },
    tabela_inexistente: { status: teste2.status, body: corpo2 },
  });
};
