LIBRARY({
    name: "WindowMaker",
    version: 1,
    shared: true,
    api: "CoreEngine"
});


const Bitmap = android.graphics.Bitmap;
const Canvas = android.graphics.Canvas;
const Color = android.graphics.Color;

type Container = NativeTileEntity | UI.Container | ItemContainer;
type TouchEventType = "DOWN" | "UP" | "MOVE" | "CLICK" | "LONG_CLICK" | "CANCEL";

interface TouchEvent {
    x: number,
    y: number,
    localX: number,
    localY: number,
    type: TouchEventType,
    preparePosition: (win: UI.Window, rect: android.graphics.Rect) => void
}

const Math_clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

const FrameTex = UI.FrameTextureSource.get("workbench_frame3");
const FrameTexCentralColor = FrameTex.getCentralColor();

const McFontPaint = new android.graphics.Paint();
McFontPaint.setTypeface(WRAP_JAVA("com.zhekasmirnov.innercore.utils.FileTools").getMcTypeface());
McFontPaint.setTextSize(16);

const createHighlightBmp = (w: number, h: number): android.graphics.Bitmap => {
    const bitmap = new Bitmap.createBitmap(w | 0, h | 0, Bitmap.Config.ARGB_8888);
    const canvas = new Canvas(bitmap);
    canvas.drawARGB(127, 255, 255, 255);
    return bitmap.copy(Bitmap.Config.ARGB_8888, true);
}

const WINDOW_OVL = "_wmOvl";
const FRAME_DETECTION = "_wmDetection";
const TOOLTIP_TEXT ="_wmText";
const TOOLTIP_FRAME ="_wmFrame";
const TOOLTIP_HIGHLIGHT ="_wmHighlight";
const THREAD_WM = "WM_showTooltip";


class WindowMaker {

    static readonly SCALE_RIGHT = 0;
    static readonly SCALE_UP = 1;
    static readonly SCALE_LEFT = 2;
    static readonly SCALE_DOWN = 3;

    readonly width: number;
    readonly height: number;
    readonly ratio: number;
    readonly frame: string;
    z: number;

    readonly content: UI.WindowContent;
    readonly drawingMap: {[key: string]: UI.DrawingElements};

    winOvl: UI.Window;
    winBase: UI.StandardWindow;

    withTooltip: boolean;


    constructor(title: string, width: number, height: number, frame?: string){

        this.width = width;
        this.height = height;
        this.ratio = 1000 / width;
        this.frame = frame || "classic_frame_bg_light";
        this.z = 0;

        this.content = {
            standard: {
                header: {
                    text: {text: title, /*font: {color: Color.DKGRAY, size: 16}*/},
                    height: 60
                },
                inventory: {standard: true},
                background: {standard: true}
            },
            drawing: [
                {type: "frame", x: 0, y: 0, width: 1000, height: height / width * 1000, bitmap: this.frame, scale: this.ratio}
            ],
            elements: {}
        };

        this.drawingMap = {};

    }

    enableTooltip(enable: boolean): this {
        this.withTooltip = enable;
        return this;
    }

    /**
     * @param io Specify the slot and tank to be used in the Recipe Viewer window by name.
     * @param drawings Specify the elements and drawing to be used in the Recipe Viewer window by name.
     *
     */
    getContentForRV(io: {input?: string[], output?: string[], inputLiq?: string[], outputLiq?: string[]}, other?: string[]): UI.WindowContent {

        const content: UI.WindowContent = {
            drawing: [
                {type: "frame", x: 0, y: 0, width: 1000, height: this.height / this.width * 1000, bitmap: this.frame, scale: this.ratio}
            ],
            elements: {}
        };

        if(io.input){
            for(let i = 0; i < io.input.length; i++){
                content.elements["input" + i] = this.content.elements[io.input[i]];
            }
        }

        if(io.output){
            for(let i = 0; i < io.output.length; i++){
                content.elements["output" + i] = this.content.elements[io.output[i]];
            }
        }

        if(io.inputLiq){
            for(let i = 0; i < io.inputLiq.length; i++){
                content.elements["inputLiq" + i] = this.content.elements[io.inputLiq[i]];
            }
        }

        if(io.outputLiq){
            for(let i = 0; i < io.outputLiq.length; i++){
                content.elements["outputLiq" + i] = this.content.elements[io.outputLiq[i]];
            }
        }

        if(other){
            for(let key in this.drawingMap){
                if(other.indexOf(key) != -1){
                    content.drawing.push(this.drawingMap[key]);
                }
            }
            for(let key in this.content.elements){
                if(other.indexOf(key) != -1){
                    content.elements[key] = this.content.elements[key];
                }
            }
        }

        return content;
    }


