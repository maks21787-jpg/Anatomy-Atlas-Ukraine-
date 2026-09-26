import {fileURLToPath} from 'node:url';
import {defineConfig,type Plugin} from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/postcss';
const path=(relative:string)=>fileURLToPath(new URL(relative,import.meta.url));
const BUILD=new Date().toISOString().slice(0,16).replace('T',' ')+' UTC';
/** Writes version.json next to the page, so an open or cached copy can tell that a newer build is published. */
const version:Plugin={name:'atlas-version',generateBundle(){this.emitFile({type:'asset',fileName:'version.json',source:JSON.stringify({build:BUILD})});}};
export default defineConfig({base:'./',define:{__BUILD__:JSON.stringify(BUILD)},root:path('./web'),publicDir:path('./public'),plugins:[react(),version],resolve:{alias:{'@':path('./')}},css:{postcss:{plugins:[tailwindcss()]}},server:{watch:{usePolling:true}},build:{outDir:path('./dist'),emptyOutDir:true}});
