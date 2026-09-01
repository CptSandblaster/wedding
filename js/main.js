// Fyll i med den publicerade Apps Script-webbapp-URL:en efter `clasp deploy` (fas 2).
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyCTvoCURXW_elUaGv7pH3yyb3UTMPX0SxKjKQy01dklX6wxTJd1UqQx8I4aq5REiDU/exec";

const form = document.getElementById("osaForm");
const restOfForm = document.getElementById("restOfForm");
const submitBtn = document.getElementById("submitBtn");
const formStatus = document.getElementById("formStatus");
const viewOnlyNotice = document.getElementById("viewOnlyNotice");
const osaFormWrapper = document.getElementById("osaFormWrapper");
const formLoading = document.getElementById("formLoading");

// Radiogrupper som bara ska vara obligatoriska när gästen kommer (dvs. när
// restOfForm visas). Webbläsare validerar dolda fält i formuläret ändå
// (`hidden` gör dem inte "barred from constraint validation" konsekvent),
// så vi växlar required-attributet aktivt istället för att lita på :hidden.
const conditionallyRequiredRadioNames = ["alkohol", "buss_vigsel", "buss_natt"];

function updateKommerVisibility() {
  const kommer = form.querySelector('input[name="kommer"]:checked');
  const willAttend = kommer && kommer.value === "Ja";
  restOfForm.hidden = !willAttend;

  conditionallyRequiredRadioNames.forEach((name) => {
    form.querySelectorAll(`input[name="${name}"]`).forEach((el) => {
      el.required = willAttend;
    });
  });
  updateAllergierValidity();
}

form.querySelectorAll('input[name="kommer"]').forEach((el) => {
  el.addEventListener("change", updateKommerVisibility);
});

// Allergier är kryssrutor (går inte att markera "required" i HTML), så vi
// kräver att minst en är ikryssad manuellt via Constraint Validation API:t.
// "Inga allergier" är det giltiga svaret för den som inte har några.
const allergierBoxes = [...form.querySelectorAll('input[name="allergier"]')];
const allergierIngaBox = form.querySelector('input[name="allergier"][value="inga"]');
const allergierAnnatBox = form.querySelector('input[name="allergier"][value="annat"]');
const allergierOvrigtInput = form.querySelector('input[name="allergier_ovrigt"]');
const allergierValidityAnchor = allergierBoxes[0];

function updateAllergierValidity() {
  if (!allergierValidityAnchor) return;
  const kommer = form.querySelector('input[name="kommer"]:checked');
  const willAttend = kommer && kommer.value === "Ja";
  const anyChecked = allergierBoxes.some((box) => box.checked);
  allergierValidityAnchor.setCustomValidity(
    willAttend && !anyChecked ? "Välj minst ett alternativ (eller \"Inga allergier\")." : ""
  );

  if (allergierOvrigtInput) {
    allergierOvrigtInput.required = willAttend && !!(allergierAnnatBox && allergierAnnatBox.checked);
  }
}

allergierBoxes.forEach((box) => {
  box.addEventListener("change", () => {
    if (box === allergierIngaBox) {
      if (box.checked) allergierBoxes.forEach((b) => { if (b !== box) b.checked = false; });
    } else if (box.checked && allergierIngaBox) {
      allergierIngaBox.checked = false;
    }
    updateAllergierValidity();
  });
});
updateAllergierValidity();

function showStatus(message, state) {
  formStatus.textContent = message;
  formStatus.dataset.state = state;
  formStatus.hidden = false;
}

function collectFormData() {
  const fd = new FormData(form);
  return {
    kommer: fd.get("kommer") || "",
    namn: fd.get("namn") || "",
    email: fd.get("email") || "",
    telefon: fd.get("telefon") || "",
    allergier: fd.getAll("allergier").join(", "),
    allergier_ovrigt: fd.get("allergier_ovrigt") || "",
    alkohol: fd.get("alkohol") || "",
    buss_vigsel: fd.get("buss_vigsel") || "",
    buss_natt: fd.get("buss_natt") || "",
    meddelande: fd.get("meddelande") || "",
    website: fd.get("website") || "", // honeypot
  };
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  formStatus.hidden = true;

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  if (!APPS_SCRIPT_URL) {
    showStatus(
      "OSA-formuläret är inte färdigkopplat än (backend-URL saknas). Hör av dig direkt till brudparet under tiden.",
      "error"
    );
    return;
  }

  submitBtn.disabled = true;
  const payload = collectFormData();

  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data && data.ok) {
      showStatus("Tack, vi har tagit emot din OSA!", "success");
      form.reset();
      updateKommerVisibility();
      updateAllergierValidity();
    } else {
      showStatus("Något gick fel. Försök gärna igen om en liten stund.", "error");
    }
  } catch (err) {
    showStatus("Något gick fel. Försök gärna igen om en liten stund.", "error");
  } finally {
    submitBtn.disabled = false;
  }
});

// ---- Läsvy via ?t=<token> (ENDAST läsning, går inte att redigera härifrån) ----
function getViewToken() {
  return new URLSearchParams(window.location.search).get("t");
}

function enterViewOnlyMode() {
  form.querySelectorAll("input, textarea").forEach((el) => {
    el.disabled = true;
  });
  submitBtn.hidden = true;
  submitBtn.disabled = true;
  viewOnlyNotice.hidden = false;
}

async function loadViewOnly(token) {
  if (!APPS_SCRIPT_URL) {
    revealForm();
    return;
  }

  try {
    const res = await fetch(`${APPS_SCRIPT_URL}?t=${encodeURIComponent(token)}&_=${Date.now()}`);
    const data = await res.json();
    if (!data || !data.found) {
      revealForm();
      return;
    }

    // Enkla textfält
    ["namn", "email", "telefon", "allergier_ovrigt", "meddelande"].forEach((name) => {
      if (form.elements[name] && data[name] !== undefined) {
        form.elements[name].value = data[name];
      }
    });

    // Radio
    if (data.kommer) {
      const el = form.querySelector(`input[name="kommer"][value="${data.kommer}"]`);
      if (el) el.checked = true;
    }
    if (data.alkohol) {
      const el = form.querySelector(`input[name="alkohol"][value="${data.alkohol}"]`);
      if (el) el.checked = true;
    }
    if (data.buss_vigsel) {
      const el = form.querySelector(`input[name="buss_vigsel"][value="${data.buss_vigsel}"]`);
      if (el) el.checked = true;
    }
    if (data.buss_natt) {
      const el = form.querySelector(`input[name="buss_natt"][value="${data.buss_natt}"]`);
      if (el) el.checked = true;
    }

    // Kryssrutor (kommaseparerad sträng -> flera valda)
    if (data.allergier) {
      const values = data.allergier.split(",").map((v) => v.trim()).filter(Boolean);
      form.querySelectorAll('input[name="allergier"]').forEach((box) => {
        box.checked = values.includes(box.value);
      });
    }

    updateKommerVisibility();
    enterViewOnlyMode();
    revealForm();
  } catch (err) {
    // Ogiltig/borttagen token: visa bara ett tomt formulär, inget felmeddelande.
    revealForm();
  }
}

function revealForm() {
  formLoading.hidden = true;
  osaFormWrapper.hidden = false;
}

updateKommerVisibility();

const viewToken = getViewToken();
if (viewToken) {
  document.getElementById("osa-formular").scrollIntoView();
  osaFormWrapper.hidden = true;
  formLoading.hidden = false;
  loadViewOnly(viewToken);
}
