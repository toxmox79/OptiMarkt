const storageKey = "marktoptimierer-shared-export";

const state = {
  payload: null,
  activeTab: "overview",
  search: "",
  trafficFilter: "ALL",
  category: "ALL",
  sortField: "revenue30d",
  priceDeviation: "ALL",
  onlyStock: false,
  onlyWithoutEan: false,
  onlyZeroSales: false,
  excludeBWare: false,
  showInactive: false
};

const elements = {
  fileInput: document.getElementById("json-file-input"),
  clearFileButton: document.getElementById("clear-file-button"),
  statusMessage: document.getElementById("status-message"),
  dashboardRoot: document.getElementById("dashboard-root"),
  tabButtons: Array.from(document.querySelectorAll("[data-tab]")),
  overviewPanel: document.getElementById("overview-panel"),
  changesPanel: document.getElementById("changes-panel"),
  kpiGrid: document.getElementById("kpi-grid"),
  changesKpis: document.getElementById("changes-kpis"),
  searchInput: document.getElementById("search-input"),
  trafficFilter: document.getElementById("traffic-filter"),
  categoryFilter: document.getElementById("category-filter"),
  sortField: document.getElementById("sort-field"),
  priceDeviation: document.getElementById("price-deviation"),
  stockOnly: document.getElementById("stock-only"),
  withoutEan: document.getElementById("without-ean"),
  zeroSales: document.getElementById("zero-sales"),
  excludeBware: document.getElementById("exclude-bware"),
  showInactive: document.getElementById("show-inactive"),
  overviewCount: document.getElementById("overview-count"),
  overviewBody: document.getElementById("overview-body"),
  changesBody: document.getElementById("changes-body")
};

bootstrap();

function bootstrap() {
  wireEvents();
  loadStoredPayload();
  render();
}

function wireEvents() {
  elements.fileInput.addEventListener("change", handleFileUpload);
  elements.clearFileButton.addEventListener("click", clearPayload);

  for (const button of elements.tabButtons) {
    button.addEventListener("click", () => {
      state.activeTab = button.dataset.tab;
      render();
    });
  }

  elements.searchInput.addEventListener("input", (event) => {
    state.search = event.target.value;
    render();
  });
  elements.trafficFilter.addEventListener("change", (event) => {
    state.trafficFilter = event.target.value;
    render();
  });
  elements.categoryFilter.addEventListener("change", (event) => {
    state.category = event.target.value;
    render();
  });
  elements.sortField.addEventListener("change", (event) => {
    state.sortField = event.target.value;
    render();
  });
  elements.priceDeviation.addEventListener("change", (event) => {
    state.priceDeviation = event.target.value;
    render();
  });
  elements.stockOnly.addEventListener("change", (event) => {
    state.onlyStock = event.target.checked;
    render();
  });
  elements.withoutEan.addEventListener("change", (event) => {
    state.onlyWithoutEan = event.target.checked;
    render();
  });
  elements.zeroSales.addEventListener("change", (event) => {
    state.onlyZeroSales = event.target.checked;
    render();
  });
  elements.excludeBware.addEventListener("change", (event) => {
    state.excludeBWare = event.target.checked;
    render();
  });
  elements.showInactive.addEventListener("change", (event) => {
    state.showInactive = event.target.checked;
    render();
  });
}

function loadStoredPayload() {
  try {
    const stored = window.localStorage.getItem(storageKey);
    if (!stored) {
      return;
    }

    const parsed = validatePayload(JSON.parse(stored));
    state.payload = parsed;
    setStatus(`Zuletzt geladene Datei vom ${formatDateTime(parsed.exportedAt)}.`);
  } catch {
    window.localStorage.removeItem(storageKey);
  }
}

async function handleFileUpload(event) {
  const file = event.target.files?.[0];
  event.target.value = "";

  if (!file) {
    return;
  }

  setStatus(`Lade ${file.name}...`);

  try {
    const raw = await file.text();
    const parsed = validatePayload(JSON.parse(raw));
    state.payload = parsed;
    window.localStorage.setItem(storageKey, JSON.stringify(parsed));
    setStatus(`Datei geladen: Export vom ${formatDateTime(parsed.exportedAt)}.`);
    render();
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Die Datei konnte nicht geladen werden.");
  }
}

