# Cloud Functions de DermaCand

Dos funciones que **avisan a los administradores** cuando hay actividad que requiere su atención:

- `avisoNuevaCuenta` — cuando alguien se registra (documento nuevo en `cuentas/{uid}`).
- `avisoNuevoReporte` — cuando un usuario envía un reporte de error **manual** (documento nuevo en `reportes/{id}` con `tipo == 'usuario'`).

Cada función envía una **notificación push (FCM)** a todos los administradores (rol `admin` + el
principal) que la tengan activada en su cuenta, y —**de forma OPCIONAL**— también un correo.

**La app funciona sin esto.** Las funciones solo añaden los avisos; el registro, la aprobación y
los reportes funcionan igual aunque no las despliegues.

## Requisitos

1. **Firebase CLI**: `npm install -g firebase-tools` y `firebase login` (o usa el workflow de
   GitHub Actions `.github/workflows/deploy-firebase.yml`, que despliega functions + reglas sin
   terminal cuando existe el secreto `FIREBASE_SERVICE_ACCOUNT`).
2. **Plan Blaze** (de pago por uso) en el proyecto `dermacand2026`. El coste real para este
   volumen es ~0 €, pero Cloud Functions exige Blaze. Configura una alerta de presupuesto.
3. Para las **notificaciones push**: una **clave VAPID** (Consola Firebase → Configuración del
   proyecto → Cloud Messaging → «Certificados push web» → Generar par de claves) pegada en
   `DermaCand_app.html` (`firebaseConfig.vapidKey`).
4. (Opcional) Para el **correo**: una cuenta SMTP con *contraseña de aplicación*.

## Correo OPCIONAL (variables de entorno)

El correo ya **no** usa secretos obligatorios: solo se envía si están definidas las variables de
entorno `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` y `ADMIN_EMAIL`. Si falta alguna, se
**omite el correo** y se manda únicamente el push (así el despliegue no depende de configurar el
correo). Para activarlo, crea un fichero `firebase/functions/.env`:

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=tu_cuenta@gmail.com
SMTP_PASS=contraseña_de_aplicacion
ADMIN_EMAIL=a_quien_avisar@ejemplo.com
```

## Desplegar

```bash
# En la raíz del proyecto (donde está firebase.json):
cd firebase/functions
npm install
cd ../..
firebase deploy --only functions,firestore:rules --project dermacand2026
```

O deja que lo haga GitHub Actions al hacer push a `main` (ver el workflow), añadiendo antes el
secreto `FIREBASE_SERVICE_ACCOUNT` (JSON de una cuenta de servicio con permiso de despliegue) en
*Settings → Secrets and variables → Actions* del repositorio de GitHub Pages de DermaCand.

Región: `europe-west1` (coherencia RGPD con Firestore/RTDB en europe-west). Runtime: Node 20.
