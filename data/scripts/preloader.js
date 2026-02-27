var toPreload = new Set();
var preloadIter;
var preload = {
	paths: new Set(),
	files: new Set(),
	temp: {

	},
	perm: {

	},
	canvas: {

	},
	failed: false,
	failedPaths: [],
	loaded: 0
}

//make scene uninteractable until load

function initPreload() {
	preload.permElem = document.getElementById("preload-perm-elem");
	preload.tempElem = document.getElementById("preload-temp-elem");
}

function preloadSceneResources(script) {
	for (let command of script) {
		let fn;
		let src;
		switch (command.substr(1, command.lastIndexOf(">") - 1)) {
			case "EV":
			case "BG":
				fn = command.substr(command.lastIndexOf(">") + 1, command.indexOf(",") - (command.lastIndexOf(">") + 1)).trim();
				if (fn == "black" || fn == "white") {
					continue;
				}
				src = createImagePath(fn);
				break;
			case "ACTOR":
				fn = command.substr(command.indexOf(",") + 1, command.substr(command.indexOf(",") + 1).indexOf(",")).trim();
				src = createImagePath(fn);
				break;
			case "SPINE":
				fn = command.substr(command.indexOf(">") + 1);
				if (fn.indexOf(",") !== -1) {
					fn = fn.substr(0, fn.indexOf(","));
				}
				fn = fn.trim();
				preload.paths.add("SPINE:" + fn);
				break;
			case "VOICE_PLAY":
				src = constructVoiceAudioPath(command.substr(command.lastIndexOf(">") + 1).trim(), scene.id);
				break;
			case "BGM_PLAY":
				src = constructBGMAudioPath(command.substr(command.lastIndexOf(">") + 1, command.indexOf(",") - (command.lastIndexOf(">") + 1)).trim());
				break;
			case "SE_PLAY":
				src = constructSEAudioPath(command.substr(command.lastIndexOf(">") + 1).trim());
				break;
			default:
				break;
		}
		preload.paths.add(src);
	}
	preload.paths.delete(undefined);
	preload.iter = preload.paths.values();
	fileLoader(loadSceneResources);
}

function preloadTABAResources() {
	for (let part in sceneData[scene.id].SCRIPTS) {
		let curPart = sceneData[scene.id].SCRIPTS[part];
		let folder = curPart.FOLDER;
		let script;
		if (scene.translated) {
			for (let tl of curPart.TRANSLATIONS) {
				if (tl.LANGUAGE == scene.language && tl.TRANSLATOR == scene.translator) {
					script = tl.SCRIPT;
					break;
				}
			}
		} else {
			script = curPart.SCRIPT
		}
		let path = "./TABAScenes/" + folder;
		for (let cmd of script) {
			let src = cmd.src;
			let type = cmd.type;
			let id = cmd.id;
			let fullPath;

			switch (type) {
				case "BG":
				case "EV":
				case "OV":
					if (src) {
						fullPath = path + "/images/" + src.split("/")[src.split("/").length - 1];
					}
					break;
				case "TXT":
					if (src) {
						fullPath = path + "/sounds/" + src.split("/")[src.split("/").length - 1];
					}
					break;
				default:
					break;
			}
			if (fullPath != undefined && !fullPath.includes("non_resource")) {
				preload.files.add(fullPath.split("/")[fullPath.split("/").length - 1]);
				preload.paths.add(fullPath);
			}
		}
		preload.paths.delete(undefined);
		preload.iter = preload.paths.values();
		fileLoader(loadSceneResources);
	}
}

function preloadNecroResources(script) {
	let path = `./NecroScenes/${scene.id}`;
	for (let command of script) {
		let src;
		let cmd = command.split(",");
		switch (cmd[0]) {
			case "bg":
				src = `${path}/images/${cmd[1]}.webp`;
				break;
			case "bgmplay":
				src = `./data/audio/bgm/${cmd[1]}.m4a`;
				break;
			case "msgvoicesync":
				src = `${path}/voices/${cmd[5]}.m4a`;
				break;
			case "playmovie":
				src = `${path}/videos/${cmd[1]}.webm`;
				break;
			case "seplay":
				src = `./data/audio/se/${cmd[1]}.m4a`;
				break;
			case "voice":
				if (!cmd[1].includes("_i_men")) {
					src = `${path}/voices/${cmd[1]}.m4a`;
				}
				break;
			default:
				break;
		}
		preload.paths.add(src);
	}
	preload.paths.delete(undefined);
	preload.iter = preload.paths.values();
	fileLoader(loadSceneResources);
}

