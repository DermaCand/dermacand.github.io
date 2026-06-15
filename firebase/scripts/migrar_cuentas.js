#!/usr/bin/env node
// DermaCand — Migración única de cuentas existentes
// Crea una ficha en la colección 'cuentas' con estado 'aprobada' para CADA usuario
// que ya exista en Firebase Authentication. IDEMPOTENTE. Usa Admin SDK (ignora reglas).
// Uso:  node migrar_cuentas.js   |   node migrar_cuentas.js --dry-run
//
// Solo necesario si DermaCand ya tuviera usuarios creados ANTES de activar el registro con
// aprobación. Si arrancas sin usuarios, no hace falta.

const admin = require('firebase-admin');
const path = require('path');

const KEY = process.env.GOOGLE_APPLICATION_CREDENTIALS || path.join(__dirname, 'serviceAccountKey.json');

let serviceAccount;
try {
  serviceAccount = require(KEY);
} catch (e) {
  console.error('No se encontró la clave de servicio.');
  console.error('Coloca "serviceAccountKey.json" en esta carpeta o define GOOGLE_APPLICATION_CREDENTIALS.');
  process.exit(1);
}

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

function splitName(displayName, email) {
  const dn = (displayName || '').trim();
  if (dn) {
    const parts = dn.split(/\s+/);
    const nombre = parts.shift() || '';
    return { nombre, apellido: parts.join(' ') };
  }
  return { nombre: (email || '').split('@')[0] || '', apellido: '' };
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  let total = 0, creados = 0, saltados = 0;
  let pageToken;

  do {
    const res = await admin.auth().listUsers(1000, pageToken);
    for (const u of res.users) {
      total++;
      const ref = db.collection('cuentas').doc(u.uid);
      const snap = await ref.get();
      if (snap.exists) { saltados++; continue; }

      const { nombre, apellido } = splitName(u.displayName, u.email);
      const data = {
        email: u.email || '',
        nombre,
        apellido,
        estado: 'aprobada',
        aceptaTerminos: false,
        versionTerminos: 'preexistente',
        migrado: true,
        fechaRevision: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      console.log(`${dryRun ? '[dry-run] ' : ''}Aprobar (migrar): ${u.email || u.uid}`);
      if (!dryRun) await ref.set(data, { merge: true });
      creados++;
    }
    pageToken = res.pageToken;
  } while (pageToken);

  console.log(`\nUsuarios totales: ${total} · fichas creadas: ${creados} · ya existían (saltados): ${saltados}` +
    (dryRun ? '   (DRY RUN: no se escribió nada)' : ''));
}

main().then(() => process.exit(0)).catch((e) => { console.error('Error:', e); process.exit(1); });
