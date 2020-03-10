/*
 * @Author: your name
 * @Date: 2020-03-08 19:29:37
 * @LastEditTime: 2020-03-10 12:19:22
 * @LastEditors: your name
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
import{parseCommandLine} from './cmdline_utils';
import{resolveTsServer,resolveNgLangSvc}from'./version_provider';
import{ServerHost} from'./server_host'; 
import {DevUIhtmlSyntaxes} from './DevUIhtmlSyntaxes';
import { DConnection } from './connection';

//---------------------angular思路---------------
// /* 读取命令行命令 两个函数*/
// const options = parseCommandLine(process.argv);
// /* help 命令*/ 
// if(options.help){
// 	/*  待施工 */ 
// }

// /* 生成日志 */ 
// // const logger = createlogger();

// /* 定位ts与angular */
// const ts = resolveTsServer(options.tsProbeLocations);
// const ng = resolveNgLangSvc(options.ngProbeLocations);

// /* serverhost */
// const host = new ServerHost(); 
//---------------------angular思路---------------


// Create a connection for the server. The connection uses Node's IPC as a transport.
// Also include all preview / proposed LSP features.
const connection1 = new DConnection();
connection1.listen();


// /*
// connection.onDidOpenTextDocument((params) => {
// 	// A text document got opened in VSCode.
// 	// params.textDocument.uri uniquely identifies the document. For documents store on disk this is a file URI.
// 	// params.textDocument.text the initial full content of the document.
// 	connection.console.log(`${params.textDocument.uri} opened.`);
// });
// connection.onDidChangeTextDocument((params) => {
// 	// The content of a text document did change in VSCode.
// 	// params.textDocument.uri uniquely identifies the document.
// 	// params.contentChanges describe the content changes to the document.
// 	connection.console.log(`${params.textDocument.uri} changed: ${JSON.stringify(params.contentChanges)}`);
// });
// connection.onDidCloseTextDocument((params) => {
// 	// A text document got closed in VSCode.
// 	// params.textDocument.uri uniquely identifies the document.
// 	connection.console.log(`${params.textDocument.uri} closed.`);
// });
// */

