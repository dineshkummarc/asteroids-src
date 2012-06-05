/**
 * Game class library, utility functions and globals.
 * 
 * (C) 2010 Kevin Roast kevtoast@yahoo.com @kevinroast
 * 
 * Please see: license.txt
 * You are welcome to use this code, but I would appreciate an email or tweet
 * if you do anything interesting with it!
 * 
 * 30/04/09 Initial version.
 * 12/05/09 Refactored to remove globals into GameHandler instance and added FPS controller game loop.
 * 19/09/11 Refactored to use requestAnimationFrame - 60fps and frame multipler calculation
 */

var KEY = { SHIFT:16, CTRL:17, ESC:27, RIGHT:39, UP:38, LEFT:37, DOWN:40, SPACE:32,
            A:65, E:69, G:71, L:76, P:80, R:82, S:83, Z:90 };
var iOS = (navigator.userAgent.indexOf("iPhone;") != -1 ||
           navigator.userAgent.indexOf("iPod;") != -1 ||
           navigator.userAgent.indexOf("iPad;") != -1);

/**
 * Game Handler.
 * 
 * Singleton instance responsible for managing the main game loop and
 * maintaining a few global references such as the canvas and frame counters.
 */
var GameHandler =
{
   /**
    * The single Game.Main derived instance
    */
   game: null,
   
   /**
    * True if the game is in pause state, false if running
    */
   paused: false,
   
   /**
    * The single canvas play field element reference
    */
   canvas: null,
   
   /**
    * Width of the canvas play field
    */
   width: 0,
   
   /**
    * Height of the canvas play field
    */
   height: 0,
   
   /**
    * Frame counter
    */
   frameCount: 0,
   
   /**
    * Frame multiplier - i.e. against the ideal fps
    */ 
   frameMultipler: 1,
   
   /**
    * Last frame start time in ms
    */
   frameStart: 0,
   
   /**
    * Debugging output
    */
   maxfps: 0,
   
   /**
    * Ideal FPS constant
    */
   FPSMS: 1000/60,
   
   /**
    * Init function called once by your window.onload handler
    */
   init: function()
   {
      this.canvas = document.getElementById('canvas');
      this.width = this.canvas.height;
      this.height = this.canvas.width;
   },
   
   /**
    * Game start method - begins the main game loop.
    * Pass in the object that represent the game to execute.
    * Also called each frame by the main game loop unless paused.
    * 
    * @param {Game.Main} game main derived object handler
    */
   start: function(game)
   {
      if (game instanceof Game.Main)
      {
         // first time init
         this.game = game;
         GameHandler.frameStart = Date.now();
      }
      GameHandler.game.frame.call(GameHandler.game);
   },
   
   /**
    * Game pause toggle method.
    */
   pause: function()
   {
      if (this.paused)
      {
         this.paused = false;
         GameHandler.frameStart = Date.now();
         GameHandler.game.frame.call(GameHandler.game);
      }
      else
      {
         this.paused = true;
      }
   }
};


/**
 * Game root namespace.
 *
 * @namespace Game
 */
if (typeof Game == "undefined" || !Game)
{
   var Game = {};
}


/**
 * Game main loop class.
 * 
 * @namespace Game
 * @class Game.Main
 */
