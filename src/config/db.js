import mongoose from "mongoose";

export async function conectarDB() {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error("Falta MONGODB_URI. Crea un archivo .env en la raíz del proyecto.");
    }

    await mongoose.connect(uri, { authSource: "admin" });
    console.log("Conectado a MongoDB Atlas");
  } catch (error) {
    console.error("Error al conectar con MongoDB:", error.message);
    process.exit(1); // Termina la app si no hay base de datos
  }
}
