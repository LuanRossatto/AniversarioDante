const form = document.getElementById('rsvpForm');
const feedback = document.getElementById('feedback');
const countdown = document.getElementById('countdown');
const dinoRoarBtn = document.getElementById('dinoRoarBtn');
const dinoMessage = document.getElementById('dinoMessage');
const guestsInput = document.getElementById('guests');
const guestsModal = document.getElementById('guestsModal');
const modalGuestsInput = document.getElementById('modalGuests');
const modalGuestsMinusBtn = document.getElementById('modalGuestsMinusBtn');
const modalGuestsPlusBtn = document.getElementById('modalGuestsPlusBtn');
const modalCancelBtn = document.getElementById('modalCancelBtn');
const modalConfirmBtn = document.getElementById('modalConfirmBtn');
const attendanceInputs = document.querySelectorAll('input[name="attendance"]');

function setGuestsValue(value) {
  const parsed = Number.parseInt(value, 10);
  const safeValue = Number.isNaN(parsed) ? 0 : Math.max(0, parsed);
  guestsInput.value = String(safeValue);
}

function setModalGuestsValue(value) {
  if (!modalGuestsInput) {
    return;
  }

  const parsed = Number.parseInt(value, 10);
  const safeValue = Number.isNaN(parsed) ? 0 : Math.max(0, parsed);
  modalGuestsInput.value = String(safeValue);
}

function openGuestsModal() {
  if (!guestsModal) {
    return;
  }

  setModalGuestsValue(guestsInput.value || 0);
  guestsModal.classList.add('open');
  guestsModal.setAttribute('aria-hidden', 'false');
}

function closeGuestsModal() {
  if (!guestsModal) {
    return;
  }

  guestsModal.classList.remove('open');
  guestsModal.setAttribute('aria-hidden', 'true');
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
    closeGuestsModal();
    return;
  }
}

attendanceInputs.forEach((input) => {
  input.addEventListener('change', updateGuestsField);
});

if (modalGuestsMinusBtn && modalGuestsPlusBtn && modalGuestsInput) {
  modalGuestsMinusBtn.addEventListener('click', () => {
    const current = Number.parseInt(modalGuestsInput.value, 10) || 0;
    setModalGuestsValue(current - 1);
  });

  modalGuestsPlusBtn.addEventListener('click', () => {
    const current = Number.parseInt(modalGuestsInput.value, 10) || 0;
    setModalGuestsValue(current + 1);
  });
}

if (modalCancelBtn) {
  modalCancelBtn.addEventListener('click', closeGuestsModal);
}

if (guestsModal) {
  guestsModal.addEventListener('click', (event) => {
    if (event.target === guestsModal) {
      closeGuestsModal();
    }
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

async function submitRsvp() {
  const formData = new FormData(form);
  const payload = {
    name: formData.get('name')?.toString().trim(),
    attendance: formData.get('attendance'),
    guests: Number.parseInt(formData.get('guests'), 10) || 0,
    note: formData.get('note')?.toString().trim()
  };

  feedback.textContent = 'Enviando...';
  feedback.className = 'feedback';

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
  setModalGuestsValue(0);
  updateGuestsField();
}

if (modalConfirmBtn) {
  modalConfirmBtn.addEventListener('click', async () => {
    setGuestsValue(modalGuestsInput?.value || 0);
    closeGuestsModal();

    try {
      await submitRsvp();
    } catch (error) {
      feedback.textContent = error.message;
      feedback.className = 'feedback error';
    }
  });
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const selectedAttendance = document.querySelector('input[name="attendance"]:checked')?.value;

  if (selectedAttendance === 'sim') {
    openGuestsModal();
    return;
  }

  setGuestsValue(0);

  try {
    await submitRsvp();
  } catch (error) {
    feedback.textContent = error.message;
    feedback.className = 'feedback error';
  }
});
