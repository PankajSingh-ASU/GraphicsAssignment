window.requestAnimationFrame = (function () {
   return window.requestAnimationFrame ||
         window.webkitRequestAnimationFrame ||
         window.mozRequestAnimationFrame ||
         function (callback) {
             window.setTimeout(callback, 1000 / 60);
         };
     })();

var canvas;
var divCurrentFPS;
var divAverageFPS;
var device;
var meshes = [];
var mera;
var previousDate = Date.now();
var lastFPSValues = new Array(60);
var currentMesh;
var currentIndex=0;

document.addEventListener("DOMContentLoaded", init, false);

function init() {
    divCurrentFPS = document.getElementById("currentFPS");
    divAverageFPS = document.getElementById("averageFPS");

    canvas = document.getElementById("frontBuffer");
    mera = new SoftEngine.Camera();
    device = new SoftEngine.Device(canvas);
    mera.Position = new BABYLON.Vector3(0, 0, 10);
    mera.Target = new BABYLON.Vector3(0, 0, 0);
    device.LoadJSONFileAsync("monkey.babylon", loadJSONCompleted);
}

document.onkeydown = function(e) {

    if(e.keyCode==38|| e.keyCode==108|| e.keyCode==171)
    {

        if(currentIndex<5)
        {
            currentIndex++;
            if(typeof meshes[currentIndex] === 'undefined') {
                meshes[currentIndex] = device.createNewMeshFromLoopSubdivision( meshes[currentIndex-1]);
            }
            currentMesh=meshes[currentIndex];
        }
        alert('up '+(currentIndex));

    }


    if(e.keyCode==40||  e.keyCode==109||e.keyCode==189) {

        alert('down '+(currentIndex));
        if(currentIndex>0)
        {
            currentIndex--;
            currentMesh=meshes[currentIndex];
        }

    }

};


function loadJSONCompleted(meshesLoaded) {
    meshes = meshesLoaded;
    currentMesh=meshes[0];
    // Calling the HTML5 rendering loop
    requestAnimationFrame(drawingLoop);
}

// Rendering loop handler
function drawingLoop() {
    //calculation of fps
    var now = Date.now();
    var currentFPS = 1000 / (now - previousDate);
    previousDate = now;

    divCurrentFPS.textContent = currentFPS.toFixed(2);

    if (lastFPSValues.length < 60) {
        lastFPSValues.push(currentFPS);
    } else {
        lastFPSValues.shift();
        lastFPSValues.push(currentFPS);
        var totalValues = 0;
        for (var i = 0; i < lastFPSValues.length; i++) {
            totalValues += lastFPSValues[i];
        }

        var averageFPS = totalValues / lastFPSValues.length;
        divAverageFPS.textContent = averageFPS.toFixed(2);
    }

    device.clear();


        // rotating slightly the mesh during each frame rendered
        currentMesh.Rotation.x += 0.01;
        currentMesh.Rotation.y += 0.01;


    // Doing the various matrix operations
    device.render(mera, currentMesh);
    // Flushing the back buffer into the front buffer
    device.present();

    // Calling the HTML5 rendering loop recursively
    requestAnimationFrame(drawingLoop);
}
