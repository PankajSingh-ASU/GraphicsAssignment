/**
 * Created by pankajsingh on 9/26/15.
 */

function intersectionSet(setA, setB){
    // Iterate set entries with forEach
    var iset=new Set();
    setA.forEach(function(value) {
       if(setB.has(value)){
        iset.add(value);
       }
    });
    return iset;

}

/**
 * @brief Reflect point p along line through points p0 and p1
 *
 * @param p point to reflect
 * @param p0 first point for reflection line
 * @param p1 second point for reflection line
 * @return object
 */
function reflectPoint(p, p0, p1) {
    var dx, dy, a, b, x, y;

    dx = p1.x - p0.x;
    dy = p1.y - p0.y;
    a = (dx * dx - dy * dy) / (dx * dx + dy * dy);
    b = 2 * dx * dy / (dx * dx + dy * dy);
    x = Math.round(a * (p.x - p0.x) + b * (p.y - p0.y) + p0.x);
    y = Math.round(b * (p.x - p0.x) - a * (p.y - p0.y) + p0.y);

    return new BABYLON.Vector3(x, y, p0.z);
}
