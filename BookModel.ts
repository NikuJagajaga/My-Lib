const Math_clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max);

const fixRadian = (val: number) => {
    while(val >= Math.PI){
        val -= Math.PI * 2;
    }
    while(val < -Math.PI){
        val += Math.PI * 2;
    }
    return val;
};


class BookModel extends Animation.Base {

    model: Render;
    tickCount: number;
    pageFlip: number;
    pageFlipPrev: number;
    flipRandom: number;
    flipTurn: number;
    bookSpread: number;
    bookSpreadPrev: number;
    bookRotation: number;
    bookRotationPrev: number;
    offset: number;

    constructor(public x: number, public y: number, public z: number, public skin: string){

        super(x, y, z);

        this.model = new Render();
        const head = this.model.getPart("head");
        const scale = {width: 64, height: 32};
        head.addPart("coverRight");
        this.model.setPart("coverRight", [{uv: {x: 0, y: 0}, coords: {x: -3, y: 24, z: 0}, size: {x: 6, y: 10, z: 0.01}}], scale);
        head.addPart("coverLeft");
        this.model.setPart("coverLeft", [{uv: {x: 16, y: 0}, coords: {x: 3, y: 24, z: 0}, size: {x: 6, y: 10, z: 0.01}}], scale);
        head.addPart("pagesRight");
        this.model.setPart("pagesRight", [{uv: {x: 0, y: 10}, coords: {x: 2.5, y: 24, z: -0.5}, size: {x: 5, y: 8, z: 1}}], scale);
        head.addPart("pagesLeft");
        this.model.setPart("pagesLeft", [{uv: {x: 12, y: 10}, coords: {x: 2.5, y: 24, z: 0.5}, size: {x: 5, y: 8, z: 1}}], scale);
        head.addPart("flippingPageRight");
        this.model.setPart("flippingPageRight", [{uv: {x: 24, y: 10}, coords: {x: 2.5, y: 24, z: 0}, size: {x: 5, y: 8, z: 0.01}}], scale);
        head.addPart("flippingPageLeft");
        this.model.setPart("flippingPageLeft", [{uv: {x: 24, y: 10}, coords: {x: 2.5, y: 24, z: 0}, size: {x: 5, y: 8, z: 0.01}}], scale);
        head.addPart("bookSpine");
        this.model.setPart("bookSpine", [{uv: {x: 12, y: 0}, coords: {x: 0, y: 24, z: 0}, size: {x: 2, y: 10, z: 0.01}}], scale);
        this.setRotationPoint("coverRight", 0, 0, -1);
        this.setRotationPoint("coverLeft", 0, 0, 1);
        this.setRotation("bookSpine", 0, Math.PI / 2, 0);

        this.tickCount = 0;
        this.pageFlip = 0;
        this.pageFlipPrev = 0;
        this.flipRandom = 0;
        this.flipTurn = 0;
        this.bookSpread = 0;
        this.bookSpreadPrev = 0;
        this.bookRotation = 0;
        this.bookRotationPrev = 0;
        this.offset = 0;

    }

    setRotation(name: string, x: number, y: number, z: number): void {
        this.model.getPart(name).setRotation(x, y, z);
    }

    setRotationPoint(name: string, x: number, y: number, z: number): void {
        this.model.getPart(name).setOffset(x, y, z);
    }

    spawn(): void {

        const id = this.model.getId();

        this.describe({render: id, skin: this.skin});

        this.loadCustom(() => {

            this.bookSpreadPrev = this.bookSpread;
            this.bookRotationPrev = this.bookRotation;
            this.pageFlipPrev = this.pageFlip;

            //Native.EntityType.PLAYER === 1
            const player = Entity.findNearest({x: this.x, y: this.y, z: this.z}, 1, 3);

            if(player){
                const pos = Entity.getPosition(player);
                this.offset = Math.atan2(pos.z - this.z, pos.x - this.x);
                this.bookSpread += 0.1;
                if(this.bookSpread < 0.5 || (Math.random() * 40 | 0) === 0){
                    const oldFlip = this.flipRandom;
                    while(true){
                        this.flipRandom += (Math.random() * 4 | 0) - (Math.random() * 4 | 0);
                        if(oldFlip !== this.flipRandom){
                            break;
                        }
                    }
                }
            }
            else{
                this.offset += 0.02;
                this.bookSpread -= 0.1;
            }

            this.bookRotation = fixRadian(this.bookRotation);
            this.offset = fixRadian(this.offset);

            this.bookRotation += fixRadian(this.offset - this.bookRotation) * 0.4;
            this.bookSpread = Math_clamp(this.bookSpread, 0, 1);
            this.flipTurn += (Math_clamp((this.flipRandom - this.pageFlip) * 0.4, -0.2, 0.2) - this.flipTurn) * 0.9;
            this.pageFlip += this.flipTurn;

        });

        this.setSkylightMode();

        Threading.initThread("bookmodel_" + id, () => {

            const fps = 50;
            let time = 0;
            let timePrev = 0;
            let partialTicks = 0;

            while(this.isLoaded){

                timePrev = time;
                time = World.getThreadTime();

                if(timePrev === time){
                    partialTicks += 20 / fps;
                }
                else{
                    partialTicks = 0;
                }

                const limbSwing = this.tickCount + partialTicks;
                this.setPos(this.x, this.y + 0.1 + Math.sin(limbSwing * 0.1) * 0.01, this.z);

                const rotY = this.bookRotationPrev + fixRadian(this.bookRotation - this.bookRotationPrev) * partialTicks;
                this.model.transform().lock().clear().rotate(0, -rotY, -80 * Math.PI / 180).unlock();

                let limbSwingAmount = this.pageFlipPrev + (this.pageFlip - this.pageFlipPrev) * partialTicks + 0.25;
                let ageInTicks = limbSwingAmount + 0.5;
                limbSwingAmount = Math_clamp((limbSwingAmount - (limbSwingAmount | 0)) * 1.6 - 0.3, 0, 1);
                ageInTicks = Math_clamp((ageInTicks - (ageInTicks | 0)) * 1.6 - 0.3, 0, 1);

                const netHeadYaw = this.bookSpreadPrev + (this.bookSpread - this.bookSpreadPrev) * partialTicks;
                
                const rot = (Math.sin(limbSwing * 0.02) * 0.1 + 1.25) * netHeadYaw;
                const sin_rot = Math.sin(rot);
                
                this.setRotation("coverRight", 0, Math.PI + rot, 0);
                this.setRotation("coverLeft", 0, -rot, 0);
                this.setRotation("pagesRight", 0, rot, 0);
                this.setRotation("pagesLeft", 0, -rot, 0);
                this.setRotation("flippingPageRight", 0, rot - rot * 2 * limbSwingAmount, 0);
                this.setRotation("flippingPageLeft", 0, rot - rot * 2 * ageInTicks, 0);
                this.setRotationPoint("pagesRight", sin_rot, 0, 0);
                this.setRotationPoint("pagesLeft", sin_rot, 0, 0);
                this.setRotationPoint("flippingPageRight", sin_rot, 0, 0);
                this.setRotationPoint("flippingPageLeft", sin_rot, 0, 0);
                this.refresh();
                
                java.lang.Thread.sleep(1000 / fps | 0);

            }
        });

    }

}