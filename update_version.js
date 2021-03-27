/*
 * shapeOf
 * README.md Updater Script
 * 
 * A small utility script to update the first line of README.md to match package.json.
 */
const fs = require('fs');

let readme = fs.readFileSync('./README.md').toString().trim().split('\n');
let lib = fs.readFileSync('./index.js').toString().split('\n');
let package = JSON.parse(fs.readFileSync('./package.json').toString());
let expectedReadmeVersionLine = '# shapeOf v' + package.version;
let existingReadmeVersionLine = readme[0];
let expectedLibVersionLine = 'shapeOf.version = "' + package.version + '"; // core version';
let expectedLibCompatibleLine = 'shapeOf.compatibleSchemaVersion = "' + package.compatibleSchemaVersion + '"; // compatible schema version';

// Update index.js
let changedLib = false;
for (var i = lib.length - 1; i >= 0; i--) {
	let line = lib[i].trim();
	if (line.startsWith('shapeOf.version = "')) {
		if (line !== expectedLibVersionLine) {
			lib[i] = 'shapeOf.version = "' + package.version + '"; // core version';
			changedLib = true;
			console.log("Updating source version...");
		}
	}
	if (line.startsWith('shapeOf.compatibleSchemaVersion = "')) {
		if (line !== expectedLibCompatibleLine) {
			lib[i] = 'shapeOf.compatibleSchemaVersion = "' + package.compatibleSchemaVersion + '"; // compatible schema version';
			changedLib = true;
			console.log("Updating source compatibleSchemaVersion...");
		}
	}
}
if (changedLib) {
	fs.writeFileSync('./index.js', lib.join('\n'));
	console.log("Updated source version(s).");
}

// Update README.md
if (existingReadmeVersionLine === expectedReadmeVersionLine) {
	console.log('README.md version up-to-date.');
} else {
	readme[0] = expectedReadmeVersionLine;
	readme = readme.join('\n');

	fs.writeFileSync('./README.md', readme);

	console.log("Updated version in README.md.");
}
