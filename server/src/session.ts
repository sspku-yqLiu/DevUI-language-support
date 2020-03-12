import {
	createConnection,
	ProposedFeatures,
	Connection,
	InitializeParams,
	RequestHandler,
	InitializeResult,
	TextDocuments,
	DidChangeConfigurationNotification,
	DidChangeConfigurationParams,
	TextDocument,
	Diagnostic,
	DiagnosticSeverity,
	DidChangeWatchedFilesParams,
	TextDocumentPositionParams,
	CompletionItem,
	DidCloseTextDocumentParams,
	DidChangeTextDocumentParams,
	DidOpenTextDocumentParams,
	TextDocumentSyncKind,
	CompletionParams
} from 'vscode-languageserver';
import { DevUIhtmlSyntaxes } from './libs/DevUIhtmlSyntaxes';
// import { uriToFilePath } from 'vscode-languageserver/lib/files';
import { ProjectService } from './project_service';
import { ServerHost } from './server_host';
import { Logger } from './logger';
import * as ts from 'typescript/lib/tsserverlibrary';
import { projectLoadingNotification } from './protocol';
import { tsDiagnosticToLspDiagnostic } from './diagnostic';
import { filePathToUri, lspPositionToTsPosition, lspRangeToTsPositions, tsTextSpanToLspRange, uriToFilePath } from './utils';
// import {tsCompletionEntryToLspCompletionItem} from './completion';
let documents: TextDocuments = new TextDocuments();
let hasConfigurationCapability: boolean = false;
let hasWorkspaceFolderCapability: boolean = false;
let hasDiagnosticRelatedInformationCapability: boolean = false;
const DevUIwords = DevUIhtmlSyntaxes;

export interface SessionOptions {
	host: ServerHost;
	logger: Logger;
	ngProbeLocation: string;
}
//诊断接口
interface ExampleSettings {
	maxNumberOfProblems: number;
}

const defaultSettings: ExampleSettings = { maxNumberOfProblems: 1 };
let globalSettings: ExampleSettings = defaultSettings;
let documentSettings: Map<string, Thenable<ExampleSettings>> = new Map();


