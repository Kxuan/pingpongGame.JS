$(function () {
    "use strict";

    function PingPong(elStage) {
        if (!(this instanceof  PingPong))
            return new PingPong(elStage);

        var game = this;
        var config = {
            lockBall: true
        };
        var objects = {
            score: {
                score: 0,
                el: elStage.find('.score'),
                events: {
                    reconfigure: ScoreReconfigure,
                    tick: ScoreTick
                }
            },
            plane_wrapper: {
                top: -1,   //Reset by init
                width: -1,   //Reset by init
                el: elStage.find('.plane_wrapper'),
                events: {
                    reconfigure: PlaneWrapperReconfigure
                }
            },
            plane: {
                left: -1,   //Reset by init
                width: 200,
                speed: 9.124356,

                el: elStage.find('.plane'),
                events: {
                    init: PlaneInit,
                    reconfigure: PlaneReconfigure,
                    tick: PlaneTick
                },
                command: null,
                control: {
                    key: {
                        37: 'left',
                        39: 'right'
                    }
                }
            },
            ball: {
                left: -1,   //Reset by init
                top: -1,   //Reset by init
                dir: -Math.PI / 4,
                size: 20,
                speed: 5,

                el: elStage.find('.ball'),
                events: {
                    init: BallInit,
                    reconfigure: BallReconfigure,
                    tick: BallTick
                },
                command: null,
                control: {
                    click: {
                        '': 'post'
                    },
                    key: {
                        38: 'post'
                    }
                }
            }
        };

        function foreach_object(fn) {
            for (var i in objects) {
                fn.call(self, objects[i]);
            }
        }

        function object_dispatch(name) {
            foreach_object(function (obj) {
                if (obj.events && obj.events[name])
                    obj.events[name].call(obj, obj.el);
            });
        }

        function distance(x1, y1, x2, y2) {
            return Math.sqrt((x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2));
        }

        function ScoreReconfigure(el) {
            el.text(this.score);
        }

        function ScoreTick(el) {
            if (!config.lockBall) {
                this.score += parseInt(objects.ball.speed);
                ScoreReconfigure.call(this, el);
            }
        }

        function PlaneWrapperReconfigure(el) {
            this.top = el.position().top;
            this.width = el.width();
        }

        function PlaneInit(el) {
            this.left = (objects.plane_wrapper.el.width() - this.width) / 2;
        }

        function PlaneReconfigure(el) {
            el.css({
                'left': this.left,
                'width': this.width
            });
        }

        function PlaneTick(el) {
            var offsetLeft, newWidth;
            switch (this.command) {
                case 'left':
                    offsetLeft = Math.max(this.left - this.speed, 0) - this.left;
                    break;
                case 'right':
                    offsetLeft = Math.min(this.left + this.speed, objects.plane_wrapper.width - this.width) - this.left;
                    break;
            }
            newWidth = 200 - objects.ball.speed * 5;
            if (this.width != newWidth) {
                this.left += (this.width - newWidth) / 2;
                this.width = newWidth;
            }
            if (offsetLeft) {
                this.left += offsetLeft;
                if (config.lockBall) {
                    objects.ball.left += offsetLeft;
                    objects.ball.el.css('left', objects.ball.left);
                }
            }
        }

        function BallInit(el) {
            this.left = (elStage.width() - this.size) / 2;
            this.top = elStage.height() - objects.plane.el.height() - this.size;
            this.dir = -(Math.PI / 6 + Math.PI / 6 * Math.random());//30～60deg
            if (Math.random() > 0.5) {
                this.dir = Math.PI - this.dir;
            }
        }

        function BallReconfigure(el) {
            el.css({
                left: this.left,
                top: this.top,
                width: this.size,
                height: this.size,
                background: 'hsl(0,100%,' + (100 - this.speed * 2.5 ) + '%)',
                'box-shadow': '0 0 ' + this.speed + 'px 0px #fff'
            });
        }

        function BallTick(el) {
            if (this.command == 'post') {
                config.lockBall = false;
                this.command = null;
                return;
            }
            if (config.lockBall)
                return;

            var offsetX = Math.cos(this.dir) * this.speed,
                offsetY = Math.sin(this.dir) * this.speed;

            var oldX = this.left, newX = oldX + offsetX,
                oldXM = oldX + this.size / 2, newXM = newX + this.size / 2,
                oldXS = oldX + this.size, newXS = newX + this.size,
                oldY = this.top, newY = oldY + offsetY,
                oldYS = oldY + this.size, newYS = newY + this.size,
                oldYM = oldY + this.size / 2, newYM = newY + this.size / 2;

            var plane_top = objects.plane_wrapper.top,
                plane_left = objects.plane.left,
                plane_right = objects.plane.left + objects.plane.width,
                stage_width = elStage.width();
            var k, deg;

            this.top = newY;
            this.left = newX;
            if (offsetX > 0 && newXS > stage_width) {
                this.left = stage_width - this.size - (newXS - stage_width);
                this.dir = Math.PI - this.dir;
            } else if (offsetX < 0 && newX < 0) {
                this.left = -newX;
                this.dir = Math.PI - this.dir;
            }

            if (offsetY > 0 && newYS > plane_top) {
                if (newY > elStage.height()) {
                    //太低了
                    GameOver();
                } else if (oldYS < plane_top && newYS > plane_top &&
                    newXM >= plane_left + 10 && newXM <= plane_right - 10) {
                    //落向板中间
                    this.top = plane_top - this.size - (newYS - plane_top);
                    this.dir = 0 - this.dir;
                    if (this.speed < 20) {
                        this.speed += 1;
                    }
                } else if (offsetX > 0 && newYM < plane_top + 10 && distance(newXM, newYM, plane_left + 10, plane_top + 10) < 10 + (this.size / 2)) {
                    k = (((plane_top + 10) - (newYM)) / ((plane_left + 10) - newXM));
                    deg = Math.atan(k);
                    //撞击板左侧圆弧区域
                    console.log("撞击左侧。\n运动方向：%f\n球心：(%f,%f)\n弧心：(%f,%f)\n切线斜率：%f\n切线角度：%f(%f)\n撞击后角度：%f",
                        180 * this.dir / Math.PI,//运动方向
                        newXM, newYM,//球心
                        plane_left + 10, plane_top + 10,//弧心
                        k,//切线斜率
                        Math.atan(k), 180 * Math.atan(k) / Math.PI,//切线角度
                        2 * Math.PI - this.dir + 2 * deg//运动角度变换公式
                    );

                    if (this.speed < 20) {
                        this.speed += 0.5;
                    }
                    this.dir = 2 * deg - Math.PI - this.dir;
                } else if (offsetX < 0 && newYM < plane_top + 10 && distance(newXM, newYM, plane_right - 10, plane_top + 10) < 10 + (this.size / 2)) {
                    k = (((plane_top + 10) - (newYM)) / (newXM - (plane_right - 10) ));
                    deg = Math.atan(k);
                    //撞击板右侧圆弧区域
                    console.log("撞击右侧。\n运动方向：%f\n球心：(%f,%f)\n弧心：(%f,%f)\n切线斜率：%f\n切线角度：%f(%f)\n撞击后角度：%f",
                        180 * this.dir / Math.PI,
                        newXM, newYM,
                        plane_right - 10, plane_top + 10,
                        k,
                        Math.atan(k), 180 * Math.atan(k) / Math.PI,
                        2 * Math.PI - this.dir + 2 * deg
                    );
                    if (this.speed < 20) {
                        this.speed += 0.5;
                    }
                    this.dir = 2 * Math.PI - this.dir + 2 * deg;
                }
            } else if (offsetY < 0 && this.top + offsetY < 0) {
                this.top = -newY;
                this.dir = -this.dir;
            }
        }

        var new_objects, new_config;

        function GameInit() {
            var newobj;
            if (!new_objects) {
                object_dispatch('init');
                new_objects = $.extend(true, {}, objects);
            } else {
                for (var objName in new_objects) {
                    newobj = new_objects[objName];
                    for (var prop in newobj) {
                        switch (prop) {
                            case 'el':
                            case 'events':
                            case 'control':
                                break;
                            default:
                                objects[objName][prop] = newobj[prop];
                                break;
                        }
                    }
                }
                object_dispatch('init');
            }
            if (!new_config) {
                new_config = $.extend(true, {}, config);
            } else {
                config = $.extend(true, {}, new_config);
            }
            object_dispatch('reconfigure');
        }

        function GameOver() {
            setTimeout(function () {
                alert('得分' + objects.score.score);
                GameInit()
            }, 0);
        }

        function GameTick() {
            var c;
            object_dispatch('tick');
            object_dispatch('reconfigure');
        }

        //Keyboard Control
        $(window).keydown(function (e) {
            console.log(e.keyCode);
            foreach_object(function (obj) {
                var c = obj.control;
                if (c && c.key &&
                    e.keyCode in c.key) {
                    obj.command = c.key[e.keyCode];
                }
            });
        });
        $(window).keyup(function (e) {
            foreach_object(function (obj) {
                var c = obj.control;
                if (c && c.key &&
                    e.keyCode in c.key &&
                    c.key[e.keyCode] == obj.command) {
                    obj.command = null;
                }
            });
        });
        //Mouse Control
        foreach_object(function (obj) {
            if (obj.control) {
                for (var selector in obj.control.click) {
                    if (selector === '') {
                        elStage.click(function () {
                            obj.command = obj.control.click[''];
                        })
                    } else {
                        var el = elStage.find(selector);
                        if (el.length) {
                            (function () {
                                var sel = selector;
                                el.click(function () {
                                    obj.command = obj.control.click[sel];
                                });
                            }).call(obj);
                        }
                    }
                }
            }
        });

        $(window).resize(function () {
            object_dispatch('reconfigure');
        });
        GameInit();
        if (window.requestAnimationFrame) {
            var _tickfn = function () {
                GameTick();
                requestAnimationFrame(_tickfn);
            };
            requestAnimationFrame(_tickfn);
        } else {
            setInterval(GameTick, 20);
        }
    }

    window.gameObj = new PingPong($('#game'));
});