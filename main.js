require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const admin = require("firebase-admin");

const http = require("http");

// Inicializa Firebase Admin con las credenciales
console.log("Env firebase", process.env.FIREBASE_CREDENTIALS_PATH);
console.log("Env Discord bot", process.env.DISCORD_BOT_TOKEN);
const serviceAccount = require(process.env.FIREBASE_CREDENTIALS_PATH);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

console.log("firebase...");

// Crea una nueva instancia de cliente de Discord
const bot = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});

console.log("bot client created");

bot.on("ready", () => {
  console.log(`Logged in as ${bot.user.tag}!`);
});

bot.on("voiceStateUpdate", (oldState, newState) => {
  let userId = newState.id;
  let now = new Date().toUTCString();

  let eventData = {
    userId: userId,
    timestamp: now,
    event: "", // Este será "connected", "disconnected", "self-muted", "self-unmuted", etc.
    channel: null,
  };

  // Usuario se conectó a un canal de voz
  if (oldState.channelId === null && newState.channelId !== null) {
    eventData.event = "connected";
    eventData.channel = newState.channelId;
    console.log(`${userId} se ha conectado a un canal de voz.`);
  }
  // Usuario se desconectó de un canal de voz
  else if (oldState.channelId !== null && newState.channelId === null) {
    eventData.event = "disconnected";
    eventData.channel = oldState.channelId;
    console.log(`${userId} se ha desconectado de un canal de voz.`);
  }
  // Ejemplo básico para detectar muteo y desmuteo por el usuario (self mute/unmute)
  else if (oldState.selfMute !== newState.selfMute) {
    eventData.event = newState.selfMute ? "self-muted" : "self-unmuted";
    eventData.channel = newState.channelId;
    console.log(`${userId} ha ${newState.selfMute ? "activado" : "desactivado"} el muteo propio.`);
  }

  // Guardar en Firebase
  if (eventData.event) {
    // Asegúrate de que hay un evento para registrar
    db.collection("voice_log")
      .add(eventData)
      .then((docRef) => {
        console.log(`Documento escrito con ID: ${docRef.id}`);
      })
      .catch((error) => {
        console.error("Error al agregar documento: ", error);
      });
  }
});

// Crea un servidor HTTP que escucha en el puerto 3000
http
  .createServer((req, res) => {
    res.write("Hello! The bot is alive!"); // Escribe una respuesta al cliente
    res.end(); // Finaliza la respuesta
  })
  .listen(3020, () => console.log("Server is listening on port 3020"));

// Iniciar sesión en Discord con el token del bot
bot.login(process.env.DISCORD_BOT_TOKEN);
