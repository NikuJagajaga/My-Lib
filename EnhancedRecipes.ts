LIBRARY({
    name: "EnhancedRecipes",
    version: 6,
    shared: false,
    api: "CoreEngine"
});

try{
    IMPORT("BlockEngine", "IDConverter");
}
catch(e){

}


type VanillaID = keyof typeof VanillaBlockID | keyof typeof VanillaItemID;

declare namespace IDConverter {
    export function getIDData(stringId: string): {id: number, data: number};
}


namespace Recipes2 {

    type argItem = number | VanillaID | {id: number | VanillaID, count?: number, data?: number};

    const getIDData = (stringId: string): {id: number, data: number} => {
        if(IDConverter){
            return IDConverter.getIDData(stringId);
        }
        return {id: VanillaItemID[stringId] || VanillaBlockID[stringId], data: 0};
    }

    class ItemInstanceClass implements ItemInstance {

        readonly id: number;
        readonly count: number;
        readonly data: number;

        constructor(arg: argItem, defData: number){
            let pair: {id: number, data: number};
            switch(typeof arg){
                case "number":
                    this.id = arg;
                    this.count = 1;
                    this.data = defData;
                    break;
                case "string":
                    pair = getIDData(arg);
                    this.id = pair.id;
                    this.count = 1;
                    this.data = pair.data;
                    break;
                default:
                    if(typeof arg.id === "string"){
                        pair = getIDData(arg.id);
                        this.id = pair.id;
                        this.data = arg.data ?? pair.data;
                    }
                    else{
                        this.id = arg.id;
                        this.data = arg.data ?? defData;
                    }
                    this.count = arg.count ?? 1;
            }
        }

    }

    export class SourceItem extends ItemInstanceClass {
        constructor(arg: argItem){
            super(arg, -1);
        }
    }

    export class ResultItem extends ItemInstanceClass {
        constructor(arg: argItem){
            super(arg, 0);
        }
    }

    export function addShaped(result: argItem, mask: string | string[], sources: {[c: string]: argItem}, onCrafting?: Recipes.CraftingFunction): void {
        const array: (string | number)[] = [];
        let source: SourceItem;
        for(let char in sources){
            source = new SourceItem(sources[char]);
            array.push(char, source.id, source.data);
        }
        Recipes.addShaped(new ResultItem(result), typeof mask === "string" ? mask.split(":") : mask, array, onCrafting);
    }

    export function addShapeless(result: argItem, sources: argItem[], onCrafting?: Recipes.CraftingFunction): void {
        const array: {id: number, data: number}[] = [];
        let source: SourceItem;
        let n = 0;
        for(let i = 0; i < sources.length; i++){
            source = new SourceItem(sources[i]);
            for(n = 0; n < source.count; n++){
                array.push({id: source.id, data: source.data});
            }
        }
        Recipes.addShapeless(new ResultItem(result), array, onCrafting);
    }

    export function deleteRecipe(result: argItem): void {
        Recipes.deleteRecipe(new ResultItem(result));
    }

    export function addFurnace(source: argItem, result: argItem, prefix?: string): void {
        const sourceItem = new SourceItem(source);
        const resultItem = new ResultItem(result);
        Recipes.addFurnace(sourceItem.id, sourceItem.data, resultItem.id, resultItem.data, prefix);
    }

    export function removeFurnaceRecipe(source: argItem): void {
        const sourceItem = new SourceItem(source);
        Recipes.removeFurnaceRecipe(sourceItem.id, sourceItem.data);
    }

    export function addFurnaceFuel(fuel: argItem, time: number): void {
        const sourceItem = new SourceItem(fuel);
        Recipes.addFurnaceFuel(sourceItem.id, sourceItem.data, time);
    }

    export function removeFurnaceFuel(fuel: argItem): void {
        const sourceItem = new SourceItem(fuel);
        Recipes.removeFurnaceFuel(sourceItem.id, sourceItem.data);
    }

    export function getFurnaceRecipeResult(source: argItem, prefix?: string): ItemInstance {
        const sourceItem = new SourceItem(source);
        return Recipes.getFurnaceRecipeResult(sourceItem.id, sourceItem.data, prefix);
    }

    export function getFuelBurnDuration(fuel: argItem): number {
        const sourceItem = new SourceItem(fuel);
        return Recipes.getFuelBurnDuration(sourceItem.id, sourceItem.data);
    }

}


EXPORT("Recipes2", Recipes2);