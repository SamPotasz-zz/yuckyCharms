var luxanimals = {};

var MonsterFace = function(imgPath, minRatio, maxRatio) {
		var DIR_PREFIX = "images/faces/";
		this.bmp = new Bitmap(DIR_PREFIX + imgPath);
		this.minRatio = minRatio;
		this.maxRatio = maxRatio;
}

var MonsterComic = function() {
		/*
		this.PANE_HEIGHT = 100;
		this.PANE_WIDTH = 100;
		
		this.ROWS = 5;
		this.COLS = 5;
		*/
		//array of bitmaps to display
		this.panes = [];
		
		//where to display the panes
		this.container = new Container();
		this.container.mouseEnabled = false;
}

MonsterComic.PANE_HEIGHT = 100;
MonsterComic.PANE_WIDTH = 100;
		
MonsterComic.ROWS = 5;
MonsterComic.COLS = 5;

MonsterComic.prototype.push = function(bitmap){
		this.panes.push(bitmap);
}

/**
 * Displays the comic strip to the stage. <br/>
 * Adds all the panes to the container at correct position, <br/>
 * and then adds the container to the stage
 */
MonsterComic.prototype.show = function(){
		//console.log("Showing " + this.panes.length + " faces");
		
		for(var i=0; i<this.panes.length; i++) {
				var col = i % MonsterComic.COLS;
				var row = i / MonsterComic.ROWS;
				
				var currFace = this.panes[i];
				currFace.x = col * MonsterComic.PANE_WIDTH;
				currFace.y = row * MonsterComic.PANE_HEIGHT;
				//console.log("Adding face at " + currFace.x + ", " + currFace.y);
				
				this.container.addChild(currFace);
		}
		stage.addChild(this.container);
		stage.update();
}

MonsterComic.prototype.hide = function() {
		//empty the panes
		while(this.panes.length > 0)
				this.panes.pop();
		
		if(stage.contains(this.container))
				stage.removeChild(this.container);
		
		stage.update();
}


