//circvis.wedge.js


vq.CircVis = function() {
    vq.Vis.call(this);
};
vq.CircVis.prototype = vq.extend(vq.Vis);

/**
 *
 *  Constructs the Circvis model and adds the SVG tags to the defined DOM element.
 *
 * @param {JSON Object} circvis_object - the object defined above.
 */
vq.CircVis.prototype.draw = function(data) {

    var vis_data = new vq.models.CircVisData(data);

    if (vis_data.isDataReady()) {
        this.chromoData = vis_data;
        this._render();
    } else {
        console.warn('Invalid data input.  Check data for missing or improperly formatted values.');
    }
};

vq.CircVis.prototype._render = function() {

    var that = this;

    var dataObj = this.chromoData;
    var width = dataObj._plot.width, height = dataObj._plot.height;

//    $(dataObj._plot.container).resizable({
//        aspectRatio: width/height,
//        distance: 10,
//        ghost:true,
//         handles: "nw, ne, se, sw" ,
//        helper: "ui-resizable-helper"
//    });
//
//    $(dataObj._plot.container).bind('resizestop',function(event,ui){
//        var scale = ui.size.height/ui.originalSize.height;
//        var svg = d3.select('.circvis');
//        var current_transform = 'scale('+scale+')'+svg.attr('transform');
//        svg.attr('transform',d3.transform(current_transform).toString());
//    });

    function fade(opacity) { return function(d,i) {
        d3.selectAll('g.ideogram')
            .filter(function(g) { return g != d;})
            .transition()
            .delay(20)
            .duration(20)
            .attr('opacity',opacity);

        d3.selectAll('path.link').filter(function(g) { return g[0].chr != d && g[g.length-1].chr != d; })
            .transition()
            .delay(20)
            .duration(20)
            .attr('opacity',opacity);
    };
    }

    function dragmove(d,u) {
        var transform = d3.transform(d3.select(this).attr('transform'));
        var translate = transform.translate;
        var scale = transform.scale;
        var rotation = transform.rotate;
        var actual_width = (width /2*scale[0]), actual_height = (height /2*scale[1]);
        var p = [d3.event.x - actual_width, d3.event.y -actual_height];
        var q = [d3.event.x - d3.event.dx - actual_width, d3.event.y - d3.event.dy - actual_height];
        function cross(a, b) { return a[0] * b[1] - a[1] * b[0]; }
        function dot(a, b) { return a[0] * b[0] + a[1] * b[1]; }
        var angle = Math.atan2(cross(q,p),dot(q,p)) * 180 / Math.PI;
        rotation += angle;
        d3.select(this).attr('transform','translate(' + translate[0]+','+translate[1]+')scale('+scale+')rotate('+rotation+')');
    }


    function dragstart(d,u) {}
    function dragend(d,u) {}

    var drag = d3.behavior.drag()
        .on("dragstart", dragstart)
        .on("drag", dragmove)
        .on("dragend", dragend);

    var id = dataObj._plot.id;

    var svg = d3.select(dataObj._plot.container)        
        .append('svg:svg')
        .attr('id', id)
        .attr('width', width)
        .attr('height', height)
        .append('svg:g')
        .attr('class', 'circvis')
        .attr("transform", 'translate(' + width / 2 + ',' + height / 2 + ')')
        .call(drag);

var ideograms = svg.selectAll('g.ideogram')
        .data(dataObj._chrom.keys)
        .enter().append('svg:g')
            .attr('class','ideogram')
            .attr('data-region',function(d) { return d;})
            .attr('opacity',1.0)
            .attr('transform',function(key) { return 'rotate(' + dataObj._chrom.groups[key].startAngle * 180 / Math.PI + ')';})
            .each(draw_ideogram_rings);
//calculate label placement as halfway along tick radial segment
    var outerRadius  = (dataObj._plot.height / 2);
    var outerTickRadius = outerRadius - dataObj.ticks.outer_padding;
    var innerRadius = outerTickRadius - dataObj.ticks.height;
    var label_height = (outerTickRadius + innerRadius) / 2;

           ideograms.append('text')
            .attr('transform',function(key) { return 'rotate(' + (dataObj._chrom.groups[key].endAngle - dataObj._chrom.groups[key].startAngle)
                   * 180 / Math.PI / 2 +
                   ' )translate(0,-'+label_height+')';})
             .attr('class','region_label')
                           .attr('stroke','black')
                           .attr('text-anchor','middle')
                            .attr('dy','.35em')
               .attr('cursor','pointer')
            .text(function(f) { return f;})
               .each(function() { $(this).disableSelection();})
            .on('mouseover',function ideogram_label_click(obj){
                   var half_arc_genome = {};
                   var region_length = dataObj.normalizedLength[obj];
                   var new_length = 1.0 - region_length;
                   var num_regions = _.size(dataObj.normalizedLength);
                   _.each(dataObj.normalizedLength,function(value,key,list){
                        half_arc_genome[key] = value / new_length / 2;
                   });
                   half_arc_genome[obj] = 0.5;
               });
    if(!_.isNull(dataObj._chrom.radial_grid_line_width)&&
                dataObj._chrom.radial_grid_line_width > 0) {

        var network_radius = dataObj._network.network_radius;
                ideograms.selectAll('path.radial_lines')
                    .data(function(chr) {
                        return [[{x:0,y:-1*outerTickRadius},{x:0,y:-1*network_radius[chr]}]];
                    })
                    .enter().insert('svg:path','.wedges')
                    .attr('class','radial_lines')
                    .attr('d',d3.svg.line()
                    .x(function(point) {return point.x;})
                    .y(function(point) {return point.y;})
                    .interpolate('linear')
                    );
   }

        function draw_ideogram_rings(d) {
            that._add_wedge( d);
            that._add_ticks( d);
            that._add_network_nodes( d);
        }

    that._draw_ticks();
    that._add_network_links(svg.insert('svg:g','.ideogram').attr('class','links'));
    _(_.range(0,dataObj._wedge.length)).each(that._draw_axes_ticklabels,that);

};

vq.CircVis.prototype._drawWedgeContents = function(chr, wedge_index,append) {
    var that = this;
    var dataObj = that.chromoData;
    var ideogram = dataObj._ideograms[chr];
    var wedge_obj = d3.select('.ideogram[data-region="'+chr+'"] .wedge[data-ring="'+wedge_index+'"]');
    var wedge_params = dataObj._wedge[wedge_index];
    switch (wedge_params._plot_type) {
        case('karyotype'):
        case('tile'):
        case('band'):
        case('glyph'):
            this._drawWedgeData(chr, wedge_index,append);
            break;
        default:
            this._drawWedge_withRange(chr, wedge_index,append);
    }
};

/**private **/
vq.CircVis.prototype._add_wedge = function(chr) {
    var that = this;
    var dataObj = this.chromoData;
    var ideogram_obj = d3.select('.ideogram[data-region="'+chr+'"]');

    function outerRadius(index) {
        return dataObj._wedge[index]._outerRadius -  dataObj._wedge[index]._outer_padding
    }

    function innerRadius(index) {
        return outerRadius(index) - dataObj._wedge[index]._plot_height;
    }

    var wedge_obj = ideogram_obj.append("svg:g")
        .attr('class','wedges')
        .selectAll("path")
        .data(_.range(0,dataObj._wedge.length))
        .enter()
        .append("svg:g")
        .attr("class",  "wedge")
        .attr('data-ring',function(index) { return index;});

    wedge_obj
        .append("svg:path")
        .style("fill", "#ddd")
        .style("stroke", "#444")
        .style("opacity",0.6)
        .attr("d",d3.svg.arc()
        .innerRadius(  function(ring_index) { return innerRadius(ring_index); })
        .outerRadius( function(ring_index) { return outerRadius(ring_index);} )
        .startAngle(0)
        .endAngle( dataObj._chrom.groups[chr].angle)
    );

    wedge_obj.append("svg:g")
        .attr('class','data');

    ideogram_obj.selectAll("g.wedge")
        .each(checkAndPlot);

    function checkAndPlot(wedge_index) {
        var wedge_obj = d3.select(this);
        var wedge_params = dataObj._wedge[wedge_index];
        if ((wedge_params._plot_type != 'karyotype') &&
            (wedge_params._plot_type != 'tile') &&
            (wedge_params._plot_type != 'band') &&
            (wedge_params._plot_type != 'glyph')) {
            if (isNaN(wedge_params._min_plotValue) || isNaN(wedge_params._max_plotValue)) {
                console.warn('Range of values for ring with index (' + wedge_index + ') not detected.  Data has not been plotted.');
                return;
            }
            else if (wedge_params._min_plotValue == wedge_params._max_plotValue) {
                wedge_params._min_plotValue = wedge_params._min_plotValue - 1;
                wedge_params._max_plotValue = wedge_params._max_plotValue + 1;
                console.warn('Invalid value range detected.  Range reset to [-1,1].');
            }
        }
        that._drawWedgeContents(chr, wedge_index);
    }
};


