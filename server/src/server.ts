/*
 * @Author: your name
 * @Date: 2020-03-08 19:29:37
 * @LastEditTime: 2020-03-13 22:34:29
 * @LastEditors: Please set LastEditors
 * @Description: In User Settings Edit
 * @FilePath: \DevUI-Language-Support\server\src\server.ts
 */
/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import {
	createConnection,
	TextDocuments,
	TextDocument,
	Diagnostic,
	DiagnosticSeverity,
	ProposedFeatures,
	InitializeParams,
	DidChangeConfigurationNotification,
	CompletionItem,
	CompletionItemKind,
	TextDocumentPositionParams
} from 'vscode-languageserver';
import { generateHelpMessage,parseCommandLine } from './cmdline_utils';
import { resolveTsServer, resolveNgLangSvc,resolveDevUI } from './version_provider';
import { ServerHost } from './server_host';
import { DevUIhtmlSyntaxes } from './DevUIhtmlSyntaxes';
import { DConnection } from './dconnection';
import { createLogger } from './logger';

//---------------------angular思路---------------
/* 读取命令行命令 两个函数*/
const options = parseCommandLine(process.argv);
/* help 命令*/
if (options.help) {
	console.error(generateHelpMessage(process.argv));
	process.exit(0);
}

/* 生成日志系统 */
/*两种logger 其中一个是写在vscode-language里面的，一个是写在vscode-languageservice里面的*/
const logger = createLogger({
	logFile: options.logFile,
	logVerbosity: options.logVerbosity,
});

// /* 定位ts与angular */
const ts = resolveTsServer(options.tsProbeLocations);
const ng = resolveNgLangSvc(options.ngProbeLocations);


// /* serverhost */
const host = new ServerHost();
//---------------------angular思路---------------


// Create a connection for the server. The connection uses Node's IPC as a transport.
// Also include all preview / proposed LSP features.
const dconnection = new DConnection({
	host,
	logger,
	devProbeLocation: ng.resolvedPath,
});
dconnection.info(`DevUI language server process ID: ${process.pid}`);
dconnection.info(`Using typescript v${ts.version} from ${ts.resolvedPath}`);
dconnection.info(`Using @angular/language-service v${ng.version} from ${ng.resolvedPath}`);
// const devui = resolveDevUI(options.devuiProbeLocation);
// dconnection.info(`Using ng-devui v${devui.version} from ${devui.resolvedPath}`);
dconnection.info(`Using ng-devui * from *`);
dconnection.info(`Log file: ${logger.getLogFileName()}`);
if (process.env.NG_DEBUG === 'true') {
	dconnection.info('Angular Language Service is running under DEBUG mode');
}
if (process.env.TSC_NONPOLLING_WATCHER !== 'true') {
	dconnection.warn(`Using less efficient polling watcher. Set TSC_NONPOLLING_WATCHER to true.`);
}
dconnection.listen();