(function()
{
   Game.Main = function()
   {
      var me = this;
      
      document.onkeydown = function(event)
      {
         var keyCode = (event === null ? window.event.keyCode : event.keyCode);
         
         if (me.sceneIndex !== -1)
         {
            if (me.scenes[me.sceneIndex].onKeyDownHandler(keyCode))
            {
               // if the key is handled, prevent any further events
               if (event)
               {
                  event.preventDefault();
                  event.stopPropagation();
               }
            }
         }
      };
      
      document.onkeyup = function(event)
      {
         var keyCode = (event === null ? window.event.keyCode : event.keyCode);
         
         if (me.sceneIndex !== -1)
         {
            if (me.scenes[me.sceneIndex].onKeyUpHandler(keyCode))
            {
               // if the key is handled, prevent any further events
               if (event)
               {
                  event.preventDefault();
                  event.stopPropagation();
               }
            }
         }
      };
   };
   
   Game.Main.prototype =
   {
      scenes: [],
      startScene: null,
      endScene: null,
      currentScene: null,
      sceneIndex: -1,
      interval: null,
      
      /**
       * Game frame execute method - called by anim handler timeout
       */
      frame: function frame()
      {
         var frameStart = Date.now();
         
         // calculate scene transition and current scene
         var currentScene = this.currentScene;
         if (currentScene === null)
         {
            // set to scene zero (game init)
            this.sceneIndex = 0;
            currentScene = this.scenes[0];
            currentScene.onInitScene();
         }
         else if (this.isGameOver())
         {
            this.sceneIndex = -1;
            currentScene = this.endScene;
            currentScene.onInitScene();
         }
         
         if ((currentScene.interval === null || currentScene.interval.complete) && currentScene.isComplete())
         {
            this.sceneIndex++;
            if (this.sceneIndex < this.scenes.length)
            {
               currentScene = this.scenes[this.sceneIndex];
            }
            else
            {
               this.sceneIndex = 0;
               currentScene = this.scenes[0];
            }
            currentScene.onInitScene();
         }
         
         // setup canvas for a render pass
         var ctx = GameHandler.canvas.getContext('2d');
         
         // render the game and current scene
         ctx.save();
         if (currentScene.interval === null || currentScene.interval.complete)
         {
            currentScene.onBeforeRenderScene();
            this.onRenderGame(ctx);
            currentScene.onRenderScene(ctx);
         }
         else
         {
            this.onRenderGame(ctx);
            currentScene.interval.intervalRenderer.call(currentScene, currentScene.interval, ctx);
         }
         ctx.restore();
         
         // update global frame counter and current scene reference
         this.currentScene = currentScene;
         GameHandler.frameCount++;
         
         // calculate frame total time interval and frame multiplier required for smooth animation
         var frameInterval = frameStart - GameHandler.frameStart;
         if (frameInterval === 0) frameInterval = 1;
         if (GameHandler.frameCount % 16 === 0) GameHandler.maxfps = ~~(1000 / frameInterval);
         GameHandler.frameMultipler = frameInterval / GameHandler.FPSMS;
         GameHandler.frameStart = frameStart;
         
         // for browsers not supporting requestAnimationFrame natively, we calculate the offset
         // between each frame to attempt to maintain a smooth fps
         var frameOffset = ~~(GameHandler.FPSMS - (Date.now() - frameStart));
         if (!GameHandler.paused) requestAnimFrame(GameHandler.start, frameOffset);
      },
      
      onRenderGame: function onRenderGame(ctx)
      {
      },
      
      isGameOver: function isGameOver()
      {
         return false;
      }
   };
})();


/**
 * Game scene base class.
 * 
 * @namespace Game
 * @class Game.Scene
 */
(function()
{
   Game.Scene = function(playable, interval)
   {
      this.playable = playable;
      this.interval = interval;
   };
   
   Game.Scene.prototype =
   {
      playable: true,
      
      interval: null,
      
      /**
       * Return true if this scene should update the actor list.
       */
      isPlayable: function isPlayable()
      {
         return this.playable;
      },
      
      onInitScene: function onInitScene()
      {
         if (this.interval !== null)
         {
            // reset interval flag
            this.interval.reset();
         }
      },
      
      onBeforeRenderScene: function onBeforeRenderScene()
      {
      },
      
      onRenderScene: function onRenderScene(ctx)
      {
      },
      
      onRenderInterval: function onRenderInterval(ctx)
      {
      },
      
      onKeyDownHandler: function onKeyDownHandler(keyCode)
      {
      },
      
      onKeyUpHandler: function onKeyUpHandler(keyCode)
      {
      },
      
      isComplete: function isComplete()
      {
         return false;
      }
   };
})();


(function()
{
   Game.Interval = function(label, intervalRenderer)
   {
      this.label = label;
      this.intervalRenderer = intervalRenderer;
      this.framecounter = 0;
      this.complete = false;
   };
   
   Game.Interval.prototype =
   {
      label: null,
      intervalRenderer: null,
      framecounter: 0,
      complete: false,
      
      reset: function reset()
      {
         this.framecounter = 0;
         this.complete = false;
      }
   };
})();


