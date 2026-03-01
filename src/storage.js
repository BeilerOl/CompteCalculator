const STORAGE_KEY = 'compte-cadeaux-sessions';

/**
 * @param {import('./state.js').Session[]} sessions
 */
export function saveSessions(sessions) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch (e) {
    console.error('saveSessions', e);
  }
}

/**
 * @returns {import('./state.js').Session[]}
 */
export function loadSessions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('loadSessions', e);
    return [];
  }
}

/**
 * Exporte une ou toutes les sessions en fichier JSON.
 * @param {import('./state.js').Session[]} sessions - une session ou toutes
 * @param {string} [filename] - nom du fichier (optionnel)
 */
export function exportSessions(sessions, filename) {
  const json = JSON.stringify(sessions, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `compte-cadeaux-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Importe des sessions depuis un fichier JSON (fusion avec les sessions existantes).
 * @param {File} file
 * @param {import('./state.js').Session[]} existingSessions
 * @returns {Promise<import('./state.js').Session[]>} sessions fusionnées (nouveaux ids si conflit)
 */
export function importSessionsFromFile(file, existingSessions) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        const imported = Array.isArray(data) ? data : [data];
        const merged = mergeSessions(existingSessions, imported);
        resolve(merged);
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

/**
 * Fusionne des sessions importées avec les existantes. En cas de même id, on garde l'existante (ou on pourrait renommer).
 * @param {import('./state.js').Session[]} existing
 * @param {import('./state.js').Session[]} imported
 * @returns {import('./state.js').Session[]}
 */
function mergeSessions(existing, imported) {
  const byId = new Map(existing.map((s) => [s.id, s]));
  for (const s of imported) {
    if (!s || typeof s.id !== 'string') continue;
    if (!byId.has(s.id)) {
      byId.set(s.id, s);
    }
  }
  return Array.from(byId.values());
}
