var luxanimals = {};

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

	$('#debug').on('click', function() { $('#debugCanvas').toggle(); });  // toggle debug view

	$(document).ready(function() {
		// setup functions to run once page is loaded
		setup.canvas();
		setup.ticker();
		console.log("Labels: " + labels );
		console.log("Box2D: " + box2d );
		console.log("Birds: " + birds );
		//labels.setup();
		box2d.setup();
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
			Ticker.addListener(luxanimals.demo);  // looks for "tick" function within the luxanimals.demo object
		}

		return {
			canvas: canvas,
			ticker: ticker
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

	var box2d = (function() {

		// important box2d scale and speed vars
		var SCALE = 30, STEP = 20, TIMESTEP = 1/STEP;

		var CENTER = new Point( 250, 250 );
 		var RADIUS = 250.0;
		
		var NUM_MALLOWS = 15;
		var NUM_OATS = 10;
		
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

		// box2d world setup and boundaries
		var setup = function() {
			world = new b2World(new b2Vec2(0,0), true);
			createSpoonAnchor();
			addDebug();
			makeBowl( world, 24, CENTER.x, CENTER.y, RADIUS );
			makeABunchOfDynamicBodies();
			
			setupContactListener();
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
			malFD.density = 1.0;
			// Override the default friction.
			malFD.friction = 0.6;
			malFD.restitution = 0.1;
			
			bodyDefC.position.Set((Math.random() * 400 + 120) / SCALE, (Math.random() * 150 + 50) / SCALE);
			var bowlPosC = getRandomPositionInBowl();
			bodyDefC.position.Set( bowlPosC.x / SCALE, bowlPosC.y / SCALE);
			bodyDefC.angle = Math.random() * Math.PI;
			
			var malBody = world.CreateBody(bodyDefC);
			malBody.CreateFixture(malFD);
			
			var rainbowBMP = new Bitmap("images/rainbow50.png");
			rainbowBMP.x = Math.round(Math.random()*500);
			rainbowBMP.y = -30;
			rainbowBMP.regX = 25;   // important to set origin point to center of your bitmap
			rainbowBMP.regY = 25; 
			rainbowBMP.snapToPixel = true;
			rainbowBMP.mouseEnabled = true;
			stage.addChild(rainbowBMP);
			
			var self = this;
			
			var actor = new actorObject(malBody, rainbowBMP, "MARSHMALLOW");
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
		    oatFD.density = 1.0;
		    // Override the default friction.
		    oatFD.friction = 0.3;
		    oatFD.restitution = 0.1;
		
		    boxDef.SetAsBox( this.sideLength / SCALE, this.sideLength / SCALE);
		    bodyDef.position.Set((Math.random() * 400 + 120) / SCALE,
							 (Math.random() * 150 + 50) / SCALE);
		
		    var bowlPos = box2d.getRandomPositionInBowl();
		    bodyDef.position.Set( bowlPos.x / SCALE, bowlPos.y / SCALE);
		    bodyDef.angle = Math.random() * Math.PI;
		
		    var oatBody = world.CreateBody(bodyDef);
		    oatBody.CreateFixture(oatFD);
		    oatBody.ApplyForce( new b2Vec2( Math.random() * 5, Math.random() * 5 ),
							    new b2Vec2( Math.random() * 5, Math.random() * 5 ));
		
		
		    var honeyBMP = new Bitmap("images/honeycomb60.png");
		//honeyBMP.x = Math.round(Math.random()*500);
		//honeyBMP.y = -30;
		    honeyBMP.regX = 30;   // important to set origin point to center of your bitmap
		    honeyBMP.regY = 30; 
		    honeyBMP.snapToPixel = true;
		    honeyBMP.mouseEnabled = true;
		    stage.addChild(honeyBMP);
		
		    var actor = new actorObject(oatBody, honeyBMP, "OAT");
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
		   
		   this.touching = [];
		   
		   this.update = function() {  // translate box2d positions to pixels
			   this.skin.rotation = this.body.GetAngle() * (180 / Math.PI);
			   this.skin.x = this.body.GetWorldCenter().x * SCALE;
			   this.skin.y = this.body.GetWorldCenter().y * SCALE;
		   }
		   actors.push(this);
		}
		actorObject.prototype.eat = function(){
				//console.log("Eating an actor at " + this.skin.x + ", " + this.skin.y );
				console.log("Touching " + this.touching.length + " other bits");
				//eat this and all of the pieces that it's touching
				bodiesToRemove.push(this.body);
				for(var i=0; i<this.touching.length; i++) {
						bodiesToRemove.push(this.touching[ i ].body);
				}
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
			fd.density = 1.0;
			// Override the default friction.
			fd.friction = 0.3;
			fd.restitution = 0.1;
			//fd.isSensor = true;
			bodyDefC.position.Set( msEvt.stageX / SCALE, msEvt.stageY / SCALE);
			bodyDefC.angle = 0;
			spoon = world.CreateBody(bodyDefC);
			spoon.CreateFixture( fd );
			
			var rainbowBMP = new Bitmap("images/bird30.png");
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
			
		}
		
		var liftSpoon = function( msEvt ){
			//console.log("Lifting spoon");
			world.DestroyBody( spoon );
			removeActor( spoon.GetUserData() );
			mousejoint = null;
			
		}
		
		var numMallows = function(){
			return NUM_MALLOWS;
		}
		
		var numOats = function(){
			return NUM_OATS;
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
				if( mousejoint )
					mousejoint.SetTarget(new b2Vec2(stage.mouseX / SCALE,
									stage.mouseY / SCALE ));	
				
				fixedTimestepAccumulator -= STEP;
				world.ClearForces();
	   			world.m_debugDraw.m_sprite.graphics.clear();
	   			world.DrawDebugData();
				
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

		return {
			setup: setup,
			update: update,
			createBird: createBird,
			pauseResume: pauseResume,
			drawSpoon: drawSpoon,
			numMallows: numMallows,
			numOats: numOats,
			getRandomPositionInBowl: getRandomPositionInBowl
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
