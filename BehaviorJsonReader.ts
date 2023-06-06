LIBRARY({
    name: "BehaviorJsonReader",
    version: 2,
    shared: true,
    api: "CoreEngine"
});


namespace BehaviorJsonReader {


    const jsonCache: {[path: string]: any} = {};


    const clearCache = (): void => {
        for(let path in jsonCache){
            delete jsonCache[path];
        }
    }


    Callback.addCallback("LevelLoaded", () => clearCache());
    Callback.addCallback("LevelLeft", () => clearCache());


    export const readJson = (path: string): any => {
        if(path in jsonCache){
            return jsonCache[path] || null;
        }
        const reader = new java.io.BufferedReader(new java.io.FileReader(path));
        const lines: string[] = [];
        let str: string;
        let i: number;
        while(str = reader.readLine()){
            i = str.indexOf("//");
            lines.push(i === -1 ? str : str.slice(0, i));
        }
        reader.close();
        try{
            const json = JSON.parse(lines.join("\n")) || null;
            if(json){
                jsonCache[path] = json;
                return json;
            }
        }
        catch(e){
        }
        return null;
    }

    const getAllJsonPath = (path: string): string[] => {
        const dir = new java.io.File(path);
        const files = dir.listFiles();
        const paths: string[] = [];
        for(let i = 0; i < files.length; i++){
            if(!files[i].isDirectory() && files[i].getName().endsWith(".json")){
                paths.push(files[i].getAbsolutePath());
            }
        }
        return paths;
    }

    export const readListOfJson = (path: string): any[] => {
        const paths = getAllJsonPath(path);
        const list = [];
        let json: any;
        for(let i = 0; i < paths.length; i++){
            json = readJson(paths[i]);
            json && list.push(json);
        }
        return list;
    }

    export const forEachJson = (path: string, callback: (json: any) => void, threads: number = 1): void => {
        const paths = getAllJsonPath(path);
        const max = Math.ceil(paths.length / threads);
        for(let i = 0; i < threads; i++){
            Threading.initThread("processJson_" + i, () => {
                const split = paths.splice(0, max);
                let json: any;
                for(let j = 0; j < split.length; j++){
                    json = readJson(split[j]);
                    json && callback(json);
                }
            });
        }
        let thread: java.lang.Thread;
        for(let i = 0; i < threads; i++){
            thread = Threading.getThread("processJson_" + i);
            thread && thread.join();
        }
    }

    export const getNumericID = (key: string): number => {
        if(!key.startsWith("minecraft:")){
            return 0;
        }
        const key2 = key.slice(("minecraft:").length);
        const array = key2.split("_");
        const slice = array.slice(1);
        let id: number;
        if(array[0] === "block"){
            id = BlockID[slice.join("_")];
            if(id){
                return id;
            }
            let key3 = slice[0];
            for(let i = 1; i < slice.length; i++){
                key3 += slice[i].charAt(0).toUpperCase() + slice[i].slice(1);
            }
            id = BlockID[key3];
            if(id){
                return id;
            }
        }
        if(array[0] === "item"){
            id = ItemID[array.slice(1).join("_")];
            if(id){
                return id;
            }
            let key3 = slice[0];
            for(let i = 1; i < slice.length; i++){
                key3 += slice[i].charAt(0).toUpperCase() + slice[i].slice(1);
            }
            id = ItemID[key3];
            if(id){
                return id;
            }
        }
        return VanillaBlockID[key2] || VanillaItemID[key2] || 0;
    }


    export const convertToItem = (str: string): Tile => {
        const split = str.split(":");
        if(split.length >= 2 && split[0] === "minecraft"){
            const key = split[1].toLowerCase();
            const id: number = VanillaBlockID[key] || VanillaItemID[key];
            if(id){
                return {id: id, data: +split[2] || -1};
            }
        }
        return null;
    }

    /*
    private static potionMeta = {

    } as const;

    static convertToItemForPotion(str: string): Tile {
        const suffix = "minecraft:potion_type:";
        if(str.startsWith(suffix)){

        }

        const split = str.split(":");
        if(split.length >= 2 && split[0] === "minecraft"){
            const key = split[1].toLowerCase();
            const id: number = VanillaBlockID[key] || VanillaItemID[key];
            const data: number = this.potionMeta[split[2]];
            if(id){
                return {id: id, data: +split[2] || -1};
            }
        }
        return null;
    }
    */

}


EXPORT("BehaviorJsonReader", BehaviorJsonReader);