function validatePayload(payload) {
  if (
    !payload ||
    payload.version !== 1 ||
    payload.source !== "desktop-app" ||
    !payload.data ||
    !Array.isArray(payload.data.products) ||
    !Array.isArray(payload.data.changeInsights) ||
    !payload.data.kpis
  ) {
    throw new Error("Die Datei ist kein gueltiger Marktoptimierer-Export.");
  }

  return payload;
}

function clearPayload() {
  state.payload = null;
  window.localStorage.removeItem(storageKey);
  setStatus("Bitte eine exportierte JSON-Datei laden.");
  render();
}

function setStatus(message) {
  elements.statusMessage.textContent = message;
}

function render() {
  const hasPayload = Boolean(state.payload);
  elements.dashboardRoot.classList.toggle("hidden", !hasPayload);
  elements.clearFileButton.style.display = hasPayload ? "inline-flex" : "none";

  for (const button of elements.tabButtons) {
    button.classList.toggle("is-active", button.dataset.tab === state.activeTab);
  }

  elements.overviewPanel.classList.toggle("hidden", state.activeTab !== "overview");
  elements.changesPanel.classList.toggle("hidden", state.activeTab !== "changes");

  if (!hasPayload) {
    elements.kpiGrid.innerHTML = "";
    elements.changesKpis.innerHTML = "";
    elements.overviewBody.innerHTML = "";
    elements.changesBody.innerHTML = "";
    elements.overviewCount.textContent = "";
    return;
  }

  renderOverview();
  renderChanges();
}

function renderOverview() {
  const products = state.payload.data.products;
  const baseProducts = products.filter((product) => state.showInactive || product.isActive);
  const inactiveCount = products.filter((product) => !product.isActive).length;
  const categories = Array.from(
    new Set(baseProducts.map((product) => product.categoryName).filter(Boolean))
  ).sort((left, right) => left.localeCompare(right, "de"));

  syncCategoryOptions(categories);

  const filteredProducts = baseProducts
    .filter((product) => {
      if (state.trafficFilter !== "ALL" && product.trafficLight !== state.trafficFilter) {
        return false;
      }
      if (state.category !== "ALL" && product.categoryName !== state.category) {
        return false;
      }
      if (state.onlyStock && product.stockNet <= 0) {
        return false;
      }
      if (state.onlyWithoutEan && product.ean) {
        return false;
      }
      if (state.onlyZeroSales && product.sales30d !== 0) {
        return false;
      }
      if (state.excludeBWare && isBWareProduct(product)) {
        return false;
      }
      if (state.priceDeviation === "GT5" && (product.priceDifferencePercent ?? 0) <= 5) {
        return false;
      }
      if (state.priceDeviation === "GT10" && (product.priceDifferencePercent ?? 0) <= 10) {
        return false;
      }

      const normalizedSearch = state.search.trim().toLowerCase();
      if (!normalizedSearch) {
        return true;
      }

      return [product.title, product.sku, product.ean, product.plentyItemId]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedSearch));
    })
    .sort((left, right) => sortProducts(left, right, state.sortField));

  const visibleKpis = {
    totalProducts: baseProducts.length,
    greenCount: baseProducts.filter((row) => row.trafficLight === "GREEN").length,
    yellowCount: baseProducts.filter((row) => row.trafficLight === "YELLOW").length,
    redCount: baseProducts.filter((row) => row.trafficLight === "RED").length,
    greyCount: baseProducts.filter((row) => row.trafficLight === "GREY").length,
    blueCount: baseProducts.filter((row) => row.trafficLight === "BLUE").length,
    revenue30d: baseProducts.reduce((sum, row) => sum + row.revenue30d, 0),
    sales30d: baseProducts.reduce((sum, row) => sum + row.sales30d, 0),
    withoutEan: baseProducts.filter((row) => !row.ean).length,
    priceDeviationOver10: baseProducts.filter(
      (row) => (row.priceDifferencePercent ?? 0) > 10
    ).length
  };

  elements.kpiGrid.innerHTML = "";
  elements.kpiGrid.append(
    createKpiCard(
      state.showInactive ? "Artikel gesamt" : "Aktive Artikel",
      formatInteger(visibleKpis.totalProducts),
      state.showInactive
        ? `${formatInteger(inactiveCount)} inaktive Artikel eingeblendet`
        : inactiveCount > 0
          ? `${formatInteger(inactiveCount)} inaktive Artikel ausgeblendet`
          : ""
    ),
    createKpiCard(
      "Gruen / Gelb / Rot",
      `${visibleKpis.greenCount} / ${visibleKpis.yellowCount} / ${visibleKpis.redCount}`,
      `Grau ${visibleKpis.greyCount}, Blau ${visibleKpis.blueCount}`
    ),
    createKpiCard("Umsatz 30 Tage", formatCurrency(visibleKpis.revenue30d)),
    createKpiCard("Verkaeufe 30 Tage", formatInteger(visibleKpis.sales30d)),
    createKpiCard(
      "Ohne EAN / >10 % Abweichung",
      `${visibleKpis.withoutEan} / ${visibleKpis.priceDeviationOver10}`
    )
  );

  elements.overviewCount.textContent = `${formatInteger(filteredProducts.length)} Artikel in der Tabelle`;
  elements.overviewBody.innerHTML = "";

  for (const product of filteredProducts) {
    elements.overviewBody.appendChild(createOverviewRow(product));
  }
}