/**
 * Actor base class.
 * 
 * Game actors have a position in the game world and a current vector to indicate
 * direction and speed of travel per frame. They each support the onUpdate() and
 * onRender() event methods, finally an actor has an expired() method which should
 * return true when the actor object should be removed from play.
 * 
 * @namespace Game
 * @class Game.Actor
 */
(function()
{
   Game.Actor = function(p, v)
   {
      this.position = p;
      this.vector = v;
      
      return this;
   };
   
   Game.Actor.prototype =
   {
      /**
       * Actor position
       *
       * @property position
       * @type Vector
       */
      position: null,
      
      /**
       * Actor vector
       *
       * @property vector
       * @type Vector
       */
      vector: null,
      
      /**
       * Actor game loop update event method. Called for each actor
       * at the start of each game loop cycle.
       * 
       * @method onUpdate
       */
      onUpdate: function onUpdate()
      {
      },
      
      /**
       * Actor rendering event method. Called for each actor to
       * render for each frame.
       * 
       * @method onRender
       * @param ctx {object} Canvas rendering context
       */
      onRender: function onRender(ctx)
      {
      },
      
      /**
       * Actor expiration test
       * 
       * @method expired
       * @return true if expired and to be removed from the actor list, false if still in play
       */
      expired: function expired()
      {
         return false;
      }
   };
})();


/**
 * SpriteActor base class.
 * 
 * An actor that can be rendered by a bitmap. The sprite handling code deals with the increment
 * of the current frame within the supplied bitmap sprite strip image, based on animation direction,
 * animation speed and the animation length before looping. Call renderSprite() each frame.
 * 
 * NOTE: by default sprites source images are 64px wide 64px by N frames high and scaled to the
 * appropriate final size. Any other size input source should be set in the constructor.
 * 
 * @namespace Game
 * @class Game.SpriteActor
 */
(function()
{
   Game.SpriteActor = function(p, v, s)
   {
      Game.SpriteActor.superclass.constructor.call(this, p, v);
      if (s) this.frameSize = s;
      
      return this;
   };
   
   extend(Game.SpriteActor, Game.Actor,
   {
      /**
       * Size in pixels of the width/height of an individual frame in the image
       */
      frameSize: 64,
      
      /**
       * Animation image sprite reference.
       * Sprite image sources are all currently 64px wide 64px by N frames high.
       */
      animImage: null,
      
      /**
       * Length in frames of the sprite animation
       */
      animLength: 0,
      
      /**
       * Animation direction, true for forward, false for reverse.
       */
      animForward: true,
      
      /**
       * Animation frame inc/dec speed.
       */
      animSpeed: 1.0,
      
      /**
       * Current animation frame index
       */
      animFrame: 0,
      
      /**
       * Render sprite graphic based on current anim image, frame and anim direction
       * Automatically updates the current anim frame.
       */
      renderSprite: function renderSprite(ctx, x, y, s)
      {
         Game.Util.renderImage(ctx, this.animImage, 0, this.animFrame << 6, this.frameSize, x, y, s);
         
         // update animation frame index
         if (this.animForward)
         {
            this.animFrame += (this.animSpeed * GameHandler.frameMultipler);
            if (this.animFrame >= this.animLength)
            {
               this.animFrame = 0;
            }
         }
         else
         {
            this.animFrame -= (this.animSpeed * GameHandler.frameMultipler);
            if (this.animFrame < 0)
            {
               this.animFrame = this.animLength - 1;
            }
         }
      }
   });
})();


/**
 * EnemyActor base class.
 * 
 * An enemy actor is the common base class of actors that can be hit and destroyed by player bullets.
 * The class supports a hit() method which should return true when the enemy object should be removed from play.
 * 
 * @namespace Game
 * @class Game.EnemyActor
 */
(function()
{
   Game.EnemyActor = function(p, v)
   {
      this.position = p;
      this.vector = v;
      
      return this;
   };
   
   extend(Game.EnemyActor, Game.SpriteActor,
   {
      alive: true,
      
      /**
       * Actor expiration test
       * 
       * @method expired
       * @return true if expired and to be removed from the actor list, false if still in play
       */
      expired: function expired()
      {
         return !(this.alive);
      },
      
      /**
       * Enemy hit by player bullet
       * 
       * @param force of the impacting bullet (as the enemy may support health)
       * @return true if destroyed, false otherwise
       */
      hit: function hit(force)
      {
         this.alive = false;
         return true;
      }
   });
})();


