//iterative by orbanisma
let angle = 0;
let r;
let fr = 30;

function setup(){
  frameRate(fr);
  createCanvas(1500, 1500, WEBGL);
  angleMode(DEGREES);
  r = width/6;
  
    itx = log(0.03);
    ity = 26; 
    itz = 3;

  pixelDensity(1);
}

function draw(){
  clear();
  colorMode(HSB);
  push();
  background(0,0,0);
  strokeWeight(3);
  noFill();

  stroke(30, 100, 100);
  
  angleMode(DEGREES);
  angle = angle + 1;
  
  rotateX(angle);
  rotateY(45);
  rotateZ(angle);
    
  beginShape(POINTS);
  for(let theta = 0; theta < 180; theta += 2){
    for(let phi = 0; phi < 360; phi += 2){
      let y = r*(4+itx*sin(itz*theta)*sin(ity*phi)) * sin(1*theta) * cos(phi);
      let x = r*(4+itx*sin(itz*theta)*sin(ity*phi)) * sin(1*theta) * sin(phi);
      let z = r*(4+itx*sin(itz*theta)*sin(ity*phi)) * cos(1*theta);
      vertex(x, y, z);
    }
  }
  endShape();
}