function renderChanges() {
  const changeInsights = [...state.payload.data.changeInsights].sort((left, right) => {
    if (left.outcome !== right.outcome) {
      return changeOutcomePriority(left.outcome) - changeOutcomePriority(right.outcome);
    }

    return new Date(right.changedAt).getTime() - new Date(left.changedAt).getTime();
  });

  elements.changesKpis.innerHTML = "";
  elements.changesKpis.append(
    createKpiCard("Aenderungen gesamt", formatInteger(changeInsights.length)),
    createKpiCard(
      "Negativ",
      formatInteger(changeInsights.filter((entry) => entry.outcome === "NEGATIVE").length)
    ),
    createKpiCard(
      "Positiv",
      formatInteger(changeInsights.filter((entry) => entry.outcome === "POSITIVE").length)
    ),
    createKpiCard(
      "Neutral",
      formatInteger(changeInsights.filter((entry) => entry.outcome === "NEUTRAL").length)
    ),
    createKpiCard(
      "Noch frisch",
      formatInteger(changeInsights.filter((entry) => entry.outcome === "TOO_EARLY").length)
    )
  );

  elements.changesBody.innerHTML = "";

  if (changeInsights.length === 0) {
    const row = document.createElement("tr");
    row.innerHTML = `<td colspan="8"><div class="empty-state">Bisher wurden noch keine Preis- oder Titel-Aenderungen erkannt.</div></td>`;
    elements.changesBody.appendChild(row);
    return;
  }

  for (const entry of changeInsights) {
    elements.changesBody.appendChild(createChangeRow(entry));
  }
}

function syncCategoryOptions(categories) {
  const currentValue = state.category;
  elements.categoryFilter.innerHTML = '<option value="ALL">Alle Kategorien</option>';

  for (const category of categories) {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    elements.categoryFilter.appendChild(option);
  }

  if (!categories.includes(currentValue)) {
    state.category = "ALL";
  }

  elements.categoryFilter.value = state.category;
}

function createKpiCard(label, value, hint = "") {
  const card = document.createElement("div");
  card.className = "kpi-card";
  card.innerHTML = `
    <p class="kpi-card-label">${escapeHtml(label)}</p>
    <p class="kpi-card-value">${escapeHtml(value)}</p>
    ${hint ? `<p class="kpi-card-hint">${escapeHtml(hint)}</p>` : ""}
  `;
  return card;
}

