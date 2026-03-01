/**
 * Calcul des soldes et des dettes entre personnes.
 * @typedef {{ id: string, nom: string }} Participant
 * @typedef {{ id: string, nom: string, montant: number, acheteurId: string, contributeurIds: string[] }} Cadeau
 */

const ROUND = (v) => Math.round(v * 100) / 100;

/**
 * Calcule le solde net par participant (payé - doit).
 * @param {Participant[]} participants
 * @param {Cadeau[]} cadeaux
 * @returns {Map<string, number>} participantId -> solde (positif = créancier, négatif = débiteur)
 */
export function computeSoldes(participants, cadeaux) {
  const paye = new Map();
  const doit = new Map();
  for (const p of participants) {
    paye.set(p.id, 0);
    doit.set(p.id, 0);
  }
  for (const c of cadeaux) {
    const part = c.contributeurIds.length ? ROUND(c.montant / c.contributeurIds.length) : 0;
    const payeActuel = paye.get(c.acheteurId) ?? 0;
    paye.set(c.acheteurId, ROUND(payeActuel + c.montant));
    for (const id of c.contributeurIds) {
      const doitActuel = doit.get(id) ?? 0;
      doit.set(id, ROUND(doitActuel + part));
    }
  }
  const soldes = new Map();
  for (const p of participants) {
    const pPaye = paye.get(p.id) ?? 0;
    const pDoit = doit.get(p.id) ?? 0;
    let solde = ROUND(pPaye - pDoit);
    soldes.set(p.id, solde);
  }
  return soldes;
}

/**
 * Répartit les centimes d'arrondi : on ajuste les premiers contributeurs pour que la somme des parts = montant.
 * @param {number} montant
 * @param {string[]} contributeurIds
 * @returns {Map<string, number>} id -> part exacte
 */
function repartirMontant(montant, contributeurIds) {
  const n = contributeurIds.length;
  if (n === 0) return new Map();
  const base = Math.floor((montant * 100) / n) / 100;
  const restCents = Math.round(ROUND(montant - base * n) * 100);
  const parts = new Map();
  contributeurIds.forEach((id, i) => {
    const extra = i < restCents ? 0.01 : 0;
    parts.set(id, ROUND(base + extra));
  });
  return parts;
}

/**
 * Recalcule soldes en utilisant des parts ajustées pour éviter les écarts d'un centime.
 * @param {Participant[]} participants
 * @param {Cadeau[]} cadeaux
 * @returns {Map<string, number>}
 */
export function computeSoldesExact(participants, cadeaux) {
  const paye = new Map();
  const doit = new Map();
  for (const p of participants) {
    paye.set(p.id, 0);
    doit.set(p.id, 0);
  }
  for (const c of cadeaux) {
    const parts = repartirMontant(c.montant, c.contributeurIds);
    paye.set(c.acheteurId, ROUND((paye.get(c.acheteurId) ?? 0) + c.montant));
    parts.forEach((part, id) => {
      doit.set(id, ROUND((doit.get(id) ?? 0) + part));
    });
  }
  const soldes = new Map();
  for (const p of participants) {
    soldes.set(p.id, ROUND((paye.get(p.id) ?? 0) - (doit.get(p.id) ?? 0)));
  }
  return soldes;
}

/**
 * À partir des soldes, produit une liste minimale de virements (qui doit combien à qui).
 * Algorithme glouton : plus gros débiteur -> plus gros créancier.
 * @param {Participant[]} participants
 * @param {Map<string, number>} soldes
 * @returns {{ fromId: string, toId: string, montant: number }[]}
 */
export function computeDettes(soldes) {
  const creanciers = [];
  const debiteurs = [];
  soldes.forEach((solde, id) => {
    if (solde > 0) creanciers.push({ id, solde });
    if (solde < 0) debiteurs.push({ id, solde: -solde });
  });
  const result = [];
  let i = 0;
  let j = 0;
  creanciers.sort((a, b) => b.solde - a.solde);
  debiteurs.sort((a, b) => b.solde - a.solde);
  while (i < creanciers.length && j < debiteurs.length) {
    const cr = creanciers[i];
    const deb = debiteurs[j];
    const montant = ROUND(Math.min(cr.solde, deb.solde));
    if (montant <= 0) break;
    result.push({ fromId: deb.id, toId: cr.id, montant });
    cr.solde = ROUND(cr.solde - montant);
    deb.solde = ROUND(deb.solde - montant);
    if (cr.solde <= 0) i++;
    if (deb.solde <= 0) j++;
  }
  return result;
}

/**
 * Combine soldes exacts + dettes pour l'affichage.
 * @param {Participant[]} participants
 * @param {Cadeau[]} cadeaux
 * @returns {{ soldes: Map<string, number>, dettes: { fromId: string, toId: string, montant: number }[] }}
 */
export function computeAll(participants, cadeaux) {
  const soldes = computeSoldesExact(participants, cadeaux);
  const dettes = computeDettes(soldes);
  return { soldes, dettes };
}
