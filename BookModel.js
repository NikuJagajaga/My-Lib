LIBRARY({
    name: "BookModel",
    version: 1,
    shared: false,
    api: "CoreEngine"
});
//by NikuJagajaga (https://vk.com/pockettech)


var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var Math_clamp = function (val, min, max) { return Math.min(Math.max(val, min), max); };
var fixRadian = function (val) {
    while (val >= Math.PI) {
        val -= Math.PI * 2;
    }
    while (val < -Math.PI) {
        val += Math.PI * 2;
    }
    return val;
};
var BookModel = /** @class */ (function (_super) {
    __extends(BookModel, _super);
    function BookModel(x, y, z, skin) {
        var _this = _super.call(this, x, y, z) || this;
        _this.x = x;
        _this.y = y;
        _this.z = z;
        _this.skin = skin;
        _this.model = new Render();
        var head = _this.model.getPart("head");
        var scale = { width: 64, height: 32 };
        head.addPart("coverRight");
        _this.model.setPart("coverRight", [{ uv: { x: 0, y: 0 }, coords: { x: -3, y: 24, z: 0 }, size: { x: 6, y: 10, z: 0.01 } }], scale);
        head.addPart("coverLeft");
        _this.model.setPart("coverLeft", [{ uv: { x: 16, y: 0 }, coords: { x: 3, y: 24, z: 0 }, size: { x: 6, y: 10, z: 0.01 } }], scale);
        head.addPart("pagesRight");
        _this.model.setPart("pagesRight", [{ uv: { x: 0, y: 10 }, coords: { x: 2.5, y: 24, z: -0.5 }, size: { x: 5, y: 8, z: 1 } }], scale);
        head.addPart("pagesLeft");
        _this.model.setPart("pagesLeft", [{ uv: { x: 12, y: 10 }, coords: { x: 2.5, y: 24, z: 0.5 }, size: { x: 5, y: 8, z: 1 } }], scale);
        head.addPart("flippingPageRight");
        _this.model.setPart("flippingPageRight", [{ uv: { x: 24, y: 10 }, coords: { x: 2.5, y: 24, z: 0 }, size: { x: 5, y: 8, z: 0.01 } }], scale);
        head.addPart("flippingPageLeft");
        _this.model.setPart("flippingPageLeft", [{ uv: { x: 24, y: 10 }, coords: { x: 2.5, y: 24, z: 0 }, size: { x: 5, y: 8, z: 0.01 } }], scale);
        head.addPart("bookSpine");
        _this.model.setPart("bookSpine", [{ uv: { x: 12, y: 0 }, coords: { x: 0, y: 24, z: 0 }, size: { x: 2, y: 10, z: 0.01 } }], scale);
        _this.setRotationPoint("coverRight", 0, 0, -1);
        _this.setRotationPoint("coverLeft", 0, 0, 1);
        _this.setRotation("bookSpine", 0, Math.PI / 2, 0);
        _this.tickCount = 0;
        _this.pageFlip = 0;
        _this.pageFlipPrev = 0;
        _this.flipRandom = 0;
        _this.flipTurn = 0;
        _this.bookSpread = 0;
        _this.bookSpreadPrev = 0;
        _this.bookRotation = 0;
        _this.bookRotationPrev = 0;
        _this.offset = 0;
        return _this;
    }
    BookModel.prototype.setRotation = function (name, x, y, z) {
        this.model.getPart(name).setRotation(x, y, z);
    };
    BookModel.prototype.setRotationPoint = function (name, x, y, z) {
        this.model.getPart(name).setOffset(x, y, z);
    };
    BookModel.prototype.spawn = function () {
        var _this = this;
        var id = this.model.getId();
        this.describe({ render: id, skin: this.skin });
        this.loadCustom(function () {
            _this.bookSpreadPrev = _this.bookSpread;
            _this.bookRotationPrev = _this.bookRotation;
            _this.pageFlipPrev = _this.pageFlip;
            //Native.EntityType.PLAYER === 1
            var player = Entity.findNearest({ x: _this.x, y: _this.y, z: _this.z }, 1, 3);
            if (player) {
                var pos = Entity.getPosition(player);
                _this.offset = Math.atan2(pos.z - _this.z, pos.x - _this.x);
                _this.bookSpread += 0.1;
                if (_this.bookSpread < 0.5 || (Math.random() * 40 | 0) === 0) {
                    var oldFlip = _this.flipRandom;
                    while (true) {
                        _this.flipRandom += (Math.random() * 4 | 0) - (Math.random() * 4 | 0);
                        if (oldFlip !== _this.flipRandom) {
                            break;
                        }
                    }
                }
            }
            else {
                _this.offset += 0.02;
                _this.bookSpread -= 0.1;
            }
            _this.bookRotation = fixRadian(_this.bookRotation);
            _this.offset = fixRadian(_this.offset);
            _this.bookRotation += fixRadian(_this.offset - _this.bookRotation) * 0.4;
            _this.bookSpread = Math_clamp(_this.bookSpread, 0, 1);
            _this.flipTurn += (Math_clamp((_this.flipRandom - _this.pageFlip) * 0.4, -0.2, 0.2) - _this.flipTurn) * 0.9;
            _this.pageFlip += _this.flipTurn;
        });
        this.setSkylightMode();
        Threading.initThread("bookmodel_" + id, function () {
            var fps = 50;
            var time = 0;
            var timePrev = 0;
            var partialTicks = 0;
            while (_this.isLoaded) {
                timePrev = time;
                time = World.getThreadTime();
                if (timePrev === time) {
                    partialTicks += 20 / fps;
                }
                else {
                    partialTicks = 0;
                }
                var limbSwing = _this.tickCount + partialTicks;
                _this.setPos(_this.x, _this.y + 0.1 + Math.sin(limbSwing * 0.1) * 0.01, _this.z);
                var rotY = _this.bookRotationPrev + fixRadian(_this.bookRotation - _this.bookRotationPrev) * partialTicks;
                _this.model.transform().lock().clear().rotate(0, -rotY, -80 * Math.PI / 180).unlock();
                var limbSwingAmount = _this.pageFlipPrev + (_this.pageFlip - _this.pageFlipPrev) * partialTicks + 0.25;
                var ageInTicks = limbSwingAmount + 0.5;
                limbSwingAmount = Math_clamp((limbSwingAmount - (limbSwingAmount | 0)) * 1.6 - 0.3, 0, 1);
                ageInTicks = Math_clamp((ageInTicks - (ageInTicks | 0)) * 1.6 - 0.3, 0, 1);
                var netHeadYaw = _this.bookSpreadPrev + (_this.bookSpread - _this.bookSpreadPrev) * partialTicks;
                var rot = (Math.sin(limbSwing * 0.02) * 0.1 + 1.25) * netHeadYaw;
                var sin_rot = Math.sin(rot);
                _this.setRotation("coverRight", 0, Math.PI + rot, 0);
                _this.setRotation("coverLeft", 0, -rot, 0);
                _this.setRotation("pagesRight", 0, rot, 0);
                _this.setRotation("pagesLeft", 0, -rot, 0);
                _this.setRotation("flippingPageRight", 0, rot - rot * 2 * limbSwingAmount, 0);
                _this.setRotation("flippingPageLeft", 0, rot - rot * 2 * ageInTicks, 0);
                _this.setRotationPoint("pagesRight", sin_rot, 0, 0);
                _this.setRotationPoint("pagesLeft", sin_rot, 0, 0);
                _this.setRotationPoint("flippingPageRight", sin_rot, 0, 0);
                _this.setRotationPoint("flippingPageLeft", sin_rot, 0, 0);
                _this.refresh();
                java.lang.Thread.sleep(1000 / fps | 0);
            }
        });
    };
    return BookModel;
}(Animation.Base));


EXPORT("BookModel", BookModel);