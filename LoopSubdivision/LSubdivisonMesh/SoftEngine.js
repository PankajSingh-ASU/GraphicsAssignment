var SoftEngine;
(function (SoftEngine) {
    var Camera = (function () {
        function Camera() {
            this.Position = BABYLON.Vector3.Zero();
            this.Target = BABYLON.Vector3.Zero();
        }
        return Camera;
    })();
    SoftEngine.Camera = Camera;
    var edgeMap;
    var Mesh = (function () {
        function Mesh(name, verticesCount, facesCount) {
            this.name = name;
            this.Vertices = new Array(verticesCount);
            this.Faces = new Array(facesCount);
            this.Rotation = new BABYLON.Vector3(0, 0, 0);
            this.Position = new BABYLON.Vector3(0, 0, 0);
        }
        return Mesh;
    })();
    SoftEngine.Mesh = Mesh;
    var Device;
    Device = (function () {
        function Device(canvas) {
            this.workingCanvas = canvas;
            this.workingWidth = canvas.width;
            this.workingHeight = canvas.height;
            this.workingContext = this.workingCanvas.getContext("2d");
        }

        Device.prototype.clear = function () {
            this.workingContext.clearRect(0, 0, this.workingWidth, this.workingHeight);
            this.backbuffer = this.workingContext.getImageData(0, 0, this.workingWidth, this.workingHeight);
        };
        Device.prototype.present = function () {
            this.workingContext.putImageData(this.backbuffer, 0, 0);
        };
        // Project takes some 3D coordinates and transform them
// in 2D coordinates using the transformation matrix
        Device.prototype.project = function (coord, transMat) {
            var point = BABYLON.Vector3.TransformCoordinates(coord, transMat);
            // The transformed coordinates will be based on coordinate system
            // starting on the center of the screen. But drawing on screen normally starts
            // from top left. We then need to transform them again to have x:0, y:0 on top left.
            var x = point.x * this.workingWidth + this.workingWidth / 2.0 >> 0;
            var y = -point.y * this.workingHeight + this.workingHeight / 2.0 >> 0;
            return (new BABYLON.Vector3(x, y, point.z));
        };

// drawPoint calls putPixel but does the clipping operation before
        Device.prototype.drawPoint = function (point, color) {
            // Clipping what's visible on screen
            if (point.x >= 0 && point.y >= 0 && point.x < this.workingWidth
                && point.y < this.workingHeight) {
                // Drawing a yellow point
                this.putPixel(point.x, point.y, color);
            }
        };
        Device.prototype.putPixel = function (x, y, color) {
            this.backbufferdata = this.backbuffer.data;
            var index = ((x >> 0) + (y >> 0) * this.workingWidth) * 4;
            this.backbufferdata[index] = color.r * 255;
            this.backbufferdata[index + 1] = color.g * 255;
            this.backbufferdata[index + 2] = color.b * 255;
            this.backbufferdata[index + 3] = color.a * 255;
        };
        //Device.prototype.project = function (coord, transMat) {
        //    var point = BABYLON.Vector3.TransformCoordinates(coord, transMat);
        //    var x = point.x * this.workingWidth + this.workingWidth / 2.0 >> 0;
        //    var y = -point.y * this.workingHeight + this.workingHeight / 2.0 >> 0;
        //    return (new BABYLON.Vector2(x, y));
        //};
        //Device.prototype.drawPoint = function (point) {
        //    if (point.x >= 0 && point.y >= 0 && point.x < this.workingWidth && point.y < this.workingHeight) {
        //        this.putPixel(point.x, point.y, new BABYLON.Color4(1, 1, 0, 1));
        //    }
        //};
        // Clamping values to keep them between 0 and 1
        Device.prototype.clamp = function (value, min, max) {
            if (typeof min === "undefined") { min = 0; }
            if (typeof max === "undefined") { max = 1; }
            return Math.max(min, Math.min(value, max));
        };

// Interpolating the value between 2 vertices
// min is the starting point, max the ending point
// and gradient the % between the 2 points
        Device.prototype.interpolate = function (min, max, gradient) {
            return min + (max - min) * this.clamp(gradient);
        };

// drawing line between 2 points from left to right
// papb -> pcpd
// pa, pb, pc, pd must then be sorted before
        Device.prototype.processScanLine = function (y, pa, pb, pc, pd, color) {
            // Thanks to current Y, we can compute the gradient to compute others values like
            // the starting X (sx) and ending X (ex) to draw between
            // if pa.Y == pb.Y or pc.Y == pd.Y, gradient is forced to 1
            var gradient1 = pa.y != pb.y ? (y - pa.y) / (pb.y - pa.y) : 1;
            var gradient2 = pc.y != pd.y ? (y - pc.y) / (pd.y - pc.y) : 1;

            var sx = this.interpolate(pa.x, pb.x, gradient1) >> 0;
            var ex = this.interpolate(pc.x, pd.x, gradient2) >> 0;

            // drawing a line from left (sx) to right (ex)
            for(var x = sx; x < ex; x++) {
                this.drawPoint(new BABYLON.Vector2(x, y), color);
            }
        };

        Device.prototype.drawTriangle = function (p1, p2, p3, color) {
            // Sorting the points in order to always have this order on screen p1, p2 & p3
            // with p1 always up (thus having the Y the lowest possible to be near the top screen)
            // then p2 between p1 & p3
            if(p1.y > p2.y) {
                var temp = p2;
                p2 = p1;
                p1 = temp;
            }
            if(p2.y > p3.y) {
                var temp = p2;
                p2 = p3;
                p3 = temp;
            }
            if(p1.y > p2.y) {
                var temp = p2;
                p2 = p1;
                p1 = temp;
            }

            // inverse slopes
            var dP1P2; var dP1P3;

            // http://en.wikipedia.org/wiki/Slope
            // Computing slopes
            if(p2.y - p1.y > 0) {
                dP1P2 = (p2.x - p1.x) / (p2.y - p1.y);
            } else {
                dP1P2 = 0;
            }

            if(p3.y - p1.y > 0) {
                dP1P3 = (p3.x - p1.x) / (p3.y - p1.y);
            } else {
                dP1P3 = 0;
            }

            // First case where triangles are like that:
            // P1
            // -
            // --
            // - -
            // -  -
            // -   - P2
            // -  -
            // - -
            // -
            // P3
            if(dP1P2 > dP1P3) {
                for(var y = p1.y >> 0; y <= p3.y >> 0; y++) {
                    if(y < p2.y) {
                        this.processScanLine(y, p1, p3, p1, p2, color);
                    } else {
                        this.processScanLine(y, p1, p3, p2, p3, color);
                    }
                }
            }
            // First case where triangles are like that:
            //       P1
            //        -
            //       --
            //      - -
            //     -  -
            // P2 -   -
            //     -  -
            //      - -
            //        -
            //       P3
            else {
                for(var y = p1.y >> 0; y <= p3.y >> 0; y++) {
                    if(y < p2.y) {
                        this.processScanLine(y, p1, p2, p1, p3, color);
                    } else {
                        this.processScanLine(y, p2, p3, p1, p3, color);
                    }
                }
            }
        };
        Device.prototype.drawLine = function (point0, point1) {
            var dist = point1.subtract(point0).length();
            if (dist < 2) {
                return;
            }
            var middlePoint = point0.add((point1.subtract(point0)).scale(0.5));
            this.drawPoint(middlePoint);
            this.drawLine(point0, middlePoint);
            this.drawLine(middlePoint, point1);
        };
        Device.prototype.drawBline = function (point0, point1) {
            var x0 = point0.x >> 0;
            var y0 = point0.y >> 0;
            var x1 = point1.x >> 0;
            var y1 = point1.y >> 0;
            var dx = Math.abs(x1 - x0);
            var dy = Math.abs(y1 - y0);
            var sx = (x0 < x1) ? 1 : -1;
            var sy = (y0 < y1) ? 1 : -1;
            var err = dx - dy;
            while (true) {
                this.drawPoint(new BABYLON.Vector2(x0, y0));
                if ((x0 == x1) && (y0 == y1)) {
                    break;
                }
                var e2 = 2 * err;
                if (e2 > -dy) {
                    err -= dy;
                    x0 += sx;
                }
                if (e2 < dx) {
                    err += dx;
                    y0 += sy;
                }
            }
        };

        Device.prototype.render = function (camera, cMesh) {
            var viewMatrix = BABYLON.Matrix.LookAtLH(camera.Position, camera.Target, BABYLON.Vector3.Up());
            var projectionMatrix = BABYLON.Matrix.PerspectiveFovLH(0.78, this.workingWidth / this.workingHeight, 0.01, 1.0);

                //cMesh=loopSubDivision(cMesh);
                var worldMatrix = BABYLON.Matrix.RotationYawPitchRoll(cMesh.Rotation.y, cMesh.Rotation.x, cMesh.Rotation.z).multiply(BABYLON.Matrix.Translation(cMesh.Position.x, cMesh.Position.y, cMesh.Position.z));
                var transformMatrix = worldMatrix.multiply(viewMatrix).multiply(projectionMatrix);
                //for (var indexFaces = 0; indexFaces < cMesh.Faces.length; indexFaces++) {
                //    var currentFace = cMesh.Faces[indexFaces];
                //    var vertexA = cMesh.Vertices[currentFace.A];
                //    var vertexB = cMesh.Vertices[currentFace.B];
                //    var vertexC = cMesh.Vertices[currentFace.C];
                //    var pixelA = this.project(vertexA, transformMatrix);
                //    var pixelB = this.project(vertexB, transformMatrix);
                //    var pixelC = this.project(vertexC, transformMatrix);
                //    this.drawBline(pixelA, pixelB);
                //    this.drawBline(pixelB, pixelC);
                //    this.drawBline(pixelC, pixelA);
                //
                //}
            for (var indexFaces = 0; indexFaces < cMesh.Faces.length; indexFaces++) {
                var currentFace = cMesh.Faces[indexFaces];
                var vertexA = cMesh.Vertices[currentFace.A];
                var vertexB = cMesh.Vertices[currentFace.B];
                var vertexC = cMesh.Vertices[currentFace.C];

                var pixelA = this.project(vertexA, transformMatrix);
                var pixelB = this.project(vertexB, transformMatrix);
                var pixelC = this.project(vertexC, transformMatrix);

                var color = 0.25 + ((indexFaces % cMesh.Faces.length) / cMesh.Faces.length) * 0.75;
                this.drawTriangle(pixelA, pixelB, pixelC, new BABYLON.Color4(color, color, color, 1));
            }
        };
        Device.prototype.CreateMeshesFromJSON = function (jsonObject) {
            var meshes = [];
            for (var meshIndex = 0; meshIndex < jsonObject.meshes.length; meshIndex++) {
                var verticesArray = jsonObject.meshes[meshIndex].vertices;
                var indicesArray = jsonObject.meshes[meshIndex].indices;
                var uvCount = jsonObject.meshes[meshIndex].uvCount;
                var verticesStep = 1;
                switch (uvCount) {
                    case 0:
                        verticesStep = 6;
                        break;
                    case 1:
                        verticesStep = 8;
                        break;
                    case 2:
                        verticesStep = 10;
                        break;
                }
                var verticesCount = verticesArray.length / verticesStep;
                var facesCount = indicesArray.length / 3;
                var mesh = new SoftEngine.Mesh(jsonObject.meshes[meshIndex].name, verticesCount, facesCount);
                for (var index = 0; index < verticesCount; index++) {
                    var x = verticesArray[index * verticesStep];
                    var y = verticesArray[index * verticesStep + 1];
                    var z = verticesArray[index * verticesStep + 2];
                    mesh.Vertices[index] = new BABYLON.Vector3(x, y, z);
                }
                edgeMap = new Map();
                for (var index = 0; index < facesCount; index++) {
                    var a = indicesArray[index * 3];
                    var b = indicesArray[index * 3 + 1];
                    var c = indicesArray[index * 3 + 2];

                    mesh.Faces[index] = {
                        A: a,
                        B: b,
                        C: c
                    };

                }

                var position = jsonObject.meshes[meshIndex].position;
                mesh.Position = new BABYLON.Vector3(position[0], position[1], position[2]);
                meshes.push(mesh);
            }
            return meshes;
        };

        Device.prototype.createNewMeshFromLoopSubdivision= function (mesh)
        {
            var edgeCount= createEdgeMap(mesh);
            return loopSubDivision(mesh,edgeCount);
        };
        function loopSubDivision(cMesh,edgeCount){
            /**
             * implement loops subdivision refining step
             */
            var name=cMesh.name;
            var vertices=cMesh.Vertices;
            var verticesCount=cMesh.Vertices.length;
            var facesCount=cMesh.Faces.length;
            // var edgesCount=cMesh.edgesCount;//if I will get an idea to calculate an edge I can use it
            var newMesh=new SoftEngine.Mesh(name, verticesCount+edgeCount, 4*facesCount);
            var newVertices=newMesh.Vertices;
            var newFacesIndex=0;

            var childMap=new Map();
            var currentEdgeArray=Array.from(edgeMap.values);
            for (var indexFaces = 0; indexFaces < cMesh.Faces.length; indexFaces++) {
                var currentFace = cMesh.Faces[indexFaces];
                var vertexA = currentFace.A;
                var vertexB = currentFace.B;
                var vertexC = currentFace.C;
                var newVertexAB,newVertexAC,newVertexBC;
                var keyAB=getKey(vertexA,vertexB);
                if(childMap.has(keyAB))
                {
                    //edge is already visited
                    newVertexAB=childMap.get(keyAB);
                }
                else{
                    var newAB=refiningNewVertex(vertices,vertexA,vertexB);
                    newVertexAB=verticesCount;
                    newVertices[verticesCount++]=newAB;
                    childMap.set(keyAB,newVertexAB);
                }
                var keyAC=getKey(vertexA,vertexC);
                if(childMap.has(keyAC))
                {
                    //edge is already visited
                    newVertexAC=childMap.get(keyAC);
                }
                else{
                    var newAC=refiningNewVertex(vertices,vertexA,vertexC);
                    newVertexAC=verticesCount;
                    newVertices[verticesCount++]=newAC;
                    childMap.set(keyAC,newVertexAC);
                }
                var keyBC=getKey(vertexB,vertexC);
                if(childMap.has(keyBC))
                {
                    //edge is already visited
                    newVertexBC=childMap.get(keyBC);
                }
                else{
                    var newBC=refiningNewVertex(vertices,vertexB,vertexC);
                    newVertexBC=verticesCount;
                    newVertices[verticesCount++]=newBC;
                    childMap.set(keyBC,newVertexBC);
                }

                //add new verteices in newVertices array
                newMesh.Faces[newFacesIndex++]={
                    A: vertexA,
                    B: newVertexAB,
                    C: newVertexAC
                };
                newMesh.Faces[newFacesIndex++]={
                    A: newVertexAB,
                    B: vertexB,
                    C: newVertexBC
                };
                newMesh.Faces[newFacesIndex++]={
                    A: newVertexBC,
                    B: vertexC,
                    C: newVertexAC
                };
                newMesh.Faces[newFacesIndex++]={
                    A: newVertexAC,
                    B: newVertexAB,
                    C:newVertexBC
                };

            }
            smoothening(newVertices,vertices);
            return newMesh;

        };

        function getKey(v1,v2)
        {
            if(v1>v2)
            {
                var temp=v1;
                v1=v2;
                v2=temp;
            }

            var key=v1+','+v2;
            return key;

        };
        function refiningNewVertex(vertices,v1,v2){

            var sum=(vertices[v1].add(vertices[v2]));


            var p1adjSet=edgeMap.get(v1);
            var p2adjSet=edgeMap.get(v2);
            //I noticed in the mesh only 2 opposite vertices are attached to each edge
            var insectSet=intersectionSet(p1adjSet, p2adjSet);
            var intersectArray=Array.from(insectSet);
            if(intersectArray.length>2)
                console.log(v1+','+v2+' '+intersectArray);
            var intersectSum= new BABYLON.Vector3(0,0,0);
            if(intersectArray.length==1)
            {
                var v3=intersectArray[0];
                //boundary edge: need to find reflection of
                var p4=reflectPoint(vertices[v3],vertices[v1],vertices[v2]);
                intersectSum=p4.add(vertices[v3]);
                //returning midpoint of the 2 points
                // 	return sum.scale(0.5);
                console.log(v1+','+v2+' '+intersectArray);

            }
            else{
                //mostly only 2 opposite vertices are attached to each edge
                insectSet.forEach(function(value) {
                    intersectSum=intersectSum.add(vertices[value]);
                });

            }
            sum=sum.scale(3);
            sum=sum.add(intersectSum);
            return sum.scale(1/8);
        };

        function smoothening(newVertices,oldvertices)
        {
            for(index=0;index<oldvertices.length;index++)
                // newVertices[index]=oldvertices[index];
                newVertices[index]=refiningCurrentVertex(oldvertices,index);

        };
        function refiningCurrentVertex(vertices,a){
            var adjacencyVertices= edgeMap.get(a);
            //console.log('a='+a);
            //console.log(adjacencyVertices);
            var n=adjacencyVertices.size;
            //var B=3/(n*(n+2));//B is beta
            var theta=Math.PI*(2/n);
            var h=Math.cos(theta);
            var m=(3+2*h);
            var q=m*m/64;
            var B=(0.625-q)/n;

            var newA=vertices[a].scale(1-n*B);
            var sum=new BABYLON.Vector3(0, 0, 0);
            adjacencyVertices.forEach(function(adVertex) {
                sum=sum.add(vertices[adVertex]);
            });
            sum=sum.scale(B);
            return newA.add(sum);

        };
        // function refiningCurrentVertex(vertices,a){
// 					return vertices[a];
// 				};
        Device.prototype.LoadJSONFileAsync = function (fileName, callback) {
            var jsonObject = {};
            var xmlhttp = new XMLHttpRequest();
            xmlhttp.open("GET", fileName, true);
            var that = this;
            xmlhttp.onreadystatechange = function () {
                if (xmlhttp.readyState == 4 && (xmlhttp.status == 200 || xmlhttp.status == 0)) {
                    var allText = xmlhttp.responseText;
                    jsonObject = JSON.parse(allText);
                    callback(that.CreateMeshesFromJSON(jsonObject));
                }
            };
            xmlhttp.send(null);
        };

        function setNewEdgeMap(edgeMap, a, b, c) {
            var adjacencySet;
            if(edgeMap.has(a))
            {
                adjacencySet=edgeMap.get(a);
            }
            else{
                adjacencySet=new Set();
                edgeMap.set(a,adjacencySet);
            }
            adjacencySet.add(b);
            adjacencySet.add(c);
        }
        function createEdgeMap(cMesh){
            var edgeCount=0;
            edgeMap=new Map();
            for (var indexFaces = 0; indexFaces < cMesh.Faces.length; indexFaces++)
            {
                var currentFace = cMesh.Faces[indexFaces];
                var a=currentFace.A;
                var b=currentFace.B;
                var c=currentFace.C;
                setNewEdgeMap(edgeMap, a, b, c);

                setNewEdgeMap(edgeMap, b, c,a);

                setNewEdgeMap(edgeMap,c,a, b) ;

            }
            for (var value of edgeMap.values()) {
                // console.log(value);

                edgeCount=edgeCount+value.size;

            };
            //console.log(edgeCount/2);
            return edgeCount/2;//every vertex twice for an edge
        };

        return Device;
    })();
    SoftEngine.Device = Device;

})(SoftEngine || (SoftEngine = {}));
