//Canvas setup
let canvas = document.getElementById("canvas");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
let ctx = canvas.getContext("2d");
ctx.translate(canvas.width / 2, canvas.height / 2); //Center canvas
ctx.font = "20pt verdana";

//Constants
const renderDist = 1e2;
const movementSpeed = 1e-2; //Movement acceleration per tick
const turningSpeed = 1e-4 * Math.PI; //Turning acceleration per tick
const topMove = movementSpeed * 20; //Max movement speed
const topTurn = turningSpeed * 50; //Max turning speed
const enemyMove = topMove * 1.5; //Enemy movement speed
const enemyTurn = topTurn; //Enemy turning speed
const initialEnemyCount = 100; //Semi-arbitrary
const explosionSize = 2; //Semi-arbitrary
const laserSpeed = 5; //Measured in laser-lengths per tick //Semi-arbitrary
const laserSize = 0.04; //Semi-arbitrary
const fireCooldown = 100; //Ticks until next shot can be fired

//Kill counter + controller memory initialization
let enemyCount = initialEnemyCount;
let movementBuffer = { tx: 0, ty: 0, tz: 0, rx: 0, ry: 0, rz: 0 };
let fireCountdown = 0;

//Key tracker
let Keys = {};
window.onkeydown = function(event) {
    Keys[event.key] = true;
};
window.onkeyup = function(event) {
    Keys[event.key] = false;
};

//Starting and ending screens
const Screens = {
    start: function() {
        ctx.fillStyle = "black";
        ctx.fillRect(-canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height);
        ctx.strokeStyle = "white";
        ctx.strokeText("Use Q and E to move your ship up and down.", -canvas.width / 2, -canvas.height / 2 + 20);
        ctx.strokeText("Use W and S to move your ship forward and back.", -canvas.width / 2, -canvas.height / 2 + 40);
        ctx.strokeText("Use A and D to move your ship left and right.", -canvas.width / 2, -canvas.height / 2 + 60);
        ctx.strokeText("Use U and O to spin your ship left and right.", -canvas.width / 2, -canvas.height / 2 + 80);
        ctx.strokeText("Use I and K to turn your ship up and down.", -canvas.width / 2, -canvas.height / 2 + 100);
        ctx.strokeText("Use J and L to turn your ship left and right.", -canvas.width / 2, -canvas.height / 2 + 120);
        ctx.strokeText("Use the spacebar to shoot a missile.", -canvas.width / 2, -canvas.height / 2 + 140);
        ctx.strokeText("Hit an enemy ship with a missile to destroy it.", -canvas.width / 2, -canvas.height / 2 + 160);
        ctx.strokeText("Destroy all 100 of the enemy ships to win!", -canvas.width / 2, -canvas.height / 2 + 180);
        ctx.strokeText("Dodge the enemies. If one rams into you, you lose.", -canvas.width / 2, -canvas.height / 2 + 200);
        ctx.strokeText("Watch out for enemies behind you!", -canvas.width / 2, -canvas.height / 2 + 220);
        ctx.strokeText("The number of ships you killed is in the bottom left corner.", -canvas.width / 2, -canvas.height / 2 + 240);
        ctx.strokeText("Click to start.", -canvas.width / 2, -canvas.height / 2 + 280);
    },
    win: function() {
        ctx.fillStyle = "black";
        ctx.fillRect(-canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height);
        ctx.strokeStyle = "white";
        ctx.strokeText("YOU WIN!", -canvas.width / 18, 0);
        ctx.strokeText("Reload the page to play again.", -canvas.width / 7, 30);
    },
    lose: function() {
        ctx.fillStyle = "black";
        ctx.fillRect(-canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height);
        ctx.strokeStyle = "white";
        ctx.strokeText("YOU LOSE!", -canvas.width / 20, 0);
        ctx.strokeText("Reload the page to play again.", -canvas.width / 7, 30);
        ctx.strokeText("Enemy ships destroyed: " + (initialEnemyCount - enemyCount), -canvas.width / 2, canvas.height / 2);
    }
};