function createOverviewRow(product) {
  const row = document.createElement("tr");
  row.className = "data-row";

  const itemIdButton = product.plentyItemId
    ? `<button class="item-id-button" data-copy-item-id="${escapeAttribute(product.plentyItemId)}" type="button">ID ${escapeHtml(product.plentyItemId)}</button>`
    : "";
  const note = product.note
    ? `<p class="product-note">Notiz vom ${escapeHtml(formatDate(product.noteUpdatedAt))}: ${escapeHtml(shorten(product.note, 90))}</p>`
    : "";

  row.innerHTML = `
    <td>
      <div class="badge-stack">
        ${renderTrafficLight(product.trafficLight)}
        ${itemIdButton}
      </div>
    </td>
    <td class="product-cell">
      <div class="product-layout">
        <div class="product-image">
          ${
            product.imageUrl
              ? `<img alt="${escapeAttribute(product.title)}" src="${escapeAttribute(product.imageUrl)}" />`
              : ""
          }
        </div>
        <div>
          <p class="product-title">${escapeHtml(product.title)}</p>
          <p class="product-line">${escapeHtml(product.sku ?? "ohne SKU")} | ${escapeHtml(product.ean ?? "ohne EAN")}</p>
          <p class="product-trend-line">
            <span class="trend-chip ${trendChipClassName(product.salesVelocity?.trendDirection)}">
              <span aria-hidden="true">${escapeHtml(trendArrow(product.salesVelocity?.trendDirection))}</span>
              <span>${escapeHtml(trendLabel(product.salesVelocity?.trendDirection))}</span>
              ${
                product.salesVelocity?.growthPercent != null
                  ? `<span>(${escapeHtml(formatPercent(product.salesVelocity.growthPercent))})</span>`
                  : ""
              }
            </span>
          </p>
          <p class="product-line product-category">${escapeHtml(product.categoryName ?? "ohne Kategorie")}</p>
          <div class="product-meta">
            <span>${escapeHtml(formatLogistics(product))}</span>
            ${buildCompactMetaItems(product)
              .map(
                (item) =>
                  `<span><strong>${escapeHtml(item.label)}</strong> ${escapeHtml(item.value)}</span>`
              )
              .join("")}
          </div>
          ${note}
        </div>
      </div>
    </td>
    <td><span class="status-pill ${product.isActive ? "active" : "inactive"}">${product.isActive ? "aktiv" : "inaktiv"}</span></td>
    <td>${escapeHtml(formatInteger(product.stockNet))}</td>
    <td>${escapeHtml(formatCurrency(product.currentPrice))}</td>
    <td>${escapeHtml(formatCurrency(product.purchasePriceNet))}</td>
    <td>${renderLinkedPrice(product.ebayPrice, product.competitorSource === "EBAY" ? product.competitorUrl : null)}</td>
    <td>${renderIdealoPrice(product)}</td>
    <td>
      <div>${escapeHtml(product.competitorSource ?? "-")}</div>
      <div class="subtle">${renderLinkedPrice(product.competitorPrice, product.competitorUrl)}</div>
    </td>
    <td>${escapeHtml(product.cheapestSeller ?? "-")}</td>
    <td>
      <div>${escapeHtml(product.shippingTariffName ?? "-")}</div>
      <div class="subtle">${escapeHtml(formatCurrency(product.shippingCost))}</div>
    </td>
    <td>${renderProfit(product)}</td>
    <td>
      <div>${escapeHtml(formatCurrency(product.priceDifferenceAbs))}</div>
      <div class="subtle">${escapeHtml(formatPercent(product.priceDifferencePercent))}</div>
    </td>
    <td>${escapeHtml(formatInteger(product.sales7d))}</td>
    <td>${escapeHtml(formatInteger(product.sales30d))}</td>
    <td>${escapeHtml(formatCurrency(product.revenue30d))}</td>
    <td>${escapeHtml(formatInteger(product.daysSinceLastSale))}</td>
    <td>
      <div>${escapeHtml(product.recommendation ?? "")}</div>
      <div class="listing-refresh-box">
        <div class="listing-refresh-head">
          <span class="listing-refresh-chip ${listingRefreshClassName(product.listingRefreshInsight?.status)}">${escapeHtml(product.listingRefreshInsight?.label ?? "Relist unklar")}</span>
          ${
            product.listingRefreshInsight?.listingAgeDays != null
              ? `<span class="subtle">${escapeHtml(formatInteger(product.listingRefreshInsight.listingAgeDays))} Tage online</span>`
              : ""
          }
        </div>
        <div class="subtle">${escapeHtml(product.listingRefreshInsight?.shortReason ?? "Keine belastbare Aussage moeglich.")}</div>
      </div>
    </td>
  `;

  for (const button of row.querySelectorAll("[data-copy-item-id]")) {
    button.addEventListener("click", async () => {
      const value = button.dataset.copyItemId;
      try {
        await navigator.clipboard.writeText(value);
        setStatus(`Plenty ItemID ${value} wurde in die Zwischenablage kopiert.`);
      } catch {
        setStatus("Die ItemID konnte nicht in die Zwischenablage kopiert werden.");
      }
    });
  }

  return row;
}

