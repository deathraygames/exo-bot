RocketBoots.loadComponents([
	"Game",
	"Coords",
	"ImageBank",
	"StateMachine",
	//"data_delivery",
	"Dice",
	"Loop",
	//"entity",
	"Stage",
	"World",
	"Incrementer",
	"Stage",
	"Storage",
	"SoundBank",
	"Notifier",
	"Walkthrough",
	"Keyboard",
	"Physics"
]).ready(function(){

	const 
		ORE_DEPOSITS	= 50,
		PLANET_RADIUS 	= 400,
		MOON_RADIUS		= (PLANET_RADIUS/10),
		ORBIT_RADIUS	= (PLANET_RADIUS * 1.75),
		LOOP_DELAY 		= 100,   	// 10 = 1/100th of a second (better than 60 fps)
		RENDER_DELAY 	= 100, 		// ms
		TWO_PI			= Math.PI * 2,
		BOT_BODY_MODES  = ["drive", "drill"],
		STARTING_PARTS	= 50,
		BUILDING_HEIGHT = 50,
		BUILDING_WIDTH 	= 70,
		BUILDING_SCAN 	= BUILDING_WIDTH,
		ORE_SCAN 		= PLANET_RADIUS
	;

	//==== GAME

	var g = window.g = new RocketBoots.Game({
		name: "Exo-bot",
		instantiateComponents: [
			{"state": "StateMachine"},
			{"loop": "Loop"},
			{"incrementer": "Incrementer"},
			{"dice": "Dice"},
			{"images": "ImageBank"},
			{"sounds": "SoundBank"},
			{"notifier": "Notifier"},
			{"storage": "Storage"},
			{"walkthrough": "Walkthrough"},
			{"world": "World"},
			{"stage": "Stage"},
			{"keyboard": "Keyboard"},
			{"physics": "Physics"}
		],
		version: "v0.1-ld38"
	});

	g.data = window.data; // from exo-bot-data.js
	g.bot = new RocketBoots.Entity({
		name: "Exo-bot",
		size: {x: 17, y: 10},
		pos: {x: 0, y: (PLANET_RADIUS * 1.1)},
		color: "#ccccdd",
		bodyMode: "drive",
		targetOreDeposit: null,
		targetBuilding: null,
		draw: drawBot,
		energy: 100
	});
	g.planet = new RocketBoots.Entity({
		name: "Small World",
		radius: PLANET_RADIUS,
		color: "#553322",
		isImmovable: true,
		draw: "circle",
		pollution: 0
	});
	g.moon = new RocketBoots.Entity({
		name: "Mun",
		radius: MOON_RADIUS,
		pos: {x: ORBIT_RADIUS, y: 0},
		color: "#443020",
		draw: "circle"
	});

	g.oreDeposits = [];
	g.logs = ["...", "...", "...", "...", "..."];

	g.$inventoryList = $('.inventory > dl');

	//==== States

	g.state.addStates({
		"preload": {
			start: function(){
				setup();
				//g.images.load(imageMap, function(){
				//});
				g.state.transition("intro");
			}
		},
		"intro": {
			start: function() {
				$('.help, .log, .inventory').addClass('closed');
				$('.location, .mask').removeClass('closed');
				log('Initializing Exo-bot...');
				log('Waking up systems from hibernation...');
				log('Destination: Exo-Planet-' + g.dice.getRandomIntegerBetween(999,999999) + '...');
				log('Landing...');
				log('Begin mission: Prepare planet for colonization.');
				var t = window.setTimeout(function(){
					g.state.transition("game");
				}, 100);
			}, end: function(){
				$('.location, .mask').addClass('closed');
			}
		},
		"menu": {
			start: function () {
				$('.title').removeClass('closed');
				$('.credits, .mask').removeClass('closed');
				// g.state.transition("game"); // go straight to the game; TODO: change this later
				g.keyboard.setup({
					keyDownActions: {
						"ENTER": gotoGame,
						"ESC": 	gotoGame
					}
				});
			}, end: function(){
				$('.title').addClass('closed');
				$('.credits, .mask').addClass('closed');
			}
		},
		"game": {
			start: function () {
				g.keyboard.setup({
					wasd: true,
					keyDownActions: {
						"TAB": function(){
							g.state.transition("build");
						},
						"SPACE": jump,
						"LEFT": moveLeft,
						"RIGHT": moveRight,
						"DOWN": toggleBotBodyMode,
						"ESC": 	function gotoMenu () {
							g.state.transition("menu");
						},
						"x": function(){
							$('.help').toggleClass('closed');
						}
					}
				});

				$('.help, .location, .log, .inventory').removeClass('closed');
				$('.title, .mask').addClass('closed');
				g.loop.start();
			}, end: function () {
				$('.help, .location, .log, .inventory').addClass('closed');
				g.loop.stop();
			}
		},
		"build": {
			start: function(){
				g.keyboard.setup({
					wasd: true,
					keyDownActions: {
						"1": function(){ buildByNumber(1); gotoGame(); },
						"2": function(){ buildByNumber(2); gotoGame(); },
						"3": function(){ buildByNumber(3); gotoGame(); },
						"4": function(){ buildByNumber(4); gotoGame(); },
						"5": function(){ buildByNumber(5); gotoGame(); },
						"6": function(){ buildByNumber(6); gotoGame(); },
						"7": function(){ buildByNumber(7); gotoGame(); },
						"8": function(){ buildByNumber(8); gotoGame(); },
						"9": function(){ buildByNumber(9); gotoGame(); },
						"TAB": gotoGame,
						"ESC": 	 gotoGame
					}
				});
				renderBuild();
				$('.build, .mask').removeClass('closed');
				$('.inventory').removeClass('closed');
			},
			end: function(){
				$('.inventory').addClass('closed');
				$('.build, .mask').addClass('closed');
			}
		}
	});

	// Start it up
	g.state.transition("preload");


	//==== Hoisted Functions

	function gotoGame () {
		g.state.transition("game");
	}

	function quickLoop (iteration) {
		//g.incrementer.incrementByElapsedTime(undefined, true);
		//g.incrementer.calculate();

		//var onePlotAngle = (Math.PI * 2) / TOTAL_PLOTS;
		//g.stage.camera.pos.theta -= onePlotAngle/100;
		//g.stage.camera.rotation += onePlotAngle/100;
		g.moon.vel.theta = g.moon.pos.theta ;
		g.physics.apply(g.world);
		fixRotation(g.bot);
		g.moon.pos.r = ORBIT_RADIUS;
		g.stage.draw();
		drill();
		scanNearby();
	}

	function setup () {
		var layer;
		// The "world" acts as the grid for all the entities; can think of it as
		// the physical universe; centered (0,0) on the planet
		g.world.name = "Exo-bot Known Galaxy";
		g.world.isBounded = true;
		g.world.setSizeRange(
			{x: (-2 * PLANET_RADIUS), y: (-2 * PLANET_RADIUS)}, 
			{x: (2 * PLANET_RADIUS), y: (2 * PLANET_RADIUS)}
		);
		g.world.addEntityGroups(["planets", "buildings", "enemies", "bot", "ore"]);

		g.world.putIn(g.planet, ["planets", "physics", "physical"]);
		g.world.putIn(g.moon, ["planets", "physics", "physical"]);
		g.world.putIn(g.bot, ["bot", "physics", "physical"]);

		layer = g.stage.addLayer("planet"); 
		// g.stage.connectToEntity(g.world); // Not useful 
		//g.stage.camera.set({x: 0, y: PLANET_RADIUS/2}).focus();
		g.stage.camera.follow(g.bot);
		g.stage.resize();

		// Connect all world entities to the layer
		layer.connectEntities(g.world.entities.all);

		// Loop
		g.loop.set(quickLoop, LOOP_DELAY).addAction(renderDisplay, RENDER_DELAY);

		// Setup Physics
		g.physics.isObjectGravityOn = true;
		g.gravitationalConstant = 0.01;

		// Setup bot's inventory
		g.bot.inventory = {};
		populateInventory(g.bot.inventory);
		g.bot.inventory["metal parts"] = STARTING_PARTS;

		// Setup planet's ore deposits
		setupOreDeposits();
	}

	function populateInventory (invObj) {
		_.each(g.data.ores, function(oreType){
			invObj[oreType.key] = 0;
		});
		_.each(g.data.items, function(itemType){
			invObj[itemType.key] = 0;
		});
		return invObj;
	}

	function log (m) {
		g.logs.push(m);
		if (g.logs.length > 5) {
			g.logs.shift();
		}
		renderLog();
		console.log(m);
	}

	function setupOreDeposits() {
		var n = ORE_DEPOSITS;
		g.oreDeposits = [];

		while (n--) {
			let type = _.sample(g.data.ores);
			let dep = new RocketBoots.Entity({
				radius: g.dice.getRandomIntegerBetween(1, 20),
				color: type.color,
				oreType: type
			});
			let r = g.dice.getRandomIntegerBetween(1, (PLANET_RADIUS - dep.radius));
			let theta = Math.random() * TWO_PI;
			dep.pos.setByPolarCoords(r, theta);
			dep.draw = "circle"; // TODO: make this a custom function

			g.world.putIn(dep, ["ore"]);

			g.oreDeposits.push(dep);
		}
	}

	function renderDisplay () {
		renderInventory();
		renderLocation();
	}

	function renderLocation() {
		h = '';
		if (g.planet.pollution > 0) {
			h += '<div><dt>Pollution</dt><dd>' + g.planet.pollution + '</dd></div>';
		}
		$('.planet-list').html(h);

		h = '';
		if (g.bot.targetBuilding !== null) {
			let bt =  g.bot.targetBuilding.buildingType;
			h += (
				'<div class="building-name">' + bt.key + '</div>'
				+ '<div><dt>Uses</dt><dd>' + _.flatMap(bt.uses) + '</dd></div>'
				+ '<div><dt>Produces</dt><dd>' + _.flatMap(bt.produces) + '</dd></div>'
			);
			_.each(g.bot.targetBuilding.inventory, function(resourceAmount, resourceKey){
				if (resourceAmount > 0) {
					h += '<div><dt>' + resourceKey + '</dt><dd>' + resourceAmount + '</dd></div>';
				}
			});
		}
		$('.building-list').html(h);
	}

	function renderLog() {
		var h = '';
		_.each(g.logs, function(log){
			h += '<li>' + log + '</li>';
		});
		h += '<li></li>';
		$('.log ol').html(h);
	}

	function renderInventory () {
		var h = '';
		_.each(g.bot.inventory, function(quantity, key){
			if (quantity > 0) {
				h += (
					'<div>'
						+ '<dt>' + key + '</dt><dd>' + quantity + '</dd>'
					+ '</div>'
				);
			}
		});
		g.$inventoryList.html(h);
	}

	function renderBuild () {
		var h = '';
		_.each(g.data.buildingsOrder, function(buildingKey, buildingIndex){
			var building = g.data.buildings[buildingKey];
			var canAfford = canAffordBuilding(buildingKey);
			h += '<div' + (canAfford ? '' : ' class="cannotAfford"') + '>'
				+ '<dt class="num">' + (buildingIndex+1) + '</dt>'
				+ '<dt class="name">' + buildingKey + '</dt>'
				+ '<dd><dl class="cost">';
			_.each(building.cost, function(amount, key){
				h += '<div><dt>' + key + '</dt><dd>' + amount + '</dd></div>';
			});
			h += '</dl></dd>'
				+ '</div>';
		});
		$('.build > dl').html(h);
	}

	function drawBot (ctx, entStageCoords, entStageCoordsOffset, entStageSize, layer, ent) {
		ctx.fillStyle = ent.color; // '#ffff66';
		ctx.fillRect(entStageCoordsOffset.x, entStageCoordsOffset.y, 
					entStageSize.x, entStageSize.y);
		if (ent.targetOreDeposit !== null) {
			// TODO: Fix
			/*
			let target = g.stage.getStageCoords(ent.targetOreDeposit.pos);
			ctx.save();
			ctx.strokeStyle = "rgba(100,255,255,0.3)";
			ctx.moveTo(entStageCoords.x, entStageCoords.y);
			ctx.lineTo(target.x, target.y);
			ctx.lineWidth = 1;
			ctx.closePath();
			ctx.stroke();
			ctx.restore();
			*/
		}
	}



	//===== BOT ACTIONS

	function scanNearby () {
		var bot = g.bot;
		var minDistance = Infinity;
		bot.targetBuilding = null;
		_.each(g.world.entities.buildings, function(building){
			let d = building.pos.getDistance(bot.pos);
			if (d < BUILDING_SCAN && d < minDistance) {
				bot.targetBuilding = building;
				minDistance = d;
			}
		});
		return minDistance;
	}

	function fixRotation (ent) {
		ent.rotation = (ent.pos.theta - (Math.PI/2)) * -1;
	}

	function moveLeft () {
		move(1);
	}
	function moveRight () {
		move(-1);
	}
	function move (n) {
		if (g.bot.bodyMode !== "drive") {
			return false;
		}
		if (Math.abs(g.bot.pos.r - PLANET_RADIUS) < 420) {
			// TODO: fix this
			//g.bot.acc.r = g.bot.acc.r + 2;
			//console.log(g.bot.vel, g.bot.vel.theta, "new theta = ", g.bot.vel.theta + (0.01 * n));
			//g.bot.acc.theta = g.bot.acc.theta + (100 * n);
			//console.log(g.bot.vel);
			g.bot.pos.theta = g.bot.pos.theta + (0.015 * n);
			//console.log("Move", n);
		} else {
			//console.warn("Too far to drive");
		}
	}

	function jump () {
		if (g.bot.bodyMode !== "drive") {
			return false;
		}
		console.log("Jump");
		g.bot.force.r = 3000;
	}

	function drill () {
		var bot = g.bot;
		if (bot.bodyMode !== "drill") {
			return false;
		}
		if (bot.targetOreDeposit === null) {
			return false;
		}
		if (bot.targetOreDeposit.radius <= 0) {
			return false;
		}
		bot.targetOreDeposit.radius -= 0.1;
		bot.inventory[bot.targetOreDeposit.oreType.key] += 1;
		console.log("Drilling...", bot.targetOreDeposit.oreType.key);
		if (bot.targetOreDeposit.radius <= 0) {
			bot.targetOreDeposit.radius = 0;
		}
	}

	function toggleBotBodyMode () {
		var bot = g.bot;
		// Get new index
		var i = BOT_BODY_MODES.indexOf(bot.bodyMode);
		i++;
		if (i > (BOT_BODY_MODES.length - 1)) { i = 0; }
		switchBotBodyMode(BOT_BODY_MODES[i])
	}

	function switchBotBodyMode (m) {
		var bot = g.bot;
		var minDistance = Infinity;
		bot.bodyMode = m;
		// Now do stuff
		log("Mode: " + bot.bodyMode);
		bot.targetOreDeposit = null;
		if (bot.bodyMode === "drill") {
			_.each(g.oreDeposits, function(dep){
				var d = dep.pos.getDistance(bot.pos);
				if (d < minDistance && dep.radius > 0) {
					minDistance = d;
					bot.targetOreDeposit = dep;
				}
			});
		}
	}

	function removeFromInventory (costs) {
		_.each(costs, function(amount, costKey){
			g.bot.inventory[costKey] -= amount;
			if (g.bot.inventory[costKey] < 0) {
				g.bot.inventory[costKey] = 0;
			}
		});
	}

	function canAffordBuilding (buildingKey) {
		var buildingType = g.data.buildings[buildingKey];
		var canAfford = true;
		_.each(buildingType.cost, function(amount, costKey){
			if (g.bot.inventory[costKey] < amount) {
				canAfford = false;
			}
		});
		return canAfford;
	}

	function buildByNumber (n) {
		var buldingIndex = n - 1;
		var buildingKey;
		if (buldingIndex < 0 || buldingIndex > (g.data.buildingsOrder.length - 1)) {
			return false;
		}
		buildingKey = g.data.buildingsOrder[buldingIndex];
		createBuilding(buildingKey);
	}

	function createBuilding (buildingKey) {
		var bot = g.bot;
		var buildingType = g.data.buildings[buildingKey];
		var building;
		var r;
		if (!canAffordBuilding(buildingKey)) {
			log("Insufficient resources to build " + buildingKey);
			return false;
		}
		removeFromInventory(buildingType.cost);
		
		// TODO: Check for nearby buildings

		building = new RocketBoots.Entity({
			name: (buildingKey + " Building-" + RocketBoots.getUniqueId()),
			size: {x: BUILDING_WIDTH, y: BUILDING_HEIGHT},
			isMovable: true,
			color: "#666",
			buildingType: 	buildingType,
			health: 		buildingType.maxHealth,
			maxHealth: 		buildingType.maxHealth,
			inventory: 		{}
		});
		populateInventory(building.inventory);
		r = PLANET_RADIUS + (BUILDING_HEIGHT/2);
		building.pos.setByPolarCoords(r, bot.pos.theta);
		fixRotation(building);
		g.world.putIn(building, ["buildings"], true);
	}

}).init();