export class Session {
	private readonly connection: Connection;
	private readonly projectService: ProjectService;
	private diagnosticsTimeout: NodeJS.Timeout | null = null;
	private isProjectLoading = false;
	constructor(options: SessionOptions) {
		this.connection = createConnection(ProposedFeatures.all);
		this.addProtocolHandlers(this.connection);
		this.projectService = new ProjectService({
			host: options.host,
			logger: options.logger,
			cancellationToken: ts.server.nullCancellationToken,
			useSingleInferredProject: true,
			useInferredProjectPerProjectRoot: true,
			typingsInstaller: ts.server.nullTypingsInstaller,
			suppressDiagnosticEvents: false,
			eventHandler: (e) => this.handleProjectServiceEvent(e),
			globalPlugins: ['@angular/language-service'],
			pluginProbeLocations: [options.ngProbeLocation],
			allowLocalPluginLoads: false,  // do not load plugins from tsconfig.json
		});
	}
	private addProtocolHandlers(c: Connection) {
		c.onInitialize(p => this.onInitalize(p));
		c.onInitialized(() => this.onInitalized());
		c.onDidChangeConfiguration(p => this.onDidChangeConfiguration(p));
		c.onDidChangeWatchedFiles(p => this.onDidChangeWatchedFiles(p));
		c.onCompletion(p => this.onCompletion(p));
		c.onCompletionResolve(p => this.onCompletionResolve(p));
		c.onDidChangeTextDocument(p => this.onDidChangeTextDocument(p));
		c.onDidCloseTextDocument(p => this.onDidCloseTextDocument(p));
		c.onDidOpenTextDocument(p => this.onDidOpenTextDocument(p));
	}
	/*
	* An event handler that gets invoked whenever the program changes and
	* TS ProjectService sends `ProjectUpdatedInBackgroundEvent`. This particular
	* event is used to trigger diagnostic checks.
	* @param event
	*/
	private handleProjectServiceEvent(event: ts.server.ProjectServiceEvent) {
		switch (event.eventName) {
			case ts.server.ProjectLoadingStartEvent:
				this.isProjectLoading = true;
				this.connection.sendNotification(projectLoadingNotification.start);
				break;
			case ts.server.ProjectLoadingFinishEvent: {
				const { project } = event.data;
				// Disable language service if project is not Angular
				/* Disable if cannot find DevUI*/
				this.checkIsAngularProject(project);
				if (this.isProjectLoading) {
					this.isProjectLoading = false;
					this.connection.sendNotification(projectLoadingNotification.finish);
				}
				break;
			}
			case ts.server.ProjectsUpdatedInBackgroundEvent:
				// ProjectsUpdatedInBackgroundEvent is sent whenever diagnostics are
				// requested via project.refreshDiagnostics()
				this.triggerDiagnostics(event.data.openFiles);
				break;
		}
	}
	private triggerDiagnostics(openFiles: string[], delay: number = 200) {
		// Do not immediately send a diagnostics request. Send only after user has
		// stopped typing after the specified delay.
		if (this.diagnosticsTimeout) {
			// If there's an existing timeout, cancel it
			clearTimeout(this.diagnosticsTimeout);
		}
		// Set a new timeout
		this.diagnosticsTimeout = setTimeout(() => {
			this.diagnosticsTimeout = null;  // clear the timeout
			this.sendPendingDiagnostics(openFiles);
			// Default delay is 200ms, consistent with TypeScript. See
			// https://github.com/microsoft/vscode/blob/7b944a16f52843b44cede123dd43ae36c0405dfd/extensions/typescript-language-features/src/features/bufferSyncSupport.ts#L493)
		}, delay);
	}
	private sendPendingDiagnostics(openFiles: string[]) {
		for (const fileName of openFiles) {
			const scriptInfo = this.projectService.getScriptInfo(fileName);
			if (!scriptInfo) {
				continue;
			}

			const ngLS = this.projectService.getDefaultLanguageService(scriptInfo);
			if (!ngLS) {
				continue;
			}

			const diagnostics = ngLS.getSemanticDiagnostics(fileName);
			// Need to send diagnostics even if it's empty otherwise editor state will
			// not be updated.
			this.connection.sendDiagnostics({
				uri: filePathToUri(fileName),
				diagnostics: diagnostics.map(d => tsDiagnosticToLspDiagnostic(d, scriptInfo)),
			});
		}
	}
	private onInitalize(params: InitializeParams): InitializeResult {
		let capabilities = params.capabilities;

		// Does the client support the `workspace/configuration` request?
		// If not, we will fall back using global settings
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

		return {
			capabilities: {
				textDocumentSync: TextDocumentSyncKind.Incremental,
				// Tell the client that the server supports code completion
				completionProvider: {
					resolveProvider: true,
					triggerCharacters: ['<', '.', '*', '[', '(', '$', '|']
				},
				definitionProvider: true,
				hoverProvider: true,
			}
		};
	}
	private onInitalized() {
		if (hasConfigurationCapability) {
			// Register for all configuration changes.
			this.connection.client.register(DidChangeConfigurationNotification.type, undefined);
		}
		if (hasWorkspaceFolderCapability) {
			this.connection.workspace.onDidChangeWorkspaceFolders(_event => {
				this.connection.console.log('Workspace folder change event received.');
			});
		}
	}
	private onDidChangeConfiguration(change: DidChangeConfigurationParams) {
		if (hasConfigurationCapability) {
			// Reset all cached document settings
			documentSettings.clear();
		} else {
			globalSettings = <ExampleSettings>(
				(change.settings.languageServerExample || defaultSettings)
			);
		}

		// Revalidate all open text documents
		documents.all().forEach(this.validateTextDocument);
	}

	private async  validateTextDocument(textDocument: TextDocument): Promise<void> {
		// In this simple example we get the settings for every validate run.
		let settings = await this.getDocumentSettings(textDocument.uri);

		// The validator creates diagnostics for all uppercase words length 2 and more
		let text = textDocument.getText();
		let pattern = /\b[A-Z]{2,}\b/g;
		let m: RegExpExecArray | null;

		let problems = 0;
		let diagnostics: Diagnostic[] = [];
		while ((m = pattern.exec(text)) && problems < settings.maxNumberOfProblems) {
			problems++;
			console.log(problems);
			let diagnostic: Diagnostic = {
				severity: DiagnosticSeverity.Warning,
				range: {
					start: textDocument.positionAt(m.index),
					end: textDocument.positionAt(m.index + m[0].length)
				},
				message: `${m[0]} is all uppercase.`,
				source: 'ex'
			};
			if (hasDiagnosticRelatedInformationCapability) {
				diagnostic.relatedInformation = [
					{
						location: {
							uri: textDocument.uri,
							range: Object.assign({}, diagnostic.range)
						},
						message: 'Spelling matters'
					},
					{
						location: {
							uri: textDocument.uri,
							range: Object.assign({}, diagnostic.range)
						},
						message: 'Particularly for names'
					}
				];
			}
			diagnostics.push(diagnostic);
		}

		// Send the computed diagnostics to VSCode.
		this.connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
	}
	private getDocumentSettings(resource: string): Thenable<ExampleSettings> {
		if (!hasConfigurationCapability) {
			return Promise.resolve(globalSettings);
		}
		let result = documentSettings.get(resource);
		if (!result) {
			result = this.connection.workspace.getConfiguration({
				scopeUri: resource,
				section: 'languageServerExample'
			});
			documentSettings.set(resource, result);
		}
		return result;
	}
	private onDidChangeWatchedFiles(_change: DidChangeWatchedFilesParams) {
		this.connection.console.log('We received an file change event');
	}
	/* 自动补全代码 */
	// private onCompletion(_textDocumentPosition: TextDocumentPositionParams): CompletionItem[]{
	// 	return DevUIwords;
	// }
	private onCompletion(params: CompletionParams) {
		return DevUIhtmlSyntaxes;
		//textDocument是文件的uri.
	// 	const { position, textDocument } = params;
	// 	const filePath = uriToFilePath(textDocument.uri);
	// 	if (!filePath) {
	// 		return;
	// 	}
	// 	const scriptInfo = this.projectService.getScriptInfo(filePath);
	// 	if (!scriptInfo) {
	// 		return;
	// 	}
	// 	/* 如果他是一个html文件 */ 
	// 	if(scriptInfo.scriptKind == 5)
	// 		return DevUIhtmlSyntaxes;
	// 	const { fileName } = scriptInfo;
	// 	/* 开启默认语言服务 */ 
	// 	const langSvc = this.projectService.getDefaultLanguageService(scriptInfo);
	// 	if (!langSvc) {
	// 		return;
	// 	}
	// 	const offset = lspPositionToTsPosition(scriptInfo, position);
	// 	const completions = langSvc.getCompletionsAtPosition(
	// 		fileName, offset,
	// 		{
	// 			// options
	// 		});
	// 	if (!completions) {
	// 		return;
	// 	}
	// 	// return completions.entries.map(
	// 	// 	(e) => tsCompletionEntryToLspCompletionItem(e, position, scriptInfo));
	}




