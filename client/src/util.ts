
import { platform as nodePlatform, homedir } from 'os';
import { workspace } from 'vscode';
import * as path from 'path';


const defaultFolderName = 'deluge-vscode';

export enum Platform {
	Windows = "win",
	Linux = "linux",
	Mac = "mac"
}

export function getPlatform(): Platform {

	let platform = nodePlatform();
	if (platform == 'win32') return Platform.Windows;
	else if (platform == 'darwin') return Platform.Mac;

	return Platform.Linux;
}


export function getHomeDir() : string {

	const home = workspace.getConfiguration().get<string | null>('deluge.homedir');
	return home ||  path.join(homedir(), defaultFolderName);
}

export function getServerVersion() : string {
	
	const version = workspace.getConfiguration().get<string>('deluge.server.version');
	//wont need the fallback as the version number is fixed and cant be updated
	return version || '0.04-alpha';
}

export function updateServerVersion(version : string) : void {
	workspace.getConfiguration().update('deluge.server.version', version);
}

export function getRunTimeName() : string {

	const platform = getPlatform();
	let name = 'dartaotruntime-' + platform;
	if(platform === Platform.Windows) return name + '.exe';
	return name;
}

export function getParserName() : string {
	return 'parser-' + getPlatform() + '.aot';  
}

export function getDocsName() : string { 
	return  'docs.json';
}