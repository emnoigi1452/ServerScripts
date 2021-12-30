/* Part 1: Script info
   [-] PreventBlock - Recoded version v0.5.0
   [-] Source code: (Public) - github.com/emnoigi1452/PublicCores/PreventBlock.js
   [-] Language: JavaScript (w/ NashornAPI & PlaceholderAPI)
   [-] Author: DucTrader (Stella)

   Part 2: Dependencies
   [-] PreventHopper-ORE: Custom plugin coded by DarkEvan
   [-] EssentialsX: You know what plugin it is, get it on SpigotMC
   [-] PlaceholderAPI: To run this script, you'll need it
   [-] Vault: Economy manager for SpigotMC, hooked via EssentialsEconomy

   Part 3: Overview - Features
   [*] Author's note: Most of the features shown here is basically a stability update
   from the old version. The previous installment of this script was coded to run
   tasks immediately when executely, which could create 'traffic jam' in the
   server's thread. To counter this, the new version uses the server's built-in
   task-scheduler to optimize task execution

   [-] Compress/Condense: The default compression process with some minor changes
       [*] Single type: Craft only 1 type of mineral
       [*] All: Like the name, it just crafts all your minerals.
   [-] Deposit/Withdraw: Basic actions to interact with the database
   [-] Give/Add/Remove/Subtract: Moderation commands for staff to handle player's data
   [-] Reset: In-game command to execute a clean wipe of someone or the server's database
   [-] ToWand: Midpoint converter from PreventBlock to SuperiorCore's database
   [-] Pay/Send: Allow PreventBlock's user from trading with each other
   [-] Sell: Just like the name, you can sell items in your storage to get money!
   [-] Merchant: A custom shop where player's can sell their minerals to others
       [*] The calculation on how prices are determined is not written...
   [-] Prestige: Reset all your minerals to level up, and receive a permanent booster!
*/

var Server = BukkitServer;
var Manager = Server.getPluginManager();
var Services = Server.getServicesManager();
var Scheduler = Server.getScheduler();
var Host = Manager.getPlugin("PlaceholderAPI");
var PreventHopper = Manager.getPlugin("PreventHopper-ORE");
var Essentials = Manager.getPlugin("Essentials");
var Vault = Manager.getPlugin("Vault");
var ScriptHost = Host.getDataFolder().getAbsolutePath() + "\\PreventBlock\\";

var ChatColor = org.bukkit.ChatColor;
var ColorParam = 'translateAlternateColorCodes';
var YamlConfiguration = org.bukkit.configuraiton.file.YamlConfiguration;
var FixedMetadataValue = org.bukkit.metadata.FixedMetadataValue;
var Material = org.bukkit.Material;
var ItemStack = org.bukkit.inventory.ItemStack;

var File = Java.type("java.io.File");
var ArrayList = Java.type("java.util.ArrayList");
var HashMap = Java.type("java.util.HashMap");
var Runnable = Java.type("java.lang.Runnable");
var Thread = Java.type("java.lang.Thread");
var UUID = Java.type("java.util.UUID");

var LanguageManager = {
  prefix: "&bBlock &8&l| &f",
  getScriptMessage: function(key) {
    return ChatColor[ColorParam]('&', (this.prefix + this[key]));
  },
  invalidType: "&cLỗi: &fLoại khoáng sản không hợp lệ!",
  invalidAction: "&cLỗi: &fLệnh phụ không hợp lệ! Hãy kiểm tra lại code!",
  noPermission: "&cLỗi: &fBạn không có quyền dùng!",
  dependMissing: "&cLỗi: &fMáy chủ không có đủ phần mềm để triển khai!",
  vaultError: "&cLỗi: &fKhông thể kết nối với hệ thống Vault!",
  invalidUserData: "&cLỗi: &fDữ liệu của người chơi không tải thành công!",
  invalidInt: "&cLỗi: &fSố nguyên dương không hợp lệ!",
  notEnoughMinerals: "&cLỗi: &fBạn không có đủ %type% &ftrong kho",
  compressedSuccessful: "&fĐã nén thành công &a%ores% %type% &fthành &a%product% %block%&f!",
  compressAllBegin: "&aGhi chú: &f&oBắt đầu nén tất cả khoáng sản trong kho...",
  depositSuccessful: "&fĐã gửi thành công &a%amount% %type% &fvào kho!",
  withdrawSuccessful: "&fĐã rút thành công &a%amount% %type% &ftừ kho!"
}

