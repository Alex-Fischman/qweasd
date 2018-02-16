var world;
var canvas;
var dims = {
    min: 0,
    bigX: 0,
    bigY: 0
};
var ctx;

const dist = 1e2;
const move = 1e-2;
const turn = 1e-4 * Math.PI;
const topMove = 1e-1 * 2;
const topTurn = 1e-2 * Math.PI / 2;

const enemyMove = topMove / 2;
const enemyTurn = topTurn;

var movementBuffer = { tx: 0, ty: 0, tz: 0, rx: 0, ry: 0, rz: 0 };
var fire = true;
const explosionSize = 2;



var keys = {
    q: false,
    w: false,
    e: false,
    a: false,
    s: false,
    d: false,
    i: false,
    j: false,
    k: false,
    l: false,
    space: false
};
window.onkeydown = function(event) {
    switch (event.key) {
        case 'q':
            keys.q = true;
            break;
        case 'w':
            keys.w = true;
            break;
        case 'e':
            keys.e = true;
            break;
        case 'a':
            keys.a = true;
            break;
        case 's':
            keys.s = true;
            break;
        case 'd':
            keys.d = true;
            break;
        case 'u':
            keys.u = true;
            break;
        case 'i':
            keys.i = true;
            break;
        case 'o':
            keys.o = true;
            break;
        case 'j':
            keys.j = true;
            break;
        case 'k':
            keys.k = true;
            break;
        case 'l':
            keys.l = true;
            break;
        case ' ':
            keys.space = true;
            break;
    }
};
window.onkeyup = function(event) {
    switch (event.key) {
        case 'q':
            keys.q = false;
            break;
        case 'w':
            keys.w = false;
            break;
        case 'e':
            keys.e = false;
            break;
        case 'a':
            keys.a = false;
            break;
        case 's':
            keys.s = false;
            break;
        case 'd':
            keys.d = false;
            break;
        case 'u':
            keys.u = false;
            break;
        case 'i':
            keys.i = false;
            break;
        case 'o':
            keys.o = false;
            break;
        case 'j':
            keys.j = false;
            break;
        case 'k':
            keys.k = false;
            break;
        case 'l':
            keys.l = false;
            break;
        case ' ':
            keys.space = false;
            fire = true;
            break;
    }
};