function preloadOtogiResources(script) {
	let path = `./OtogiScenes/${scene.id.split("_")[1]}`;
	for (let cmd of script) {
		if (cmd.Voice != "") {
			preload.paths.add(`${path}/voices/${cmd.Voice}.m4a`);
		}
		if (cmd.BGM != null) {
			preload.paths.add(`./data/audio/bgm/${cmd.BGM}.m4a`);
		}
		if (cmd.SE != "") {
			preload.paths.add(`./data/audio/se/${cmd.BGM}.m4a`);
		}
	}
	for (let img of sceneData[scene.id].SCRIPTS.PART1.images) {
		preload.paths.add(img);
	}
	preload.paths.delete(undefined);
	preload.iter = preload.paths.values();
	fileLoader(loadSceneResources);
}

function loadSceneResources() {
	let path = preload.iter.next().value;
	if (path == null || path == undefined) {
		if (preload.failed) {
			fileErrorPopup();
			return;
		}
		if (scene.type == H_TABA) {
			// Multi-part scenes may use the same files so using paths
			// doesn't always work.
			if (preload.files.size == Object.keys(preload.temp).length) {
				cleanupPreload();
				startScene();
				return;
			}
		} else {
			// I don't know why filenames doesn't work and paths does
			// for RPGX but I also don't care enough to find out.
			if (preload.paths.size == Object.keys(preload.temp).length) {
				cleanupPreload();
				startScene();
				return;
			}
		}
		//console.log("Error code: Some shit's not fucking loading");
		//console.log(loadSceneResources.caller);
		return;
	}
	main.elements.loadingFile.innerText = path;

	if (path.startsWith("SPINE:")) {
		let spineName = path.substring(6);
		if (preload.temp["SPINE_" + spineName]) {
			loadSceneResources();
			return;
		}

		let skelUrl = constructSpinePath((spineName + ".skel").toLowerCase());
		let atlasUrl = constructSpinePath((spineName + ".atlas").toLowerCase());

		Promise.all([
			fetch(skelUrl).then(res => res.arrayBuffer()),
			fetch(atlasUrl).then(res => res.text())
		]).then(([skelBuf, atlasText]) => {
			const skelBase64 = btoa(new Uint8Array(skelBuf).reduce((data, byte) => data + String.fromCharCode(byte), ''));
			let images = {};
			let lines = atlasText.split("\n");
			for (let line of lines) {
				if (line.includes(".png") && !line.includes(":")) {
					let imgName = line.trim();
					images[imgName] = constructSpinePath(imgName.toLowerCase());

					// Preload the image implicitly so it's cached for SpineModel.from
					const cachedImg = new Image();
					cachedImg.crossOrigin = "anonymous";
					cachedImg.src = images[imgName];
				}
			}

			preload.temp["SPINE_" + spineName] = {
				atlas: atlasText,
				skel: skelBase64,
				images: images
			};
			loadSceneResources();
		}).catch(err => {
			console.error("Failed to preload Spine data: ", err);
			loadSceneResources();
		});
		return;
	}

	let fn = path.substr(path.lastIndexOf("/") + 1, path.lastIndexOf(".") - path.lastIndexOf("/") - 1);
	if (preload.temp[fn]) {
		loadSceneResources();
		return;
	}

	let ext = path.substr(path.lastIndexOf(".") + 1);
	if (ext == "png" || ext == "webp") {
		loadImage(path, "tempPreloadImage", false, loadSceneResources);
	} else if (ext == "ogg" || ext == "m4a") {
		loadAudio(path, false, loadSceneResources);
	} else if (ext == "webm") {
		loadVideo(path, "tempPreloadImage", false, loadSceneResources);
	}
}

