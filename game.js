const TEMPO = 90;
const BUFFER_SIZE = 10;
const MAX_TURNOS = 10; // 5 por time

let g = {
  pontos: { A: 0, B: 0 },
  turno: null,      // 'A' | 'B'
  ativo: false,
  seg: TEMPO,
  ivl: null,
  turnoNum: 0,
  usadas: new Set(),
  buffer: { A: [], B: [] },
  cartaIdx: { A: null, B: null },
};

// ── BUFFER ──────────────────────────

function sortear() {
  const excluir = new Set(g.usadas);
  for (const i of g.usadas) {
    excluir.add(i - 1);
    excluir.add(i + 1);
  }
  const disp = [];
  for (let i = 0; i < CARTAS.length; i++) {
    if (!excluir.has(i)) disp.push(i);
  }
  if (!disp.length) return null;
  return disp[Math.floor(Math.random() * disp.length)];
}

function encherBuffer(time) {
  while (g.buffer[time].length < BUFFER_SIZE) {
    const i = sortear();
    if (i === null) break;
    g.usadas.add(i); // reserva globalmente
    g.buffer[time].push(i);
  }
}

function proximaCartaIdx(time) {
  let idx;
  if (g.buffer[time].length) {
    idx = g.buffer[time].shift();
  } else {
    idx = sortear();
    if (idx === null) return null;
    g.usadas.add(idx);
  }
  g.cartaIdx[time] = idx;
  setTimeout(() => encherBuffer(time), 0); // reabastece em background
  return idx;
}

function mostrarCarta(time) {
  const idx = proximaCartaIdx(time);
  const pp  = document.getElementById('palavraPrincipal');
  const tl  = document.getElementById('tabooLista');
  const div = document.getElementById('divisor');

  if (idx === null) {
    pp.textContent = 'SEM PALAVRAS';
    pp.className = 'palavra-principal aguardando';
    tl.innerHTML = '';
    div.style.opacity = '0';
    return;
  }

  const c = CARTAS[idx];
  pp.textContent = c[0];
  pp.className = 'palavra-principal';
  div.style.opacity = '1';
  tl.innerHTML = c.slice(1).map(p => `<div class="taboo-palavra">${p}</div>`).join('');
}

// ── TIMER ────────────────────────────

function startTimer() {
  g.seg = TEMPO;
  renderTimer();
  g.ivl = setInterval(() => {
    g.seg--;
    renderTimer();
    if (g.seg <= 0) { clearInterval(g.ivl); fimTurno(); }
  }, 1000);
}

function renderTimer() {
  const d = document.getElementById('timerDisplay');
  const p = document.getElementById('timerProg');
  d.textContent = g.seg;
  p.style.width = (g.seg / TEMPO * 100) + '%';
  if (g.seg <= 10) {
    d.className = 'timer-numero danger';
    p.className = 'timer-prog danger';
  } else {
    d.className = 'timer-numero ok';
    p.className = 'timer-prog';
  }
}

// ── FLUXO ────────────────────────────

function iniciarTurno() {
  g.turnoNum++;
  g.turno = g.turnoNum % 2 === 1 ? 'A' : 'B';
  g.ativo = true;

  document.getElementById('btnErrou').disabled = false;
  document.getElementById('btnAcertou').disabled = false;
  document.getElementById('btnIniciar').style.display = 'none';

  const logo = document.querySelector('.logo');
  logo.textContent = `TIME ${g.turno} JOGANDO`;
  logo.className = `logo ${g.turno === 'A' ? 'azul' : 'laranja'}`;

  mostrarCarta(g.turno);
  startTimer();
}

function fimTurno() {
  g.ativo = false;
  document.getElementById('btnErrou').disabled = true;
  document.getElementById('btnAcertou').disabled = true;

  // Limpa exibição
  const pp = document.getElementById('palavraPrincipal');
  pp.textContent = 'TABOO';
  pp.className = 'palavra-principal aguardando';
  document.getElementById('tabooLista').innerHTML = '';
  document.getElementById('divisor').style.opacity = '0';

  // Reset timer UI
  document.getElementById('timerDisplay').textContent = TEMPO;
  document.getElementById('timerDisplay').className = 'timer-numero idle';
  document.getElementById('timerProg').style.width = '100%';
  document.getElementById('timerProg').className = 'timer-prog';

  if (g.turnoNum >= MAX_TURNOS) {
    setTimeout(mostrarFim, 300);
    return;
  }

  const proximo = g.turno === 'A' ? 'B' : 'A';
  document.getElementById('btnIniciar').textContent = `INICIAR RODADA — TIME ${proximo}`;
  document.getElementById('btnIniciar').style.display = '';

  const logo = document.querySelector('.logo');
  logo.textContent = 'TABOO';
  logo.className = 'logo';
}

