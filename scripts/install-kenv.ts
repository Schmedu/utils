// Name: Install Toolkit
// Description: Install free and paid Toolkits from schmedu.com
// Input: None
// Output: Installed Toolkit
// Tags: util, helper, install toolkit, install kenv
// Author: Eduard Uffelmann
// Twitter: @schmedu_
// Linkedin: https://www.linkedin.com/in/euffelmann/
// Website: https://schmedu.com

import "@johnlindquist/kit";
import axios from "axios";
import * as fs from "fs";
import AdmZip from "adm-zip";
import * as os from "os";
import { createHash } from "crypto";

function getHash(input: string, algorithm: string): string {
    const hash = createHash(algorithm);
    hash.update(input);
    return hash.digest("hex");
}

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

const BASE_URL = "https://schmedu.com";
let toolsReq = await axios.get(
    `${BASE_URL}/api/client?secret=${encodeURIComponent(CLIENT_SECRET)}`
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
let licenseKey = "";
let instanceId = "";
let credentialsDB = await store("LicenseKeys");
if (isPaidTool) {
    if (await credentialsDB.has(kenv.name)) {
        // license was activated already
        let credentials = (await credentialsDB.get(kenv.name)) as Credentials;
        licenseKey = credentials.licenseKey;
        instanceId = credentials.instanceId;

        try {
            let downloadLinkRequest = await axios.get(
                `${BASE_URL}/api/client/${encodeURIComponent(
                    kenv.name
                )}?secret=${encodeURIComponent(
                    CLIENT_SECRET
                )}&licenseKey=${encodeURIComponent(
                    licenseKey
                )}&instanceId=${encodeURIComponent(instanceId)}`
            );
            downloadLink = downloadLinkRequest.data.url;
            // await credentialsDB.set(kenv.name, { licenseKey, instanceId });
        } catch (err) {
            log(err);
            let body = encodeURIComponent(
                err.message
            );
            await credentialsDB.delete(kenv.name);
            let sendReport = await arg(
                {
                    placeholder: "Error downloading the toolkit",
                    hint: `There was an error while downloading the toolkit. Please send an error report so I can help you install it. Sorry for the inconvenience!`
                },
                [
                    {
                        name: "Send Error Report and get contacted",
                        description: "You will only send the license key and your (hashed) instanceID and the error message. Nothing else. I will contact you via the email that you used for the purchase.",
                        value: true,
                    },
                    {
                        name: "Ignore",
                        value: false,
                    },
                ]
            );
            if (sendReport) {
                await axios.post(
                    `${BASE_URL}/api/client/${encodeURIComponent(
                        kenv.name
                    )}/error-reporting?secret=${encodeURIComponent(
                        CLIENT_SECRET
                    )}&licenseKey=${encodeURIComponent(
                        licenseKey
                    )}&instanceId=${encodeURIComponent(
                        instanceId
                    )}&error=${encodeURIComponent(
                        "LicenseActiveErrorDownloading"
                    )}&errorBody=${body}`
                );
            }
            exit();
        }
    } else {
        licenseKey = await arg({
            placeholder: "Enter the license Key",
            hint: `Buy a license key for the <a href="${kenv.paylink}" target="_blank">${kenv.name}</a> Toolkit for \$${kenv.price}`,
            ignoreBlur: true,
            alwaysOnTop: true,
        });
        let instanceName = getHash(os.userInfo().username, "md5");

        try { // try activating the license
            let downloadLinkRequest = await axios.get(
                `${BASE_URL}/api/client/${encodeURIComponent(
                    kenv.name
                )}?secret=${encodeURIComponent(
                    CLIENT_SECRET
                )}&licenseKey=${encodeURIComponent(
                    licenseKey
                )}&instanceName=${encodeURIComponent(instanceName)}`
            );
            downloadLink = downloadLinkRequest.data.url;
            let instanceId = downloadLinkRequest.data.instanceId;
            await credentialsDB.set(kenv.name, { licenseKey, instanceId });
        } catch (err) {
            log(err);
            let body = encodeURIComponent(err.message);

            let sendReport = await arg(
                {
                    placeholder: "Error activating the License Key",
                    hint: `There was an error while activating your license key. Please send an error report so I can help you install it. Sorry for the inconvenience!`
                },
                [
                    {
                        name: "Send error report and get contacted",
                        description: "You will only send the license key and your (hashed) instanceName and the error message. Nothing else. I will contact you via the email that you used for the purchase.",
                        value: true,
                    },
                    {
                        name: "Ignore",
                        value: false
                    }
                ]
            );

            if (sendReport) {
                await axios.post(
                    `${BASE_URL}/api/client/${encodeURIComponent(
                        kenv.name
                    )}/error-reporting?secret=${encodeURIComponent(
                        CLIENT_SECRET
                    )}&licenseKey=${encodeURIComponent(
                        licenseKey
                    )}&instanceName=${encodeURIComponent(
                        instanceName
                    )}&error=${encodeURIComponent(
                        "LicenseActivatingError"
                    )}&errorBody=${body}`
                );
            }
            exit();
        }
    }
} else {
    try {
        let downloadLinkRequest = await axios.get(
            `${BASE_URL}/api/client/${encodeURIComponent(
                kenv.name
            )}?secret=${encodeURIComponent(CLIENT_SECRET)}`
        );
        downloadLink = downloadLinkRequest.data.url;
    } catch (err) {
        log(err);
        let body = encodeURIComponent(err.message);

        let sendReport = await arg(
            {
                placeholder: "Error downloading the toolkit",
                hint: `There was an error while downloading the toolkit. Please send an error report so you can get some help to install it. Sorry for the inconvenience!`
            },
            [
                {
                    name: "Send error report and get contacted",
                    description: "You will only send the error message and your email address.",
                    value: true,
                },
                {
                    name: "Ignore",
                    value: false
                }
            ]
        );

        if (sendReport) {
            let email = await arg("What is your email?")
            await axios.post(
                `${BASE_URL}/api/client/${encodeURIComponent(
                    kenv.name
                )}/error-reporting?secret=${encodeURIComponent(
                    CLIENT_SECRET
                )}&email=${encodeURIComponent(
                    email
                )}&error=${encodeURIComponent(
                    "LicenseActivatingError"
                )}&errorBody=${body}`
            );
        }
        exit();
    }
}

let zipDownloadPath = home("Downloads", `${kenv.name}.zip`);
await downloadZipFile(downloadLink, zipDownloadPath);

let kenvFolder = kenvPath("kenvs", kenv.name);
if (await isDir(kenvFolder)) {
    let shouldOverwrite = await arg(
        `${kenv.name} already exists. Do you want to overwrite it?`,
        [
            { name: "No", value: false },
            { name: "Yes", value: true },
        ]
    );
    if (!shouldOverwrite) {
        await div({
            html: md(`# ${kenv.name} already exists!
Download canceled because it should not be replaced.`),
        })
        exit()
    };
}

await mkdir("-p", kenvFolder);
const zip = new AdmZip(zipDownloadPath);
zip.extractAllTo(kenvFolder, false);
await rm(zipDownloadPath);
if (isPaidTool) { // save the credentials in the db
    await credentialsDB.set(kenv.name, { licenseKey, instanceId });
}
await div({
    html: md(`# Installed ${kenv.name}!
Please allow notifications for ScriptKit. Many tools rely on them :-)`),
});
notify(`${kenv.name} successfully installed!`);