function cleanupPreload() {
	preload.paths = new Set();
	preload.files = new Set();
	preload.failed = false;
	preload.failedPaths = [];
	preload.loaded = 0;
	main.elements.loadingWrap.style.visibility = "hidden";
}

function createCanvases(script, pairList = null) {
	let evData = getCommandData(script, "<EV>", 0);
	evData = [...new Set(evData)];
	for (let ev of evData) {
		createCGCanvases(ev, pairList);
	}
	// for(let img of sceneData[id].hierarchy.pairList){
	// 	if(!preload.canvas.hasOwnProperty(img.parent)){
	// 		createCanvas([img.parent]);
	// 	}
	// 	if(!preload.canvas.hasOwnProperty(img.child)){
	// 		createCanvas([img.parent, img.child]);
	// 	}
	// }
}

function createCGCanvases(ev, pairList = null) {
	//console.log(ev + ", " + pairList)
	let prevParent;
	if (!preload.canvas.hasOwnProperty(ev) && pairList != null) {
		let foundMatch = false;
		for (let pair of pairList) {
			prevParent = pair.parent;
			if (ev == pair.parent) {
				foundMatch = true;
				createCanvas([pair.parent]);
				break;
			} else if (ev == pair.child) {
				foundMatch = true;
				createCanvas([pair.parent, pair.child]);
				break;
			}
		}
		if (!foundMatch) {
			// Sometimes EVs aren't listed in the pair list.
			if (prevParent == null) {
				createCanvas([ev])
			} else {
				createCanvas([prevParent, ev]);
			}
		}
	} else {
		createCanvas([ev]);
	}
}

function createCanvas(files) {
	let name = files[files.length - 1];
	let canvas = document.createElement("canvas");
	canvas.id = name
	canvas.height = 720;
	canvas.width = 960;
	main.elements.canvasHoldElem.append(canvas);
	// let ctx = canvas.getContext("2d");

	// for(file of files){
	// 	let image = new Image();
	// 	image.onload = function(){
	// 		ctx.drawImage(image, 160, 0, 960, 720, 0, 0, 960, 720);
	// 	}
	// 	image.src = createImagePath(file);
	// }
	if (files.length == 2) {
		drawImage(canvas, files[0], function () {
			drawImage(canvas, files[1])
		});
	} else {
		drawImage(canvas, files[0]);
	}
	canvas.classList.add("tempPreloadImage");
	preload.canvas[name] = canvas;
}

function drawImage(canvas, file, callback = null) {
	let ctx = canvas.getContext("2d");
	let image = new Image();
	image.onload = function () {
		ctx.drawImage(image, 160, 0, 960, 720, 0, 0, 960, 720);
		//ctx.drawImage(image, 0, 0, 960, 720, 0, 0, 960, 720);
		if (callback != null) {
			callback();
		}
	}
	image.src = createImagePath(file);
}

function createImagePath(file) {
	if (scene.type == H_RPGX || scene.type == CG_RPGX) {
		let id;
		if (file.startsWith("chr_0") && !file.startsWith("chr_0295_3") && !file.startsWith("chr_0299_3") && !file.startsWith("chr_0334")) {
			id = file.replace("chr_", "").replace("_r18", "").replace(/[a-z]/g, "").substr(0, 6);
		} else if (file.startsWith("exev")) {
			id = (file.split("_")[0] + file.split("_")[1].replace(/[a-z]/, "")).replace("ev", "");
			// } else if(file.startsWith("ex")){
			// 	id = file.split("_")[0] + file.split("_")[1].replace(/[a-z]/, "");
			// 	console.log("ex match: " + file + ", " + id + ", " + scene.id)
		} else {
			id = scene.type == H_RPGX ? scene.id : cgViewer.scene;
		}
		//return "./scenes/" + id + "/images/" + file + ".webp";
		return "https://raw.githubusercontent.com/random197854/test5/gh-pages/images/" + file + ".webp";

	} else if (scene.type == STORY_RPGX) {
		if (/[a-z]+_[a-z][0-9][0-9][0-9][a-z]/.test(file) || file.startsWith("chr_") || file.startsWith("ex_")) {
			//return "./Story/char/" + file + ".webp";
			return "https://raw.githubusercontent.com/random197854/test5/gh-pages/images/" + file + ".webp";
		} else if (file.startsWith("ef") || file.startsWith("nc") || file.startsWith("chrnc")) {
			//return "./Story/bg/" + file + ".webp";
			return "https://raw.githubusercontent.com/random197854/test5/gh-pages/images/" + file + ".webp";
		} else if (file.startsWith("stv")) {
			//return "./Story/bg/" + file + ".webp";
			return "https://raw.githubusercontent.com/random197854/test5/gh-pages/images/" + file + ".webp";
		}
	} else if (scene.type == H_TABA) {

	}
}