//Primitive 3D objects to build the game models with
const Primitives = {
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
                const cosX = Math.cos(x);
                const sinX = Math.sin(x);
                this.pos = [this.pos[0], (this.pos[1] * cosX) + (this.pos[2] * -sinX), (this.pos[1] * sinX) + (this.pos[2] * cosX)];
                //Rotate around Y axis
                const cosY = Math.cos(y);
                const sinY = Math.sin(y);
                this.pos = [(this.pos[0] * cosY) + (this.pos[2] * sinY), this.pos[1], (this.pos[0] * -sinY) + (this.pos[2] * cosY)];
                //Rotate around Z axis
                const cosZ = Math.cos(z);
                const sinZ = Math.sin(z);
                this.pos = [(this.pos[0] * cosZ) + (this.pos[1] * -sinZ), (this.pos[0] * sinZ) + (this.pos[1] * cosZ), this.pos[2]];
            },
            visible: function() {
                return this.pos[2] > 0 && this.pos[2] < renderDist;
            },
            dist: function(vertex) {
                return Math.sqrt(
                    Math.pow(this.pos[0] - vertex.pos[0], 2) +
                    Math.pow(this.pos[1] - vertex.pos[1], 2) +
                    Math.pow(this.pos[2] - vertex.pos[2], 2)
                );
            },
            clone: function() {
                return Primitives.Vertex(this.pos[0], this.pos[1], this.pos[2]);
            }
        };
    },
    Edge: function(vertex1, vertex2) {
        return {
            start: vertex1.clone(),
            end: vertex2.clone(),
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
    Circle: function(x, y, z, size) {
        let vertex = Primitives.Vertex(x, y, z);
        vertex.draw = function() {
            if (this.visible()) {
                ctx.arc(
                    get2d(this.pos)[0],
                    get2d(this.pos)[1],
                    size * minDim / this.pos[2],
                    0,
                    2 * Math.PI
                );
                ctx.fill();
            }
        };
        return vertex;
    }
};
//Get 2D position from 3D position by using (x/z, y/z)
function get2d(pos) {
    if (pos[2] > 0 && pos[2] < renderDist) {
        return [
            (pos[0] / pos[2]) * minDim,
            (pos[1] / pos[2]) * minDim * -1
        ];
    }
    return [NaN, NaN];
}
//Minumum screen dimension
const minDim = Math.min(window.innerWidth, window.innerHeight);

//Models built off of the Primitives
const Models = {
    Star: function(x, y, z) {
        return Primitives.Vertex(x, y, z); //Wrapper for clarity of use
    },
    Explosion: function(x, y, z, size) {
        return Primitives.Circle(x, y, z, size); //Wrapper for clarity of use
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
            //Nose
            Primitives.Face([enosel, ebodyflu, enoseu]),
            Primitives.Face([enoseu, ebodyfur, enoser]),
            Primitives.Face([enoser, ebodyfrd, enosed]),
            Primitives.Face([enosed, ebodyfdl, enosel]),
            //Body
            Primitives.Face([ebodyflu, ebodyu, ebodyblu, ebodyl]),
            Primitives.Face([ebodyfur, ebodyr, ebodybur, ebodyu]),
            Primitives.Face([ebodyfrd, ebodyd, ebodybrd, ebodyr]),
            Primitives.Face([ebodyfdl, ebodyl, ebodybdl, ebodyd]),
            Primitives.Face([ebodyblu, ebodybur, ebodybrd, ebodybdl]),
            //Wings
            Primitives.Face([elwingl, elwingf, elwingr, elwingb]),
            Primitives.Face([erwingl, erwingf, erwingr, erwingb])
        ]);
    },
    Laser: function(x1, y1, z1, x2, y2, z2, splay) {
        const start = Primitives.Vertex(x1, y1, z1);
        const end = Primitives.Vertex(x2, y2, z2);
        return Primitives.Face([ //Used as a container for the edges
            Primitives.Edge(start, end),
            Primitives.Edge(Primitives.Vertex(start.pos[0] + splay, start.pos[1], start.pos[2]), end),
            Primitives.Edge(Primitives.Vertex(start.pos[0], start.pos[1] + splay, start.pos[2]), end),
            Primitives.Edge(Primitives.Vertex(start.pos[0] - splay, start.pos[1], start.pos[2]), end),
            Primitives.Edge(Primitives.Vertex(start.pos[0], start.pos[1] - splay, start.pos[2]), end)
        ]);
    }
};

