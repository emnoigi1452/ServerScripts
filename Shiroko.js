/* Implementation for 'Shiroko' (Blue Archive character) to Minecraft
   Ah, fu- ...why did I agree to do this aaaaaaaaa

  - Author: StellarSeal (DucTrader)
  - Requested by: LuckyDaCheater (bruhh)
  - Language: JavaScript /w NashornAPI
  - Host plugin: PlaceholderAPI v2.10.9
  (Apparently she's a cat, like how the fuck am I supposed to know)
 */
var Executor = BukkitPlayer;
var World = Executor.getWorld();
var Server = BukkitServer;
var Scheduler = Server.getScheduler();
var Manager = Server.getPluginManager();
var Host = Manager.getPlugin("PlaceholderAPI");
var MyItems = Manager.getPlugin("MyItems");

var ChatColor = org.bukkit.ChatColor;
var Color = 'translateAlternateColorCodes';
var Location = org.bukkit.Location;
var FixedMetadataValue = org.bukkit.metadata.FixedMetadataValue;
var PotionEffectType = org.bukkit.potion.PotionEffectType;
var Attribute = org.bukkit.Attribute;
var Statistic = org.bukkit.Statistic;
var BukkitRunnable = org.bukkit.schedule.BukkitRunnable;

var ArrayList = new Java.type("java.util.ArrayList");
var HashMap = new Java.type("java.util.HashMap");
var Runnable = new Java.type("java.lang.Runnable");

var SkillManager = {
  baseNormal: [193,203,213,251,261,271,309,319,329,368];
  baseEX: [400,460,580,640,760];
  checkPvPRegion: function(player) {
    if(player.getWorld().getName() != "world")
    var Region = "worldguard_region_name";
    var Name = PlaceholderAPI.static.setPlaceholders(player, "%" + Region + "%");
    return Name.toLowerCase() == "pvp";
  },
  retrievePvPMembers: function() {
    var onlinePlayers = Server.getOnlinePlayers();
    var filtered = new ArrayList();
    onlinePlayers.stream().filter(function(element) {
      return !element.equals(Executor) && checkPvPRegion(element);
    }).forEach(function(element) {
      filtered.add(element);
    }); return filtered;
  },
  getAffectedRadius: function(caster) {
    var Base = caster.getAttribute(Attribute.GENERIC_ATTACK_SPEED).getBaseValue();
    Base = Base == 0 ? Base + 0.5 : Base * 0.8;
    return Math.round(Math.sqrt(Base * caster.getHealth())) + 1;
  },
}

function main() {
  try {
    if(MyItems == null)
      throw "&fKhông có đủ plugin để dùng script!";
    var validPvPPlayers = SkillManager.retrievePvPMembers();
    var StatsControl = MyItems.getPlayerManager().getPlayerItemStatsManager();
    var HandControl = MyItems.getGameManager().getStatsManager();
    switch(args[0].toLowerCase()) {
      case "normal":
        var WeaponStats = HandControl.getLoreStatsWeapon(Executor.getInventory().getItemInMainHand());
        var BaseSet = WeaponStats.getDamage() * ((WeaponStats.getPvPDamage() + WeaponStats.getPvEDamage()) / 100);
        var Async = new FixedMetadataValue(Host, 
          baseNormal.length > validPvPPlayers.size() ? validPvPPlayers.size(), baseNormal.size);
        Executor.setMetadata("Shiroko_Normal", parseInt(Async));
        var ShirokoTask = Java.extend(Runnable, {
          run: function() {
            var Counter = Executor.getMetadata("Shiroko_Normal").get(0).value();
            if(Counter == 0) 
              this.cancel();
            else {
              var Random = Math.floor(Math.random() * validPvPPlayers.size()) + 1;
              var MidObject = validPvPPlayers.get(Random - 1);
              validPvPPlayers.stream().filter(function(user) {
                if(!user.equals(Executor)) {
                  var x = user.getLocation().getBlockX();
                  var z = user.getLocation().getBlockZ();
                  for(var y = 1; y < 257; y++) {
                    var Point = new Location(x,y,z);
                    var Radii = SkillManager.getAffectedRadius(Executor);
                    if(Point.distance(MidPoint.getLocation()) <= Radii)
                      return true;
                  }
                }
                return false;
              }).forEach(function(match) {
                var Select = SkillManager.baseNormal[Math.floor(Math.random() * SkillManager.baseNormal.length)];
                // Compute attack force after facing the defense stats
                var Defense = StatsControl.getItemStatsArmor(match); BaseSet *= (1 + (Select/100));
                BaseSet = Math.floor((BaseSet * Math.abs(1 - (Defense.getTotalBlockRate() / 100))) - Defense.getTotalDefense());
                match.damage(BaseSet); Executor.setMaxHealth(Executor.getMaxHealth() + BaseSet);
                Executor.setHealth(Executor.getMaxHealth());
                Executor.setMetadata("Shiroko_Normal", new FixedMetadataValue(Host, Counter-1));
              });
            }
          } 
        }); Scheduler.runTaskTimer(Host, new ShirokoTask(), 5, 25*20);
    }
  } catch(err) {
    return "&bShiroko &8&l| &cLỗi: &f" + err.message;
  }
}
