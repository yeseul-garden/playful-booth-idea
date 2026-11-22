import {cp,mkdir,rm,readFile,writeFile} from 'node:fs/promises';
await mkdir(new URL('../public/integrations/',import.meta.url),{recursive:true});
await cp(new URL('../integrations/google-apps-script/',import.meta.url),new URL('../public/integrations/',import.meta.url),{recursive:true});
await mkdir(new URL('../public/setup/',import.meta.url),{recursive:true});
await writeFile(new URL('../public/setup/index.html',import.meta.url),(await readFile(new URL('../public/setup.html',import.meta.url),'utf8')).replace('<head>','<head><base href="../">'));
await rm(new URL('../dist/',import.meta.url),{recursive:true,force:true});
await cp(new URL('../public/',import.meta.url),new URL('../dist/',import.meta.url),{recursive:true});
console.log('Built standalone static site: dist/ (configurable column reader included).');