//Get the 2D point from the 3D one
function get2d(pos) {
    if (pos[2] > 0 && pos[2] < dist) {
        const x = (pos[0] / pos[2]) * dims.min;
        const y = (pos[1] / pos[2]) * dims.min * -1;

        return [x, y];
        //return [x * scale, y * scale];
    }
    return [NaN, NaN];
}
//3D objects
var Primitives = {
    //Constructor functions
    Vertex: function(x, y, z) {
        return {
            pos: [x, y, z],

            draw: function() {
                if (this.visible()) {
                    ctx.fillRect(get2d(this.pos)[0], get2d(this.pos)[1], 1, 1);
                }
            },

            translate: function(x, y, z) {
                this.pos = [this.pos[0] + x, this.pos[1] + y, this.pos[2] + z];
            },

            rotate: function(x, y, z) {
                //Rotate around X axis
                var cosX = Math.cos(x);
                var sinX = Math.sin(x);
                this.pos = [this.pos[0], (this.pos[1] * cosX) + (this.pos[2] * -sinX), (this.pos[1] * sinX) + (this.pos[2] * cosX)];

                //Rotate around Y axis
                var cosY = Math.cos(y);
                var sinY = Math.sin(y);
                this.pos = [(this.pos[0] * cosY) + (this.pos[2] * sinY), this.pos[1], (this.pos[0] * -sinY) + (this.pos[2] * cosY)];

                //Rotate around Z axis
                var cosZ = Math.cos(z);
                var sinZ = Math.sin(z);
                this.pos = [(this.pos[0] * cosZ) + (this.pos[1] * -sinZ), (this.pos[0] * sinZ) + (this.pos[1] * cosZ), this.pos[2]];
            },

            visible: function() {
                return this.pos[2] > 0 && this.pos[2] < dist;
            },

            dist: function(vertex) {
                return Math.sqrt(
                    Math.pow(this.pos[0] - vertex.pos[0], 2) +
                    Math.pow(this.pos[1] - vertex.pos[1], 2) +
                    Math.pow(this.pos[2] - vertex.pos[2], 2)
                );
            }
        };
    },

    Edge: function(vertex1, vertex2) {
        return {
            start: Primitives.Vertex(vertex1.pos[0], vertex1.pos[1], vertex1.pos[2]),
            end: Primitives.Vertex(vertex2.pos[0], vertex2.pos[1], vertex2.pos[2]),

            draw: function() {
                if (this.start.visible() || this.end.visible()) {
                    ctx.beginPath();
                    ctx.moveTo(get2d(this.start.pos)[0], get2d(this.start.pos)[1]);
                    ctx.lineTo(get2d(this.end.pos)[0], get2d(this.end.pos)[1]);
                    ctx.closePath();
                    ctx.stroke();
                }
            },

            translate: function(x, y, z) {
                this.start.translate(x, y, z);
                this.end.translate(x, y, z);
            },

            rotate: function(x, y, z) {
                this.start.rotate(x, y, z);
                this.end.rotate(x, y, z);
            }
        };
    },

    Face: function(edges) {
        return {
            edges: edges.map(function(a) {
                return Primitives.Edge(a.start, a.end);
            }),

            draw: function() {
                this.edges.forEach(function(a) {
                    a.draw();
                });
            },

            translate: function(x, y, z) {
                this.edges.forEach(function(a) {
                    a.translate(x, y, z);
                });
            },

            rotate: function(x, y, z) {
                this.edges.forEach(function(a) {
                    a.rotate(x, y, z);
                });
            }
        };
    },

    Polyhedron: function(faces) {
        return {
            faces: faces.map(function(a) {
                return Primitives.Face(a.edges);
            }),

            draw: function() {
                this.faces.forEach(function(a) {
                    a.draw();
                });
            },

            translate: function(x, y, z) {
                this.faces.forEach(function(a) {
                    a.translate(x, y, z);
                });
            },

            rotate: function(x, y, z) {
                this.faces.forEach(function(a) {
                    a.rotate(x, y, z);
                });
            }
        };
    },
};
var Models = {
    Cube: function(x, y, z, size) {
        //Vertices
        const a = Primitives.Vertex(x, y, z);
        const b = Primitives.Vertex(x + size, y, z);
        const c = Primitives.Vertex(x + size, y + size, z);
        const d = Primitives.Vertex(x, y + size, z);
        const e = Primitives.Vertex(x, y, z + size);
        const f = Primitives.Vertex(x + size, y, z + size);
        const g = Primitives.Vertex(x + size, y + size, z + size);
        const h = Primitives.Vertex(x, y + size, z + size);

        //Edges
        const ab = Primitives.Edge(a, b);
        const bc = Primitives.Edge(b, c);
        const cd = Primitives.Edge(c, d);
        const da = Primitives.Edge(d, a);
        const bf = Primitives.Edge(b, f);
        const fe = Primitives.Edge(f, e);
        const ea = Primitives.Edge(e, a);
        const dh = Primitives.Edge(d, h);
        const he = Primitives.Edge(h, e);
        const cg = Primitives.Edge(c, g);
        const gf = Primitives.Edge(g, f);
        const gh = Primitives.Edge(g, h);

        //Model
        return Primitives.Polyhedron([
            Primitives.Face([ab, bc, cd, da]),
            Primitives.Face([ab, bf, fe, ea]),
            Primitives.Face([da, dh, he, ea]),
            Primitives.Face([bc, cg, gf, bf]),
            Primitives.Face([cd, dh, gh, cg]),
            Primitives.Face([fe, gf, gh, he])
        ]);
    },

    Ship: function(x, y, z, size) {
        //Vertices
        const vnose = Primitives.Vertex(x, y, z + size / 2);
        const vbodyfl = Primitives.Vertex(x - size / 8, y, z);
        const vbodyfu = Primitives.Vertex(x, y - size / 8, z);
        const vbodyfr = Primitives.Vertex(x + size / 8, y, z);
        const vbodyfd = Primitives.Vertex(x, y + size / 8, z);
        const vbodybl = Primitives.Vertex(x - size / 8, y, z - size / 2);
        const vbodybu = Primitives.Vertex(x, y - size / 8, z - size / 2);
        const vbodybr = Primitives.Vertex(x + size / 8, y, z - size / 2);
        const vbodybd = Primitives.Vertex(x, y + size / 8, z - size / 2);

        const vlwingf = Primitives.Vertex(x - size / 2, y, z);
        const vlwingb = Primitives.Vertex(x - size / 4, y, z - size / 2);
        const vlwingr = Primitives.Vertex(x - size / 8, y, z - size / 4);
        const vrwingf = Primitives.Vertex(x + size / 2, y, z);
        const vrwingb = Primitives.Vertex(x + size / 4, y, z - size / 2);
        const vrwingl = Primitives.Vertex(x + size / 8, y, z - size / 4);

        //Edges
        const enosel = Primitives.Edge(vnose, vbodyfl);
        const enoseu = Primitives.Edge(vnose, vbodyfu);
        const enoser = Primitives.Edge(vnose, vbodyfr);
        const enosed = Primitives.Edge(vnose, vbodyfd);
        const ebodyflu = Primitives.Edge(vbodyfl, vbodyfu);
        const ebodyfur = Primitives.Edge(vbodyfu, vbodyfr);
        const ebodyfrd = Primitives.Edge(vbodyfr, vbodyfd);
        const ebodyfdl = Primitives.Edge(vbodyfd, vbodyfl);
        const ebodyl = Primitives.Edge(vbodyfl, vbodybl);
        const ebodyu = Primitives.Edge(vbodyfu, vbodybu);
        const ebodyr = Primitives.Edge(vbodyfr, vbodybr);
        const ebodyd = Primitives.Edge(vbodyfd, vbodybd);
        const ebodyblu = Primitives.Edge(vbodybl, vbodybu);
        const ebodybur = Primitives.Edge(vbodybu, vbodybr);
        const ebodybrd = Primitives.Edge(vbodybr, vbodybd);
        const ebodybdl = Primitives.Edge(vbodybd, vbodybl);

        const elwingl = Primitives.Edge(vlwingf, vlwingb);
        const elwingf = Primitives.Edge(vlwingr, vlwingf);
        const elwingr = Primitives.Edge(vbodybl, vlwingr);
        const elwingb = Primitives.Edge(vlwingb, vbodybl);
        const erwingl = Primitives.Edge(vrwingf, vrwingb);
        const erwingf = Primitives.Edge(vrwingl, vrwingf);
        const erwingr = Primitives.Edge(vbodybr, vrwingl);
        const erwingb = Primitives.Edge(vrwingb, vbodybr);

        //Model
        return Primitives.Polyhedron([
            Primitives.Face([enosel, ebodyflu, enoseu]),
            Primitives.Face([enoseu, ebodyfur, enoser]),
            Primitives.Face([enoser, ebodyfrd, enosed]),
            Primitives.Face([enosed, ebodyfdl, enosel]),

            Primitives.Face([ebodyflu, ebodyu, ebodyblu, ebodyl]),
            Primitives.Face([ebodyfur, ebodyr, ebodybur, ebodyu]),
            Primitives.Face([ebodyfrd, ebodyd, ebodybrd, ebodyr]),
            Primitives.Face([ebodyfdl, ebodyl, ebodybdl, ebodyd]),
            Primitives.Face([ebodyblu, ebodybur, ebodybrd, ebodybdl]),

            Primitives.Face([elwingl, elwingf, elwingr, elwingb]),
            Primitives.Face([erwingl, erwingf, erwingr, erwingb])
        ]);
    },

    Laser: function(start, end, splay) {
        return Primitives.Face([
            Primitives.Edge(start, end),
            Primitives.Edge(Primitives.Vertex(start.pos[0] + splay,
                start.pos[1],
                start.pos[2]), end),
            Primitives.Edge(Primitives.Vertex(start.pos[0],
                start.pos[1] + splay, start.pos[2]), end),
            Primitives.Edge(Primitives.Vertex(start.pos[0] - splay, start.pos[1], start.pos[2]), end),
            Primitives.Edge(Primitives.Vertex(start.pos[0], start.pos[1] - splay, start.pos[2]), end)
        ]);
    },

    Circle: function(x, y, z, size) {
        var toReturn = Primitives.Vertex(x, y, z);
        toReturn.draw = function() {
            ctx.arc(get2d(this.pos)[0], get2d(this.pos)[1], size * dims.min / this.pos[2], 0, 2 * Math.PI);
            ctx.fill();
        };
        return toReturn;
    }
};



