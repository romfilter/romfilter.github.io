"use strict";
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
// index.tsx - Lógica del Frontend para el Filtro de ROMs (Versión 7.4 - Ajuste orden regiones por defecto)
console.log("index.tsx: Script cargado. Versión 7.4 - Ajuste orden regiones por defecto. POR FAVOR, LIMPIE CACHÉ Y REVISE LA CONSOLA DEL NAVEGADOR.");
// --- Constantes y Datos por Defecto ---
// Standardized to UPPERCASE for consistency in matching and configuration
const ALL_EXCLUDABLE_TAGS = ["DEMO", "BETA", "PROTO", "UNL", "AFTERMARKET", "AUTO DEMO", "BIOS", "PROGRAM"];
const ALL_EXCLUDABLE_REGIONS = ["Europe", "World", "USA", "Spain", "France", "Germany", "Japan", "Korea", "Asia", "China", "Brazil", "Russia", "Taiwan"];
const DEFAULT_LANGUAGES_ORDER = ["Es", "En", "Fr", "De", "It", "Pt", "Ja"];
const DEFAULT_TAG_EXCL_STATES = Object.fromEntries(ALL_EXCLUDABLE_TAGS.map(tag => [tag, true]));
const DEFAULT_REGION_EXCL_STATES = {
    'Europe': false, 'World': false, 'USA': false, 'Spain': false,
    'France': true,
    'Germany': true,
    'Japan': true, 'Korea': true, 'Asia': true, 'China': true,
    'Brazil': true, 'Russia': true, 'Taiwan': true
};
// Nuevo orden por defecto para regiones preferidas
const DEFAULT_REGIONS_ORDER = ["Spain", "Europe", "World", "USA", "France", "Germany", "Japan", "Korea", "Asia", "China", "Brazil", "Russia", "Taiwan"];
// --- Referencias a Elementos del DOM ---
let tagsCheckboxesContainer, regionesExcluirCheckboxesContainer, rvRegionesContainer, rvIdiomasContainer, rvSalvadosContainer, rvEliminadosContainer, btnRegionUp, btnRegionDown, btnIdiomaUp, btnIdiomaDown, btnPrevisualizar, btnMoverAEliminados, btnMoverASalvados, btnGenerarFinal, fileInput, filePathDisplay, labelSalvados, labelEliminados, statusLabel, customMessageBox, customMessageText, customMessageButton;
// --- Estado de la Aplicación ---
function getDefaultConfig() {
    return {
        exclude_tags: { ...DEFAULT_TAG_EXCL_STATES },
        preferred_regions: [...DEFAULT_REGIONS_ORDER],
        preferred_languages: [...DEFAULT_LANGUAGES_ORDER],
        exclude_regions: { ...DEFAULT_REGION_EXCL_STATES }
    };
}
let currentConfig = getDefaultConfig();
let romFileContent = null;
let simulacionResultados = { salvados: [], eliminados: [], mapa_url: {} };
let selectedItemElement = null;
// --- Constantes para Parseo ---
const REGION_MAP = {
    "U": "USA", "US": "USA",
    "E": "Europe", "EUR": "Europe",
    "J": "Japan", "JPN": "Japan",
    "K": "Korea", "KOR": "Korea",
    "S": "Spain", "SPA": "Spain",
    "F": "France", "FRA": "France",
    "G": "Germany", "GER": "Germany",
    "I": "Italy", "ITA": "Italy",
    "ASI": "Asia", "AS": "Asia",
    "AUS": "Australia", "AU": "Australia",
    "BR": "Brazil", "BRA": "Brazil",
    "CAN": "Canada", "CA": "Canada",
    "CN": "China", "CHN": "China",
    "RU": "Russia", "RUS": "Russia",
    "TW": "Taiwan", "TWN": "Taiwan",
    "W": "World", "WOR": "World", "MULTI": "World",
    "UK": "United Kingdom",
    "SCANDINAVIA": "Europe", "NORDIC": "Europe",
    "BENELUX": "Europe"
};
const LANGUAGE_MAP = {
    "EN": "En", "ENG": "En", "ENGLISH": "En",
    "ES": "Es", "SPA": "Es", "SPANISH": "Es",
    "FR": "Fr", "FRE": "Fr", "FRENCH": "Fr",
    "DE": "De", "GER": "De", "GERMAN": "De",
    "IT": "It", "ITA": "It", "ITALIAN": "It",
    "JP": "Ja", "JPN": "Ja", "JAPANESE": "Ja",
    "KO": "Ko", "KOR": "Ko", "KOREAN": "Ko",
    "ZH": "Zh", "CHI": "Zh", "CHINESE": "Zh",
    "PT": "Pt", "POR": "Pt", "PORTUGUESE": "Pt",
    "NL": "Nl", "DUT": "Nl", "DUTCH": "Nl",
    "RU": "Ru", "RUS": "Ru", "RUSSIAN": "Ru",
    "PL": "Pl", "POL": "Pl", "POLISH": "Pl",
    "SV": "Sv", "SWE": "Sv", "SWEDISH": "Sv",
    "DA": "Da", "DAN": "Da", "DANISH": "Da",
    "FI": "Fi", "FIN": "Fi", "FINNISH": "Fi",
    "NO": "No", "NOR": "No", "NORWEGIAN": "No",
    "CS": "Cs", "CES": "Cs", "CZECH": "Cs",
    "HU": "Hu", "HUN": "Hu", "HUNGARIAN": "Hu",
};
const KNOWN_REGIONS_FOR_PARSING = new Set(Object.keys(REGION_MAP).map(k => k.toUpperCase()).concat(ALL_EXCLUDABLE_REGIONS.map(r => r.toUpperCase())));
const KNOWN_LANGUAGES_FOR_PARSING = new Set(Object.keys(LANGUAGE_MAP).map(k => k.toUpperCase()).concat(DEFAULT_LANGUAGES_ORDER.map(l => l.toUpperCase())));
const KNOWN_EXCLUDABLE_TAGS_FOR_PARSING = new Set(ALL_EXCLUDABLE_TAGS.map(t => t.toUpperCase()));
// --- Funciones de Parseo ---
function parseRomName(filename) {
    let workName = filename;
    const regions = [];
    const languages = [];
    const tags = [];
    let fileExtension;
    let isVerifiedGood = false;
    let isBadDump = false;
    let parsedVersion;
    let parsedRevision;
    const collectedMiscTags = [];
    const extMatch = workName.match(/\.([a-z0-9]{1,5})$/i);
    if (extMatch) {
        fileExtension = extMatch[0];
        workName = workName.substring(0, workName.length - fileExtension.length);
    }
    const allEnclosedRegex = /[\(\[]([^\]\)]+)[\)\]]/g;
    const extractedRawItems = [];
    let matchEnclosed;
    while ((matchEnclosed = allEnclosedRegex.exec(workName)) !== null) {
        extractedRawItems.push(matchEnclosed[1]);
    }
    // Sort by length to process longer, potentially more specific items first (e.g. "Version 1.0" before "V1.0" if both present)
    // However, primary logic is to take the first V/R found. This sort might not be critical for V/R but was for baseName.
    extractedRawItems.sort((a, b) => b.length - a.length);
    let tempBaseName = workName; // For baseName calculation
    for (const item of extractedRawItems) {
        const escapedItem = item.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        tempBaseName = tempBaseName.replace(new RegExp(`\\s*[\\(\\[]${escapedItem}[\\)\\]]`, 'g'), "").trim();
    }
    for (const rawItem of extractedRawItems) {
        let rawItemFullyClaimedByVersionOrRevision = false;
        // Attempt 1: Check if the *entire* rawItem is a version string
        if (!parsedVersion) {
            const versionMatch = rawItem.match(/^(?:v|ver(?:sion)?\.?)\s*(\d+)(?:\.(\d+))?(?:\.(\d+))?([a-z])?$/i);
            if (versionMatch) {
                parsedVersion = {
                    major: parseInt(versionMatch[1]),
                    minor: versionMatch[2] ? parseInt(versionMatch[2]) : 0,
                    patch: versionMatch[3] ? parseInt(versionMatch[3]) : 0,
                    sub: versionMatch[4] ? versionMatch[4].toLowerCase() : undefined
                };
                rawItemFullyClaimedByVersionOrRevision = true;
            }
        }
        // Attempt 2: Check if the *entire* rawItem is a revision string (if not a version)
        if (!rawItemFullyClaimedByVersionOrRevision && !parsedRevision) {
            const revisionMatch = rawItem.match(/^(?:rev(?:ision)?\.?)\s*([a-z0-9]+)$/i);
            if (revisionMatch) {
                const revValue = revisionMatch[1];
                parsedRevision = {
                    value: revValue.toUpperCase(),
                    numericValue: /^\d+$/.test(revValue) ? parseInt(revValue) : undefined
                };
                rawItemFullyClaimedByVersionOrRevision = true;
            }
        }
        if (rawItemFullyClaimedByVersionOrRevision) {
            continue; // This rawItem is processed as V/R, move to the next rawItem
        }
        // Attempt 3: If rawItem wasn't a standalone V/R, split it and process parts
        const parts = rawItem.split(/[,&+\-\/]/).map(p => p.trim()).filter(p => p);
        if (parts.length === 0 && rawItem.trim()) {
            parts.push(rawItem.trim());
        }
        for (const part of parts) {
            const upperPart = part.toUpperCase();
            let partProcessed = false;
            // Check for version within part (if global version not found yet for the ROM)
            if (!partProcessed && !parsedVersion) {
                const vm = part.match(/^(?:v|ver(?:sion)?\.?)\s*(\d+)(?:\.(\d+))?(?:\.(\d+))?([a-z])?$/i);
                if (vm) {
                    parsedVersion = {
                        major: parseInt(vm[1]),
                        minor: vm[2] ? parseInt(vm[2]) : 0,
                        patch: vm[3] ? parseInt(vm[3]) : 0,
                        sub: vm[4] ? vm[4].toLowerCase() : undefined
                    };
                    partProcessed = true;
                }
            }
            // Check for revision within part (if global revision not found and part not already processed as version)
            if (!partProcessed && !parsedRevision) {
                const rm = part.match(/^(?:rev(?:ision)?\.?)\s*([a-z0-9]+)$/i);
                if (rm) {
                    const revVal = rm[1];
                    parsedRevision = {
                        value: revVal.toUpperCase(),
                        numericValue: /^\d+$/.test(revVal) ? parseInt(revVal) : undefined
                    };
                    partProcessed = true;
                }
            }
            // Check for Good/Bad dump flags
            if (!partProcessed) {
                if (upperPart === "!" || upperPart === "V" || upperPart === "VERIFIED" || upperPart === "GOOD DUMP") {
                    isVerifiedGood = true;
                    partProcessed = true;
                }
            }
            if (!partProcessed) {
                if (upperPart === "B" || upperPart === "BAD DUMP" || upperPart === "BAD") {
                    isBadDump = true;
                    partProcessed = true;
                }
            }
            // Check for Regions
            if (!partProcessed) {
                const mappedRegionByShortCode = REGION_MAP[upperPart];
                const knownFullRegionMatch = ALL_EXCLUDABLE_REGIONS.find(r => r.toUpperCase() === upperPart);
                let finalMappedRegion = mappedRegionByShortCode || knownFullRegionMatch;
                if (finalMappedRegion && !regions.includes(finalMappedRegion)) {
                    regions.push(finalMappedRegion);
                    partProcessed = true;
                }
            }
            // Check for Languages
            if (!partProcessed) {
                const mappedLangByShortCode = LANGUAGE_MAP[upperPart];
                const knownFullLangMatch = DEFAULT_LANGUAGES_ORDER.find(l => l.toUpperCase() === upperPart);
                let finalMappedLang = mappedLangByShortCode || knownFullLangMatch;
                if (finalMappedLang && !languages.includes(finalMappedLang)) {
                    languages.push(finalMappedLang);
                    partProcessed = true;
                }
            }
            // Check for Excludable Tags
            if (!partProcessed) {
                if (KNOWN_EXCLUDABLE_TAGS_FOR_PARSING.has(upperPart) && !tags.includes(upperPart)) {
                    tags.push(upperPart);
                    partProcessed = true;
                }
            }
            if (!partProcessed && part) {
                collectedMiscTags.push(part);
            }
        }
    }
    if (languages.length === 0) {
        if (regions.some(r => ["USA", "World", "Europe", "UK", "Australia"].includes(r)))
            languages.push("En");
        else if (regions.includes("Spain"))
            languages.push("Es");
        else if (regions.includes("Japan"))
            languages.push("Ja");
        else if (regions.includes("France"))
            languages.push("Fr");
        else if (regions.includes("Germany"))
            languages.push("De");
        else if (regions.includes("Italy"))
            languages.push("It");
    }
    if (languages.length === 0 && regions.length > 0) {
        languages.push("En"); // Default to English if regions are specified but no language
    }
    let baseNameCandidates = [workName.trim()];
    if (tempBaseName && tempBaseName.length > 2) {
        baseNameCandidates.push(tempBaseName.trim());
    }
    const firstParenIndex = workName.indexOf(" (");
    if (firstParenIndex > -1) {
        baseNameCandidates.push(workName.substring(0, firstParenIndex).trim());
    }
    baseNameCandidates = baseNameCandidates.filter(bn => bn && bn.length > 2 && /[a-zA-Z0-9]/.test(bn)).sort((a, b) => a.length - b.length);
    let finalBaseName = workName.trim();
    if (baseNameCandidates.length > 0)
        finalBaseName = baseNameCandidates[0];
    finalBaseName = finalBaseName.replace(/[-_,:\s]+$/, "").trim();
    return {
        baseName: finalBaseName,
        regions: [...new Set(regions)],
        languages: [...new Set(languages)],
        tags: [...new Set(tags)],
        miscTags: [...new Set(collectedMiscTags)],
        fileExtension,
        isVerifiedGood,
        isBadDump,
        version: parsedVersion,
        revision: parsedRevision
    };
}
// Helper function to compare parsed ROM info for sorting (versions, revisions)
function compareParsedInfo(a, b) {
    // 1. Version comparison (higher is better)
    if (a.version && b.version) {
        if (a.version.major !== b.version.major)
            return b.version.major - a.version.major;
        if (a.version.minor !== b.version.minor)
            return b.version.minor - a.version.minor;
        if (a.version.patch !== b.version.patch)
            return b.version.patch - a.version.patch;
        if (a.version.sub && b.version.sub) {
            if (a.version.sub < b.version.sub)
                return 1; // 'b' > 'a' -> b is better
            if (a.version.sub > b.version.sub)
                return -1; // 'a' > 'b' -> a is better
        }
        else if (a.version.sub)
            return -1; // a has sub, b doesn't (a is more specific/later)
        else if (b.version.sub)
            return 1; // b has sub, a doesn't
    }
    else if (a.version)
        return -1; // a has version, b doesn't
    else if (b.version)
        return 1; // b has version, a doesn't
    // 2. Revision comparison (if no versions or versions were equivalent)
    if (a.revision && b.revision) {
        if (a.revision.numericValue !== undefined && b.revision.numericValue !== undefined) {
            if (a.revision.numericValue !== b.revision.numericValue)
                return b.revision.numericValue - a.revision.numericValue;
        }
        else if (a.revision.numericValue !== undefined)
            return -1; // a is numeric, b isn't (numeric preferred)
        else if (b.revision.numericValue !== undefined)
            return 1; // b is numeric, a isn't
        // If both non-numeric (or both numeric and equal), compare string value (e.g., "B" vs "A")
        if (a.revision.value < b.revision.value)
            return 1; // b's revision value is "greater"
        if (a.revision.value > b.revision.value)
            return -1; // a's revision value is "greater"
    }
    else if (a.revision)
        return -1; // a has revision, b doesn't
    else if (b.revision)
        return 1; // b has revision, a doesn't
    return 0; // Versions and revisions are equivalent or not present on either
}
// --- Lógica de Filtrado ---
function simular_filtro_js(romEntries, config) {
    const allParsedEntries = romEntries.map(entry => ({
        ...entry,
        url: entry.url ?? "",
        parsedInfo: entry.parsedInfo || parseRomName(entry.name)
    }));
    const initialEliminatedNames = new Set();
    const candidates = [];
    for (const entry of allParsedEntries) {
        let excludedByTag = false;
        for (const tag of entry.parsedInfo.tags) {
            if (config.exclude_tags[tag] === true) {
                excludedByTag = true;
                break;
            }
        }
        if (excludedByTag) {
            initialEliminatedNames.add(entry.name);
            continue;
        }
        if (entry.parsedInfo.regions.length > 0) {
            const allMyRegionsAreGloballyExcluded = entry.parsedInfo.regions.every(region => config.exclude_regions[region] === true);
            if (allMyRegionsAreGloballyExcluded) {
                initialEliminatedNames.add(entry.name);
                continue;
            }
        }
        candidates.push(entry);
    }
    const groupedByBaseName = {};
    for (const entry of candidates) {
        const baseName = entry.parsedInfo.baseName;
        if (!groupedByBaseName[baseName]) {
            groupedByBaseName[baseName] = [];
        }
        groupedByBaseName[baseName].push(entry);
    }
    const finalSalvadosNames = new Set();
    const tempMapaUrl = {};
    for (const baseName in groupedByBaseName) {
        const originalGroupForBaseName = groupedByBaseName[baseName];
        if (originalGroupForBaseName.length === 0)
            continue;
        if (originalGroupForBaseName.length === 1) {
            const chosen = originalGroupForBaseName[0];
            finalSalvadosNames.add(chosen.name);
            tempMapaUrl[chosen.name] = chosen.url || "URL_NO_ENCONTRADA_EN_ARCHIVO";
            continue;
        }
        let bestCandidatesThisGroup = [...originalGroupForBaseName];
        let regionFilteredCandidates = [];
        for (const prefRegion of config.preferred_regions) {
            if (config.exclude_regions[prefRegion] === true) {
                continue;
            }
            const foundInThisPrefRegion = bestCandidatesThisGroup.filter(e => e.parsedInfo.regions.includes(prefRegion));
            if (foundInThisPrefRegion.length > 0) {
                regionFilteredCandidates = foundInThisPrefRegion;
                break;
            }
        }
        if (regionFilteredCandidates.length > 0) {
            bestCandidatesThisGroup = regionFilteredCandidates;
        }
        if (bestCandidatesThisGroup.length === 1) {
            const chosen = bestCandidatesThisGroup[0];
            finalSalvadosNames.add(chosen.name);
            tempMapaUrl[chosen.name] = chosen.url || "URL_NO_ENCONTRADA_EN_ARCHIVO";
            originalGroupForBaseName.forEach(entry => {
                if (entry.name !== chosen.name)
                    initialEliminatedNames.add(entry.name);
            });
            continue;
        }
        let langFilteredCandidates = [];
        for (const prefLang of config.preferred_languages) {
            const foundInThisPrefLang = bestCandidatesThisGroup.filter(e => e.parsedInfo.languages.includes(prefLang));
            if (foundInThisPrefLang.length > 0) {
                langFilteredCandidates = foundInThisPrefLang;
                break;
            }
        }
        if (langFilteredCandidates.length > 0) {
            bestCandidatesThisGroup = langFilteredCandidates;
        }
        if (bestCandidatesThisGroup.length === 1) {
            const chosen = bestCandidatesThisGroup[0];
            finalSalvadosNames.add(chosen.name);
            tempMapaUrl[chosen.name] = chosen.url || "URL_NO_ENCONTRADA_EN_ARCHIVO";
            originalGroupForBaseName.forEach(entry => {
                if (entry.name !== chosen.name)
                    initialEliminatedNames.add(entry.name);
            });
            continue;
        }
        let bestPick = bestCandidatesThisGroup[0];
        if (bestCandidatesThisGroup.length > 1) {
            bestCandidatesThisGroup.sort((a, b) => {
                // 1. Verified Good flag
                if (a.parsedInfo.isVerifiedGood && !b.parsedInfo.isVerifiedGood)
                    return -1;
                if (!a.parsedInfo.isVerifiedGood && b.parsedInfo.isVerifiedGood)
                    return 1;
                // 2. Bad Dump flag (less bad is better)
                if (!a.parsedInfo.isBadDump && b.parsedInfo.isBadDump)
                    return -1;
                if (a.parsedInfo.isBadDump && !b.parsedInfo.isBadDump)
                    return 1;
                // 3. Excluded tags (fewer excluded tags is better)
                const aHasCurrentlyExcludedTag = a.parsedInfo.tags.some(tag => config.exclude_tags[tag] === true);
                const bHasCurrentlyExcludedTag = b.parsedInfo.tags.some(tag => config.exclude_tags[tag] === true);
                if (!aHasCurrentlyExcludedTag && bHasCurrentlyExcludedTag)
                    return -1;
                if (aHasCurrentlyExcludedTag && !bHasCurrentlyExcludedTag)
                    return 1;
                // 4. Version/Revision comparison (new)
                const versionRevisionComparison = compareParsedInfo(a.parsedInfo, b.parsedInfo);
                if (versionRevisionComparison !== 0)
                    return versionRevisionComparison;
                // 5. Fewer misc tags is better
                if (a.parsedInfo.miscTags.length !== b.parsedInfo.miscTags.length) {
                    return a.parsedInfo.miscTags.length - b.parsedInfo.miscTags.length;
                }
                // 6. Shorter filename is better (as a final tie-breaker)
                return a.name.length - b.name.length;
            });
            bestPick = bestCandidatesThisGroup[0];
        }
        finalSalvadosNames.add(bestPick.name);
        tempMapaUrl[bestPick.name] = bestPick.url || "URL_NO_ENCONTRADA_EN_ARCHIVO";
        originalGroupForBaseName.forEach(entry => {
            if (entry.name !== bestPick.name) {
                initialEliminatedNames.add(entry.name);
            }
        });
    }
    const finalEliminadosNames = new Set(initialEliminatedNames);
    allParsedEntries.forEach(entry => {
        if (!finalSalvadosNames.has(entry.name)) {
            finalEliminadosNames.add(entry.name);
        }
    });
    return {
        salvados: Array.from(finalSalvadosNames).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase())),
        eliminados: Array.from(finalEliminadosNames).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase())),
        mapa_url: tempMapaUrl
    };
}
// --- Funciones de Inicialización de UI ---
function populateCheckboxes(container, items, states, groupName, containerIdForLog) {
    if (!container) {
        console.error(`populateCheckboxes ('${groupName}'): CRITICAL - Contenedor (ID: ${containerIdForLog}) NO ENCONTRADO.`);
        if (statusLabel)
            updateStatus(`Error: Contenedor para '${groupName}' no encontrado.`);
        return;
    }
    container.innerHTML = '';
    if (items.length === 0) {
        container.innerHTML = `<p class="text-xs text-gray-400 p-2">No hay ${groupName} para configurar.</p>`;
        return;
    }
    items.forEach((item) => {
        const checkboxId = `${groupName}-${item.replace(/\s+/g, '-').toLowerCase()}`;
        const div = document.createElement('div');
        div.className = 'flex items-center';
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.id = checkboxId;
        input.name = groupName;
        input.value = item;
        input.checked = states[item] !== undefined ? states[item] : (groupName === 'Tags a Excluir' ? true : false);
        input.className = 'h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500';
        input.dataset.itemName = item;
        const label = document.createElement('label');
        label.htmlFor = checkboxId;
        label.textContent = item;
        label.className = 'ml-2 block text-sm text-gray-900';
        div.appendChild(input);
        div.appendChild(label);
        container.appendChild(div);
    });
}
function populateRecycleView(rvContainer, itemsArray, listId) {
    if (!rvContainer) {
        console.error(`populateRecycleView ('${listId}'): CRITICAL - Contenedor de lista (ID: ${listId}) NO ENCONTRADO.`);
        if (statusLabel)
            updateStatus(`Error: Contenedor para lista '${listId}' no encontrado.`);
        return;
    }
    rvContainer.innerHTML = '';
    if (itemsArray.length === 0) {
        rvContainer.innerHTML = `<p class="text-xs text-gray-400 p-2">Lista vacía.</p>`;
    }
    else {
        itemsArray.forEach((itemText, index) => {
            const listItem = document.createElement('div');
            listItem.textContent = itemText;
            listItem.className = 'list-item';
            listItem.dataset.id = itemText;
            listItem.dataset.index = String(index);
            listItem.dataset.listId = listId;
            listItem.setAttribute('role', 'option');
            listItem.setAttribute('aria-selected', 'false');
            listItem.tabIndex = 0;
            listItem.addEventListener('click', handleListItemSelection);
            listItem.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    handleListItemSelection(e);
                }
            });
            rvContainer.appendChild(listItem);
        });
        if (rvContainer.parentElement)
            rvContainer.parentElement.setAttribute('aria-live', 'polite');
    }
    updateListCounters();
}
// --- Lógica de Selección de Items en Listas ---
function handleListItemSelection(event) {
    const clickedItem = event.currentTarget;
    if (selectedItemElement && selectedItemElement !== clickedItem) {
        selectedItemElement.classList.remove('selected', 'bg-blue-400', 'text-white');
        selectedItemElement.setAttribute('aria-selected', 'false');
    }
    if (selectedItemElement === clickedItem) {
        clickedItem.classList.remove('selected', 'bg-blue-400', 'text-white');
        clickedItem.setAttribute('aria-selected', 'false');
        selectedItemElement = null;
    }
    else {
        clickedItem.classList.add('selected', 'bg-blue-400', 'text-white');
        clickedItem.setAttribute('aria-selected', 'true');
        selectedItemElement = clickedItem;
    }
}
// --- Funciones de Movimiento para Listas de Preferencias ---
function movePreferenceItem(listId, direction) {
    const listNameForUI = listId === 'rvRegiones' ? 'Preferencia de Regiones' : 'Preferencia de Idiomas';
    if (!selectedItemElement || selectedItemElement.dataset.listId !== listId) {
        showCustomMessage(`Selecciona un ítem de la lista '${listNameForUI}' para mover.`, 'info');
        return;
    }
    const itemsArrayRef = (listId === 'rvRegiones') ? currentConfig.preferred_regions : currentConfig.preferred_languages;
    const container = (listId === 'rvRegiones') ? rvRegionesContainer : rvIdiomasContainer;
    const selectedText = selectedItemElement.dataset.id;
    const currentIndex = itemsArrayRef.indexOf(selectedText);
    if (currentIndex === -1) {
        showCustomMessage("Error: El ítem seleccionado no se encontró en los datos de configuración.", "error");
        return;
    }
    let newIndex = currentIndex;
    if (direction === 'up' && currentIndex > 0)
        newIndex = currentIndex - 1;
    else if (direction === 'down' && currentIndex < itemsArrayRef.length - 1)
        newIndex = currentIndex + 1;
    else
        return;
    const itemToMove = itemsArrayRef.splice(currentIndex, 1)[0];
    itemsArrayRef.splice(newIndex, 0, itemToMove);
    populateRecycleView(container, itemsArrayRef, listId);
    if (container) {
        const newItemsInDOM = container.querySelectorAll('.list-item');
        newItemsInDOM.forEach(domItem => {
            if (domItem.dataset.id === selectedText) {
                domItem.classList.add('selected', 'bg-blue-400', 'text-white');
                selectedItemElement = domItem;
                domItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                domItem.focus();
            }
        });
    }
    updateStatus(`Ítem movido en '${listNameForUI}'.`);
}
// --- Manejo de Archivo ---
function handleFileSelect(event) {
    const target = event.target;
    const file = target.files?.[0];
    if (file && filePathDisplay && statusLabel) {
        filePathDisplay.textContent = `Leyendo archivo: ${file.name}...`;
        statusLabel.textContent = `Procesando ${file.name}...`;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const lines = e.target?.result?.toString().split('\n').map(line => line.trim()).filter(line => line) || [];
                // Pre-parse all ROMs on file load for efficiency if needed later, or parse on demand.
                // For now, parsing on demand in simular_filtro_js is fine.
                // We store name and URL, and parse 'name' when simular_filtro_js is called.
                romFileContent = lines.map(line => {
                    const parts = line.split('=');
                    const name = parts[0].trim();
                    const url = parts.length > 1 ? parts.slice(1).join('=').trim() : undefined;
                    // Do not parse here to save initial load time for large files.
                    // Parsing will happen in simular_filtro_js.
                    return { originalLine: line, name, url };
                });
                filePathDisplay.textContent = `Archivo: ${file.name} (${romFileContent.length} líneas leídas)`;
                updateStatus(`Archivo '${file.name}' cargado con ${romFileContent.length} líneas.`);
                if (btnPrevisualizar)
                    btnPrevisualizar.disabled = false;
                if (btnGenerarFinal)
                    btnGenerarFinal.disabled = true;
                simulacionResultados = { salvados: [], eliminados: [], mapa_url: {} };
                populateRecycleView(rvSalvadosContainer, simulacionResultados.salvados, 'salvados');
                populateRecycleView(rvEliminadosContainer, simulacionResultados.eliminados, 'eliminados');
            }
            catch (readError) {
                showCustomMessage(`Error procesando el archivo: ${readError.message}`, 'error');
                if (filePathDisplay)
                    filePathDisplay.textContent = "Error al procesar el archivo.";
                romFileContent = null;
                if (btnPrevisualizar)
                    btnPrevisualizar.disabled = true;
            }
        };
        reader.onerror = () => {
            showCustomMessage(`Error al leer el archivo: ${reader.error?.message || 'Error desconocido del lector'}`, 'error');
            if (filePathDisplay)
                filePathDisplay.textContent = "Error al leer el archivo.";
            romFileContent = null;
            if (btnPrevisualizar)
                btnPrevisualizar.disabled = true;
        };
        reader.readAsText(file);
    }
    else {
        if (filePathDisplay)
            filePathDisplay.textContent = "Ningún archivo seleccionado.";
        romFileContent = null;
        if (btnPrevisualizar)
            btnPrevisualizar.disabled = true;
    }
}
// --- Actualizar Configuración desde UI ---
function actualizarConfigDesdeUI() {
    console.log("actualizarConfigDesdeUI: Actualizando currentConfig desde la UI...");
    if (tagsCheckboxesContainer) {
        tagsCheckboxesContainer.querySelectorAll('input[type="checkbox"]').forEach(chk => {
            const itemName = chk.dataset.itemName;
            if (itemName && currentConfig.exclude_tags.hasOwnProperty(itemName)) {
                currentConfig.exclude_tags[itemName] = chk.checked;
            }
        });
    }
    else {
        console.warn("actualizarConfigDesdeUI: tagsCheckboxesContainer no encontrado.");
    }
    if (regionesExcluirCheckboxesContainer) {
        regionesExcluirCheckboxesContainer.querySelectorAll('input[type="checkbox"]').forEach(chk => {
            const itemName = chk.dataset.itemName;
            if (itemName && currentConfig.exclude_regions.hasOwnProperty(itemName)) {
                currentConfig.exclude_regions[itemName] = chk.checked;
            }
        });
    }
    else {
        console.warn("actualizarConfigDesdeUI: regionesExcluirCheckboxesContainer no encontrado.");
    }
    console.log("actualizarConfigDesdeUI: currentConfig actualizado:", JSON.parse(JSON.stringify(currentConfig)));
}
// --- Lógica de Previsualización y Generación Final ---
async function previsualizarFiltro() {
    if (!romFileContent || romFileContent.length === 0) {
        showCustomMessage("Por favor, selecciona y carga un archivo de ROMs con contenido.", 'error');
        return;
    }
    updateStatus("Procesando previsualización...");
    if (!btnPrevisualizar) {
        console.error("previsualizarFiltro: btnPrevisualizar no encontrado.");
        return;
    }
    btnPrevisualizar.disabled = true;
    btnPrevisualizar.innerHTML = `<svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Procesando...`;
    actualizarConfigDesdeUI();
    try {
        // Memoize parsed info if not already done
        if (romFileContent && romFileContent.length > 0 && !romFileContent[0].parsedInfo) {
            console.log("Pre-parsing ROM names for simulation...");
            romFileContent.forEach(entry => {
                entry.parsedInfo = parseRomName(entry.name);
            });
            console.log("Pre-parsing complete.");
        }
        await new Promise(resolve => setTimeout(resolve, 50));
        simulacionResultados = simular_filtro_js(romFileContent, currentConfig);
        populateRecycleView(rvSalvadosContainer, simulacionResultados.salvados, 'salvados');
        populateRecycleView(rvEliminadosContainer, simulacionResultados.eliminados, 'eliminados');
        if (btnGenerarFinal)
            btnGenerarFinal.disabled = (simulacionResultados.salvados?.length || 0) === 0;
        updateStatus(`Previsualización generada: ${simulacionResultados.salvados.length} salvados, ${simulacionResultados.eliminados.length} eliminados.`);
        showCustomMessage("Previsualización generada.", "success");
    }
    catch (error) {
        console.error("previsualizarFiltro: Error:", error);
        showCustomMessage(`Error en previsualización: ${error.message}`, 'error');
        updateStatus(`Error en previsualización: ${error.message}`);
        populateRecycleView(rvSalvadosContainer, [], 'salvados');
        populateRecycleView(rvEliminadosContainer, [], 'eliminados');
        if (btnGenerarFinal)
            btnGenerarFinal.disabled = true;
    }
    finally {
        if (btnPrevisualizar) {
            btnPrevisualizar.disabled = false;
            btnPrevisualizar.innerHTML = "3. Previsualizar Filtro";
        }
    }
}
// --- Mover ROMs entre listas de resultados ---
function moveRomBetweenLists(sourceListId, targetListId) {
    const sourceListName = sourceListId === 'salvados' ? 'ROMs a Salvar' : 'ROMs a Eliminar';
    if (!selectedItemElement || selectedItemElement.dataset.listId !== sourceListId) {
        showCustomMessage(`Selecciona un ROM de la lista '${sourceListName}' para mover.`, 'info');
        return;
    }
    const romName = selectedItemElement.dataset.id;
    let sourceArray, targetArray, sourceContainer, targetContainer;
    if (sourceListId === 'salvados') {
        sourceArray = simulacionResultados.salvados;
        targetArray = simulacionResultados.eliminados;
        sourceContainer = rvSalvadosContainer;
        targetContainer = rvEliminadosContainer;
    }
    else {
        sourceArray = simulacionResultados.eliminados;
        targetArray = simulacionResultados.salvados;
        sourceContainer = rvEliminadosContainer;
        targetContainer = rvSalvadosContainer;
    }
    const indexInSource = sourceArray.indexOf(romName);
    if (indexInSource > -1) {
        sourceArray.splice(indexInSource, 1);
        targetArray.push(romName);
        targetArray.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
        populateRecycleView(sourceContainer, sourceArray, sourceListId);
        populateRecycleView(targetContainer, targetArray, targetListId);
        selectedItemElement = null; // Deselect after moving
        // Try to reselect in target list if needed, or clear selection
        if (targetContainer) {
            const newItemsInDOMTarget = targetContainer.querySelectorAll(`.list-item[data-id="${CSS.escape(romName)}"]`);
            if (newItemsInDOMTarget.length > 0) {
                const newItemInTarget = newItemsInDOMTarget[0];
                newItemInTarget.classList.add('selected', 'bg-blue-400', 'text-white');
                newItemInTarget.setAttribute('aria-selected', 'true');
                selectedItemElement = newItemInTarget;
                newItemInTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                newItemInTarget.focus();
            }
        }
        updateStatus(`ROM '${romName.substring(0, 30)}...' movido a ${targetListId === 'salvados' ? 'Salvados' : 'Eliminados'}.`);
    }
    else {
        console.error("moveRomBetweenLists: ROM no encontrado en la lista origen para mover:", romName);
    }
}
// --- Generar Archivo Final ---
function generarArchivoFinal() {
    if (!simulacionResultados.salvados || simulacionResultados.salvados.length === 0) {
        showCustomMessage("No hay ROMs en la lista de 'Salvados'. El archivo no se generará.", 'warning');
        return;
    }
    let contenidoFinal;
    contenidoFinal = simulacionResultados.salvados
        .map(name => `${name}=${simulacionResultados.mapa_url[name] || 'URL_NO_ENCONTRADA'}`)
        .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
        .join('\n');
    const blob = new Blob([contenidoFinal + '\n'], { type: 'text/plain;charset=utf-8' });
    const date = new Date();
    const timestamp = `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}_${date.getHours().toString().padStart(2, '0')}${date.getMinutes().toString().padStart(2, '0')}`;
    const filename = `FiltroRomsWeb_${timestamp}.txt`;
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    showCustomMessage(`Archivo '${filename}' generado y descarga iniciada.`, 'success');
    updateStatus(`Archivo '${filename}' generado.`);
}
// --- Utilidades ---
function updateStatus(message) {
    if (statusLabel)
        statusLabel.textContent = message;
    else
        console.warn("updateStatus: statusLabel no encontrado. Mensaje:", message);
}
function updateListCounters() {
    if (labelSalvados)
        labelSalvados.textContent = `ROMs a Salvar (${simulacionResultados.salvados?.length || 0}):`;
    if (labelEliminados)
        labelEliminados.textContent = `ROMs a Eliminar (${simulacionResultados.eliminados?.length || 0}):`;
}
function showCustomMessage(message, type = 'info') {
    if (!customMessageBox || !customMessageText || !customMessageButton) {
        console.warn("showCustomMessage: Elementos del cuadro de mensaje no encontrados. Mensaje:", message);
        alert(`${type.toUpperCase()}: ${message}`);
        return;
    }
    customMessageText.textContent = message;
    customMessageBox.className = 'message-box-custom';
    if (type === 'success')
        customMessageBox.classList.add('success');
    else if (type === 'error')
        customMessageBox.classList.add('error');
    else if (type === 'warning') {
        customMessageBox.classList.remove('info', 'success', 'error');
        customMessageBox.classList.add('warning');
    }
    else
        customMessageBox.classList.add('info');
    customMessageBox.style.display = 'block';
    if (type === 'success' || type === 'info' || type === 'warning') {
        setTimeout(() => {
            if (customMessageBox && customMessageBox.style.display === 'block' && customMessageText && customMessageText.textContent === message) {
                customMessageBox.style.display = 'none';
            }
        }, 5000);
    }
}
// --- Inicialización General ---
function initializeUI() {
    console.log("initializeUI: ================= BEGIN INITIALIZE UI =================");
    console.log("initializeUI: Usando config por defecto:", JSON.parse(JSON.stringify(currentConfig)));
    populateCheckboxes(tagsCheckboxesContainer, ALL_EXCLUDABLE_TAGS, currentConfig.exclude_tags, 'Tags a Excluir', 'tagsCheckboxes');
    populateCheckboxes(regionesExcluirCheckboxesContainer, ALL_EXCLUDABLE_REGIONS, currentConfig.exclude_regions, 'Regiones a Excluir Globalmente', 'regionesExcluirCheckboxes');
    populateRecycleView(rvRegionesContainer, currentConfig.preferred_regions, 'rvRegiones');
    populateRecycleView(rvIdiomasContainer, currentConfig.preferred_languages, 'rvIdiomas');
    populateRecycleView(rvSalvadosContainer, simulacionResultados.salvados, 'salvados');
    populateRecycleView(rvEliminadosContainer, simulacionResultados.eliminados, 'eliminados');
    if (btnGenerarFinal)
        btnGenerarFinal.disabled = (simulacionResultados.salvados?.length || 0) === 0;
    else
        console.error("initializeUI: btnGenerarFinal no encontrado.");
    if (btnPrevisualizar)
        btnPrevisualizar.disabled = !romFileContent || romFileContent.length === 0;
    else
        console.error("initializeUI: btnPrevisualizar no encontrado.");
    updateStatus("Interfaz inicializada. Cargue un archivo de ROMs.");
    console.log("initializeUI: ================== END INITIALIZE UI ==================");
}
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOMContentLoaded: Evento disparado. Asignando elementos del DOM...");
    tagsCheckboxesContainer = document.getElementById('tagsCheckboxes');
    regionesExcluirCheckboxesContainer = document.getElementById('regionesExcluirCheckboxes');
    rvRegionesContainer = document.getElementById('rvRegiones');
    rvIdiomasContainer = document.getElementById('rvIdiomas');
    rvSalvadosContainer = document.getElementById('rvSalvados');
    rvEliminadosContainer = document.getElementById('rvEliminados');
    btnRegionUp = document.getElementById('btnRegionUp');
    btnRegionDown = document.getElementById('btnRegionDown');
    btnIdiomaUp = document.getElementById('btnIdiomaUp');
    btnIdiomaDown = document.getElementById('btnIdiomaDown');
    btnPrevisualizar = document.getElementById('btnPrevisualizar');
    btnMoverAEliminados = document.getElementById('btnMoverAEliminados');
    btnMoverASalvados = document.getElementById('btnMoverASalvados');
    btnGenerarFinal = document.getElementById('btnGenerarFinal');
    fileInput = document.getElementById('fileInput');
    filePathDisplay = document.getElementById('filePathDisplay');
    labelSalvados = document.getElementById('labelSalvados');
    labelEliminados = document.getElementById('labelEliminados');
    statusLabel = document.getElementById('statusLabel');
    customMessageBox = document.getElementById('customMessageBox');
    customMessageText = document.getElementById('customMessageText');
    customMessageButton = document.getElementById('customMessageButton');
    let essentialElementsFound = true;
    function checkElem(id, elem) {
        if (!elem) {
            console.error(`DOMContentLoaded FATAL: Elemento con ID '${id}' NO ENCONTRADO.`);
            return false;
        }
        return true;
    }
    essentialElementsFound = checkElem('tagsCheckboxes', tagsCheckboxesContainer) && essentialElementsFound;
    essentialElementsFound = checkElem('regionesExcluirCheckboxes', regionesExcluirCheckboxesContainer) && essentialElementsFound;
    essentialElementsFound = checkElem('rvRegiones', rvRegionesContainer) && essentialElementsFound;
    essentialElementsFound = checkElem('rvIdiomas', rvIdiomasContainer) && essentialElementsFound;
    if (!essentialElementsFound) {
        const baseErrorMsg = "Error crítico: Faltan elementos HTML esenciales. La aplicación puede no funcionar.";
        if (statusLabel)
            updateStatus(baseErrorMsg);
        else
            console.error(baseErrorMsg);
        alert(baseErrorMsg);
        return;
    }
    currentConfig = getDefaultConfig();
    initializeUI();
    if (fileInput)
        fileInput.addEventListener('change', handleFileSelect);
    if (btnPrevisualizar)
        btnPrevisualizar.addEventListener('click', previsualizarFiltro);
    if (btnGenerarFinal)
        btnGenerarFinal.addEventListener('click', generarArchivoFinal);
    if (btnRegionUp)
        btnRegionUp.addEventListener('click', () => movePreferenceItem('rvRegiones', 'up'));
    if (btnRegionDown)
        btnRegionDown.addEventListener('click', () => movePreferenceItem('rvRegiones', 'down'));
    if (btnIdiomaUp)
        btnIdiomaUp.addEventListener('click', () => movePreferenceItem('rvIdiomas', 'up'));
    if (btnIdiomaDown)
        btnIdiomaDown.addEventListener('click', () => movePreferenceItem('rvIdiomas', 'down'));
    if (btnMoverAEliminados)
        btnMoverAEliminados.addEventListener('click', () => moveRomBetweenLists('salvados', 'eliminados'));
    if (btnMoverASalvados)
        btnMoverASalvados.addEventListener('click', () => moveRomBetweenLists('eliminados', 'salvados'));
    if (customMessageButton && customMessageBox)
        customMessageButton.addEventListener('click', () => { if (customMessageBox)
            customMessageBox.style.display = 'none'; });
    console.log("DOMContentLoaded: Listeners configurados. App lista.");
});
console.log("index.tsx: Fin del script. Versión 7.4.");
