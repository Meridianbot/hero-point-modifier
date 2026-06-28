/**
 * Hero Point Modifier
 *
 * Erweitert den PF2e-Party-Sheet um einen Reiter "Gruppenressourcen".
 *  - Spielleiter (GM): Ressourcen anlegen, löschen, Icon ändern, Hero-Point-Ersatz markieren.
 *  - Spieler (Besitzer des Party-Actors): Name, Wert und Maximum vorhandener Ressourcen ändern.
 *
 * Die Daten liegen als Flag am Party-Actor: flags["hero-point-modifier"].resources = Resource[]
 *
 * Resource = {
 *   id: string,                    // foundry.utils.randomID()
 *   name: string,
 *   value: number,
 *   max: number | null,            // null = unbegrenzt
 *   img: string,
 *   heroPointReplacement: boolean  // vorerst nur Markierung/Label
 * }
 */

const MODULE_ID = "hero-point-modifier";
const FLAG_KEY = "resources";
const TAB = "group-resources";
const DEFAULT_ICON = "icons/svg/item-bag.svg";

/* -------------------------------------------- */
/*  Hilfsfunktionen                              */
/* -------------------------------------------- */

const loc = (key) => game.i18n.localize(key);

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, (c) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
    }[c]));
}

/** Alle Ressourcen eines Actors (immer ein Array). */
function getResources(actor) {
    const data = actor.getFlag(MODULE_ID, FLAG_KEY);
    return Array.isArray(data) ? data : [];
}

/** Wert auf [0, max] begrenzen (max=null => keine Obergrenze). */
function clampValue(value, max) {
    let v = Math.floor(Number(value) || 0);
    if (v < 0) v = 0;
    if (max !== null && max !== undefined && Number.isFinite(max)) v = Math.min(v, max);
    return v;
}

/**
 * Ressourcen-Array mutieren, am Actor speichern (ohne vollständigen Re-Render)
 * und die lokale Liste neu aufbauen, damit der aktive Reiter erhalten bleibt.
 */
async function mutate(app, tabEl, fn) {
    const actor = app.actor;
    const resources = foundry.utils.deepClone(getResources(actor));
    const result = fn(resources);
    if (result === false) return; // abgebrochen
    await actor.update({ [`flags.${MODULE_ID}.${FLAG_KEY}`]: resources }, { render: false });
    renderResourceList(app, tabEl);
}

/* -------------------------------------------- */
/*  Render                                       */
/* -------------------------------------------- */

function resourceRowHTML(resource, { isGM, canEdit }) {
    const name = escapeHTML(resource.name ?? "");
    const value = Number(resource.value) || 0;
    const max = resource.max ?? "";
    const img = escapeHTML(resource.img || DEFAULT_ICON);
    const editDisabled = canEdit ? "" : "disabled";
    const gmDisabled = isGM ? "" : "disabled";

    return `
    <li class="hpm-resource" data-resource-id="${escapeHTML(resource.id)}">
        <img class="hpm-icon" src="${img}" alt="${name}"
             ${isGM ? `data-action="edit-img" data-tooltip="${escapeHTML(loc("HPM.EditIcon"))}"` : ""} />

        <div class="hpm-name">
            ${canEdit
                ? `<input type="text" class="hpm-name-input" value="${name}" ${editDisabled}
                          placeholder="${escapeHTML(loc("HPM.NewResourceName"))}" />`
                : `<span class="hpm-name-text">${name}</span>`}
        </div>

        <div class="hpm-counter">
            <button type="button" class="hpm-dec" ${editDisabled} title="-1">−</button>
            <input type="number" class="hpm-value" value="${value}" ${editDisabled} />
            <span class="hpm-sep">/</span>
            <input type="number" class="hpm-max" value="${max}" min="0" ${editDisabled}
                   placeholder="∞" data-tooltip="${escapeHTML(loc("HPM.Max"))}" />
            <button type="button" class="hpm-inc" ${editDisabled} title="+1">+</button>
        </div>

        <label class="hpm-hp-toggle" data-tooltip="${escapeHTML(loc("HPM.HeroPointReplacement.Hint"))}">
            <input type="checkbox" class="hpm-hp" ${resource.heroPointReplacement ? "checked" : ""} ${gmDisabled} />
            <span>${escapeHTML(loc("HPM.HeroPointReplacement.Label"))}</span>
        </label>

        ${isGM
            ? `<button type="button" class="hpm-delete" data-tooltip="${escapeHTML(loc("HPM.DeleteResource"))}">
                   <i class="fa-solid fa-trash"></i>
               </button>`
            : ""}
    </li>`;
}