var movement = {
    static: function(arr) {
        return {
            tx: 0,
            ty: 0,
            tz: 0,
            rx: 0,
            ry: 0,
            rz: 0,
            fire: false
        };
    },

    random: function(arr) {
        return {
            tx: (Math.random() - 0.5) * 2 * enemyMove,
            ty: (Math.random() - 0.5) * 2 * move,
            tz: (Math.random() - 0.5) * 2 * move,
            rx: (Math.random() - 0.5) * 2 * turn,
            ry: (Math.random() - 0.5) * 2 * turn,
            rz: (Math.random() - 0.5) * 2 * turn,
            fire: false
        };
    },
    
    forward: function(arr) {
        const dir = arr[1];
        return {
            tx: dir[0] * enemyMove,
            ty: dir[1] * enemyMove,
            tz: dir[2] * enemyMove,
            rx: 0,
            ry: 0,
            rz: 0,
            fire: false
        };
    },
    
    target: function(arr) {
        const pos = arr[0];
        const dir = arr[1];
        
        //How to aim at player while not aligned to axes?
        
        const turnX = 0;
        //Update pos and dir
        
        const turnY = 0;
        //Update pos and dir
        
        const turnZ = 0;
        //Update pos and dir
        
        return {
            tx: 0 /*dir[0] * enemyMove*/ ,
            ty: 0 /*dir[1] * enemyMove*/ ,
            tz: 0 /*dir[2] * enemyMove*/ ,
            rx: turnX,
            ry: turnY,
            rz: turnZ,
            fire: false
        };
    }
};



