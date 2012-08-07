(function() {

    var width=1200,
        height=1200,
        cnv_ring_height = 60,
        color_scale =    { 'GEXP': '#1f77b4',
            //blue
            'METH': '#2ca02c',
            //green
            'CNVR': '#ff7f0e',
            //orange
            'MIRN': '#9467bd',
            //purple
            'GNAB': '#d62728',
            //red
            'PRDM': '#8c564b',
            //pink
            'RPPA': '#e377c2',
            //brown
            'CLIN': '#aa4444',
            'SAMP': '#bcbd22',
            'other' : '#17becf'
        };

        function feature_type(feature) { return feature && feature.label && !!~feature.label.indexOf(':') ? 
                    feature.label.split(':')[1] : 'other';}
        function clin_type(feature) { return feature && feature.clin_alias && !!~feature.clin_alias.indexOf(':')?
        feature.clin_alias.split(':')[1] : 'other';}
        
        var shape_map ={'CLIN':'square','SAMP':'cross','other':'diamond'};
        function shape(type) { return shape_map[type];}
        function clinical_shape(feature) { return shape(clin_type(feature));}
        function edge_color(edge) { ;}

    var tick_colors = function(data) {       
        return type_color(feature_type(data));
    };

    var type_color = function(type) {
        return color_scale[type] || color_scale['other'];
    };

    var label_map = {'METH' : 'DNA Methylation',
        'CNVR': 'Copy Number Variation Region',
        'MIRN' :'mircoRNA',
        'GNAB' : 'Gene Abberation',
        'GEXP': 'Gene Expression',
        'CLIN': 'Clinical Data',
        'SAMP': 'Tumor Sample'
    };

    var hovercard_items_config = {Feature: 'label',
        Location: function(feature) { return 'Chr ' + feature.chr + ' ' + feature.start + (feature.end ? '-' + feature.end : '');}
	};


    var links = [
        {
            label: 'UCSC Genome Browser',
            key: 'ucsc',
            url: 'http://genome.ucsc.edu/cgi-bin/hgTracks',
            uri: '?db=hg18&position=chr',
            href: function(feature) {
                return 'http://genome.ucsc.edu/cgi-bin/hgTracks?db=hg18&position=chr' + feature.chr + ':' + feature.start + (feature.end == '' ? '' : '-' + feature.end);
            }
        }, //ucsc_genome_browser
        {
            label: 'Ensembl',
            key: 'ensembl',
            url: 'http://uswest.ensembl.org/Homo_sapiens/Location/View',
            uri: '?r=',
            href: function(feature) {
                return 'http://uswest.ensembl.org/Homo_sapiens/Location/View?r=' + feature.chr + ':' + feature.start + (feature.end == '' ? '' : '-' + feature.end);
            }
        }, //ensemble
        {
            label: 'Cosmic',
            key: 'cosmic',
            url: 'http://www.sanger.ac.uk/perl/genetics/CGP/cosmic',
            uri: '?action=bygene&ln=',
            href: function(feature) {
                return _.include(['CNVR', 'MIRN','METH'],feature.source) ? 'http://www.sanger.ac.uk/perl/genetics/CGP/cosmic?action=bygene&ln=' + feature.label.split(':')[2] : null;
            }
        },
        {
            label: 'miRBase',
            key: 'mirbase',
            url: 'http://mirbase.org/cgi-bin/query.pl',
            uri: '?terms=',
            href: function(feature) {
                return feature.source == 'MIRN' ? 'http://www.mirbase.org/cgi-bin/query.pl?terms=' + feature.label.split(':')[2] : null;
            }
        }
    ];

    var hovercard_links_config = {};

    _.each(links, function(item){hovercard_links_config[item.label]=item;});
    var data = function(div) { return {
        PLOT: {
            container: div,
            width : width,
            height: height,
            vertical_padding : 10,
            horizontal_padding: 10,
            enable_pan : false,
            enable_zoom : false,
            show_legend: true,
            legend_corner : 'ne',
            legend_radius  : 45
        },

        GENOME: {
            DATA:{
                key_order : chrom_keys,
                key_length :_.map(chrom_keys, function(key) {return {chr_name:key, chr_length:chrom_attr[key].length};})
            },
            OPTIONS: {
                radial_grid_line_width : 2,
                label_layout_style:'clock',
                label_font_style:'16px helvetica',
                gap_degrees : 2
            }
        },

        WEDGE:[
            {
                PLOT : {
                    height : 35,
                    type : 'karyotype'
                } ,
                DATA:{
                    data_array : cytoband
                },
                OPTIONS: {

                    legend_label : 'Cytogenic Bands',
                    legend_description : 'Cytogenic Bands',
                    listener : function() {return null;},
                    outer_padding: 15,
                    stroke_style:'rgba(200,200,200,0.5)',
                    line_width:'0.5px',
                    tooltip_items:{'Cytogenic Band':'label',
                        "Location": function(feature) { return 'Chr ' + feature.chr + ' ' + feature.start + (feature.end ? '-' + feature.end : '');}
                    }
                }
            },
            {
                PLOT : {

                    height : 120,
                    type : 'scatterplot'
                },
                DATA:{
                    data_array : eqtl_density, //link_density,
                    value_key : 'value'
                },
                OPTIONS: {
                    legend_label : 'eQTL Density',
                    legend_description : 'eQTL Density',
                    min_value : 2388,
                    max_value : 0,
                    base_value : 0,
                    radius : 2,
                    outer_padding: 10,
                    stroke_style : 'red',
                    line_width:2,
                    tooltip_items: hovercard_items_config,
                    tooltip_links: hovercard_links_config,
                    fill_style: 'red',
                    listener : function() {return null;}
                }
            }/*,
            {
                PLOT : {

                    height : 30,
                    type : 'scatterplot'
                },
                DATA:{
                    data_array : eqtl_density_adipose, //link_density,
                    value_key : 'value'
                },
                OPTIONS: {
                    legend_label : 'eQTL Density',
                    legend_description : 'eQTL Density',
                    min_value : 793,
                    max_value : 0,
                    base_value : 0,
                    radius : 2,
                    outer_padding: 0,
                    stroke_style : 'blue',
                    line_width:2,
                    tooltip_items: hovercard_items_config,
                    tooltip_links: hovercard_links_config,
                    fill_style: 'blue',
                    listener : function() {return null;}
                }
            },
            {
                PLOT : {

                    height : 30,
                    type : 'scatterplot'
                },
                DATA:{
                    data_array : eqtl_density_liver, //link_density,
                    value_key : 'value'
                },
                OPTIONS: {
                    legend_label : 'eQTL Density',
                    legend_description : 'eQTL Density',
                    min_value : 2255,
                    max_value : 0,
                    base_value : 0,
                    radius : 2,
                    outer_padding: 0,
                    stroke_style : 'green',
                    line_width:2,
                    tooltip_items: hovercard_items_config,
                    tooltip_links: hovercard_links_config,
                    fill_style: 'green',
                    listener : function() {return null;}
                }
            },
            {
                PLOT : {

                    height : 30,
                    type : 'scatterplot'
                },
                DATA:{
                    data_array : eqtl_density_gastroc, //link_density,
                    value_key : 'value'
                },
                OPTIONS: {
                    legend_label : 'eQTL Density',
                    legend_description : 'eQTL Density',
                    min_value : 1015,
                    max_value : 0,
                    base_value : 0,
                    radius : 2,
                    outer_padding: 0,
                    stroke_style : '#663300',
                    line_width:2,
                    tooltip_items: hovercard_items_config,
                    tooltip_links: hovercard_links_config,
                    fill_style: '#663300',
                    listener : function() {return null;}
                }
            },
            {
                PLOT : {

                    height : 30,
                    type : 'scatterplot'
                },
                DATA:{
                    data_array : eqtl_density_kidney, //link_density,
                    value_key : 'value'
                },
                OPTIONS: {
                    legend_label : 'eQTL Density',
                    legend_description : 'eQTL Density',
                    min_value : 2157,
                    max_value : 0,
                    base_value : 0,
                    radius : 2,
                    outer_padding: 0,
                    stroke_style : 'orange',
                    line_width:2,
                    tooltip_items: hovercard_items_config,
                    tooltip_links: hovercard_links_config,
                    fill_style: 'orange',
                    listener : function() {return null;}
                }
            },
            {
                PLOT : {

                    height : 30,
                    type : 'scatterplot'
                },
                DATA:{
                    data_array : eqtl_density_hypo, //link_density,
                    value_key : 'value'
                },
                OPTIONS: {
                    legend_label : 'eQTL Density',
                    legend_description : 'eQTL Density',
                    min_value : 1006,
                    max_value : 0,
                    base_value : 0,
                    radius : 2,
                    outer_padding: 0,
                    stroke_style : 'purple',
                    line_width:2,
                    tooltip_items: hovercard_items_config,
                    tooltip_links: hovercard_links_config,
                    fill_style: 'purple',
                    listener : function() {return null;}
                }
            }*/    
        ],

        TICKS : {
            DATA: {
                data_array:[]
            },
            OPTIONS : {
                wedge_height: 15,
                wedge_width: 0.7,
                overlap_distance:10000000, //tile ticks at specified base pair distance
                height : 60,
                display_legend : true,
                legend_corner : 'nw',
                fill_style : tick_colors,
                tooltip_items: hovercard_items_config,
                tooltip_links: hovercard_links_config
            }
        },

        NETWORK:{
            DATA:{
                data_array : network
            },
            OPTIONS: {
                outer_padding : 10,
                tile_nodes : Boolean(false),
                node_overlap_distance: 3e8,
                node_radius:0,
                node_fill_style : tick_colors,
                link_stroke_style : function(link) {  if(link.overlapping1==1) { return '#FF0000' } else if(!(link.motif_match_pvalue1=="NA")) { return 'green' } else if(!(link.causality_pvalue1=="NA")) { return 'blue' } else { return '#cccccc'};},
                link_line_width: function(link) {  if(link.overlapping1==1) { return 2 } else { return 1 };},
                link_alpha : 0.6,
                node_highlight_mode : 'isolate',
                node_key : function(node) { return node.label;},
                node_tooltip_items :  hovercard_items_config,
                node_tooltip_links: hovercard_links_config,
                link_tooltip_items :  {
                    'Trans-eQTL Hotspot' : function(link) { return ''+link.target.label.split('.')[0]; }, // function(link) { return 'eQTL HotSpot' + link.target.label },
                    'Putative Regulator': 'target.putative_tf',
                    'Hotspot Location' : function(link) { return 'Chr ' + link.target.chr + ' ' + link.target.start +
                        (link.target.end ? '-' + link.target.end : '');},
		    'Motif Match pvalue':    "motif_match_pvalue1",
	            'Causality pvalue': "causality_pvalue1",
                    'Target': 'source.gene_symbol',
                    'Target Probe' : 'source.label',
                    'Target Entrez': function(link) { return '<a href=\'http://www.ncbi.nlm.nih.gov/gene?term='+link.source.entrez+'\' target=\'_blank\'>'+link.source.entrez+'</a>';},
                    'Target Location' : function(link) { return 'Chr ' + link.source.chr + ' ' + link.source.start +
                        (link.source.end ? '-' + link.source.end : '');}
                }
            }
        }
    };
    };

    circvis = {};
    circvis.plot = function(div) {
        var circle_vis = new vq.CircVis();
        var dataObject ={DATATYPE : "vq.models.CircVisData", CONTENTS : data(div) };
        circle_vis.draw(dataObject);
        return circle_vis;
    }

})();
