#################################################################
# @Program: circvis                                             #
# @Version: 1                                                   #
# @Author: Chris Plaisier                                       #
# @Sponsored by:                                                #
# Nitin Baliga, ISB                                             #
# Institute for Systems Biology                                 #
# 401 Terry Ave North                                           #
# Seattle, Washington  98109-5234                               #
# (216) 732-2139                                                #
# @Also Sponsored by:                                           #
# Luxembourg Systems Biology Grant                              #
#                                                               #
# If this program is used in your analysis please mention who   #
# built it. Thanks. :-)                                         #
#                                                               #
# Copyright (C) 2010 by Institute for Systems Biology,          #
# Seattle, Washington, USA.  All rights reserved.               #
#                                                               #
# This source code is distributed under the GNU Lesser          #
# General Public License, the text of which is available at:    #
#   http://www.gnu.org/copyleft/lesser.html                     #
#################################################################

from mod_python import apache
from mod_python import util

# display results
def network(req):
    network = str(req.form.getfirst('network',''))
    tissue = network.split('_')[0]
    names = [
        
        'adipose_1',
        'adipose_2',
        'adipose_3',
        'adipose_4',
        'adipose_5',
        'adipose_6',
        'adipose_7',
        'gastroc_1',
        'hypothalamus_1',
        'islet_1',
        'islet_2',
        'islet_3',
        'islet_4',
        'islet_5',
        'islet_6',
        'islet_7',
        'islet_8',
        'islet_9',
        'islet_10',
        'islet_11',
        'islet_12',
        'islet_13',
        'islet_14',
        'kidney_1',
        'kidney_2',
        'kidney_3',
        'liver_1',
        'liver_2'
    ]
    hotspots = {
        'islet_1': 'Islet 1 (Chr 6 @ 91 cM)',
        'islet_2': 'Islet 2 (Chr 2 @ 74 cM)',
        'islet_3': 'Islet 3 (Chr 17 @ 13 cM)',
        'islet_4': 'Islet 4 (Chr 2 @ 81 cM)',
        'islet_5': 'Islet 5 (Chr 2 @ 64 cM)',
        'islet_6': 'Islet 6 (Chr 12 @ 11 cM)',
        'islet_7': 'Islet 7 (Chr 2 @ 69 cM)',
        'islet_8': 'Islet 8 (Chr 2 @ 87 cM)',
        'islet_9': 'Islet 9 (Chr 7 @ 7 cM)',
        'islet_10': 'Islet 10 (Chr 6 @ 96 cM)',
        'islet_11': 'Islet 11 (Chr 13 @ 66 cM)',
        'islet_12': 'Islet 12 (Chr 19 @ 47 cM)',
        'islet_13': 'Islet 13 (Chr 17 @ 20 cM)',
        'islet_14': 'Islet 14 (Chr 12 @ 21 cM)',
        'adipose_1': 'Adipose 1 (Chr 10 @ 50 cM)',
        'adipose_2': 'Adipose 2 (Chr 17 @ 13 cM)',
        'adipose_3': 'Adipose 3 (Chr 4 @ 83 cM)',
        'adipose_4': 'Adipose 4 (Chr 9 @ 56 cM)',
        'adipose_5': 'Adipose 5 (Chr 1 @ 61 cM)',
        'adipose_6': 'Adipose 6 (Chr 1 @ 41 cM)',
        'adipose_7': 'Adipose 7 (Chr 1 @ 87 cM)',
        'liver_1': 'Liver 1 (Chr 2 @ 53 cM)',
        'liver_2': 'Liver 2 (Chr 17 @ 13 cM)',
        'gastroc_1': 'Gastrocnemius 1 (Chr 17 @ 10 cM)',
        'kidney_1': 'Kidney 1 (Chr 17 @ 10 cM)',
        'kidney_2': 'Kidney 2 (Chr 17 @ 15 cM)',
        'kidney_3': 'Kidney 3 (Chr 1 @ 60 cM)',
        'hypothalamus_1': 'Hypothalamus 1 (Chr 1 @ 81 cM)'
    }
    colors = {
        'adipose': '#ff0000',
        'gastroc': '#ff6600',
        'hypothalamus': '#ffff00',
        'islet': '#00ff00',
        'kidney': '#0000ff',
        'liver': '#ff00ff'
    }
    # Gene Name, AME corrected p-value
    putativeRegulators = {
        'islet_1': ['Sox5', 0.070],
        'islet_2': ['Foxa2', 0.12],
        'islet_3': ['Sox8', 0.38],
        'islet_4': ['Tgif2', 0.11],
        'islet_5': ['NA', 'NA'],
        'islet_6': ['E2f6', 0.078],
        'islet_7': ['NA', 'NA'],
        'islet_8': ['Nfatc2', 0.01],
        'islet_9': ['Foxa3', 0.16],
        'islet_10': ['Sox5', 0.41],
        'islet_11': ['Isl1', 0.043],
        'islet_12': ['NA', 'NA'],
        'islet_13': ['Runx2', 0.25],
        'islet_14': ['Sox11', 0.0032],
        'adipose_1': ['NA', 'NA'],
        'adipose_2': ['Pknox1', 0.099],
        'adipose_3': ['NA', 'NA'],
        'adipose_4': ['NA', 'NA'],
        'adipose_5': ['Sox13', 0.25],
        'adipose_6': ['NA', 'NA'],
        'adipose_7': ['NA', 'NA'],
        'liver_1': ['NA', 'NA'],
        'liver_2': ['NA', 'NA'],
        'gastroc_1': ['E4f1', 0.71],
        'kidney_1': ['E4f1', 0.84],
        'kidney_2': ['Pknox1', 0.076],
        'kidney_3': ['Sox13', 0.043],
        'hypothalamus_1': ['NA', 'NA'],
    }
    # Number of Trans-eQTLs, with sequence, matching motif, causal, overlapping
    numberOfeQTLs = {
        'islet_1': [2388, 624, 227, 234, 19],
        'islet_2': [1735, 1061, 660, 122, 65],
        'islet_3': [1106, 780, 223, 4, 1],
        'islet_4': [965, 522, 211, 4, 1],
        'islet_5': [892, 'NA', 'NA', 'NA', 'NA'],
        'islet_6': [807, 422, 199, 307, 62],
        'islet_7': [641, 'NA', 'NA', 'NA', 'NA'],
        'islet_8': [593, 258, 225, 281, 84],
        'islet_9': [573, 344, 307, 99, 52],
        'islet_10': [499, 135, 120, 21, 11],
        'islet_11': [476, 360, 115, 120, 31],
        'islet_12': [472, 'NA', 'NA', 'NA', 'NA'],
        'islet_13': [468, 296, 131, 308, 89],
        'islet_14': [432, 210, 201, 9, 3],
        'adipose_1': [793, 'NA', 'NA', 'NA', 'NA'],
        'adipose_2': [784, 502, 145, 9, 1],
        'adipose_3': [567, 'NA', 'NA', 'NA', 'NA'],
        'adipose_4': [553, 'NA', 'NA', 'NA', 'NA'],
        'adipose_5': [517, 307, 243, 94, 45],
        'adipose_6': [495, 'NA', 'NA', 'NA', 'NA'],
        'adipose_7': [464, 'NA', 'NA', 'NA', 'NA'],
        'liver_1': [2255, 'NA', 'NA', 'NA', 'NA'],
        'liver_2': [1016, 'NA', 'NA', 'NA', 'NA'],
        'gastroc_1': [1015, 498, 44, 153, 7],
        'kidney_1': [2157, 1408, 50, 433, 9],
        'kidney_2': [907, 565, 180, 78, 21],
        'kidney_3': [515, 325, 244, 110, 65],
        'hypothalamus_1': [1006, 'NA', 'NA', 'NA', 'NA']
    }
    html1 =  '<html>\n'
    html1 += '<head>\n'
    html1 += '\t<meta http-equiv="PRAGMA" content="NO-CACHE">\n'
    html1 += '\t<title>Attie Lab Trans-eQTL Maps</title>\n'
    html1 += '\t<!-- Font Awesome - http://fortawesome.github.com/Font-Awesome -->\n'
    html1 += '\t<link rel="stylesheet" href="../assets/css/font-awesome.css">\n'
    html1 += '\t<link href="../assets/css/vq.css" type="text/css" rel="stylesheet" />\n'
    html1 += '\t<script type="text/javascript">\n'
    html1 += '\t\tdensityColor = \''+str(colors[tissue])+'\';\n'
    html1 += '\t</script>\n'
    html1 += '\t<script type="text/javascript" src="../lib/d3/d3.v2.min.js"></script>\n'
    html1 += '\t<script src="../js/jquery.min.js" type="text/javascript"></script>\n'
    html1 += '\t<script type="text/javascript" src="../lib/underscore/underscore.js"></script>\n'
    html1 += '\t<script type="text/javascript" src="../lib/vq/vq.js"></script>\n'
    html1 += '\t<script type="text/javascript" src="../lib/vq/vq.circvis.js"></script>\n'
    html1 += '\t<!-- <script type="text/javascript" src="../data/circvis_data.json"></script> -->\n'
    html1 += '\t<script type="text/javascript" src="../data/eQTL_density/eQTL_density_'+tissue+'.json"></script>\n'
    html1 += '\t<script type="text/javascript" src="../data/trans_eQTL_hotspots/'+network+'_network.json"></script>\n'
    html1 += '\t<script type="text/javascript" src="../data/chromInfo.json"></script>\n'
    html1 += '\t<script type="text/javascript" src="../data/cytoband.mm9.json"></script>\n'
    html1 += '\t<script type="text/javascript" src="../js/circvis_configure.js"></script>\n\n'
    html1 += '\t<!--[if lt IE 9]>\n'
    html1 += '\t<script src="http://html5shim.googlecode.com/svn/trunk/html5.js"></script>\n'
    html1 += '\t<![endif]-->\n\n'
    html1 += '\t<!--[if IE 7]>\n'
    html1 += '\t<link rel="stylesheet" href="../assets/css/font-awesome-ie7.css">\n'
    html1 += '\t<![endif]-->\n'
    html1 += '\t<style>\n'
    html1 += '\t\tbody { font-family: arial, sans-serif; }\n'
    #html1 += '\t\ttable.info { border: 1px solid black; }\n'
    html1 += '\t\ttd.head { text-align: center; background-color: #cccccc; border: 1px solid black; -moz-border-radius: 8px; -webkit-border-radius: 8px; }\n'
    html1 += '\t\ttd.body { text-align: center; border: 1px solid black;  -moz-border-radius: 8px; -webkit-border-radius: 8px; }\n' #background-color: #333333; color: #ffffff; border: 1px solid black; }\n'
    html1 += '\t\ttd.form { text-align: center; border: 1px solid black; background-color: #cccccc;  -moz-border-radius: 8px; -webkit-border-radius: 8px; }\n' #background-color: #333333; color: #ffffff; border: 1px solid black; }\n'
    html1 += '\t</style>\n'
    html1 += '</head>\n'
    html1 += '<body>\n\n'
    html1 += '<center><h2>eQTL Hotspot '+hotspots[network]+'</h2></center>\n'
    html1 += '<center><table><tr><td class=\'form\'><center><form action=\'network\' method=\'get\'>\n'
    html1 += '\t<b>Trans-eQTL Hotspots:</b></br> <select name=\'network\'>\n'
    for hotspot in names:
        selected = ''
        if hotspot==network:
            selected = ' selected'
        html1 += '<option value=\''+hotspot+'\''+selected+'>'+hotspots[hotspot]+'</option>'
    html1 += '\t</select></br>'
    html1 += ' <input type=\'submit\' value=\'Change Hotspot\'>'
    html1 += '</form></td><td>\n'
    html1 += '<table cellpadding=4 class=\'info\'><tr><td class=\'head\'><b>Putative Regulator:</b></td><td class=\'body\'><b><font color=\'#CC0000\'>'+putativeRegulators[network][0]+'</font></b></td></tr>\n'
    html1 += '<tr><td class=\'head\'><b>AME Corrected P-Value:</b></td><td class=\'body\'>'+str(putativeRegulators[network][1])+'</td></tr>\n'
    html1 += '<tr><td class=\'head\'><b>Trans-eQTLs:</b></td><td class=\'body\'>'+str(numberOfeQTLs[network][0])+'</td></tr>\n'
    html1 += '<tr><td class=\'head\'><b>Trans-eQTLs w/ Motif:</b></td><td class=\'body\'>'+str(numberOfeQTLs[network][2])+'</td></tr>\n'
    html1 += '<tr><td class=\'head\'><b>Causal Trans-eQTLs:</b></td><td class=\'body\'>'+str(numberOfeQTLs[network][3])+'</td></tr>\n'
    html1 += '<tr><td class=\'head\'><b>Causal Trans-eQTLs w/ Motif:</b></td><td class=\'body\'>'+str(numberOfeQTLs[network][4])+'</td></tr></table>\n'
    html1 += '</center></td><td><img src=\'../data/legend_v2.gif\'></td></tr></table></center>\n'
    html1 += '<div id="wedge" style="font: 10px sans-serif;margin:10px;"></div>\n\n'
    html1 += '<script type="text/javascript">\n\n'
    html1 += '\tvar circle;\n'
    html1 += '\tcircle = circvis.plot($(\'#wedge\').get(0));\n'
    html1 += '</script>\n'
    html1 += '</body>\n'
    html1 += '</html>\n'
    return html1