//World functions
function translate(x, y, z) {
    world.forEach(function(a) {
        a.translate(x, y, z);
    });
}

function rotate(x, y, z) {
    world.forEach(function(a) {
        a.rotate(x, y, z);
    });
}



function init() {
    //Canvas setup
    canvas = document.getElementById("canvas");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    dims.min = Math.min(window.innerWidth, window.innerHeight);
    dims.bigX = Math.max(window.innerWidth - window.innerHeight, 0);
    dims.bigY = Math.max(window.innerHeight - window.innerWidth, 0);
    ctx = canvas.getContext("2d");
    ctx.translate(canvas.width / 2, canvas.height / 2);

    //Make the world
    world = [];
    //Stars
    for (var i = 0; i < 1e4; ++i) {
        world.push(Primitives.Vertex(
            (Math.random() - 0.5) * 100,
            (Math.random() - 0.5) * 100,
            (Math.random() - 0.5) * 100));
    }
    //Enemy ships
    for (var i = 0; i < 100; ++i) {
        var temp = Models.Ship((Math.random() - 0.5) * 100, (Math.random() - 0.5) * 100, (Math.random() - 0.5) * 100, 1);
        temp.rotate((Math.random() - 0.5) * 100, (Math.random() - 0.5) * 100, (Math.random() - 0.5) * 100);
        temp.label = "ship";
        temp.movement = "static";
        world.push(temp);
    }

    //Start game loop
    loop();
}

