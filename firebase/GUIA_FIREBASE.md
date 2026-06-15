# Guía de montaje del backend de DermaCand (Firebase + GitHub)

Esta guía te lleva de cero a un backend funcional. La app **ya trae todo el código integrado**
(login, registro con aprobación, paneles de administrador, reportes, guías en la nube); solo
hay que **crear los servicios y pegar la configuración**. Hasta que completes los pasos 1–7, el
login online no funcionará, pero la app sigue abriendo en **modo sin conexión**.

> Arquitectura: **Firebase** aporta Auth (login), Realtime Database (sincroniza favoritos y
> recientes por usuario), Firestore (índice de guías, roles, cuentas y reportes) y, opcional,
> Cloud Functions (avisos por correo). Los **PDF de las guías NO se guardan en Firebase Storage**
> sino en un **repo de GitHub Pages**, porque muchas intranets de hospital bloquean Storage pero
> permiten `github.io`.

---

## 1. Crear el proyecto Firebase

1. Entra en https://console.firebase.google.com → **Agregar proyecto** (p. ej. `dermacand`).
2. Puedes desactivar Google Analytics (no se usa).
3. Elige región **europe-west** para los servicios (coherencia y RGPD).

## 2. Authentication (Email/Contraseña)

Consola → **Compilación → Authentication → Comenzar** → pestaña *Sign-in method* →
habilita **Correo electrónico/contraseña**. (No se usa Google ni otros proveedores.)

## 3. Firestore Database

1. Consola → **Firestore Database → Crear base de datos** → **modo producción** → región europe-west.
2. Publica las reglas de `firestore.rules` (ver paso 8, con Firebase CLI, o pégalas en la
   pestaña *Reglas*).
3. Colecciones que usará la app (se crean solas al usarse, salvo `roles` y `config`):
   - `roles/{uid}` — **se crea a mano** (paso 9).
   - `config/github` — **se crea a mano** (paso 6): documento con campo `token`.
   - `cuentas/{uid}`, `guias/{id}`, `reportes/{id}` — las crea la app.

## 4. Realtime Database

1. Consola → **Realtime Database → Crear base de datos** → región europe-west → modo bloqueado.
2. Publica `database.rules.json` (cada usuario solo accede a su nodo `users/{uid}`).

## 5. (Opcional) Cloud Storage

Solo si prefieres guardar los PDF en Firebase Storage en lugar de GitHub. Requiere plan Blaze.
Si lo haces, publica `storage.rules`. **Por defecto NO se usa** (ver paso 6).

## 6. Repositorio de GitHub para los PDF + token

1. Crea un repo (idealmente de GitHub Pages), p. ej. `DermaCand/dermacand.github.io`.
2. Crea un **Personal Access Token** (fine-grained) con permiso **Contents: Read and write**
   sobre ese repo.
3. En Firestore crea el documento `config/github` con un campo:
   - `token` (string) = el PAT.
4. En la app (`DermaCand_app.html`), ajusta `const GH_REPO = 'DermaCand/dermacand.github.io';`
   al repo que hayas creado.

## 7. Pegar la configuración en la app

Consola → **Configuración del proyecto → Tus apps → Web (</>)** → registra una app web y copia
el objeto `firebaseConfig`. Pégalo en `DermaCand_app.html`, sustituyendo el bloque marcado como
`PLACEHOLDER` dentro del `<script type="module">` del backend:

```js
const firebaseConfig = {
  apiKey: "…",
  authDomain: "dermacand.firebaseapp.com",
  projectId: "dermacand",
  storageBucket: "dermacand.firebasestorage.app",
  messagingSenderId: "…",
  appId: "…",
  databaseURL: "https://dermacand-default-rtdb.europe-west1.firebasedatabase.app"
};
```

Y pon `DC_BACKEND` (en el mismo script) a `true` si lo dejaste apagado.

## 8. Publicar reglas con Firebase CLI (recomendado)

En la raíz del proyecto (junto a `firebase.json`):

```bash
npm install -g firebase-tools
firebase login
firebase use --add        # selecciona tu proyecto dermacand

# firebase.json mínimo (créalo si no existe):
# {
#   "firestore": { "rules": "firebase/firestore.rules" },
#   "database":  { "rules": "firebase/database.rules.json" },
#   "storage":   { "rules": "firebase/storage.rules" }
# }

firebase deploy --only firestore:rules,database
# (añade ,storage solo si usas Cloud Storage)
```

## 9. Crear tu rol de administrador

En Firestore, crea el documento `roles/{TU_UID}` (el UID sale de Authentication → Usuarios):

```
roles/abcd1234...   →   { role: "admin" }
```

Para dar permiso de subida a un dermatólogo solo en ciertas secciones:

```
roles/efgh5678...   →   { role: "editor", sections: ["inflam","onco"] }
```

### IDs de sección de DermaCand (campo `sections` / `section`)

| ID | Sección |
|----|---------|
| `inflam` | Dermatosis inflamatorias |
| `inf` | Infecciones cutáneas |
| `folic` | Folículo y glándulas |
| `tric` | Tricología |
| `ampoll` | Enfermedades ampollosas |
| `onco` | Dermato-oncología |
| `ped` | Dermatología pediátrica |
| `urg` | Urgencias dermatológicas |
| `proc` | Procedimientos y cirugía |
| `patol` | Dermatopatología y laboratorio |
| `tto` | Tratamientos |

## 10. (Opcional) Cloud Functions — avisos por correo

Ver `functions/README.md`. Requiere plan Blaze y una cuenta de correo con contraseña de
aplicación. La app funciona sin esto.

## 11. (Opcional) Migrar usuarios previos

Si ya tenías usuarios antes de activar el registro con aprobación, ejecuta
`scripts/migrar_cuentas.js` (ver `scripts/README.md`) para marcarlos como `aprobada`.

---

## Resumen del modelo de permisos

- **Leer guías**: usuarios con cuenta `aprobada`, con rol admin/editor, o heredados sin ficha.
- **Subir/editar/borrar guías**: admin (todas las secciones) o editor (solo sus `sections`).
- **Aprobar/rechazar cuentas y ver reportes**: solo admin.
- **Crear su propia cuenta y enviar reportes**: cualquier usuario autenticado.
- La colección `roles` y `config/github` **solo se gestionan desde la consola**, nunca desde la app.

## Orden rápido

Crear proyecto → Auth Email/Password → Firestore + reglas → RTDB + reglas → repo GitHub + PAT en
`config/github` → pegar `firebaseConfig` y `GH_REPO` en el HTML y `DC_BACKEND=true` → crear tu
`roles/{uid}=admin` → (opcional) Functions + secretos SMTP → (opcional) migración.
