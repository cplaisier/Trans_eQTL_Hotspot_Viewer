vq.ScatterPlot = function() {
    vq.Vis.call(this);
    // private variables

    this.height(300);     // defaults
    this.width(700);     // defaults
    this.vertical_padding(20);
    this.horizontal_padding(30);
    this.selectedProbesetId('');
};

vq.ScatterPlot.prototype = vq.extend(vq.Vis);

vq.ScatterPlot.prototype
        .property('selectedProbesetId');

// sets default variables based on the options
vq.ScatterPlot.prototype._setOptionDefaults = function(options) {
    // PUBLIC OPTIONS
    // padding
    if (options.selectedProbesetId) {
        this._selectedProbesetId = options.selectedProbesetId;
    }

    if (options.height != null) {
        this.height(options.height);
    }

    if (options.width != null) {
        this.width(options.width);
    }

    if (options.container != null) {
        this.container(options.container);
    }

    if (options.vertical_padding != null) {
        this.vertical_padding(options.vertical_padding);
    }

    if (options.horizontal_padding != null) {
        this.horizontal_padding(options.horizontal_padding);
    }
};

vq.ScatterPlot.prototype.onProbesetSelect = function(probesetId) {
    this.selectedProbesetId = probesetId;
};


vq.ScatterPlot.prototype.setRegression = function(obj) {
    this.data._regression = obj || 'none';
    this._render();
};

vq.ScatterPlot.prototype.draw = function(data) {
    var that = this;
    this.data = new vq.models.ScatterPlotData(data);

    if (!this.data.isDataReady()) { return;}

    this._setOptionDefaults(this.data);
    this._visHeight = this.height() - ( 2 * this.vertical_padding());
    this._visWidth = this.width() - ( 2 * this.horizontal_padding());

    var dataObj = this.data;

    var x = dataObj.COLUMNID.x;
    var y = dataObj.COLUMNID.y;

    this.x = x;
    this.y = y;

    this.horizontal_padding = dataObj.horizontal_padding;
    this.vertical_padding = dataObj.vertical_padding;

    var value = dataObj.COLUMNID.value;

    this.data_array = dataObj.data;
    var minX = this.data_array.reduce(function(previous, current) {
        return (current[x] != null) && current[x] < previous ? current[x] : previous;
    }, 999999);
    var maxX = this.data_array.reduce(function(previous, current) {
        return (current[x] != null) && current[x] > previous ? current[x] : previous;
    }, -999999);
    var minY = this.data_array.reduce(function(previous, current) {
        return (current[y] != null) && current[y] < previous ? current[y] : previous;
    }, 999999);
    var maxY = this.data_array.reduce(function(previous, current) {
        return (current[y] != null) && current[y] > previous ? current[y] : previous;
    }, -999999);

    //expand plot around highest/lowest values
    var showMinX = minX - (Math.abs(maxX - minX) * 0.03);
    var showMaxX = maxX + (Math.abs(maxX - minX) * 0.03);
    var showMinY = minY - (Math.abs(maxY - minY) * 0.03);
    var showMaxY = maxY + (Math.abs(maxY - minY) * 0.03);

    // Start D3.js code
    this.xScale = d3.scale.linear().domain([showMinX, showMaxX]).range([0, this.width()]);
    this.yScale = d3.scale.linear().domain([showMinY, showMaxY]).range([this.height(), 0]);

    // Regression line
    var regress = dataObj._regression;

    if (regress=='linear') {
        var valid_data = this.data_array.filter(function(d, e, f) {
                return (d[y] && d[x]);
            }),
            sum_x = d3.sum(valid_data, function(d) {
                return d[x];
            }),
            sum_y = d3.sum(valid_data, function(d) {
                return d[y];
            }),
            sum_x2 = d3.sum(valid_data, function(d) {
                return d[x] * d[x];
            }),
            sum_xy = d3.sum(valid_data, function(d) {
                return d[x] * d[y];
            }),
            slope = ((valid_data.length * sum_xy) - (sum_x * sum_y)) / ((valid_data.length * sum_x2) - (sum_x * sum_x));

        var intercept = (sum_y - slope * sum_x) / valid_data.length;
    }

    var line_minX = showMinX * 0.95;
    var line_maxX = showMaxX * 1.05;
    var line_maxY = slope * line_maxX + intercept;
    var line_minY = slope * line_minX + intercept;

    var lineArray = d3.scale.linear().domain([line_minX, line_maxX]).range([line_minY, line_maxY]);

    this.regressData = {
        type: regress,
        minX: line_minX,
        maxX: line_maxX,
        scale: lineArray
    };

    this.vis = d3.select(this.container())
        .append("svg")
        .attr("width", this.width() + 2 * this.horizontal_padding)
        .attr("height", this.height() + 2 * this.vertical_padding);

    this.data_g = this.vis
        .append("g")
        .attr("transform", "translate(" + this.horizontal_padding + "," + this.vertical_padding + ")")
        .attr("width", this.width())
        .attr("height", this.height());

    // Rectangle around the scale lines.
    // Also used for zoom mouse events.
    this.data_rect = this.data_g
        .append("rect")
        .attr("class", "data-rect")
        .attr("width", this.width())
        .attr("height", this.height())
        .attr("pointer-events", "all");

    // Add the Y-axis label
    this.data_g.append("g")
        .append("text")
        .attr("class", "axis")
        .text(dataObj.COLUMNLABEL.y)
        .style("text-anchor", "middle")
        .attr("transform", "translate(" + (-this.horizontal_padding / 2) + "," + this.height() / 2 +") rotate(-90)");

    // Add the X-axis label
    this.data_g.append("text")
        .attr("class", "axis")
        .text(dataObj.COLUMNLABEL.x)
        .attr("x", this.width() / 2)
        .attr("y", this.height() + this.vertical_padding / 2)
        .style("text-anchor", "middle");

    // Clipping container for data points and regression line
    var sym = this.data_g.append("svg")
        .attr("left", 0)
        .attr("top", 0)
        .attr("width", this.width())
        .attr("height", this.height())
        .attr("viewBox", "0 0 " + this.width() + " " + this.height())
        .attr("class", "symbols");

    sym.append("line")
        .attr("class", "regression");

    this.brush = d3.svg.brush();

    this._render();
};

