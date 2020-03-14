/*
 * @Author: your name
 * @Date: 2020-03-04 17:55:03
 * @LastEditTime: 2020-03-14 11:34:21
 * @LastEditors: Please set LastEditors
 * @Description: In User Settings Edit
 * @FilePath: \lsp-sample\client\src\extension.ts
 */
/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import * as lsp from 'vscode-languageclient';

import { registerCommands } from './commands';
import { projectLoadingNotification } from './protocol';

// import {
// 	LanguageClient,
// 	LanguageClientOptions,
// 	ServerOptions,
// 	TransportKind,
// 	RevealOutputChannelOn
// } from 'vscode-languageclient';

// let client: LanguageClient;

export function activate(context: vscode.ExtensionContext) {
	// The server is implemented in node
	// let serverModule = context.asAbsolutePath(
	// 	path.join('server', 'out', 'server.js')
	// );
	// The debug options for the server
	// --inspect=6009: runs the server in Node's Inspector mode so VS Code can attach to the server for debugging
	// let debugOptions = { execArgv: ['--nolazy', '--inspect=6009'] };

	// If the extension is launched in debug mode then the debug server options are used
	// Otherwise the run options are used
	const serverOptions: lsp.ServerOptions = {
		run: getServerOptions(context, false /* debug */),
		debug: getServerOptions(context, true /* debug */),
	};

	// Options to control the language client
	const clientOptions: lsp.LanguageClientOptions = {
		// Register the server for plain text documents
		documentSelector: [
			{ scheme: 'file', language: 'html' },
			{ scheme: 'file', language: 'typescript' },
		],
		synchronize: {
			// Notify the server about file changes to '.clientrc files contained in the workspace
			// fileEvents: vscode.workspace.createFileSystemWatcher('**/.clientrc')
			/* 为什么这个地方要用tsconfig? */
			fileEvents: vscode.workspace.createFileSystemWatcher('**/tsconfig.json')
		},
		revealOutputChannelOn: lsp.RevealOutputChannelOn.Never
	};

	// Create the language client and start the client.
	const forceDebug = process.env['NG_DEBUG'] === 'true';
	/* 名字和id 不影响提示效果*/
	const client = new lsp.LanguageClient(
		// 'languageServerExample',
		// 'Language Server Example',
		'devui-language-support-client',
		// 'DevUI_Language_Support',
		serverOptions,
		clientOptions,
		forceDebug
	);

	/* 保证客户端能够在扩展关闭的同时关闭，并开启客户端*/
	context.subscriptions.push(...registerCommands(client), client.start());

	/**
	 * @description: 对client的变化进行应答 
	 * @param {type} 
	 * @return: 
	 */
	client.onDidChangeState((e) => {
		let task: { resolve: () => void } | undefined;
		if (e.newState == lsp.State.Running) {
			client.onNotification(projectLoadingNotification.start, () => {
				if (task) {
					task.resolve();
					task = undefined;
				}
				vscode.window.withProgress({
					location: vscode.ProgressLocation.Window,
					title: 'Initialzing DevUI language features',
				},
					() => new Promise((resolve) => {
						task = { resolve };
					}));
			});
			client.onNotification(projectLoadingNotification.finish, () => {
				if (task) {
					task.resolve();
					task = undefined;
				}
			});
		}
	});
}
/**
 * Return the paths for the module that corresponds to the specified `configValue`,
 * and use the specified `bundled` as fallback if none is provided.
 * @param configName
 * @param bundled
 */
function getProbeLocations(configValue: string | null, bundled: string): string[] {
	const locations = [];
	// Always use config value if it's specified
	if (configValue) {
		locations.push(configValue);
	}
	// Prioritize the bundled version
	locations.push(bundled);
	// Look in workspaces currently open
	const workspaceFolders = vscode.workspace.workspaceFolders || [];
	for (const folder of workspaceFolders) {
		locations.push(folder.uri.fsPath);
	}
	return locations;
}

/** 
 * Construct the arguments that's used to spawn the server process.
 * @param ctx vscode extension context
 * @param debug true if debug mode is on
 */
function constructArgs(ctx: vscode.ExtensionContext, debug: boolean): string[] {
	const config = vscode.workspace.getConfiguration();
	const args: string[] = [];
	const ngLog: string = config.get('angular.log', 'off');
	if (ngLog !== 'off') {
		// Log file does not yet exist on disk. It is up to the server to create the file.
		const logFile = path.join(ctx.logPath, 'nglangsvc.log');
		args.push('--logFile', logFile);
		args.push('--logVerbosity', debug ? 'verbose' : ngLog);
	}

	const ngdk: string | null = config.get('angular.ngdk', null);
	const ngProbeLocations = getProbeLocations(ngdk, ctx.asAbsolutePath('server'));
	args.push('--ngProbeLocations', ngProbeLocations.join(','));

	const tsdk: string | null = config.get('typescript.tsdk', null);
	const tsProbeLocations = getProbeLocations(tsdk, ctx.extensionPath);
	args.push('--tsProbeLocations', tsProbeLocations.join(','));

	/*devui探针*/
	// const devuidk: string|null = config.get('ng-devui',null);
	// const devuiProbeLocations = getProbeLocations(devuidk,ctx.extensionPath);
	// args.push('--devuiProbeLocations',devuiProbeLocations.join(','));
	return args;
}

function getServerOptions(ctx: vscode.ExtensionContext, debug: boolean): lsp.NodeModule {
	// Environment variables for server process
	const prodEnv = {
		// Force TypeScript to use the non-polling version of the file watchers.
		TSC_NONPOLLING_WATCHER: true,
	};
	const devEnv = {
		...prodEnv,
		NG_DEBUG: true,
	};

	// Node module for the language server
	const prodBundle = ctx.asAbsolutePath('server');
	const devBundle = ctx.asAbsolutePath(path.join('server', 'out', 'server.js'));

	// Argv options for Node.js
	const prodExecArgv: string[] = [];
	const devExecArgv: string[] = [
		// do not lazily evaluate the code so all breakpoints are respected
		'--nolazy',
		// If debugging port is changed, update .vscode/launch.json as well
		'--inspect=6009',
	];

	return {
		// VS Code Insider launches extensions in debug mode by default but users
		// install prod bundle so we have to check whether dev bundle exists.
		module: debug && fs.existsSync(devBundle) ? devBundle : prodBundle,
		transport: lsp.TransportKind.ipc,
		args: constructArgs(ctx, debug),
		options: {
			env: debug ? devEnv : prodEnv,
			execArgv: debug ? devExecArgv : prodExecArgv,
		},
	};
}
// export function deactivate(): Thenable<void> | undefined {
// 	if (!client) {
// 		return undefined;
// 	}
// 	return client.stop();
// }
