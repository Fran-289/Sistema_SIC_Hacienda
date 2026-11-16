# Sistema de Ingresos Consulares (SIC)
> **Ministerio de Hacienda de El Salvador**
> *Dirección General de Tesorería*

El **Sistema de Ingresos Consulares (SIC)** es una solución web integral orientada a microservicios diseñada para el registro, control, validación, conciliación bancaria y reportería de los ingresos recaudados por la red de consulados y embajadas de El Salvador en el exterior.

---

## Stack Tecnológico

### Backend (`/backend`)
* **Framework**: Quarkus 3.8.2 (Java 21)
* **Persistencia & ORM**: Hibernate ORM con Panache (`PanacheEntityBase`)
* **Migraciones de BD**: Flyway Migration (automático al iniciar)
* **Seguridad & Autenticación**: SmallRye JWT + KeyStore PKCS12 / RSA 2048 + Hash Bcrypt
* **Puerto HTTP por defecto**: `8081`

### Frontend (`/frontend`)
* **Framework**: Next.js 14 (App Router, React 18)
* **Lenguaje**: TypeScript
* **Estilos**: Tailwind CSS
* **Puerto HTTP por defecto**: `3001`

### Base de Datos
* **Motor**: MySQL 8.0 / MariaDB
* **Base de Datos**: `sic_db`
* **Cotejación**: `utf8mb4_unicode_ci`
* **Puerto**: `3306`

---

## Arquitectura del Proyecto

```
SIC/
├── backend/
│   └── src/
│       ├── main/
│       │   ├── java/sv/gob/hacienda/sic/
│       │   │   ├── dto/          # LoginRequest, LoginResponse
│       │   │   ├── entity/       # Entidades JPA Panache (10 tablas)
│       │   │   ├── resource/     # Endpoints JAX-RS REST
│       │   │   └── security/     # PasswordUtil, TokenService
│       │   └── resources/
│       │       ├── application.properties
│       │       ├── jwtKeystore.p12
│       │       ├── publicKey.pem
│       │       └── db/migration/
│       │           ├── V1__init_schema.sql
│       │           ├── V2__seed_data.sql
│       │           └── V3__ingreso_consular.sql
│       └── test/                 # Tests JUnit 5
│
├── frontend/
│   ├── .env.local
│   └── src/
│       ├── app/                  # Páginas App Router
│       ├── components/           # Componentes React
│       └── lib/                  # Utilidades (api.ts)
│
└── README.md
```

---

## Modelo de Datos (sic_db)

El esquema se gestiona automáticamente mediante Flyway al iniciar el backend:

- **users**: Administradores y operadores (RBAC con permisos JSON)
- **consulates**: Embajadas y consulados por región/país
- **informes_caja**: Consolidaciones mensuales de caja
- **records**: Registro detallado de transacciones e ingresos
- **ingreso_consular**: Ingresos consulares
- **system_settings**: Configuración institucional
- **system_logs**: Auditoría y trazabilidad
- **report_groups / report_documents / report_histories**: Reportería

---

## Guía de Instalación

### 1. Requisitos Previos
- JDK 21 configurado en el sistema
- Node.js v18+ y npm instalados
- MySQL 8.0 o MariaDB corriendo en localhost:3306

Crear la base de datos:
```sql
CREATE DATABASE sic_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. Iniciar el Backend (Quarkus)

Desde la carpeta `backend/`:
```powershell
.\apache-maven-3.9.6\bin\mvn.cmd clean compile quarkus:dev -DskipTests
```

URLs de verificación:
- API REST: http://localhost:8081/api
- Health Check: http://localhost:8081/q/health
- Dev UI: http://localhost:8081/q/dev

### 3. Iniciar el Frontend (Next.js)

Desde la carpeta `frontend/`:
```powershell
npm install
npm run dev
```

URL de acceso: http://localhost:3001

---

## Credenciales por Defecto (Seed Data)

El usuario administrador inicial se crea automáticamente con Bcrypt:

- **Usuario**: admin@hacienda.gob.sv
- **Contraseña**: AdminSic2026!
- **Rol**: ADMIN

---

## Seguridad

- Autenticación JWT con keystore PKCS12 (RSA 2048)
- Contraseñas hasheadas con Bcrypt
- Endpoints protegidos con `@RolesAllowed`
- Token enviado en header `Authorization: Bearer <token>`

> **Nota**: Los archivos de clave (`jwtKeystore.p12`, `publicKey.pem`) están en `.gitignore` y deben generarse localmente si no existen.
