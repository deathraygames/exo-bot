RocketBoots.loadComponents([
	"Game",
	"Coords",
	"ImageBank",
	"StateMachine",
	"Dice",
	"Loop",
	"Stage",
	"World",
	"Stage",
	"Storage",
	"SoundBank",
	"Keyboard",
	"Physics"
]).ready(function(){

	const 
		DEBUG 				= true, //false,
		ORE_DEPOSITS		= 50,
		PLANET_RADIUS 		= 400,
		BOT_HEIGHT			= 32,
		BOT_WIDTH			= 32,
		MOON_RADIUS			= (PLANET_RADIUS/10),
		ORBIT_RADIUS		= (PLANET_RADIUS * 1.75),
		LOOP_DELAY 			= 100,   	// 10 = 1/100th of a second (better than 60 fps)
		RENDER_DELAY 		= 500, 		// ms
		ACTION_DELAY		= 400, 		// ms
		BUILDING_PROCESS_DELAY 	= 1000, //ms
		TWO_PI				= Math.PI * 2,
		BOT_BODY_MODES  	= ["drive", "drill", "fly"],
		STARTING_PARTS		= 50,
		STARTING_Y			= (DEBUG ? PLANET_RADIUS : PLANET_RADIUS * 3),
		BUILDING_HEIGHT 	= 80, // 40
		BUILDING_WIDTH 		= 80, // 40
		BUILDING_R_OFFSET	= 0,
		BUILDING_SCAN 		= BUILDING_WIDTH,
		ORE_SCAN_RANGE		= PLANET_RADIUS/2,
		LOAD_AMOUNT					= 10,
		BOT_MAX_RESOURCE			= 500,
		BUILDING_MAX_RESOURCE 		= 1000,
		BASE_DRILL_AMOUNT			= 40, //4,
		RADIUS_LOSS_PER_DRILL		= 0.1,
		DRILL_DISTANCE_THRESHOLD 	= PLANET_RADIUS / 10,
		DRILL_DISTANCE_MAX			= PLANET_RADIUS,
		DIG_RATE 					= 2,
		UNDIG_RATE					= DIG_RATE,
		WAIT_1						= (DEBUG ? 0 : 1000),
		WAIT_2						= (DEBUG ? 0 : 3000)
	;

	//==== GAME

	var g = window.g = new RocketBoots.Game({
		name: "Exo-bot",
		instantiateComponents: [
			{"state": "StateMachine"},
			{"loop": "Loop"},
			{"dice": "Dice"},
			{"images": "ImageBank"},
			{"sounds": "SoundBank"},
			{"storage": "Storage"},
			{"world": "World"},
			{"stage": "Stage"},
			{"keyboard": "Keyboard"},
			{"physics": "Physics"}
		],
		version: "v0.2.2"
	});

	g.data = window.data; // from exo-bot-data.js
	g.bot = new RocketBoots.Entity({
		name: "Exo-bot",
		size: {x: BOT_WIDTH, y: BOT_HEIGHT},
		pos: {x: 0, y: STARTING_Y},
		color: "#ccccdd",
		bodyMode: "drive",
		targetOreDeposit: null,
		targetBuilding: null,
		draw: drawBot,
		drillPos: {x: 0, y: STARTING_Y},
		energy: 100,
		deep: 0
	});
	g.planet = new RocketBoots.Entity({
		name: "Small World",
		radius: PLANET_RADIUS,
		color: "#553322",
		isImmovable: true,
		draw: drawPlanet,
		pollution: 0,
		atmosphere: 0,
		signal: 0
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
				var imageMap = {
					"bot_drive": "bot/bot_32.png",
					"bot_drill": "bot/bot_drill_32.png"
				};
				_.forEach(g.data.buildings, function(building, buildingKey){
					imageMap[buildingKey] = "buildings/" + building.image + ".png";
				});

				setup();
				$('.version').html(g.version);
				g.images.load(imageMap, function(){
					g.bot.image = g.images.get("bot_drive");
					g.state.transition("intro");
				});
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
					$('.log').removeClass('closed');
					var t2 = window.setTimeout(function(){
						g.state.transition("game");
					}, WAIT_2);
				}, WAIT_1);
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
						"SPACE": function(){
							toggleBotBodyMode();
						},
						"j": 		jump,
						"LEFT": 	botLeft,
						"RIGHT": 	botRight,
						"DOWN": 	botDown,
						"UP": 		botUp,
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
		},
		"win": {
			start: function(){
				$('.win, .mask').removeClass('closed');
			}, end: function(){
				$('.win, .mask').addClass('closed');
			}
		}
	});

	// Start it up
	g.state.transition("preload");


	g.cheat = function () {
		g.bot.inventory["carbon"] += 1000;
		g.bot.inventory["silicon"] += 1000;
		g.bot.inventory["gold"] += 1000;
		g.bot.inventory["metal parts"] += 1000;
		g.bot.inventory["energon"] += 1000;
		g.bot.inventory["electronics"] += 1000;
		g.bot.inventory["solar cells"] += 1000;
	};


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
		g.bot.drillPos = getDrillPosition();

		fixRotation(g.bot);
		g.moon.pos.r = ORBIT_RADIUS;
		g.stage.draw();
		drawSpecialEffects();
		scanNearby();

		// Check for win // TODO: move somewhere else
		if (g.planet.signal > 100 && g.planet.atmosphere > 100 && g.planet.atmosphere > g.planet.pollution) {
			g.state.transition("win");
		}
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
		g.loop.set(quickLoop, LOOP_DELAY)
			.addAction(renderDisplay, RENDER_DELAY)
			.addAction(botAction, ACTION_DELAY)
			.addAction(buildingProcessing, BUILDING_PROCESS_DELAY);

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
		invObj["signal"] = 0;
		invObj["atmosphere"] = 0;
		invObj["pollution"] = 0;
		return invObj;
	}

	function log (m, ignoreDups) {
		// Do we already have that message?
		if (ignoreDups && g.logs[g.logs.length - 1] === m) {
			return;
		}
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
			let minR = Math.round(2 * type.depositMultiplier);
			let maxR = Math.round(20 * type.depositMultiplier);
			let dep = new RocketBoots.Entity({
				radius: g.dice.getRandomIntegerBetween(minR, maxR),
				color: type.color,
				oreType: type
			});
			let r = g.dice.getRandomIntegerBetween(Math.round(PLANET_RADIUS/20), (PLANET_RADIUS - dep.radius));
			let theta = Math.random() * TWO_PI;
			dep.pos.setByPolarCoords(r, theta);
			dep.draw = drawOre;

			g.world.putIn(dep, ["ore"]);

			g.oreDeposits.push(dep);
		}
	}



	//==== RENDER AND DRAW

	function renderDisplay () {
		renderInventory();
		renderLocation();
	}

	function renderLocation() {
		h = '';
		if (g.planet.pollution > 0) {
			h += '<div><dt>Pollution</dt><dd>' + Math.floor(g.planet.pollution) + '</dd></div>';
		}
		if (g.planet.atmosphere > 0) {
			h += '<div><dt>Atmosphere</dt><dd>' + Math.floor(g.planet.atmosphere) + '</dd></div>';
		}
		if (g.planet.signal > 0) {
			h += '<div><dt>Signal</dt><dd>' + Math.floor(g.planet.signal) + '</dd></div>';
		}
		$('.planet-list').html(h);

		h = '';
		if (g.bot.targetBuilding !== null) {
			let bt =  g.bot.targetBuilding.buildingType;
			h += (
				'<div class="building-name">' + bt.key + '</div>'
				+ '<div class="building-uses"><dt>Uses</dt><dd>' + _.keys(bt.uses).join(', ') + '</dd></div>'
				+ '<div class="building-produces"><dt>Produces</dt><dd>' + _.keys(bt.produces).join(', ') + '</dd></div>'
			);
			_.each(g.bot.targetBuilding.inventory, function(resourceAmount, resourceKey){
				if (resourceAmount > 0) {
					h += '<div><dt>' + resourceKey + '</dt><dd>' + Math.floor(resourceAmount) + '</dd></div>';
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
						+ '<dt>' + key + '</dt><dd>' + Math.floor(quantity) + '</dd>'
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

	function drawOre (ctx, entStageCoords, entStageCoordsOffset, entStageSize, layer, ent) {
		ent.isHighlighted = (g.bot.targetOreDeposit === ent);
		ctx.save();
		ctx.beginPath();
		if (ent.pos.getDistance(g.bot.drillPos) <= ORE_SCAN_RANGE) {
			ctx.fillStyle = ent.color;
			ctx.strokeStyle = ent.color;
		} else {
			ctx.fillStyle = "rgba(50,50,50,0.4)";
			ctx.strokeStyle = "rgba(255,255,255,0.05)";
		}
		if (ent.isHighlighted) {
			ctx.strokeStyle = "rgba(0,0,0,0.4)";
			ctx.lineWidth = 4;
		}
		ctx.arc(entStageCoords.x, entStageCoords.y, ent.radius, 0, TWO_PI);
		ctx.closePath();
		ctx.fill();
		ctx.stroke();
		ctx.restore();
	}

	function drawBot (ctx, entStageCoords, entStageCoordsOffset, entStageSize, layer, ent) {
		if (ent.bodyMode === "drill") {
			let wobbleX = g.dice.getRandomAround(2);
			let wobbleY = g.dice.getRandomAround(2);

			ctx.drawImage( g.images.get("bot_drill"),
				entStageCoordsOffset.x + wobbleX, 
				entStageCoordsOffset.y + wobbleY + g.bot.deep,
				entStageSize.x, entStageSize.y);

		} else {
			ctx.drawImage( ent.image,
				entStageCoordsOffset.x, entStageCoordsOffset.y,
				entStageSize.x, entStageSize.y);			
		}
	}

	function drawPlanet (ctx, entStageCoords, entStageCoordsOffset, entStageSize, layer, ent) {
		ctx.save();
		ctx.beginPath();
		ctx.fillStyle = ent.color;
		ctx.arc(entStageCoords.x, entStageCoords.y, ent.radius, 0, TWO_PI);
		ctx.closePath();
		ctx.fill();
		ctx.stroke();

		if (g.bot.deep > 0) {
			ctx.beginPath();
			ctx.fillStyle = "rgba(0,0,0," + (g.bot.deep/PLANET_RADIUS) + ")";
			ctx.arc(entStageCoords.x, entStageCoords.y, (ent.radius * 0.92), 0, TWO_PI);
			ctx.closePath();
			ctx.fill();
		}
		ctx.restore();		
	}

	function drawSpecialEffects () {
		var ctx = g.stage.layers[0].ctx;
		var botPos = g.stage.getStageCoords(g.bot.pos);
		var planetPos = g.stage.getStageCoords(g.planet.pos);
		ctx.save();
		/*
		ctx.stroke();
		ctx.strokeStyle = "rgba(100,255,255,0.3)";
		ctx.moveTo(botPos.x, botPos.y);
		ctx.lineTo(planetPos.x, planetPos.y);
		ctx.lineWidth = 1;
		ctx.closePath();
		ctx.stroke();
		*/

		if (g.bot.targetOreDeposit !== null) {
			let drill = g.stage.getStageCoords(g.bot.drillPos);
			let target = g.stage.getStageCoords(g.bot.targetOreDeposit.pos);
			ctx.strokeStyle = "rgba(0,0,0,0.1)";
			ctx.moveTo(drill.x, drill.y);
			ctx.lineTo(target.x, target.y);
			ctx.lineWidth = 2;
			ctx.closePath();
			ctx.stroke();
		}

		ctx.restore();	
	}



	//===== BOT ACTIONS ====== MOVEMENT

	function botDown () {
		if (g.bot.bodyMode === "fly") {
			jet({x: 0, y: -1});
		} else if (g.bot.bodyMode === "drive") {
			if (hasTargetBuilding()) {
				unloadFromBuilding(g.bot.targetBuilding);
			} else {
				switchBotBodyMode("drill");
			}
		} else if (g.bot.bodyMode === "drill") {
			dig();
		}
	}

	function botUp () {
		if (g.bot.bodyMode === "fly") {
			jet({x: 0, y: 1});
		} else if (g.bot.bodyMode === "drive") {		
			if (hasTargetBuilding()) {
				loadIntoBuilding(g.bot.targetBuilding);
			} else {
				//jump();
			}
		} else if (g.bot.bodyMode === "drill") {
			if (g.bot.deep > 0) {
				undig();
			} else {
				switchBotBodyMode("drive");
			}
		}
	}

	function botLeft () {
		if (g.bot.bodyMode === "fly") {
			jet({x: -1, y: 0});
		} else if (g.bot.bodyMode === "drive") {
			moveLeft();
		} else if (g.bot.bodyMode === "drill") {
			
		}
	}

	function botRight () {
		if (g.bot.bodyMode === "fly") {
			jet({x: 1, y: 0});
		} else if (g.bot.bodyMode === "drive") {
			moveRight();
		} else if (g.bot.bodyMode === "drill") {
			
		}
	}

	function dig () {
		var bot = g.bot;
		bot.deep += (DIG_RATE * ((PLANET_RADIUS - bot.deep)/PLANET_RADIUS));
		if (bot.deep > PLANET_RADIUS) {
			bot.deep = PLANET_RADIUS;
		}
	}

	function undig () {
		var bot = g.bot;
		bot.deep -= UNDIG_RATE;		
		if (bot.deep < 0) {
			bot.deep = 0;
		}
	}

	function moveLeft () {		move(1);	}
	function moveRight () {		move(-1);	}
	function move (n) {
		var forceAmount = 4000 * n;
		var boost;
		if (g.bot.bodyMode !== "drive") {
			return false;
		}
		if (Math.abs(g.bot.pos.r - PLANET_RADIUS - (BOT_HEIGHT/2)) > 6) {
			return false;
		}
		boost = g.bot.pos.getUnitVectorTangent(g.planet.pos);
		boost.multiply(forceAmount);
		g.bot.force.add(boost);
	}

	function jump () {
		if (g.bot.bodyMode !== "drive") {
			return false;
		}
		log("Jump!");
		g.bot.force.r += 30000;
	}

	function jet (dir) {
		var forceAmount = 10000;
		var boost = (new RocketBoots.Coords(dir)).multiply(forceAmount);
		g.bot.force.add(boost);

	}



	//===== BOT ACTIONS ====== 

	function scanNearby () {
		var bot = g.bot;
		var minDistance = BUILDING_SCAN;
		bot.targetBuilding = null;
		_.each(g.world.entities.buildings, function(building){
			let d = building.pos.getDistance(bot.pos);
			if (d < minDistance) {
				bot.targetBuilding = building;
				minDistance = d;
			}
		});
		minDistance = ORE_SCAN_RANGE;
		bot.targetOreDeposit = null;
		if (bot.bodyMode === "drill") {
			_.each(g.oreDeposits, function(dep){
				var d = dep.pos.getDistance(bot.drillPos);
				if (d < minDistance && dep.radius > 0) {
					minDistance = d;
					bot.targetOreDeposit = dep;
				}
			});
		}
		return minDistance;
	}

	function hasTargetBuilding () {
		return (g.bot.targetBuilding !== null);
	}

	function fixRotation (ent) {
		ent.rotation = (ent.pos.theta - (Math.PI/2)) * -1;
	}

	function botAction () {
		drill();
	}

	function drill () {
		var bot = g.bot;
		var drillAmount = BASE_DRILL_AMOUNT;
		var freeSpace = BOT_MAX_RESOURCE;
		var distance = 0;
		var drillAmountMultiplier = 1;
		if (bot.bodyMode !== "drill") {
			return false;
		}
		if (bot.targetOreDeposit === null) {
			return false;
		}
		if (bot.targetOreDeposit.radius <= 0) {
			log("Depleted " + bot.targetOreDeposit.oreType.key + ".", true);
			return false;
		}

		drillAmountMultiplier = getDrillMultiplier();
		drillAmount *= drillAmountMultiplier;

		freeSpace -= bot.inventory[bot.targetOreDeposit.oreType.key];
		drillAmount = Math.min(drillAmount, freeSpace);
		bot.targetOreDeposit.radius -= drillAmount * RADIUS_LOSS_PER_DRILL;
		bot.inventory[bot.targetOreDeposit.oreType.key] += drillAmount;

		log("Drilling " + bot.targetOreDeposit.oreType.key + "..."
			+ " speed: x" + drillAmountMultiplier + ", amount: +" + drillAmount, true);
		if (bot.targetOreDeposit.radius <= 0) {
			bot.targetOreDeposit.radius = 0;
		}
	}

	function getDrillPosition () {
		var bot = g.bot;
		var drillPos = bot.pos.getUnitVector(g.planet.pos).multiply(bot.deep);
		drillPos.add(bot.pos);
		return drillPos;
	}

	function getDrillMultiplier () {
		var d = g.bot.targetOreDeposit.pos.getDistance(g.bot.drillPos);
		if (d < DRILL_DISTANCE_THRESHOLD) {
			return 1;
		} else if (d > DRILL_DISTANCE_MAX) {
			return 0;
		}
		return Math.round( ((DRILL_DISTANCE_MAX - d) / DRILL_DISTANCE_MAX) * 10 )/10;
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
		var actualSwitch = (bot.bodyMode !== m);
		bot.bodyMode = m;
		// Now do stuff
		if (actualSwitch) {
			log("Mode: " + bot.bodyMode, true);
		}
		scanNearby();
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
		if (g.bot.targetBuilding !== null) {
			log("Cannot build so close to another building.");
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
			uses: 			buildingType.uses,
			produces: 		buildingType.produces,
			health: 		buildingType.maxHealth,
			maxHealth: 		buildingType.maxHealth,
			inventory: 		{},
			image: 			g.images.get(buildingKey)
		});
		populateInventory(building.inventory);
		r = PLANET_RADIUS + (BUILDING_HEIGHT/2) - BUILDING_R_OFFSET;
		building.pos.setByPolarCoords(r, bot.pos.theta);
		fixRotation(building);
		g.world.putIn(building, ["buildings"], true);
		log("Built " + buildingKey + ".");
	}

	function checkFullInventory () {
		var bot = g.bot;
		var fullResources = [];
		_.each(bot.inventory, function(resourceAmount, resourceKey){
			if (resourceAmount >= BOT_MAX_RESOURCE) {
				fullResources.push(resourceKey);
			}
		});
		if (fullResources.length > 0) {
			log("Full inventory for: " + fullResources.join(", "));
			return true;
		}
		return false;
	}

	function unloadFromBuilding(building) {
		var bot = g.bot;
		var count = 0;
		_.each(building.inventory, function(resourceAmount, resourceKey){
			let freeSpace = BOT_MAX_RESOURCE - bot.inventory[resourceKey];
			let loadAmount = Math.min(LOAD_AMOUNT, freeSpace, resourceAmount);
			building.inventory[resourceKey] -= loadAmount;
			bot.inventory[resourceKey] += loadAmount;
			count += loadAmount;
		});
		log("Unloaded " + count + " resources.");
		checkFullInventory();
		renderLocation();
		renderInventory();
	}

	function loadIntoBuilding(building) {
		var bot = g.bot;
		var count = 0;
		_.each(bot.inventory, function(resourceAmount, resourceKey){
			if (typeof building.uses[resourceKey] === 'number' && building.uses[resourceKey] > 0) {
				let freeSpace = BUILDING_MAX_RESOURCE - building.inventory[resourceKey];
				let loadAmount = Math.min(LOAD_AMOUNT, freeSpace, resourceAmount);
				building.inventory[resourceKey] += loadAmount;
				bot.inventory[resourceKey] -= loadAmount;
				count += loadAmount;
			}
		});
		log("Loaded " + count + " resources into the building.");
		checkFullInventory();
		renderLocation();
		renderInventory();
	}

	function buildingProcessing () {
		_.each(g.world.entities.buildings, function(building){
			var canAfford = true;
			_.each(building.buildingType.uses, function(resourceAmount, resourceKey){
				if (resourceKey === "sunlight") {
					// ignore... always have sunlight
				} else if (resourceKey === "pollution") {
					// always have pollution .... TODO: fix this?
				} else if (building.inventory[resourceKey] < resourceAmount) {
					canAfford = false;
				}
			});
			if (canAfford) {
				// Use up the resources
				_.each(building.buildingType.uses, function(resourceAmount, resourceKey){
					if (resourceKey === "sunlight") {
						// ignore... always have sunlight
					} else if (resourceKey === "pollution") {
						g.planet.pollution -= resourceAmount;
					} else {
						building.inventory[resourceKey] -= resourceAmount;
					}
				});
				// Produce stuff
				_.each(building.buildingType.produces, function(resourceAmount, resourceKey){
					building.inventory[resourceKey] += resourceAmount;
				});
			}
			// give air (pollution and atmosphere) to the world
			g.planet.pollution += building.inventory.pollution;
			g.planet.atmosphere += building.inventory.atmosphere;
			g.planet.signal += building.inventory.signal;
			building.inventory.pollution = 0;
			building.inventory.atmosphere = 0;
			building.inventory.signal = 0;
			
		});
	}


}).init();