function loop() {
    //Control step
    //Translation
    if (keys.q) {
        movementBuffer.ty -= move;
    }
    if (keys.w) {
        movementBuffer.tz -= move;
    }
    if (keys.e) {
        movementBuffer.ty += move;
    }
    if (keys.a) {
        movementBuffer.tx += move;
    }
    if (keys.s) {
        movementBuffer.tz += move;
    }
    if (keys.d) {
        movementBuffer.tx -= move;
    }
    //Rotation
    if (keys.u) {
        movementBuffer.rz -= turn;
    }
    if (keys.i) {
        movementBuffer.rx += turn;
    }
    if (keys.o) {
        movementBuffer.rz += turn;
    }
    if (keys.j) {
        movementBuffer.ry += turn;
    }
    if (keys.k) {
        movementBuffer.rx -= turn;
    }
    if (keys.l) {
        movementBuffer.ry -= turn;
    }
    if (keys.space && fire) {
        world.push(Models.Laser(Primitives.Vertex(0, 0, 0), Primitives.Vertex(0, 0, 1), explosionSize / 50));
        world[world.length - 1].label = "laser";
        world[world.length - 1].timer = 60 * 5;
        fire = false;
    }
    translate(movementBuffer.tx, movementBuffer.ty, movementBuffer.tz);
    rotate(movementBuffer.rx, movementBuffer.ry, movementBuffer.rz);
    //Slow down
    Object.getOwnPropertyNames(movementBuffer).map(function(name) {
        const val = movementBuffer[name];
        if (name.charAt(0) == "t") {
            movementBuffer[name] -= (val > 0 ?
                move / 2 :
                (val < 0 ?
                    -move / 2 :
                    0));
        }
        else if (name.charAt(0) == "r") {
            movementBuffer[name] -= (val > 0 ?
                turn / 2 :
                (val < 0 ?
                    -turn / 2 :
                    0));
        }
    });
    //Limit speed
    Object.getOwnPropertyNames(movementBuffer).map(function(name) {
        const val = movementBuffer[name];
        if (name.charAt(0) == "t") {
            movementBuffer[name] = val > topMove ?
                topMove :
                (val < -topMove ?
                    -topMove :
                    val);
        }
        else if (name.charAt(0) == "r") {
            movementBuffer[name] = val > topTurn ?
                topTurn :
                (val < -topTurn ?
                    -topTurn :
                    val);
        }
    });
    //Stop if too slow
    Object.getOwnPropertyNames(movementBuffer).map(function(name) {
        const val = movementBuffer[name];
        movementBuffer[name] = Math.abs(val) < 1e-4 ? 0 : val;
    });
    //Environment step
    //Laser
    world.forEach(function(a, i) {
        if (a.timer > 0) {
            a.timer--;
        }

        if (a.timer === 0) {
            world.splice(i, 1);
        }
        else if (a.label == "laser") {
            var targets = [];
            world.forEach(function(b, j) {
                if (b.label == "ship" &&
                    a.edges[0].end.dist(
                        b.faces[0].edges[0].start
                    ) < explosionSize) {
                    targets.push(j);
                }
            });
            if (targets.length != 0) {
                world = world.filter(function(c, k) {
                    return !(targets.includes(k)) && k != i;
                });
                var explosion = Models.Circle(
                    a.edges[0].end.pos[0] - explosionSize / 2,
                    a.edges[0].end.pos[1] - explosionSize / 2,
                    a.edges[0].end.pos[2] - explosionSize / 2,
                    explosionSize
                );
                explosion.timer = 5;
                world.push(explosion);
            }
            else {
                a.translate(
                    a.edges[0].end.pos[0] - a.edges[0].start.pos[0],
                    a.edges[0].end.pos[1] - a.edges[0].start.pos[1],
                    a.edges[0].end.pos[2] - a.edges[0].start.pos[2]
                );
            }
        }
    });
    //Enemy ships
    world.forEach(function(a) {
        function avg(arr) {
            return arr.reduce((a, b) => a + b, 0) / arr.length;
        }

        if (a.label == "ship") {
            const nosePos = a.faces[0].edges[0].start.pos;
            const backPos = [
                avg([a.faces[8].edges[0].start.pos[0],
                    a.faces[8].edges[0].start.pos[0]
                ]),
                avg([a.faces[8].edges[0].start.pos[1],
                    a.faces[8].edges[0].start.pos[1]
                ]),
                avg([a.faces[8].edges[0].start.pos[2],
                    a.faces[8].edges[0].start.pos[2]
                ])
            ];
            const toMove = movement[a.movement]([
                nosePos, [
                    nosePos[0] - backPos[0],
                    nosePos[1] - backPos[1],
                    nosePos[2] - backPos[2],
                ]
            ]);
            a.translate(-nosePos[0], -nosePos[1], -nosePos[2]); //Center ship
            a.rotate(toMove.rx, toMove.ry, toMove.rz); //'Real' rotation
            a.translate(nosePos[0], nosePos[1], nosePos[2]); //De-center ship
            a.translate(toMove.tx, toMove.ty, toMove.tz); //'Real' translation
            if (toMove.fire) { /* fire enemy laser */ }
        }
    });
    //Render step
    ctx.fillStyle = "black";
    ctx.fillRect(-canvas.width / 2, -canvas.height / 2,
        canvas.width, canvas.height);
    ctx.strokeStyle = "green";
    ctx.strokeRect(-dims.min / 50, 0,
        dims.min / 25, 1);
    ctx.strokeRect(0, -dims.min / 50,
        1, dims.min / 25);
    ctx.fillStyle = "white";
    ctx.strokeStyle = "white";
    world.forEach(function(a) {
        a.draw();
    });
    //Loop
    window.requestAnimationFrame(loop);
}



init();
