import * as req from 'request-promise-native';
import { promises as fs } from 'fs';
import * as util from "./util";
import { window, ProgressLocation, ExtensionContext } from 'vscode';
import * as path from 'path';



const baseUrl: String = "https://github.com/GuruDhanush/Deluge-Language-Parser/releases/download/";


async function isFileAvailable(path: string): Promise<Boolean> {

	try {
		await fs.stat(path);
		return true;
	} catch (error) {
		if (error.code === "ENOENT") {
			console.log(`File not available from ${path}`);
		}
		else {
			console.log(`File not found, ${error}`);
		}
	}
	return false;
}

async function isPathExists(path: string): Promise<Boolean> {

	try {
		await fs.readdir(path);
		return true;
	} catch (error) {
		console.log('path doesnot exist!');
	}
	return false;
}

async function createPath(path: string): Promise<Boolean> {
	try {
		await fs.mkdir(path);
		return true;
	} catch (error) {
		console.log(`Path creation error ${path}`);
	}
	return false;
}

async function getLatestRelease(): Promise<string> {

	const repoApiUrl = "https://api.github.com/repos/GuruDhanush/Deluge-Language-Parser/releases/latest";

	var data = await req.get(repoApiUrl, { headers: { 'User-Agent': 'Deluge-Language-Parser'} } );
	return JSON.parse(data)['tag_name'];
}


async function DownloadPackage(
	runTime: boolean,
	runTimePath: string,
	app: boolean,
	appPath: string,
	docs: boolean,
	docsPath: string,
	context: ExtensionContext) {

	if (!(runTime && app && docs)) {

		await window.withProgress(
			{
				title: 'Downloading',
				location: ProgressLocation.Notification,
				cancellable: false
			},
			async (progress, token) => {
				let baseUrlVers = baseUrl + util.getServerVersion(context) + '/';
				if (!runTime) {
					progress.report({ message: 'Runtime' });
					await DownloadFile(runTimePath, baseUrlVers + util.getRunTimeName());
					console.log('downloaded runtime');

					if (util.getPlatform() !== util.Platform.Windows) {
						fs.chmod(runTimePath, 0o777);
						console.log('set the executable status');
					}
				}

				if (!app) {
					progress.report({ message: 'Parser' });
					await DownloadFile(appPath, baseUrlVers + util.getParserName());
					console.log('downloaded parser');
				}

				if (!docs) {
					progress.report({ message: 'Docs' });
					await DownloadFile(docsPath, baseUrlVers + util.getDocsName());
					console.log('downloaded docs');
				}

				//progress.report({message: 'Complete ✔'});
				return Promise.resolve();
			}
		);
	}
}


async function updatePackage(version: string, context: ExtensionContext) {
	let homePath = path.join(util.getHomeDir(context), version);
	if (!await isPathExists(homePath)) {
		await createPath(homePath);
	}
	await util.updateServerVersion(version, context);

	await DownloadPackage(false, path.join(homePath, util.getRunTimeName()),
		false, path.join(homePath, util.getParserName()),
		false, path.join(homePath, util.getDocsName()), context);

	window.showInformationMessage('Updated successfully');
}


export async function DependencyCheck(context: ExtensionContext): Promise<void> {

	let isNewlyDownloaded = false;
	var homePath = util.getHomeDir(context);
	if (!await isPathExists(homePath)) {
		await createPath(homePath);
	}

	var serverVersion = util.getServerVersion(context);
	homePath = path.join(homePath, serverVersion);
	if (!await isPathExists(homePath)) {
		isNewlyDownloaded = true;
		//checks for new server versions from gh
		let updServerVersion = await getLatestRelease();
		if (serverVersion != updServerVersion) {
			serverVersion = updServerVersion;
			await util.updateServerVersion(serverVersion, context);
			homePath = homePath.substring(0, homePath.lastIndexOf('/')) + '/' + serverVersion;
		}
		await createPath(homePath);
	}

	let isRunTimeAvailable = false;
	var runTimePath = path.join(homePath, util.getRunTimeName());
	if (await isFileAvailable(runTimePath)) {
		isRunTimeAvailable = true;
	}

	let isAppAvailable = false;
	var appPath = path.join(homePath, util.getParserName());
	if (await isFileAvailable(appPath)) {
		isAppAvailable = true;
	}

	let isDocsAvailable = false;
	var docsPath = path.join(homePath, util.getDocsName());
	if (await isFileAvailable(docsPath)) {
		isDocsAvailable = true;
	}

	await DownloadPackage(isRunTimeAvailable, runTimePath, isAppAvailable, appPath, isDocsAvailable, docsPath,context);


	if (!isNewlyDownloaded) {
		setTimeout(async function () {
			let newServerVersion = await getLatestRelease();
			if (util.getServerVersion(context) != newServerVersion) {
				var userInput = await window.showInformationMessage(
					'A new update for the server is Available. Do you want to update to ' + newServerVersion,
					'Update Now', 'Later');

				if (userInput && userInput == 'Update Now') {
					await updatePackage(newServerVersion, context);
				}
			}
		}, 10000);
	}

}

async function DownloadFile(filePath: string, url: string) {

	let options: req.RequestPromiseOptions = {
		followAllRedirects: true,
		gzip: true,
		strictSSL: true,
		encoding: null,
	};

	try {
		let data = await req.get(url, options);
		await fs.writeFile(filePath, data);
	} catch (error) {
		console.log(`File download error from ${url} to ${filePath} !`);
	}
}