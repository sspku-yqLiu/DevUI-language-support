/*
 * @Author: your name
 * @Date: 2020-03-14 15:20:18
 * @LastEditTime: 2020-03-14 15:21:30
 * @LastEditors: your name
 * @Description: In User Settings Edit
 * @FilePath: \DevUI-Language-Support\server\src\banner.ts
 */
import {parseCommandLine} from './cmdline_utils';
import {resolveTsServer} from './version_provider';

/**
 * This method provides a custom implementation for the AMD loader to resolve
 * `typescript` module at runtime.
 * @param modules modules to resolve
 * @param cb function to invoke with resolved modules
 */
export function define(modules: string[], cb: (...modules: any[]) => void) {
  const TSSERVER = 'typescript/lib/tsserverlibrary';
  const resolvedModules = modules.map(m => {
    if (m === 'typescript') {
      throw new Error(`Import '${TSSERVER}' instead of 'typescript'`);
    }
    if (m === TSSERVER) {
      const {tsProbeLocations} = parseCommandLine(process.argv);
      m = resolveTsServer(tsProbeLocations).resolvedPath;
    }
    return require(m);
  });
  cb(...resolvedModules);
}
