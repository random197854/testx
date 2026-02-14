var sceneSelect = {
	page: 0,
	cursor: 0
}

function constructSceneSelect() {
	calculateCGSize();
	createSelections();
	fillSelections();
	setPageNumber();
	displayCursor();
}

function calculateCGSize() {
	// The images are 4:3 without the black bars
	// 938 is the usable width we have
	// 702 is the usable height we have
	//
	// spacing = (((w/h) / 10) | 0) * 2;
	// 10 is just a number I chose and fit.
	// 2 is because we need to account for 2 cgs being next to eachother
	//
	// We could just do repeat(--columns, 1fr), repeat(--rows, 1fr)
	// but that would ruin the AR and I'm autistic.
	let ARx = 4;
	let ARy = 3;
	let width = 938 / prefs.select.columns;
	let height = 702 / prefs.select.rows;
	let spacing = 1;
	if (width / ARx > height / ARy) {
		// Height has the highest ratio so base CGs off of that
		spacing = ((height / 10) | 0) * 2;
		height = (702 - (spacing * (prefs.select.rows - 1))) / prefs.select.rows;
		width = (4 / 3) * height;
	} else if (width / ARx < height / ARy) {
		// Width has the highest ratio so base the CGs off of that.
		spacing = ((width / 10) | 0) * 2;
		width = (938 - (spacing * (prefs.select.columns - 1))) / prefs.select.columns;
		height = (3 / 4) * width;
	} else {
		console.log("Something broke in calculateCGSize()");
		// Fall back to width because something broke or everythings equal
		spacing = ((width / 10) | 0) * 2;
		width = (938 - (spacing * (prefs.select.columns - 1))) / prefs.select.columns;
		height = (3 / 4) * width;
	}
	document.documentElement.style.setProperty("--cg-width", width + "px");
	document.documentElement.style.setProperty("--cg-height", height + "px");
	document.documentElement.style.setProperty("--cg-spacing", spacing + "px");
	document.documentElement.style.setProperty("--cg-columns", prefs.select.columns);
	document.documentElement.style.setProperty("--cg-rows", prefs.select.rows);
}

function createSelections() {
	let cgAmount = 0;
	if ((prefs.select.rows * prefs.select.columns) * (sceneSelect.page + 1) > main.sceneList.length) {
		//Reached the last page, cut off any excess elements.
		cgAmount = main.sceneList.length - (prefs.select.rows * prefs.select.columns) * (sceneSelect.page);
	} else {
		cgAmount = prefs.select.rows * prefs.select.columns;
	}
	killChildren(main.elements.cgWrapper);
	for (let i = 0; i < cgAmount; i++) {
		let cgContainer = document.createElement("div");
		let faveInd = document.createElement("div");
		cgContainer.className = "cg-container";
		faveInd.className = "cg-fave-ind";
		//faveInd.innerHTML = prefs.faveInd;
		main.elements.cgWrapper.appendChild(cgContainer);
		cgContainer.appendChild(faveInd);
	}
}