vq.CircVis.prototype._drawWedge_withoutRange = function( chr, wedge_index,append) {
    var that = this;
    var dataObj = that.chromoData;
    var ideogram = dataObj._ideograms[chr];
    var wedge_params = dataObj._wedge[wedge_index];
    var wedge = ideogram.wedge[wedge_index];
};

vq.CircVis.prototype._drawWedge_withRange = function(chr, wedge_index,append) {
    var that = this;
    var dataObj = that.chromoData;
    var ideogram = dataObj._ideograms[chr];
    var wedge_params = dataObj._wedge[wedge_index];
    var wedge = ideogram.wedge[wedge_index];
    var wedge_obj = d3.select('.ideogram[data-region="'+chr+'"] .wedge[data-ring="'+wedge_index+'"]');

    if (wedge_params._draw_axes) {
        /* Circular grid lines. */
        //add a new panel each time we want to draw on top of the previously created image.
        var p = dataObj._chrom.groups[chr];
        var startAngle = p.startAngle;
        var endAngle = p.angle;

        //interpolate position for radial line
        var angles = _.range(0,endAngle,0.01);
        // generate ticks for y_axis
        var radii = wedge_params._y_linear.ticks(4);
        //make a vector of pairs (theta,r)
        var cross = _.map(radii, function(r) { return _.map(angles, function(theta) {return [theta,r];});});

        wedge_obj.append("svg:g")
            .attr('class','axes')
            .selectAll("path")
            .data(cross)
            .enter().append("svg:path")
            .style("fill", "none")
            .style("stroke", "#555")
            .style('stroke-width', '1.0px')
            .attr('d',  d3.svg.line.radial()
            .interpolate('cardinal')
            .radius(function(d) { return wedge_params._y_linear(d[1]);})
            .angle(function(d) { return d[0];})
        );

    }

    that._drawWedgeData(chr, wedge_index,append);

};

vq.CircVis.prototype._drawWedgeData = function(chr, wedge_index, append) {
    var that = this;
    var wedge_params = that.chromoData._wedge[wedge_index];

    var funcName = '_drawWedgeData_'+ wedge_params._plot_type;
    if (that[funcName] !==undefined) {
        that[funcName](chr,wedge_index,append);
    }
    //get all the data points in this wedge
    var data = d3.selectAll('.ideogram[data-region="'+chr+'"] .wedge[data-ring="'+wedge_index+'"] .data > *');
    //set listener
    data.on('mouseover',function(d) { wedge_params.hovercard.call(this,d);});
};




vq.CircVis.prototype._drawWedgeData_histogram = function(chr, wedge_index) {
    var that = this;
    var wedge_params = that.chromoData._wedge[wedge_index];
    var wedge_data = that.chromoData._ideograms[chr].wedge[wedge_index];
    var value_key = wedge_params._value_key;
    var wedge_obj = d3.select('.ideogram[data-region="'+chr+'"] .wedge[data-ring="'+wedge_index+'"]');

    var histogramArcTween = function (point) {
        var _inner = wedge_params._innerRadius;
        var _outer = wedge_params._thresholded_outerRadius(point[value_key]);
        var start = that.chromoData._ideograms[chr].theta(point.start);
        var end = that.chromoData._ideograms[chr].theta(point.end);
        return d3.svg.arc()
            .innerRadius( _inner)
            .outerRadius(function(multiplier) { return _inner + (multiplier * (_outer - _inner));})
            .startAngle( start)
            .endAngle(end);
    };

    wedge_obj.select('g.data')
        .selectAll("path")
        .data(wedge_data,that.chromoData._network.node_key)
        .enter().append('svg:path')
        .attr('fill',wedge_params._fillStyle)
        .attr('stroke',wedge_params._strokeStyle)
        .attr('stroke-width',wedge_params._lineWidth)
        .attr('visibility','hidden')
        .attr('d',d3.svg.arc()
        .innerRadius(wedge_params._innerRadius)
        .outerRadius(wedge_params._innerRadius)
        .startAngle(function(point) { return that.chromoData._ideograms[chr].theta(point.start);})
        .endAngle(function(point) { return that.chromoData._ideograms[chr].theta(point.end);})
    )
        .transition()
        .delay(100)
        .duration(800)
        .attr('visibility','visible')
        .attrTween('d',function(a) {
            var i =d3.interpolate(0,1.0);
            var arc = histogramArcTween(a);
            return function(t) {return arc(i(t));};
        })
        .attrTween('opacity', function(a) {
            var i=d3.interpolate(0.2,1.0);
            return function(t) {return  i(t);}
        });

};

vq.CircVis.prototype._drawWedgeData_scatterplot = function(chr, wedge_index) {
    var that = this;
    var wedge_params = that.chromoData._wedge[wedge_index];
    var wedge_data = that.chromoData._ideograms[chr].wedge[wedge_index];
    var value_key = wedge_params._value_key;
    var wedge_obj = d3.select('.ideogram[data-region="'+chr+'"] .wedge[data-ring="'+wedge_index+'"]');

    wedge_obj.select('g.data')
        .selectAll("path")
        .data(wedge_data,that.chromoData._network.node_key)
        .enter().append('svg:path')
        .attr('fill',wedge_params._fillStyle)
        .attr('stroke',wedge_params._strokeStyle)
        .attr('opacity',0.2)
        .attr("transform",function(point) {
            return "rotate(" + ((that.chromoData._ideograms[chr].theta(point.start) * 180 / Math.PI) - 90)+ ")translate(" +
                wedge_params._thresholded_value_to_radius(point[value_key]) + ")";} )
        .attr('d',d3.svg.symbol()
        .type(wedge_params._shape)
        .size(Math.pow(wedge_params._radius(),2)) )
        .transition()
        .delay(100)
        .duration(800)
        .attrTween('opacity',function(a) {
            var i =d3.interpolate(0.2,1.0);
            return function(t) { return i(t);}
        });

};

vq.CircVis.prototype._drawWedgeData_band = function(chr, wedge_index) {
    var that = this;
    var wedge_params = that.chromoData._wedge[wedge_index];
    var wedge_data = that.chromoData._ideograms[chr].wedge[wedge_index];
    var value_key = wedge_params._value_key;

    var wedge_obj = d3.select('.ideogram[data-region="'+chr+'"] .wedge[data-ring="'+wedge_index+'"]');
    wedge_obj.select('g.data')
        .selectAll("path")
        .data(wedge_data,that.chromoData._network.node_key)
        .enter().append('svg:path')
        .attr('fill',wedge_params._fillStyle)
        .attr('stroke',wedge_params._strokeStyle)
        .attr('d',d3.svg.arc()
        .innerRadius( wedge_params._innerRadius)
        .outerRadius( wedge_params._outerPlotRadius)
        .startAngle(function(point) { return that.chromoData._ideograms[chr].theta(point.start);})
        .endAngle(function(point) { return that.chromoData._ideograms[chr].theta(point.end);})
    );
};

vq.CircVis.prototype._drawWedgeData_glyph = function(chr, wedge_index) {

    var that = this;
    var wedge_params = that.chromoData._wedge[wedge_index];
    var wedge_data = that.chromoData._ideograms[chr].wedge[wedge_index];
    var value_key = wedge_params._value_key;
    var wedge_obj = d3.select('.ideogram[data-region="'+chr+'"] .wedge[data-ring="'+wedge_index+'"]');

    wedge_obj.select('g.data')
        .selectAll("path")
        .data(wedge_data,that.chromoData._network.node_key)
        .enter().append('svg:path')
        .attr('fill',wedge_params._fillStyle)
        .attr('stroke',wedge_params._strokeStyle)
        .attr("transform",function(point) {
            return "translate(" +
                wedge_params._glyph_distance(point,wedge_params) *
                    Math.cos(that.chromoData._ideograms[chr].theta(point.start) ) +
                "," +
                wedge_params._glyph_distance(point,wedge_params) *
                    Math.sin(that.chromoData._ideograms[chr].theta(point.start)) +
                ")";} )
        .attr('d',d3.svg.symbol()
        .type(wedge_params._shape)
        .size(Math.pow(wedge_params._radius(),2)) );
};