function getCommandData(script, tag, idx = null) {
	let data = []
	for (let cmd of script) {
		if (cmd.startsWith(tag)) {
			if (idx != null) {
				data.push(cmd.substr(cmd.lastIndexOf(">") + 1).split(",")[idx]);
			} else {
				data.push(cmd.substr(cmd.lastIndexOf(">") + 1));
			}
		}
	}
	return data
}

// var trans = new Set();
// for(let key in sceneData){
// 	console.log(getCommandData(sceneData[key].script, "<TRANSITION>", 0));
// }

function constructImagePath(src, id) {
	return "https://raw.githubusercontent.com/random197854/test5/gh-pages/images/" + src + ".webp";
}
function constructVoiceAudioPath(src, id) {
	return "https://raw.githubusercontent.com/random197854/test5/gh-pages/data/audio/voices/" + src.toLowerCase() + ".ogg";
}
function constructSpinePath(src) {
	return "https://raw.githubusercontent.com/random197854/test5/gh-pages/data/spine/" + src;
}

function constructBGMAudioPath(src) {
	return "https://raw.githubusercontent.com/random197854/test5/gh-pages/data/audio/bgm/" + src.toLowerCase() + ".ogg";
}

function constructSEAudioPath(src) {
	return "https://raw.githubusercontent.com/random197854/test5/gh-pages/data/audio/se/" + src.toLowerCase() + ".ogg";
}

function emptyTempPreload() {
	// Kill children causes some weird shit in CG mode for the canvas holder
	// for(let key in preload.canvas){
	// 	let child = preload.canvas[key];
	// 	child.parentElement.removeChild(child)
	// }
	preload.canvas = {};
	preload.temp = {};
	preload.paths = new Set();
	preload.files = new Set();
	killChildren(document.getElementById("preload-temp-elem"));
	killChildren(main.elements.canvasHoldElem);
}

// var names = new Set();
// for(let key in sceneData){
// 	let curScene = sceneData[key];
// 	for(let cmd of curScene.script){
// 		if(cmd.startsWith("<NAME_PLATE>")){
// 			let name = cmd.substr(cmd.lastIndexOf(">") + 1);
// 			if(/[ａ-ｚＡ-Ｚ０-９？]/.test(name)){
// 				names.add(name.substr(0, /[ａ-ｚＡ-Ｚ０-９？]/.exec(name).index).trim());
// 			} else {
// 				names.add(name.trim());
// 			}
// 		}
// 	}
// }

function permPreload(paths) {
	preload.paths = new Set(paths);
	preload.paths.delete(undefined);
	preload.iter = preload.paths.values();
	displayLoadScreen();
	loadPermFiles();
}

function loadPermFiles() {
	let path = preload.iter.next().value;
	if (path == null || path == undefined) {
		if (preload.failed) {
			fileErrorPopup();
			return;
		} else {
			cleanupPreload();
			return;
		}
	}
	main.elements.loadingFile.innerText = path;
	let fn = path.substr(path.lastIndexOf("/") + 1, path.lastIndexOf(".") - path.lastIndexOf("/") - 1);
	if (preload.temp[fn]) {
		loadPermFiles();
		return;
	}
	loadImage(path, "permPreloadImage", true, loadPermFiles);
}