/** Baut den Inhalt des Reiters neu auf und hängt die Listener an. */
function renderResourceList(app, tabEl) {
    const actor = app.actor;
    const isGM = game.user.isGM;
    const canEdit = actor.isOwner;
    const resources = getResources(actor);

    const rows = resources.map((r) => resourceRowHTML(r, { isGM, canEdit })).join("");

    tabEl.innerHTML = `
        <div class="hpm-toolbar">
            <h3 class="hpm-title">${escapeHTML(loc("HPM.Tab.Label"))}</h3>
            ${isGM
                ? `<button type="button" class="hpm-add">
                       <i class="fa-solid fa-plus"></i> ${escapeHTML(loc("HPM.AddResource"))}
                   </button>`
                : ""}
        </div>
        <ol class="hpm-resource-list">
            ${rows || `<li class="hpm-empty">${escapeHTML(loc("HPM.NoResources"))}</li>`}
        </ol>`;

    attachListeners(app, tabEl);
}

/* -------------------------------------------- */
/*  Listener / Aktionen                          */
/* -------------------------------------------- */

function attachListeners(app, tabEl) {
    tabEl.querySelector(".hpm-add")?.addEventListener("click", () => addResource(app, tabEl));

    for (const li of tabEl.querySelectorAll(".hpm-resource")) {
        const id = li.dataset.resourceId;

        li.querySelector(".hpm-inc")?.addEventListener("click", () => adjust(app, tabEl, id, +1));
        li.querySelector(".hpm-dec")?.addEventListener("click", () => adjust(app, tabEl, id, -1));

        li.querySelector(".hpm-value")?.addEventListener("change", (e) =>
            setField(app, tabEl, id, "value", e.target.value));
        li.querySelector(".hpm-max")?.addEventListener("change", (e) =>
            setField(app, tabEl, id, "max", e.target.value));
        li.querySelector(".hpm-name-input")?.addEventListener("change", (e) =>
            setField(app, tabEl, id, "name", e.target.value));
        li.querySelector(".hpm-hp")?.addEventListener("change", (e) =>
            setField(app, tabEl, id, "heroPointReplacement", e.target.checked));

        li.querySelector(".hpm-delete")?.addEventListener("click", () => deleteResource(app, tabEl, id));
        li.querySelector('[data-action="edit-img"]')?.addEventListener("click", () => editIcon(app, tabEl, id));
    }
}

function addResource(app, tabEl) {
    if (!game.user.isGM) return;
    return mutate(app, tabEl, (resources) => {
        resources.push({
            id: foundry.utils.randomID(),
            name: loc("HPM.NewResourceName"),
            value: 0,
            max: null,
            img: DEFAULT_ICON,
            heroPointReplacement: false,
        });
    });
}

function adjust(app, tabEl, id, delta) {
    return mutate(app, tabEl, (resources) => {
        const r = resources.find((x) => x.id === id);
        if (!r) return false;
        r.value = clampValue((Number(r.value) || 0) + delta, r.max);
    });
}

function setField(app, tabEl, id, field, rawValue) {
    return mutate(app, tabEl, (resources) => {
        const r = resources.find((x) => x.id === id);
        if (!r) return false;

        switch (field) {
            case "name":
                r.name = String(rawValue ?? "").trim() || loc("HPM.NewResourceName");
                break;
            case "max": {
                const str = String(rawValue ?? "").trim();
                r.max = str === "" ? null : Math.max(0, Math.floor(Number(str) || 0));
                r.value = clampValue(r.value, r.max);
                break;
            }
            case "value":
                r.value = clampValue(rawValue, r.max);
                break;
            case "heroPointReplacement":
                if (!game.user.isGM) return false; // nur GM darf umschalten
                r.heroPointReplacement = !!rawValue;
                // Exklusiv: immer nur eine Ressource darf HP-Ersatz sein
                if (r.heroPointReplacement) {
                    for (const other of resources) {
                        if (other.id !== r.id) other.heroPointReplacement = false;
                    }
                }
                break;
            case "img":
                if (!game.user.isGM) return false; // nur GM darf Icon ändern
                r.img = String(rawValue || DEFAULT_ICON);
                break;
            default:
                return false;
        }
    });
}

