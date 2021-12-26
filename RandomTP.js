/* Back with another project! This time, it's a script to randomize teleportation in a world.
 * Instead of using Essentials Economy, we're using our own coins...
 */

var Player = BukkitPlayer;
var Server = BukkitServer;
var Manager = Server.getPluginManager();
var Scheduler = Server.getScheduler();
var Host = Manager.getPlugin("PlaceholderAPI");
var Root = Host.getDataFolder().getAbsolutePath().concat("\\RandomTP");
var Configuration = Root.concat("\\config.yml");
var Database = Root.concat("\\userdata.json");
var Logs = Root.concat("\\Logs");

var ChatColor = org.bukkit.ChatColor;
var Colorize = 'translateAlternateColorCodes';
var JSONParser = org.json.simple.parser.JSONParser;
var JSONObject = org.json.simple.JSONObject;
var YamlConfiguration = org.bukkit.configuration.file.YamlConfiguration;
var FixedMetadataValue = org.bukkit.metadata.FixedMetadataValue;
var Location = org.bukkit.Location;
var Material = org.bukkit.Material;
var Biome = org.bukkit.block.Biome;

var System = Java.type("java.lang.System");
var Runnable = Java.type("java.lang.Runnable");
var Thread = Java.type("java.lang.Thread");
var File = Java.type("java.io.File");
var FileUtils = Java.type("java.nio.file.FileUtils");
var FileWriter = Java.type("java.io.FileWriter");
var FileReader = Java.type("java.io.FileReader");
var ArrayList = Java.type("java.util.ArrayList");
var Calendar = Java.type("java.util.Calendar");
var SimpleDateFormat = Java.type("java.text.SimpleDateFormat");

function Ticket(rarity, price, biome, range) {
  this.rarity = rarity;
  this.value = price;
  this.biome = biome;
  this.range = range;
  this.getRarity = function() {
    return this.rarity;
  }
  this.getRarityName = function() {
    switch(this.rarity.toLowerCase()) {
      case "common": return /* key */;
      case "rare": return /* key */;
      case "epic": return /* key */;
      case "mythic": return /* key */;
      case "legendary": return /* key */;
    } // throw an error or sth smh
  }
}

function main() {
  try {

  } catch(err) {
    return "&6TPManager &8&l| &cLỗi: &f" + err.message;
  }
}