function errorLoading(path) {
	console.error(`ErrorLoading: Final failure for path: ${path}`); // Log 4
	preload.failed = true;
	preload.failedPaths.push(path);
}

function fileErrorPopup() {
	main.elements.loadingError.style.visibility = "initial";
	main.elements.loadingErrorMsg.value = "The following files could not be loaded:\n"
	for (let error of preload.failedPaths) {
		main.elements.loadingErrorMsg.value += "    " + error + "\n";
	}
}

function closeError() {
	main.elements.loadingError.style.visibility = "hidden";
	main.elements.loadingErrorMsg.value = "";
	cleanupPreload();
	endScene();
}

function fileLoader(loadFunction) {
	for (let i = 0; i < prefs.viewer.fileLoaders; i++) {
		loadFunction();
	}
}

function updateProgress() {
	main.elements.loadingProgress.style.width = ((preload.loaded / preload.paths.size) * 100) + "%";
}

// New helper function to construct the fallback path
function getFallbackImagePath(originalPath) {
	const r18Pattern = /_r18\.webp$/;
	if (r18Pattern.test(originalPath)) {
		return originalPath.replace(r18Pattern, '.webp');
	}
	return null; // No fallback path possible
}

function loadImage(path, className, perm, callback, isFallback = false) { // Added isFallback parameter
	console.log(`loadImage: Attempting to load path: ${path}, isFallback: ${isFallback}`); // Log 1
	let img = new Image();
	let fn = path.substr(path.lastIndexOf("/") + 1, path.lastIndexOf(".") - path.lastIndexOf("/") - 1);
	img.className = className;
	img.addEventListener("load", function () {
		console.log(`loadImage: Successfully loaded path: ${path}`); // Log 2
		if (perm) {
			preload.perm[fn] = img;
			preload.permElem.append(img);
		} else {
			preload.temp[fn] = img;
			preload.tempElem.append(img);
		}
		preload.loaded++;
		updateProgress();
		callback();
	}, { once: true });
	img.addEventListener("error", function () {
		console.log(`loadImage: Failed to load path: ${path}, isFallback: ${isFallback}`); // Log 3
		// Only attempt fallback if it's the original path and contains "_r18"
		if (!isFallback) {
			const fallbackPath = getFallbackImagePath(path);
			if (fallbackPath) {
				console.log(`Image failed to load: ${path}. Attempting fallback: ${fallbackPath}`);
				// Retry loading with the fallback path, marking it as a fallback attempt
				loadImage(fallbackPath, className, perm, callback, true);
				return; // Stop current error handling
			}
		}
		// If it's a fallback attempt or no fallback possible, report the error
		errorLoading(path);
		callback();
	}, { once: true })
	img.src = path;
}

function loadVideo(path, className, perm, callback) {
	let vid = document.createElement("video");
	let fn = path.substr(path.lastIndexOf("/") + 1, path.lastIndexOf(".") - path.lastIndexOf("/") - 1);
	vid.className = className;
	vid.addEventListener("canplay", function () {
		if (perm) {
			preload.perm[fn] = vid;
			preload.permElem.append(vid);
		} else {
			preload.temp[fn] = vid;
			preload.tempElem.append(vid);
		}
		preload.loaded++;
		updateProgress();
		callback();
	}, { once: true });
	vid.addEventListener("error", function () {
		errorLoading(path);
		callback();
	}, { once: true })
	vid.src = path;
}

function loadAudio(path, perm, callback) {
	let audio = new Audio();
	let fn = path.substr(path.lastIndexOf("/") + 1, path.lastIndexOf(".") - path.lastIndexOf("/") - 1);
	audio.addEventListener("canplay", function () {
		if (perm) {
			preload.perm[fn] = audio;
		} else {
			preload.temp[fn] = audio;
		}
		preload.loaded++;
		updateProgress();
		callback();
	}, { once: true });
	audio.addEventListener("error", function () {
		errorLoading(path);
		callback();
	}, { once: true });
	audio.src = path;
}
