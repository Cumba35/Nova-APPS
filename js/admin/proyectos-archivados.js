
/* Nova Apps — Proyectos archivados
   Los datos confidenciales se conectarán a Supabase al final.
   No almacenar información privada en archivos públicos.
*/

const ARCHIVE_ITEMS = [
  {
    id: "plan-comercial",
    title: "Datos comerciales y plan de monetización",
    category: "Comercial · Planificación",
    description:
      "Plan de ingresos, servicios digitales, publicidad, diseño, desarrollo web, Nova Market, aplicaciones propias y membresías.",
    status: "Pendiente de conectar al almacenamiento privado.",
    details: [
      {
        title: "Situación inicial",
        items: [
          "Proyecto Nova Apps ubicado en Santiago de Cuba.",
          "Desarrollo y administración desde un teléfono Android.",
          "Presupuesto inicial: 0 CUP.",
          "Actividad económica registrada: pendiente de verificar."
        ]
      },
      {
        title: "Fuentes de ingresos previstas",
        items: [
          "Programación y desarrollo web.",
          "Diseño digital y creación de anuncios.",
          "Promoción de aplicaciones y publicaciones patrocinadas.",
          "Ventas y promociones de Nova Market.",
          "Aplicaciones y herramientas propias.",
          "Membresías VIP y funciones premium.",
          "Publicidad compatible con las normas de la plataforma.",
          "Servicios digitales internacionales cuando sean legalmente posibles."
        ]
      },
      {
        title: "Verificaciones pendientes",
        items: [
          "Consultar las actividades económicas autorizadas.",
          "Confirmar los requisitos de registro, impuestos y seguridad social.",
          "Verificar las opciones autorizadas de cobro y las cuentas bancarias.",
          "Comprobar las condiciones de los proveedores internacionales de pago.",
          "Determinar un alojamiento compatible con los servicios previstos.",
          "Revisar las condiciones de uso de GitHub Pages."
        ]
      },
      {
        title: "Orden de ejecución",
        items: [
          "Preparar el catálogo de servicios y precios orientativos.",
          "Identificar clientes y posibles anunciantes.",
          "Registrar ingresos y gastos en una hoja de cálculo.",
          "Verificar los requisitos legales antes de cobrar regularmente.",
          "Seleccionar métodos de cobro y alojamiento compatibles.",
          "Implementar progresivamente publicidad, aplicaciones y membresías."
        ]
      }
    ]
  }
];

const $ = (selector) => document.querySelector(selector);

function createElement(tag, className, text) {
  const element = document.createElement(tag);

  if (className) {
    element.className = className;
  }

  if (text !== undefined) {
    element.textContent = text;
  }

  return element;
}

function renderArchivedProjects() {
  const container = $("#archivedProjects");

  if (!container) return;

  container.replaceChildren();

  for (const project of ARCHIVE_ITEMS) {
    const article = createElement("article", "archived-card");
    const content = createElement("div", "archived-card-content");

    content.append(
      createElement("span", "archived-category", project.category),
      createElement("h3", "", project.title),
      createElement("p", "", project.description),
      createElement("p", "archived-status", project.status)
    );

    for (const section of project.details || []) {
      const detailSection = createElement("section", "archived-detail");
      const heading = createElement("h4", "", section.title);
      const list = createElement("ul", "");

      for (const item of section.items || []) {
        list.append(createElement("li", "", item));
      }

      detailSection.append(heading, list);
      content.append(detailSection);
    }

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