vq.CircVis.prototype._drawWedgeData_tile = function(chr, wedge_index) {
    var that = this;
    var wedge_params = that.chromoData._wedge[wedge_index];
    var wedge_data = that.chromoData._ideograms[chr].wedge[wedge_index];
    var value_key = wedge_params._value_key;
    var wedge_obj = d3.select('.ideogram[data-region="'+chr+'"] .wedge[data-ring="'+wedge_index+'"]');

    wedge_obj.select('g.data')
        .selectAll("path")
        .data(wedge_data,that.chromoData._network.node_key)
        .enter().append('svg:path')
        .attr('fill',wedge_params._fillStyle)
        .attr('stroke',wedge_params._strokeStyle)
        .attr('d',d3.svg.arc()
        .innerRadius( function(point) { return wedge_params._thresholded_tile_innerRadius(point,wedge_params);})
        .outerRadius( function(point) { return wedge_params._thresholded_tile_outerRadius(point,wedge_params);})
        .startAngle(function(point) { return that.chromoData._ideograms[chr].theta(point.start);})
        .endAngle(function(point) { return that.chromoData._ideograms[chr].theta(point.end);})
    );
};

vq.CircVis.prototype._drawWedgeData_karyotype = function(chr, wedge_index) {
    var that = this;
    var wedge_params = that.chromoData._wedge[wedge_index];
    var wedge_data = that.chromoData._ideograms[chr].wedge[wedge_index];
    var value_key = wedge_params._value_key;
    var wedge_obj = d3.select('.ideogram[data-region="'+chr+'"] .wedge[data-ring="'+wedge_index+'"]');
    wedge_obj.select('g.data')
        .selectAll("path")
        .data(wedge_data,that.chromoData._network.node_key)
        .enter().append('svg:path')
        .attr('fill',function(point) { return point[value_key];})
        .attr('stroke',wedge_params._strokeStyle)
        .attr('d',d3.svg.arc()
        .innerRadius( wedge_params._innerRadius)
        .outerRadius( wedge_params._outerPlotRadius)
        .startAngle(function(point) { return that.chromoData._ideograms[chr].theta(point.start);})
        .endAngle(function(point) { return that.chromoData._ideograms[chr].theta(point.end);})
    );
};

vq.CircVis.prototype._drawWedgeData_heatmap = function(chr, wedge_index) {
    var that = this;
    var wedge_params = that.chromoData._wedge[wedge_index];
    var wedge_data = that.chromoData._ideograms[chr].wedge[wedge_index];
    var value_key = wedge_params._value_key;
    var wedge_obj = d3.select('.ideogram[data-region="'+chr+'"] .wedge[data-ring="'+wedge_index+'"]');

    var generateArcTween = function (point) {
        var _theta = that.chromoData._ideograms[chr].theta(point.start);
        var _end = that.chromoData._ideograms[chr].theta(point.end);
        return d3.svg.arc()
            .innerRadius(function(multiplier) { return wedge_params._innerRadius - (multiplier *4);})
            .outerRadius(function(multiplier) { return wedge_params._outerPlotRadius + (multiplier * 4);})
            .startAngle(function(multiplier) { return _theta -  (multiplier * Math.PI / 360);})
            .endAngle(function(multiplier) {  return _end + (multiplier * Math.PI /  360);});
    };

    wedge_obj.select('g.data')
        .selectAll("path")
        .data(wedge_data,that.chromoData._network.node_key)
        .enter().append('svg:path')
        .attr('fill',wedge_params._fillStyle)
        .attr('stroke',wedge_params._strokeStyle)
        .attr('stroke-width','1px')
        .attr('visibility','hidden')
        .attr('d',d3.svg.arc()
        .innerRadius( wedge_params._innerRadius)
        .outerRadius( wedge_params._outerPlotRadius)
        .startAngle(function(point) { return that.chromoData._ideograms[chr].theta(point.start);})
        .endAngle(function(point) { return that.chromoData._ideograms[chr].theta(point.end);})
    )
        .transition()
        .delay(100)
        .duration(800)
        .attr('visibility','visible')
        .attrTween('d',function(a) {
            var i =d3.interpolate(4,0);
            var arc = generateArcTween(a);
            return function(t) {return arc(i(t));};
        });

};

vq.CircVis.prototype._draw_axes_ticklabels = function(wedge_index) {
    var that = this;
    var dataObj = that.chromoData;
    var wedge_params = dataObj._wedge[wedge_index];
    //don't do this for ring without a range.
    if(!_.isFunction(wedge_params._y_linear)) { return;}

    if (wedge_params._draw_axes) {
        /* Circular grid lines. */

        // generate ticks for y_axis
        var radii = wedge_params._y_linear.ticks(4);

        d3.select('.ideogram .wedge[data-ring="'+wedge_index+'"] .axes')
            .append("svg:g")
            .attr('class','labels')
            .selectAll('g.text')
            .data(radii)
            .enter().append("svg:text")
            .each(function() {$(this).disableSelection();})
            .attr('transform',function(r) {return 'translate(0,-'+wedge_params._y_linear(r) +')';})
            .text(function(a) { return a;});
    }

};

vq.CircVis.prototype._add_wedge_data = function(data) {
    var that = this;
    var chr = data.chr;
    _.each(that.chromoData._ideograms[chr].wedge, function(wedge,index) {
        if(_.isUndefined(data[that.chromoData._wedge[index]._value_key]) || that.chromoData._wedge[index]._plot_type =='karyotype') { return;}
        wedge.push(data);
        that._drawWedgeData(chr,index);
    });

};
/** private **/
vq.CircVis.prototype._add_ticks = function(chr) {
    var that = this;

    var ideogram_obj = d3.select('.ideogram[data-region="'+chr+'"]');
    var dataObj = that.chromoData;

    var outerRadius  = (dataObj._plot.height / 2);
    var outerTickRadius = outerRadius - dataObj.ticks.outer_padding;
    var innerRadius = outerTickRadius - dataObj.ticks.height;
    var inner = dataObj.ticks.tile_ticks ?  function(feature) {
        return innerRadius +
            (feature.level * (dataObj.ticks.wedge_height * 1.3)) ;} :
                function(feature) { return innerRadius;};

    var outer = function(feature) { return inner(feature) + dataObj.ticks.wedge_height;};
    var label_key = dataObj.ticks.label_key;

    var tick_fill = function(c) { return dataObj.ticks.fill_style(c,label_key);};
    var tick_stroke = function(c) { return dataObj.ticks.stroke_style(c,label_key);};
    var tick_angle = function(tick) { var angle = tick_length / inner(tick); return  isNodeActive(tick) ? angle * 2 : angle; };
    var isNodeActive = function(c) { return true;};

    var tick_width = Math.PI / 180 * dataObj.ticks.wedge_width;
    var tick_length = tick_width * innerRadius;

    function tick_translate(tick) {
        var radius = (outer(tick) + inner(tick)) / 2;
        var angle =  ((that.chromoData._ideograms[chr].theta(tick.start) * 180 / Math.PI) - 90);
        var tick_rotation = (that.chromoData._ideograms[chr].startAngle + that.chromoData._ideograms[chr].theta(tick.start) >= Math.PI ? 180 : 0);
        return "rotate(" + angle + ")translate(" +  radius + ")rotate("+tick_rotation+")";}

    var generateArcTween = function (point) {
        var _inner = inner(point);
        var _outer = outer(point);
        var _theta = that.chromoData._ideograms[chr].theta(point.start);
        var _tick_angle = tick_angle(point);
     return d3.svg.arc()
        .innerRadius(function(multiplier) { return _inner - (multiplier *4);})
        .outerRadius(function(multiplier) { return _outer + (multiplier * 4);})
        .startAngle(function(multiplier) { return _theta -  (multiplier * Math.PI / 360);})
        .endAngle(function(multiplier) {
            return _theta + _tick_angle + (multiplier * Math.PI /  360);});
    };

    var tick_key = dataObj._network.node_key; //.tick_key = function(tick) { return tick.chr+':'+tick.start + ':' + tick.end + ':' + tick[label_key]};

    if(ideogram_obj.select('g.ticks').empty()) {
                ideogram_obj
                    .append('svg:g')
                    .attr('class','ticks');
        }

       var ticks = ideogram_obj.select('g.ticks').selectAll('path')
                    .data(dataObj.ticks.data_map[chr],tick_key);

                    ticks.enter().append('path')
                    .attr('class',function(tick) { return tick[label_key];})
                            .attr('fill',tick_fill)
                            .attr('stroke',tick_stroke)
                            .attr('visibility','hidden')
                            .attr('d',d3.svg.arc()
                            .innerRadius( inner)
                            .outerRadius( outer)
                            .startAngle(function(point) { return that.chromoData._ideograms[chr].theta(point.start);})
                            .endAngle(function(point) {
                                        return that.chromoData._ideograms[chr].theta(point.start) +
                                        tick_angle(point);})
                            ).on('mouseover',function(d){
                                                d3.select('text[data-label=\''+d[label_key]+'\']').attr('visibility','visible');
                                                dataObj.ticks.hovercard.call(this,d);
                                            })
                                            .on('mouseout',function(d){
                                                d3.select('text[data-label=\''+d[label_key]+'\']').attr('visibility','hidden');
                                            })
                    .transition()
                    .attr('visibility','visible')
                    .delay(100)
                    .duration(800)
                    .attrTween('d',function(a) {
                        var i =d3.interpolate(4,0);
                         var arc = generateArcTween(a);
                        return function(t) {return arc(i(t));};
                        })
                        .attrTween('opacity', function(a) {
                            var i=d3.interpolate(0.2,1.0);
                                return function(t) {return  i(t);}
                        });

                        ticks.exit().remove();

//        ideogram_obj.selectAll('.ticks path')   //label
//                        .selectAll('svg.text')
//                        .data(dataObj.ticks.data_map[chr],tick_key)
//                           .enter()
//                           .append('text')
//                           .attr('transform', function(tick)  { return tick_translate(tick);})
//                           .attr("x",8)
//                           .attr('data-label',function(d) { return d[label_key];})
//                           .attr('class','labels')
//                           // .attr("dy",".35em")
//                           // .attr('stroke','black')
//                           // .attr("text-anchor","middle")
//                           // .attr('visibility','hidden')
//                           .text(function(d) { return d[label_key];});
//
};