async function deleteResource(app, tabEl, id) {
    if (!game.user.isGM) return;
    const resource = getResources(app.actor).find((x) => x.id === id);
    const name = resource?.name ?? "";

    const confirmed = await foundry.applications.api.DialogV2.confirm({
        window: { title: loc("HPM.DeleteResource") },
        content: `<p>${game.i18n.format("HPM.DeleteConfirm", { name: escapeHTML(name) })}</p>`,
    });
    if (!confirmed) return;

    return mutate(app, tabEl, (resources) => {
        const idx = resources.findIndex((x) => x.id === id);
        if (idx === -1) return false;
        resources.splice(idx, 1);
    });
}

function editIcon(app, tabEl, id) {
    if (!game.user.isGM) return;
    const resource = getResources(app.actor).find((x) => x.id === id);
    if (!resource) return;

    const FP = foundry.applications?.apps?.FilePicker?.implementation ?? FilePicker;
    new FP({
        type: "image",
        current: resource.img || DEFAULT_ICON,
        callback: (path) => setField(app, tabEl, id, "img", path),
    }).render(true);
}

/* -------------------------------------------- */
/*  Tab-Umschaltung                              */
/* -------------------------------------------- */

function setupTabSwitching(nav, container) {
    nav.addEventListener("click", (event) => {
        const link = event.target.closest("a[data-tab]");
        if (!link || !nav.contains(link)) return;
        const name = link.dataset.tab;

        for (const navLink of nav.querySelectorAll("a[data-tab]")) {
            navLink.classList.toggle("active", navLink.dataset.tab === name);
        }
        for (const content of container.querySelectorAll(":scope > .tab")) {
            content.classList.toggle("active", content.dataset.tab === name);
        }
    });
}

/* -------------------------------------------- */
/*  Sheet-Injektion                              */
/* -------------------------------------------- */

function onRenderPartySheet(app, html) {
    const root = html instanceof HTMLElement ? html : html?.[0];
    if (!root) return;

    const nav = root.querySelector("nav.sub-nav");
    const container = root.querySelector("section.container");
    if (!nav || !container) return;

    // Doppel-Injektion vermeiden
    if (nav.querySelector(`a[data-tab="${TAB}"]`)) return;

    // Nav-Eintrag
    const link = document.createElement("a");
    link.dataset.tab = TAB;
    link.innerHTML = `<i class="fa-solid fa-coins"></i> ${escapeHTML(loc("HPM.Tab.Label"))}`;
    nav.appendChild(link);

    // Reiter-Container
    const tabEl = document.createElement("div");
    tabEl.classList.add("tab", "hpm-group-resources");
    tabEl.dataset.tab = TAB;
    container.appendChild(tabEl);

    setupTabSwitching(nav, container);
    renderResourceList(app, tabEl);

    // Overview: bei aktivem Pool die Mitglieder-HP durch "freier Heldenpunkt"-Boxen ersetzen
    decorateMemberHeroPoints(root, app.actor);
    injectFreeHeroPointToolbar(root, app.actor);
}

/* ============================================================ */
/*  Hero-Point-Ersatz: Mechanik                                  */
/* ============================================================ */

/**
 * Liefert { party, resource } der aktiven HP-Ersatz-Ressource für einen Charakter,
 * oder null, wenn keine aktiv ist.
 */
function getActiveHeroPool(actor) {
    if (!actor?.isOfType?.("character")) return null;

    const parties = actor.parties instanceof Set ? [...actor.parties] : [];
    const candidates = parties.length
        ? parties
        : (game.actors?.party ? [game.actors.party] : []);

    // aktive Party bevorzugen
    candidates.sort((a, b) => (b?.active ? 1 : 0) - (a?.active ? 1 : 0));

    for (const party of candidates) {
        const resource = getResources(party).find((r) => r.heroPointReplacement);
        if (resource) return { party, resource };
    }
    return null;
}