//Takes ship info and returns where to move and turn it
const AI = function AI(pos, dir) {
    //Get target direction vector
    const posLen = Math.sqrt(
        Math.pow(pos[0], 2) +
        Math.pow(pos[1], 2) +
        Math.pow(pos[2], 2)
    );
    const posNorm = [pos[0] / posLen, pos[1] / posLen, pos[2] / posLen];
    const targetDir = [posNorm[0] * -1, posNorm[1] * -1, posNorm[2] * -1];
    //Turn around y-axis
    let turnY = 0;
    if (dir[0] < targetDir[0] - enemyTurn) {
        turnY = -enemyTurn;
    }
    else if (dir[0] > targetDir[0] + enemyTurn) {
        turnY = enemyTurn;
    }
    //Turn around x-axis
    let turnX = 0;
    if (dir[1] > targetDir[1] + enemyTurn) {
        turnX = -enemyTurn;
    }
    else if (dir[1] < targetDir[1] - enemyTurn) {
        turnX = enemyTurn;
    }
    //Randomize movement to avoid clustering
    turnX += (Math.random() - 0.5) / 10;
    turnY += (Math.random() - 0.5) / 10;
    const turnZ = 0.01;
    //Return data for ship to be moved
    return {
        tx: dir[0] * enemyMove,
        ty: dir[1] * enemyMove,
        tz: dir[2] * enemyMove,
        rx: turnX,
        ry: turnY,
        rz: turnZ
    };
};

//World setup
let World = [];
//Add stars
for (let i = 0; i < 1e4; ++i) {
    World.push(Models.Star(
        (Math.random() - 0.5) * 100,
        (Math.random() - 0.5) * 100,
        (Math.random() - 0.5) * 100));
}
//Add enemy ships
for (let i = 0; i < initialEnemyCount; ++i) {
    const temp = Models.Ship((Math.random() - 0.5) * 100, (Math.random() - 0.5) * 100, (Math.random() - 0.5) * 100, 1);
    temp.rotate((Math.random() - 0.5) * 100, (Math.random() - 0.5) * 100, (Math.random() - 0.5) * 100);
    temp.label = "ship";
    World.push(temp);
}