var PreventCore = {
  shortcuts: ['coal', 'lapis', 'redstone', 'iron', 'gold', 'diamond', 'emerald'],
  formatNumber: function(x) {
    x = x.toString();
    var pattern = /(-?\d+)(\d{3})/;
    while (pattern.test(x))
      x = x.replace(pattern, "$1,$2");
    return x;
  },
  blockKeys: function(ph) {
    var Blocks = new ArrayList(); var Ph_Keys = new ArrayList();
    Blocks.add("COAL_BLOCK"); Ph_Keys.add("COAL");
    Blocks.add("LAPIS_BLOCK"); Ph_Keys.add("LAPIS_LAZULI");
    Blocks.add("REDSTONE_BLOCK"); Ph_Keys.add("REDSTONE");
    Blocks.add("IRON_BLOCK"); Ph_Keys.add("IRON_INGOT");
    Blocks.add("GOLD_BLOCK"); Ph_Keys.add("GOLD_INGOT");
    Blocks.add("DIAMOND_BLOCK"); Ph_Keys.add("DIAMOND");
    Blocks.add("EMERALD_BLOCK"); Ph_Keys.add("EMERALD");
    return ph ? Ph_Keys : Blocks;
  },
  translateKey: function(key) {
    var ProcessedKey = key.trim().toLowerCase().split("_");
    var block = ProcessedKey.length == 2 && ProcessedKey[1] == "block";
    switch(ProcessedKey[0]) {
      case "coal": return block ? "&8Khối Than" : "&8Than";
      case "lapis": return block ? "&9Khối Lưu Ly" : "&9Ngọc Lưu Ly";
      case "redstone": return block ? "&4Khối Đá Đỏ" : "&4Đá Đỏ";
      case "iron": return block ? "&7Khối Sắt" : "&7Sắt";
      case "gold": return block ? "&6Khối Vàng" : "&6Vàng";
      case "diamond": return block ? "&bKhối Kim Cương" : "&bKim Cương";
      case "emerald": return block ? "&aKhối Lục Bảo" : "&aNgọc Lục Bảo";
      default: throw LanguageManager['invalidType'];
    }
  },
  assignKey: function(match, ph) {
    var block = this.blockKeys(false); var hopper = this.blockKeys(true);
    match = match.toUpperCase(); var index = -1;
    for(var j = 0; j < 7; j++) {
      if(block.get(j).startsWith(match)) {
        index = j; break;
      } else continue;
    }
    switch(index) {
      case -1: throw LanguageManager['invalidType'];
      default: return ph ? hopper.get(index) : block.get(index);
    }
  },
  setupDefaultFile: function(file) {
    var name = file.getName(); var endpoint = name.indexOf(".yml");
    var id = name.substring(0, endpoint);
    var OfflineInstance = Server.getOfflinePlayer(UUID.fromString(id));
    var configObject = YamlConfiguration.loadConfiguration(file);
    configObject.set("Owner", OfflineInstance.getName());
    configObject.set("Tier.Allow", false);
    configObject.set("Tier.Level", 0);
    configObject.set("Tier.EXP", 0);
    configObject.set("Tier.Limit", 0);
    configObject.set("Merchant.Enabled", false);
    for each(var BlockId in this.blockKeys(false))
      configObject.put("BlockData".concat(BlockId), 0);
    configObject.save(file); return file;
  },
  getCraftedAmount: function(ores, multiplier) {
    var BlockCount = Math.floor(ores / 9);
    var Remain = ores - Math.floor(BlockCount * 9);
    BlockCount = Math.floor(BlockCount * multiplier);
    return [BlockCount, Remain];
  }
}