vq.ScatterPlot.prototype._render = function() {
    var that = this;

    // Y-axis ticks
    var y_trans = function(d) {
        return "translate(0," + that.yScale(d) + ")";
    };

    var y_ticks = this.data_g.selectAll("g.y-tick")
        .data(this.yScale.ticks(10), String)
        .attr("transform", y_trans);

    var y_ticks_enter = y_ticks.enter().insert("g", "a")
        .attr("class", "y-tick")
        .attr("transform", y_trans);

    y_ticks_enter.append("line")
        .attr("x1", 0)
        .attr("x2", this.width())
        .attr("stroke", "#ccc");

    y_ticks_enter.append("text")
        .attr("class", "axis")
        .attr("x", -5)
        .attr("text-anchor", "end")
        .text(d3.format("3.2f"));

    y_ticks.exit().remove();

    // X-axis ticks
    var x_trans = function(d) {
        return "translate(" + that.xScale(d) + ",0)";
    };

    var x_ticks = this.data_g.selectAll("g.x-tick")
        .data(this.xScale.ticks(10))
        .attr("transform", x_trans);

    var x_ticks_enter = x_ticks.enter().insert("g", "a")
        .attr("class", "x-tick")
        .attr("transform", x_trans);

    x_ticks_enter.append("line")
        .attr("y1", 0)
        .attr("y2", this.height())
        .attr("stroke", "#ccc");

    x_ticks_enter.append("text")
        .attr("class", "axis")
        .attr("y", this.height())
        .attr("dy", ".71em")
        .attr("text-anchor", "middle")
        .text(d3.format("3.2f"));

    x_ticks.exit().remove();

    that.drawData();
};

vq.ScatterPlot.prototype.drawData = function() {
    var that = this;
    var data_array = this.data.data;

    // Dots
    var dots = this.data_g.select("svg.symbols")
        .selectAll("circle")
        .data(data_array);

    dots.enter().append("circle")
        .attr("class", "fg")
        .attr("cx", function(d) {return that.xScale(d[that.x])})
        .attr("cy", function(d) {return that.yScale(d[that.y])})
        .attr("r", 2);

    // Adjust positions on zoom
    dots.attr("cx", function(d) {return that.xScale(d[that.x])})
        .attr("cy", function(d) {return that.yScale(d[that.y])});

    dots.exit().remove();

    // Adjust regression line on zoom
    if (this.regressData.type == 'linear') {
        var rd = that.regressData;

        this.data_g.select("svg.symbols")
            .select("line.regression")
            .attr("x1", that.xScale(rd.minX))
            .attr("y1", that.yScale(rd.scale(rd.minX)))
            .attr("x2", that.xScale(rd.maxX))
            .attr("y2", that.yScale(rd.scale(rd.maxX)));
    }
};

vq.ScatterPlot.prototype.resetData = function(d) {
    this.data.data = d;
    this.drawData();
};

vq.ScatterPlot.prototype.removeListeners = function() {
    this.data_rect
        .on("mousedown.zoom", null)
        .on("mousewheel.zoom", null)
        .on("mousemove.zoom", null)
        .on("DOMMouseScroll.zoom", null)
        .on("dblclick.zoom", null)
        .on("touchstart.zoom", null)
        .on("touchmove.zoom", null)
        .on("touchend.zoom", null);
};

