const path = require("path");
const fs = require("fs/promises");
const express = require("express");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "registrations.json");

app.use(express.json({ limit: "64kb" }));
app.use(express.static(path.join(__dirname, "public")));

async function ensureStore() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, "[]", "utf8");
  }
}

async function readRegistrations() {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeRegistrations(list) {
  const payload = JSON.stringify(list, null, 2);
  await fs.writeFile(DATA_FILE, payload, "utf8");
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isPhone(value) {
  return /^\+?[0-9\s().-]{7,}$/.test(value);
}

function validateRegistration(body) {
  const errors = {};

  if (!body.fullName || body.fullName.trim().length < 2) {
    errors.fullName = "Full name must be at least 2 characters.";
  }

  if (!body.email || !isEmail(body.email)) {
    errors.email = "Enter a valid email address.";
  }

  if (body.phone && !isPhone(body.phone)) {
    errors.phone = "Enter a valid phone number.";
  }

  if (!body.event || body.event === "select") {
    errors.event = "Please choose an event.";
  }

  if (!body.eventDate) {
    errors.eventDate = "Please select a preferred date.";
  }

  const attendees = Number(body.attendees);
  if (!Number.isInteger(attendees) || attendees < 1 || attendees > 10) {
    errors.attendees = "Attendees must be between 1 and 10.";
  }

  if (!body.ticketType || body.ticketType === "select") {
    errors.ticketType = "Please choose a ticket type.";
  }

  if (!body.termsAccepted) {
    errors.termsAccepted = "You must accept the code of conduct.";
  }

  return errors;
}

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/registrations", async (req, res) => {
  const errors = validateRegistration(req.body || {});
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ errors });
  }

  const registrations = await readRegistrations();
  const entry = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    fullName: req.body.fullName.trim(),
    email: req.body.email.trim().toLowerCase(),
    phone: req.body.phone ? req.body.phone.trim() : "",
    event: req.body.event,
    eventDate: req.body.eventDate,
    ticketType: req.body.ticketType,
    attendees: Number(req.body.attendees),
    organization: req.body.organization ? req.body.organization.trim() : "",
    dietary: req.body.dietary ? req.body.dietary.trim() : "",
    notes: req.body.notes ? req.body.notes.trim() : "",
    updatesOptIn: Boolean(req.body.updatesOptIn)
  };

  registrations.push(entry);
  await writeRegistrations(registrations);

  res.json({
    message: "Registration saved.",
    id: entry.id
  });
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

ensureStore()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to initialize storage:", error);
    process.exit(1);
  });