function PreventUser(name, data, market, marketmanager, tierhandler) {
  this.userName = name;
  this.database = data;
  this.merchant = market;
  this.shopconfig = marketmanager;
  this.tierhandler = tierhandler;
  this.getUserName() = function() {
    return this.userName;
  }
  this.isOpenMerchant() = function() {
    return this.merchant;
  },
  this.getShopStatus() = function(key) {
    if(!this.merchant) return this.merchant;
    if(PreventCore.blockKeys(false).contains(key)) {
      return this.shopconfig.get(key);
    } else throw LanguageManager['invalidType'];
  },
  this.getAllowPrestige = function() {
    return this.tierhandler.get("Allowed");
  },
  this.getCurrentPrestige = function() {
    return this.tierhandler.get("Level");
  },
  this.getPrestigeEXP = function() {
    return this.tierhandler.get("EXP");
  },
  this.addPrestigeEXP = function(amount) {
    if(this.getCurrentPrestige() != this.getPrestigeLimit()) {
      if(isNaN(parseInt(amount)) && parseInt(amount) > 0) {
        var EXPNode = this.tierhandler.get("Level");
        this.tierhandler.put("Level", EXPNode + amount);
        }
      } else throw LanguageManager['invalidInt'];
    }
  }
  this.getPrestigeLimit = function() {
    return this.tierhandler.get("Limit");
  },
  this.getPrestigePrice = function(toLevel) {
    if(isNaN(Int(toLevel)) && Math.abs(Int(toLevel)) > 10)
      throw LanguageManager['invalidInt'];
    var FiboExp = new ArrayList();
    FiboExp.add(1); FiboExp.add(1);
    for(var x = 2; x < 11; x++)
      FiboExp.add((FiboExp.get(x-1) + FiboExp.get(x-2)));
    return Math.floor((FiboExp.get(toLevel) * this.getMultiplier(toLevel)) * 1000000);
  },
  this.getMultiplier = function(tier) {
    return Math.floor(1*10 + (tier)) / 10;
  }
  this.getBlockCount() = function(key) {
    if(this.database.keySet().contains(key)) {
      return PreventCore.formatNumber(this.database.get(key));
    } else throw LanguageManager['invalidType'];
  }
  this.setBlockCount() = function(key, value) {
    if(!this.database.keySet().contains(key))
      throw LanguageManager['invalidType'];
    else this.database.put(key, value);
  }
}

