const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors()); // esto permite conexión con frontend

app.get("/", (req, res) => {
  res.json({ message: "API funcionando 🚀" });
});

app.listen(3000, () => {
  console.log("Servidor en http://localhost:3000");
});