    protected adjustScale(elem: UI.DrawingElements | UI.Elements): void {
        if("x" in elem) elem.x *= this.ratio;
        if("y" in elem) elem.y *= this.ratio;
        if("width" in elem) elem.width *= this.ratio;
        if("height" in elem) elem.height *= this.ratio;
        if("size" in elem) elem.size *= this.ratio;
        if("font" in elem && "size" in elem.font) elem.font.size *= this.ratio;
        elem["scale"] = "scale" in elem ? elem["scale"] * this.ratio : this.ratio;
    }


    getWidth(): number {
        return this.width;
    }

    getHeight(): number {
        return this.height;
    }


    /**
     *
     * @param name You can also name the drawing. If you are lazy, you can use an empty string.
     * @param drawing
     * @returns
     */
    addDrawing(name: string, drawing: UI.DrawingElements): this {
        if(name == ""){
            let idx = 0;
            while(("drawing" + idx) in this.drawingMap){
                idx++;
            }
            name = "drawing" + idx;
        }
        this.adjustScale(drawing);
        this.drawingMap[name] = drawing;
        return this;
    }

    addElements(name: string, elements: UI.Elements): this {
        this.adjustScale(elements);
        this.content.elements[name] = {...elements, z: this.z};
        this.z++;
        return this;
    }

    addSlot(name: string, x: number, y: number, size: number, bmpName?: string): this {
        const elemSlot: UI.Elements = {type: "slot", x: x, y: y, size: size, bitmap: bmpName || "classic_slot"};
        return this.addElements(name, elemSlot);
    }

    addScale(name: string, x: number, y: number, bmpBack: string, bmpFront: string, direction: 0 | 1 | 2 | 3 = 0, thickness: number = 0): this {
        return this.addDrawing(name, {type: "bitmap", x: x, y: y, bitmap: bmpBack})
                    .addElements(name, {type: "scale", x: x + thickness, y: y + thickness, bitmap: bmpFront, direction: direction});
    }

    addText(name: string, x: number, y: number, text: string, font?: number | UI.FontParams): this {
        let fontParams: UI.FontParams = {color: Color.DKGRAY, size: 8, align: UI.Font.ALIGN_DEFAULT};
        if(typeof font == "number"){
            fontParams.size = font;
        }
        else{
            fontParams = {...fontParams, ...font};
        }
        return this.addElements(name, {type: "text", x: x, y: y, text: text, font: fontParams});
    }

    addTextAsDrawing(name: string, x: number, y: number, text: string, font?: number | UI.FontParams): this {
        let fontParams: UI.FontParams = {color: Color.DKGRAY, size: 8, align: UI.Font.ALIGN_DEFAULT};
        if(typeof font == "number"){
            fontParams.size = font;
        }
        else{
            fontParams = {...fontParams, ...font};
        }
        return this.addDrawing(name, {type: "text", x: x, y: y, text: text, font: fontParams});
    }


    setClicker(name: string, clicker: UI.UIClickEvent): this {
        const elem = this.content.elements[name];
        if(elem){
            elem.clicker = clicker;
        }
        return this;
    }

    setValidItem(name: string, validFunc: (id: number, count: number, data: number, container: Container, item: ItemInstance) => boolean): this {
        const elem = this.content.elements[name];
        if(elem && elem.type === "slot"){
            elem.isValid = validFunc;
        }
        return this;
    }


    makeWindow(): UI.StandardWindow {

        for(let key in this.drawingMap){
            this.content.drawing.push(this.drawingMap[key]);
        }

        this.winBase = new UI.StandardWindow(this.content);
        this.winBase.getWindow("content").getLocation().setScroll(0, 0);
        this.winBase.getWindow("main").getContent().elements["_wmClose"] = {
            type: "closeButton",
            x: 1000 - 15 * 2,
            y: 0,
            bitmap: "classic_close_button",
            bitmap2: "classic_close_button_down",
            scale: 2
        };

        if(this.withTooltip){

            this.content.elements[FRAME_DETECTION] = {
                type: "frame",
                x: 0,
                y: 0,
                z: -100,
                width: 1000,
                height: 1000,
                bitmap: "_default_slot_empty",
                onTouchEvent: (elem, event) => {
                    const eventX = event.x;
                    const eventY = event.y;
                    const eventType = event.type;
                    const elems = elem.window.getElements();
                    const it = elems.values().iterator();
                    let e: UI.Element;
                    while(it.hasNext()){
                        e = it.next();
                        if(e.source){ //e is slot
                            event.preparePosition(e.window, e.elementRect);
                            if(event.localX > 0 && event.localY > 0 && event.localX < 1 && event.localY < 1){
                                this.showTooltip(this.slotTooltip(e), e, eventX, eventY, eventType);
                                break;
                            }
                        }
                    }
                }
            };

            this.winOvl = new UI.Window({
                location: {x: 0, y: 0, width: 1000, height: UI.getScreenHeight()},
                elements: {
                    [TOOLTIP_TEXT]: {type: "text", x: 0, y: -1000, z: 1, font: {color: Color.WHITE, size: 16, shadow: 0.5}, multiline: true},
                    [TOOLTIP_FRAME]: {type: "image", x: 0, y: -1000, width: 64, height: 64, scale: 1, bitmap: "workbench_frame3"},
                    [TOOLTIP_HIGHLIGHT]: {type: "image", x: -1000, y: -1000, z: -1, width: 64, height: 64, scale: 1, bitmap: "_selection"}
                }
            });

            this.winOvl.setBackgroundColor(Color.TRANSPARENT);
            this.winOvl.setTouchable(false);
            this.winOvl.setAsGameOverlay(true);
            this.winBase.addWindowInstance(WINDOW_OVL, this.winOvl);

        }

        return this.winBase;

    }


