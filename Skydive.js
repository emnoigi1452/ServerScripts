var Executor = BukkitPlayer;
var Server = BukkitServer;
var Manager = Server.getPluginManager();
var Scheduler = Server.getScheduler();
var Console = Server.getConsoleSender();
var Host = Manager.getPlugin("PlaceholderAPI");
var MyItems = Manager.getPlugin("MyItems");

var ChatColor = org.bukkit.ChatColor;
var Code = 'translateAlternateColorCodes';
var Location = org.bukkit.Location;
var Attribute = org.bukkit.attribute.Attribute;
var Vector = org.bukkit.util.Vector;
var Particle = org.bukkit.Particle;
var PotionEffectType = org.bukkit.potion.PotionEffectType;
var PotionEffect = org.bukkit.potion.PotionEffect;

var ArrayList = Java.type("java.util.ArrayList");
var JavaLong = Java.type("java.lang.Long");
var JavaInteger = Java.type("java.lang.Integer");
var Runnable = Java.type("java.lang.Runnable");

function main() {
  try {
    if(MyItems == null) throw Language.getError('noMyItems');
    if(Handler.handlePvPCheck(Executor)) {
      var Radius = Math.floor(Executor.getHealth() / 10) + 1;
      /* ---------- Collect players which maybe affected ---------- */
      var Matches = new ArrayList();
      Server.getOnlinePlayers().stream().filer(function(user) {
        return Handler.handlePvPCheck(user) && Handler.handleDistanceCheck(Radius, user);
      }).forEach(function(match) { Matches.add(match); });
      /* ---------------------------------------------------------- */
      function ScheduleAttack(targets, delay) {
        var Task = Java.extend(Runnable, {
          run: function() {
            targets.stream().forEach(function(handle) {
              if(Handler.handlePvPCheck(handle)) return;
              handle.sendMessage(Language.getPlayerMessage("targetNoise"));
              var X = handle.getLocation().getBlockX(); var Z = handle.getLocation().getBlockZ();
              for(var j = 256; j >= 0; j--)
                handle.getWorld().spawnParticle(Particle.REDSTONE, new Location(X, j, Z), 5);
              var Wither = new PotionEffect(PotionEffectType.WITHER, 300, 5);
              var Blind = new PotionEffect(PotioEffectType.BLINDNESS, 300, 5);
              var Force = Handler.handleDamageCalculation(handle);
              Wither.apply(handle); Blind.apply(handle);
              handle.setVelocity(new Vector(0, 3, 0));
              if(Force >= handle.getHealth()) {
                handle.sendMessage(Language.getPlayerMessage("deathNoise"));
                var MaxContain = handle.getMaxHealth();
                handle.setHealth(0); MaxContain += Executor.getMaxHealth();
                Executor.setMaxHealth(MaxContain);
              }
            });
          }
        }); Scheduler.runTaskLater(Host, new Task(), new JavaLong((20*delay).toString()));
      }
      if(Matches.size() >= 2) {
        var Shocks = Math.floor(Executor.getAttribute(Attribute.GENERIC_MOVEMENT_SPEED).getBaseValue() / 0.2) + 1;
        (new PotionEffect(PotionEffectType.DAMAGE_RESISTANCE, Shocks*60, 3)).apply(Executor);
        Executor.setVelocity(new Vector(0, 1, 0)); Executor.sendMessage(Language.getPlayerMessage("beginSkill"))
        for(var Schedule = 0; Schedule < Shocks; Schedule++) {
          var Count = Math.floor(Math.random() * 5) + 2;
          var Selection = new ArrayList();
          for(var x = 0; x < Count; x++) {
            var Max = true; var Content = null;
            Matches.stream().forEach(function(node) { if(!Selection.contains(node)) Max = false; });
            if(Max) break;
            else {
              while(true) {
                var Index = Math.floor(Math.random() * Matches.size());
                var Element = Matches.get(Index);
                if(!Selection.contains(Element)) { Content = Element; break; }
              }
              Selection.add(Content);
            }
          }
          ScheduleAttack(Selection, parseInt(50*Schedule));
        }
      } else Executor.sendMessage(Language.getPlayerError(""))
    } else Executor.sendMessage(Language.getPlayerError("notInPvP"));
    return -1;
  } catch(err) {
    return "&bSkydive &8&l| &f" + err;
  }
}


/*
 * Handler: Random functions, i'd throw it here for fun uwu
 */

