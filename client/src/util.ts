
import { platform as nodePlatform, homedir } from 'os';
import {  ExtensionContext } from 'vscode';
import * as path from 'path';



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


export function getHomeDir(context: ExtensionContext) : string {
	//@ts-ignore
	return context.globalStoragePath;
}

export function getServerVersion(context: ExtensionContext) : string {
	
	const version : string = context.globalState.get('server_version');
	//if(version == 'v0.04-alpha') return 'v0.03-alpha';
	return version || 'v0.04-alpha';
}


export function updateServerVersion(version : string, context: ExtensionContext) : Thenable<void> {
	return context.globalState.update('server_version', version);
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