    setTooltipFunc(elemName: string, tooltipFunc: (elem: UI.Element) => string): this {
        if(elemName in this.content.elements){
            this.content.elements[elemName].onTouchEvent = (el, ev) => {
                this.showTooltip(tooltipFunc(el), el, ev.x, ev.y, ev.type);
            }
        }
        return this;
    }

    slotTooltip(slotElem: UI.Element): string {
        if(slotElem.source.id != 0){
            return Item.getName(slotElem.source.id, slotElem.source.data, slotElem.source.extra);
        }
        return "";
    }


    showTooltip(str: string, elem: UI.Element, eventX: number, eventY: number, eventType: TouchEventType): void {

        if(!this.withTooltip) return;

        const location = elem.window.getLocation();
        const ovlElems = this.winOvl.getElements();
        const wmText: UI.Element = ovlElems.get(TOOLTIP_TEXT);
        const wmFrame: UI.Element = ovlElems.get(TOOLTIP_FRAME);
        const wmHighlight: UI.Element = ovlElems.get(TOOLTIP_HIGHLIGHT);
        const MOVEtoLONG_CLICK = eventType == "LONG_CLICK" && wmFrame.x != -1000 && wmFrame.y != -1000;
        let x = 0;
        let y = 0;
        let w = 0;
        let h = 0;

        if(str && (eventType == "MOVE" || MOVEtoLONG_CLICK)){

            x = location.x + location.windowToGlobal(elem.x) | 0;
            y = location.y + location.windowToGlobal(elem.y) | 0;
            w = location.windowToGlobal(elem.elementRect.width()) | 0;
            h = location.windowToGlobal(elem.elementRect.height()) | 0;
            if(wmHighlight.elementRect.width() != w || wmHighlight.elementRect.height() != h){
                wmHighlight.texture = new UI.Texture(createHighlightBmp(w, h));
                wmHighlight.setSize(w, h);
            }
            wmHighlight.setPosition(x, y);

            const split = str.split("\n");
            w = Math.max(...split.map(s => McFontPaint.measureText(s))) + 20;
            h = split.length * 18 + 16;
            x = location.x + location.windowToGlobal(eventX);
            y = location.y + location.windowToGlobal(eventY) - h - 50;
            if(y < -10){
                y = location.y + location.windowToGlobal(eventY) + 70;
            }
            if(wmFrame.elementRect.width() != w || wmFrame.elementRect.height() != h){
                wmFrame.texture = new UI.Texture(FrameTex.expandAndScale(w, h, 1, FrameTexCentralColor));
                wmFrame.setSize(w, h);
            }
            wmText.setPosition(Math_clamp(x - w / 2, 0, 1000 - w) + 10, y + 7);
            wmText.setBinding("text", str);
            wmFrame.setPosition(Math_clamp(x - w / 2, 0, 1000 - w), y);

            if(!Threading.getThread(THREAD_WM)){
                Threading.initThread(THREAD_WM, () => {
                    while(elem.isTouched){
                        java.lang.Thread.sleep(200);
                    }
                    wmText.setPosition(-1000, -1000);
                    wmFrame.setPosition(-1000, -1000);
                    wmHighlight.setPosition(-1000, -1000);
                });
            }

        }
        else{
            wmText.setPosition(-1000, -1000);
            wmFrame.setPosition(-1000, -1000);
            wmHighlight.setPosition(-1000, -1000);
        }

    }


}


EXPORT("WindowMaker", WindowMaker);
