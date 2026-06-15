# Cloud Functions de DermaCand

Dos funciones que **avisan por correo al administrador**:

- `avisoNuevaCuenta` — cuando alguien se registra (documento nuevo en `cuentas/{uid}`).
- `avisoNuevoReporte` — cuando un usuario envía un reporte de error **manual** (documento nuevo en `reportes/{id}` con `tipo == 'usuario'`).

**La app funciona sin esto.** Las funciones solo añaden el aviso por correo; el registro, la
aprobación y los reportes funcionan igual aunque no despliegues las funciones.

## Requisitos

1. **Firebase CLI**: `npm install -g firebase-tools` y `firebase login`.
2. **Plan Blaze** (de pago por uso) en el proyecto. El coste real para este volumen es ~0 €,
   pero Cloud Functions exige Blaze. Configura una alerta de presupuesto.
3. Una **cuenta de correo** con *contraseña de aplicación* (p. ej. Gmail con verificación en
   dos pasos → contraseña de aplicación).

## Pasos

```bash
# En la raíz del proyecto (donde está firebase.json):
firebase init functions          # elegir JavaScript; usar esta carpeta como "functions"
cd functions
npm install

# Configurar los secretos SMTP (se piden de forma interactiva):
firebase functions:secrets:set SMTP_HOST     # p. ej. smtp.gmail.com
firebase functions:secrets:set SMTP_PORT     # p. ej. 465
firebase functions:secrets:set SMTP_USER     # tu_cuenta@gmail.com
firebase functions:secrets:set SMTP_PASS     # contraseña de aplicación
firebase functions:secrets:set ADMIN_EMAIL   # a quién llegan los avisos

# Desplegar:
firebase deploy --only functions
```

Región: `europe-west1` (coherencia RGPD con Firestore/RTDB en europe-west). Runtime: Node 20.