vq.CircVis.prototype._draw_ticks = function() {

//    d3.selectAll('.ticks')
//       .transition()
//       .duration(1200)
//       .attr('opacity',1.0)

};


/** private **/
vq.CircVis.prototype._add_network_nodes = function (chr,append) {
    var append = append || Boolean(false);
    var     dataObj = this.chromoData;

    var ideogram_obj = d3.select('.ideogram[data-region="'+chr+'"]');
    var innerRadius = dataObj._ideograms[chr].wedge.length > 0 ? dataObj._wedge[dataObj._ideograms[chr].wedge.length-1]._innerRadius :
                     (dataObj._plot.height / 2) - dataObj.ticks.outer_padding - dataObj.ticks.height;
    var network_radius = dataObj._network.network_radius[chr];
//    var node_behavior = function(d) {
//       return (pv.Behavior.hovercard(
//       {
//           include_header : false,
//           include_footer : false,
//           self_hover : true,
//           timeout : dataObj._plot.tooltip_timeout,
//           data_config :
//           dataObj._network.node_tooltipItems,
//           tool_config : dataObj._network.node_tooltipLinks
//       }
//               ).call(this,d),
//
//        dataObj.network_panel.activeNetworkNode(this.index),
//        populateConnectedNodes(this.index),
//        dataObj.network_panel.render()
//        );};
//
//    var link_behavior = function(c,d) {
//       return (pv.Behavior.hovercard(
//       {
//           include_header : false,
//           include_footer : false,
//           self_hover : true,
//           param_data : true,
//           timeout : dataObj._plot.tooltip_timeout,
//           data_config :
//           dataObj._network.link_tooltipItems,
//           tool_config :
//           dataObj._network.link_tooltipLinks
//       }
//               ).call(this,d),
//
//        dataObj.network_panel.activeNetworkLink(this.parent.index),
//        dataObj.network_panel.render()
//        );};



    var feature_angle = dataObj._ideograms[chr]._feature_angle;

    var network_node_y = dataObj._network.tile_nodes ?
        function(d) { return ( (network_radius - (d.level * 10)) * Math.sin(dataObj._ideograms[chr]._feature_angle(d.start) )); }  :
        function(d) { return  ( (network_radius) * Math.sin(dataObj._ideograms[chr]._feature_angle(d.start) )) };
    var network_node_x = dataObj._network.tile_nodes ?
        function(d) { return ((network_radius - (d.level * 10)) * Math.cos(dataObj._ideograms[chr]._feature_angle(d.start) )); } :
        function(d) { return ((network_radius) * Math.cos(dataObj._ideograms[chr]._feature_angle(d.start) )); };
    //var node_angle = function(d) { return feature_angle(d.start) + Math.PI /2;};

    //var link_color = function(link) {return pv.color(dataObj._network.link_strokeStyle(link));};
    /** @private */
//    var node_colors;
//
//        if (dataObj._network.node_fillStyle() == 'ticks') {
//            node_colors = function(node) { return dataObj.ticks.fill_style(node);};
//        } else {
//            node_colors =  function(node) {return pv.color(dataObj._network.node_fillStyle(node));};
//        }
//
//    var node_stroke =  function(node) {return pv.color(dataObj._network.node_strokeStyle(node));};
//
//    var link_active = function(c,d)  {return (dataObj.network_panel.activeNetworkNode() == null ||
//            this.parent.index == dataObj.network_panel.activeNetworkLink() ||
//            d.source == dataObj.network_panel.activeNetworkNode() ||
//            d.target == dataObj.network_panel.activeNetworkNode()) &&
//            (linkDegreeInBounds(d.sourceNode) || linkDegreeInBounds(d.targetNode));};
//
//    var link_width_active = function(node, link) {
//        return (this.parent.index == dataObj.network_panel.activeNetworkLink() ||
//                link.source == dataObj.network_panel.activeNetworkNode() ||
//                link.target == dataObj.network_panel.activeNetworkNode() ) ?
//                dataObj._network.link_line_width(node, link) + 1.0 : dataObj._network.link_line_width(node, link);
//    };

//    var link_visible = function(c,d) { return true;};
//
//    switch(dataObj._network.node_highlightMode) {
//        case('isolate'):
//            link_visible = link_active;
//            break;
//        case('brighten'):
//        default:
//    }
//
//    function link_strokeStyle(c,d) {
//        return (this.parent.index == dataObj.network_panel.activeNetworkLink() ||
//                d.source == dataObj.network_panel.activeNetworkNode() ||
//                d.target == dataObj.network_panel.activeNetworkNode() ) ?
//                link_color(d).darker(2).alpha(dataObj._network.link_alpha(d)) :
//                link_color(d).alpha(dataObj._network.link_alpha(d) );
//    }
//    function linkDegreeInBounds(node) {
//        return ( dataObj._network.min_node_linkDegree == null ? true : node.linkDegree >= dataObj._network.min_node_linkDegree) &&
//                ( dataObj._network.max_node_linkDegree == null ? true : node.linkDegree <= dataObj._network.max_node_linkDegree);
//    }
//
//    function link_listener(c,link) {
//        dataObj._network.link_listener(link);
//    }


//    ideogram_obj.selectAll('path.link')
//                .data(splines = bundle(dataObj._network.links_array))
//                .enter().append('svg:path')
//                .attr('class','link')
//                .attr('d',line);
    if (!append) {
        ideogram_obj.append('svg:g').attr('class','nodes');
    }

    var node = ideogram_obj
        .select('g.nodes')
        .selectAll('circle.node')
        .data(dataObj._network.nodes_array.filter(function(node) { return !node.children && node.chr == chr;}));

    node.enter().append('svg:circle')
        .attr('class','node')
        .attr('cx',0)
        .attr('cy',0)
        .attr('r',dataObj._network.node_radius)
        .attr('fill',dataObj._network.node_fillStyle)
        .attr('stroke',dataObj._network.node_strokeStyle)
        .attr('transform', function(node) {
            return 'rotate('+ ((dataObj._ideograms[chr].theta(node.start) / Math.PI * 180) - 90) +')translate(' + network_radius + ')';
        })
        .on('mouseover',function(d){d3.select(this).attr('opacity',1.0); dataObj._network.node_hovercard.call(this,d);})
        .transition()
        .delay(100)
        .duration(800)
        .attrTween('r',function(a) {
                                var i =d3.interpolate(dataObj._network.node_radius(a)*4,dataObj._network.node_radius(a));
                                return function(t) {return i(t)};
                                })
        .attrTween('opacity',function() {
                                    var i =d3.interpolate(0.2,1);
                                    return function(t) {return i(t)};
                                    });

    node.exit().remove();



//    dataObj.network_panel = this.event_panel.add(pv.Layout.Network)
//            .def('connectedToActiveNetworkNode', [])
//            .def('activeNetworkNode', null)
//            .def('activeNetworkLink', null)
//            .nodes(dataObj._network.nodes_array)
//            .links(dataObj._network.links_array);
//
//    dataObj.network_panel.link.add(pv.Line)
//            .visible(link_visible)
//            .interpolate(link_angle)
//            .strokeStyle(link_strokeStyle)
//            .eccentricity(link_eccentricity)
//            .cursor('pointer')
//            .event('mouseover',link_behavior)
//            .event('mouseout', function() {
//        dataObj.network_panel.activeNetworkLink(null);
//        dataObj.network_panel.render();
//    })
//            .event('click', link_listener)
//            .lineWidth(link_width_active);
//
//    dataObj.network_panel.node
//            .bottom(network_node_y)
//            .left(network_node_x)
//            .fillStyle(function(c,d) { return node_colors(c).alpha(0.9); })
//            .strokeStyle(function(c) { return node_stroke(c).alpha(0.9); });
//
//    dataObj.network_panel.node.add(pv.Dot)
//            .shape('dot')
//            .lineWidth(1)
//            .radius(2.0)
//            .angle(node_angle)
//            .event('mouseover',node_behavior)
//            //.title(dataObj._network.node_tooltipFormat)
//            .event('mouseout', function() {
//        dataObj.network_panel.activeNetworkNode(null);
//        dataObj.network_panel.connectedToActiveNetworkNode([]);
//        dataObj.network_panel.render();
//    })
//            .cursor('pointer')
//            .event('click', function(c) {
//        dataObj._network.node_listener(c, dataObj.network_panel.connectedToActiveNetworkNode());
//    });
};

