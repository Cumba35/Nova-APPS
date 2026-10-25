
/* Nova Apps — Gestión visual de proyectos archivados.
   Los documentos privados se conectarán a Supabase más adelante.
   No guardar información confidencial en este archivo público. */

const $ = (selector) => document.querySelector(selector);

const ARCHIVE_ITEMS = [
  {
    id: "plan-comercial",
    title: "Datos comerciales y plan de monetización",
    category: "Comercial · Planificación",
    description:
      "Servicios digitales, registro de actividades, obligaciones fiscales, métodos de cobro, alojamiento web y etapas previstas para generar ingresos.",
    status: "Pendiente de almacenamiento privado",
  },
];

function renderArchivedProjects() {
  const container = $("#archivedProjects");

  if (!container) return;

  container.replaceChildren();

  for (const project of ARCHIVE_ITEMS) {
    const article = document.createElement("article");
    article.className = "archived-card";

    const content = document.createElement("div");
    content.className = "archived-card-content";

    const category = document.createElement("span");
    category.className = "archived-category";
    category.textContent = project.category;

    const title = document.createElement("h3");
    title.textContent = project.title;

    const description = document.createElement("p");
    description.textContent = project.description;

    const status = document.createElement("p");
    status.className = "archived-status";
    status.textContent = project.status;

    content.append(category, title, description, status);
    article.append(content);
    container.append(article);
  }
}

function initializeArchivedProjects() {
  renderArchivedProjects();
}

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    initializeArchivedProjects,
    { once: true }
  );
} else {
  initializeArchivedProjects();
}