function main() {
  try {
    if(PreventHopper == null || Essentials == null || Vault == null) {
      throw LanguageManager['dependMissing'];
    }
    var HostFolder = new File(ScriptHost); if(!HostFolder.exists()) HostFolder.mkdir();
    // Economy setup - Type: EssentialsX Economy - Hooked with VaultAPI
    var VaultRegistrations = Services.getRegistrations(Vault); var EconomyHost = null;
    for each(var registeredInstance in VaultRegistrations) {
      var InstanceId = registeredInstance.class.getName();
      if(InstanceId.contains("Economy_Essentials")) {
        EconomyHost = registeredInstance; break;
      }
    }
    if(EconomyHost == null)
      throw LanguageManager['vaultError'];
    // Permission check - Only some processes are permission-limited
    var PreventBlockUser = null;
    switch(args[0].toLowerCase()) {
      case "compress":
      case "condense":
      case "withdraw":
      case "deposit":
      case "pay":
      case "send":
      case "towand":
      case "syncwand":
        if(!Player.hasPermission("pblock.use")) {
          Player.sendMessage(LanguageManager.getScriptMessage("noPermission"));
          return -1;
        } else {
          var DataOrigin = new File(ScriptHost + Player.getUniqueId().toString().concat(".yml"));
          var DataHash = new HashMap(); var ShopNode; var ShopHash = new HashMap(); var TierHash;
          // Oh god I hate data-mapping so much :( my hand hurts
          if(!DataOrigin.exists()) {
            ShopNode = false;
            for each(var BlockName in PreventCore.blockKeys(false))
              DataHash.put(BlockName, 0);
            TierHash.put("Allowed", false);
            TierHash.put("Level", 0);
            TierHash.put("Limit", 0);
          } else {
            var DataConfiguration = YamlConfiguration.loadConfiguration(DataOrigin);
            ShopNode = DataConfiguration.get("Merchant.Enabled"); var key = "BlockData.";
            if(ShopNode) {
              for each(var BlockName in PreventCore.blockKeys(false)) {
                var fullKey = "Merchant.".concat(BlockName);
                var value = DataConfiguration.contains(fullKey) ? DataConfiguration.get(fullKey) : false;
                ShopHash.put(BlockName, value);
              }
            }
            for each(var BlockName in PreventCore.blockKeys(false))
              DataHash.put(BlockName, DataConfiguration.get(key.concat(BlockName)));
            TierHash.put("Allowed", DataConfiguration.get("Tier.Allow"));
            TierHash.put("Level", DataConfiguration.get("Tier.Level"));
            TierHash.put("EXP", DataConfiguration.get("Tier.EXP"));
            TierHash.put("Limit", DataConfiguration.get("Tier.Limit"));
          }
          PreventBlockUser = new PreventUser(Player.getName(), DataHash, ShopNode, TierHash);
        }
      case "reset":
      case "give":
      case "add":
      case "remove":
      case "subtract":
        if(!Player.hasPermission("pblock.admin")) {
          Player.sendMessage(LanguageManager.getScriptMessage("noPermission")); return -1;
        }
    }
    if(PreventBlockUser == null)
      throw LanguageManager['invalidUserData'];
    // Main part of the code - where everything is executed...
    switch(args[0].toLowerCase()) {
      case "condense":
      case "compress":
        var PlayerUserData = Player.getMetadata("playerData").get(0).value();
        Player.sendMessage(LanguageManager.getScriptMessage("compressAllBeign"));
        if(args[1].toLowerCase() == "all") {
          for(var j = 0; j < 7; j++) {
            var PreventHopperKey = PreventCore.blockKeys(true).get(j);
            var BlockId = PreventCore.blockKeys(false).get(j);
            var StorageCount = PlayerUserData.getBlock(PreventHopperKey);
            var GeneratedBlocks; var RemainOres;
            var Process = Java.extend(Runnable, {
              run: function() {
                var CraftingGrid = PreventCore.getCraftedAmount(StorageCount,
                  PreventBlockUser.getMultiplier(PreventBlockUser.getCurrentPrestige()));
                GeneratedBlocks = CraftingGrid[0]; RemainOres = CraftingGrid[1];
                PlayerUserData.setBlock(PreventHopperKey, RemainOres);
                PreventBlockUser.setBlockCount(PreventBlockUser.getBlockCount() + GeneratedBlocks);
                PreventBlockUser.addPrestigeEXP(GeneratedBlocks);
              }
            });
            if(StorageCount > 9) {
              Scheduler.runTask(Host, new Process());
              BukkitPlayer.sendMessage(ChatColor[ColorParam]('&',
                "&f &f &f- " + LanguageManager['compressedSuccessful']
                .replace("%ores%", PreventCore.formatNumber(StorageCount))
                .replace("%type%", PreventCore.translateKey(PreventHopperKey))
                .replace("%product%", PreventCore.formatNumber(GeneratedBlocks))
                .replace("%block%", PreventCore.translateKey(BlockId))));
            }
            else {
              BukkitPlayer.sendMessage(ChatColor[ColorParam]('&',
              "&f &f &f- " + LanguageManager['notEnoughMinerals'].replace("%type%", PreventCore.translateKey(PreventCore))));
              continue;
            }
          }; return 1;
        } else if(PreventCore.shortcuts.indexOf(args[1].toLowerCase()) != -1) {
          var Input = args[2].toLowerCase();
          var HopperKey = PreventCore.assignKey(Input, true);
          var BlockKey = PreventCore.assignKey(Input, false);
          var PlayerUserData = Player.getMetadata("playerData").get(0).value();
          var Capacity = PlayerUserData.getBlock(HopperKey);
          if(Capacity < 9)
            Player.sendMessage(LanguageManager.getScriptMessage(
              "notEnoughMinerals").replace("%type%", PreventCore.translateKey(HopperKey)));
          else {
            var SingleTypeProcess = Java.extend(Runnable, {
              run: function() {
                var CraftingStats = PreventCore.getCraftedAmount(Capacity,
                  PreventBlockUser.getMultiplier(PreventBlockUser.getCurrentPrestige()));
                var BlockCount = CraftingStats[0]; var RemainingCount = CraftingStats[1];
                PlayerUserData.setBlock(HopperKey, RemainingCount);
                var BlockBalance = PreventBlockUser.getBlockCount(BlockKey);
                PreventBlockUser.setBlockCount(Math.floor(BlockBalance + BlockCount));
                PreventBlockUser.addPrestigeEXP(BlockCount);
                Player.sendMessage(LanguageManager.getScriptMessage(
                  "compressedSuccessful"
                ).replace("%ores%", PreventCore.formatNumber(Capacity))
                 .replace("%type%", PreventCore.translateKey(HopperKey))
                 .replace("%product%", PreventCore.formatNumber(BlockCount))
                 .replace("%block%", PreventCore.translateKey(BlockKey)));
              }
            }); Scheduler.runTask(Host, new SingleTypeProcess()); return 0;
          }
        } else throw LanguageManager['invalidType'];
      case "deposit":
        var BlockKey = PreventCore.assignKey(args[1].toLowerCase(), false);
        if(args[2].toLowerCase() != 'all' || isNaN(parseInt(args[2])) || parseInt(amount) < 1)
          throw LanguageManager['invalidInt'];
        else {
          var Balance = PreventBlockUser.getBlockCount(BlockKey); var IntegerNode;
          if(isNaN(parseInt(args[2].toLowerCase()))) IntegerNode = Balance;
          else IntegerNode = parseInt(args[2].toLowerCase());
          var Loadable = 0; var Positions = new ArrayList();
          for(var j = 0; j < 36; j++) {
            var Stack = Player.getInventory().getItem(j);
            if(Stack == null) continue;
            else if(Stack.getType().name() == BlockKey) {
              Loadable += Stack.getAmount();
              Positions.add(j);
            }
            else continue;
          }
          if(Loadable == 0) throw LanguageManager['notEnoughMinerals'];
          Loadable = Loadable > IntegerNode ? IntegerNode : Loadable;
          var Depository = Java.extend(Runnable, {
            run: function() {
              for each(var IntSlot in Positions)
                Player.getInventory().getItem(j).setAmount(0);
              PreventBlockUser.setBlockCount(Math.floor(Balance + Loadable));
              Player.sendMessage(LanguageManager.getScriptMessage("depositSuccessful")
                .replace("%amount%", PreventCore.formatNumber(Loadable))
                .replace("%type%", PreventCore.translateKey(BlockKey))
              );
            }
          }); Scheduler.runTask(Host, new Depository()); return 0;
        }
      case "withdraw":
        var BlockKey = PreventCore.assignKey(args[1].toLowerCase(), false);
        var Balance = PreventBlockUser.getBlockCount(BlockKey);
        var Pattern = /^\d{1,4}$/g; var MaxMap = new HashMap();
        for(var x = 0; x < 36; x++) {
          var Stack = Player.getInventory().getItem(x);
          if(Stack == null)
            MaxMap.put(x, 64);
          else if(Stack.getAmount() == 64)
            continue;
          else if(Stack.getType().name() == BlockKey) {
            MaxMap.put(x, 64 - Stack.getAmount());
          } else continue;
        }
        if(args[2].toLowerCase() == "all") {
          var ProcessFull = Java.extend(Runnable, {
            run: function() {
              var UserInventory = Player.getInventory(); var Loaded = 0;
              for each(var ValidLoad in MaxMap.keySet()) {
                var Max = MaxMap.get(ValidLoad); var Default = Max;
                if(Max >= Balance) {
                  Max = Balance; Balance = 0;
                } else Balance -= Max;
                var SlotCurrent = 64 - Default; var NewCount = SlotCurrent + Max;
                var StackInstance = new ItemStack(Material.getMaterial(BlockKey), NewCount);
                UserInventory.setItem(ValidLoad, StackInstance); Loaded += Max;
                if(Balance == 0) break;
              }
              PreventBlockUser.setBlockCount(BlockKey, Balance);
              Player.sendMessage(LanguageManager.getScriptMessage(
                "withdrawSuccessful")
                .replace("%amount%", PreventCore.formatNumber(Loaded))
                .replace("%type%", PreventCore.translateKey(BlockKey)));
            }
          }); Scheduler.runTask(Host, new ProcessFull()); return 1; 
        } else if(args[2].search(Pattern) != -1) {
          var ProcessPart = Java.extend(Runnable, {
            run: function() {
              var IntegerNode = parseInt(args[2]); var TotalLoaded = 0;
              var PlayerInv = Player.getInventory();
              if(IntegerNode > Balance)
                IntegerNode = Balance;
              for each(var ValidSlot in MaxMap.keySet()) {
                var MaxGive = MaxMap.get(ValidSlot); var OriginalVal = MaxGive;
                if(MaxGive >= IntegerNode) {
                  MaxGive = IntegerNode; IntegerNode = 0;
                } else IntegerNode -= MaxGive;
                var SlotSize = 64 - OriginalVal; var NewSize = SlotSize + MaxGive;
                var ReplaceStack = new ItemStack(Material.getMaterial(BlockKey), NewSize);
                PlayerInv.setItem(ValidSlot, ReplaceStack); TotalLoaded += MaxGive;
                if(IntegerNode == 0) break;
              }
              PreventBlockUser.setBlockCount(BlockKey, IntegerNode);
              Player.sendMessage(LanguageManager.getScriptMessage(
                "withdrawSuccessful")
              .replace("%amount%", PreventCore.formatNumber(TotalLoaded))
              .replace("%type%", PreventCore.translateKey(BlockKey)));
            }
          }); Scheduler.runTask(Host, new ProcessPart()); return 0;
        } else throw LanguageManager['invalidAction'];
    }
  } catch(err) {
    return LanguageManager.prefix + err.name;
  } finally {
    var PlayerFile = new File(ScriptHost + Player.getUniqueId().toString().concat(".yml"));
    if(!PlayerFile.exists()) PlayerFile = PreventCore.setupDefaultFile(PlayerFile);
    var SavedConfiguration = YamlConfiguration.loadConfiguration(PlayerFile);
    SavedConfiguration.set("Owner", Player.getName());
    SavedConfiguration.set("Tier.Allow", PreventBlockUser.getAllowPrestige());
    SavedConfiguration.set("Tier.Level", PreventBlockUser.getCurrentPrestige());
    SavedConfiguration.set("Tier.EXP", PreventBlockUser.getEXP());
    SavedConfiguration.set("Tier.Limit", PreventBlockUser.getPrestigeLimit());
    SavedConfiguration.set("Merchant.Enabled", PreventBlockUser.isOpenMerchant());
    var MerchantKey = "Merchant."; var StorageKey = "BlockData.";
    for each(var BlockName in PreventCore.blockKeys(false)) {
      SavedConfiguration.set(StorageKey.concat(BlockName), PreventBlockUser.getBlockCount(BlockName));
      if(PreventBlockUser.isOpenMerchant())
        SavedConfiguration.set(MerchantKey.concat(BlockName), PreventBlockUser.getShopStatus(BlockName));
    }; SavedConfiguration.save(PlayerFile);
  }
}
// Execute core
main();