vq.CircVis.prototype._add_network_links= function(svg_obj, append) {
    var append = append || Boolean(false);
    var dataObj = this.chromoData;

    var bundle = d3.layout.bundle();


    var line = d3.svg.line.radial()
        .interpolate("bundle")
        .tension(.65)
        .radius(function(d) { return d.radius !== undefined ?
            d.radius :
            dataObj._network.network_radius[d.chr]
        })
        .angle(function(d) { return d.angle !== undefined ?
            d.angle :
            dataObj._ideograms[d.chr]._feature_angle(d.start);
        });

    var strokeWidthTween = function(begin,end){ return function(a) {
                                                var i =d3.interpolate(begin(a),end(a));
                                                return function(t) {return i(t)+'px'};
                                                };
                            };


    svg_obj.selectAll("path.link")
        .data(bundle(dataObj._network.links_array).map(function(b, index) { return _.extend(dataObj._network.links_array[index],{spline:b});}))
        .enter().insert("svg:path")
        .attr("class", function(d) {
            return "link t_" + d.source.chr + " p_"+ d.target.chr;
        })
        .attr('visibility','hidden')
         .attr('fill','none')
         .attr('stroke','steelblue')
        .attr('stroke-width',8)
        .attr('opacity',0.2)
        .attr("d", function(link) { return line(link.spline);})
        .on('mouseover',function(d){
            d3.select(this).attr('opacity',1.0); dataObj._network.link_hovercard.call(this,d);
        })
        .on('mouseout',function(d){d3.select(this).attr('opacity',dataObj._network.link_alpha(d));})
        .transition()
        .delay(100)
        .duration(800)
        .attr('visibility','visible')
        .attrTween('stroke-width',strokeWidthTween(function(a) { return dataObj._network.link_line_width(a)*3;},function(a) { return dataObj._network.link_line_width(a);}))
        .attrTween('opacity',function(a) {
                                    var i =d3.interpolate(0.2,dataObj._network.link_alpha(a));
                                    return function(t) {return i(t)};
                                    });



};



vq.models.CircVisData = function(data) {

    vq.models.VisData.call(this, data);

    this.setDataModel();

    if (this.getDataType() == 'vq.models.CircVisData') {
        this._build_data(this.getContents())
    } else {
        console.warn('Unrecognized JSON object.  Expected vq.models.CircVisData object.');
    }
};


vq.models.CircVisData.prototype = vq.extend(vq.models.VisData);

