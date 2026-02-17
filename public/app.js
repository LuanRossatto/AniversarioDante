const form = document.getElementById('rsvpForm');
const feedback = document.getElementById('feedback');
const countdown = document.getElementById('countdown');
const dinoRoarBtn = document.getElementById('dinoRoarBtn');
const dinoMessage = document.getElementById('dinoMessage');
const guestsInput = document.getElementById('guests');
const guestsMinusBtn = document.getElementById('guestsMinusBtn');
const guestsPlusBtn = document.getElementById('guestsPlusBtn');
const attendanceInputs = document.querySelectorAll('input[name="attendance"]');

function setGuestsValue(value) {
  const parsed = Number.parseInt(value, 10);
  const safeValue = Number.isNaN(parsed) ? 0 : Math.max(0, parsed);
  guestsInput.value = String(safeValue);
}

function updateCountdown() {
  if (!countdown) {
    return;
  }

  const eventDate = new Date('2026-04-18T19:00:00-03:00');
  const now = new Date();
  const diffMs = eventDate - now;

  if (diffMs <= 0) {
    countdown.textContent = 'A festa já começou! 🥳';
    return;
  }

  const totalMinutes = Math.floor(diffMs / 1000 / 60);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  countdown.textContent = `${days} dias, ${hours} horas e ${minutes} min para a festa!`;
}

function updateGuestsField() {
  const selectedAttendance = document.querySelector('input[name="attendance"]:checked')?.value;

  if (selectedAttendance === 'nao') {
    guestsInput.value = 0;
    guestsInput.disabled = true;
    if (guestsMinusBtn) guestsMinusBtn.disabled = true;
    if (guestsPlusBtn) guestsPlusBtn.disabled = true;
    guestsInput.title = 'Desabilitado quando a resposta é Não';
    return;
  }

  guestsInput.disabled = false;
  if (guestsMinusBtn) guestsMinusBtn.disabled = false;
  if (guestsPlusBtn) guestsPlusBtn.disabled = false;
  guestsInput.title = '';
}

attendanceInputs.forEach((input) => {
  input.addEventListener('change', updateGuestsField);
});

if (guestsMinusBtn && guestsPlusBtn && guestsInput) {
  guestsMinusBtn.addEventListener('click', () => {
    const current = Number.parseInt(guestsInput.value, 10) || 0;
    setGuestsValue(current - 1);
  });

  guestsPlusBtn.addEventListener('click', () => {
    const current = Number.parseInt(guestsInput.value, 10) || 0;
    setGuestsValue(current + 1);
  });
}

const dinoPhrases = [
  '🦖 Roooar! Dante está te esperando nessa aventura jurássica!',
  '🥚 Você encontrou um ovo dino raro! Confirme sua presença para chocar a diversão!',
  '🌋 Alerta jurássico: presença confirmada aumenta em 200% a diversão da festa!',
  '🦕 Os dinossauros votaram: sua presença é obrigatória para uma noite épica!'
];

if (dinoRoarBtn && dinoMessage) {
  dinoRoarBtn.addEventListener('click', () => {
    const randomIndex = Math.floor(Math.random() * dinoPhrases.length);
    dinoMessage.textContent = dinoPhrases[randomIndex];
    dinoMessage.classList.remove('pop');
    window.requestAnimationFrame(() => {
      dinoMessage.classList.add('pop');
    });
  });
}

updateCountdown();
window.setInterval(updateCountdown, 60000);
updateGuestsField();

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const formData = new FormData(form);
  const payload = {
    name: formData.get('name')?.toString().trim(),
    attendance: formData.get('attendance'),
    guests: Number.parseInt(formData.get('guests'), 10) || 0,
    note: formData.get('note')?.toString().trim()
  };

  feedback.textContent = 'Enviando...';
  feedback.className = 'feedback';

  try {
    const response = await fetch('/api/rsvp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Não foi possível enviar agora.');
    }

    feedback.textContent = 'Confirmação enviada com sucesso. Nos vemos na era dos dinossauros!';
    feedback.className = 'feedback success';
    form.reset();
    setGuestsValue(0);
    updateGuestsField();
  } catch (error) {
    feedback.textContent = error.message;
    feedback.className = 'feedback error';
  }
});