function fillSelections() {
	sceneSelect.paths = new Set();
	for (let i = 0; i < main.elements.cgWrapper.children.length; i++) {
		let cgIdx = i + (sceneSelect.page * (prefs.select.rows * prefs.select.columns));
		let curWrapper = main.elements.cgWrapper.children[i];
		let fillScene = main.sceneList[cgIdx];
		if (sceneData[fillScene].rpgx || (sceneData[fillScene].SCRIPTS && sceneData[fillScene].SCRIPTS.PART1)) {
			let part1 = sceneData[fillScene].SCRIPTS.PART1;
			let imageSrc;
			if (part1.HIERARCHY && part1.HIERARCHY.pairList && part1.HIERARCHY.pairList.length > 0) {
				let idx = part1.HIERARCHY.pairList.length > 1 ? 1 : 0;
				imageSrc = part1.HIERARCHY.pairList[idx].parent;
			} else if (part1.images && part1.images.length > 0) {
				imageSrc = part1.images[0];
			} else {
				// Fallback: try to construct based on scene ID
				// User Request: limit to 1007 or 1007_1 (strip _v2 etc)
				let cleanScene = fillScene.split("_").slice(0, 2).join("_");
				imageSrc = "chr_" + cleanScene + "a_r18";
			}

			if (imageSrc) {
				let file = constructImagePath(imageSrc, fillScene);
				sceneSelect.paths.add({ elem: curWrapper, path: file });
			} else {
				console.warn("No thumbnail found for scene: " + fillScene);
				console.log("Debug Info for " + fillScene + ":", part1);
				if (part1.HIERARCHY) {
					console.log("HIERARCHY keys:", Object.keys(part1.HIERARCHY));
					if (part1.HIERARCHY.pairList) {
						console.log("pairList length:", part1.HIERARCHY.pairList.length);
					}
				}
				if (part1.images) {
					console.log("images length:", part1.images.length);
				}
			}
		} else {
			if (fillScene[0] == "c") {
				let tabaimgs = sceneData[fillScene].images
				//curWrapper.style.backgroundImage = "url('" + tabaimgs[1] + "')";
				sceneSelect.paths.add({ elem: curWrapper, path: tabaimgs[1] });
				// switch(tabaimgs.length){
				// 	case 0:
				// 		curWrapper.style.backgroundImage = "url('" + sceneData[fillScene].SCRIPTS.PART2.images[0] + "')";
				// 	break;
				// 	case 1:
				// 		curWrapper.style.backgroundImage = "url('" + tabaimgs[0] + "')";
				// 	break;
				// 	default:
				// 		curWrapper.style.backgroundImage = "url('" + tabaimgs[1] + "')";
				// 	break;
				// }
				curWrapper.style.backgroundSize = "100%";
			} else if (fillScene.includes("HAR")) {
				sceneSelect.paths.add({ elem: curWrapper, path: sceneData[fillScene].SCRIPTS.PART1.images[0] });
				curWrapper.style.backgroundSize = "100% 100%";
			} else if (fillScene.includes("OTOGI_")) {
				sceneSelect.paths.add({ elem: curWrapper, path: sceneData[fillScene].SCRIPTS.PART1.images[0] });
				curWrapper.style.backgroundSize = "100% 100%";
			}
		}

		let iddisp = document.createElement("div");
		iddisp.innerHTML = fillScene;
		iddisp.classList = "cg-id text-stroke"
		if (prefs.select.iddisp) {
			iddisp.style.visibility = "visible";
		}
		curWrapper.appendChild(iddisp);



		curWrapper.setAttribute("sceneId", fillScene);
		if (sceneData[fillScene].favourite) {
			curWrapper.getElementsByClassName("cg-fave-ind")[0].style.visibility = "visible";
		}
	}
	sceneSelect.iter = sceneSelect.paths.values();
	fileLoader(drawSelection);
}

function drawSelection() {
	let obj = sceneSelect.iter.next().value;
	if (obj == null || obj == undefined) {
		return;
	}
	if (obj.path.split(".").slice(-1)[0] == "webm") {
		let vid = document.createElement("video");
		vid.addEventListener("canplay", function () {
			vid.classList = "cg-video";
			obj.elem.appendChild(vid)
			drawSelection();
		}, { once: true });
		vid.addEventListener("error", function () {
			drawSelection();
		}, { once: true })
		vid.src = obj.path;
	} else {
		let img = new Image();
		img.addEventListener("load", function () {
			obj.elem.style.backgroundImage = "url('" + obj.path + "')";
			drawSelection();
		}, { once: true });
		img.addEventListener("error", function (e) {
			console.error("Failed to load thumbnail: " + obj.path, e);
			drawSelection();
		}, { once: true })
		// Log the attempted URL as requested by user
		// console.log("Attempting to load thumbnail:", obj.path);
		img.src = obj.path;
	}


}

function nextPage() {
	if (sceneSelect.page >= Math.floor((main.sceneList.length - 1) / (prefs.select.rows * prefs.select.columns))) {
		sceneSelect.page = 0;
	} else {
		sceneSelect.page++;
	}
	constructSceneSelect();
}

function prevPage() {
	if (sceneSelect.page <= 0) {
		sceneSelect.page = Math.floor((main.sceneList.length - 1) / (prefs.select.rows * prefs.select.columns))
	} else {
		sceneSelect.page--;
	}
	constructSceneSelect();
}

function setPageNumber() {
	main.elements.pageNumber.value = (sceneSelect.page + 1) + "/" + (Math.floor((main.sceneList.length - 1) / (prefs.select.rows * prefs.select.columns)) + 1);
}

function displayCursor() {
	if (sceneSelect.cursor >= main.elements.cgWrapper.children.length) {
		sceneSelect.cursor = main.elements.cgWrapper.children.length - 1;
	}
	addCursorEffect();
}

function addCursorEffect() {
	main.elements.cgWrapper.children[sceneSelect.cursor].classList.add("cursor-active");
}

function removeCursorEffect() {
	main.elements.cgWrapper.children[sceneSelect.cursor].classList.remove("cursor-active");
}