/** Schreibt einen geclampten Wert in die Pool-Ressource am Party-Actor. */
async function setPoolValue(party, resourceId, value) {
    const resources = foundry.utils.deepClone(getResources(party));
    const r = resources.find((x) => x.id === resourceId);
    if (!r) return;
    r.value = clampValue(value, r.max);
    try {
        await party.update({ [`flags.${MODULE_ID}.${FLAG_KEY}`]: resources });
    } catch (err) {
        ui.notifications?.warn(loc("HPM.NoPermission"));
        console.warn(`${MODULE_ID} | Pool-Update fehlgeschlagen`, err);
    }
}

/* ---- "Freier Heldenpunkt": Pro-Mitglied-Status (am Party-Actor) ---- */
const FREE_HP_KEY = "freeHeroPoints";

/** { [memberId]: true } – true = freier Heldenpunkt bereits genutzt. */
function getFreeHeroPoints(party) {
    const data = party?.getFlag?.(MODULE_ID, FREE_HP_KEY);
    return data && typeof data === "object" ? data : {};
}

async function setFreeHeroPoint(party, memberId, used) {
    if (!party || !memberId) return;
    try {
        await party.update({ [`flags.${MODULE_ID}.${FREE_HP_KEY}.${memberId}`]: !!used });
    } catch (err) {
        ui.notifications?.warn(loc("HPM.NoPermission"));
        console.warn(`${MODULE_ID} | Frei-HP-Update fehlgeschlagen`, err);
    }
}

/** Alle bekannten Mitglieder wieder auf "frei" setzen (GM). */
async function resetAllFreeHeroPoints(party) {
    if (!party) return;
    const updates = {};
    for (const member of party.members ?? []) {
        updates[`flags.${MODULE_ID}.${FREE_HP_KEY}.${member.id}`] = false;
    }
    try {
        await party.update(updates);
    } catch (err) {
        ui.notifications?.warn(loc("HPM.NoPermission"));
        console.warn(`${MODULE_ID} | Frei-HP-Reset fehlgeschlagen`, err);
    }
}

/**
 * Überträgt alle noch freien Boxen in den Pool: jede freie zählt +1 in den Pool
 * (bis zum Maximum), die übertragenen Boxen werden als genutzt markiert.
 */
async function collectFreeIntoPool(party) {
    if (!party) return;
    const poolRes = getResources(party).find((r) => r.heroPointReplacement);
    if (!poolRes) return;

    const free = getFreeHeroPoints(party);
    const freeMembers = (party.members ?? []).filter(
        (m) => m?.isOfType?.("character") && !free[m.id],
    );
    if (freeMembers.length === 0) {
        ui.notifications?.info(loc("HPM.FreeHeroPoint.NoneFree"));
        return;
    }

    const resources = foundry.utils.deepClone(getResources(party));
    const r = resources.find((x) => x.id === poolRes.id);
    if (!r) return;

    const current = clampValue(r.value, r.max);
    const space = r.max === null || r.max === undefined || !Number.isFinite(r.max)
        ? Infinity
        : Math.max(0, r.max - current);
    const toAdd = Math.min(freeMembers.length, space);
    if (toAdd <= 0) {
        ui.notifications?.warn(loc("HPM.FreeHeroPoint.PoolFull"));
        return;
    }

    r.value = clampValue(current + toAdd, r.max);
    const updates = { [`flags.${MODULE_ID}.${FLAG_KEY}`]: resources };
    for (const m of freeMembers.slice(0, toAdd)) {
        updates[`flags.${MODULE_ID}.${FREE_HP_KEY}.${m.id}`] = true;
    }
    try {
        await party.update(updates);
    } catch (err) {
        ui.notifications?.warn(loc("HPM.NoPermission"));
        console.warn(`${MODULE_ID} | Übertrag in Pool fehlgeschlagen`, err);
    }
}

/** Sucht einen Property-Deskriptor entlang der Prototyp-Kette. */
function findDescriptor(proto, prop) {
    let obj = proto;
    while (obj) {
        const desc = Object.getOwnPropertyDescriptor(obj, prop);
        if (desc) return desc;
        obj = Object.getPrototypeOf(obj);
    }
    return null;
}