vq.ScatterPlot.prototype.enableZoom = function() {
    var that = this;
    this.removeListeners();

    this.data_g.select("g.plot_brush").remove();
    this.data_g.select("svg.symbols").selectAll("circle")
        .attr("class", "fg");

    this.data_rect.call(d3.behavior.zoom().x(this.xScale).y(this.yScale).on("zoom", function(){
        _.bind(that._render, that)();
    }));
};

vq.ScatterPlot.prototype.enableBrush = function() {
    this.removeListeners();

    this.brush
        .x(this.xScale)
        .y(this.yScale)
        .on("brush", _.bind(this.brushHandler, this))
        .on("brushend", _.bind(this.brushEnd, this));

    this.data_g.append("g")
        .attr("class", "plot_brush")
        .call(this.brush);
};

vq.ScatterPlot.prototype.brushHandler = function() {
    var that = this;
    var e = this.brush.extent();

    this.data_g.select("svg.symbols").selectAll("circle")
        .attr("class", function(d) {
            return e[0][0] <= d[that.x] && d[that.x] <= e[1][0]
                && e[0][1] <= d[that.y] && d[that.y] <= e[1][1]
                ? "fg" : "bg";
        });
};

vq.ScatterPlot.prototype.brushEnd = function() {
    if (this.brush.empty()) {
        this.data_g.select("svg.dots").selectAll("circle")
            .attr("class", "fg");
    }
};

vq.models.ScatterPlotData = function(data) {
    vq.models.VisData.call(this, data);
    this.setDataModel();
    if (this.getDataType() == 'vq.models.ScatterPlotData') {
        this._build_data(this.getContents());
    } else {
        console.warn('Unrecognized JSON object.  Expected vq.models.ScatterPlotData object.');
    }
};

vq.models.ScatterPlotData.prototype = vq.extend(vq.models.VisData);

vq.models.ScatterPlotData.prototype.setDataModel = function () {
    this._dataModel = [
        {label: 'width', id: 'PLOT.width', cast : Number, defaultValue: 400},
        {label: 'height', id: 'PLOT.height', cast : Number, defaultValue: 300},
        {label : 'container', id:'PLOT.container', optional : true},
        {label:  'vertical_padding', id: 'PLOT.vertical_padding', cast : Number, defaultValue: 20},
        {label:  'horizontal_padding', id: 'PLOT.horizontal_padding',cast : Number,  defaultValue:30},
        {label : 'data', id: 'data_array', defaultValue : [] },
        {label : 'COLUMNID.x', id: 'xcolumnid',cast : String, defaultValue : 'X'},
        {label : 'COLUMNID.y', id: 'ycolumnid',cast : String, defaultValue : 'Y'},
        {label : 'COLUMNID.value', id: 'valuecolumnid',cast : String, defaultValue : 'VALUE'},
        {label : 'COLUMNLABEL.x', id: 'xcolumnlabel',cast : String, defaultValue : ''},
        {label : 'COLUMNLABEL.y', id: 'ycolumnlabel',cast : String, defaultValue : ''},
        {label : 'COLUMNLABEL.value', id: 'valuecolumnlabel',cast : String, defaultValue : ''},
        {label : 'COLUMNLABEL.value', id: 'valuecolumnlabel',cast : String, defaultValue : ''},
        {label : 'tooltipItems', id: 'tooltip_items', defaultValue : {
            X : 'X', Y : 'Y', Value : 'VALUE'            }  },
        {label : '_fillStyle', id: 'fill_style',cast :vq.utils.VisUtils.wrapProperty,
            defaultValue : function() {
                return pv.color('steelblue').alpha(0.2);
            }},
        {label : '_strokeStyle', id: 'stroke_style',
            cast :vq.utils.VisUtils.wrapProperty, defaultValue : function() {
            return 'steelblue';
        }},
        {label : '_radius', id: 'radius',cast :vq.utils.VisUtils.wrapProperty, defaultValue : function() {
            return 2;
        }},
        {label : '_shape', id: 'shape',cast : vq.utils.VisUtils.wrapProperty, defaultValue : function() {
            return 'dot';
        }},
        {label : '_regression', id: 'regression',cast :String, defaultValue : 'none'},
        {label : '_notifier', id: 'notifier', cast : Function, defaultValue : function() {
            return null;
        }}
    ];
};

vq.models.ScatterPlotData.prototype._build_data = function(data) {
    this._processData(data);

    if (this.COLUMNLABEL.x == '') this.COLUMNLABEL.x = this.COLUMNID.x;
    if (this.COLUMNLABEL.y == '') this.COLUMNLABEL.y = this.COLUMNID.y;
    if (this.COLUMNLABEL.value == '') this.COLUMNLABEL.value = this.COLUMNID.value;

    if (this.data.length > 0) this.setDataReady(true);
};
