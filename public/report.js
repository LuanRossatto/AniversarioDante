const totalRespostasEl = document.getElementById('totalRespostas');
const totalSimEl = document.getElementById('totalSim');
const totalNaoEl = document.getElementById('totalNao');
const totalAcompanhantesEl = document.getElementById('totalAcompanhantes');
const totalPessoasEl = document.getElementById('totalPessoas');
const tableBody = document.getElementById('responsesTableBody');
const refreshBtn = document.getElementById('refreshBtn');

tableBody.innerHTML = '<tr><td colspan="5">Carregando respostas...</td></tr>';

function formatDate(dateString) {
  if (!dateString) {
    return '-';
  }

  const rawValue = String(dateString);
  const hasTimezone = /Z$|[+-]\d{2}:?\d{2}$/.test(rawValue);
  const date = new Date(hasTimezone ? rawValue : `${rawValue}Z`);

  if (Number.isNaN(date.getTime())) {
    return rawValue;
  }

  return date.toLocaleString('pt-BR');
}

function renderRows(rows) {
  if (!rows.length) {
    tableBody.innerHTML = '<tr><td colspan="5">Nenhuma resposta ainda.</td></tr>';
    return;
  }

  tableBody.innerHTML = rows
    .map((row) => {
      const attendanceText = row.attendance === 'sim' ? 'Sim' : 'Não';
      return `
        <tr>
          <td>${row.name}</td>
          <td>${attendanceText}</td>
          <td>${row.guests}</td>
          <td>${row.note || '-'}</td>
          <td>${formatDate(row.created_at)}</td>
        </tr>
      `;
    })
    .join('');
}

async function loadReport() {
  if (!refreshBtn || !tableBody) {
    return;
  }

  refreshBtn.disabled = true;
  refreshBtn.textContent = 'Atualizando...';

  try {
    const response = await fetch('/api/report', { cache: 'no-store' });
    const text = await response.text();
    const data = text ? JSON.parse(text) : null;

    if (!response.ok || !data) {
      throw new Error(data?.error || 'Erro ao carregar relatório.');
    }

    totalRespostasEl.textContent = data.summary.totalRespostas;
    totalSimEl.textContent = data.summary.totalSim;
    totalNaoEl.textContent = data.summary.totalNao;
    totalAcompanhantesEl.textContent = data.summary.totalAcompanhantes;
    const totalPessoas = Number(data.summary.totalSim || 0) + Number(data.summary.totalAcompanhantes || 0);
    if (totalPessoasEl) {
      totalPessoasEl.textContent = totalPessoas;
    }

    renderRows(data.responses);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao carregar relatório.';
    tableBody.innerHTML = `<tr><td colspan="5">${message}</td></tr>`;
  } finally {
    refreshBtn.disabled = false;
    refreshBtn.textContent = 'Atualizar';
  }
}

refreshBtn.addEventListener('click', loadReport);
loadReport();
