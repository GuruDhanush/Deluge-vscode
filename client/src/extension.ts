import { extensions, workspace, ExtensionContext, StatusBarItem, window, StatusBarAlignment, commands, ViewColumn, WebviewPanel } from 'vscode';

import {
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
	Executable
} from 'vscode-languageclient';

import { DependencyCheck } from './update';
import * as util from './util';

import * as path from 'path';
import TelemetryReporter from 'vscode-extension-telemetry';

let client: LanguageClient;
let parserStatus: StatusBarItem;
let reporter: TelemetryReporter;


function clientInit(context: ExtensionContext, exec: Executable) {


	const restartServerCommandId = 'delugelang.restartLangServer';

	context.subscriptions.push(
		commands.registerCommand(restartServerCommandId, async (param) => {

			var status = await window.showQuickPick(['restart', 'continue']);
			if (status == 'restart') {
				if (!client) {
					var errorOpt = await window.showErrorMessage('Lang Server was never started!!', 'Ok', 'Start Server');
					if (errorOpt && errorOpt === 'Start Server') {
						DependencyCheck();
					}
				}

				await client.sendRequest('shutdown', ['shutdown']);
				await client.sendRequest('exit', ['exit']);
				//await client.stop();
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

	let executable: Executable = exec != null ? exec : {
		command: path.join(util.getHomeDir(), util.getServerVersion(), util.getRunTimeName()),
		args: [path.join(util.getHomeDir(), util.getServerVersion(), util.getParserName()),]
	};

	let serverOptions: ServerOptions = {
		run: executable,
		debug: executable,
	};

	let clientOptions: LanguageClientOptions = {
		documentSelector: [{ scheme: 'file', language: 'dg' }, { scheme: 'untitled', language: 'dg' }],
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
		parserStatus = window.createStatusBarItem(StatusBarAlignment.Left, 1);
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

function telemetryInit(context: ExtensionContext) {
	const extensionId = "deluge";
	const extensionVersion = extensions.getExtension('gdp.delugelang').packageJSON.version;
	//no other way than to keep it open. 
	const teleKey = "ae8732e6-acdb-44eb-96e1-ae10108167a8";

	reporter = new TelemetryReporter(extensionId, extensionVersion, teleKey);
	context.subscriptions.push(reporter);
}



export async function activate(context: ExtensionContext) {

	telemetryInit(context);
	await DependencyCheck();
	reporter.sendTelemetryEvent('Use Extension', { 'time': Date.UTC.toString() } );
	//let ex : Executable = { command: "C:\\Users\\Guru\\AppData\\Roaming\\Pub\\Cache\\bin\\DelugeDartParser.bat" };
	clientInit(context, null);
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