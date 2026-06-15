# Scripts de DermaCand

## migrar_cuentas.js

Crea, para cada usuario ya existente en Firebase Authentication, una ficha en la colección
`cuentas` con `estado: 'aprobada'`. Así los usuarios previos no se quedan fuera al activar el
registro con aprobación. Es **idempotente** (no duplica fichas).

### Requisitos
- Node 18+.
- Una **clave de cuenta de servicio**: consola Firebase → Configuración del proyecto →
  Cuentas de servicio → *Generar nueva clave privada*. Guárdala como `serviceAccountKey.json`
  en esta carpeta (está en `.gitignore`; **no la subas al repo**).

### Uso
```bash
npm install
node migrar_cuentas.js --dry-run   # muestra qué haría, sin escribir
node migrar_cuentas.js             # aplica la migración
```

### Después de migrar (opcional, endurecer reglas)
Una vez todos los usuarios tienen ficha en `cuentas`, puedes exigir cuenta aprobada SIEMPRE:
- En `firestore.rules`, quita `|| !hasAccount()` de `isApproved()`.
- En `storage.rules` (si usas Storage), quita `|| hasNoAccount()` de `isApproved()`.
