import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  writeBatch,
  type Firestore,
  type Unsubscribe,
} from "firebase/firestore";
import type { CardRates, TransactionInput } from "@/lib/types";
import { getSeedPresets } from "@/lib/cardPresets";

export type StoredTransaction = TransactionInput & { id: string };

export type StoredCard = CardRates & { id: string };

function cardsCol(db: Firestore, uid: string) {
  return collection(db, "users", uid, "cards");
}

function txCol(db: Firestore, uid: string) {
  return collection(db, "users", uid, "transactions");
}

export function cardPayload(card: CardRates): Record<string, string | number> {
  const o: Record<string, string | number> = { name: card.name, default: card.default };
  for (const [k, v] of Object.entries(card)) {
    if (k === "name" || k === "default") continue;
    if (typeof v === "number" && Number.isFinite(v)) {
      o[k] = v;
    }
  }
  return o;
}

function docToCardRates(id: string, data: Record<string, unknown>): StoredCard {
  const name = String(data.name ?? "");
  const def = Number(data.default);
  const card: StoredCard = { id, name, default: Number.isFinite(def) ? def : 1 };
  for (const [k, v] of Object.entries(data)) {
    if (k === "name" || k === "default") continue;
    if (typeof v === "number" && Number.isFinite(v)) {
      (card as Record<string, number | string>)[k] = v;
    }
  }
  return card;
}

export function subscribeCards(
  db: Firestore,
  uid: string,
  onData: (cards: StoredCard[]) => void,
  onError?: (e: Error) => void,
): Unsubscribe {
  return onSnapshot(
    cardsCol(db, uid),
    (snap) => {
      const list = snap.docs.map((d) => docToCardRates(d.id, d.data() as Record<string, unknown>));
      onData(list);
    },
    (err) => onError?.(err),
  );
}

export function subscribeTransactions(
  db: Firestore,
  uid: string,
  onData: (rows: StoredTransaction[]) => void,
  onError?: (e: Error) => void,
): Unsubscribe {
  const q = query(txCol(db, uid), orderBy("createdAt", "asc"));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => {
        const x = d.data() as Record<string, unknown>;
        return {
          id: d.id,
          date: String(x.date ?? ""),
          merchant: String(x.merchant ?? ""),
          category: String(x.category ?? "other"),
          amount: Number(x.amount) || 0,
        } satisfies StoredTransaction;
      });
      onData(list);
    },
    (err) => onError?.(err),
  );
}

export async function seedDefaultCardsIfEmpty(db: Firestore, uid: string): Promise<void> {
  const ref = cardsCol(db, uid);
  const snap = await getDocs(ref);
  if (!snap.empty) return;
  const batch = writeBatch(db);
  for (const card of getSeedPresets()) {
    const r = doc(ref);
    batch.set(r, cardPayload(card));
  }
  await batch.commit();
}

export async function replaceAllTransactions(
  db: Firestore,
  uid: string,
  rows: TransactionInput[],
): Promise<void> {
  const ref = txCol(db, uid);
  const existing = await getDocs(ref);
  const batch = writeBatch(db);
  existing.forEach((d) => batch.delete(d.ref));
  for (const row of rows) {
    const r = doc(ref);
    batch.set(r, {
      date: row.date,
      merchant: row.merchant,
      category: row.category,
      amount: row.amount,
      createdAt: serverTimestamp(),
    });
  }
  await batch.commit();
}

export async function addTransactionRemote(
  db: Firestore,
  uid: string,
  row: TransactionInput,
): Promise<void> {
  await addDoc(txCol(db, uid), {
    date: row.date,
    merchant: row.merchant,
    category: row.category,
    amount: row.amount,
    createdAt: serverTimestamp(),
  });
}

export async function deleteTransactionRemote(db: Firestore, uid: string, txId: string): Promise<void> {
  await deleteDoc(doc(db, "users", uid, "transactions", txId));
}

export async function clearTransactionsRemote(db: Firestore, uid: string): Promise<void> {
  const ref = txCol(db, uid);
  const snap = await getDocs(ref);
  const batch = writeBatch(db);
  snap.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}

export async function setCardDoc(db: Firestore, uid: string, card: StoredCard): Promise<void> {
  const r = doc(db, "users", uid, "cards", card.id);
  await setDoc(r, cardPayload(card));
}

export async function addCardDoc(db: Firestore, uid: string, card: CardRates): Promise<string> {
  const ref = await addDoc(cardsCol(db, uid), cardPayload(card));
  return ref.id;
}

export async function deleteCardDoc(db: Firestore, uid: string, cardId: string): Promise<void> {
  await deleteDoc(doc(db, "users", uid, "cards", cardId));
}
