/*
 * shapeOf
 * README.md Updater Script
 * 
 * A small utility script to update the first line of README.md to match package.json.
 */
const fs = require('fs');

let args = process.argv.map(a => a.toLowerCase());
let readme = fs.readFileSync('./README.md').toString().trim().split('\n');
let package = JSON.parse(fs.readFileSync('./package.json').toString());
let expectedVersionLine = '# shapeOf v' + package.version;
let existingVersionLine = readme[0];

if (existingVersionLine === expectedVersionLine) {
	console.log('README.md version up-to-date.');
} else {
	readme[0] = expectedVersionLine;
	readme = readme.join('\n');

	fs.writeFileSync('./README.md', readme);

	console.log("Updated version in README.md");
}
