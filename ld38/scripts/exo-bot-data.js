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
			color: "#666"
		},
		"carbon": {
			key: "carbon",
			color: "#333"
		},
		"silicon": {
			key: "silicon",
			color: "#888"
		}, 
		"gold": {
			key: "gold",
			color: "#883"
		}
	};
	const items = {
		"metal parts": {
			key: "metal parts",
			sources: ["icon"]
		},
		"solar cells": {
			key: "solar cells",
			sources: ["silicon"]
		},
		"electronics": {
			key: "electronics",
			sources: ["gold", "silicon"]
		},
		"energon": {
			key: "energon",
			sources: ["carbon"]
		}
	};
	const buildings = {
		"combustion factory": {
			key: "combustion factory",
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
				"metal parts": 1
			}
		}, 
		"combustion power plant": {
			key: "combustion power plant",
			image: "combustion_factory_80",
			maxHealth: 100,
			cost: {
				"metal parts": 100
			},
			uses: { 
				"carbon": 1
			},
			produces: { 
				"energon": 1,
				"pollution": 1
			}
		},
		"electronics factory": {
			key: "electronics factory",
			image: "generic_80",
			maxHealth: 80,
			cost: {
				"metal parts": 100,
				"energon": 100
			},
			uses: {
				"silicon": 1,
				"gold": 1,
				"energon": 1
			},
			produces: {
				"electronics": 1
			}
		},
		"solar cell factory": {
			key: "solar cell factory",
			image: "generic_80",
			maxHealth: 100,
			cost: {
				"metal parts": 100
			},
			uses: { 
				"silicon": 2,
				"energon": 1
			},
			produces: { 
				"solar cell": 1 
			}			
		},
		"solar array": {
			key: "solar array",
			image: "solar_array_80",
			maxHealth: 40,
			cost: {
				"metal parts": 200,
				"solar cells": 100,
				"electronics": 20
			},
			uses: { 
				"sunlight": 1 
			},
			produces: {
				"energon": 1
			}
		},
		"terraformer": {
			key: "terraformer",
			image: "generic_80",
			maxHealth: 60,
			cost: {
				"metal parts": 200,
				"electronics": 10,
				"energon": 50
			},
			uses: {
				"energon": 1,
				"pollution": 1
			},
			produces: {
				"atmosphere": 1
			}
		},
		"colonization beacon": {
			key: "colonization beacon",
			image: "solar_array_80",
			maxHealth: 60,
			cost: {
				"metal parts": 100,
				"electronics": 50,
				"solar cells": 50,
				"energon": 50
			},
			uses: {
				"energon": 1
			},
			produces: {
				"signal": 1
			}
		}
	};
	const buildingsOrder = [
		"combustion factory", 
		"combustion power plant", 
		"electronics factory",
		"solar cell factory",
		"solar array",
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