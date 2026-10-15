
require('dotenv').config();

const { TikTokLiveConnection } = require('tiktok-live-connector');

const API = 'https://dice-live-api.fabriciovid23.workers.dev';
const SECRET = process.env.API_SECRET;

const INTERVALO = 5 * 60 * 1000; // 5 minutos
let verificando = false;

async function consultarStreamer(streamer) {
  const usuario = streamer.tiktok_username;

  try {
    const conexao = new TikTokLiveConnection(usuario, {
      processInitialData: false,
      fetchRoomInfoOnConnect: false
    });

    const resultado = await conexao.fetchIsLive();

    if (typeof resultado !== 'boolean') {
      console.log(`⚠️ @${usuario}: resultado inconclusivo`);
      return;
    }

    console.log(
      `${resultado ? '🔴 AO VIVO' : '⚫ OFFLINE'}: @${usuario}`
    );

    const resposta = await fetch(`${API}/api/update`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SECRET}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        streamer_id: streamer.streamer_id,
        tiktok_username: usuario,
        is_live: resultado
      }),
      signal: AbortSignal.timeout(15000)
    });

    if (!resposta.ok) {
      throw new Error(`Erro na API: HTTP ${resposta.status}`);
    }

    console.log(`✅ Banco atualizado: @${usuario}`);
  } catch (erro) {
    console.log(`❌ @${usuario}: ${erro.message}`);
    console.log('Status anterior preservado.');
  }
}

async function verificarTodos() {
  if (verificando) return;
  verificando = true;

  console.log('\n--- Verificando streamers ---');

  try {
    const resposta = await fetch(`${API}/api/live`, {
      signal: AbortSignal.timeout(15000)
    });

    if (!resposta.ok) {
      throw new Error(`Erro ao consultar API: ${resposta.status}`);
    }

    const dados = await resposta.json();

    if (!Array.isArray(dados.streamers)) {
      throw new Error('Lista de streamers inválida');
    }

    console.log(`Streamers cadastrados: ${dados.streamers.length}`);

    for (const streamer of dados.streamers) {
      await consultarStreamer(streamer);
    }
  } catch (erro) {
    console.log('❌ Erro geral:', erro.message);
  } finally {
    verificando = false;
  }
}

if (!SECRET) {
  console.error('❌ API_SECRET não encontrado no arquivo .env');
  process.exit(1);
}

verificarTodos();
setInterval(verificarTodos, INTERVALO);
