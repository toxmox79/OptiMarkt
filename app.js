const storageKey = "marktoptimierer-shared-export";
const feeStorageKey = "marktoptimierer-fee-calculator-data";

const state = {
  payload: null,
  feeCalculatorData: null,
  selectedProductId: null,
  activeTab: "overview",
  search: "",
  trendFilter: "ALL",
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
  feeFileInput: document.getElementById("fee-json-file-input"),
  clearFileButton: document.getElementById("clear-file-button"),
  clearFeeFileButton: document.getElementById("clear-fee-file-button"),
  statusMessage: document.getElementById("status-message"),
  feeStatusMessage: document.getElementById("fee-status-message"),
  dashboardRoot: document.getElementById("dashboard-root"),
  productModal: document.getElementById("product-modal"),
  productModalBackdrop: document.getElementById("product-modal-backdrop"),
  productModalClose: document.getElementById("product-modal-close"),
  productModalContent: document.getElementById("product-modal-content"),
  tabButtons: Array.from(document.querySelectorAll("[data-tab]")),
  overviewPanel: document.getElementById("overview-panel"),
  changesPanel: document.getElementById("changes-panel"),
  kpiGrid: document.getElementById("kpi-grid"),
  changesKpis: document.getElementById("changes-kpis"),
  searchInput: document.getElementById("search-input"),
  trendFilter: document.getElementById("trend-filter"),
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
  elements.feeFileInput.addEventListener("change", handleFeeFileUpload);
  elements.clearFileButton.addEventListener("click", clearPayload);
  elements.clearFeeFileButton.addEventListener("click", clearFeeCalculatorData);
  elements.productModalBackdrop.addEventListener("click", closeProductModal);
  elements.productModalClose.addEventListener("click", closeProductModal);

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
  elements.trendFilter.addEventListener("change", (event) => {
    state.trendFilter = event.target.value;
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

  try {
    const storedFeeData = window.localStorage.getItem(feeStorageKey);
    if (!storedFeeData) {
      return;
    }

    const parsedFeeData = JSON.parse(storedFeeData);
    if (!isFeeCalculatorData(parsedFeeData)) {
      throw new Error("ungueltig");
    }

    state.feeCalculatorData = parsedFeeData;
    setFeeStatus("Gebuehrenrechner-Datei aus dem Browser-Speicher geladen.");
  } catch {
    window.localStorage.removeItem(feeStorageKey);
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

async function handleFeeFileUpload(event) {
  const file = event.target.files?.[0];
  event.target.value = "";

  if (!file) {
    return;
  }

  setFeeStatus(`Lade ${file.name}...`);

  try {
    const raw = await file.text();
    const parsed = JSON.parse(raw);

    if (!isFeeCalculatorData(parsed)) {
      throw new Error(
        "Die Datei enthaelt nicht die erwarteten Bereiche maerkte, kategorien und versand."
      );
    }

    state.feeCalculatorData = parsed;
    window.localStorage.setItem(feeStorageKey, JSON.stringify(parsed));
    setFeeStatus(`${file.name} wurde fuer lokale Gewinnberechnungen geladen.`);
    render();
  } catch (error) {
    setFeeStatus(
      error instanceof Error
        ? error.message
        : "Die Gebuehrenrechner-Datei konnte nicht geladen werden."
    );
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

function clearFeeCalculatorData() {
  state.feeCalculatorData = null;
  window.localStorage.removeItem(feeStorageKey);
  setFeeStatus("Gebuehrenrechner entfernt. Die Begleitapp nutzt wieder die Werte aus dem Export.");
  render();
}

function setStatus(message) {
  elements.statusMessage.textContent = message;
}

function setFeeStatus(message) {
  elements.feeStatusMessage.textContent = message;
}

function render() {
  const hasPayload = Boolean(state.payload);
  elements.dashboardRoot.classList.toggle("hidden", !hasPayload);
  elements.clearFileButton.style.display = hasPayload ? "inline-flex" : "none";
  elements.clearFeeFileButton.style.display = state.feeCalculatorData ? "inline-flex" : "none";

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
    elements.productModal.classList.add("hidden");
    return;
  }

  renderOverview();
  renderChanges();
  renderProductModal();
}

function renderOverview() {
  const products = getDisplayProducts();
  const baseProducts = products.filter((product) => state.showInactive || product.isActive);
  const inactiveCount = products.filter((product) => !product.isActive).length;
  const categories = Array.from(
    new Set(baseProducts.map((product) => product.categoryName).filter(Boolean))
  ).sort((left, right) => left.localeCompare(right, "de"));

  syncCategoryOptions(categories);
  elements.trendFilter.value = state.trendFilter;

  const filteredProducts = baseProducts
    .filter((product) => {
      if (state.trendFilter === "POSITIVE" && !isPositiveTrendProduct(product)) {
        return false;
      }
      if (state.trendFilter === "NEGATIVE" && !isNegativeTrendProduct(product)) {
        return false;
      }
      if (state.trendFilter === "NO_SALES" && product.sales30d !== 0) {
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

      return [product.title, product.sku, product.ean, product.plentyItemId, product.ebayListingId]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedSearch));
    })
    .sort((left, right) => sortProducts(left, right, state.sortField));

  const visibleKpis = {
    totalProducts: baseProducts.length,
    positiveTrendCount: baseProducts.filter((row) => isPositiveTrendProduct(row)).length,
    negativeTrendCount: baseProducts.filter((row) => isNegativeTrendProduct(row)).length,
    noSalesCount: baseProducts.filter((row) => row.sales30d === 0).length,
    revenue30d: baseProducts.reduce((sum, row) => sum + row.revenue30d, 0),
    sales30d: baseProducts.reduce((sum, row) => sum + row.sales30d, 0),
    withoutEan: baseProducts.filter((row) => !row.ean).length,
    priceDeviationOver10: baseProducts.filter(
      (row) => (row.priceDifferencePercent ?? 0) > 10
    ).length
  };

  elements.kpiGrid.innerHTML = "";
  elements.kpiGrid.append(
    createTrendFilterCard(visibleKpis),
    createKpiCard(
      state.showInactive ? "Artikel gesamt" : "Aktive Artikel",
      formatInteger(visibleKpis.totalProducts),
      state.showInactive
        ? `${formatInteger(inactiveCount)} inaktive Artikel eingeblendet`
        : inactiveCount > 0
          ? `${formatInteger(inactiveCount)} inaktive Artikel ausgeblendet`
          : ""
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
    row.innerHTML = `<td colspan="11"><div class="empty-state">Bisher wurden noch keine Preis- oder Titel-Aenderungen erkannt.</div></td>`;
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

function createTrendFilterCard(visibleKpis) {
  const card = document.createElement("div");
  card.className = "kpi-card trend-filter-card";
  card.innerHTML = `
    <p class="kpi-card-label">Trendfilter</p>
    <div class="trend-filter-list">
      <button class="trend-filter-button trend-positive" data-trend-filter="POSITIVE" type="button">
        <span>Renner</span>
        <span class="trend-filter-value">${escapeHtml(formatInteger(visibleKpis.positiveTrendCount))}</span>
      </button>
      <button class="trend-filter-button trend-negative" data-trend-filter="NEGATIVE" type="button">
        <span>Penner</span>
        <span class="trend-filter-value">${escapeHtml(formatInteger(visibleKpis.negativeTrendCount))}</span>
      </button>
      <button class="trend-filter-button trend-neutral" data-trend-filter="NO_SALES" type="button">
        <span>Ohne Verkaeufe</span>
        <span class="trend-filter-value">${escapeHtml(formatInteger(visibleKpis.noSalesCount))}</span>
      </button>
    </div>
  `;

  for (const button of card.querySelectorAll("[data-trend-filter]")) {
    const value = button.dataset.trendFilter;
    if (value === state.trendFilter) {
      button.classList.add("is-active");
    }
    button.addEventListener("click", () => {
      state.trendFilter = state.trendFilter === value ? "ALL" : value;
      render();
    });
  }

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
        <div class="product-image" data-open-product="${escapeAttribute(product.id)}">
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
    <td>${renderProfit(product)}</td>
    <td>
      <div class="subtle-label">eBay</div>
      <div>${renderLinkedPrice(product.ebayPrice, product.competitorSource === "EBAY" ? product.competitorUrl : null)}</div>
      <div class="subtle-label" style="margin-top:8px;">Idealo</div>
      <div>${renderIdealoPrice(product)}</div>
      <div class="subtle" style="margin-top:8px;">Diff. ${escapeHtml(formatCurrency(product.priceDifferenceAbs))} | ${escapeHtml(formatPercent(product.priceDifferencePercent))}</div>
    </td>
    <td>
      <div>${escapeHtml(product.competitorSource ?? "-")}</div>
      <div class="subtle">${renderLinkedPrice(product.competitorPrice, product.competitorUrl)}</div>
      <div class="subtle" style="margin-top:8px;">Verkaeufer: ${escapeHtml(product.cheapestSeller ?? "-")}</div>
      <div class="subtle">Versand: ${escapeHtml(product.shippingTariffName ?? "-")} | ${escapeHtml(formatCurrency(product.shippingCost))}</div>
    </td>
    <td>
      <div><strong>7d:</strong> ${escapeHtml(formatInteger(product.sales7d))}</div>
      <div><strong>30d:</strong> ${escapeHtml(formatInteger(product.sales30d))}</div>
      <div><strong>Umsatz:</strong> ${escapeHtml(formatCurrency(product.revenue30d))}</div>
      <div class="subtle">${
        product.daysSinceLastSale == null
          ? "Letzter Sale unbekannt"
          : `Letzter Sale vor ${escapeHtml(formatInteger(product.daysSinceLastSale))} Tagen`
      }</div>
    </td>
    <td>
      <div>${escapeHtml(product.recommendation ?? "")}</div>
      <div class="listing-refresh-box">
        <div class="listing-refresh-head">
          <span class="listing-refresh-chip ${listingActivityClassName(product.listingRefreshInsight?.activity?.status)}">${escapeHtml(product.listingRefreshInsight?.activity?.label ?? "Verkaufsaktivitaet unklar")}</span>
          ${
            product.listingRefreshInsight?.activity?.score != null
              ? `<span class="subtle score-pill">Score ${escapeHtml(formatInteger(product.listingRefreshInsight.activity.score))}/100</span>`
              : ""
          }
        </div>
        <div class="subtle">${escapeHtml(product.listingRefreshInsight?.activity?.shortReason ?? "Keine belastbare Aktivitaetsbewertung moeglich.")}</div>
      </div>
      <div class="listing-refresh-box">
        <div class="listing-refresh-head">
          <span class="listing-refresh-chip ${listingRelistClassName(product.listingRefreshInsight?.relist?.status)}">${escapeHtml(product.listingRefreshInsight?.relist?.label ?? "Relist unklar")}</span>
          ${
            product.listingRefreshInsight?.listingAgeDays != null
              ? `<span class="subtle">${escapeHtml(formatInteger(product.listingRefreshInsight.listingAgeDays))} Tage online</span>`
              : ""
          }
        </div>
        <div class="subtle">${escapeHtml(product.listingRefreshInsight?.relist?.shortReason ?? "Keine belastbare Relist-Aussage moeglich.")}</div>
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

  for (const trigger of row.querySelectorAll("[data-open-product]")) {
    trigger.addEventListener("click", () => {
      state.selectedProductId = trigger.dataset.openProduct;
      renderProductModal();
    });
  }

  return row;
}

function closeProductModal() {
  state.selectedProductId = null;
  renderProductModal();
}

function renderProductModal() {
  const product = getDisplayProducts().find((entry) => entry.id === state.selectedProductId) ?? null;

  if (!product) {
    elements.productModal.classList.add("hidden");
    elements.productModalContent.innerHTML = "";
    return;
  }

  elements.productModal.classList.remove("hidden");
  elements.productModalContent.innerHTML = `
    <div class="sheet-hero">
      <div class="sheet-image">
        ${product.imageUrl ? `<img alt="${escapeAttribute(product.title)}" src="${escapeAttribute(product.imageUrl)}" />` : ""}
      </div>
      <div>
        <div class="sheet-badges">
          ${renderTrafficLight(product.trafficLight)}
          <span class="status-pill ${product.isActive ? "active" : "inactive"}">${product.isActive ? "aktiv" : "inaktiv"}</span>
        </div>
        <h2 class="sheet-title">${escapeHtml(product.title)}</h2>
        <p class="sheet-subline">${escapeHtml(product.plentyItemId ?? "-")} | ${escapeHtml(product.sku ?? "ohne SKU")} | ${escapeHtml(product.ean ?? "ohne EAN")}</p>
        <p class="sheet-subline">Listing-ID: ${escapeHtml(product.ebayListingId ?? "Noch keine Listing-ID gespeichert")}</p>
        <p class="sheet-subline">eBay Titel: ${escapeHtml(product.ebayTitle ?? "Noch kein eBay Titel gespeichert")}</p>
      </div>
    </div>
    <div class="sheet-grid">
      <section class="sheet-panel">
        <h3>Preis, Marge und Wettbewerb</h3>
        <div class="sheet-metrics">
          ${renderSheetMetric("Eigener Preis", formatCurrency(product.currentPrice))}
          ${renderSheetMetric("EK netto", formatCurrency(product.purchasePriceNet))}
          ${renderSheetMetric("eBay Preis", formatCurrency(product.ebayPrice))}
          ${renderSheetMetric("Idealo Preis", formatCurrency(product.idealoPrice))}
          ${renderSheetMetric("eBay Gewinn", product.ebayProfit == null ? profitStatusLabel(product.profitStatus) : formatCurrency(product.ebayProfit))}
          ${renderSheetMetric("Versandtarif", escapeHtml(product.shippingTariffName ?? "-"))}
          ${renderSheetMetric("Versandkosten", formatCurrency(product.shippingCost))}
          ${renderSheetMetric("Preisabweichung", formatPercent(product.priceDifferencePercent))}
        </div>
        <div class="sheet-profit-preview">
          <div class="sheet-profit-preview-head">
            <div>
              <p class="sheet-profit-preview-title">Gewinn mit Testpreis berechnen</p>
              <p class="sheet-profit-preview-copy">
                Testet alternativem Verkaufspreis inklusive eBay-Gebuehr, 2 % Werbung und Versand.
              </p>
            </div>
            <div class="sheet-profit-preview-controls">
              <label class="sheet-profit-input-wrap">
                <span>Testpreis brutto</span>
                <input class="field sheet-profit-input" data-profit-price-input type="text" value="${escapeAttribute(product.currentPrice.toFixed(2).replace(".", ","))}" />
              </label>
              <button class="primary-button" data-calc-profit type="button">Gewinn berechnen</button>
            </div>
          </div>
          <div class="sheet-profit-results" data-profit-results>
            ${renderSheetProfitPreview(product, null, null)}
          </div>
        </div>
      </section>
      <section class="sheet-panel">
        <h3>Produkt- und Logistikdaten</h3>
        <div class="sheet-metrics">
          ${renderSheetMetric("Kategorie", escapeHtml(product.categoryName ?? "-"))}
          ${renderSheetMetric("Bestand netto", formatInteger(product.stockNet))}
          ${renderSheetMetric("Gewicht", formatWeight(product.weightKg))}
          ${renderSheetMetric("Masse", formatLogistics(product))}
          ${renderSheetMetric("Listing Start", formatDate(product.listingStartAt))}
          ${renderSheetMetric("Letzte Plenty-Aenderung", formatDate(product.listingUpdatedAt))}
          ${renderSheetMetric("Letzte VK-Aenderung", escapeHtml(formatPriceChangeLabel(product.lastSalePriceChangeAt, product.lastSalePricePrevious, product.currentPrice) ?? "-"))}
          ${renderSheetMetric("Letzte EK-Aenderung", escapeHtml(formatPriceChangeLabel(product.lastPurchasePriceChangeAt, product.lastPurchasePricePrevious, product.purchasePriceNet) ?? "-"))}
          ${renderSheetMetric("Letzte Titel-Aenderung", escapeHtml(formatFullTitleChangeLabel(product.lastTitleChangeAt, product.lastTitlePrevious, product.ebayTitle) ?? "-"))}
        </div>
      </section>
      <section class="sheet-panel">
        <h3>Absatzanalyse</h3>
        <div class="sheet-metrics">
          ${renderSheetMetric("Verkaeufe letzte 24h", formatInteger(product.salesVelocity?.salesLast24h))}
          ${renderSheetMetric("Verkaeufe letzte 7 Tage", formatInteger(product.salesVelocity?.salesLast7d))}
          ${renderSheetMetric("Verkaeufe letzte 30 Tage", formatInteger(product.salesVelocity?.salesLast30d))}
          ${renderSheetMetric("Trendrichtung", escapeHtml(trendLabel(product.salesVelocity?.trendDirection)))}
          ${renderSheetMetric("Wachstum", formatPercent(product.salesVelocity?.growthPercent))}
          ${renderSheetMetric("Forecast 30 Tage", product.salesVelocity?.forecast30d == null ? "-" : `${String(product.salesVelocity.forecast30d).replace(".", ",")}`)}
        </div>
      </section>
      <section class="sheet-panel">
        <h3>Empfehlung und Hinweise</h3>
        <p>${escapeHtml(product.recommendation ?? "-")}</p>
        <div class="listing-refresh-box">
          <div class="listing-refresh-head">
            <span class="listing-refresh-chip ${listingActivityClassName(product.listingRefreshInsight?.activity?.status)}">${escapeHtml(product.listingRefreshInsight?.activity?.label ?? "Verkaufsaktivitaet unklar")}</span>
            ${
              product.listingRefreshInsight?.activity?.score != null
                ? `<span class="subtle score-pill">Score ${escapeHtml(formatInteger(product.listingRefreshInsight.activity.score))}/100</span>`
                : ""
            }
          </div>
          <div class="subtle">${escapeHtml(product.listingRefreshInsight?.activity?.reason ?? "-")}</div>
        </div>
        <div class="listing-refresh-box">
          <div class="listing-refresh-head">
            <span class="listing-refresh-chip ${listingRelistClassName(product.listingRefreshInsight?.relist?.status)}">${escapeHtml(product.listingRefreshInsight?.relist?.label ?? "Relist unklar")}</span>
          </div>
          <div class="subtle">${escapeHtml(product.listingRefreshInsight?.relist?.reason ?? "-")}</div>
        </div>
        ${product.note ? `<div class="sheet-note"><strong>Notiz:</strong> ${escapeHtml(product.note)}</div>` : ""}
      </section>
    </div>
  `;

  const calculateButton = elements.productModalContent.querySelector("[data-calc-profit]");
  const priceInput = elements.productModalContent.querySelector("[data-profit-price-input]");
  const resultsContainer = elements.productModalContent.querySelector("[data-profit-results]");

  if (calculateButton && priceInput && resultsContainer) {
    const runCalculation = () => {
      const normalized = priceInput.value.trim().replace(",", ".");
      const parsedPrice = Number.parseFloat(normalized);

      if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
        resultsContainer.innerHTML = renderSheetProfitPreview(
          product,
          null,
          "Bitte einen gueltigen Verkaufspreis eingeben."
        );
        return;
      }

      if (!state.feeCalculatorData) {
        resultsContainer.innerHTML = renderSheetProfitPreview(
          product,
          null,
          "Bitte zuerst eine gebuehrenrechner-daten.json laden."
        );
        return;
      }

      const preview = calculateEbayProfitWithData(state.feeCalculatorData, {
        salePriceGross: parsedPrice,
        purchasePriceNet: product.purchasePriceNet,
        categoryName: product.categoryName,
        title: product.title,
        weightKg: product.weightKg,
        lengthCm: product.lengthCm,
        widthCm: product.widthCm,
        heightCm: product.heightCm
      });

      resultsContainer.innerHTML = renderSheetProfitPreview(product, {
        salePriceGross: parsedPrice,
        profitNet: preview.profitNet,
        feeAmount: preview.feeAmount,
        adCostNet: preview.adCostNet,
        shippingCost: preview.shippingCost,
        shippingTariffName: preview.shippingTariffName,
        salePriceNet: preview.salePriceNet,
        status: preview.status
      });
    };

    calculateButton.addEventListener("click", runCalculation);
    priceInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        runCalculation();
      }
    });
  }
}

function renderSheetMetric(label, value) {
  return `<div class="sheet-metric"><div class="sheet-metric-label">${label}</div><div class="sheet-metric-value">${value}</div></div>`;
}

function renderSheetProfitPreview(product, preview, message) {
  const profitDelta =
    preview?.profitNet != null && product.ebayProfit != null ? preview.profitNet - product.ebayProfit : null;
  const testProfit =
    preview == null
      ? "-"
      : preview.profitNet == null
        ? profitStatusLabel(preview.status)
        : formatCurrency(preview.profitNet);

  return `
    <div class="sheet-metrics">
      ${renderSheetMetric("Aktueller Preis", formatCurrency(product.currentPrice))}
      ${renderSheetMetric(
        "Aktueller Gewinn",
        product.ebayProfit == null ? profitStatusLabel(product.profitStatus) : formatCurrency(product.ebayProfit)
      )}
      ${renderSheetMetric("Test-Gewinn", testProfit)}
      ${renderSheetMetric("Differenz", profitDelta == null ? "-" : formatCurrency(profitDelta))}
    </div>
    ${
      preview
        ? `<div class="sheet-metrics sheet-profit-detail-grid">
            ${renderSheetMetric("Netto-Verkauf", formatCurrency(preview.salePriceNet))}
            ${renderSheetMetric("eBay Gebuehr", formatCurrency(preview.feeAmount))}
            ${renderSheetMetric("Werbekosten netto", formatCurrency(preview.adCostNet))}
            ${renderSheetMetric(
              "Versand",
              `${formatCurrency(preview.shippingCost)}${preview.shippingTariffName ? ` | ${escapeHtml(preview.shippingTariffName)}` : ""}`
            )}
          </div>`
        : ""
    }
    ${
      message
        ? `<p class="sheet-profit-status">${escapeHtml(message)}</p>`
        : !state.feeCalculatorData
          ? `<p class="sheet-profit-status">Bitte eine <code>gebuehrenrechner-daten.json</code> laden, um lokale Gewinnvorschauen zu berechnen.</p>`
          : `<p class="sheet-profit-status">Mit dem Testpreis laesst sich die Marge direkt im Produktdatenblatt pruefen.</p>`
    }
  `;
}

function getDisplayProducts() {
  return applyFeeCalculatorOverrideToProducts(state.payload?.data?.products ?? [], state.feeCalculatorData);
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
    <td>
      <div>${escapeHtml(`${formatInteger(entry.daysBefore)} Tage vorher`)}</div>
      <div class="subtle">${escapeHtml(`${formatInteger(entry.daysAfter)} Tage nachher`)}</div>
    </td>
    <td>
      <div>${escapeHtml(`${entry.avgSalesPerDayBefore.toFixed(2)} -> ${entry.avgSalesPerDayAfter.toFixed(2)}`)}</div>
      <div class="subtle">${escapeHtml(formatChangeDelta(entry.salesDeltaPercent))}</div>
    </td>
    <td>
      <div>${escapeHtml(`${formatCurrency(entry.avgRevenuePerDayBefore)} -> ${formatCurrency(entry.avgRevenuePerDayAfter)}`)}</div>
      <div class="subtle">${escapeHtml(formatChangeDelta(entry.revenueDeltaPercent))}</div>
    </td>
    <td>
      <div>${escapeHtml(`${formatCurrency(entry.contributionMarginPerDayBefore)} -> ${formatCurrency(entry.contributionMarginPerDayAfter)}`)}</div>
      <div class="subtle">${escapeHtml(formatChangeDelta(entry.contributionMarginDeltaPercent))}</div>
    </td>
    <td>
      <div>${escapeHtml(`${formatCurrency(entry.profitPerDayBefore)} -> ${formatCurrency(entry.profitPerDayAfter)}`)}</div>
      <div class="subtle">${escapeHtml(formatChangeDelta(entry.profitDeltaPercent))}</div>
    </td>
    <td>${escapeHtml(pricePositionLabel(entry.pricePosition))}</td>
    <td>
      <span class="change-result ${changeOutcomeClassName(entry.outcome)}">${escapeHtml(changeOutcomeLabel(entry.outcome))}</span>
      <div class="change-action-wrap">
        <span class="change-result ${recommendedActionClassName(entry.recommendedAction)}">${escapeHtml(recommendedActionLabel(entry.recommendedAction))}</span>
      </div>
    </td>
    <td>${escapeHtml(entry.recommendation)}</td>
  `;
  return row;
}

function isPositiveTrendProduct(product) {
  return (
    product.sales30d > 0 &&
    (product.salesVelocity?.trendDirection === "UP" ||
      product.salesVelocity?.trendDirection === "NEW")
  );
}

function isNegativeTrendProduct(product) {
  return product.sales30d > 0 && product.salesVelocity?.trendDirection === "DOWN";
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

function isFeeCalculatorData(value) {
  return (
    !!value &&
    typeof value === "object" &&
    Array.isArray(value.maerkte) &&
    !!value.kategorien &&
    typeof value.kategorien === "object" &&
    !Array.isArray(value.kategorien) &&
    Array.isArray(value.versand)
  );
}

function applyFeeCalculatorOverrideToProducts(products, feeCalculatorData) {
  if (!feeCalculatorData) {
    return products;
  }

  return products.map((product) => {
    const estimate = calculateEbayProfitWithData(feeCalculatorData, {
      salePriceGross: product.currentPrice,
      purchasePriceNet: product.purchasePriceNet,
      categoryName: product.categoryName,
      title: product.title,
      weightKg: product.weightKg,
      lengthCm: product.lengthCm,
      widthCm: product.widthCm,
      heightCm: product.heightCm
    });

    return {
      ...product,
      ebayProfit: estimate.profitNet,
      ebayFee: estimate.feeAmount,
      shippingCost: estimate.shippingCost,
      shippingTariffName: estimate.shippingTariffName,
      profitStatus: estimate.status
    };
  });
}

function calculateEbayProfitWithData(feeCalculatorData, input) {
  const context = readCalculatorContext(feeCalculatorData);
  const vatRate = input.vatRate ?? 0.19;
  const adRate = input.adRate ?? 0.02;
  const salePriceNet = roundTo(input.salePriceGross / (1 + vatRate), 2);
  const adCostNet = roundTo((input.salePriceGross * adRate) / (1 + vatRate), 2);
  const categoryKey = resolveCalculatorCategory(
    context.categoryConfigs,
    input.categoryName,
    input.title
  );
  const feeAmount = roundTo(calculateEbayFee(context, input.salePriceGross, categoryKey), 2);

  if (
    input.weightKg == null ||
    input.lengthCm == null ||
    input.widthCm == null ||
    input.heightCm == null ||
    input.weightKg <= 0 ||
    input.lengthCm <= 0 ||
    input.widthCm <= 0 ||
    input.heightCm <= 0
  ) {
    return {
      status: "MISSING_DIMENSIONS",
      profitNet: null,
      feeAmount,
      shippingCost: null,
      shippingTariffName: null,
      categoryKey,
      adCostNet,
      salePriceNet
    };
  }

  const shippingTariff = selectBestShippingTariff(context.shippingTariffs, input);
  if (!shippingTariff) {
    return {
      status: "NO_SHIPPING_TARIFF",
      profitNet: null,
      feeAmount,
      shippingCost: null,
      shippingTariffName: null,
      categoryKey,
      adCostNet,
      salePriceNet
    };
  }

  const shippingCost = roundTo(shippingTariff.preis ?? 0, 2);

  if (input.purchasePriceNet == null || input.purchasePriceNet <= 0) {
    return {
      status: "MISSING_PURCHASE_PRICE",
      profitNet: null,
      feeAmount,
      shippingCost,
      shippingTariffName: shippingTariff.name,
      categoryKey,
      adCostNet,
      salePriceNet
    };
  }

  return {
    status: "OK",
    profitNet: roundTo(
      salePriceNet - input.purchasePriceNet - feeAmount - shippingCost - adCostNet,
      2
    ),
    feeAmount,
    shippingCost,
    shippingTariffName: shippingTariff.name,
    categoryKey,
    adCostNet,
    salePriceNet
  };
}

function readCalculatorContext(feeCalculatorData) {
  return {
    markets: feeCalculatorData.maerkte,
    categoryConfigs: feeCalculatorData.kategorien,
    shippingTariffs: feeCalculatorData.versand.map((tariff) => ({
      ...tariff,
      preis: calculateShippingPrice(tariff)
    }))
  };
}

function calculateShippingPrice(tariff) {
  let sum = tariff.grundpreis ?? 0;

  if (tariff.versichert) {
    sum += tariff.versicherung ?? 0;
  }
  if (tariff.treibstoff_prozent) {
    sum += (tariff.grundpreis ?? 0) * tariff.treibstoff_prozent;
  }

  sum += tariff.treibstoff_euro ?? 0;
  sum += tariff.co2 ?? 0;
  sum += tariff.palettenkosten ?? 0;
  sum += tariff.sonstige ?? 0;

  return roundTo(sum, 2);
}

function selectBestShippingTariff(shippingTariffs, input) {
  return (
    [...shippingTariffs]
      .filter((tariff) => {
        const volumetricWeight = tariff.divisor
          ? Math.ceil((input.lengthCm * input.widthCm * input.heightCm) / tariff.divisor)
          : 0;
        const effectiveWeight = Math.max(input.weightKg, volumetricWeight, tariff.volumen ?? 0);

        if (effectiveWeight > (tariff.gewicht ?? 0)) {
          return false;
        }

        return (
          input.lengthCm <= (tariff.l ?? 0) &&
          input.widthCm <= (tariff.b ?? 0) &&
          input.heightCm <= (tariff.h ?? 0)
        );
      })
      .sort((left, right) => (left.preis ?? 0) - (right.preis ?? 0))[0] ?? null
  );
}

function calculateEbayFee(context, salePriceGross, categoryKey) {
  const category = categoryKey ? context.categoryConfigs[categoryKey] ?? null : null;
  const ebayMarket = context.markets.find((market) => market.ebay) ?? null;
  const firstRate = category?.ebay_satz1 ?? category?.ebay ?? ebayMarket?.over ?? 0;
  const threshold = category?.ebay_grenze ?? category?.max ?? ebayMarket?.max ?? 0;
  const secondRate = category?.ebay_satz2 ?? category?.over ?? ebayMarket?.over ?? firstRate;
  const fixedFee = category?.ebay_fix ?? ebayMarket?.fix ?? 0;

  if (threshold <= 0 || salePriceGross <= threshold) {
    return salePriceGross * firstRate + fixedFee;
  }

  return threshold * firstRate + (salePriceGross - threshold) * secondRate + fixedFee;
}

function resolveCalculatorCategory(categoryConfigs, categoryName, title) {
  const defaultCategory = findCategoryKey(categoryConfigs, ["haushaltsgerate"]);
  if (!categoryName?.trim()) {
    return defaultCategory;
  }

  const exactMatch = findExactCategory(categoryConfigs, categoryName);
  if (exactMatch) {
    return exactMatch;
  }

  const haystack = normalizeText(`${categoryName ?? ""} ${title ?? ""}`);
  const mappings = [
    { category: findCategoryKey(categoryConfigs, ["haushaltsgerate klein"]), keywords: ["filter", "kaffee", "wasserkocher", "toaster", "fritteuse"] },
    { category: findCategoryKey(categoryConfigs, ["haushaltsgerate"]), keywords: ["wasch", "trock", "kuhl", "gefrier", "spul", "herd", "backofen", "mikrowelle", "haushalt"] },
    { category: findCategoryKey(categoryConfigs, ["heimwerker"]), keywords: ["werkzeug", "bohr", "schrauber", "sage", "akku", "kompressor"] },
    { category: findCategoryKey(categoryConfigs, ["garten"]), keywords: ["garten", "rasen", "hecke", "terrasse"] },
    { category: findCategoryKey(categoryConfigs, ["spielzeug"]), keywords: ["spielzeug", "lego", "puppe", "baustein"] },
    { category: findCategoryKey(categoryConfigs, ["sport"]), keywords: ["sport", "fitness", "fahrrad"] },
    { category: findCategoryKey(categoryConfigs, ["elektronik"]), keywords: ["audio", "tv", "fernseher", "kamera", "elektronik"] },
    { category: findCategoryKey(categoryConfigs, ["computer"]), keywords: ["computer", "notebook", "laptop", "tablet", "drucker", "monitor"] },
    { category: findCategoryKey(categoryConfigs, ["mobel"]), keywords: ["mobel", "wohnen", "schrank", "sofa", "bett"] },
    { category: findCategoryKey(categoryConfigs, ["haustierbedarf"]), keywords: ["haustier", "tierbedarf", "katze", "hund"] },
    { category: findCategoryKey(categoryConfigs, ["lebensmittel"]), keywords: ["lebensmittel", "nahrung", "getrank"] },
    { category: findCategoryKey(categoryConfigs, ["drogerie"]), keywords: ["drogerie", "kosmetik", "beauty", "pflege", "gesundheit"] },
    { category: findCategoryKey(categoryConfigs, ["auto", "motorrad"]), keywords: ["auto", "motorrad", "reifen"] },
    { category: findCategoryKey(categoryConfigs, ["bekleidung"]), keywords: ["bekleidung", "jacke", "hose", "shirt"] },
    { category: findCategoryKey(categoryConfigs, ["schuhe"]), keywords: ["schuh", "sneaker", "stiefel"] },
    { category: findCategoryKey(categoryConfigs, ["accessoires"]), keywords: ["accessoire", "tasche", "rucksack", "gurtel"] },
    { category: findCategoryKey(categoryConfigs, ["bucher"]), keywords: ["buch", "roman", "kalender"] },
    { category: findCategoryKey(categoryConfigs, ["filme", "musik"]), keywords: ["film", "musik", "dvd", "blu", "vinyl", "cd"] },
    { category: findCategoryKey(categoryConfigs, ["burobedarf"]), keywords: ["buro", "office", "ordner", "papier"] }
  ];

  for (const mapping of mappings) {
    if (mapping.category && mapping.keywords.some((keyword) => haystack.includes(keyword))) {
      return mapping.category;
    }
  }

  return defaultCategory ?? findCategoryKey(categoryConfigs, ["sonstiges"]);
}

function findExactCategory(categoryConfigs, categoryName) {
  if (!categoryName) {
    return null;
  }

  const normalizedCategoryName = normalizeText(categoryName);
  return Object.keys(categoryConfigs).find((key) => normalizeText(key) === normalizedCategoryName) ?? null;
}

function findCategoryKey(categoryConfigs, keywords) {
  return (
    Object.keys(categoryConfigs).find((key) => {
      const normalizedKey = normalizeText(key);
      return keywords.every((keyword) => normalizedKey.includes(keyword));
    }) ?? null
  );
}

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
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

  const listingIdChange = formatListingIdChangeLabel(
    product.lastListingIdChangeAt,
    product.lastListingIdPrevious,
    product.ebayListingId
  );
  if (listingIdChange) {
    items.push({ label: "Listing:", value: listingIdChange });
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

function formatWeight(value) {
  return value == null ? "-" : `${Number(value).toFixed(2)} kg`;
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

function formatFullTitleChangeLabel(changedAt, previousValue, currentValue) {
  if (!changedAt || !previousValue?.trim() || !currentValue?.trim()) {
    return null;
  }

  return `${formatDate(changedAt)} | ${previousValue} -> ${currentValue}`;
}

function formatListingIdChangeLabel(changedAt, previousValue, currentValue) {
  if (!changedAt || !previousValue || !currentValue) {
    return null;
  }

  return `${formatDate(changedAt)} ${previousValue} -> ${currentValue}`;
}

function listingActivityClassName(value) {
  switch (value) {
    case "HIGH":
      return "positive";
    case "STABLE":
      return "info";
    case "DECLINING":
      return "too-early";
    case "LOW":
      return "negative";
    case "CRITICAL":
      return "critical";
    default:
      return "neutral";
  }
}

function listingRelistClassName(value) {
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

function recommendedActionLabel(action) {
  switch (action) {
    case "KEEP":
      return "Preis beibehalten";
    case "RAISE":
      return "Preis erhoehen";
    case "LOWER":
      return "Preis senken";
    case "RETEST":
      return "Erneut testen";
    default:
      return "Beobachten";
  }
}

function recommendedActionClassName(action) {
  switch (action) {
    case "KEEP":
      return "positive";
    case "RAISE":
      return "info";
    case "LOWER":
      return "negative";
    case "RETEST":
      return "too-early";
    default:
      return "neutral";
  }
}

function pricePositionLabel(position) {
  switch (position) {
    case "LIKELY_TOO_LOW":
      return "Vermutlich zu niedrig";
    case "LIKELY_TOO_HIGH":
      return "Vermutlich zu hoch";
    case "LIKELY_MARKET":
      return "Vermutlich marktgerecht";
    default:
      return "Noch unklar";
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

function roundTo(value, digits) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
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