function registrar(tipo) {
  if (!g.ativo) return;

  const time = g.turno;
  const adversario = time === 'A' ? 'B' : 'A';
  const cartaIdx = g.cartaIdx[time];
  const carta = cartaIdx !== null ? CARTAS[cartaIdx] : null;
  const palavra = carta ? carta[0] : '?';
  const taboos = carta ? carta.slice(1) : [];

  if (tipo === 'acerto') {
    g.pontos[time]++;
    document.getElementById(`placar${time}`).textContent = g.pontos[time];
    adicionarLog('acerto', time, palavra, taboos);
  } else {
    // Errou → +1 para o adversário, sem penalidade no próprio time
    g.pontos[adversario]++;
    document.getElementById(`placar${adversario}`).textContent = g.pontos[adversario];
    adicionarLog('errou', time, palavra, taboos);
  }

  mostrarCarta(time);
}

function adicionarLog(tipo, time, palavra, taboos) {
  const lista = document.getElementById('logLista');
  const item = document.createElement('div');
  item.className = `log-item ${tipo}`;
  const tabooTxt = taboos.length ? ` <span class="log-taboos">(${taboos.join(', ')})</span>` : '';

  if (tipo === 'acerto') {
    item.innerHTML = `<span class="log-badge">Time ${time}</span> Acertou <b>${palavra}</b>${tabooTxt}`;
  } else {
    item.innerHTML = `<span class="log-badge">Time ${time}</span> Errou <b>${palavra}</b>${tabooTxt}`;
  }

  lista.prepend(item);
}

function mostrarFim() {
  const { A, B } = g.pontos;
  let txt, cor;
  if (A > B)      { txt = 'TIME A VENCE!'; cor = 'var(--azul)'; }
  else if (B > A) { txt = 'TIME B VENCE!'; cor = 'var(--laranja)'; }
  else            { txt = 'EMPATE!';        cor = '#555'; }

  document.getElementById('modalVencedor').textContent = txt;
  document.getElementById('modalVencedor').style.color = cor;
  document.getElementById('modalPlacar').innerHTML =
    `Time A: <b>${A}</b> &nbsp;·&nbsp; Time B: <b>${B}</b>`;
  document.getElementById('modalOverlay').classList.add('show');
}

function resetarJogo() {
  clearInterval(g.ivl);
  document.getElementById('modalOverlay').classList.remove('show');

  g = {
    pontos: { A: 0, B: 0 },
    turno: null, ativo: false,
    seg: TEMPO, ivl: null,
    turnoNum: 0,
    usadas: new Set(),
    buffer: { A: [], B: [] },
    cartaIdx: { A: null, B: null },
  };

  document.getElementById('placarA').textContent = '0';
  document.getElementById('placarB').textContent = '0';
  document.getElementById('timerDisplay').textContent = TEMPO;
  document.getElementById('timerDisplay').className = 'timer-numero idle';
  document.getElementById('timerProg').style.width = '100%';
  document.getElementById('timerProg').className = 'timer-prog';
  document.getElementById('btnIniciar').textContent = 'INICIAR TURNO';
  document.getElementById('btnIniciar').style.display = '';
  const logo = document.querySelector('.logo');
  logo.textContent = 'TABOO';
  logo.className = 'logo';
  document.getElementById('btnErrou').disabled = true;
  document.getElementById('btnAcertou').disabled = true;
  document.getElementById('logLista').innerHTML = '';
  document.getElementById('logConteudo').style.display = 'none';
  document.getElementById('btnLog').textContent = 'Histórico ▾';
  document.getElementById('palavraPrincipal').textContent = 'TABOO';
  document.getElementById('palavraPrincipal').className = 'palavra-principal aguardando';
  document.getElementById('tabooLista').innerHTML = '';
  document.getElementById('divisor').style.opacity = '0';

  encherBuffer('A');
  encherBuffer('B');
}

function toggleLog() {
  const lc  = document.getElementById('logConteudo');
  const btn = document.getElementById('btnLog');
  const aberto = lc.style.display !== 'none';
  lc.style.display = aberto ? 'none' : 'block';
  btn.textContent  = aberto ? 'Histórico ▾' : 'Histórico ▴';
}

// ── INIT ─────────────────────────────
document.getElementById('timerDisplay').textContent = TEMPO;
document.getElementById('logConteudo').style.display = 'none';
encherBuffer('A');
encherBuffer('B');