vq.models.CircVisData.prototype.setDataModel = function() {
    this._dataModel = [
        {label: '_plot.width', id: 'PLOT.width', defaultValue: 400},
        {label: '_plot.height', id: 'PLOT.height', defaultValue: 400},
        {label : '_plot.container', id:'PLOT.container', optional : true},
        {label: 'vertical_padding', id: 'PLOT.vertical_padding', defaultValue: 0},
        {label: 'horizontal_padding', id: 'PLOT.horizontal_padding', defaultValue: 0},
        {label : '_chrom.keys', id: 'GENOME.DATA.key_order', defaultValue : ["1","2","3","4","5","6","7","8","9","10",
            "11","12","13","14","15","16","17","18","19","20","21","22","X","Y"] },
        {label : '_chrom.length', id: 'GENOME.DATA.key_length', defaultValue : [] },
        {label : '_chrom.reverse_list', id: 'GENOME.OPTIONS.key_reverse_list', optional : true },
        {label : '_chrom.label_layout_style', id: 'GENOME.OPTIONS.label_layout_style', defaultValue : 'default' },
        {label : '_chrom.label_font_style', id: 'GENOME.OPTIONS.label_font_style', cast: String, defaultValue : "16px helvetica, monospaced" },
        {label : '_chrom.radial_grid_line_width', id: 'GENOME.OPTIONS.radial_grid_line_width', cast : Number, defaultValue : null },
        {label : '_chrom.listener', id: 'GENOME.OPTIONS.listener', cast: Function, defaultValue : function() {
            return null;
        }},
        {label : '_plot.enable_pan', id: 'PLOT.enable_pan', cast: Boolean, defaultValue : false },
        {label : '_plot.enable_zoom', id: 'PLOT.enable_zoom', cast: Boolean, defaultValue : false },
        {label : '_plot.show_legend', id: 'PLOT.show_legend', cast: Boolean, defaultValue : false },
        {label : '_plot.legend_corner', id: 'PLOT.legend_corner', cast: String, defaultValue : 'ne' },
        {label : '_plot.legend_radius', id: 'PLOT.legend_radius', cast: Number, defaultValue : 25 },
        {label : '_plot.legend_show_rings', id: 'PLOT.legend_show_rings', cast: Boolean, defaultValue : true },
        {label : '_plot.rotate_degrees', id: 'PLOT.rotate_degrees', cast: Number, defaultValue : 0 },
        {label : '_plot.tooltip_timeout', id: 'PLOT.tooltip_timeout', cast: Number, defaultValue : 200 },
        {label : '_network.data', id: 'NETWORK.DATA.data_array',  optional : true },
        //{label : '_network.radius', id: 'NETWORK.OPTIONS.network_radius', cast : Number, defaultValue : 100 },
        {label : '_network._outer_padding', id: 'NETWORK.OPTIONS.outer_padding',  optional : true },
        {label : '_network.node_listener', id: 'NETWORK.OPTIONS.node_listener', cast: Function, defaultValue : function() {
            return null;
        } },
        {label : '_network.link_listener', id: 'NETWORK.OPTIONS.link_listener', cast: Function, defaultValue : function() {
            return null;
        } },
        {label : '_network.link_tooltipItems', id: 'NETWORK.OPTIONS.link_tooltip_items',
            defaultValue :  { 'Node 1 Chr' : 'sourceNode.chr', 'Node 1 Start' : 'sourceNode.start', 'Node1 End' : 'sourceNode.end',
                'Node 2 Chr' : 'targetNode.chr', 'Node 2 Start' : 'targetNode.start', 'Node 2 End' : 'targetNode.end'} },
        {label : '_network.link_tooltipLinks', id: 'NETWORK.OPTIONS.link_tooltip_links',  defaultValue : {} },
        {label : '_network.link_line_width', id: 'NETWORK.OPTIONS.link_line_width', cast : vq.utils.VisUtils.wrapProperty,
            defaultValue : function(node, link) {
                return 1;
            }},
        {label : '_network.link_alpha', id: 'NETWORK.OPTIONS.link_alpha', cast : vq.utils.VisUtils.wrapProperty,  defaultValue : function() {
            return 0.7;
        } },
        {label : '_network.link_strokeStyle', id: 'NETWORK.OPTIONS.link_stroke_style', cast : vq.utils.VisUtils.wrapProperty, defaultValue : function() {
            return 'steelblue';
        } },
        {label : '_network.node_fillStyle', id: 'NETWORK.OPTIONS.node_fill_style', cast : vq.utils.VisUtils.wrapProperty, defaultValue : function() {
            return 'green';
        } },
        {label : '_network.node_radius', id: 'NETWORK.OPTIONS.node_radius', cast : vq.utils.VisUtils.wrapProperty, defaultValue : function() {
            return 3;
        } },
        {label : '_network.node_key', id: 'NETWORK.OPTIONS.node_key', cast : Function, defaultValue : function(node) {
            return node['chr'];
        } },
        {label : '_network.node_highlightMode', id: 'NETWORK.OPTIONS.node_highlight_mode', cast : String, defaultValue : 'brighten' },
        {label : '_network.node_tooltipFormat', id: 'NETWORK.OPTIONS.node_tooltipFormat', cast : vq.utils.VisUtils.wrapProperty, defaultValue : vq.utils.VisUtils.network_node_title },
        {label : '_network.node_tooltipItems', id: 'NETWORK.OPTIONS.node_tooltip_items', defaultValue :  { Chr : 'chr', Start : 'start', End : 'end'} },
        {label : '_network.node_tooltipLinks', id: 'NETWORK.OPTIONS.node_tooltip_links',  defaultValue : {} },
        {label : '_network.max_node_linkDegree', id: 'NETWORK.OPTIONS.max_node_linkdegree', cast : Number, defaultValue :  9999 },
        {label : '_network.min_node_linkDegree', id: 'NETWORK.OPTIONS.min_node_linkdegree', cast : Number, defaultValue :  0 },
        {label : '_network.node_overlap_distance', id: 'NETWORK.OPTIONS.node_overlap_distance', cast : Number, defaultValue :  12000000.0},
        {label : '_network.tile_nodes', id: 'NETWORK.OPTIONS.tile_nodes', cast : Boolean, defaultValue : false },
        {label : 'ticks.tooltipItems', id: 'TICKS.OPTIONS.tooltip_items', defaultValue :  { Chr : 'chr', Start : 'start', End : 'end', Label:'value'} },
        {label : 'ticks.tooltipLinks', id: 'TICKS.OPTIONS.tooltip_links',  defaultValue : {} },
        {label : 'ticks.label_map', id: 'TICKS.OPTIONS.label_map', defaultValue:[
            {key:'',label:''}
        ]},

        {label : 'ticks.label_key', id: 'TICKS.OPTIONS.label_key', defaultValue:'value',cast: String},
        {label : 'ticks._data_array', id: 'TICKS.DATA.data_array',  optional : true },
        {label : 'ticks.height', id: 'TICKS.OPTIONS.height', cast : Number, defaultValue: 60 },
        {label : 'ticks.wedge_width', id: 'TICKS.OPTIONS.wedge_width', cast : Number, defaultValue: 0.2 },
        {label : 'ticks.wedge_height', id: 'TICKS.OPTIONS.wedge_height', cast : Number, defaultValue: 10 },
        {label : 'ticks.outer_padding', id: 'TICKS.OPTIONS.outer_padding', cast : Number, defaultValue: 0 },
        {label : 'ticks.listener', id: 'TICKS.OPTIONS.listener', cast : Function, defaultValue : function() {
            return null;
        } },
        {label : 'ticks.display_legend', id: 'TICKS.OPTIONS.display_legend', cast : Boolean, defaultValue : true },
        {label : 'ticks.legend_corner', id: 'TICKS.OPTIONS.legend_corner', cast : String, defaultValue : 'nw' },
        {label : 'ticks.tile_ticks', id: 'TICKS.OPTIONS.tile_ticks', cast : Boolean, defaultValue: true },
        {label : 'ticks.overlap_distance', id: 'TICKS.OPTIONS.overlap_distance', cast : Number, optional: true},
        {label : 'ticks.fill_style', id: 'TICKS.OPTIONS.fill_style', cast : vq.utils.VisUtils.wrapProperty, defaultValue : function() {
            return 'red';
        }},
        {label : 'ticks.stroke_style', id: 'TICKS.OPTIONS.stroke_style', cast : vq.utils.VisUtils.wrapProperty, defaultValue : function() {
            return 'white';
        }},
        {label : '_wedge' , id:'WEDGE', optional : true}
    ];
};

vq.models.CircVisData.prototype._build_data = function(data_struct) {
    var data = data_struct;

    this._processData(data);

    if (this._wedge) {
        this._wedge = this._wedge.map(function(b) {
            return new vq.models.CircVisData.WedgeData(b);
        });
    }

    this._setupData();
};


