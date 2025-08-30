
/**
 * replace-firestore-collection.js
 * 
 * Purges ALL docs from a Firestore collection, then imports data from a JSON file.
 * Usage:
 *   node replace-firestore-collection.js --collection Exercise --data exercicios.json --purge
 * 
 * Requirements:
 *   - npm i firebase-admin
 *   - firebase-service-account.json in the same folder
 */

const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");

function getArg(flag, fallback = null) {
  const i = process.argv.indexOf(flag);
  return i > -1 ? process.argv[i + 1] : fallback;
}

function hasFlag(flag) {
  return process.argv.includes(flag);
}

const COLLECTION = getArg("--collection", "Exercise");
const DATA_FILE  = getArg("--data", "exercicios.json");
const DO_PURGE   = hasFlag("--purge"); // if present, purge before import
const BATCH_LIMIT = 450;

const servicePath = path.resolve(__dirname, "firebase-service-account.json");
if (!fs.existsSync(servicePath)) {
  console.error("❌ Missing firebase-service-account.json in this folder.");
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(require(servicePath)),
});

const db = admin.firestore();

// Helper: stable slug
function slugify(s) {
  return String(s || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

async function purgeCollection(colName) {
  console.log(`⚠️  PURGE enabled. Deleting all docs from "${colName}" ...`);
  let totalDeleted = 0;
  while (true) {
    const snapshot = await db.collection(colName).limit(BATCH_LIMIT).get();
    if (snapshot.empty) break;
    const batch = db.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    totalDeleted += snapshot.size;
    console.log(`   - Deleted ${totalDeleted} docs so far...`);
  }
  console.log(`✅ Purge complete. Deleted total ${totalDeleted} docs.`);
}

async function importData(colName, items) {
  console.log(`⬆️  Importing ${items.length} items into "${colName}" ...`);
  let count = 0;
  let batch = db.batch();
  for (const e of items) {
    // prefer provided id_slug; else from nome_en or nome_pt
    const id_slug = e.id_slug || slugify(e.nome_en || e.nome_pt || e.descricao_breve || Math.random().toString(36).slice(2));
    const ref = db.collection(colName).doc(id_slug);

    const payload = {
      id_slug,
      nome_en: e.nome_en || "",
      nome_pt: e.nome_pt || "",
      descricao_breve: e.descricao_breve || "",
      musculos_alvo: Array.isArray(e.musculos_alvo) ? e.musculos_alvo.filter(Boolean) : [],
      categoria: e.categoria || "",
      equipamento: e.equipamento || "",
      animacao_url: e.animacao_url || "",
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (!e.created_at) payload.created_at = admin.firestore.FieldValue.serverTimestamp();

    batch.set(ref, payload, { merge: true });
    count++;
    if (count % BATCH_LIMIT === 0) {
      await batch.commit();
      console.log(`   - Committed ${count} items...`);
      batch = db.batch();
    }
  }
  if (count % BATCH_LIMIT !== 0) {
    await batch.commit();
  }
  console.log(`✅ Import complete. Wrote ${count} items.`);
}

(async () => {
  try {
    const dataPath = path.resolve(__dirname, DATA_FILE);
    if (!fs.existsSync(dataPath)) {
      console.error(`❌ Data file not found: ${dataPath}`);
      process.exit(1);
    }
    const items = JSON.parse(fs.readFileSync(dataPath, "utf8"));
    if (!Array.isArray(items)) {
      throw new Error("Data file must be a JSON array of exercise objects.");
    }

    console.log(`Target collection: ${COLLECTION}`);
    console.log(`Data file: ${DATA_FILE} (${items.length} items)`);

    if (DO_PURGE) {
      await purgeCollection(COLLECTION);
    } else {
      console.log("ℹ️  Purge disabled. To purge add flag --purge");
    }

    await importData(COLLECTION, items);
    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err);
    process.exit(1);
  }
})();