	private onCompletionResolve(item: CompletionItem): CompletionItem {
		if (item.data === 1) {
			item.detail = 'TypeScript details';
			item.documentation = 'TypeScript documentation';
		} else if (item.data === 2) {
			item.detail = 'JavaScript details';
			item.documentation = 'JavaScript documentation';
		}
		return item;
	}
	listen() {
		this.connection.listen();
	}
	private onDidOpenTextDocument(params: DidOpenTextDocumentParams) {
		// A text document got opened in VSCode.
		// params.textDocument.uri uniquely identifies the document. For documents store on disk this is a file URI.
		// params.textDocument.text the initial full content of the document.
		this.connection.console.log(`${params.textDocument.uri} opened.`);
	}
	private onDidChangeTextDocument(params: DidChangeTextDocumentParams) {
		// The content of a text document did change in VSCode.
		// params.textDocument.uri uniquely identifies the document.
		// params.contentChanges describe the content changes to the document.
		this.connection.console.log(`${params.textDocument.uri} changed: ${JSON.stringify(params.contentChanges)}`);
	}
	private onDidCloseTextDocument(params: DidCloseTextDocumentParams) {
		// A text document got closed in VSCode.
		// params.textDocument.uri uniquely identifies the document.
		this.connection.console.log(`${params.textDocument.uri} closed.`);
	}
	private checkIsAngularProject(project: ts.server.Project) {
		const NG_CORE = '@angular/core/core.d.ts';
		const { projectName } = project;
		if (!project.languageServiceEnabled) {
			const msg = `Language service is already disabled for ${projectName}. ` +
				`This could be due to non-TS files that exceeded the size limit (${
				ts.server.maxProgramSizeForNonTsFiles} bytes).` +
				`Please check log file for details.`;
			this.connection.console.info(msg);  // log to remote console to inform users
			project.log(msg);  // log to file, so that it's easier to correlate with ts entries
			return;
		}
		if (!isAngularProject(project, NG_CORE)) {
			project.disableLanguageService();
			const totalFiles = project.getFileNames().length;
			const msg =
				`Disabling language service for ${projectName} because it is not an Angular project. ` +
				`There are ${totalFiles} files in the project but '${NG_CORE}' is not detected.`;
			this.connection.console.info(msg);
			project.log(msg);
			if (project.getExcludedFiles().some(f => f.endsWith(NG_CORE))) {
				const msg =
					`Please check your tsconfig.json to make sure 'node_modules' directory is not excluded.`;
				this.connection.console.info(msg);
				project.log(msg);
			}
		}
	}

}
/**
 * Return true if the specified `project` contains the Angular core declaration.
 * @param project
 * @param ngCore path that uniquely identifies `@angular/core`.
 */
function isAngularProject(project: ts.server.Project, ngCore: string): boolean {
	project.markAsDirty();  // Must mark project as dirty to rebuild the program.
	if (project.isNonTsProject()) {
		return false;
	}
	for (const fileName of project.getFileNames()) {
		if (fileName.endsWith(ngCore)) {
			return true;
		}
	}
	return false;
}


