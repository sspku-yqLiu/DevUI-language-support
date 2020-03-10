import * as ts from'typescript/lib/tsserverlibrary';
export class ProjectService{
	private readonly tsProjSvc: ts.server.ProjectService;
	constructor(options:ts.server.ProjectServiceOptions){
		this.tsProjSvc = new ts.server.ProjectService(options);

		this.tsProjSvc.setHostConfiguration({
			formatOptions:this.tsProjSvc.getHostFormatCodeOptions(),
			extraFileExtensions :[
				{
					extension:'.html',
					isMixedContent: false,
					scriptKind: ts.ScriptKind.External,
				},
			],
		});
		this.tsProjSvc.configurePlugin({
			pluginName:'ng-devui',
			configuration:{
				angularOnly:true,
			},
		});
	}
	/**
	 * Open file whose contents is managed by the client
	 * @param filename is absolute pathname
	 * @param fileContent is a known version of the file content that is more up to date than the one on disk
	 */
	openclientFile(fileName:string,fileContent?:string, scriptKind?:ts.ScriptKind,
		projectRootPath?:string):ts.server.OpenConfiguredProjectResult{
			return this.tsProjSvc.openClientFile(fileName,fileContent,scriptKind,projectRootPath);
	}
	/**
	 * Close file whose contents is managed by the client
	 * @param filename is absolute pathname
	 */
	closeClientFile(uncheckedFileName: string):void{
		return this.tsProjSvc.closeClientFile(uncheckedFileName);
	}
	findProject(projectName: string): ts.server.Project | undefined{
		return this.tsProjSvc.findProject(projectName)
	}
	getScriptInfo(uncheckedFileName: string): ts.server.ScriptInfo | undefined{
		return this.tsProjSvc.getScriptInfo(uncheckedFileName)
	}
	getDefaultProjectForScriptInfo(scriptInfo:ts.server.ScriptInfo):ts.server.Project|undefined{
		let project =this.tsProjSvc.getDefaultProjectForFile(
			scriptInfo.fileName,
			false
		);
		if (!project || project.projectKind !== ts.server.ProjectKind.Configured) {
			const {configFileName} = this.tsProjSvc.openClientFile(scriptInfo.fileName);
			if (!configFileName) {
			// Failed to find a config file. There is nothing we could do.
			return;
		}
		project = this.tsProjSvc.findProject(configFileName);
		if (!project) {
			return;
		}
		scriptInfo.detachAllProjects();
		scriptInfo.attachToProject(project);
		}
		return project;
	}
	
		/**
		 * Returns a language service for a default project created for the specified `scriptInfo`. If the
		 * project does not support a language service, nothing is returned.
		 */
		getDefaultLanguageService(scriptInfo: ts.server.ScriptInfo): ts.LanguageService|undefined {
		const project = this.getDefaultProjectForScriptInfo(scriptInfo);
		if (!project?.languageServiceEnabled) return;
		return project.getLanguageService();
	}
}
