/*
 * shapeOf
 * README.md Updater Script
 * 
 * A small utility script to update the first line of README.md to match package.json.
 */
const fs = require('fs');

let readmeOriginal = fs.readFileSync('./README.md').toString().trim();
let readme = readmeOriginal.split('\n')
let lib = fs.readFileSync('./index.js').toString().split('\n');
let package = JSON.parse(fs.readFileSync('./package.json').toString());
let expectedReadmeVersionLine = '# shapeOf v' + package.version;
let existingReadmeVersionLine = readme[0];
let expectedLibVersionLine = 'shapeOf.version = "' + package.version + '"; // core version';
let expectedLibCompatibleLine = 'shapeOf.compatibleSchemaVersion = "' + package.compatibleSchemaVersion + '"; // compatible schema version';


//
// index.js
//

// Update version variables and version history
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
	if (line === '}; // end of shapeOf._versionCompatibilityHistory') {
		if (changedLib) {
			lib.splice(i - 1, 0, `\t'${package.version}': '${package.compatibleSchemaVersion}',`);
		}
	}
}
if (changedLib) {
	fs.writeFileSync('./index.js', lib.join('\n'));
	console.log("Updated source version(s).");
} else {
	console.log("No changes needed for source version variables.");
}


//
// README.md
// 

// Update Table of Contents
let sections = [];
let tocIndex = -1;
let tocEndIndex = -1;
let currentIndentLevels = [1, 1, 1, 1, 1, 1];
let lastIndentLevel = 1;
readme.forEach((line, index) => {
	line = line.trim();
	if (line.startsWith('##')) {
		if (line.indexOf('Table of Contents') === -1) {
			let sectionIndent = line.split(' ')[0].length - 2;
			let sectionName = line.replace(/^[#]+\W*/g, '');
			let sectionID = sectionName.toLowerCase().replace(/[ ]/g, '-').replace(/[^a-zA-Z0-9\-]/g, '');
			if (lastIndentLevel != sectionIndent) {
				lastIndentLevel = sectionIndent;
				for (let i = currentIndentLevels.length - 1; i > sectionIndent; i--) {
					currentIndentLevels[i] = 1;
				}
			}
			let sectionCount = currentIndentLevels[sectionIndent];
			sections.push(
				'    '.repeat(sectionIndent) + 
				`${sectionCount}. [${sectionName}](#${sectionID})`
			);
			if (tocIndex > -1 && tocEndIndex === -1)
				tocEndIndex = index;
			currentIndentLevels[sectionIndent]++;
		} else {
			tocIndex = index;
		}
	}
});
if (tocIndex === -1 || tocEndIndex === -1) {
	console.warn("Couldn't find Table of Contents section in README.md.");
} else {
	let deleteCount = tocEndIndex - tocIndex - 2;
	sections = sections.concat(['']);
	readme.splice(tocIndex + 1, deleteCount, ...sections);
	console.log(`README.md Table of Contents: detected ${sections.length} sections.`);
}

// Update version header
if (existingReadmeVersionLine === expectedReadmeVersionLine) {
	console.log('README.md version up-to-date.');
} else {
	console.log('README.md version updated.')
}
readme[0] = expectedReadmeVersionLine;
readme = readme.join('\n');

// Write changes, if detected
if (readme != readmeOriginal) {
	fs.writeFileSync('./README.md', readme);
	console.log("Updated README.md.");
} else {
	console.log("No update needed for README.md.");
}