/**
 * EffectActor base class.
 * 
 * An actor representing a transient effect in the game world. An effect is nothing more than
 * a special graphic that does not play any direct part in the game and does not interact with
 * any other objects. It automatically expires after a set lifespan, generally the rendering of
 * the effect is based on the remaining lifespan.
 * 
 * @namespace Game
 * @class Game.EffectActor
 */
(function()
{
   Game.EffectActor = function(p, v, lifespan)
   {
      Game.EffectActor.superclass.constructor.call(this, p, v);
      this.lifespan = lifespan;
      this.effectStart = GameHandler.frameStart;
      return this;
   };
   
   extend(Game.EffectActor, Game.Actor,
   {
      /**
       * Effect lifespan in ms
       */
      lifespan: 0,
      
      /**
       * Effect start time
       */
      effectStart: 0,
      
      /**
       * Actor expiration test
       * 
       * @return true if expired and to be removed from the actor list, false if still in play
       */
      expired: function expired()
      {
      	// test to see if the effect has expired
      	return (GameHandler.frameStart - this.effectStart > this.lifespan);
      },
      
      /**
       * Helper for an effect to return the value multiplied by the ratio of the remaining
       * lifespan of the effect
       * 
       * @param val     value to apply to the ratio of remaining lifespans
       */
      effectValue: function effectValue(val)
      {
         var result = val - ((val / this.lifespan) * (GameHandler.frameStart - this.effectStart));
         // this is no longer a simple counter - so we need to crop the value
         // as the time between frames is not determinate
         if (result < 0) result = 0;
         else if (result > val) result = val;
         return result;
      }
   });
})();


/**
 * Image Preloader class. Executes the supplied callback function once all
 * registered images are loaded by the browser.
 * 
 * @namespace Game
 * @class Game.Preloader
 */
(function()
{
   Game.Preloader = function()
   {
      this.images = new Array();
      return this;
   };
   
   Game.Preloader.prototype =
   {
      /**
       * Image list
       *
       * @property images
       * @type Array
       */
      images: null,
      
      /**
       * Callback function
       *
       * @property callback
       * @type Function
       */
      callback: null,
      
      /**
       * Images loaded so far counter
       */
      counter: 0,
      
      /**
       * Add an image to the list of images to wait for
       */
      addImage: function addImage(img, url)
      {
         var me = this;
         img.url = url;
         // attach closure to the image onload handler
         img.onload = function()
         {
            me.counter++;
            if (me.counter === me.images.length)
            {
               // all images are loaded - execute callback function
               me.callback.call(me);
            }
         };
         this.images.push(img);
      },
      
      /**
       * Load the images and call the supplied function when ready
       */
      onLoadCallback: function onLoadCallback(fn)
      {
         this.counter = 0;
         this.callback = fn;
         // load the images
         for (var i=0, j=this.images.length; i<j; i++)
         {
            this.images[i].src = this.images[i].url;
         }
      }
   };
})();


/**
 * Render text into the canvas context.
 * Compatible with FF3.5, SF4, GC4, OP10, IE9
 * 
 * @method Game.drawText
 * @static
 */
Game.drawText = function(g, txt, font, x, y, col)
{
   g.save();
   if (col) g.strokeStyle = col;
   g.font = font;
   g.strokeText(txt, x, y);
   g.restore();
};

Game.centerDrawText = function(g, txt, font, y, col)
{
   g.save();
   if (col) g.strokeStyle = col;
   g.font = font;
   g.strokeText(txt, (GameHandler.width - g.measureText(txt).width) / 2, y);
   g.restore();
};

Game.fillText = function(g, txt, font, x, y, col)
{
   g.save();
   if (col) g.fillStyle = col;
   g.font = font;
   g.fillText(txt, x, y);
   g.restore();
};

Game.centerFillText = function(g, txt, font, y, col)
{
   g.save();
   if (col) g.fillStyle = col;
   g.font = font;
   g.fillText(txt, (GameHandler.width - g.measureText(txt).width) / 2, y);
   g.restore();
};


Game.Util = {};

/**
 * This method will automatically correct for objects moving on/off
 * a cyclic canvas play area - if so it will render the appropriate stencil
 * sections of the sprite top/bottom/left/right as needed to complete the image.
 * Note that this feature can only be used if the sprite is absolutely positioned
 * and not translated/rotated into position by canvas operations.
 */
