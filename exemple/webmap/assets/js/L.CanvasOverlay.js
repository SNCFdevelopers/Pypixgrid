/*
 Generic  Canvas Overlay for leaflet, 
 Stanislav Sumbera, April , 2014

 - added userDrawFunc that is called when Canvas need to be redrawn
 - added few useful params fro userDrawFunc callback
  - fixed resize map bug
  inspired & portions taken from  :   https://github.com/Leaflet/Leaflet.heat
  
  License: MIT

*/


L.CanvasOverlay = L.TileLayer.extend({



    drawing: function (userDrawFunc) {
        this._userDrawFunc = userDrawFunc;
        return this;
    },

    params:function(options){
        L.setOptions(this, options);
        return this;
    },
    
    canvas: function () {
        return this._canvas;
    },

    redraw: function () {
        if (!this._frame) {
            this._frame = L.Util.requestAnimFrame(this._redraw, this);
        }
        return this;
    },

    
  
    onAdd: function (map) {
        this._map = map;
        this._canvas = L.DomUtil.create('canvas', 'leaflet-pixi-layer');
        var size = this._map.getSize();
        this._canvas.width = size.x;
        this._canvas.height = size.y;
	this._canvas.id = 'pixi-canvas'
	this._tiles= {};
	this._tilesdict = {};
	this._renderer = new PIXI.CanvasRenderer(size.x, size.y, {view:this._canvas,transparent:true,antialised:true}); 
	this._stage = new PIXI.Container();
	this._stage.interactive = true;
        var animated = this._map.options.zoomAnimation && L.Browser.any3d;
        L.DomUtil.addClass(this._canvas, 'leaflet-zoom-' + (animated ? 'animated' : 'hide'));


        map._panes.overlayPane.appendChild(this._canvas);

        map.on('moveend', this._reset, this);
        map.on('resize',  this._resize, this);
	map.on('zoomstart',this._clear, this);
	map.on('zoomend',this._render,this)

        if (map.options.zoomAnimation && L.Browser.any3d) {
            map.on('zoomanim', this._animateZoom, this);
        }
	L.TileLayer.prototype.onAdd.call(this,map);
        this._reset();
    },

    onRemove: function (map) {
        map.getPanes().overlayPane.removeChild(this._canvas);
        map.off('moveend', this._reset, this);
        map.off('resize', this._resize, this);

        if (map.options.zoomAnimation) {
            map.off('zoomanim', this._animateZoom, this);
        }
        this_canvas = null;

    },

    addTo: function (map) {
        map.addLayer(this);
        return this;
    },

    _resize: function (resizeEvent) {
        this._canvas.width  = resizeEvent.newSize.x;
        this._canvas.height = resizeEvent.newSize.y;
	this._renderer.resize(resizeEvent.newSize.x, resizeEvent.newSize.y);
    },
    _reset: function () {
        var topLeft = this._map.containerPointToLayerPoint([0, 0]);
        L.DomUtil.setPosition(this._canvas, topLeft);
        this._redraw();
    },
    _render:function () {
	this._renderer.render(this._stage);
    },
    _redraw: function () {
	tiles = Object.keys(this._tilesdict)
 	for (var i = 0; i < tiles.length; i++) {
		var ctilename = tiles[i]

		var containers = this._tilesdict[ctilename].children
		for (var j = 0; j < containers.length; j++) {
			var dot=this._map.latLngToContainerPoint([containers[j].datum.geometry.coordinates[1], containers[j].datum.geometry.coordinates[0]]);
			containers[j].position = new PIXI.Point(dot.x, dot.y)
		}
 	}       
       
       this._renderer.render(this._stage);
        // console.timeEnd('process');

        
       this._frame = null;
    },

    _animateZoom: function (e) {
        var scale = this._map.getZoomScale(e.zoom),
            offset = this._map._getCenterOffset(e.center)._multiplyBy(-scale).subtract(this._map._getMapPanePos());

        this._canvas.style[L.DomUtil.TRANSFORM] = L.DomUtil.getTranslateString(offset) + ' scale(' + scale + ')';

    },

    _loadTile : function(tile,tilePoint) {
		console.log("loading")
        	var self = this;
        	this._adjustTilePoint(tilePoint);
		console.log(this.getTileUrl(tilePoint))
		var clayer = this;
        	if (!tile.nodes && !tile.xhr) {
            	tile.xhr = d3.json(this.getTileUrl(tilePoint),function(error,geoJson) {
			if(error==null){
			var tilename = tilePoint.x+":"+tilePoint.y
			clayer._tilesdict[tilename]= new PIXI.Container()
			clayer._tilesdict[tilename].interactive = true;
			//clayer._tilesdict[tilename].cacheAsBitmap = true;
			for (var i = 0; i < geoJson.features.length; i++) {
				container = new PIXI.Container()
				container.datum = geoJson.features[i]
				dot = clayer._map.latLngToContainerPoint([container.datum.geometry.coordinates[1], container.datum.geometry.coordinates[0]]);
				container.position = new PIXI.Point(dot.x, dot.y)
				clayer._userDrawFunc(container);
				clayer._tilesdict[tilename].addChild(container)
			}
			clayer._stage.addChild(clayer._tilesdict[tilename])
			clayer._renderer.render(clayer._stage);
			}
		})
		}
    },
    _clear: function(){
	tiles = Object.keys(this._tilesdict)
 	for (var i = 0; i < tiles.length; i++) {
		var key = tiles[i]
		this._stage.removeChild(this._tilesdict[key])
		delete this._tilesdict[key];
	}
	this._renderer.render(this._stage);
	},
    _removeTile: function (key) {
	
		var tile = this._tiles[key];

		this.fire('tileunload', {tile: tile, url: tile.src});

		if (this.options.reuseTiles) {
			L.DomUtil.removeClass(tile, 'leaflet-tile-loaded');
			this._unusedTiles.push(tile);

		} else if (tile.parentNode === this._tileContainer) {
			this._tileContainer.removeChild(tile);
		}

		// for https://github.com/CloudMade/Leaflet/issues/137
		if (!L.Browser.android) {
			tile.onload = null;
			tile.src = L.Util.emptyImageUrl;
		}
		this._stage.removeChild(this._tilesdict[key])
		delete this._tilesdict[key];
		delete this._tiles[key];
	},
    update: function() {
	tiles = Object.keys(this._tilesdict)
	//for (var k = this._stage.children.length - 1; k >= 0; k--) {	this._stage.removeChild(this._stage.children[k]);};
 	for (var i = 0; i < tiles.length; i++) {
		var ctilename = tiles[i]
		var containers = this._tilesdict[ctilename].children
		for (var j = 0; j < containers.length; j++) {
			var dot=this._map.latLngToContainerPoint([containers[j].datum.geometry.coordinates[1], containers[j].datum.geometry.coordinates[0]]);
			containers[j].position = new PIXI.Point(dot.x, dot.y)
			for (var k = containers[j].children.length - 1; k >= 0; k--) {	containers[j].removeChild(containers[j].children[k]);};
			this._userDrawFunc(containers[j]);
		}
 	}       
        this._renderer.render(this._stage);
	}

});

L.canvasOverlay = function (userDrawFunc, options) {
    return new L.CanvasOverlay(userDrawFunc, options);
};
