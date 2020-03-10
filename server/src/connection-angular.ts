/*
 * @Author: your name
 * @Date: 2020-03-09 18:39:51
 * @LastEditTime: 2020-03-09 18:39:51
 * @LastEditors: Please set LastEditors
 * @Description: In User Settings Edit
 * @FilePath: \DevUI-Language-Support\server\src\connection.ts
 */
import * as ts from 'typescript';
import * as lsp from 'vscode-languageserver';
import { uriToFilePath } from 'vscode-languageserver/lib/files';
import {ProjectService} from './project_service';

export interface ConnectionOptions{
	// host: ServerHost;
	// logger: Logger;
	ngProbeLocation: string;
}
enum LanguageId{
	TS = 'typeScript',
	HTML = 'html'
}

const EMPTY_RANGE = lsp.Range.create(0,0,0,0);
let documents: lsp.TextDocuments = new lsp.TextDocuments();
let hasConfigurationCapability: boolean = false;
let hasWorkspaceFolderCapability: boolean = false;
let hasDiagnosticRelatedInformationCapability: boolean = false;

export class Connection{
	private readonly connection :lsp.Connection;
	// private readonly projectService: ProjectService;

	constructor(options:ConnectionOptions){
		this.connection = lsp.createConnection(lsp.ProposedFeatures.all);
		this.addProtocolHandlers(this.connection);
		// this.projectService = new ProjectService({
		// 	// host: options.host,
		// 	// logger: options.logger,
		// 	// cancellationToken: ts.server.nullCancellationToken,
		// 	// useSingleInferredProject: true,
		// 	// useInferredProjectPerProjectRoot: true,
		// 	// typingsInstaller: ts.server.nullTypingsInstaller,
		// 	suppressDiagnosticEvents: false,
		// 	eventHandler: (e) => this.handleProjectServiceEvent(e),
		// 	globalPlugins: ['@angular/language-service'],
		// 	pluginProbeLocations: [options.ngProbeLocation],
		// 	allowLocalPluginLoads: false,
		// });
	}

	private addProtocolHandlers(c :lsp.Connection) {
		c.onInitialize(p=> this.onInitialize(p));
		c.onInitialized(()=>this.onIntialized());
		// c.onDidOpenTextDocument(p=> this.onDidOpenTextDocument(p));
		
	}
	//初始化
	private onInitialize(params : lsp.InitializeParams) : lsp.InitializeResult{
		// Does the client support the `workspace/configuration` request?
		// If not, we will fall back using global settings
		let capabilities = params.capabilities;
		hasConfigurationCapability = !!(
			capabilities.workspace && !!capabilities.workspace.configuration
		);
		hasWorkspaceFolderCapability = !!(
			capabilities.workspace && !!capabilities.workspace.workspaceFolders
		);
		hasDiagnosticRelatedInformationCapability = !!(
			capabilities.textDocument &&
			capabilities.textDocument.publishDiagnostics &&
			capabilities.textDocument.publishDiagnostics.relatedInformation
		);
		return{
			capabilities:{
				//定义同步类型
				textDocumentSync:lsp.TextDocumentSyncKind.Incremental,
				completionProvider:{
					//附加信息？
					resolveProvider:false,
					triggerCharacters:['<','.','*','[','(','$','|']
				},
				definitionProvider : true,
				hoverProvider:true,
			},
		};
	}
	private onIntialized(){
		if (hasConfigurationCapability) {
			// Register for all configuration changes.
			this.connection.client.register(lsp.DidChangeConfigurationNotification.type, undefined);
		}
		if (hasWorkspaceFolderCapability) {
			this.connection.workspace.onDidChangeWorkspaceFolders(_event => {
				this.connection.console.log('Workspace folder change event received.');
			});
		}
	}
	// private onDidOpenTextDocument(params:lsp.DidOpenTextDocumentParams){
	// 	const {uri,languageId,text}=params.textDocument;
	// 	const filePath = uriToFilePath(uri);
	// 	if(!filePath){
	// 		return;
	// 	}
	// 	//校验文件类型
	// 	const scriptKind = languageId=== LanguageId.TS? ts.ScriptKind.TS:ts.ScriptKind.External;
	// 	try{
	// 		// const result = this.projectService.open
	// 		// const {configFileName , configFileErrors} = result;
	// 	}
		
	// }

	

}