Game.Util.renderImage = function renderImage(ctx, image, nx, ny, ns, x, y, s)
{
   ctx.drawImage(image, nx, ny, ns, ns, x, y, s, s);
   
   if (x < 0)
   {
      ctx.drawImage(image, nx, ny, ns, ns,
         GameHandler.width + x, y, s, s);
   }
   if (y < 0)
   {
      ctx.drawImage(image, nx, ny, ns, ns,
         x, GameHandler.height + y, s, s);
   }
   if (x < 0 && y < 0)
   {
      ctx.drawImage(image, nx, ny, ns, ns,
         GameHandler.width + x, GameHandler.height + y, s, s);
   }
   if (x + s > GameHandler.width)
   {
      ctx.drawImage(image, nx, ny, ns, ns,
         x - GameHandler.width, y, s, s);
   }
   if (y + s > GameHandler.height)
   {
      ctx.drawImage(image, nx, ny, ns, ns,
         x, y - GameHandler.height, s, s);
   }
   if (x + s > GameHandler.width && y + s > GameHandler.height)
   {
      ctx.drawImage(image, nx, ny, ns, ns,
         x - GameHandler.width, y - GameHandler.height, s, s);
   }
};
      
Game.Util.renderImageRotated = function renderImageRotated(ctx, image, x, y, w, h, r)
{
   var w2 = w*0.5, h2 = h*0.5;
   var rf = function(tx, ty)
   {
      ctx.save();
      ctx.translate(tx, ty);
      ctx.rotate(r);
      ctx.drawImage(image, -w2, -h2);
      ctx.restore();
   };
   
   rf.call(this, x, y);
   
   if (x - w2 < 0)
   {
      rf.call(this, GameHandler.width + x, y);
   }
   if (y - h2 < 0)
   {
      rf.call(this, x, GameHandler.height + y);
   }
   if (x - w2 < 0 && y - h2 < 0)
   {
      rf.call(this, GameHandler.width + x, GameHandler.height + y);
   }
   if (x - w2 + w > GameHandler.width)
   {
      rf.call(this, x - GameHandler.width, y);
   }
   if (y - h2 + h > GameHandler.height)
   {
      rf.call(this, x, y - GameHandler.height);
   }
   if (x - w2 + w > GameHandler.width && y - h2 + h > GameHandler.height)
   {
      rf.call(this, x - GameHandler.width, y - GameHandler.height);
   }
};


/**
 * Game prerenderer class.
 * 
 * @namespace Game
 * @class Game.Prerenderer
 */
(function()
{
   Game.Prerenderer = function()
   {
      this.images = [];
      this._renderers = [];
      return this;
   };
   
   Game.Prerenderer.prototype =
   {
      /**
       * Image list. Keyed by renderer ID - returning an array also. So to get
       * the first image output by prerenderer with id "default": images["default"][0]
       * 
       * @public
       * @property images
       * @type Array
       */
      images: null,
      
      _renderers: null,
      
      /**
       * Add a renderer function to the list of renderers to execute
       * 
       * @param fn {function}    Callback to execute to perform prerender
       *                         Passed canvas element argument - to execute against - the
       *                         callback is responsible for setting appropriate width/height
       *                         of the buffer and should not assume it is cleared.
       *                         Should return Array of images from prerender process
       * @param id {string}      Id of the prerender - used to lookup images later
       */
      addRenderer: function addRenderer(fn, id)
      {
         this._renderers[id] = fn;
      },
      
      /**
       * Execute all prerender functions - call once all renderers have been added
       */
      execute: function execute()
      {
         var buffer = document.createElement('canvas');
         for (var id in this._renderers)
         {
            this.images[id] = this._renderers[id].call(this, buffer);
         }
      }
    };
})();


// requestAnimFrame shim
window.requestAnimFrame = (function()
{
   return  window.requestAnimationFrame       || 
           window.webkitRequestAnimationFrame || 
           window.mozRequestAnimationFrame    || 
           window.oRequestAnimationFrame      || 
           window.msRequestAnimationFrame     || 
           function(callback, frameOffset)
           {
               window.setTimeout(callback, frameOffset);
           };
})();