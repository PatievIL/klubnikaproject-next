function resolveTargetSection() {
  const fromDataset = String(document.body?.dataset?.targetSection || "").trim();
  if (fromDataset) return fromDataset;
  const fromPath = window.location.pathname.split("/").filter(Boolean).pop() || "";
  return fromPath || "overview";
}

function buildCabinetHref(section) {
  const params = new URLSearchParams(window.location.search);
  params.set("section", section);
  return `/cabinet/?${params.toString()}`;
}

function redirectToCabinetSection() {
  const section = resolveTargetSection();
  const target = buildCabinetHref(section);
  window.location.replace(target);
}

document.addEventListener("DOMContentLoaded", redirectToCabinetSection);
