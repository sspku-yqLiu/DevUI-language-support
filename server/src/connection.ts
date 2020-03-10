import{createConnection, 
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
		CompletionItem} from 'vscode-languageserver';
import {DevUIhtmlSyntaxes} from './DevUIhtmlSyntaxes';

let documents: TextDocuments = new TextDocuments();
let hasConfigurationCapability: boolean = false;
let hasWorkspaceFolderCapability: boolean = false;
let hasDiagnosticRelatedInformationCapability: boolean = false;
const DevUIwords = DevUIhtmlSyntaxes;

interface ExampleSettings {
	maxNumberOfProblems: number;
}
const defaultSettings: ExampleSettings = { maxNumberOfProblems: 1 };
let globalSettings: ExampleSettings = defaultSettings;
let documentSettings: Map<string, Thenable<ExampleSettings>> = new Map();
export class DConnection{
	private connection :Connection;
	constructor(){
		this.connection = createConnection(ProposedFeatures.all);
		this.addProtocolHandlers(this.connection);

	}
	private addProtocolHandlers(c:Connection ){
		c.onInitialize(p=>this.onInitalize(p));
		c.onInitialized(()=>this.onInitalized());
		c.onDidChangeConfiguration(p=>this.onDidChangeConfiguration(p));
		c.onDidChangeWatchedFiles(p=>this.onDidChangeWatchedFiles(p));
		c.onCompletion(p=>this.onCompletion(p));
		c.onCompletionResolve(p=>this.onCompletionResolve(p));
	}
	private onInitalize(params: InitializeParams) : InitializeResult{
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
				textDocumentSync: documents.syncKind,
				// Tell the client that the server supports code completion
				completionProvider: {
					resolveProvider: true
				}
			}
		};
	}
	private onInitalized(){
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
	private onDidChangeConfiguration(change:DidChangeConfigurationParams){
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
	private onDidChangeWatchedFiles(_change:DidChangeWatchedFilesParams){
		this.connection.console.log('We received an file change event');
	}
	/* 自动补全代码 */
	private onCompletion(_textDocumentPosition: TextDocumentPositionParams): CompletionItem[]{
		return DevUIwords;
	}
	private onCompletionResolve(item: CompletionItem): CompletionItem{
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

}


