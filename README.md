# 🦅 MIDAS Intranet

Sistema de Gestión Empresarial Integral desarrollado para **MIDAS Dominicana**. Este proyecto centraliza las operaciones críticas de la empresa en una plataforma robusta, segura y fácil de usar.

## 🚀 Módulos del Sistema

| Módulo | Descripción |
| :--- | :--- |
| **Dashboard Analítico** | Visualización en tiempo real de métricas clave y ejecución presupuestaria. |
| **Gestión Presupuestaria** | Control detallado de presupuestos por centro de costo y proyectos de inversión. |
| **Solicitudes de Compra** | Flujo de aprobación automatizado para adquisiciones empresariales. |
| **Recursos Humanos** | Directorio de empleados, control de asistencia y gestión de nómina. |
| **Mesa de Ayuda (IT)** | Sistema de tickets para soporte técnico y seguimiento de incidencias. |
| **Centro de Noticias** | Comunicados oficiales y boletines corporativos con interacción de usuarios. |

## 🛠️ Tecnologías Utilizadas

- **Frontend**: React.js, TypeScript, Tailwind CSS, Vite.
- **Backend**: Node.js, Express.js.
- **Base de Datos**: MySQL / MariaDB.
- **Seguridad**: Autenticación JWT, Hashing de contraseñas, Roles y Permisos granulares.

## 📂 Estructura del Repositorio

- `/docs`: Documentación detallada (Manuales de Usuario, Administración, Guías Técnicas).
- `/project`: Código fuente completo del Frontend y Backend.
- `INICIAR_SISTEMA.bat`: Script automatizado para el despliegue local.
- `backend/database.sql`: Exportación completa de la estructura y datos iniciales.

## ⚙️ Configuración Rápida

1. Instalar dependencias en ambas carpetas (`npm install`).
2. Configurar el archivo `.env` en el backend (basarse en `.env.example`).
3. Importar la base de datos `database.sql`.
4. Ejecutar el sistema usando `INICIAR_SISTEMA.bat`.

---

## 🔑 Credenciales de Acceso (Solo Evaluación)

Para probar el sistema, se han configurado los siguientes usuarios de prueba:

| Usuario | Contraseña | Rol |
| :--- | :--- | :--- |
| **admin** | `Midas2026!` | Administrador Total |
| **Jorddy** | `Midas2026!` | Empleado / Usuario |
| **Junior** | `Midas2026!` | Soporte IT |

---

**Desarrollado por**: Jorddy Rosario (Pasante) 🎯  
**Contacto**: [jordanysjor@gmail.com](mailto:jordanysjor@gmail.com)  
**Propiedad de**: MIDAS Dominicana
