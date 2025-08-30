
/**
 * Importa/atualiza exercícios em PT-PT no Firestore.
 * 
 * USO:
 *   1) npm i firebase-admin
 *   2) Coloca na pasta: 
 *        - firebase-service-account.json
 *        - exercicios_PT-PT_precisos_v2.json
 *        - import-firebase-pt.js (este ficheiro)
 *   3) Executa:
 *        node import-firebase-pt.js --collection exercicios --mode merge
 *      ou para criar/atualizar por slug:
 *        node import-firebase-pt.js --collection exercicios_pt --mode new
 */

const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

const args = require("node:process").argv.slice(2);
function getArg(name, def) {
  const idx = args.indexOf("--" + name);
  if (idx !== -1 && args[idx + 1]) return args[idx + 1];
  return def;
}

const COLLECTION = getArg("collection", "exercicios");
const MODE = (getArg("mode", "merge") || "merge").toLowerCase(); // 'merge' | 'new'

// Helper: slugify semelhante ao Python
function slugify(s) {
  return s
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Inicializar Admin SDK
const serviceAccount = require(path.resolve("./firebase-service-account.json"));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

// Carregar JSON PT-PT
const dataPath = path.resolve("./exercicios_PT-PT_precisos_v2.json");
const items = JSON.parse(fs.readFileSync(dataPath, "utf8"));

async function loadExistingMap() {
  const snap = await db.collection(COLLECTION).get();
  const map = new Map();
  snap.forEach(doc => {
    const d = doc.data();
    const en = (d.nome_en || "").toString();
    const existingSlug = d.id_slug || slugify(en);
    if (existingSlug) map.set(existingSlug, { id: doc.id, data: d });
  });
  return map;
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function run() {
  console.log(`Coleção: ${COLLECTION} | Modo: ${MODE} | Itens: ${items.length}`);

  const existingMap = (MODE === "merge") ? await loadExistingMap() : new Map();

  const ops = [];
  for (const it of items) {
    const slug = it.id_slug || slugify(it.nome_en || "");
    if (!slug) {
      console.warn("⚠️  Sem slug/nome_en, a ignorar:", it.nome_en);
      continue;
    }

    const payload = {
      nome_en: it.nome_en || null,
      nome_pt: it.nome_pt || it.nome_en || null,
      descricao_breve: it.descricao_breve || null,
      musculos_alvo: Array.isArray(it.musculos_alvo) ? it.musculos_alvo : [],
      categoria: it.categoria || null,
      equipamento: it.equipamento || null,
      animacao_url: it.animacao_url || null,
      id_slug: slug,
      updated_at: FieldValue.serverTimestamp(),
    };

    if (MODE === "merge") {
      const found = existingMap.get(slug);
      if (found) {
        const ref = db.collection(COLLECTION).doc(found.id);
        ops.push({ type: "update", ref, payload });
      } else {
        // Não encontrado → criar por slug
        const ref = db.collection(COLLECTION).doc(slug);
        payload.created_at = FieldValue.serverTimestamp();
        ops.push({ type: "set", ref, payload, merge: true });
      }
    } else {
      // MODE === "new": criar/atualizar por slug na coleção alvo
      const ref = db.collection(COLLECTION).doc(slug);
      payload.created_at = FieldValue.serverTimestamp();
      ops.push({ type: "set", ref, payload, merge: true });
    }
  }

  // Batch em blocos (máx 500 operações por batch; usamos 450 por segurança)
  const chunks = chunk(ops, 450);
  let done = 0;
  for (let i = 0; i < chunks.length; i++) {
    const batch = db.batch();
    for (const op of chunks[i]) {
      if (op.type === "update") batch.update(op.ref, op.payload);
      else batch.set(op.ref, op.payload, { merge: op.merge });
    }
    await batch.commit();
    done += chunks[i].length;
    console.log(`✔️ Batch ${i + 1}/${chunks.length} concluído — ${done}/${ops.length}`);
  }

  console.log("✅ Importação/merge concluído.");
  process.exit(0);
}

run().catch(err => {
  console.error("❌ Erro:", err);
  process.exit(1);
});
