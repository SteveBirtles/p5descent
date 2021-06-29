let textures = {};

let inconsolata;


function preload() {

    inconsolata = loadFont('fonts/inconsolata.otf');

    for (let f of textureFiles) {
        textures[f] = loadImage("gfx/" + f + ".png");
    }

}

function keyPressed() {
    if (keyCode === LEFT_ARROW) {
        r--;
        if (r < 0) r = robots.length - 1;
    } else if (keyCode === RIGHT_ARROW) {
        r++;
        if (r > robots.length - 1) r = 0;
    } else if (keyCode === UP_ARROW) {
        size *= 1.25;
    } else if (keyCode === DOWN_ARROW) {
        size /= 1.25;
    }
}

p5.disableFriendlyErrors = true;

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}

let robots = [];
let materials = {};
let skipped = 0;

function setup() {
    createCanvas(windowWidth, windowHeight, WEBGL);

    for (let f of objectFiles) {

        fetch("mtl/" + f + ".mtl")
            .then(response => response.text())
            .then(material => {

                let materialName = null;

                const materialData = material.split("\n");

                for (let i = 0; i < materialData.length; i++) {
                    const bits = materialData[i].split(" ");
                    if (bits[0] === "Kd") {
                        if (!materials.hasOwnProperty(materialName)) {
                            materials[materialName] = {
                                r: Number(bits[1]),
                                g: Number(bits[2]),
                                b: Number(bits[3])
                            };
                        }
                    } else if (bits[0] === "newmtl") {
                        materialName = bits[1];
                    }
                }

            });

        fetch("obj/" + f + ".obj")
            .then(response => response.text())
            .then(robot => {

                let vertices = [];
                let normals = [];
                let texcoords = [];
                let faces = [];
                let currentMaterial;

                const robotData = robot.split("\n");

                for (let i = 0; i < robotData.length; i++) {
                    const bits = robotData[i].split(" ");
                    if (bits[0] === "v") {
                        vertices.push({
                            x: Number(bits[1]),
                            y: Number(bits[2]),
                            z: Number(bits[3])
                        });
                    } else if (bits[0] === "vn") {
                        normals.push({
                            x: Number(bits[1]),
                            y: Number(bits[2]),
                            z: Number(bits[3])
                        });
                    } else if (bits[0] === "vt") {
                        texcoords.push({
                            u: Number(bits[1]),
                            v: Number(bits[2])
                        });
                    } else if (bits[0] === "usemtl") {
                        currentMaterial = bits[1];
                    } else if (bits[0] === "f") {
                        let newFaces = [];
                        for (let j = 1; j < bits.length; j++) {
                            const subBits = bits[j].split("/");
                            newFaces.push({
                                vertex: Number(subBits[0]) - 1,
                                texcoord: Number(subBits[1]) - 1,
                                normal: Number(subBits[2]) - 1,
                                texture: currentMaterial
                            });
                        }
                        faces.push(newFaces);
                    }

                }

                robots.push({
                    name: f,
                    vertices,
                    normals,
                    texcoords,
                    faces
                });

            });




    }
}

let alerted = false;

let size = 80;
let r = 0;
let angle = 0;

let myX = 0, myY = 0, myZ = 300;

function draw() {

    angle += deltaTime / 1000;

    background(0, 0, 0);

    stroke(255, 255, 255);

    if (robots.length !== objectFiles.length - skipped) return;

    push();

    noStroke();

    translate(0, 0, -300);

    rotateY(angle);

    for (let face of robots[r].faces) {

        let nx = cos(angle) * robots[r].normals[face[0].normal].x + sin(angle) * robots[r].normals[face[0].normal].z;
        let ny = robots[r].normals[face[0].normal].y;
        let nz = -sin(angle) * robots[r].normals[face[0].normal].x + cos(angle) * robots[r].normals[face[0].normal].z;

        let cx = 0;
        let cy = 0;
        let cz = 0;
        for (let p = 0; p < face.length; p++) {
            cx += cos(angle) * robots[r].vertices[face[p].vertex].x + sin(angle) * robots[r].vertices[face[p].vertex].z;
            cy += robots[r].vertices[face[p].vertex].y;
            cz += -sin(angle) * robots[r].vertices[face[p].vertex].x + cos(angle) * robots[r].vertices[face[p].vertex].z;
        }
        cx /= face.length;
        cy /= face.length;
        cz /= face.length;

        let lx = 0;
        let ly = 100;
        let lz = 200;

        let aSquared = pow(lx - cx, 2) + pow(ly - cy, 2) + pow(lz - cz, 2);
        let bSquared = pow(nx, 2) + pow(ny, 2) + pow(nz, 2);
        let cSquared = pow(lx - cx - nx, 2) + pow(ly - cy - ny, 2) + pow(lz - cz - nz, 2);

        let cosformula = (aSquared + bSquared - cSquared) / (2 * sqrt(aSquared) * sqrt(bSquared));
        let illumination = min(255, max(64, 192 * cosformula));


        if (face[0].texture !== null) {
            if (textures.hasOwnProperty(face[0].texture)) {
                textures[face[0].texture].used = true;
                texture(textures[face[0].texture]);
                textureMode(NORMAL);
                textureWrap(REPEAT);
                tint(illumination, illumination, illumination);
            } else if (materials.hasOwnProperty(face[0].texture)) {
                fill(illumination * materials[face[0].texture].r,
                    illumination * materials[face[0].texture].g,
                    illumination * materials[face[0].texture].b);
            } else {
                fill(illumination, illumination, illumination);
            }
        }

        beginShape();

        for (let p = 0; p < face.length; p++) {

            if (face[0].texture !== null && face[p].texcoord >= 0) {
                vertex(robots[r].vertices[face[p].vertex].x * size,
                    -robots[r].vertices[face[p].vertex].y * size,
                    robots[r].vertices[face[p].vertex].z * size,
                    robots[r].texcoords[face[p].texcoord].u,
                    -robots[r].texcoords[face[p].texcoord].v
                );
            } else {
                vertex(robots[r].vertices[face[p].vertex].x * size,
                    -robots[r].vertices[face[p].vertex].y * size,
                    robots[r].vertices[face[p].vertex].z * size
                );
            }
        }

        endShape(CLOSE);
    }

    pop();

    textFont(inconsolata);
    textAlign(CENTER, TOP);
    textSize(18);
    fill(255, 255, 255);
    text(robots[r].name, 0, -windowHeight / 2 + 20);

}