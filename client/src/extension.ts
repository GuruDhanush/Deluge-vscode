import { workspace, ExtensionContext, StatusBarItem, window, StatusBarAlignment, commands, ViewColumn, WebviewPanel, ProgressLocation } from 'vscode';

import {
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
	Executable
} from 'vscode-languageclient';


import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as console from 'console';
import * as req from 'request-promise-native';

let client: LanguageClient;
let parserStatus: StatusBarItem;
let runTimeFileName : string;
let appFileName : string;
let userPath : string;
const folderName: string = 'deluge-vscode';


async function DownloadFile(filePath: string, url: string) {

	var options: req.RequestPromiseOptions = {
		followAllRedirects: true,
		gzip: true,
		strictSSL: true,
		encoding: null,
	};

	var data;
	try {
		data = await req.get(url, options);
		await  fs.writeFile(filePath, data);
	} catch (error) {
		console.log(error);
	}
}


async function DependecyCheck(context: ExtensionContext) {

	var osString : string;

	if(os.platform() === 'win32')
		osString = 'win';
	else if(os.platform() === 'darwin')
		osString = 'mac';
	else //may be all variants, can possibly go wrong on unsupported platforms 
		osString = 'linux';

	var basePath: string;
	userPath = workspace.getConfiguration().get('deluge.homedir');
	if(!userPath && userPath.length != 0) {
		basePath = path.join(userPath, folderName);
	}
	else {
		basePath = path.join(os.homedir(), folderName);
	}
	userPath = basePath;

	var baseUrl = "https://github.com/GuruDhanush/Deluge-Language-Parser/releases/download/v0.03-alpha/";
	runTimeFileName = 'dartaotruntime-' + osString;
	appFileName = 'parser-' + osString + '.aot';
	var docFileName = 'docs.json';

	if(osString === 'win') runTimeFileName += '.exe';
	
	try {
		await fs.readdir(basePath);
	} catch (error) {
		if(error.code === "ENOENT")
			await fs.mkdir(basePath);
	}

	var runTimePath = path.join(basePath, runTimeFileName);
	var isRunTimeAvailable = true;

	try {
		await fs.stat(runTimePath);
	} catch (error) {
		if(error.code === "ENOENT") {
			isRunTimeAvailable = false;
		}
	}

	var appPath = path.join(basePath, appFileName);
	var isAppAvailable = true;

	try {
		await fs.stat(appPath);
	} catch (error) {
		if(error.code === "ENOENT") {
			isAppAvailable = false;
		}
	}

	var docPath = path.join(basePath, docFileName);
	var isDocAvailable = true;

	try {
		await fs.stat(docPath);
	} catch (error) {
		if(error.code === "ENOENT") {
			isDocAvailable = false;
		}
	}


	if(!(isRunTimeAvailable && isAppAvailable && isDocAvailable)) {
		window.withProgress(
			{
				title: 'Downloading',
				location: ProgressLocation.Notification,
				cancellable: false
			},
			async (progress, token) => {

				if(!isRunTimeAvailable) {
					progress.report({message: 'parser runtime'});
					await DownloadFile(runTimePath, baseUrl + runTimeFileName);
				} 

				if(!isAppAvailable) {
					progress.report({message: 'parser'});
					await DownloadFile(appPath, baseUrl + appFileName);
				}

				if(!isDocAvailable) {
					progress.report({message: 'docs'});
					await DownloadFile(docPath, baseUrl + docFileName);
				}

				progress.report({message: 'Complete ✔'});
				clientInit(context, null);
				return Promise.resolve();
			}
		);
	}
	else {
		clientInit(context, null);
	} 

}


function clientInit(context: ExtensionContext, exec : Executable) {



	const restartServerCommandId = 'delugelang.restartLangServer';

	context.subscriptions.push(
		commands.registerCommand(restartServerCommandId, async (param)  => {

			var status = await window.showQuickPick([ 'restart', 'continue']);
			if(status == 'restart') {
				if(!client) {
					var errorOpt = await  window.showErrorMessage('Lang Server was never started!!', 'Ok', 'Start Server');
					if(errorOpt && errorOpt === 'Start Server') {
						DependecyCheck(context);
					} 
				}

				await client.sendRequest('shutdown', ['shutdown']);
				await client.sendRequest('exit', ['exit']);
				//await client.stop();
				//await client.start();	
				//await client.start();
				//await window.showInformationMessage('Lang Server restarted successfully', 'Ok');
			}

		})
	);

	let webViewPanel: WebviewPanel | undefined = undefined;
	context.subscriptions.push(
		commands.registerCommand('delugelang.showView', (param) => {

			if (!param) {
				window.showErrorMessage('Command only works when in codelens');
				return;
			}

			if (webViewPanel) {
				if (!webViewPanel.active) {
					webViewPanel.reveal(ViewColumn.Beside);
				}
			}
			else {
				webViewPanel = window.createWebviewPanel(
					'delugehtmlView',
					'Message View',
					ViewColumn.Beside,
					{
						enableFindWidget: true
					}
				);

				webViewPanel.onDidDispose(
					() => { webViewPanel = undefined; },
					null,
					context.subscriptions
				);
			}
			webViewPanel.webview.html = WebViewShell(param);
		})
	);
	
	let executable: Executable = exec != null ?  exec : {
		command: path.join(userPath, runTimeFileName),
		args: [path.join(userPath, appFileName)]
	};

	let serverOptions: ServerOptions = {
		run: executable,
		debug: executable,
	};

	let clientOptions: LanguageClientOptions = {
		documentSelector: [{ scheme: 'file', language: 'dg' }, { scheme: 'untitled', language: 'dg'}],
		synchronize: {
			// Notify the server about file changes to '.clientrc files contained in the workspace
			fileEvents: workspace.createFileSystemWatcher('**/.clientrc')
		}
	};

	client = new LanguageClient(
		'DelugeLanguageServer',
		'Deluge Language Server',
		serverOptions,
		clientOptions
	);

	


	client.onReady().then(() => {
		parserStatus = window.createStatusBarItem(StatusBarAlignment.Left, 1, );
		parserStatus.tooltip = 'Shows the Deluge parser status';
		parserStatus.text = "$(unverified)";
		parserStatus.command = restartServerCommandId;
		parserStatus.show();

		client.onNotification('custom/updateStatusBarItem', (param) => {
			var status = param['status'] as boolean;

			parserStatus.text = status ? "$(check)" : "$(x)";
		});

	});

	client.start();


}



export  async function activate(context: ExtensionContext) {
	await DependecyCheck(context);
	//let ex : Executable = { command: "C:\\Users\\Guru\\AppData\\Roaming\\Pub\\Cache\\bin\\DelugeDartParser.bat" };
	//clientInit(context, ex);
	//client.start();
}



function WebViewShell(content: string): string {

	const css = `
		body {
			background-color: var(--vscode-editor-background);
			color: var(--vscode-editor-foreground);
		}
	`;

	const html = `
		<!DOCTYPE html>
		<html lang="en">
		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<meta http-equiv="X-UA-Compatible" content="ie=edge">
			<title>Message Show</title>
			<style> ${css} </style>
		</head>
		<body>
			${content}
		</body>
		</html>
	`;

	return html;
}


export function deactivate(): Thenable<void> | undefined {
	if (!client) {
		return undefined;
	}
	return client.stop();
}