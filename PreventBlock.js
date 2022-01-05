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
var System = Java.type("java.lang.System");
var UUID = Java.type("java.util.UUID");

var LanguageManager = {
  prefix: "&bBlock &8&l| &f",
  getScriptMessage: function(key) {
    return ChatColor[ColorParam]('&', (this.prefix + this[key]));
  },
  invalidType: "&cLỗi: &fLoại khoáng sản không hợp lệ!",
  invalidAction: "&cLỗi: &fLệnh phụ không hợp lệ! Hãy kiểm tra lại code!",
  invalidPlayer: "&cLỗi: &fNgười chơi không tồn tại! Vui lòng thử lại!",
  invalidTarget: "&cLỗi: &fNgười chơi không được phép dùng tính năng!",
  invalidData: "&cLỗi: &fDữ liệu nhập vào không hợp lệ!",
  invalidWandBlock: "&cLỗi: &fChỉ có thể đổi &fSắt, &6Vàng&f, &bKim cương&f, &aLục Bảo",
  noPermission: "&cLỗi: &fBạn không có quyền dùng!",
  dependMissing: "&cLỗi: &fMáy chủ không có đủ phần mềm để triển khai!",
  vaultError: "&cLỗi: &fKhông thể kết nối với hệ thống Vault!",
  invalidUserData: "&cLỗi: &fDữ liệu của người chơi không tải thành công!",
  invalidInt: "&cLỗi: &fSố nguyên dương không hợp lệ!",
  notEnoughMinerals: "&cLỗi: &fBạn không có đủ %type% &ftrong kho",
  compressedSuccessful: "&fĐã nén thành công &a%ores% %type% &fthành &a%product% %block%&f!",
  compressAllBegin: "&aGhi chú: &f&oBắt đầu nén tất cả khoáng sản trong kho...",
  depositSuccessful: "&fĐã gửi thành công &a%amount% %type% &fvào kho!",
  withdrawSuccessful: "&fĐã rút thành công &a%amount% %type% &ftừ kho!",
  staffLoadedAll: "&fQuản trị viên đã tăng tất cả loại khoáng sản trong kho bạn thêm &a%amount%&f!",
  staffLoaded: "&fBạn đã nhận được &a%amount% %type% &ftừ một quản trị viên &b:)",
  staffRemoveAll: "&cQuản trị viên đã rút &a%amount% &ftừ tất cả các khoáng sản trong kho của bạn!",
  staffRemove: "&fQuản trị viên đã rút &a%amount% %type% &ftừ kho của bạn!",
  modificationSuccess: "&fChỉnh sửa dữ liệu của &a%player% &fthành công&f!",
  confirmReset: "&fVui lòng bấm lại lệnh để tiến hành reset!",
  databaseReset: "&fDữ liệu kho của bạn đã bị quét sạch bởi quản trị viên!",
  resetComplete: "&fĐã hoàn tất quá trình quét sạch dữ liệu!",
  syncComplete: "&fĐã chuyển đổi &a%amount% %type% &fsang kho đũa ma thuật!",
  sendComplete: "&fĐã gửi cho &e%target% &a%amount% %type%&f!",
  sendReceive: "&fĐã nhận được &a%amount% %type% &ftừ &e%send%",
  sellComplete: "&fĐã bán &a%amount% %type%&f. Bạn nhận được &a$%money%&f!",
  helpDisplay: "&fĐang hiển thị bảng trợ giúp cho &bPreventBlock&f!"
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

function PreventUser(name, data, market, marketmanager, tierhandler, shards) {
  this.userName = name;
  this.database = data;
  this.merchant = market;
  this.shopconfig = marketmanager;
  this.tierhandler = tierhandler;
  this.shards = shards;
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
  this.getBlockCount = function(key) {
    if(this.database.keySet().contains(key)) {
      return PreventCore.formatNumber(this.database.get(key));
    } else throw LanguageManager['invalidType'];
  }
  this.setBlockCount = function(key, value) {
    if(!this.database.keySet().contains(key))
      throw LanguageManager['invalidType'];
    else this.database.put(key, value);
  }
  this.getShards = function() {
    return this.shards;
  }
  this.setShards = function(amount) {
    if(isNaN(parseInt(amount)))
      throw LanguageManager['invalidInt'];
    else this.shards = Math.abs(amount);
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
          var DataHash = new HashMap(); var ShopNode; var ShopHash = new HashMap(); var TierHash; var Shards = 0;
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
            Shards = DataConfiguration.get("Tier.Shards");
          }
          PreventBlockUser = new PreventUser(Player.getName(), DataHash, ShopNode, TierHash, Shards);
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
      // Help manual because some staffs can't read the source code
      // Expected to be implemented to MyCommands
      case "help":
        var BoolCheck = function(param) {
          switch(param.toLowerCase()) {
            case "true": return true;
            case "false": return false;
            default: throw LanguageManager['invalidData'];
          }; return false;
        }
        var HelpAdmin = BoolCheck(args[1].toLowerCase());
        var Message = LanguageManager.getScriptMessage("helpDisplay").concat("\n");
        if(HelpAdmin) {
          Message += "&f&o- Gửi khoáng sản cho người chơi:\n"
          Message += "&f &f /pb give/add &a<Người chơi> <Khoáng sản/All> <Số lượng>\n"
          Message += "&f&o- Thu khoáng sản của người chơi:\n"
          Message += "&f &f /pb remove/subtract &a<Người chơi> <Khoáng sản/All> <Số lượng>\n"
          Message += "&f&o- Reset toàn bộ dữ liệu người chơi:\n"
          Message += "&f &f /pb reset &7&o(Yêu cầu xác nhận)\n"
          Message += "&f&m &m &m &m &m &m &m &m &m &m &M &m &m &m &m &m &m &m &m &m &m &m &m &m &m"
        } else {
          Message += "&f&o- Tiến hành nén khoáng sản thành khối:\n"
          Message += "&f &f /pb condense &a<Khoáng sản>\n"
          Message += "&f&o- Gửi khối khoáng sản vào kho chứa:\n"
          Message += "&f &f /pb deposit &a<Khoáng sản> <Số lượng/All>\n"
          Message += "&f&o- Rút khối khoáng sản từ kho chứa:\n"
          Message += "&f &f /pb withdraw &a<Khoáng sản> <Số lượng/All>\n"
          Message += "&f&o- Gửi khối khoáng sản cho người chơi khác:\n"
          Message += "&f &f /pb pay/send &a<Khoáng sản> <Số lượng>\n"
          Message += "&f&o- Chuyển tất cả khối khoáng sản sang đũa ma thuật:\n"
          Message += "&f &f /pb syncwand/towand &a<Khoáng sản>\n"
          Message += "&f&o- Bán khoáng sản trong kho chứa khối:\n"
          Message += "&f &f /pb sell &a<Khoáng sản> <Số lượng/All>\n"
          Message += "\n&f &c&oLưu ý: &f&oĐể xem lệnh quản trị viên, hãy dùng &b&o/pb admin"
          Message += "&f&m &m &m &m &m &m &m &m &m &m &M &m &m &m &m &m &m &m &m &m &m &m &m &m &m"
        }
        Player.sendMessage(ChatColor[ColorParam]('&', Message)); return 0;
      case "condense":
      case "compress":
        var PlayerUserData = Player.getMetadata("playerData").get(0).value(); var Rolls = 0;
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
                Rolls += Math.floor(GeneratedBlocks / 64);
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
          }
          if(Rolls > 0) {
            var Bonus = Math.floor(Math.pow(PreventBlockUser.getCurrentPrestige(), 2));
            var ObtainedShards = 0;
            var Randomization = Java.extend(Runnable, {
              run: function() {
                // Shards: A special item required to prestige in PreventBlock
                // Obtained by: Compressing blocks
                // Drop rate: 0.01%
                for(var x = 0; x < Math.floor((Rolls + Bonus) / PreventBlockUser.getMultiplier()); x++) {
                  var I1 = Math.floor(Math.random() * 100) + 1;
                  var I2 = Math.floor(Math.random() * 100) + 1;
                  if(I1 == I2) ObtainedShards += 1;
                  var BitRand = Math.floor(Math.random() * 200) + 1;
                  if((I1 << 1) == BitRand || (I2 << 1) == BitRand) ObtainedShard *= 10;
                }
                var ShardBalance = PreventBlockUser.getShards();
                PreventBlockUser.setShards(Math.floor(ShardBalance + ObtainedShards));
              }
            }); Scheduler.runTask(Host, new Randomization());
          } return 1;
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
        } else throw LanguageManager['invalidType']; return 0;
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
          if(Loadable == 0) {
            Player.sendMessage(LanguageManager.getScriptMessage("notEnoughMinerals").replace("%type%", PreventCore.translateKey(BlockKey)));
            return -1;
          }
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
        if(Balance < 1) {
          Player.sendMessage(LanguageManager.getScriptMessage("notEnoughMinerals").replace("%type%", PreventCore.translateKey(BlockKey)));
          return -1;
        }
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
      case "give":
      case "add":
        if(args.length != 3) throw LanguageManager['invalidAction'];
        var User = Server.getOfflinePlayer(args[1]); var IntegerPattern = /^\d{1,10}$/g;
        var HandleAll = args[2].toLowerCase() == "all";
        if(!User.hasPlayedBefore()) {
          Player.sendMessage(LanguageManager.getScriptMessage("invalidPlayer")); return -1; }
        if(!User.hasPermission("pblock.use")) {
          Player.sendMessage(LanguageManager.getScriptMessage("invalidTarget")); return -1; }
        if(args[2].search(IntegerPattern) == -1) {
          Player.sendMessage(LanguageManager.getScriptMessage("invalidInt")); return -1; }
        var IntegerAllow = parseInt(args[3]);
        var UserDatabase = new File(ScriptHost + User.getUniqueId().toString().concat(".yml"));
        var TargetConfiguration = YamlConfiguration.loadConfiguration(UserDatabase);
        if(HandleAll) {
          var ModAllTask = Java.extend(Runnable, {
            run: function() {
              for each(var ModType in PreventCore.blockKeys(false)) {
                var AccessKey = "BlockData".concat(ModType);
                var Current = TargetConfiguration.get(AccessKey);
                TargetConfiguration.set(AccessKey, Current + IntegerAllow);
              }; TargetConfiguration.save(UserDatabase);
              if(!User.isOnline())
                User.sendMessage(LanguageManager.getScriptMessage("staffLoadedAll")
                .replace("%amount%", PreventCore.formatNumber(IntegerAllow)));
              Player.sendMessage(LanguageManager.getScriptMessage("modificationSuccess")
              .replace("%player%", User.getName()));
            }
          }); Scheduler.runTask(Host, new ModAllTask()); return 0;
        } else {
          var AccessId = PreventCore.assignKey(args[2].toLowerCase(), true);
          var SingleModTask = Java.extend(Runnable, {
            run: function() {
              var DatabaseAccess = "BlockData".concat(AccessId);
              var CurrentVal = TargetConfiguration.get(DatabaseAccess);
              TargetConfiguration.set(DatabaseAccess, CurrentVal + IntegerAllow);
              if(!User.isOnline())
                User.sendMessage(LanguageManager.getScriptMessage("staffLoaded")
                .replace("%amount%", PreventCore.formatNumber(IntegerAllow))
                .replace("%type%", PreventCore.translateKey(BlockKey)));
              Player.sendMessage(LanguageManager.getScriptMessage("modificationSuccess").replace("%player%", User.getName()));
            }
          }); Scheduler.runTask(Host, new SingleModTask()); return 0;
        }
      case "remove":
      case "subtract":
        if(args.length == 3) throw LanguageManager['invalidAction'];
        var Target = Server.getOfflinePlayer(args[1]); var Pattern = /^\d{1,10}$/g;
        var All = args[2].toLowerCase() == "all";
        if(!User.hasPlayedBefore()) {
          Player.sendMessage(LanguageManager.getScriptMessage("invalidPlayer")); return -1; }
        if(!User.hasPermission("pblock.use")) {
          Player.sendMessage(LanguageManager.getScriptMessage("invalidTarget")); return -1; }
        if(args[3].search(Pattern) == -1) {
          Player.sendMessage(LanguageManager.getScriptMessage("invalidInt")); return -1; }
        var RemoveNode = parseInt(args[3]); var DefaultRoll = RemoveNode;
        var TargetDatabase = new File(ScriptHost + Target.getUniqueId().toString().concat(".yml"));
        var TargetConfig = YamlConfiguration.loadConfiguration(TargetDatabase);
        if(All) {
          var SubAllTask = Java.extend(Runnable, {
            run: function() {
              for each(var MaterialKey in PreventCore.blockKeys(false)) {
                var AccessBlockKey = "BlockData".concat(MaterialKey);
                var Balance = TargetConfig.get(AccessBlockKey);
                if(Balance <= RemoveNode) RemoveNode = Balance;
                TargetConfig.set(AccessBlockKey, Balance - RemoveNode);
                RemoveNode = DefaultRoll;
              }
              TargetConfig.save(TargetDatabase);
              if(!Target.isOnline())
                Target.sendMessage(LanguageManager.getScriptMessage("staffRemoveAll")
                .replace("%amount%", PreventCore.formatNumber(DefaultRoll)));
              Player.sendMessage(LanguageManager.getScriptMessage("modificationSuccess").replace("%player%", Target.getName()));
            }
          }); Scheduler.runTask(Host, new SubAllTask()); return 0;
        } else {
          var AssignedKey = PreventCore.assignKey(args[2].toLowerCase(), false);
          var SubTypeTask = Java.extend(Runnable, {
            run: function() {
              var DatabaseKey = "BlockData.".concat(AssignedKey);
              var Balance = TargetConfig.get(DatabaseKey);
              if(Balance <= RemoveNode) RemoveNode = Balance;
              TargetConfig.set(DatabaseKey, Balance - RemoveNode); TargetConfig.save(TargetDatabase);
              if(!Target.isOnline())
                Target.sendMessage(LanguageManager.getScriptMessage("staffRemove")
                .replace("%amount%", PreventCore.formatNumber(RemoveNode)))
                .replace("%type%", PreventCore.translateKey(AssignedKey));
              Player.sendMessage(LanguageManager.getScriptMessage("modificationSuccess").replace("%player%", Target.getName()));
            }
          }); Scheduler.runTask(Host, new SubTypeTask()); return 1;
        }
      case "reset":
        var SetupResetConfirm = Java.extend(Runnable, {
          run: function() {
            var TimeOutLimit = 30; // Free to edit, counted by (seconds)
            var CurrentTime = System.currentTimeMillis();
            var Expired = CurrentTime + Math.floor(TimeOutLimit * 1000);
            var ResetData = new FixedMetadataValue(Host, Expired);
            Player.setMetadata("ResetTimeOut", ResetData);
          }
        }); var Present = System.currentTimeMillis();
        if(!Player.hasMetadata("ResetTimeOut") || Present > Player.getMetadata("ResetTimeOut").get(0).value()) {
          Scheduler.runTask(Host, new SetupResetConfirm());
          Player.sendMessage(LanguageManager.getScriptMessage("confirmReset"));
          return 0;
        } else {
          Player.removeMetadata("ResetTimeOut", Host);
          var ResetTask = Java.extend(Runnable, {
            run: function() {
              for each(var DataFiles in ScriptHost.listFiles()) {
                if(!DataFiles.isDirectory()) {
                  var DataConfig = YamlConfiguration.loadConfiguration(DataFiles);
                  var Owner = Server.getOfflinePlayer(DataConfig.get("Owner"));
                  for each(var BlockParam in PreventCore.blockKeys(false)) {
                    DataConfig.set("BlockData".concat(BlockParam), 0);
                  }; DataConfig.set("Merchant.Enabled", false); DataConfig.save(DataFiles);
                  if(!Owner.isOnline())
                    Owner.sendMessage(LanguageManager.getScriptMessage("databaseReset"));
                } else continue;
              }
              Player.sendMessage(LanguageManager.getScriptMessage("resetComplete"));
            }
          }); Scheduler.runTask(Host, new ResetTask()); return 0;
        }
      case "towand":
      case "syncwand":
        var SuperiorCore = Host.getDataFolder().getAbsolutePath() + "\\javascripts\\superior.js";
        if(!SuperiorCore.exists())
          throw LanguageManager['dependMissing'];
        if(!Player.hasPermission("superiorwand.universal")) {
          Player.sendMessage(LanguageManager.getScriptMessage("noPermission")); return -1; }
        var TypeName = args[1].toLowerCase();
        if(['iron', 'gold', 'diamond', 'emerald'].indexOf(TypeName) == -1) {
          Player.sendMessage(LanguageManager.getScriptMessage("invalidWandBlock")); return -1; }
        else {
          var SyncTask = Java.extend(Runnable, {
            run: function() {
              var Balance = PreventBlockUser.getBlockCount(PreventCore.assignKey(TypeName, false));
              var Syntax = "javascript_superior_add," + TypeName + "," + Balance.toString();
              PlaceholderAPI.static.setPlaceholders(Player, "%" + Syntax + "%");
              PreventBlockUser.setBlockCount(PreventCore.assignKey(TypeName, false), 0);
              Player.sendMessage(LanguageManager.getScriptMessage("syncComplete")
              .replace("%amount%", PreventCore.formatNumber(Balance))
              .replace("%type%", PreventCore.translateKey(PreventCore.assignKey(TypeName, false))));
            }
          }); Scheduler.runTask(Host, new SyncTask()); return 0;
        }
      case "pay":
      case "send":
        var Target = Server.getOfflinePlayer(args[1]);
        if(!Target.hasPlayedBefore()) {
          Player.sendMessage(LanguageManager.getScriptMessage("invalidPlayer")); return -1; }
        if(!Target.hasPermission("pblock.use")) {
          Player.sendMessage(LanguageManager.getScriptMessage("invalidTarget")); return -1; }
        var Key = PreventCore.assignKey(args[2].toLowerCase(), false);
        if(args[3].toLowerCase().search(/^\d{1,10}$/g) == -1) {
          Player.sendMessage(LanguageManager.getScriptMessage("invalidInt")); return -1; }
        var SendAmount = parseInt(args[3]); var Balance = PreventBlockUser.getBlockCount(Key);
        if(SendAmount > Balance) {
          Player.sendMessage(LanguageManager.getScriptMessage("notEnoughMinerals").replace("%type%", PreventCore.translateKey(Key)));
        } else {
          var TargetFile = new File(ScriptHost, Target.getUniqueId().toString().concat(".yml"));
          if(!TargetFile.exists()) TargetFile = PreventCore.setupDefaultFile(TargetFile);
          var TargetConfig = YamlConfiguration.loadConfiguration(TargetFile);
          var Root = "BlockData".concat(Key); var Count = TargetConfig.get(Root);
          TargetConfig.set(Root, Count + SendAmount); TargetConfig.save(TargetFile);
          PreventBlockUser.setBlockCount(Key, Balance - SendAmount);
          Player.sendMessage(LanguageManager.getScriptMessage("sendComplete")
          .replace("%target%", Target.getName())
          .replace("%amount%", PreventCore.formatNumber(SendAmount))
          .replace("%type%", PreventCore.translateKey(Key)));
          if(Target.isOnline())
            Target.sendMessage(LanguageManager.getScriptMessage("sendReceive")
            .replace("%send%", Player.getName())
            .replace("%amount%", PreventCore.formatNumber(SendAmount))
            .replace("%type%", PreventCore.translateKey(Key)));
        }; return 0;
      case "sell":
        var DataKey = PreventCore.assignKey(args[1].toLowerCase(), false);
        var All = args[2].toLowerCase() == "all";
        if(!All && args[2].search(/^\d{1,9}$/g) == -1) {
          Player.sendMessage(LanguageManager.getScriptMessage("invalidInt")); return -1; }
        var Balance = PreventBlockUser.getBlockCount(DataKey);
        var SellCount = All ? Balance : parseInt(args[2]);
        if(SellCount > Balance) SellCount = Balance;
        var PriceBoard = {
          COAL_BLOCK: 76.5,
          LAPIS_BLOCK: 85.5,
          REDSTONE_BLOCK: 85.5,
          IRON_BLOCK: 108,
          GOLD_BLOCK: 112.5,
          DIAMOND_BLOCK: 135,
          EMERALD_BLOCK: 180
        }
        var SellTask = Java.extend(Runnable, {
          run: function() {
            var Receive = SellCount * PriceBoard[DataKey];
            EconomyHost.depositPlayer(Player.getName(), Receive);
            PreventBlockUser.setBlockCount(DataKey, Balance - SellCount);
            Player.sendMessage(LanguageManager.getScriptMessage("sellComplete")
            .replace("%amount%", PreventCore.formatNumber(SellCount))
            .replace("%type%", PreventCore.translateKey(DataKey))
            .replace("%money%", PreventCore.formatNumber(Receive)));
          }
        }); Scheduler.runTask(Host, new SellTask()); return 0;
      case "up-prestige":
        // Set up a system to obtain 'Shards', which are used to prestige in PreventBlock
        break;
    }
  } catch(err) {
    return LanguageManager.prefix + err.name;
  } finally {
    var DataSaveEvent = Java.extend(Runnable, {
      run: function() {
        var PlayerFile = new File(ScriptHost + Player.getUniqueId().toString().concat(".yml"));
        if(!PlayerFile.exists()) PlayerFile = PreventCore.setupDefaultFile(PlayerFile);
        var SavedConfiguration = YamlConfiguration.loadConfiguration(PlayerFile);
        SavedConfiguration.set("Owner", Player.getName());
        SavedConfiguration.set("Tier.Allow", PreventBlockUser.getAllowPrestige());
        SavedConfiguration.set("Tier.Level", PreventBlockUser.getCurrentPrestige());
        SavedConfiguration.set("Tier.EXP", PreventBlockUser.getEXP());
        SavedConfiguration.set("Tier.Limit", PreventBlockUser.getPrestigeLimit());
        SavedConfiguration.set("Tier.Shards", PreventBlockUser.getShards());
        SavedConfiguration.set("Merchant.Enabled", PreventBlockUser.isOpenMerchant());
        var MerchantKey = "Merchant."; var StorageKey = "BlockData.";
        for each(var BlockName in PreventCore.blockKeys(false)) {
          SavedConfiguration.set(StorageKey.concat(BlockName), PreventBlockUser.getBlockCount(BlockName));
          if(PreventBlockUser.isOpenMerchant())
            SavedConfiguration.set(MerchantKey.concat(BlockName), PreventBlockUser.getShopStatus(BlockName));
        }; SavedConfiguration.save(PlayerFile);
      }
    }); Scheduler.runTask(Host, new DataSaveEvent());
  }
}
// Execute core
main();
