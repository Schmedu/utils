// Name: Install Kenv
// Description: Moves the kenv to the ~/.kenv/kenvs folder and renames it if necessary
// Input: getSelectedFile
// Output: Notification
// Tags: util, helper, move kenv to kenvs folder
// Author: Eduard Uffelmann
// Twitter: @schmedu_
// Linkedin: https://www.linkedin.com/in/euffelmann/
// Website: https://uffelmann.me

import "@johnlindquist/kit";
import { promises as fsPromises, existsSync, mkdirSync } from "fs";

async function moveAndRenameDirectory(sourceDirectory, destinationDirectory) {
    // Check if the source directory exists
    if (existsSync(sourceDirectory)) {
        // Create the destination directory if it doesn't exist
        if (!existsSync(destinationDirectory)) {
            mkdirSync(destinationDirectory);
        }

        try {
            // Move and rename the directory
            await fsPromises.rename(sourceDirectory, destinationDirectory);
            notify("Kenv moved and renamed successfully.");
            log("Kenv moved and renamed successfully.");
        } catch (err) {
            notify("Error moving and renaming the directory:", err);
            log("Error moving and renaming the directory:", err);
        }
    } else {
        notify("Source directory does not exist.");
        log("Source directory does not exist.");
    }
}

let kenvFolder = await getSelectedFile();
// check if kenvFolder has a scripts folder inside
let hasScriptsFolder = !(await isDir(path.join(kenvFolder, "scripts")));
while (!hasScriptsFolder) {
    setHint(`There's no 'scripts' folder inside ${kenvFolder}`);
    kenvFolder = await path({
        startPath: await home("Downloads"),
        onlyDirs: true,
    });
    if (!(await isDir(path.join(kenvFolder, "scripts")))) {
        setHint("");
        break;
    }
}

let kenvFolderPath = path.parse(kenvFolder);
let changedKenvName = await arg({
    placeholder: "Which name should the kenv have?",
    input: kenvFolderPath.base,
});

let destinationFolder =
    kenvFolderPath.base !== changedKenvName
        ? await kenvPath("kenvs", changedKenvName)
        : await kenvPath("kenvs", kenvFolderPath.base);

await moveAndRenameDirectory(kenvFolder, destinationFolder);

notify(`Moved ${kenvFolder} to ~/.kenv/kenvs`);