//Show initial instruction screen
Screens.start();
//Start game loop on click
window.onclick = function loop() {
    //Control step
    //Translation
    if (Keys["q"]) {
        movementBuffer.ty -= movementSpeed;
    }
    if (Keys["w"]) {
        movementBuffer.tz -= movementSpeed;
    }
    if (Keys["e"]) {
        movementBuffer.ty += movementSpeed;
    }
    if (Keys["a"]) {
        movementBuffer.tx += movementSpeed;
    }
    if (Keys["s"]) {
        movementBuffer.tz += movementSpeed;
    }
    if (Keys["d"]) {
        movementBuffer.tx -= movementSpeed;
    }
    //Rotation
    if (Keys["u"]) {
        movementBuffer.rz -= turningSpeed;
    }
    if (Keys["i"]) {
        movementBuffer.rx += turningSpeed;
    }
    if (Keys["o"]) {
        movementBuffer.rz += turningSpeed;
    }
    if (Keys["j"]) {
        movementBuffer.ry += turningSpeed;
    }
    if (Keys["k"]) {
        movementBuffer.rx -= turningSpeed;
    }
    if (Keys["l"]) {
        movementBuffer.ry -= turningSpeed;
    }
    //Move world around player
    World.forEach(function(a) {
        a.translate(movementBuffer.tx, movementBuffer.ty, movementBuffer.tz);
    });
    World.forEach(function(a) {
        a.rotate(movementBuffer.rx, movementBuffer.ry, movementBuffer.rz);
    });
    //Shooting
    fireCountdown--;
    fireCountdown = fireCountdown < 1 ? 0 : fireCountdown;
    if (Keys[" "] && fireCountdown == 0) {
        World.push(Models.Laser(0, 0, 0, 0, 0, 1, laserSize));
        World[World.length - 1].label = "laser";
        World[World.length - 1].timer = 60 * 5;
        fireCountdown = fireCooldown;
    }

    //Slow down
    Object.getOwnPropertyNames(movementBuffer).map(function(name) {
        const val = movementBuffer[name];
        if (name.charAt(0) == "t") {
            movementBuffer[name] -= (val > 0 ? movementSpeed / 2 : (val < 0 ? -movementSpeed / 2 : 0));
        }
        else if (name.charAt(0) == "r") {
            movementBuffer[name] -= (val > 0 ?
                turningSpeed / 2 :
                (val < 0 ?
                    -turningSpeed / 2 :
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
    World.forEach(function(a, i) {
        //Lasers
        if (a.timer > 0) {
            a.timer--;
        }
        if (a.timer === 0) {
            World.splice(i, 1);
        }
        else if (a.label == "laser") {
            let targets = [];
            //Look for ships within range of laser
            World.forEach(function(b, j) {
                if (b.label == "ship" &&
                    a.edges[0].end.dist(b.faces[0].edges[0].start) < explosionSize) {
                    targets.push(j);
                }
            });
            //If there's a ship, explode
            if (targets.length != 0) {
                World = World.filter(function(c, k) {
                    if (!(targets.includes(k))) {
                        return true;
                    }
                    else {
                        enemyCount--;
                        return false;
                    }
                });
                const explosion = Models.Explosion(
                    a.edges[0].end.pos[0],
                    a.edges[0].end.pos[1],
                    a.edges[0].end.pos[2],
                    explosionSize
                );
                explosion.timer = 5;
                World.push(explosion);
            }
            //Otherwise, move the laser forward
            else {
                for (let i = 0; i < laserSpeed; ++i) {
                    a.translate(
                        a.edges[0].end.pos[0] - a.edges[0].start.pos[0],
                        a.edges[0].end.pos[1] - a.edges[0].start.pos[1],
                        a.edges[0].end.pos[2] - a.edges[0].start.pos[2]
                    );
                }
            }
        }

        //Enemy ships
        if (a.label == "ship") {
            const nosePos = a.faces[0].edges[0].start.pos;
            const backPos = a.faces[8].edges[0].start.pos;
            const toMove = AI(
                nosePos, [
                    nosePos[0] - backPos[0],
                    nosePos[1] - backPos[1],
                    nosePos[2] - backPos[2]
                ]
            );
            a.translate(-nosePos[0], -nosePos[1], -nosePos[2]); //Center ship
            a.rotate(toMove.rx, toMove.ry, toMove.rz); //'Real' rotation
            a.translate(nosePos[0], nosePos[1], nosePos[2]); //De-center ship
            a.translate(toMove.tx, toMove.ty, toMove.tz); //'Real' translation
        }
    });

    //Display step
    ctx.fillStyle = "black";
    ctx.fillRect(-canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height);
    ctx.strokeStyle = "green";
    ctx.strokeRect(-10, 0, 20, 1);
    ctx.strokeRect(0, -10, 1, 20);
    ctx.fillStyle = "white";
    ctx.strokeStyle = "white";
    World.forEach(function(a) {
        a.draw();
    });
    //Show score
    ctx.strokeText("Enemy ships destroyed: " + (initialEnemyCount - enemyCount), -canvas.width / 2, canvas.height / 2);

    //Win screen (once all enemies are killed)
    if (!enemyCount) {
        Screens.win();
        return;
    }

    //Lose screen (if an enemy is too close)
    if (World.some(function(item) {
            return item.label == "ship" && new Primitives.Vertex(0, 0, 0).dist(item.faces[0].edges[0].start) < 1;
        })) {
        Screens.lose();
        return;
    }

    //Loop
    window.requestAnimationFrame(loop);
};