vq.models.CircVisData.prototype._setupData = function() {
    var chrom_keys_order={},chrom_length_map,chrom_length_array = [],cnv_map, startAngle = {},
        cnv_array, cnv_height = [], startAngle_map = {},normalizedLength = {},
        deviation = [],median = [], theta = {}, totalChromLength;
    this.normalizedLength,this.theta = [],this.startAngle_map = {};

    var that = this;
    this._plot.id = vq.utils.VisUtils.guid();

//  Ideogram Data

    if (this._chrom.keys == [] || this._chrom.length == []) {
        console.warn('Chromosome/Ideogram information has not been detected.  Please verify that keys and length/key mappings have been ' +
            'passed into the GENOME.DATA object.');
        return;
    }

    var chrom_keys_array = this._chrom.keys;       //array in pre-sorted order    
    _.each(chrom_keys_array,function(val,index){chrom_keys_order[val]=index;});

    chrom_length_array = this._chrom.length.filter(function(d) {
        return chrom_keys_order[d['chr_name']] != null;
    });
    chrom_length_array.sort(function(c, d) {
        return chrom_keys_order[c['chr_name']] - chrom_keys_order[d['chr_name']] > 0;
    });  //sort by given order
    totalChromLength = vq.sum(chrom_length_array, function(d) {
        return d['chr_length'];
    });

    chrom_length_map = {};
        _.each(chrom_length_array,function(obj) {
            chrom_length_map[obj['chr_name'].toUpperCase()] = obj['chr_length'];
            normalizedLength[obj['chr_name'].toUpperCase()] =  obj['chr_length'] / totalChromLength;
        });

    this.normalizedLength = normalizedLength;

    var chrom_groups = {};

    var rotation = (this._plot.rotate_degrees) * Math.PI / 180;

    //for each index of chrom_keys ( pre-sorted)
    // sum all lengths from 1st index to last index of chrom_length (sorted to chrom_length)
    _.each(chrom_keys_array,function(d,index) {
        startAngle[d] = _.reduce(chrom_keys_array.slice(0, (chrom_keys_order[d])),
            function(a,b,index) {
                return a+(normalizedLength[chrom_keys_array[index]] * 2 * Math.PI);
            },0);

        theta[d] = d3.scale.linear().domain([0, chrom_length_map[d.toUpperCase()]])
            .range([0, 2 * Math.PI * normalizedLength[d]]);

        if (that._chrom.reverse_list != undefined &&
            that._chrom.reverse_list.filter(
                function(c) {
                    return c == d;
                }).length > 0) {  //defined as reversed!
            theta[d] = d3.scale.linear().domain([0, chrom_length_map[d.toUpperCase()]])
                .range([2 * Math.PI * normalizedLength[d], 0]);

        } else {
            theta[d] = d3.scale.linear().domain([0, chrom_length_map[d.toUpperCase()]])
                .range([0, 2 * Math.PI * normalizedLength[d]]);

        }
        chrom_groups[d]={key:d, startAngle: startAngle[d], endAngle: startAngle[d] + 2 * Math.PI * normalizedLength[d], theta:theta[d],
        angle: 2 * Math.PI * normalizedLength[d]};
    });

    this.theta = theta;
    this._ideograms={};
    _.each(that._chrom.keys, function(d) {
            startAngle_map[d] =  startAngle[d] + rotation;
                that._ideograms[d] = _.extend(chrom_groups[d],{wedge:[],_feature_angle : function(a) { return this.startAngle + this.theta(a); }});
            });
    this.startAngle_map = startAngle_map;
    this._chrom.groups = chrom_groups;

//    Ring Data

    if (this._wedge != undefined) {
        _.each(this._wedge,function(wedge, index) {

            if (wedge._plot_type == 'tile' || wedge._plot_type == 'glyph') {
                var max_tile_level = wedge._tile_show_all_tiles ?
                    Math.floor((wedge._plot_height - (wedge._radius() * 4)) / (wedge._tile_height + wedge._tile_padding)) :
                    undefined;
                wedge._data = (wedge._plot_type == 'tile' ? vq.utils.VisUtils.layoutChrTiles(wedge._data, wedge._tile_overlap_distance, max_tile_level) :
                    vq.utils.VisUtils.layoutChrTicks(wedge._data, wedge._tile_overlap_distance, max_tile_level));
            }

            cnv_map = {};
             _.each(wedge._data, function(d) {
                if (cnv_map[d.chr] === undefined) { cnv_map[d.chr] = [];}
                    cnv_map[d.chr].push(d);
                });

            wedge._chr = {};
            _.each(that._chrom.keys, function(d) {
                wedge._chr[d] =  cnv_map[d] === undefined ? [] : _.extend(cnv_map[d],chrom_groups[d]);
            });
            wedge._outerRadius =
                (that._plot.height / 2) -
                    (vq.sum(that._wedge.slice(0, index), function(a) {
                        return a._plot_height;
                    }) + vq.sum(that._wedge.slice(0, index), function(a) {
                        return a._outer_padding;
                    })) - (that.ticks.outer_padding + that.ticks.height);

            wedge._outerPlotRadius = wedge._outerRadius - wedge._outer_padding;

            wedge._innerRadius = wedge._outerPlotRadius - wedge._plot_height;

            that._chrom.keys.forEach(function(d) {
                        that._ideograms[d]._outerRadius = (that._plot.height / 2) - (that.ticks.outer_padding + that.ticks.height);
                        that._ideograms[d].wedge[index] = wedge._chr[d]; //?
            });

            wedge.hovercard = vq.hovercard({
                                            canvas_id : that._plot.id,
                                            include_header : false,
                                            include_footer : true,
                                            self_hover : true,
                                            timeout : that._plot.tooltip_timeout,
                                            data_config : wedge._tooltipItems,
                                            tool_config : wedge._tooltipLinks
                                        });

            if(wedge._plot_type =='karyotype') { return;}

            var value_label = wedge._value_key;
            deviation = Math.sqrt(science.stats.variance(_.pluck(wedge._data,value_label)));
            median = science.stats.median(_.pluck(wedge._data,value_label));

            wedge._min_plotValue = (wedge._min_plotValue === undefined) ? parseFloat(((-1 * deviation) + median).toFixed(2)) : wedge._min_plotValue;
            wedge._max_plotValue = (wedge._max_plotValue === undefined) ? parseFloat((deviation + median).toFixed(2)) : wedge._max_plotValue;
            wedge._range_mean = wedge._base_plotValue != null ? wedge._base_plotValue : (wedge._min_plotValue + wedge._max_plotValue) / 2;
    wedge._y_linear = d3.scale.linear()
        .domain([wedge._min_plotValue, wedge._max_plotValue])
        .range([wedge._innerRadius,wedge._outerRadius - wedge._outer_padding]).nice();

    wedge._y_axis = d3.scale.linear().domain([wedge._min_plotValue, wedge._max_plotValue]).range([wedge._innerRadius,wedge._outerPlotRadius]);
    wedge._thresholded_innerRadius = function(d) { return Math.max(wedge._y_axis(Math.min(d,wedge._range_mean)),wedge._innerRadius); };
    wedge._thresholded_outerRadius = function(d) { return Math.min(wedge._y_axis(Math.max(d,wedge._range_mean)),wedge._outerPlotRadius); };
    wedge._thresholded_value_to_radius = function(d) { return Math.min(Math.max(wedge._y_axis(d),wedge._innerRadius),wedge._outerPlotRadius); };
    wedge._thresholded_radius = function(d) { return Math.min(Math.max(d,wedge._innerRadius),wedge._outerPlotRadius); };

    wedge._thresholded_tile_innerRadius = function(c,d) { return wedge._innerRadius + (d._tile.height + d._tile.padding) * c.level;};
    wedge._thresholded_tile_outerRadius = function(c,d) { return wedge._innerRadius + ((d._tile.height + d._tile.padding) * c.level) + d._tile.height;};
            if (wedge._plot_type == 'glyph') {
                wedge._glyph_distance = function(c,d) { return (((d._tile.height + d._tile.padding) * c.level)
                    + innerRadius + (d._radius() * 2));};
                wedge._checked_endAngle = function(feature,chr) {
                    if (that._chrom.keys.length == 1) {
                        return Math.min(that.startAngle_map[chr] + that.theta[chr](feature.end||feature.start+1),dataObj.startAngle_map[dataObj._chrom.keys[0]] + (Math.PI * 2));
                    }
                    else if (this.parent.index+1 == dataObj._chrom.keys.length) {
                        return Math.min(that.startAngle_map[chr] + that.theta[chr](feature.end||feature.start+1),dataObj.startAngle_map[dataObj._chrom.keys[0]] + (Math.PI * 2));
                    }
                    else {return Math.min(that.startAngle_map[chr] + that.theta[chr](feature.end||feature.start+1),
                        that.startAngle_map[that._chrom.keys[(this.parent.index+1)%that._chrom.keys.length]]);
                    }
                };
            }
            delete wedge._data;


        }); //foreach
    }
    //------------------- NETWORK DATA
    var nodes = {};
    _.each(that._chrom.keys, function(d) {
            nodes[d] = {};
    });
    var node_parent_map = {};
    var node_array = [{parent:null, chr:null, radius:0, angle:0,children:[]}];
    that._network.network_radius = {};
    chrom_keys_array.forEach(function(key,index) {
        var innerRadius = that._ideograms[key].wedge.length > 0 ? that._wedge[that._ideograms[key].wedge.length-1]._innerRadius :
                    (that._plot.height / 2) - that.ticks.outer_padding - that.ticks.height;
        var network_radius = that._network.network_radius[key] = innerRadius - that._network._outer_padding;
        node_parent_map[key] = index + 1;
        var node = {chr:key,parent:node_array[0],children:[],radius: network_radius / 2,
                angle : (that._chrom.groups[key].startAngle + that._chrom.groups[key].endAngle)/2};
        node_array[0].children.push(node);
        node_array.push(node);
    });
    
    var valid_chr = {};
    _.each(this._chrom.keys, function(a) { valid_chr[a] = {}; });
    var links_array = [];
    var length;
   var index1,index2;
    var node_key = this._network.node_key;
    if (this._network != undefined && this._network.data != undefined) {
        this._network.data.forEach(function(d) {
            index1 = null, node1_key = node_key(d.node1),
            index2 = null, node2_key = node_key(d.node2);
            if (valid_chr[d.node1.chr] === undefined || valid_chr[d.node2.chr] === undefined) return;
            if (nodes[node1_key] === undefined){
                        var temp_node = d.node1;
                        temp_node.nodeName = node1_key;
                        length = node_array.push(temp_node);
                        index1 = length - 1;
                        nodes[node1_key] = index1;
                    } else {
                        index1 = nodes[node1_key];
                    }
          if (nodes[node2_key] === undefined){
                        var temp_node = d.node2;
                        temp_node.nodeName = node2_key;
                        length = node_array.push(temp_node);
                        index2 = length - 1;
                        nodes[node2_key] = index2;
                    } else {
                        index2 = nodes[node2_key];
                    }

            if (index1 != null && index2 !=null) {
                //copy out useful properties
                var node = {source : index1, target : index2} ;
                for (var p in d) {
                    if (p != 'node1' && p!= 'node2') {
                        node[p] = d[p];
                    }
                }
                links_array.push(node);
            }
        });
        this._network.nodes_array = this._network.tile_nodes ?  vq.utils.VisUtils.layoutChrTiles(node_array,that._network.node_overlap_distance) : node_array;
        this._network.links_array = links_array;
        this._network.data = 'loaded';
        nodes = [];
        node_array = [];
        links_array = [];
        this._network.link_hovercard  =  vq.hovercard({
                            canvas_id : that._plot.id,
                            include_header : false,
                            include_footer : true,
                            self_hover : true,
                            timeout : that._plot.tooltip_timeout,
                            data_config : that._network.link_tooltipItems,
                            tool_config : that._network.link_tooltipLinks
                        });
        this._network.node_hovercard  =  vq.hovercard({
                                  canvas_id : that._plot.id,
                                  include_header : false,
                                  include_footer : true,
                                  self_hover : true,
                                  timeout : that._plot.tooltip_timeout,
                                  data_config : that._network.node_tooltipItems,
                                  tool_config : that._network.node_tooltipLinks
                              });
    }

//    Tick Data

    if (this.ticks != undefined && this.ticks._data_array != undefined && this.ticks._data_array != null) {
        if (that.ticks.overlap_distance === undefined) {
            var overlap_ratio = 7000000.0 / 3080419480;
            that.ticks.overlap_distance = overlap_ratio * totalChromLength;
        }
        var tick_array = that.ticks.tile_ticks ? vq.utils.VisUtils.layoutChrTicks(that.ticks._data_array, that.ticks.overlap_distance) :
            that.ticks._data_array;

        var ticks_map = {};
        _.each(tick_array,function(d) {
                ticks_map[d.chr] = d;
            });
            

        this.ticks.data_map = {};
        _.each(that._chrom.keys, function(d) {
            that.ticks.data_map[d] =  ticks_map[d] === undefined ? [] : ticks_map[d];
        });
        this.ticks._data_array = [];
        delete tick_array;
        ticks_map = [];

        this.ticks.hovercard =  vq.hovercard({
                    canvas_id : that._plot.id,
                    include_header : false,
                    include_footer : true,
                    self_hover : true,
                    timeout : that._plot.tooltip_timeout,
                    data_config : that.ticks.tooltipItems,
                    tool_config : that.ticks.tooltipLinks
                });

    }
    this.setDataReady(true);
};



