(function initFarmPrefill() {
  const params = new URLSearchParams(window.location.search);
  if (!params.toString()) {
    return;
  }

  const fieldMap = [
    ["name", "farm-name"],
    ["contact", "farm-contact"],
    ["object", "farm-object"],
    ["details", "farm-details"]
  ];

  fieldMap.forEach(([paramKey, fieldId]) => {
    const value = params.get(paramKey);
    const field = document.getElementById(fieldId);
    if (value && field) {
      field.value = value;
    }
  });

  prefillSelect("stage", "farm-stage");
  prefillSelect("need", "farm-need");

  if (window.location.hash === "#brief") {
    document.getElementById("brief")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function prefillSelect(paramKey, fieldId) {
    const value = params.get(paramKey);
    const select = document.getElementById(fieldId);
    if (!value || !select) {
      return;
    }

    const normalizedValue = value.toLowerCase();
    const option = Array.from(select.options).find((item) => item.textContent.toLowerCase() === normalizedValue);
    if (option) {
      select.value = option.value;
      return;
    }

    const fallbackOption = Array.from(select.options).find((item) => normalizedValue.includes(item.textContent.toLowerCase()));
    if (fallbackOption) {
      select.value = fallbackOption.value;
    }
  }
})();