function createChangeRow(entry) {
  const row = document.createElement("tr");
  row.className = "data-row";
  row.innerHTML = `
    <td>
      <div class="change-layout">
        <div class="change-image">
          ${entry.imageUrl ? `<img alt="${escapeAttribute(entry.title)}" src="${escapeAttribute(entry.imageUrl)}" />` : ""}
        </div>
        <div>
          <p class="change-title">${escapeHtml(entry.title)}</p>
          <p class="change-subline">${escapeHtml(entry.sku ?? "ohne SKU")} | ${escapeHtml(entry.ean ?? "ohne EAN")}</p>
        </div>
      </div>
    </td>
    <td>
      <div><strong>${escapeHtml(changeTypeLabel(entry.changeType))}</strong></div>
      <div class="subtle">${escapeHtml(formatDate(entry.changedAt))}</div>
    </td>
    <td>
      <div>${escapeHtml(`Vorher: ${entry.beforeValue}`)}</div>
      <div class="subtle">${escapeHtml(`Nachher: ${entry.afterValue}`)}</div>
    </td>
    <td>${escapeHtml(`${formatInteger(entry.analysisWindowDays)} Tage davor / danach`)}</td>
    <td>
      <div>${escapeHtml(`${entry.avgSalesPerDayBefore.toFixed(2)} -> ${entry.avgSalesPerDayAfter.toFixed(2)}`)}</div>
      <div class="subtle">${escapeHtml(formatChangeDelta(entry.salesDeltaPercent))}</div>
    </td>
    <td>
      <div>${escapeHtml(`${formatCurrency(entry.avgRevenuePerDayBefore)} -> ${formatCurrency(entry.avgRevenuePerDayAfter)}`)}</div>
      <div class="subtle">${escapeHtml(formatChangeDelta(entry.revenueDeltaPercent))}</div>
    </td>
    <td><span class="change-result ${changeOutcomeClassName(entry.outcome)}">${escapeHtml(changeOutcomeLabel(entry.outcome))}</span></td>
    <td>${escapeHtml(entry.recommendation)}</td>
  `;
  return row;
}

function renderTrafficLight(light) {
  const className = {
    GREEN: "green",
    YELLOW: "yellow",
    RED: "red",
    GREY: "grey",
    BLUE: "blue"
  }[light] ?? "grey";
  const label = {
    GREEN: "Gruen",
    YELLOW: "Gelb",
    RED: "Rot",
    GREY: "Grau",
    BLUE: "Blau"
  }[light] ?? light;

  return `<span class="traffic-light ${className}">${label}</span>`;
}

function renderLinkedPrice(value, url) {
  const price = escapeHtml(formatCurrency(value));
  if (!url) {
    return price;
  }

  return `<a href="${escapeAttribute(url)}" rel="noreferrer" target="_blank">${price}</a>`;
}

function renderIdealoPrice(product) {
  const href = product.idealoUrl ?? product.idealoSearchUrl;
  const price = href
    ? `<a href="${escapeAttribute(href)}" rel="noreferrer" target="_blank">${escapeHtml(formatCurrency(product.idealoPrice))}</a>`
    : escapeHtml(formatCurrency(product.idealoPrice));
  const updatedAt =
    product.idealoPrice != null && product.idealoUpdatedAt
      ? `<div class="subtle">vom ${escapeHtml(formatDate(product.idealoUpdatedAt))}</div>`
      : "";

  return `${price}${updatedAt}`;
}

function renderProfit(product) {
  if (product.ebayProfit == null) {
    return `<div class="subtle">${escapeHtml(profitStatusLabel(product.profitStatus))}</div>`;
  }

  const className = product.ebayProfit >= 0 ? "positive" : "negative";
  return `<div class="${className}">${escapeHtml(formatCurrency(product.ebayProfit))}</div>`;
}

function sortProducts(left, right, sortField) {
  switch (sortField) {
    case "title":
      return left.title.localeCompare(right.title, "de");
    case "sales30d":
      return right.sales30d - left.sales30d;
    case "revenue30d":
      return right.revenue30d - left.revenue30d;
    case "priceDifferencePercent":
      return (right.priceDifferencePercent ?? -999) - (left.priceDifferencePercent ?? -999);
    case "daysSinceLastSale":
      return (right.daysSinceLastSale ?? -1) - (left.daysSinceLastSale ?? -1);
    case "stockNet":
      return right.stockNet - left.stockNet;
    default:
      return 0;
  }
}