/**
 *
 * @class Internal data model for ring plots.
 *
 * @param data {JSON Object} - Configures a single ring plot.
 * @extends vq.models.VisData
 */
vq.models.CircVisData.WedgeData = function(data) {

    vq.models.VisData.call(this, {CONTENTS:data});

    this.setDataModel();
    this._build_data(this.getContents())

};

vq.models.CircVisData.WedgeData.prototype = vq.extend(vq.models.VisData);

vq.models.CircVisData.WedgeData.prototype.setDataModel = function() {
    this._dataModel = [
        {label : '_data', id: 'DATA.data_array', defaultValue : [
            {"chr": "1", "end": 12784268, "start": 644269,
                "value": -0.058664}
        ]},
        {label : '_value_key', id: 'DATA.value_key', defaultValue : 'value',cast: String },
        {label : 'listener', id: 'OPTIONS.listener', defaultValue :  function(a, b) {
        } },
        {label : '_plot_type', id: 'PLOT.type', defaultValue : 'histogram' },
        {label : '_plot_height', id: 'PLOT.height', cast: Number, defaultValue : 100 },
        {label : '_fillStyle', id: 'OPTIONS.fill_style', cast : vq.utils.VisUtils.wrapProperty, defaultValue : function(d) {
            return 'red';
        } },
        {label : '_strokeStyle', id: 'OPTIONS.stroke_style', cast : vq.utils.VisUtils.wrapProperty, defaultValue : function(d) {
            return 'black';
        } },
         {label : '_lineWidth', id: 'OPTIONS.line_width', cast : Number, defaultValue : 0.5 },
        {label : '_shape', id: 'OPTIONS.shape', cast : vq.utils.VisUtils.wrapProperty, defaultValue : function(d) {
            return 'circle';
        } },
        {label : '_radius', id: 'OPTIONS.radius', cast : vq.utils.VisUtils.wrapProperty, defaultValue : function(d) {
            return 2;
        } },
        {label : '_outer_padding', id: 'OPTIONS.outer_padding', cast : Number, defaultValue : 1 },
        {label : '_min_plotValue', id: 'OPTIONS.min_value',  cast : Number , optional : true },
        {label : '_max_plotValue', id: 'OPTIONS.max_value',  cast : Number , optional : true },
        {label : '_base_plotValue', id: 'OPTIONS.base_value', cast: Number, optional : true },
        {label : '_legend_label', id: 'OPTIONS.legend_label', cast: String, defaultValue : '' },
        {label : '_legend_desc', id: 'OPTIONS.legend_description', cast: String, defaultValue : '' },
        {label : '_draw_axes', id: 'OPTIONS.draw_axes', cast: Boolean, defaultValue : true },
        {label : '_tooltipFormat', id: 'OPTIONS.tooltipFormat', cast :vq.utils.VisUtils.wrapProperty,
            defaultValue : function(c, d) {
                return "Chr " + d + "\nStart: " + c.start + "\nEnd: " + c.end;
            }   },
        {label : '_tooltipItems', id: 'OPTIONS.tooltip_items',  defaultValue : {Chr:'chr',Start:'start',End:'end',Value:'value'} },
        {label : '_tooltipLinks', id: 'OPTIONS.tooltip_links',  defaultValue : {} },
        {label : '_tile.padding', id: 'OPTIONS.tile_padding', cast: Number, defaultValue : 5 },
        {label : '_tile.overlap_distance', id: 'OPTIONS.tile_overlap_distance', cast: Number, defaultValue : 0.1 },
        {label : '_tile.height', id: 'OPTIONS.tile_height', cast: Number, defaultValue : 5 },
        {label : '_tile.show_all_tiles', id: 'OPTIONS.tile_show_all_tiles', cast: Boolean, defaultValue : false }
    ];
};

vq.models.CircVisData.WedgeData.prototype._build_data = function(data_struct) {
    this._processData(data_struct)
};
vq.CircVis.prototype.addEdges = function(edge_array) {
    if (_.isArray(edge_array)) {
        this._insertEdges(edge_array);
    }
    else {
        this._insertEdge(edge_array);
    }
};

vq.CircVis.prototype.addNodes = function(node_array) {
    if (_.isArray(node_array)) {
        this._insertNodes(node_array);
    }
    else {
        this._insertNode(node_array);
    }
};

vq.CircVis.prototype._insertNodes = function(node_array) {
    _.each(node_array, vq.CircVis.prototype._insertNode, this);
};

vq.CircVis.prototype._insertEdges = function(edge_array) {
    _.each(edge_array, vq.CircVis.prototype._insertEdge, this);
};

vq.CircVis.prototype.same_feature = function(n1,n2) {
         return this.chromoData._network.node_key(n1) ==  this.chromoData._network.node_key(n2);
     };

vq.CircVis.prototype.same_edge= function(link1,link2) {
    return this.same_feature(link1.source,link2.source) &&
        this.same_feature(link1.target,link2.target);
 };

vq.CircVis.prototype._insertEdge = function(edge) {
    var nodes = [edge.node1,edge.node2];
    var that = this;
    var edge_arr=[];

        _.each(nodes,function(node) {
               edge_arr.push(that._insertNode(node));
        }
    );
    if(_.any(edge_arr,function(a){return _.isNull(a);})) { console.log('Unmappable chromosome in edge.');}
    //list of keys that aren't node1,node2
    var keys = _.chain(edge).keys().reject(function(a){return a=='node1'|| a== 'node2';}).value();
    //append the source,target nodes
    var insert_edge = _.chain(edge).pick(keys).extend({source:edge_arr[0],target:edge_arr[1]}).value();

    //search for edge in current data
    if (_.any(that.chromoData._network.links_array,function(link) { return that.same_edge(insert_edge,link);})){     //old link
    }else {  //insert new edge
        that.chromoData._network.links_array.push(insert_edge);  //add it
        that._add_network_links(d3.select('g.links'));
    }
};


vq.CircVis.prototype._insertNode = function(node) {

    var that = this;
    var node_parent_map = {};

    _.chain(that.chromoData._network.nodes_array).first(that.chromoData._chrom.keys.length+1)
        .each(function(root,index){node_parent_map[root.chr]=index;});

                if (!_.include(_.keys(that.chromoData._chrom.groups),node.chr)) {return null;}
                //previously loaded this node, pull it from the node_array
            if ( _.any(that.chromoData._network.nodes_array,
                                        function(tick) { return that.same_feature(tick,node);})) {
                return _.find(that.chromoData._network.nodes_array,
                                    function(n) { return that.same_feature(n,node);});
            } else {
                vq.utils.VisUtils.layoutTile(node,that.chromoData.ticks.data_map[node.chr].length,
                    that.chromoData.ticks.data_map[node.chr],that.chromoData.ticks.overlap_distance);
                that.chromoData.ticks.data_map[node.chr].push(node);
                var parent = _.find(that.chromoData._network.nodes_array, function(n) { return n.chr == node.chr});
                var new_node = _.extend({parent:that.chromoData._network.nodes_array[node_parent_map[node.chr]]},node);
                parent.children.push(new_node);
                that.chromoData._network.nodes_array.push(new_node);
                that._add_ticks(node.chr);
                that._add_network_nodes(node.chr,true);
                that._add_wedge_data(node);
                return new_node;
            }
 };