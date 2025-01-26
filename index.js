const { Client, Collection, Events, Routes } = require('discord.js');
const fs = require('fs');
const { REST } = require('@discordjs/rest');
const path = require('path');
require('dotenv').config();

const client = new Client({
    intents: 3276799
});

// Manejador de errores global
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

// Colecciones para comandos y eventos
client.slashCommands = new Collection();
client.prefixCommands = new Collection();
client.events = new Collection();

// Cargar Comandos Slash
const slashCommandFiles = fs.readdirSync('./slash-commands').filter(file => file.endsWith('.js'));
const slashCommands = [];

for (const file of slashCommandFiles) {
  try {
    const command = require(`./slash-commands/${file}`);
    if ('data' in command && 'execute' in command) {
      client.slashCommands.set(command.data.name, command);
      slashCommands.push(command.data.toJSON());
    }
  } catch (error) {
    console.error(`Error cargando comando slash ${file}:`, error);
  }
}

// Cargar Comandos de Prefijo
const prefixCommandFiles = fs.readdirSync('./prefix-commands').filter(file => file.endsWith('.js'));
for (const file of prefixCommandFiles) {
  try {
    const command = require(`./prefix-commands/${file}`);
    client.prefixCommands.set(command.name, command);
  } catch (error) {
    console.error(`Error cargando comando prefix ${file}:`, error);
  }
}

// Cargar Eventos
const eventFiles = fs.readdirSync('./events').filter(file => file.endsWith('.js'));
let eventCount = 0;

for (const file of eventFiles) {
  try {
    const event = require(`./events/${file}`);
    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args));
    } else {
      client.on(event.name, (...args) => event.execute(...args));
    }
    eventCount++;
  } catch (error) {
    console.error(`Error cargando evento ${file}:`, error);
  }
}

client.on(Events.ClientReady, async () => {
    console.log(`Conectado como ${client.user.username}!`);
    
    // Logs de carga
    console.log(`🚀 Carga de comandos y eventos completada:`);
    console.log(`📡 Comandos Slash cargados: ${client.slashCommands.size}`);
    console.log(`🔧 Comandos Prefix cargados: ${client.prefixCommands.size}`);
    console.log(`🎉 Eventos cargados: ${eventCount}`);
    console.log(`📊 Total de comandos: ${client.slashCommands.size + client.prefixCommands.size}`);
});

// Manejador de Interacciones (Slash Commands)
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.slashCommands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    await interaction.reply({ 
      content: 'Hubo un error al ejecutar este comando', 
      ephemeral: true 
    });
  }
});

// Manejador de Comandos de Prefijo
client.on('messageCreate', message => {
  if (!message.content.startsWith(process.env.prefix) || message.author.bot) return;

  const args = message.content.slice(process.env.prefix.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  const command = client.prefixCommands.get(commandName);
  if (!command) return;

  try {
    command.execute(message, args);
  } catch (error) {
    console.error(error);
    message.reply('Hubo un error al ejecutar este comando');
  }
});

// Manejo de errores de conexión
client.on('error', (error) => {
  console.error('Error de Discord.js:', error);
});

// Intento de reconexión automática en caso de desconexión
client.on('disconnect', () => {
  console.warn('Bot desconectado. Intentando reconectar...');
  client.login(process.env.token);
});

client.login(process.env.token)
  .catch(error => {
    console.error('Error al iniciar sesión:', error);
    // Reintento de inicio de sesión después de un breve tiempo
    setTimeout(() => {
      client.login(process.env.token);
    }, 5000);
  });