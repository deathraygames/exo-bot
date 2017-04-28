window.data = (function(){
	const monsters = {
		"blob": {

		}, 
		"moleman": {

		}
	};
	const ores = {
		"iron": {
			key: "iron",
			color: "#585856",
			depositMultiplier: 1.6
		},
		"carbon": {
			key: "carbon",
			color: "#333",
			depositMultiplier: 1.2
		},
		"silicon": {
			key: "silicon",
			color: "#777a7a",
			depositMultiplier: 1
		}, 
		"gold": {
			key: "gold",
			color: "#883",
			depositMultiplier: 0.8
		}
	};
	const items = {
		"metal parts": {
			key: "metal parts"
		},
		"solar cells": {
			key: "solar cells"
		},
		"electronics": {
			key: "electronics"
		},
		"energon": {
			key: "energon"
		},
		"food": {
			key: "food"
		}
	};
	const buildings = {
		"combustion metal factory": {
			key: "combustion metal factory",
			image: "combustion_factory_80",
			maxHealth: 500,
			cost: {
				"metal parts": 50
			},
			uses: {
				"carbon": 1,
				"iron": 1
			},
			produces: {
				"metal parts": 1,
				"pollution": 0.5
			}
		}, 
		"combustion power plant": {
			key: "combustion power plant",
			image: "combustion_power",
			maxHealth: 100,
			cost: {
				"metal parts": 100
			},
			uses: { 
				"carbon": 1
			},
			produces: { 
				"energon": 1,
				"pollution": 0.5
			}
		},
		"electronics factory": {
			key: "electronics factory",
			image: "chip_factory",
			maxHealth: 80,
			cost: {
				"metal parts": 100,
				"energon": 100
			},
			uses: {
				"silicon": 1,
				"gold": 2,
				"energon": 1
			},
			produces: {
				"electronics": 1
			}
		},
		"solar cell factory": {
			key: "solar cell factory",
			image: "solar_factory",
			maxHealth: 100,
			cost: {
				"metal parts": 50,
				"energon": 50,
				"electronics": 50
			},
			uses: { 
				"silicon": 2,
				"energon": 1
			},
			produces: { 
				"solar cells": 1 
			}			
		},
		"solar array": {
			key: "solar array",
			image: "solar_array_80",
			maxHealth: 40,
			cost: {
				"metal parts": 50,
				"solar cells": 100,
				"electronics": 100
			},
			uses: { 
				"sunlight": 1 
			},
			produces: {
				"energon": 1
			}
		},
		"clean metal factory": {
			key: "clean metal factory",
			image: "metal_factory",
			maxHealth: 500,
			cost: {
				"metal parts": 100,
				"electronics": 50
			},
			uses: {
				"energon": 2,
				"iron": 1
			},
			produces: {
				"metal parts": 1
			}
		},
		"terraformer": {
			key: "terraformer",
			image: "terraformer",
			maxHealth: 60,
			cost: {
				"metal parts": 200,
				"electronics": 100,
				"energon": 100
			},
			uses: {
				"energon": 1,
				"pollution": 1
			},
			produces: {
				"atmosphere": 0.1
			}
		},
		"colonization beacon": {
			key: "colonization beacon",
			image: "beacon",
			maxHealth: 60,
			cost: {
				"metal parts": 100,
				"electronics": 100,
				"solar cells": 50,
				"energon": 100
			},
			uses: {
				"energon": 2
			},
			produces: {
				"signal": 0.1
			}
		}
	};
	const buildingsOrder = [
		"combustion metal factory", 
		"combustion power plant", 
		"electronics factory",
		"solar cell factory",
		"solar array",
		"clean metal factory",
		"terraformer",
		"colonization beacon"
	];
	return {
		monsters: monsters,
		ores: ores,
		items: items,
		buildings: buildings,
		buildingsOrder: buildingsOrder
	};
})();