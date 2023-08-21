// Name: Install Toolkit
// Description: Install a Toolkit from uffelmann.me
// Input: getSelectedFile
// Output: Notification
// Tags: util, helper, install toolkit, install kenv
// Author: Eduard Uffelmann
// Twitter: @schmedu_
// Linkedin: https://www.linkedin.com/in/euffelmann/
// Website: https://uffelmann.me

import "@johnlindquist/kit";
import axios from "axios";
import * as fs from "fs";
import AdmZip from "adm-zip";
import * as os from "os";

async function downloadZipFile(url: string, outputPath: string): Promise<void> {
    try {
        const response = await axios.get(url, { responseType: "arraybuffer" });
        fs.writeFileSync(outputPath, response.data);
        notify(`Zip file downloaded to ${outputPath}`);
    } catch (error) {
        console.error(`Error downloading the zip file: ${error.message}`);
    }
}

export interface Kenv {
    name: string;
    title: string;
    description: string;
    price: string | undefined;
    paylink: string;
    priceSingle?: string | undefined;
    href: string;
    installation?: string;
    scriptNames?: string[];
}

const CLIENT_SECRET = "L7J7yLVcZdJbAFcVMpVcJaXwdoNsxLdW3ez9LFASStE";

const BASE_URL = "https://uffelmann.me";
let toolsReq = await axios.get(
    `${BASE_URL}/api/client?secret=${CLIENT_SECRET}`
);
let tools = toolsReq.data.tools as Kenv[];

let kenv = await arg(
    "Which kenv",
    tools.map((tool) => {
        return {
            name: tool.name,
            description: tool.description,
            value: tool,
            // preview: `<img src="${BASE_URL}/img/kenvs/${tool.name}.png" class="" />`,
            preview: md(
                `# ${tool.name}: ${tool.description}                
## Scripts
${tool.scriptNames.map((script) => `- ${script}`).join("\n")}`
            ),
        };
    })
);

let isPaidTool = typeof kenv.price !== "string";

interface Credentials {
    licenseKey: string;
    instanceId: string;
}

let downloadLink;
if (isPaidTool) {
    let licenseKey = "";
    let instanceId = "";
    let credentialsDB = await store("LicenseKeys");
    if (await credentialsDB.has(kenv.name)) {
        let credentials = (await credentialsDB.get(kenv.name)) as Credentials;
        licenseKey = credentials.licenseKey;
        instanceId = credentials.instanceId;

        try {
            let downloadLinkRequest = await axios.get(
                `${BASE_URL}/api/client/${kenv.name}?secret=${CLIENT_SECRET}&licenseKey=${licenseKey}&instanceId=${instanceId}`
            );
            downloadLink = downloadLinkRequest.data.url;
            await credentialsDB.set(kenv.name, { licenseKey, instanceId });
        } catch (err) {
            let body = encodeURIComponent(
                `License Key: ${licenseKey}\nID: ${instanceId}`
            );
            await credentialsDB.delete(kenv.name);
            await arg(
                {
                    placeholder: "Please Contact Me",
                    hint: `This instance got deactivated. Please run the script again to activate a new instance with your License Key.`,
                },
                [{ name: "Ok", value: true }]
            );
            exit();
        }
    } else {
        licenseKey = await arg({
            placeholder: "Enter the license Key",
            hint: `Buy a license key for the <a href="${kenv.paylink}" target="_blank">${kenv.name}</a> Toolkit for \$${kenv.price}`,
            ignoreBlur: true,
            alwaysOnTop: true,
        });
        const systemUser = os.userInfo().username;
        try {
            let downloadLinkRequest = await axios.get(
                `${BASE_URL}/api/client/${kenv.name}?secret=${CLIENT_SECRET}&licenseKey=${licenseKey}&instanceName=${systemUser}`
            );
            downloadLink = downloadLinkRequest.data.url;
            let instanceId = downloadLinkRequest.data.instanceId;
            await credentialsDB.set(kenv.name, { licenseKey, instanceId });
        } catch (err) {
            let body = encodeURIComponent(`License Key: ${licenseKey}\n`);
            await arg(
                {
                    placeholder: "Please Contact Me",
                    hint: `You exceeded the activation limit. Please <a href="mailto:licenses@uffelmann.me?subject=DeactivatePreviousLicenseInstance&body=${body}" target="_blank">contact me</a> to deactivate an old instance.`,
                },
                [{ name: "Ok", value: true }]
            );
            exit();
        }
    }
} else {
    let downloadLinkRequest = await axios.get(
        `${BASE_URL}/api/client/${kenv.name}?secret=${CLIENT_SECRET}`
    );
    downloadLink = downloadLinkRequest.data.url;
}

let zipDownloadPath = home("Downloads", `${kenv.name}.zip`);
await downloadZipFile(downloadLink, zipDownloadPath);

let kenvFolder = kenvPath("kenvs", kenv.name);
// let kenvFolder = home("Downloads", "kenvs", kenv.name + "2");
if (await isDir(kenvFolder)) {
    let shouldOverwrite = await arg(
        `${kenv.name} already exists. Do you want to overwrite it?`,
        [
            { name: "No", value: false },
            { name: "Yes", value: true },
        ]
    );
    if (!shouldOverwrite) exit();
}

await mkdir("-p", kenvFolder);
const zip = new AdmZip(zipDownloadPath);
zip.extractAllTo(kenvFolder, false);
await rm(zipDownloadPath);
notify(`${kenv.name} successfully installed!`);
