/*
 * @Author: your name
 * @Date: 2020-03-10 08:55:52
 * @LastEditTime: 2020-03-13 21:37:35
 * @LastEditors: your name
 * @Description: In User Settings Edit
 * @FilePath: \DevUi-language-support\server\src\project_service.ts
 */
/**
 * 在这个文件中我们将对原生的projectservice进行
 * 一些包装，以帮助我们更好的使用服务
 */
import * as ts from'typescript/lib/tsserverlibrary';
export class ProjectService{
	private readonly tsProjSvc: ts.server.ProjectService;
	constructor(options:ts.server.ProjectServiceOptions){
		this.tsProjSvc = new ts.server.ProjectService(options);
		/* 设置host */
		this.tsProjSvc.setHostConfiguration({
			/* 这个地方对输入格式进行了设置。这个地方是使用了上面注册的设置 */ 
			formatOptions:this.tsProjSvc.getHostFormatCodeOptions(),
			/* 设定额外支持的类，这里面是从ts向html进行扩展 */ 
			extraFileExtensions :[
				{
					extension:'.html',
					isMixedContent: false,
					scriptKind: ts.ScriptKind.External,
				},
			],
		});
		/*注册注入*/ 
		// this.tsProjSvc.configurePlugin({
		// 	pluginName:'ng-devui/language-service',
		// 	configuration:{
		// 		ngdevuiOnly:true,
		// 	},
		// });
	}
	/**
	 * Open file whose contents is managed by the client
	 * @param filename is absolute pathname
	 * @param fileContent is a known version of the file content that is more up to date than the one on disk
	 */
	openClientFile(fileName:string,fileContent?:string, scriptKind?:ts.ScriptKind,
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
		return this.tsProjSvc.findProject(projectName);
	}
	getScriptInfo(uncheckedFileName: string): ts.server.ScriptInfo | undefined{
		return this.tsProjSvc.getScriptInfo(uncheckedFileName);
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