function buildCompactMetaItems(product) {
  const items = [];

  if (product.listingStartAt) {
    items.push({ label: "Start:", value: formatDate(product.listingStartAt) });
  }
  if (product.listingUpdatedAt) {
    items.push({ label: "Update:", value: formatDate(product.listingUpdatedAt) });
  }

  const salePriceChange = formatPriceChangeLabel(
    product.lastSalePriceChangeAt,
    product.lastSalePricePrevious,
    product.currentPrice
  );
  if (salePriceChange) {
    items.push({ label: "VK:", value: salePriceChange });
  }

  const purchasePriceChange = formatPriceChangeLabel(
    product.lastPurchasePriceChangeAt,
    product.lastPurchasePricePrevious,
    product.purchasePriceNet
  );
  if (purchasePriceChange) {
    items.push({ label: "EK:", value: purchasePriceChange });
  }

  return items;
}

function formatLogistics(product) {
  if (
    product.weightKg == null ||
    product.lengthCm == null ||
    product.widthCm == null ||
    product.heightCm == null
  ) {
    return "Gewicht / Masse unvollstaendig";
  }

  return `${Number(product.weightKg).toFixed(2)} kg | ${Number(product.lengthCm).toFixed(0)} x ${Number(product.widthCm).toFixed(0)} x ${Number(product.heightCm).toFixed(0)} cm`;
}

function isBWareProduct(product) {
  const titleCandidates = [product.ebayTitle, product.title]
    .map((value) => value?.trim())
    .filter(Boolean);

  return titleCandidates.some((value) => /[()]/.test(value));
}

function formatPriceChangeLabel(changedAt, previousValue, currentValue) {
  if (!changedAt || previousValue == null || currentValue == null) {
    return null;
  }

  return `${formatDate(changedAt)} ${formatCurrency(previousValue)} -> ${formatCurrency(currentValue)}`;
}

function listingRefreshClassName(value) {
  switch (value) {
    case "RELIST":
      return "negative";
    case "WATCH":
      return "too-early";
    case "OK":
      return "positive";
    default:
      return "neutral";
  }
}

function changeTypeLabel(value) {
  switch (value) {
    case "PRICE":
      return "Preis";
    case "LISTING":
      return "Listing-ID";
    default:
      return "eBay Titel";
  }
}

function profitStatusLabel(status) {
  switch (status) {
    case "MISSING_PURCHASE_PRICE":
      return "EK fehlt";
    case "MISSING_DIMENSIONS":
      return "Masse fehlen";
    case "NO_SHIPPING_TARIFF":
      return "Kein Tarif";
    default:
      return "Bereit";
  }
}

function changeOutcomePriority(outcome) {
  switch (outcome) {
    case "NEGATIVE":
      return 0;
    case "TOO_EARLY":
      return 1;
    case "POSITIVE":
      return 2;
    default:
      return 3;
  }
}

function changeOutcomeLabel(outcome) {
  switch (outcome) {
    case "POSITIVE":
      return "Positiv";
    case "NEGATIVE":
      return "Negativ";
    case "TOO_EARLY":
      return "Noch frisch";
    default:
      return "Neutral";
  }
}

function changeOutcomeClassName(outcome) {
  switch (outcome) {
    case "POSITIVE":
      return "positive";
    case "NEGATIVE":
      return "negative";
    case "TOO_EARLY":
      return "too-early";
    default:
      return "neutral";
  }
}

function trendLabel(value) {
  switch (value) {
    case "UP":
      return "Trend steigend";
    case "DOWN":
      return "Trend fallend";
    case "STABLE":
      return "Trend stabil";
    case "NEW":
      return "Trend neu";
    default:
      return "Kein Trend";
  }
}

function trendChipClassName(value) {
  switch (value) {
    case "UP":
    case "NEW":
      return "up";
    case "DOWN":
      return "down";
    case "STABLE":
      return "stable";
    default:
      return "none";
  }
}

function trendArrow(value) {
  switch (value) {
    case "UP":
    case "NEW":
      return "▲";
    case "DOWN":
      return "▼";
    case "STABLE":
      return "▶";
    default:
      return "•";
  }
}

function formatChangeDelta(value) {
  if (value == null) {
    return "Kein Vergleich moeglich";
  }
  if (value > 0) {
    return `+${value.toFixed(1)} %`;
  }
  return `${value.toFixed(1)} %`;
}

function formatCurrency(value) {
  if (value == null) {
    return "-";
  }

  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR"
  }).format(value);
}

function formatInteger(value) {
  if (value == null) {
    return "-";
  }

  return new Intl.NumberFormat("de-DE").format(value);
}

function formatPercent(value) {
  if (value == null) {
    return "-";
  }

  return `${Number(value).toFixed(1)} %`;
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("de-DE", { dateStyle: "medium" }).format(new Date(value));
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function shorten(value, maxLength) {
  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}
