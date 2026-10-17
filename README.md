# UNIVERSIDAD SANTIAGO DE CALI
# PROGRAMACIÓN WEB, 2026B
## API REST de una Tienda de Cómics (Node.js + Express + MongoDB Atlas)

Guía paso a paso para construir, desde un **GitHub Codespace**, una API REST **sencilla** que permita **crear y consultar** datos de una tienda de cómics. Maneja dos entidades: **Autor** y **Comic**.

La base de datos vive en **MongoDB Atlas** (la nube de MongoDB), así que en el Codespace solo necesitamos `npm` y `npx`.

## Contenido

0. [Conceptos previos](#0-conceptos-previos)
1. [Sección 1: Crear el store en MongoDB Atlas](#sección-1-crear-el-store-en-mongodb-atlas)
2. [Sección 2: Crear la API REST con Node.js](#sección-2-crear-la-api-rest-con-nodejs)
3. [Datos de ejemplo en JSON](#datos-de-ejemplo-en-json)
4. [Siguientes pasos](#siguientes-pasos)

---

## 0. Conceptos previos

| Concepto | Explicación |
|---|---|
| **API REST** | Una forma de exponer datos y operaciones a través de HTTP. Cada *recurso* (comics, autores) tiene una URL y se manipula con verbos HTTP. |
| **Verbos HTTP** | `GET` consulta, `POST` crea, `PUT/PATCH` actualiza, `DELETE` elimina. En esta guía usamos `GET` y `POST`. |
| **JSON** | Formato de texto para intercambiar datos entre cliente y servidor. |
| **Node.js / npm / npx** | Node.js ejecuta JavaScript en el servidor. `npm` instala librerías. `npx` ejecuta una herramienta sin instalarla de forma permanente. |
| **Express** | Framework minimalista de Node.js para definir rutas y manejar peticiones HTTP. |
| **MongoDB** | Base de datos **NoSQL orientada a documentos**: guarda documentos parecidos a JSON (en realidad BSON) en lugar de filas y tablas. |
| **MongoDB Atlas** | Servicio en la nube que aloja MongoDB por ti (tiene un plan gratuito). |
| **Mongoose** | Librería (ODM) que permite definir esquemas y modelos para trabajar con MongoDB desde Node.js. |
| **mongosh** | Consola interactiva de MongoDB. La usaremos solo para **probar la conexión** y revisar datos. |

> **Nota sobre React:** React es una librería para construir interfaces (frontend). **No** se usa para crear APIs. Para el backend en JavaScript se usa Node.js (con Express, Fastify, NestJS, etc.). Luego podrías consumir esta API desde un frontend en React.

### Equivalencias entre SQL y MongoDB

| SQL | MongoDB |
|---|---|
| Base de datos | Base de datos (`database`) |
| Tabla | Colección (`collection`) |
| Fila | Documento (`document`) |
| Columna | Campo (`field`) |
| Clave foránea (FK) | Referencia (`ObjectId`) a otro documento |
| `PRIMARY KEY` | Campo `_id` (se genera automáticamente) |

---

## Sección 1: Crear el store en MongoDB Atlas

### Paso 1.1: Crear la cuenta y el clúster

1. Crea una cuenta en <https://www.mongodb.com/atlas>.
2. Crea un clúster gratuito (**M0**).

**Concepto:** un *clúster* es el servidor (o conjunto de servidores) donde Atlas aloja tus bases de datos.

### Paso 1.2: Crear un usuario de base de datos

En **Database Access → Add New Database User**, crea un usuario y una contraseña.

> Usa una contraseña **sin caracteres especiales** (`@`, `:`, `/`, `#`...) para evitar problemas en la cadena de conexión.

### Paso 1.3: Permitir el acceso desde el Codespace

En **Network Access → Add IP Address**, agrega `0.0.0.0/0` (cualquier IP).

> Es aceptable **solo para aprendizaje**: la IP de un Codespace cambia cada vez, así que no se puede fijar una sola. No lo hagas así en producción.

### Paso 1.4: Obtener la cadena de conexión

En **Connect → Drivers** copia la cadena de conexión. Se ve así:

```
mongodb+srv://USUARIO:CONTRASEÑA@cluster0.xxxxx.mongodb.net/
```

Agrégale el nombre de la base de datos (`tienda_comics`) al final:

```
mongodb+srv://USUARIO:CONTRASEÑA@cluster0.xxxxx.mongodb.net/tienda_comics
```

> **Concepto:** en MongoDB no hay que crear la base de datos ni las colecciones manualmente. Se crean **automáticamente** cuando se inserta el primer documento.

### Paso 1.5: Probar la conexión con `mongosh`

En la terminal del Codespace, ejecuta `mongosh` con `npx` (no hay que instalar nada):

```bash
npx -y mongosh "mongodb+srv://cluster0.xxxxx.mongodb.net/tienda_comics" --username TU_USUARIO
```

Te pedirá la contraseña. Cuando veas el prompt `Atlas atlas-xxxxx-shard-0 [primary] tienda_comics>`, prueba:

```js
db.runCommand({ ping: 1 })
```

Si responde `{ ok: 1 }`, la conexión funciona. Para salir escribe `exit`.

> Si no conecta, revisa: (1) usuario y contraseña, (2) que `0.0.0.0/0` esté en *Network Access* (puede tardar un minuto en activarse).

### Paso 1.6: Diseñar el modelo de datos

**Concepto clave: ¿incrustar o referenciar?**
En MongoDB puedes guardar datos relacionados de dos formas:

- **Incrustados (embedding):** el autor va *dentro* del documento del cómic. Es rápido de leer, pero duplica datos si un autor tiene muchos cómics.
- **Referenciados (referencing):** el cómic guarda solo el `_id` del autor. Es similar a una llave foránea y evita duplicar información.

Como un autor puede tener **muchos cómics**, usaremos **referencias**.

**Colección `autores`**

```json
{
  "_id": "ObjectId",
  "nombre": "Alan Moore",
  "nacionalidad": "Británica",
  "fechaNacimiento": "1953-11-18"
}
```

**Colección `comics`**

```json
{
  "_id": "ObjectId",
  "titulo": "Watchmen",
  "autor": "ObjectId (referencia a autores._id)",
  "editorial": "DC Comics",
  "anioPublicacion": 1986,
  "precio": 65000,
  "stock": 10
}
```

> Para simplificar, cada cómic tiene **un solo autor**. En una tienda real podrías usar un arreglo de referencias (`autores: [ObjectId]`).

Las colecciones se crearán solas cuando la API (o el script de carga) inserte los primeros datos. Con esto el **store** está listo.

---

## Sección 2: Crear la API REST con Node.js

### Paso 2.1: Preparar el entorno

En la terminal del Codespace, dentro de la carpeta del repositorio, verifica que Node.js esté disponible (los Codespaces ya lo traen):

```bash
node -v
```

Ahora ejecuta estos comandos en orden:

```bash
npm init -y
npm install express mongoose dotenv
npm pkg set type=module
npm pkg set scripts.dev="node --watch src/app.js"
npm pkg set scripts.seed="node src/seed.js"
mkdir -p data src/config src/models src/controllers src/routes
printf 'node_modules\n.env\n' > .gitignore
```

¿Qué hace cada uno?

| Comando | Para qué sirve |
|---|---|
| `npm init -y` | Crea el `package.json`, que describe el proyecto y registra sus dependencias. |
| `npm install express mongoose dotenv` | Instala las librerías (se explican abajo). |
| `npm pkg set type=module` | Permite usar `import`/`export` en lugar de `require`. |
| `npm pkg set scripts.dev=...` | Crea el comando `npm run dev`, que reinicia el servidor al guardar cambios. |
| `npm pkg set scripts.seed=...` | Crea el comando `npm run seed`, que carga los datos de ejemplo. |
| `mkdir -p ...` | Crea la estructura de carpetas. |
| `printf ... > .gitignore` | Evita subir `node_modules` y `.env` a GitHub. |

| Librería | Para qué sirve |
|---|---|
| `express` | Crear el servidor y definir rutas |
| `mongoose` | Conectar y modelar datos en MongoDB |
| `dotenv` | Cargar variables de entorno desde un archivo `.env` |

### Paso 2.2: Estructura de carpetas

```
api-tienda-comics/
├── .env
├── .gitignore
├── package.json
├── data/
│   ├── autores.json            # Datos de ejemplo
│   └── comics.json
└── src/
    ├── app.js                  # Punto de entrada: crea el servidor
    ├── seed.js                 # Script para cargar los datos de ejemplo
    ├── config/
    │   └── db.js               # Conexión a MongoDB
    ├── models/
    │   ├── Autor.js            # Esquema y modelo de Autor
    │   └── Comic.js            # Esquema y modelo de Comic
    ├── controllers/
    │   ├── autores.controller.js
    │   └── comics.controller.js
    └── routes/
        ├── autores.routes.js
        └── comics.routes.js
```

**Concepto: separación de responsabilidades.**
- **Modelo:** define la forma de los datos y habla con la base de datos.
- **Controlador:** contiene la lógica de cada operación (qué hacer cuando llega una petición).
- **Ruta:** conecta una URL + verbo HTTP con un controlador.

### Paso 2.3: Variables de entorno (la conexión a Atlas)

Crea el archivo `.env` en la raíz del proyecto con la cadena de conexión del Paso 1.4:

```env
PORT=3000
MONGODB_URI=mongodb+srv://USUARIO:CONTRASEÑA@cluster0.xxxxx.mongodb.net/tienda_comics
```

**Concepto:** las **variables de entorno** guardan configuración sensible (contraseñas, URLs) fuera del código fuente. **Nunca subas el `.env` a GitHub**: ya quedó protegido por el `.gitignore`.

> **Tip:** GitHub también ofrece **Codespaces secrets** (Settings → Codespaces → Secrets) para guardar valores sensibles como variables de entorno sin escribirlos en un archivo.

### Paso 2.4: Conectarse a Atlas con Mongoose

`src/config/db.js`

```js
import mongoose from "mongoose";

export async function conectarDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Conectado a MongoDB Atlas");
  } catch (error) {
    console.error("Error al conectar con MongoDB:", error.message);
    process.exit(1); // Termina la app si no hay base de datos
  }
}
```

**Concepto: `async/await`.** Conectarse a la base de datos toma tiempo (es una operación asíncrona). `await` pausa la función hasta que termine la operación, sin bloquear el resto del servidor.

**Prueba rápida de la conexión** (antes de seguir): crea un archivo temporal `src/probar-conexion.js`:

```js
import "dotenv/config";
import { conectarDB } from "./config/db.js";
import mongoose from "mongoose";

await conectarDB();
await mongoose.disconnect();
```

Ejecútalo:

```bash
node src/probar-conexion.js
```

Si ves `Conectado a MongoDB Atlas`, Mongoose está conectado. Puedes borrar el archivo con `rm src/probar-conexion.js`.

### Paso 2.5: Crear los modelos

**Concepto: esquema y modelo en Mongoose.**
- Un **esquema (Schema)** define los campos, tipos y validaciones de un documento.
- Un **modelo (Model)** es la clase construida a partir del esquema, y con ella se hacen las consultas (`find`, `create`, etc.).

`src/models/Autor.js`

```js
import mongoose from "mongoose";

const autorSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: [true, "El nombre es obligatorio"], trim: true },
    nacionalidad: { type: String, trim: true },
    fechaNacimiento: { type: Date }
  },
  { timestamps: true } // agrega createdAt y updatedAt automáticamente
);

export default mongoose.model("Autor", autorSchema, "autores");
```

`src/models/Comic.js`

```js
import mongoose from "mongoose";

const comicSchema = new mongoose.Schema(
  {
    titulo: { type: String, required: [true, "El título es obligatorio"], trim: true, unique: true },
    autor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Autor", // referencia a la colección de autores
      required: [true, "El autor es obligatorio"]
    },
    editorial: { type: String, trim: true },
    anioPublicacion: { type: Number, min: 1900 },
    precio: { type: Number, required: [true, "El precio es obligatorio"], min: 0 },
    stock: { type: Number, default: 0, min: 0 }
  },
  { timestamps: true }
);

export default mongoose.model("Comic", comicSchema, "comics");
```

> El tercer parámetro de `mongoose.model` es el nombre exacto de la colección en MongoDB (si lo omites, Mongoose lo pluraliza automáticamente en inglés).

### Paso 2.6: Crear los controladores

**Concepto: `req`, `res` y códigos de estado HTTP.**
- `req` (request) contiene lo que envía el cliente: parámetros de la URL (`req.params`), parámetros de consulta (`req.query`) y el cuerpo en JSON (`req.body`).
- `res` (response) es lo que respondemos.
- Los **códigos de estado** comunican el resultado:

| Código | Significado | Cuándo usarlo |
|---|---|---|
| `200` | OK | Consulta exitosa |
| `201` | Created | Recurso creado |
| `400` | Bad Request | Datos inválidos o ID mal formado |
| `404` | Not Found | El recurso no existe |
| `500` | Internal Server Error | Error inesperado del servidor |

`src/controllers/autores.controller.js`

```js
import mongoose from "mongoose";
import Autor from "../models/Autor.js";

// POST /api/autores  → crear un autor
export async function crearAutor(req, res) {
  try {
    const autor = await Autor.create(req.body);
    res.status(201).json(autor);
  } catch (error) {
    res.status(400).json({ mensaje: error.message });
  }
}

// GET /api/autores  → listar todos los autores
export async function listarAutores(req, res) {
  try {
    const autores = await Autor.find().sort({ nombre: 1 });
    res.json(autores);
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
}

// GET /api/autores/:id  → consultar un autor por su id
export async function obtenerAutor(req, res) {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ mensaje: "ID inválido" });
    }

    const autor = await Autor.findById(id);
    if (!autor) {
      return res.status(404).json({ mensaje: "Autor no encontrado" });
    }

    res.json(autor);
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
}
```

`src/controllers/comics.controller.js`

```js
import mongoose from "mongoose";
import Comic from "../models/Comic.js";
import Autor from "../models/Autor.js";

// POST /api/comics  → crear un cómic
export async function crearComic(req, res) {
  try {
    const { autor } = req.body;

    // Validamos que el autor referenciado exista
    if (!mongoose.isValidObjectId(autor) || !(await Autor.exists({ _id: autor }))) {
      return res.status(400).json({ mensaje: "El autor indicado no existe" });
    }

    const comic = await Comic.create(req.body);
    res.status(201).json(comic);
  } catch (error) {
    res.status(400).json({ mensaje: error.message });
  }
}

// GET /api/comics  → listar cómics (con filtros opcionales)
// Ejemplos: /api/comics?editorial=DC Comics   |   /api/comics?autor=<idAutor>
export async function listarComics(req, res) {
  try {
    const filtro = {};
    if (req.query.editorial) filtro.editorial = req.query.editorial;
    if (req.query.autor) filtro.autor = req.query.autor;

    // populate() reemplaza el id del autor por el documento completo
    const comics = await Comic.find(filtro).populate("autor", "nombre nacionalidad");
    res.json(comics);
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
}

// GET /api/comics/:id  → consultar un cómic por su id
export async function obtenerComic(req, res) {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ mensaje: "ID inválido" });
    }

    const comic = await Comic.findById(id).populate("autor", "nombre nacionalidad");
    if (!comic) {
      return res.status(404).json({ mensaje: "Cómic no encontrado" });
    }

    res.json(comic);
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
}
```