/**
 * Patcht CharacterPF2e so, dass die als HP-Ersatz markierte Gruppenressource
 * die individuellen Heldenpunkte ersetzt (Lesen, Anzeigen und Ausgeben).
 */
function patchCharacterClass() {
    const CharacterPF2e = CONFIG?.PF2E?.Actor?.documentClasses?.character;
    if (!CharacterPF2e) {
        console.error(`${MODULE_ID} | CharacterPF2e nicht gefunden – HP-Ersatz inaktiv`);
        return;
    }
    const proto = CharacterPF2e.prototype;

    // --- getResource: Anzeige + Reroll-Lesen ---
    const origGetResource = proto.getResource;
    proto.getResource = function (resource) {
        const result = origGetResource.call(this, resource);
        const slug = typeof resource === "string" ? resource : "";
        if (slug === "hero-points" || result?.slug === "hero-points") {
            const pool = getActiveHeroPool(this);
            if (pool) {
                return {
                    ...(result ?? {}),
                    slug: "hero-points",
                    value: clampValue(pool.resource.value, pool.resource.max),
                    max: pool.resource.max ?? Math.max(pool.resource.value, 0),
                    label: result?.label ?? "PF2E.HeroPointsLabel",
                };
            }
        }
        return result;
    };

    // --- updateResource: Ausgeben/Erhöhen schreibt in den Pool ---
    const origUpdateResource = proto.updateResource;
    proto.updateResource = async function (resource, value, options = {}) {
        const slug = typeof resource === "string" ? resource : "";
        if (slug === "hero-points") {
            const pool = getActiveHeroPool(this);
            if (pool) {
                const before = clampValue(pool.resource.value, pool.resource.max);
                await setPoolValue(pool.party, pool.resource.id, value);
                // Verbrauch (Wert sinkt) -> "freien Heldenpunkt" dieses Mitglieds als genutzt markieren
                if (clampValue(value, pool.resource.max) < before) {
                    await setFreeHeroPoint(pool.party, this.id, true);
                }
                return;
            }
        }
        return origUpdateResource.call(this, resource, value, options);
    };

    // --- heroPoints-Getter: Reroll-Menü-Bedingung u.a. ---
    const heroDesc = findDescriptor(proto, "heroPoints");
    if (heroDesc?.get) {
        const origGet = heroDesc.get;
        Object.defineProperty(proto, "heroPoints", {
            configurable: true,
            get() {
                const pool = getActiveHeroPool(this);
                if (pool) {
                    return {
                        value: clampValue(pool.resource.value, pool.resource.max),
                        max: pool.resource.max ?? 3,
                    };
                }
                return origGet.call(this);
            },
        });
    }

    console.log(`${MODULE_ID} | CharacterPF2e gepatcht (HP-Ersatz aktiv)`);
}

/* ---- Anzeige: Pips durch Pool-Zahl ersetzen ---- */

/** Ersetzt den Inhalt eines Pip-Elements durch eine "Wert / Max"-Zahl. */
function renderPoolNumberInto(el, pool) {
    const max = pool.resource.max ?? null;
    el.replaceChildren();
    el.classList.add("hpm-pool-number");
    el.dataset.tooltip = game.i18n.format("HPM.PoolTooltip", { name: pool.resource.name });

    const value = document.createElement("span");
    value.className = "hpm-pool-value";
    value.textContent = String(clampValue(pool.resource.value, max));

    const sep = document.createElement("span");
    sep.className = "hpm-pool-sep";
    sep.textContent = " / ";

    const maxEl = document.createElement("span");
    maxEl.className = "hpm-pool-max";
    maxEl.textContent = max === null ? "∞" : String(max);

    el.append(value, sep, maxEl);
}

/** Charakterbogen-Header: Heldenpunkt-Pips -> Pool-Zahl. */
function onRenderCharacterSheet(app, html) {
    const root = html instanceof HTMLElement ? html : html?.[0];
    if (!root) return;
    const pool = getActiveHeroPool(app.actor);
    if (!pool) return;

    const el = root.querySelector('[data-action="adjust-resource"][data-resource="hero-points"]');
    if (!el) return;
    renderPoolNumberInto(el, pool);

    // Beschriftung "Hero Points" durch den Ressourcennamen ersetzen
    const labelEl = el.closest(".dots")?.querySelector(".label");
    if (labelEl) labelEl.textContent = pool.resource.name;
}