var Handler = {
  /*
   * Performs a colorize process on the given text
   * We all know what this does already
   */
  handleColor: function(input) { return ChatColor[Code]('&', input); },
  /*
   * Performs a check on the current region that the target's in
   * Input: Target - The player to perform the check on
   * Output:
   *   - True: Target is in a valid PvP region
   *   - False: Target is not in a valid PvP region
   */
  handlePvPCheck: function(Target) {
    var PlayerClasses = ['org.bukkit.craftbukkit.v1_12_R1.entity.CraftPlayer', 'org.bukkit.entity.Player']
    this.handleClassCheck(PlayerClasses, Target);
    var ProcessCode = "worldguard_region_has_flag_pvp";
    return PlaceholderAPI.static.setPlaceholders(Target,
       "%$f%".replace("$f", ProcessCode)) == "yes";
  },
  /*
   * Performs a class check to match function param requirements
   *   - Groups - Array of valid class names (String)
   *   - Inst - Object to perform said check
   * If the function can't match the object to any class, throws an error.
   */
  handleClassCheck: function(Groups, Inst) {
    var Result = Groups.indexOf(Inst.class.getName()) != -1;
    if(!Result) throw Language.getError('invalidObject');
    return;
  },
  /*
   * Performs a distance check, relative to the executor
   * This function selects all locations on x,z that's within the perimeter
   * Altitude is ignored, so moving up high or down below also counts
   * Output:
   *  - True: Target is within the affected area
   *  - False: The opposite of the above
   */
   handleDistanceCheck: function(Perimeter, Target) {
     if(Target.getWorld().getName() != Executor.getWorld().getName())
       return false;
     var TargetLocation = Target.getLocation(); var Point = Executor.getLocation();
     var Ground = [TargetLocation.getBlockX(), TargetLocation.getBlockZ()];
     var Found = false;
     for(var y = 0; y < 257 && !Found; ++y) {
       var Markdown = new Location(Ground[0], y, Ground[1]);
       if(Markdown.distance(Point) <= Perimeter)
        Found = true;
     }
     return Found;
   },
   /*
    * Performs a damage calculation, based on the target's defense and the current attack force
    * Output: Integer - (Rounded value of the skill's force)
    */
   handleDamageCalculation: function(Target) {
     // Setting up...
     var StatsManager = MyItems.getPlayerManager().getPlayerItemStatsManager();
     function getProcessedValue(Base, Increment) return Math.floor(Base * 1+(Increment/100));
     var ExecutorStats = StatsManager.getItemStatsWeapon(Executor);
     var TargetStats = StatsManager.getItemStatsArmor(Target);
     /* ------------------------------------------------------------------- */
     var AverageDamage = Math.floor((ExecutorStats.getTotalDamageMin()+ExecutorStats.getTotalDamageMax())/2);
     var BaseForce = getProcessedValue(AverageDamage, ExecutorStats.getTotalPvPDamage());
     var BaseDefense = getProcessedValue(TargetStats.getTotalDefense(), TargetStats.getTotalPvEDefense());
     /* ------------------------------------------------------------------- */
     if(BaseForce < BaseDefense) return (new JavaInteger('1'));
     /* ------------------------------------------------------------------- */
     BaseForce = Math.floor((BaseForce - BaseDefense) * 0.35);
     BaseForce = BaseForce < 1 ? 1 : BaseForce;
     if(Target.getFireTicks() > 0) BaseForce *= 1.4;
     return Math.floor(BaseForce);
   }

}

var Language = {
  prefix: '&bSkydive &8&l| &f',
  // Just read the name
  getError: function(key) {
    if(Object.keys(this).indexOf(key) == -1)
      key = 'invalidCode';
    return Handler.handleColor("&cLỗi:".concat(this[key]));
  },
  getPlayerError: function() {
    if(Object.keys(this).indexOf(key) == -1)
      key = 'invalidCode';
    return Handler.handleColor(this.prefix + "&cLỗi:".concat(this[key]));
  },
  getPlayerMessage: function() {
    if(Object.keys(this).indexOf(key) == -1)
      key = 'invalidCode';
    return Handler.handleColor(this.prefix + this[key]);
  },
  noMyItems: '&fMáy chủ đang thiếu &aMyItems&f! Không thể dùng skill &c:(',
  invalidObject: '&fLoại dữ liệu không hợp lệ!',
  notInPvP: '&fBạn phải ở trong vùng được phép &cPvP &fđể dùng skill!',
  notEnoughEntity: '&f&oKhông thể triển khai phép, quá ít mục tiêu...',
  beginSkill: '&f&oNgọn gió từ phía bên kia đường chân trời, hãy cho ta nghe thấy ngươi...',
  targetNoise: '&f&oCơn gió mang theo những linh hồn đã tan biến từ lâu...',
  deathNoise: '&f&oĐược chọn để theo đuổi đến bầu trời xanh kia...',
}

/*
 * Executes the main function
 */
main();
