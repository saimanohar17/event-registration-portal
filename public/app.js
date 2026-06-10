const form = document.getElementById("registrationForm");
const statusEl = document.querySelector(".form-status");
const submitButton = form.querySelector("button[type='submit']");

const fieldElements = Array.from(document.querySelectorAll(".field"));

function setStatus(message, state) {
  statusEl.textContent = message;
  statusEl.dataset.state = state || "";
}

function setError(field, message) {
  const wrapper = document.querySelector(`.field[data-field='${field}']`);
  if (!wrapper) return;
  wrapper.classList.add("invalid");
  const errorEl = wrapper.querySelector(".error");
  if (errorEl) errorEl.textContent = message || "";
}

function clearError(field) {
  const wrapper = document.querySelector(`.field[data-field='${field}']`);
  if (!wrapper) return;
  wrapper.classList.remove("invalid");
  const errorEl = wrapper.querySelector(".error");
  if (errorEl) errorEl.textContent = "";
}

function clearAllErrors() {
  fieldElements.forEach((field) => {
    field.classList.remove("invalid");
    const errorEl = field.querySelector(".error");
    if (errorEl) errorEl.textContent = "";
  });
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isPhone(value) {
  return /^\+?[0-9\s().-]{7,}$/.test(value);
}

function getFormData() {
  return {
    fullName: form.fullName.value.trim(),
    email: form.email.value.trim(),
    phone: form.phone.value.trim(),
    organization: form.organization.value.trim(),
    event: form.event.value,
    eventDate: form.eventDate.value,
    ticketType: form.ticketType.value,
    attendees: form.attendees.value,
    dietary: form.dietary.value.trim(),
    notes: form.notes.value.trim(),
    updatesOptIn: form.updatesOptIn.checked,
    termsAccepted: form.termsAccepted.checked
  };
}

function validate(data) {
  const errors = {};

  if (!data.fullName || data.fullName.length < 2) {
    errors.fullName = "Full name must be at least 2 characters.";
  }

  if (!data.email || !isEmail(data.email)) {
    errors.email = "Enter a valid email address.";
  }

  if (data.phone && !isPhone(data.phone)) {
    errors.phone = "Enter a valid phone number.";
  }

  if (!data.event || data.event === "select") {
    errors.event = "Please choose an event.";
  }

  if (!data.eventDate) {
    errors.eventDate = "Please select a preferred date.";
  }

  const attendees = Number(data.attendees);
  if (!Number.isInteger(attendees) || attendees < 1 || attendees > 10) {
    errors.attendees = "Attendees must be between 1 and 10.";
  }

  if (!data.ticketType || data.ticketType === "select") {
    errors.ticketType = "Please choose a ticket type.";
  }

  if (!data.termsAccepted) {
    errors.termsAccepted = "You must accept the code of conduct.";
  }

  return errors;
}

fieldElements.forEach((field) => {
  const input = field.querySelector("input, select, textarea");
  if (!input) return;
  input.addEventListener("input", () => {
    clearError(field.dataset.field);
    setStatus("", "");
  });
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearAllErrors();

  const payload = getFormData();
  const errors = validate(payload);

  if (Object.keys(errors).length > 0) {
    Object.entries(errors).forEach(([field, message]) => setError(field, message));
    setStatus("Please fix the highlighted fields.", "error");
    return;
  }

  submitButton.disabled = true;
  setStatus("Submitting your registration...", "loading");

  try {
    const response = await fetch("/api/registrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (data.errors) {
        Object.entries(data.errors).forEach(([field, message]) => setError(field, message));
      }
      setStatus(data.message || "Something went wrong. Try again.", "error");
      return;
    }

    form.reset();
    setStatus(`Success! Registration ID: ${data.id}`, "success");
  } catch (error) {
    setStatus("Network error. Please try again.", "error");
  } finally {
    submitButton.disabled = false;
  }
});
