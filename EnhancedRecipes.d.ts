declare namespace Recipes2 {
    function addShaped(result: number | ItemInstance2, mask: string, source: {[key: string]: number | ItemInstance2}, func?: (api?: any, field?: ItemInstance[]) => void): void;
    function addShapeless(result: number | ItemInstance2, source: (number | ItemInstance2)[], func?: (api?: any, field?: ItemInstance[]) => void): void;
    function addShapedWith2x2(result: string | ItemInstance3, mask: string, source: {[key: string]: string | ItemInstance3}, name?: string): void;
    function addShapelessWith2x2(result: string | ItemInstance3, source: (string | ItemInstance3)[], name?: string): void;
}