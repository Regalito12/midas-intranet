# 🚀 Guía de Despliegue en Producción - MIDAS Intranet

**Audiencia:** Equipo de IT / Infraestructura / DevOps.
**Objetivo:** Poner el sistema en línea para toda la empresa.

---

## 1. Requisitos del Servidor
*   **SO:** Windows Server 2019+ o Linux (Ubuntu 20.04+).
*   **Software:**
    *   [Node.js](https://nodejs.org/) v18 o superior (LTS).
    *   [MySQL Server](https://dev.mysql.com/downloads/) v8.0+.
    *   [PM2](https://pm2.keymetrics.io/) ( `npm install pm2 -g`).
    *   **Web Server:** IIS (Windows) o Nginx (Linux) como Proxy Inverso.

---

## 2. Preparación de la Base de Datos
1.  Crear base de datos llamada `midas_intranet`.
2.  Ejecutar el script de inicialización (`/backend/src/database/init_db.sql` o similar).
3.  Crear un usuario de servicio con permisos limitados (no usar `root`).

---

## 3. Instalación del Backend (API)
1.  Copiar la carpeta `/project/backend` al servidor (ej: `C:\Apps\Midas\backend`).
2.  Crear archivo `.env` en esa carpeta con credenciales de PRODUCCIÓN:
    ```env
    PORT=3001
    DB_HOST=localhost
    DB_USER=midas_service
    DB_PASSWORD=ContraseñaSuperSegura_2026!
    DB_NAME=midas_intranet
    JWT_SECRET=CadenaLargaAleatoriaDe64Caracteres
    CORS_ORIGIN=http://intranet.midas.local
    ```
3.  Instalar dependencias: `npm install --production`.
4.  Iniciar servicio con PM2:
    ```powershell
    pm2 start src/server.js --name "midas-api"
    pm2 save
    pm2 startup
    ```

---

## 4. Instalación del Frontend (Web)
1.  En tu máquina de desarrollo, genera los archivos estáticos:
    ```bash
    cd project
    npm run build
    ```
2.  Esto crea la carpeta `/dist`.
3.  Copia el **contenido** de `/dist` al servidor web (ej: `C:\inetpub\wwwroot\midas`).
4.  **Configurar IIS / Nginx:**
    *   Apuntar el sitio a la carpeta `dist`.
    *   **IMPORTANTE:** Configurar "Rewrite Rules" para SPA (Single Page Application). Si no, al recargar la página dará Error 404.
    *   Todas las peticiones que no sean archivos deben redirigir a `index.html`.

---

## 5. Configuración de Dominio y Red
1.  **DNS Interno:** Crear registro A (`intranet.midas.local` -> IP del Servidor).
2.  **Firewall:**
    *   Abrir puerto 80/443 (Web).
    *   Abrir puerto 3001 (API) SOLO si el Frontend y Backend están en servidores distintos. Si están en el mismo, usar Proxy Inverso (`/api` -> `localhost:3001`).

## 6. Verificación Final
1.  Entrar a `http://intranet.midas.local`.
2.  Intentar iniciar sesión.
3.  Verificar que carguen las fotos y documentos.

---
*Soporte Técnico: jorddy@midas.com*