luxanimals.demo = (function() {

	// Box2d vars
	var b2Vec2 = Box2D.Common.Math.b2Vec2;
	var b2BodyDef = Box2D.Dynamics.b2BodyDef;
	var b2Body = Box2D.Dynamics.b2Body;
	var b2FixtureDef = Box2D.Dynamics.b2FixtureDef;
	var b2Fixture = Box2D.Dynamics.b2Fixture;
	var b2World = Box2D.Dynamics.b2World;
	var b2PolygonShape = Box2D.Collision.Shapes.b2PolygonShape;
	var b2CircleShape = Box2D.Collision.Shapes.b2CircleShape;
	var b2DebugDraw = Box2D.Dynamics.b2DebugDraw;
	b2MouseJointDef =  Box2D.Dynamics.Joints.b2MouseJointDef;

	// demo vars
	var canvas, context, debugCanvas, debugContext;
	var birdDelayCounter = 0; // counter for delaying creation of birds
	var focused = true;
	
	var setup;
	var monster;

	$('#debug').on('click', function(){ $('#debugCanvas').toggle(); });  // toggle debug view

	$(document).ready(function() {
		// setup functions to run once page is loaded
		setup.canvas();
		setup.ticker();
		setup.startTicker();
		console.log("Labels: " + labels );
		console.log("Box2D: " + box2d );
		console.log("Birds: " + birds );
		console.log("Monster: " + monster )
		//labels.setup();
		monster.setup();
		box2d.setup();
		monster.addToStage();
		window.onfocus = onFocus;
		window.onblur = onBlur;
	});

	function onFocus() { focused = true; box2d.pauseResume(false); $('#paused').css({'display':'none'}); }
	function onBlur() { focused = false; box2d.pauseResume(true); $('#paused').css({'display':'block'}); }

/* ------ SETUP ------- */
// initial setup of canvas, contexts, and render loop

	var setup = (function() {

		var canvas = function() {
			canvas = document.getElementById('demoCanvas');
			debugCanvas = document.getElementById('debugCanvas');
			context = canvas.getContext('2d');
			debugContext = debugCanvas.getContext('2d');
			stage = new Stage(canvas);
			stage.snapPixelsEnabled = true;
			stage.mouseEventsEnabled = true;
			Touch.enable(stage);
			//stage.onPress = function(evt){console.log("YAY!");}
			
			var bowlBMP = new Bitmap("images/bowl500.png");
			bowlBMP.x = 0;
			bowlBMP.y = 0;
			bowlBMP.snapToPixel = true;
			bowlBMP.mouseEnabled = true;
			stage.addChild(bowlBMP);
			bowlBMP.onPress = box2d.drawSpoon;
		}

		var ticker = function() {
			Ticker.setFPS(30);
			Ticker.useRAF = true;
			
		}
		var startTicker = function() {
				Ticker.addListener(luxanimals.demo);  // looks for "tick" function within the luxanimals.demo object
		}
		var stopTicker = function() {
				Ticker.removeAllListeners();
		}

		return {
			canvas: canvas,
			ticker: ticker,
			startTicker : startTicker,
			stopTicker : stopTicker
		}
	})();

	
	var labels = (function() {
		var mallows;
		var oats;
		
		var setup = function() {
			var labelsX = 400;
			mallows = new Text("Mallows left: " + box2d.numMallows() );
			mallows.x = labelsX;
			mallows.y = 10;
			stage.addChild( mallows );
	
			oats = new Text("Oats left: " + box2d.numOats() );
			oats.x = labelsX;
			oats.y = 30;
			stage.addChild( oats );
		}
		
		return {
			setup : setup
		}
	})();
	
/* ------- Birds --------- */
// bitmap birds to be sent to box2d

	var birds = (function() {

		var spawn = function() {
			var birdBMP = new Bitmap("images/bird.png");
			birdBMP.x = Math.round(Math.random()*500);
			birdBMP.y = -30;
			birdBMP.regX = 25;   // important to set origin point to center of your bitmap
			birdBMP.regY = 25; 
			birdBMP.snapToPixel = true;
			birdBMP.mouseEnabled = false;
			stage.addChild(birdBMP);
			box2d.createBird(birdBMP);
		}

		return {
			spawn: spawn
		}
	})();

	var monster = (function() {
		var NUM_FACES = 5;
		var faces = [];
		
		var DIR_PREFIX = "images/faces/";
		
		var FACE_X = 10;
		var FACE_Y = 400;
		
		var container;
		
		//panes of the comic strip. Which monster face is visible after
		//each update
		//var comic;
		
		var setup = function() {
				var saddest = new MonsterFace("saddest.png", -1, 0.2);
				var medSad = new MonsterFace("medSad.png", 0.2, 0.4 );
				var neutral = new MonsterFace("neutral.png", 0.4, 0.65);
				var medHappy = new MonsterFace("medHappy.png", 0.65, 0.85);
				var happiest = new MonsterFace("superHappy.png", 0.85, 1.0);
				
				faces.push(saddest);
				faces.push(medSad);
				faces.push(neutral);
				faces.push(medHappy);
				faces.push(happiest);
				
				container = new Container();
				container.x = FACE_X;
				container.y = FACE_Y;
				
				//comic = new MonsterComic();
		}
		
		/*
		var reset = function() {
				comic.hide();
		}
		*/
		
		var addToStage = function() {
				stage.addChild(container);
		}
		
		var update = function(ratio) {
				var faceIndex;//  = Math.floor(NUM_FACES * ratio);
				for(var i=0; i<NUM_FACES; i++) {
						var currFace = faces[i];
						if(ratio > currFace.minRatio &&
						   ratio <= currFace.maxRatio )
								faceIndex = i;
				}
		
				//console.log("Ratio: " + ratio + ", index: " + faceIndex);
				container.removeAllChildren();
				var toShow = faces[faceIndex].bmp;
				container.addChild(toShow);
				//comic.push(toShow);
				
				stage.update();
		}
		
		/**
		 * When a bowl of cereal is finished, show the story!
		 */
		/*
		var showComic = function() {
				comic.show();
		}
		*/
		
		return {
				setup : setup,
				addToStage : addToStage,
				update : update
				//reset : reset,
				//showComic : showComic
		}
	})();
	
	/**
	 * A collection of points that may define a polygon
	 */
	var Lasso = function() {
		this.points = [];
		this.images = [];
		this.showingBlue = false;
	};
	Lasso.HIT_THRESHOLD = 10.0;
	Lasso.CLOSENESS_THRESH = 3.0;
	
	Lasso.prototype.reset = function(){
		this.points = [];
		while(this.images.length > 0){
				var currImg = this.images.pop();
				if(stage.contains(currImg))
						stage.removeChild(currImg);
		}
	}
	
	Lasso.prototype.addPoint = function(toAdd){
		if(this.points.length>0){
				var lastPt = this.points[this.points.length-1];
				//only add the point if it's far enough away from previous point
				if((Math.abs(toAdd.x - lastPt.x) < Lasso.CLOSENESS_THRESH) &&
				   (Math.abs(toAdd.y - lastPt.y) < Lasso.CLOSENESS_THRESH)){
						return;
				}
		}
		
		
		this.points.push(toAdd);
		
		if(this.showingBlue)
				this.reset();
		
		//check if we've made a full lasso
		if(this.points.length > 5){
				//check against previously existing points (hence length-1)
				for(var i=0; i<this.points.length-10; i++){
						var currPoint = this.points[i];
						
						//if we've intersected with a previous point on the rope,
						//then draw the lasso and return!
						if((Math.abs(toAdd.x - currPoint.x) < Lasso.HIT_THRESHOLD) &&
						   (Math.abs(toAdd.y - currPoint.y) < Lasso.HIT_THRESHOLD)){
								this.drawLasso(i);
								this.showingBlue = true;
								return;
						}
				}
		}
		
		/*
		var length = this.points.length;
		//check the latest line segment against all other line segments
		//need at least 4 points to check two segments against each other
		if(length >= 4){
				//define points of new line segment- ending at new point
				var point3 = this.points[length-1];
				//var x3 = this.points[length - 1].x;
				//var y3 = this.points[length - 1].y;
				
				var point4 = toAdd;
				//var x4 = toAdd.x;
				//var y4 = toAdd.y;
				
				var segment2 = new Segment(point3, point4);
				
				for(var backIndex=0; backIndex <= length-3; backIndex++){
						var backPt = this.points[backIndex];
						var frontPt= this.points[backIndex+1];
						var segment1 = new Segment(backPt, frontPt);
						//if(doLineSegmentsIntersect(backPt.x, backPt.y,
						//						   frontPt.x, frontPt.y,
						//						   x3, y3, x4, y4)){
						if(intersect(segment1, segment2, new Point())){
								this.drawLasso(backIndex+1);
						}
				}
		}
		*/
		
		this.showingBlue = false;
		
		var rainbowBMP = new Bitmap("images/blackDot.png");
		rainbowBMP.regX = 5;   // important to set origin point to center of your bitmap
		rainbowBMP.regY = 5; 
		rainbowBMP.snapToPixel = true;
		rainbowBMP.mouseEnabled = false;
		
		rainbowBMP.x = toAdd.x;
		rainbowBMP.y = toAdd.y;
		
		stage.addChild(rainbowBMP);
		this.images.push(rainbowBMP);
	}
	
	Lasso.prototype.drawLasso = function(startIndex){
		for(var i=startIndex; i<this.points.length-1; i++){
				var dotBMP = new Bitmap("images/blueDot.png");
				dotBMP.regX = 5;   // important to set origin point to center of your bitmap
				dotBMP.regY = 5; 
				dotBMP.snapToPixel = true;
				dotBMP.mouseEnabled = false;
				
				dotBMP.x = this.points[i].x;
				dotBMP.y = this.points[i].y;
				
				stage.addChild(dotBMP);
				this.images.push(dotBMP);
		}
		
		this.makeSensor();
		
		//clear the points
		this.points = [];
	}
	
	Lasso.prototype.makeSensor = function(){
		//can only have up to 8 vertices, so do we use all our points?
		var length = this.points.length;
		var ptStep = length <= 9 ? 1 : Math.floor(length / 8);
		
		//create the fixture definition
		var body;
		var bodyDefP = new b2BodyDef();
		var polyDef = new b2PolygonShape();
		var fixtureDef = new b2FixtureDef();
		// a square
		fixtureDef.vertexCount = 8;
		fixtureDef.density = 1.0;
		fixtureDef.friction = 0.3;
		fixtureDef.restitution = 0.1;
		//fixtureDef.position.Set(2,2);
		fixtureDef.angle = 0;
		//polyDef.position.Set(2,2);
		
		/*
		polyDef.vertices[0].Set(-1,-1);
		polyDef.vertices[1].Set(1,-1);
		polyDef.vertices[2].Set(1,1);
		polyDef.vertices[3].Set(-1,1);
		*/
		//get eight vertices
		var verts = [];
		for(var i=0; i<8; i++){
				//console.log("i: " + i);
				//console.log("Polydef.vertices: " + polyDef.vertices);
				var easelPt = this.points[i*ptStep];
				easelPt.x = easelPt.x / box2d.SCALE;
				easelPt.y = easelPt.y / box2d.SCALE;
				//polyDef.vertices[i].Set(easelPt.x, easelPt.y);
				verts.push(new b2Vec2(easelPt.x, easelPt.y));
		}
		//had to comment out line 3134 of box2dweb-2.1.a.3.js
		polyDef.SetAsArray(verts, 8);
		fixtureDef.shape = polyDef;
		
		body = box2d.getWorld().CreateBody(bodyDefP);
		body.CreateFixture(polyDef);
		body.SetMassFromShapes();
	}
	
	// the cross product of vectors v1 and v2.
function cross(v1, v2) {
	return v1.x * v2.y - v2.x * v1.y;
}

/*
	seg1 is represented by p + t * r where  0 <= t <= 1
	seg2 is represented by q + u * s where  0 <= u <= 1
	
	the intersection of line 1 and line 2 is given by 
	p + t*r = q + u*s, 
	let x be the two dimensional cross product then
	(p + t*r) x s = (q + u*s) x s = q x s
	which solving for t gives
	t = (q - p) x s / (r x s).
	similarly solving for u gives
	u = (q - p) x r / (r x s).
	the segments intersect if 0 <= t <= 1 and 0 <= 1 <= u.
	If r x s is zero then the lines are parallel, in which case if 
	(q - p) x r = 0 then the lines are co-linear.
	
*/
var epsilon = 10e-6;
var DONT_INTERSECT = 0;
var PARALLEL_DONT_INTERSECT = 1;
var COLINEAR_DONT_INTERSECT = 2;
var INTERSECT = 3;
var COLINEAR_INTERSECT = 4;
function intersect(seg1, seg2, intersectionPoint) {
	p = seg1.p1;
	r = seg1.p2.subtract(seg1.p1);
	//r = new Point(seg1.p2.x - seg1.p1.x, seg1.p2.y - seg1.p1.y);
	q = seg2.p1;
	s = seg2.p2.subtract(seg2.p1);
	//s = new Poin
	rCrossS = cross(r, s);
	if(rCrossS <= epsilon && rCrossS >= -1 * epsilon){
		return PARALLEL_DONT_INTERSECT;
	}
	t = cross(q.subtract(p), s)/rCrossS;
	u = cross(q.subtract(p), r)/rCrossS;
	if(0 <= u && u <= 1 && 0 <= t && t <= 1){
		intPoint = p.add(r.scalarMult(t));
		intersectionPoint.x = intPoint.x;
		intersectionPoint.y = intPoint.y;
		return INTERSECT;
	}else{
		return DONT_INTERSECT;
	}
}
function Vector(x, y){
  this.x = x;
  this.y = y;
  this.color = '#000';
  this.draw = function() {
    var canvas = getCanvas();
    context = canvas.getContext('2d');
    context.strokeStyle = this.color; //black
    context.fillRect(this.x, this.y, 5, 5);

  };
  this.scalarMult = function(scalar){
	  return new Vector(this.x * scalar, this.y * scalar);
  }
  this.dot = function(v2) {
    return this.x * v2.x + this.y * v2.y;
  };
  this.perp = function() {
    return new Vector(-1 * this.y, this.x);
  };
  this.subtract = function(v2) {
    return this.add(v2.scalarMult(-1));//new Vector(this.x - v2.x, this.y - v2.y);
  };
  this.add = function(v2) {
	  return new Vector(this.x + v2.x, this.y + v2.y);
  }
}
function Segment(p1, p2){
  //alert('s1');
  //this.p1 = p1;
  this.p1 = new Vector(p1.x, p1.y);
  //this.p2 = p2;
  this.p2 = new Vector(p2.x, p2.y);
  //alert('s2');
  this.draw = function() {
    //alert('s3');
    var canvas = getCanvas();
    context = canvas.getContext('2d');
    context.strokeStyle = '#000'; //black
    context.lineWidth = 4;
    //alert('s4');
    context.beginPath();
    context.moveTo(p1.x, p1.y);
    context.lineTo(p2.x, p2.y);
    //alert('s5');
    context.closePath();
    context.stroke();
    //alert('s6');
  };

}
	
	/*
	function isOnSegment(xi, yi, xj, yj, xk, yk) {
		return (xi <= xk || xj <= xk) && (xk <= xi || xk <= xj) &&
			   (yi <= yk || yj <= yk) && (yk <= yi || yk <= yj);
    }

    function computeDirection( xi, yi, xj, yj, xk, yk) {
		var a = (xk - xi) * (yj - yi);
		var b = (xj - xi) * (yk - yi);
		return a < b ? -1 : a > b ? 1 : 0;
    }
		*/
/** Do line segments (x1, y1)--(x2, y2) and (x3, y3)--(x4, y4) intersect? */
    /*
	function doLineSegmentsIntersect(x1, y1, x2, y2, x3, y3, x4, y4) {
		var d1 = computeDirection(x3, y3, x4, y4, x1, y1);
		var d2 = computeDirection(x3, y3, x4, y4, x2, y2);
		var d3 = computeDirection(x1, y1, x2, y2, x3, y3);
		var d4 = computeDirection(x1, y1, x2, y2, x4, y4);
  return (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
          ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) ||
         (d1 == 0 && isOnSegment(x3, y3, x4, y4, x1, y1)) ||
         (d2 == 0 && isOnSegment(x3, y3, x4, y4, x2, y2)) ||
         (d3 == 0 && isOnSegment(x1, y1, x2, y2, x3, y3)) ||
         (d4 == 0 && isOnSegment(x1, y1, x2, y2, x4, y4));
    }
	*/

	
	
	var box2d = (function() {

		// important box2d scale and speed vars
		var SCALE = 30, STEP = 20, TIMESTEP = 1/STEP;
		
		var MALLOW_TYPE = "MARSHMALLOW";
		var OAT_TYPE = "OAT";

		var CENTER = new Point( 250, 250 );
 		var RADIUS = 250.0;
		
		var NUM_MALLOWS = 10;
		var NUM_OATS = 15;
		
		//ratio of radiuses. 10 means ten cereal pieces will fit width-wise in a bowl
		var BIT_TO_BOWL = 10.0;
		
		var world;
		var lastTimestamp = Date.now();
		var fixedTimestepAccumulator = 0;
		var bodiesToRemove = [];
		var actors = [];
		var bodies = [];
		
		var wallB;
		
		var spoonAnchor; //body
		var spoon;
		var mousejoint;
		
		var pourBMP;
		
		//var lasso;
		
		// box2d world setup and boundaries
		var setup = function() {
			world = new b2World(new b2Vec2(0,0), true);
			createSpoonAnchor();
			//lasso = new Lasso();
			addDebug();
			makeBowl( world, 24, CENTER.x, CENTER.y, RADIUS );
			
			//makeABunchOfDynamicBodies();
			
			setupContactListener();
			
			pourBMP = new Bitmap("images/pourButton.png");
			pourBMP.x = 380;
			pourBMP.y = 10;
			pourBMP.mouseEnabled = true;
			stage.addChild(pourBMP);
			pourBMP.onPress = box2d.pour;
		}
		
		var setupContactListener = function()
		{
			var contactListener = new Box2D.Dynamics.b2ContactListener;
		    contactListener.BeginContact = function(contact, manifold) {
				var actorA = contact.GetFixtureA().GetBody().GetUserData();
				var actorB = contact.GetFixtureB().GetBody().GetUserData();
				
				if(actorA && actorB) {//&&
				   //(actorA.cerealType == actorB.cerealType)) {
						actorA.touching.push(actorB);
						actorB.touching.push(actorA);
				}
			};
			
			contactListener.EndContact = function(contact) {
				var actorA = contact.GetFixtureA().GetBody().GetUserData();
				var actorB = contact.GetFixtureB().GetBody().GetUserData();
				
				//remove them from eachother's touching arrays
				if(actorA && actorB && !contact.isTouching ) {//&&
				   //(actorA.cerealType == actorB.cerealType)) {
						var aIndex = actorB.touching.indexOf(actorA);
						if(aIndex > -1)
								actorB.touching.splice(aIndex, 1);
						
						var bIndex = actorA.touching.indexOf(actorB);
						if(bIndex > -1)
								actorA.touching.splice(bIndex, 1);
				}
		
				/*
				if (contact.GetFixtureA().GetBody().GetUserData()== 'wheel' ||
					contact.GetFixtureB().GetBody().GetUserData()== 'wheel' )

				onground = false;
				*/
		    };

			world.SetContactListener(contactListener);
		};
		
		var makeBowl = function( world, numSides, centerX, centerY, radius )
		{	
			var ANGLE_PER_SIDE = 2 * Math.PI / numSides;
			//SIDE_LENGTH = 2*RADIUS( tan (180/NUM SIDES) ) http://www.mathopenref.com/polygonsides.html
			var SIDE_LENGTH = 2 * radius * Math.tan( Math.PI / numSides );
			
			//top
			for( var i = 0; i < numSides; i++ )
			{
				var wall = new b2PolygonShape;
				wall.SetAsBox( 10 / SCALE, SIDE_LENGTH / 2 / SCALE );
				//console.log("png dimensions should be " + 10*2 + " by " + SIDE_LENGTH );
			
				wallB = new b2BodyDef;
				var theta = ( Math.PI / 2 ) - ANGLE_PER_SIDE * i;
				wallB.angle = theta;
				
				var circleOffset = new Point( radius * Math.cos( theta ), radius * Math.sin( theta ));
				wallB.position.Set(( circleOffset.x + centerX ) / SCALE, 
									( circleOffset.y + centerY ) / SCALE );
				var toReturn = world.CreateBody( wallB );
				toReturn.CreateFixture2( wall );
				
				/*
				var birdBMP = new Bitmap("images/brick20x65.png");
				birdBMP.x = Math.round(Math.random()*500);
				birdBMP.y = -30;
				birdBMP.regX = 10;   // important to set origin point to center of your bitmap
				birdBMP.regY = SIDE_LENGTH / 2; 
				birdBMP.snapToPixel = true;
				birdBMP.mouseEnabled = false;
				stage.addChild(birdBMP);
			
				var actor = new actorObject(toReturn, birdBMP);
				toReturn.SetUserData(actor);
				*/
				bodies.push(toReturn);
			}
		}
		
		var makeABunchOfDynamicBodies = function(){
			var i;
			
			//Add rectangles
			
			for (i = 0; i < NUM_OATS; i++){
				new Oat();
			}
			
			// Add Circles
			for (i = 0; i < NUM_MALLOWS; i++){
				mallow();
			}
			
			updateMonster();
			//monster.reset();
			
			//setup.startTicker();
		}
		
		var getRandomPositionInBowl = function(){
			var theta = Math.random() * 2 * Math.PI;
			var radius = Math.random() * RADIUS * 0.8;
			
			var toReturn = new Point( radius * Math.cos( theta ) + CENTER.x , 
							  radius * Math.sin( theta ) + CENTER.y );
			
			return toReturn;
		};
		
		//http://box2dweb.com/blog/2012/03/23/collision-detection-%E7%A2%B0%E6%92%9E%E6%A3%80%E6%B5%8B/
		var mallow = function() {
				
			var bodyDefC = new b2BodyDef();
			bodyDefC.type = b2Body.b2_dynamicBody;
			var circDef = new b2CircleShape( RADIUS / BIT_TO_BOWL / SCALE );  //(Math.random() * 5 + 10) / SCALE);
			var malFD = new b2FixtureDef();
			malFD.shape = circDef;
			malFD.density = 2.0;
			// Override the default friction.
			malFD.friction = 0.6;
			malFD.restitution = 0.1;
			
			bodyDefC.position.Set((Math.random() * 400 + 120) / SCALE, (Math.random() * 150 + 50) / SCALE);
			var bowlPosC = getRandomPositionInBowl();
			bodyDefC.position.Set( bowlPosC.x / SCALE, bowlPosC.y / SCALE);
			bodyDefC.angle = Math.random() * Math.PI;
			
			var malBody = world.CreateBody(bodyDefC);
			malBody.CreateFixture(malFD);
			
			var rainbowBMP = new Bitmap("images/myRainbowCircle50.png");
			rainbowBMP.x = Math.round(Math.random()*500);
			rainbowBMP.y = -30;
			rainbowBMP.regX = 25;   // important to set origin point to center of your bitmap
			rainbowBMP.regY = 25; 
			rainbowBMP.snapToPixel = true;
			rainbowBMP.mouseEnabled = true;
			stage.addChild(rainbowBMP);
			
			var self = this;
			
			var actor = new actorObject(malBody, rainbowBMP, MALLOW_TYPE);
			malBody.SetUserData(actor);
			bodies.push(malBody);
			
			rainbowBMP.onPress = function(evt){ actor.eat(); }
		}
		
		var Oat = function() {
				
		    this.sideLength = 30;
		
		    //console.log("Creating an oat.");
		    var bodyDef = new b2BodyDef();
		    bodyDef.type = b2Body.b2_dynamicBody;
		    var boxDef = new b2PolygonShape();
		    var oatFD = new b2FixtureDef();
		    oatFD.shape = boxDef;
		    oatFD.density = 2.0;
		    // Override the default friction.
		    oatFD.friction = 0.3;
		    oatFD.restitution = 0.1;
		
		    boxDef.SetAsBox( this.sideLength / SCALE, this.sideLength / SCALE);
		    bodyDef.position.Set((Math.random() * 400 + 120) / SCALE,
							 (Math.random() * 150 + 50) / SCALE);
		
		    var bowlPos = getRandomPositionInBowl();
		    bodyDef.position.Set( bowlPos.x / SCALE, bowlPos.y / SCALE);
		    bodyDef.angle = Math.random() * Math.PI;
		
		    var oatBody = world.CreateBody(bodyDef);
		    oatBody.CreateFixture(oatFD);
		    oatBody.ApplyForce( new b2Vec2( Math.random() * 5, Math.random() * 5 ),
							    new b2Vec2( Math.random() * 5, Math.random() * 5 ));
		
		
		    var honeyBMP = new Bitmap("images/squaredOat.png");
		//honeyBMP.x = Math.round(Math.random()*500);
		//honeyBMP.y = -30;
		    honeyBMP.regX = 30;   // important to set origin point to center of your bitmap
		    honeyBMP.regY = 30; 
		    honeyBMP.snapToPixel = true;
		    honeyBMP.mouseEnabled = true;
		    stage.addChild(honeyBMP);
		
		    var actor = new actorObject(oatBody, honeyBMP, OAT_TYPE);
		    honeyBMP.onPress = function(evt){actor.eat();}
		
		    oatBody.SetUserData(actor);
		};
		
		/**
		* b2Body, Bitmap -> void
		* responsible for taking the body's position and translating it
		* to your easel display object
		*/
		var actorObject = function(body, skin, type) {
		   this.body = body;
		   this.skin = skin;
		   this.cerealType = type;
		   
		   this.beingRemoved = false;
		   
		   this.touching = [];
		   
		   this.update = function() {  // translate box2d positions to pixels
			   this.skin.rotation = this.body.GetAngle() * (180 / Math.PI);
			   this.skin.x = this.body.GetWorldCenter().x * SCALE;
			   this.skin.y = this.body.GetWorldCenter().y * SCALE;
		   }
		   actors.push(this);
		}
		actorObject.prototype.eat = function(){
				//console.log("Touching " + this.touching.length + " other bits");
				//eat this and all of the pieces that it's touching
				bodiesToRemove.push(this.body);
				this.beingRemoved = true;
				for(var i=0; i<this.touching.length; i++) {
						toEat = this.touching[i];
						toEat.beingRemoved = true;
						bodiesToRemove.push(toEat.body);
				}
				
				box2d.updateMonster();
		}
		
		// create bird body shape and assign actor object
		var createBird = function(skin) {
			var birdFixture = new b2FixtureDef;
			birdFixture.density = 1;
			birdFixture.restitution = 0.6;
			birdFixture.shape = new b2CircleShape(24 / SCALE);
			var birdBodyDef = new b2BodyDef;
			birdBodyDef.type = b2Body.b2_dynamicBody;
			birdBodyDef.position.x = skin.x / SCALE;
			birdBodyDef.position.y = skin.y / SCALE;
			var bird = world.CreateBody(birdBodyDef);
			bird.CreateFixture(birdFixture);

			// assign actor
			var actor = new actorObject(bird, skin);
			bird.SetUserData(actor);  // set the actor as user data of the body so we can use it later: body.GetUserData()
			bodies.push(bird);
		}
		
		var createSpoonAnchor = function(){
			var shape = new b2PolygonShape;
			shape.SetAsBox( 10 / SCALE, 40 / SCALE );
			//console.log("png dimensions should be " + 10*2 + " by " + SIDE_LENGTH );
			anchorDef = new b2BodyDef;
			anchorDef.position.Set( 0,0 );
			
			spoonAnchor = world.CreateBody( anchorDef );
			spoonAnchor.CreateFixture2( shape );
		}
		
		/**
		 * onpress listener for the bowl image in the background <br/>
		 * The onPress callback is called when the user presses down
		 * on their mouse over this display object. <br/>
		 * The handler is passed a single param containing the
		 * corresponding MouseEvent instance. <br/>
		 * You can subscribe to the onMouseMove and onMouseUp callbacks
		 * of the event object to receive these events until the user releases the mouse button. If an onPress handler is set on a container, it will receive the event if any of its children are clicked.
		 **/
		var drawSpoon = function( msEvt ){
			//console.log("Drawing spoon");
			var bodyDefC = new b2BodyDef();
			bodyDefC.type = b2Body.b2_dynamicBody;
			var circDef = new b2CircleShape( 15 / SCALE );
			var fd = new b2FixtureDef();
			fd.shape = circDef;
			fd.density = 0.5;
			// Override the default friction.
			fd.friction = 0.3;
			fd.restitution = 0.1;
			//fd.isSensor = true;
			bodyDefC.position.Set( msEvt.stageX / SCALE, msEvt.stageY / SCALE);
			bodyDefC.angle = 0;
			spoon = world.CreateBody(bodyDefC);
			spoon.CreateFixture( fd );
			
			var rainbowBMP = new Bitmap("images/mySpoon30.png");
			rainbowBMP.regX = 15;   // important to set origin point to center of your bitmap
			rainbowBMP.regY = 15; 
			rainbowBMP.snapToPixel = true;
			rainbowBMP.mouseEnabled = false;
			stage.addChild(rainbowBMP);
			
			var actor = new actorObject(spoon, rainbowBMP);
			spoon.SetUserData(actor);
			bodies.push(spoon);
			
			//var mousedef = new b2MouseJointDef();
			var mousedef = new b2MouseJointDef();
			mousedef.bodyA = spoonAnchor;
			mousedef.bodyB = spoon;
			var bodypos = spoon.GetWorldCenter();
			mousedef.target.Set(bodypos.x, bodypos.y);
			mousedef.collideConnected = true;
			mousedef.maxForce = 300 * spoon.GetMass();
			
			mousejoint = world.CreateJoint( mousedef );
			
			//addEventListener( MouseEvent.MOUSE_UP, liftSpoon );
			msEvt.onMouseUp = liftSpoon;
			//msEvt.onMouseMove = addLassoPoint;
			
			//lasso.reset();
		}
		
		var addLassoPoint = function( msEvt ){
			/*	
				var newPoint = new Point(msEvt.stageX, msEvt.stageY);
				
				//check if we've made a full lasso
				if(lassoPoints.length > 5)
				{
						for(var i=0; i<lassoPoints.length; i++){
								var currPoint = lassoPoints[i];
								if((Math.abs(newPoint.x - currPoint.x) < 3) &&
								   (Math.abs(newPoint.y - currPoint.y) < 3)){
										
								}
						}
				}
				
				var rainbowBMP = new Bitmap("images/blackDot.png");
			rainbowBMP.regX = 5;   // important to set origin point to center of your bitmap
			rainbowBMP.regY = 5; 
			rainbowBMP.snapToPixel = true;
			rainbowBMP.mouseEnabled = false;
			
			rainbowBMP.x = msEvt.stageX;
			rainbowBMP.y = msEvt.stageY;
			
			stage.addChild(rainbowBMP);
			*/
			
			lasso.addPoint(new Point(msEvt.stageX, msEvt.stageY));
		}
		
		var liftSpoon = function( msEvt ){
			//console.log("Lifting spoon");
			world.DestroyBody( spoon );
			removeActor( spoon.GetUserData() );
			mousejoint = null;
			
		}
		
		var numMallows = function(){
		    return countActorsByType(MALLOW_TYPE);
			//return NUM_MALLOWS;
		}
		
		var numOats = function(){
			//return NUM_OATS;
			return countActorsByType(OAT_TYPE);
		}
		
		var countActorsByType = function(toMatch) {
				var count = 0;
				for(var i=0; i<actors.length; i++) {
						var currActor = actors[i];
						if(currActor.cerealType == toMatch &&
						   !currActor.beingRemoved)
								count++;
				}
				return count;
		}
		
		var updateMonster = function(){
				var mallows = numMallows();
				var oats = numOats();
				if(mallows + oats > 0){
						var ratio =  mallows / (mallows + oats);
						console.log("Mallows: " + mallows + " & Oats: " + oats);
						monster.update(ratio);	
				}
		}
		
		// box2d debugger
		var addDebug = function() {
			var debugDraw = new b2DebugDraw();
			debugDraw.SetSprite(debugContext);
			debugDraw.SetDrawScale(SCALE);
			debugDraw.SetFillAlpha(0.7);
			debugDraw.SetLineThickness(1.0);
			debugDraw.SetFlags(b2DebugDraw.e_shapeBit | b2DebugDraw.e_jointBit);
			world.SetDebugDraw(debugDraw);
		}

		// remove actor and it's skin object
		var removeActor = function(actor) {
		    if(actor) {
				stage.removeChild(actor.skin);
				actors.splice(actors.indexOf(actor),1);
			}
			else{
				console.log("Avoided removing an actor...");
			}
		}

		// box2d update function. delta time is used to avoid differences in simulation if frame rate drops
		var update = function() {
			var now = Date.now();
			var dt = now - lastTimestamp;
			fixedTimestepAccumulator += dt;
			lastTimestamp = now;
			while(fixedTimestepAccumulator >= STEP) {
				// remove bodies before world timestep
				for(var i=0, l=bodiesToRemove.length; i<l; i++) {
					removeActor(bodiesToRemove[i].GetUserData());
					bodiesToRemove[i].SetUserData(null);
					world.DestroyBody(bodiesToRemove[i]);
				}
				bodiesToRemove = [];

				// update active actors
				for(var i=0, l=actors.length; i<l; i++) {
					actors[i].update();
				}

				world.Step(TIMESTEP, 10, 10);
				if( mousejoint ){
					mousejoint.SetTarget(new b2Vec2(stage.mouseX / SCALE,
									stage.mouseY / SCALE ));		
				}
				
					
				fixedTimestepAccumulator -= STEP;
				world.ClearForces();
	   			world.m_debugDraw.m_sprite.graphics.clear();
	   			world.DrawDebugData();
				
				if(actors.length == 0) {
						//monster.showComic();
						pourBMP.visible = true;
//						setup.stopTicker();
				}
				else{
						pourBMP.visible = false;
				}
				/*
	   			if(bodies.length > 30) {
	   				bodiesToRemove.push(bodies[0]);
	   				bodies.splice(0,1);
	   			}
				*/
			}
		}

		var pauseResume = function(p) {
			if(p) { TIMESTEP = 0;
			} else { TIMESTEP = 1/STEP; }
			lastTimestamp = Date.now();
		}
		
		var getWorld = function(){
				return world;
		}

		return {
			setup: setup,
			update: update,
			createBird: createBird,
			pauseResume: pauseResume,
			drawSpoon: drawSpoon,
			numMallows: numMallows,
			numOats: numOats,
			pour: makeABunchOfDynamicBodies,
			updateMonster: updateMonster,
			getWorld: getWorld
		}
	})();

	function Point(xValue, yValue) {
		this.x = xValue;
		this.y = yValue;
	}
/* ------- UPDATE -------- */
// main update loop for rendering assets to canvas

	var tick = function(dt, paused) {
		if(focused) {
			box2d.update();
			stage.update();

			/*
			birdDelayCounter++;
			if(birdDelayCounter % 10 === 0) {  // delay so it doesn't spawn a bird on every frame
				birdDelayCounter = 0;
				birds.spawn();
			}
			*/
		}
	}

/* ------- GLOBAL -------- */
// main global functions

	return {
		tick: tick
	}

}());
