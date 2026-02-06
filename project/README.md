# 🦅 MIDAS Intranet - Manual de Puesta en Marcha

¡Saludos! Aquí tienes todo lo necesario para poner a correr la bestia (el sistema) en cualquier servidor o máquina local. Este proyecto está "Production Ready", así que dale sin miedo.

## 📋 Requisitos Previos (Lo que necesitas)
Antes de empezar, asegúrate de tener esto instalado en la máquina:

1.  **Node.js** (Versión 18 o superior) - El motor de la vaina.
2.  **MySQL / MariaDB** - La base de datos.
3.  **Git** - Pa' bajar el código (aunque si ya tienes este archivo, ya lo tienes).

## 🚀 Instalación Rápida (Paso a Paso)

### 1. Preparar la Base de Datos
Tienes dos opciones:

**Opción A: Archivo SQL (Fácil)**
Si te entregaron un archivo `database.sql` o similar:
1.  Crea una base de datos vacía llamada `intranet_db`.
2.  Impórtale ese archivo SQL usando tu programa favorito (HeidiSQL, Workbench, PhpMyAdmin).

**Opción B: Migraciones (Automático)**
Si no tienes el SQL, el sistema lo crea solo:
1.  Crea la base de datos `intranet_db`.
2.  Entra a `backend` y corre:
    ```bash
    npm run migrate
    npm run seed
    ```

### 2. Configurar el Backend (El cerebro)
Entra a la carpeta `backend` y prepara las credenciales:

1.  Ve a la carpeta `backend`.
2.  Busca el archivo `.env.example`.
3.  Hazle una copia y cámbiale el nombre a `.env` (sin el .example).
4.  Abre ese `.env` y pon tus datos reales (usuario de DB, contraseña, claves secretas, etc.). **Sin esto no prende.**

```bash
cd backend
npm install
npm run migrate  # Esto crea las tablas automágicamente
npm run seed     # (Opcional) Esto mete datos de prueba si los necesitas
```

### 3. Configurar el Frontend (La cara)
Sal del backend y ve a la raíz pa' instalar las dependencias generales:

```bash
cd ..
npm install
```

## ⚡ ¿Cómo se prende esta vaina?

### Opción A: Modo Vago (Recomendado) 🛋️
En la raíz del proyecto, busca el archivo `INICIAR_SISTEMA.bat`.
*   Dale doble clic.
*   Espera que carguen las ventanitas negras.
*   ¡Boom! Se abre solo en el navegador.

### Opción B: Modo Hacker (Consola) 💻
Si te gusta tirar código, abre dos consolas:

**Consola 1 (Backend):**
```bash
cd backend
npm run dev
```

**Consola 2 (Frontend):**
```bash
npm run dev
```

## 🛠️ Estructura del Proyecto
*   `backend/`: Toda la lógica, API, base de datos.
*   `src/`: El código de React (Frontend).
*   `public/`: Archivos estáticos.
*   `migrations/`: Archivos para crear la base de datos (dentro de backend).

## 🆘 Soporte
Si algo explota o no entiendes un error, revisa la carpeta `logs` en el backend. Ahí se guarda todo lo que pasa.

---
**Desarrollado por Jorddy**
*Calidad garantizada. Si rompe, tiene garantía.* 😎