/**
 * Party-Overview: Bei aktivem Pool die Mitglieder-Heldenpunkte NICHT anzeigen,
 * sondern eine "freier Heldenpunkt"-Box (einmalig, hakt sich beim Ausgeben selbst ab).
 */
function decorateMemberHeroPoints(root, party) {
    const els = root.querySelectorAll('[data-action="adjust-member-resource"][data-resource="hero-points"]');
    for (const el of els) {
        const row = el.closest("[data-actor-uuid]");
        const uuid = row?.dataset.actorUuid;
        const member = uuid ? fromUuidSync(uuid) : null;
        const pool = getActiveHeroPool(member);
        if (!pool) continue; // kein Pool -> normale HP-Anzeige belassen
        renderFreeHeroPointBox(el, party, member);
    }
}

/** Ersetzt das HP-Element eines Mitglieds durch eine Checkbox für den freien Heldenpunkt. */
function renderFreeHeroPointBox(el, party, member) {
    const used = !!getFreeHeroPoints(party)[member.id];

    const label = document.createElement("label");
    label.className = `hpm-free-hp${used ? " used" : ""}`;
    label.dataset.tooltip = loc("HPM.FreeHeroPoint.Hint");

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = used;
    cb.disabled = !party.isOwner;
    cb.addEventListener("change", () => setFreeHeroPoint(party, member.id, cb.checked));

    const span = document.createElement("span");
    span.className = "hpm-free-hp-label";
    span.textContent = loc("HPM.FreeHeroPoint.Label");

    label.append(cb, span);
    el.replaceWith(label); // ersetzt das <a> samt System-Listener vollständig
}

/** GM-Buttons oben in der Overview (nur bei aktivem Pool). */
function injectFreeHeroPointToolbar(root, party) {
    if (!game.user.isGM) return;
    const region = root.querySelector('[data-region="overview"]');
    const content = region?.querySelector(":scope > .content") ?? region;
    if (!content || content.querySelector(".hpm-free-hp-toolbar")) return;

    const poolRes = getResources(party).find((r) => r.heroPointReplacement);
    if (!poolRes) return;
    const name = poolRes.name || loc("HPM.Tab.Label");

    const bar = document.createElement("div");
    bar.className = "hpm-free-hp-toolbar";

    const giveBtn = document.createElement("button");
    giveBtn.type = "button";
    giveBtn.innerHTML =
        `<i class="fa-solid fa-hand-holding-heart"></i> ` +
        escapeHTML(game.i18n.format("HPM.FreeHeroPoint.GiveAll", { name }));
    giveBtn.addEventListener("click", () => resetAllFreeHeroPoints(party));

    const collectBtn = document.createElement("button");
    collectBtn.type = "button";
    collectBtn.innerHTML =
        `<i class="fa-solid fa-arrow-down-to-line"></i> ` +
        escapeHTML(game.i18n.format("HPM.FreeHeroPoint.CollectToPool", { name }));
    collectBtn.addEventListener("click", () => collectFreeIntoPool(party));

    bar.append(giveBtn, collectBtn);
    content.prepend(bar);
}

/** Bei Pool-Änderung offene Mitglieder-Bögen aktualisieren. */
function onUpdateActor(actor, changes) {
    if (actor?.type !== "party") return;
    if (!foundry.utils.hasProperty(changes, `flags.${MODULE_ID}.${FLAG_KEY}`)) return;
    for (const member of actor.members ?? []) {
        if (member?.sheet?.rendered) member.sheet.render(false);
    }
}

/* -------------------------------------------- */
/*  Hooks                                         */
/* -------------------------------------------- */

Hooks.once("init", () => {
    console.log(`${MODULE_ID} | initialisiert`);
});

Hooks.once("setup", () => {
    patchCharacterClass();
});

Hooks.on("renderPartySheetPF2e", onRenderPartySheet);
Hooks.on("renderCharacterSheetPF2e", onRenderCharacterSheet);
Hooks.on("updateActor", onUpdateActor);
